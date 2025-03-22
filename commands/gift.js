import { EmbedBuilder } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve file paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const inventoryFilePath = path.join(__dirname, '../data/inventory.json');

// Utility function to read inventory file
const readInventory = async () => {
    try {
        const data = await fs.readFile(inventoryFilePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading inventory file:', err.message);
        throw new Error('Error reading inventory data.');
    }
};

// Utility function to write to inventory file
const writeInventory = async (inventory) => {
    try {
        await fs.writeFile(inventoryFilePath, JSON.stringify(inventory, null, 2), 'utf8');
    } catch (err) {
        console.error('Error writing inventory file:', err.message);
        throw new Error('Error updating inventory data.');
    }
};

const giftCommand = {
    name: 'gift',
    description: 'Gift an item to another user.',
    async execute(message, args) {
        if (args.length < 2) {
            return message.reply('Please specify a user and an item in the format: `!gift @username item_name [amount]`.');
        }

        // Extract user mention
        const user = message.mentions.users.first();
        if (!user) {
            return message.reply('Please mention a valid user to gift the item to.');
        }

        // Remove the user mention from the arguments
        args.shift();

        // Extract amount (last argument, or default to 1 if not provided)
        const amountStr = args.pop();
        const amount = isNaN(parseInt(amountStr, 10)) ? 1 : parseInt(amountStr, 10);

        // Extract item name (everything remaining is the item name)
        const itemName = args.join(' ').toLowerCase(); // Convert item name to lowercase
        console.log(`Item Name: "${itemName}", Amount: ${amount}`); // Debugging

        const targetUserId = user.id;
        const senderUserId = message.author.id;

        let inventory;
        try {
            inventory = await readInventory();
            console.log('Inventory Read Successfully:', inventory); // Debugging
        } catch (error) {
            return message.reply('There was an error accessing the inventory data.');
        }

        const senderInventory = inventory[senderUserId] || [];
        const targetInventory = inventory[targetUserId] || [];

        // Find item in sender's inventory with partial matching
        const item = senderInventory.find(item => item.name.toLowerCase().includes(itemName));
        if (!item) {
            return message.reply('You do not have this item in your inventory.');
        }

        const itemIndex = senderInventory.indexOf(item);
        console.log(`Item Index: ${itemIndex}`); // Debugging

        if (item.amount < amount) {
            return message.reply('You do not have enough of this item to gift.');
        }

        // Remove item from sender's inventory
        if (item.amount > amount) {
            item.amount -= amount;
        } else {
            senderInventory.splice(itemIndex, 1);
        }

        // Add item to target's inventory
        const targetItemIndex = targetInventory.findIndex(targetItem => targetItem.name.toLowerCase() === item.name.toLowerCase());
        if (targetItemIndex === -1) {
            targetInventory.push({ ...item, amount });
        } else {
            targetInventory[targetItemIndex].amount += amount;
        }

        try {
            await writeInventory({ ...inventory, [senderUserId]: senderInventory, [targetUserId]: targetInventory });
            console.log(`[${message.author.tag}] successfully gifted ${amount} "${item.name}" to ${user.username}.`);
        } catch (error) {
            console.error('Error updating inventory:', error.message);
            return message.reply('There was an error updating the inventory.');
        }

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🎁 Gift Successful 🎁')
            .setDescription(`Successfully gifted **${amount} ${item.name}** to ${user.username}!`)
            .setThumbnail(user.displayAvatarURL());

        try {
            await message.channel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error sending message:', error.message);
        }
    }
};

export default giftCommand;

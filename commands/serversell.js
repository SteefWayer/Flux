import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File paths
const shopFilePath = path.resolve(__dirname, '../serverdata/servershop.json');
const economyFilePath = path.resolve(__dirname, '../data/economy.json');
const inventoryFilePath = path.resolve(__dirname, '../serverdata/serverinventory.json');

const serverSellCommand = {
    name: 'serversell',
    aliases: ['ssell'],
    description: 'Sell an item to the server shop for 30% of its price.',
    async execute(message, args, client, context) {
        try {
            if (!message.guild) {
                return message.reply('This command can only be used in a server.');
            }

            if (args.length < 1) {
                return message.reply('Please specify the item you want to sell and optionally the amount.');
            }

            // Extract item name and amount
            const itemName = args.slice(0, -1).join(' ').trim(); // Item name is everything except the last argument
            const amount = parseInt(args[args.length - 1], 10); // Last argument is the amount

            // Default amount to 1 if not provided or invalid
            const sellAmount = isNaN(amount) || amount <= 0 ? 1 : amount;

            // Step 1: Read the shop data
            let shopData;
            try {
                const shopRawData = await fs.readFile(shopFilePath, 'utf-8');
                shopData = JSON.parse(shopRawData);
            } catch (err) {
                console.error(`Error reading shop data: ${err.message}`);
                return message.reply('Error reading shop data.');
            }

            // Step 2: Read the inventory data
            let inventoryData;
            try {
                const inventoryRawData = await fs.readFile(inventoryFilePath, 'utf-8');
                inventoryData = JSON.parse(inventoryRawData);
            } catch (err) {
                console.error(`Error reading inventory data: ${err.message}`);
                return message.reply('Error reading inventory data.');
            }

            // Step 3: Read the economy data
            let economyData;
            try {
                const economyRawData = await fs.readFile(economyFilePath, 'utf-8');
                economyData = JSON.parse(economyRawData);
            } catch (err) {
                console.error(`Error reading economy data: ${err.message}`);
                return message.reply('Error reading economy data.');
            }

            const guildId = message.guild.id;
            const userId = message.author.id;
            const userInventory = inventoryData[guildId]?.[userId] || [];

            // Find the item in the user's inventory
            const userItem = userInventory.find(item => item.name.toLowerCase() === itemName.toLowerCase());

            if (!userItem) {
                return message.reply('Item not found in your inventory.');
            }

            if (userItem.amount < sellAmount) {
                return message.reply('You do not have enough of that item to sell.');
            }

            // Step 4: Calculate sale price
            const shopItem = shopData[guildId]?.find(item => item.id === userItem.id);
            if (!shopItem) {
                return message.reply('Error: Shop item not found.');
            }

            // Ensure price is a string before applying replace
            const originalPrice = parseFloat(String(shopItem.price).replace(/[^0-9.]/g, ''));
            const sellPrice = (originalPrice * 0.3).toFixed(2);

            // Step 5: Update inventory
            userItem.amount -= sellAmount;
            if (userItem.amount === 0) {
                inventoryData[guildId][userId] = userInventory.filter(item => item.id !== userItem.id);
            }

            // Step 6: Update economy data
            if (!economyData[userId]) {
                economyData[userId] = { withdrawnCash: 0 };
            }

            economyData[userId].withdrawnCash += (sellPrice * sellAmount);

            // Step 7: Save the updated data
            try {
                await fs.writeFile(economyFilePath, JSON.stringify(economyData, null, 4));
                await fs.writeFile(inventoryFilePath, JSON.stringify(inventoryData, null, 4));
            } catch (err) {
                console.error(`Error saving data: ${err.message}`);
                return message.reply('Error saving sale data.');
            }

            // Step 8: Send a confirmation message
            return message.reply(`You have successfully sold **${itemName}** for **${sellPrice} ⏣** each. Total: **${(sellPrice * sellAmount).toFixed(2)} ⏣**.`);

        } catch (error) {
            console.error(`Error executing command serversell: ${error.message}`);
            return message.reply('An error occurred while executing the command.');
        }
    }
};

export default serverSellCommand;

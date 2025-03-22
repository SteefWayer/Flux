import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Resolve the directory of the current module file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Construct the path to the required files
const inventoryFilePath = resolve(__dirname, '../data/inventory.json');
const adminsFilePath = resolve(__dirname, '../admins.json');

// Load and parse the JSON data
const readInventoryData = () => {
    try {
        const data = fs.readFileSync(inventoryFilePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading inventory data:', error);
        return {};
    }
};

const writeInventoryData = (data) => {
    try {
        fs.writeFileSync(inventoryFilePath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error writing inventory data:', error);
    }
};

const adminsData = JSON.parse(fs.readFileSync(adminsFilePath, 'utf-8'));

export default {
    name: 'removeinventory',
    aliases: ['reminv'],
    description: 'Remove an item from your or another user\'s inventory',
    cooldown: 5,
    execute: async (message, args) => {
        // Check if the user is an admin
        if (!adminsData.includes(message.author.id)) {
            return message.channel.send('You do not have permission to use this command.');
        }

        if (args.length < 2) {
            return message.channel.send('Usage: !removeinventory [user] <ID> <amount>');
        }

        // Default target user to the message author
        let targetUserId = message.author.id;
        let idIndex = args.length - 2;
        let amountIndex = args.length - 1;

        // Check if the first argument is a mention or user ID
        const mentionMatch = args[0]?.match(/^<@!?(\d+)>$/);
        if (mentionMatch) {
            targetUserId = mentionMatch[1];
            idIndex = args.length - 2;
            amountIndex = args.length - 1;
        }

        // Extract and validate ID
        const idStr = args[idIndex];
        const itemId = parseInt(idStr, 10);

        if (isNaN(itemId)) {
            return message.channel.send('Invalid ID. Please provide a valid ID.');
        }

        // Extract and validate amount
        const amountStr = args[amountIndex];
        const amountNum = parseFloat(amountStr);

        if (isNaN(amountNum) || amountNum <= 0) {
            return message.channel.send('Invalid amount. It must be a positive number.');
        }

        // Read the current inventory
        const inventoryData = readInventoryData();

        // Check if the item exists in the user's inventory
        const userItems = inventoryData[targetUserId] || [];
        const existingItemIndex = userItems.findIndex(item => item.id === itemId);

        if (existingItemIndex === -1) {
            return message.channel.send('Item not found in the user\'s inventory.');
        }

        const existingItem = userItems[existingItemIndex];

        // Determine the new amount
        const newAmount = existingItem.amount - amountNum;

        if (newAmount <= 0) {
            // Remove the item if the amount is zero or less
            userItems.splice(existingItemIndex, 1);
        } else {
            // Update the existing item amount
            existingItem.amount = newAmount;
        }

        // Save the updated inventory
        inventoryData[targetUserId] = userItems;
        writeInventoryData(inventoryData);

        // Send confirmation message
        message.channel.send(`**Item removed from inventory of <@${targetUserId}>:**\n**Item ID:** ${itemId}\nName: ${existingItem.name}\nRemoved Amount: ${amountNum}`);
    }
};

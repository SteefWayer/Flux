import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current module's file path and directory path
const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFilePath);

// Paths to JSON files
const inventoryPath = path.join(currentDir, '..', 'data', 'inventory.json');
const economyPath = path.join(currentDir, '..', 'data', 'economy.json');

// Logging flag
const isLoggingEnabled = true;

// Function to log messages
const log = (message, data = '') => {
    if (isLoggingEnabled) {
        console.log(message, data);
    }
};

// Function to load and parse JSON files
const loadJSON = async (filePath) => {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        log(`Error loading data from ${filePath}: ${error.message}`);
        return null;
    }
};

// Function to handle the sell interaction
const handleSellInteraction = async (message) => {
    const args = message.content.trim().split(' ');
    const amount = parseInt(args.pop(), 10);
    const itemName = args.slice(1).join(' ');

    if (!itemName || isNaN(amount) || amount <= 0) {
        return message.reply('Usage: !sell <item_name> <amount>. Amount must be a positive number.');
    }

    const userId = message.author.id;
    const inventoryData = await loadJSON(inventoryPath);
    const economyData = await loadJSON(economyPath);

    if (!inventoryData || !inventoryData[userId]) {
        return message.reply('You have no items in your inventory.');
    }

    const userInventory = inventoryData[userId];
    const item = userInventory.find(i => i.name.toLowerCase() === itemName.toLowerCase());

    if (!item || item.amount < amount) {
        return message.reply(`You don't have enough of "${itemName}" to sell.`);
    }

    // Remove non-numeric characters and calculate sale price (70% of original)
    const itemPrice = parseFloat(item.price.replace(/[^0-9.]/g, '').replace(/,/g, ''));
    if (isNaN(itemPrice)) {
        return message.reply('Invalid item price. Please try again later.');
    }
    
    const sellPrice = (itemPrice * 0.7).toFixed(2);
    const totalSaleAmount = (sellPrice * amount).toFixed(2);

    // Update user's inventory
    item.amount -= amount;
    if (item.amount === 0) {
        inventoryData[userId] = userInventory.filter(i => i.id !== item.id);
    }

    // Update user's economy
    if (!economyData[userId]) {
        economyData[userId] = { balance: 0, withdrawnCash: 0 };
    }

    economyData[userId].balance += parseFloat(totalSaleAmount);
    economyData[userId].withdrawnCash += parseFloat(totalSaleAmount);

    // Save the updated inventory and economy data
    await fs.writeFile(inventoryPath, JSON.stringify(inventoryData, null, 2));
    await fs.writeFile(economyPath, JSON.stringify(economyData, null, 2));

    // Send the reply
    await message.reply(
        `**🛒 Sale Successful!**\n` +
        `You sold **${amount} x ${item.name}** for **${totalSaleAmount} ⏣**.\n` +
        `Thank you for your transaction! 🎉`
    );
};

// Export the command
export default {
    name: 'sell',
    description: 'Sell an item by name and amount.',
    execute: handleSellInteraction
};

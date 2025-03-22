import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const shopFilePath = path.resolve(__dirname, '../serverdata/servershop.json');
const economyFilePath = path.resolve(__dirname, '../data/economy.json');
const inventoryFilePath = path.resolve(__dirname, '../serverdata/serverinventory.json');

const serverBuyCommand = {
    name: 'serverbuy',
    aliases: ['sbuy'],
    description: 'Buy an item from the server shop.',
    async execute(message, args, client, context) {
        try {
            if (!message.guild) {
                return message.reply('This command can only be used in a server.');
            }

            if (args.length === 0) {
                return message.reply('Please specify the item you want to buy.');
            }

            const itemName = args.join(' ').trim();

            // Step 1: Read the shop data
            let shopData;
            try {
                const shopRawData = await fs.readFile(shopFilePath, 'utf-8');
                shopData = JSON.parse(shopRawData);
            } catch (err) {
                console.error(`Error reading shop data: ${err.message}`);
                return message.reply('Error reading shop data.');
            }

            // Step 2: Read the economy data
            let economyData;
            try {
                const economyRawData = await fs.readFile(economyFilePath, 'utf-8');
                economyData = JSON.parse(economyRawData);
            } catch (err) {
                console.error(`Error reading economy data: ${err.message}`);
                return message.reply('Error reading economy data.');
            }

            // Step 3: Read the inventory data
            let inventoryData;
            try {
                const inventoryRawData = await fs.readFile(inventoryFilePath, 'utf-8');
                inventoryData = JSON.parse(inventoryRawData);
            } catch (err) {
                console.error(`Error reading inventory data: ${err.message}`);
                return message.reply('Error reading server inventory data.');
            }

            const guildId = message.guild.id;
            const guildShop = shopData[guildId] || [];

            const shopItem = guildShop.find(item => item.name.toLowerCase() === itemName.toLowerCase());
            if (!shopItem) {
                return message.reply('Item not found in the shop.');
            }

            const userId = message.author.id;
            const userEconomy = economyData[userId];
            if (!userEconomy) {
                return message.reply('You do not have an economy profile.');
            }

            if (userEconomy.withdrawnCash < shopItem.price) {
                return message.reply(`You do not have enough withdrawn cash to buy this item. You need ${shopItem.price} coins.`);
            }

            // Step 4: Deduct the price from user's withdrawn cash
            userEconomy.withdrawnCash -= shopItem.price;

            // Step 5: Update the user's inventory
            if (!inventoryData[guildId]) {
                inventoryData[guildId] = {};
            }
            if (!inventoryData[guildId][userId]) {
                inventoryData[guildId][userId] = [];
            }

            // Check if the item already exists in the user's inventory
            const userInventory = inventoryData[guildId][userId];
            const existingItem = userInventory.find(item => item.name === shopItem.name);

            if (existingItem) {
                // If item exists, increment the amount
                existingItem.amount += 1;
            } else {
                // If item doesn't exist, add it to the inventory
                userInventory.push({
                    id: shopItem.id,
                    name: shopItem.name,
                    type: 'serveritem',
                    amount: 1,
                    price: `${shopItem.price}`,
                    emoji: shopItem.emoji || ''
                });
            }

            // Step 6: Save the updated economy and inventory data
            try {
                await fs.writeFile(economyFilePath, JSON.stringify(economyData, null, 4));
                await fs.writeFile(inventoryFilePath, JSON.stringify(inventoryData, null, 4));
            } catch (err) {
                console.error(`Error saving data: ${err.message}`);
                return message.reply('Error saving purchase data.');
            }

            // Step 7: Send a confirmation message
            return message.reply(`You have successfully purchased **${shopItem.name}** for **${shopItem.price} ⏣**.`);

        } catch (error) {
            console.error(`Error executing command serverbuy: ${error.message}`);
            return message.reply('An error occurred while executing the command.');
        }
    }
};

export default serverBuyCommand;

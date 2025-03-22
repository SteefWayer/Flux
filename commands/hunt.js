import { EmbedBuilder } from 'discord.js';
import fs from 'fs/promises'; // Use promises-based fs for async operations
import path from 'path';
import { fileURLToPath } from 'url';
import { saveData } from '../serverutils/savingdata/savedata.js'; // Relative path from commands to serverutils

// Handle __dirname in an ES module context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File paths
const inventoryFilePath = path.join(__dirname, '..', 'data', 'inventory.json');
const itemsFilePath = path.join(__dirname, '..', 'utils', 'items.json');
const economyFilePath = path.join(__dirname, '..', 'data', 'economy.json');

// Hunting rifle ID
const HUNTING_RIFLE_ID = 100101;

// Debug flag for logging
const debug = true; // Set this to false to disable debug logging

// Cooldown in milliseconds
const COOLDOWN_DURATION = 180000;

// Cooldown tracking object
const cooldowns = new Map();

// Utility functions
const readJSONFile = async (filePath) => {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        if (debug) console.log(`Read file at ${filePath}`);
        return JSON.parse(data);
    } catch (err) {
        throw new Error(`Error reading or parsing file at ${filePath}: ${err.message}`);
    }
};

const writeJSONFile = async (filePath, data) => {
    try {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
        if (debug) console.log(`Successfully wrote to file at ${filePath}`);
    } catch (err) {
        throw new Error(`Error writing file at ${filePath}: ${err.message}`);
    }
};

// Get a random item from the items data
const getRandomItem = (items) => {
    const allItems = items.flatMap(category => category.items);
    const randomIndex = Math.floor(Math.random() * allItems.length);
    return allItems[randomIndex];
};

// The hunt command implementation
export default {
    name: 'hunt',
    description: 'Go hunting with your rifle.',
    async execute(message) {
        const userId = message.author.id;
        const now = Date.now();
        
        // Cooldown logic
        if (cooldowns.has(userId)) {
            const expirationTime = cooldowns.get(userId) + COOLDOWN_DURATION;
            if (now < expirationTime) {
                const timeLeft = (expirationTime - now) / 1000;
                const cooldownEmbed = new EmbedBuilder()
                    .setTitle('Cooldown')
                    .setDescription(`Please wait **${timeLeft.toFixed(1)}** more seconds before using the \`!hunt\` command again.`)
                    .setColor('#FFBF00');
                
                try {
                    await message.channel.send({ embeds: [cooldownEmbed] });
                    if (debug) console.log(`Cooldown message sent to user ${userId}: ${timeLeft.toFixed(1)} seconds remaining.`);
                } catch (error) {
                    console.error('Error sending cooldown message:', error.message);
                }
                return;
            }
        }

        cooldowns.set(userId, now);

        if (debug) console.log(`!hunt command received from user ${userId}`);

        let inventory;
        let economy;
        try {
            inventory = await readJSONFile(inventoryFilePath);
            economy = await readJSONFile(economyFilePath);
        } catch (error) {
            console.error('Error reading file:', error.message);
            return message.reply('There was an error accessing the data files.');
        }

        const userInventory = inventory[userId] || [];
        const huntingRifle = userInventory.find(item => item.id === HUNTING_RIFLE_ID);

        if (!huntingRifle || huntingRifle.amount < 1) {
            const embed = new EmbedBuilder()
                .setTitle('Hunt Failed')
                .setDescription('You need a hunting rifle to go hunting. It looks like you don\'t have one. Head to the shop and get yourself a rifle before you can hunt!')
                .setColor('#FF0000');

            try {
                await message.channel.send({ embeds: [embed] });
                if (debug) console.log(`User ${userId} attempted to hunt without a rifle.`);
            } catch (error) {
                console.error('Error sending message:', error.message);
            }
            return;
        }

        // Simulate the hunt
        const huntSuccess = Math.random() < 0.7; // 70% chance of success
        const rifleLost = Math.random() < 0.05;  // 5% chance of losing the rifle

        let cashEarned = 0;

        if (huntSuccess) {
            const description = rifleLost ? 
                'Congratulations! You successfully hunted some game, but your rifle got damaged in the process and is now unusable. Guess you’ll need to buy a new one! You can buy a new rifle at the shop with `!shop`.' :
                'Congratulations! You successfully hunted some game. No need to worry about your rifle; it’s in perfect condition!';

            const successEmbed = new EmbedBuilder()
                .setTitle('Hunt Successful!')
                .setDescription(description)
                .setColor('#00FF00');

            if (rifleLost) {
                huntingRifle.amount--;
                if (huntingRifle.amount <= 0) {
                    // Remove the rifle from the inventory
                    inventory[userId] = userInventory.filter(item => item.id !== HUNTING_RIFLE_ID);
                }
                try {
                    await writeJSONFile(inventoryFilePath, inventory);
                    if (debug) console.log(`Successfully saved inventory data for user ${userId}.`);
                } catch (error) {
                    console.error('Error saving inventory data:', error.message);
                }
            }

            // 40% chance to get a random item
            if (Math.random() < 0.4) {
                let itemsData;
                try {
                    itemsData = await readJSONFile(itemsFilePath);
                } catch (error) {
                    console.error('Error reading items file:', error.message);
                    return message.reply('There was an error accessing the items file.');
                }

                const randomItem = getRandomItem(itemsData.usage);

                // Add random item to inventory
                const existingItem = userInventory.find(item => item.id === randomItem.item_ID);

                if (debug) console.log(`Before inventory update for user ${userId}:`, JSON.stringify(userInventory, null, 2));

                if (existingItem) {
                    existingItem.amount = (existingItem.amount || 0) + 1;
                } else {
                    userInventory.push({
                    id: randomItem.item_ID,
                    name: randomItem.item_name,
                    emoji: randomItem.item_emoji,
                    amount: 1,
                    type: randomItem.item_type || 'itemID', // Use the type from items.json or default to 'itemID'
                    price: randomItem.item_price || 'Unknown' // Use the price from items.json or default to 'Unknown'
                    });
                }

                if (debug) console.log(`After inventory update for user ${userId}:`, JSON.stringify(userInventory, null, 2));

                // Write updated inventory to file
                try {
                    await writeJSONFile(inventoryFilePath, inventory);
                    if (debug) console.log(`Successfully saved updated inventory data for user ${userId}.`);
                } catch (error) {
                    console.error('Error saving updated inventory data:', error.message);
                }


                successEmbed.setDescription(`${description}\n\nYou've also found a new item: ${randomItem.item_emoji} **${randomItem.item_name}**! Its selling price is **${randomItem.item_price || 'Unknown'}**.`);
            }

            // Middle to small chance to get some cash
            if (Math.random() < 0.3) { // 30% chance
                cashEarned = Math.floor(Math.random() * 1000) + 1; // Random amount between 1 and 1000
                if (!economy[userId]) {
                    economy[userId] = { withdrawnCash: 0 };
                }
                economy[userId].withdrawnCash += cashEarned;
                try {
                    await writeJSONFile(economyFilePath, economy);
                    if (debug) console.log(`Successfully saved updated economy data for user ${userId}.`);
                } catch (error) {
                    console.error('Error saving economy data:', error.message);
                }

                successEmbed.setDescription(`${successEmbed.data.description}\n\nYou've also withdrawn **${cashEarned} ⏣**!`);
            }

            // Trigger saveData to persist changes
            try {
                await saveData(economy, inventory);
                if (debug) console.log(`Data saved using saveData function for user ${userId}.`);
            } catch (error) {
                console.error('Error saving data using saveData function:', error.message);
            }

            try {
                await message.channel.send({ embeds: [successEmbed] });
                if (debug) console.log(`Hunt result sent to user ${userId}: ${description}`);
            } catch (error) {
                console.error('Error sending message:', error.message);
            }
        } else {
            const description = rifleLost ? 
                'Oh no! The hunt didn’t go as planned and you lost your rifle in the process. Time to save up for a new one!' :
                'The hunt was unsuccessful. Maybe the game was too clever today. Better luck next time! You can use `!shop` to buy new items if you need them.';

            const failureEmbed = new EmbedBuilder()
                .setTitle('Hunt Failed')
                .setDescription(description)
                .setColor('#FF0000');

            if (rifleLost) {
                huntingRifle.amount--;
                if (huntingRifle.amount <= 0) {
                    inventory[userId] = userInventory.filter(item => item.id !== HUNTING_RIFLE_ID);
                }
                try {
                    await writeJSONFile(inventoryFilePath, inventory);
                    if (debug) console.log(`Successfully saved inventory data after failed hunt for user ${userId}.`);
                } catch (error) {
                    console.error('Error saving inventory data after failed hunt:', error.message);
                }
            }

            try {
                await message.channel.send({ embeds: [failureEmbed] });
                if (debug) console.log(`Hunt failure result sent to user ${userId}: ${description}`);
            } catch (error) {
                console.error('Error sending message:', error.message);
            }
        }
    },
};

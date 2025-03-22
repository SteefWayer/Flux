import { EmbedBuilder } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve file paths for economy, inventory, and items data
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const economyFilePath = path.join(__dirname, '..', 'data', 'economy.json');
const itemsFilePath = path.join(__dirname, '..', 'utils', 'items.json');
const inventoryFilePath = path.join(__dirname, '..', 'data', 'inventory.json');

export default {
    name: 'beg',
    description: 'Beg for money and possibly get a random item',
    async execute(message, args, client, context) {
        const now = Date.now();
        const userId = message.author.id;
        const userName = message.author.username;
        const { begReward, logToFile } = context;

        // Read the economy data file
        let economy;
        try {
            const data = await fs.readFile(economyFilePath, 'utf8');
            economy = JSON.parse(data);
        } catch (error) {
            console.error('Error reading economy data:', error);
            return message.channel.send('There was an error fetching the economy data.');
        }

        // Ensure economy data structure exists for the user
        if (!economy[userId]) {
            economy[userId] = { 
                balance: 0, 
                bankBalance: 0, 
                withdrawnCash: 0, 
                lastBeg: 0,
                userName: userName
            };
        }

        // Read the inventory data file
        let inventory;
        try {
            const inventoryData = await fs.readFile(inventoryFilePath, 'utf8');
            inventory = JSON.parse(inventoryData);
        } catch (error) {
            console.error('Error reading inventory data:', error);
            return message.channel.send('There was an error fetching the inventory data.');
        }

        // Ensure inventory structure exists for the user
        if (!inventory[userId]) {
            inventory[userId] = [];
        }

        // Set default lastBeg to 0 if undefined or null
        let lastBegTime = economy[userId].lastBeg || 0;

        // Calculate cooldown
        const cooldownDuration = 180000;
        const cooldownRemaining = cooldownDuration - (now - lastBegTime);

        // Handle cooldown
        if (cooldownRemaining <= 0) {
            try {
                const reward = begReward();
                if (typeof reward !== 'number' || isNaN(reward) || reward < 0) {
                    throw new Error('Reward is not a valid number.');
                }

                economy[userId].withdrawnCash += reward;
                economy[userId].lastBeg = now;

                let items;
                try {
                    const itemsData = await fs.readFile(itemsFilePath, 'utf8');
                    items = JSON.parse(itemsData);
                } catch (error) {
                    console.error('Error reading items data:', error);
                    items = { beg_items: [] };
                }

                // Random chance to get an item
                const itemChance = Math.random();
                const itemProbability = 0.1;
                let item = null;

                if (itemChance < itemProbability && items.beg_items.length > 0) {
                    const randomCategory = items.beg_items[Math.floor(Math.random() * items.beg_items.length)];
                    const randomItem = randomCategory.items[Math.floor(Math.random() * randomCategory.items.length)];
                    item = {
                        id: randomItem.item_ID,
                        name: randomItem.item_name,
                        price: randomItem.item_price,
                        emoji: randomItem.item_emoji,
                        amount: 1,
                        type: randomCategory.type || 'begItemID'
                    };

                    // Add item to the user's inventory
                    inventory[userId].push(item);
                }

                // Save economy and inventory data
                try {
                    await fs.writeFile(economyFilePath, JSON.stringify(economy, null, 2), 'utf8');
                    await fs.writeFile(inventoryFilePath, JSON.stringify(inventory, null, 2), 'utf8');
                    console.log('Economy and inventory data successfully updated.');
                } catch (error) {
                    console.error('Error writing economy or inventory data:', error);
                    return message.channel.send('There was an error saving your begging data.');
                }

                // Send success embed
                let description = `You've begged and received **⏣ ${reward}**!\n\nYour new withdrawn cash is **⏣ ${economy[userId].withdrawnCash}**.`;
                if (item) {
                    description += `\n\nAdditionally, you received a ${item.emoji} **${item.name}** worth **${item.price}**!`;
                }

                const embed = new EmbedBuilder()
                    .setTitle('🙏 Beg Reward')
                    .setDescription(description)
                    .setColor('#2ecc71')
                    .setThumbnail('https://example.com/thumbnail.png');

                await message.channel.send({ embeds: [embed] });
                logToFile(`[${message.author.tag}] Begged and received $${reward}. New withdrawn cash: ⏣ ${economy[userId].withdrawnCash}. Item received: ${item ? item.name : 'None'}.`);
            } catch (error) {
                console.error('Error executing beg command:', error);
                message.channel.send('There was an error processing your beg command.');
                logToFile(`Error executing beg command: ${error.message}`);
            }
        } else {
            // Handle cooldown message
            const timeLeft = Math.ceil(cooldownRemaining / 1000);

            const embed = new EmbedBuilder()
                .setTitle('⏳ Beg Cooldown')
                .setDescription(`You need to wait **${timeLeft}** seconds before you can beg again.`)
                .setColor('#e74c3c')
                .setThumbnail('https://example.com/thumbnail.png');

            await message.channel.send({ embeds: [embed] });
            logToFile(`[${message.author.tag}] Tried to beg but is still on cooldown. Time left: ${timeLeft} seconds.`);
        }
    }
};

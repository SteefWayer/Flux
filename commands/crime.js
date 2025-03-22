import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { EmbedBuilder } from 'discord.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inventoryFilePath = path.join(__dirname, '..', 'data', 'inventory.json');
const itemsFilePath = path.join(__dirname, '..', 'utils', 'items.json');
const economyFilePath = path.join(__dirname, '..', 'data', 'economy.json');

const COOLDOWN_DURATION = 180000;
const cooldowns = new Map();

const readJSONFile = (filePath) => {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        throw new Error(`Error reading or parsing file at ${filePath}: ${err.message}`);
    }
};

const writeJSONFile = (filePath, data) => {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
        throw new Error(`Error writing file at ${filePath}: ${err.message}`);
    }
};

const getRandomItem = (itemsData) => {
    const crimeItems = itemsData.crime_items.flatMap(category => category.items);
    if (!crimeItems.length) return null;
    const randomIndex = Math.floor(Math.random() * crimeItems.length);
    return crimeItems[randomIndex];
};

export default {
    name: 'crime',
    description: 'Commit a crime and potentially obtain a valuable item.',
    async execute(message) {
        const userId = message.author.id;
        const now = Date.now();

        if (cooldowns.has(userId)) {
            const expirationTime = cooldowns.get(userId) + COOLDOWN_DURATION;
            if (now < expirationTime) {
                const timeLeft = (expirationTime - now) / 1000;
                const cooldownEmbed = new EmbedBuilder()
                    .setTitle('Cooldown Active!')
                    .setDescription(`You need to wait **${timeLeft.toFixed(1)}** seconds before committing another crime. Maybe think about your next move?`)
                    .setColor('#FFBF00')

                await message.channel.send({ embeds: [cooldownEmbed] });
                return;
            }
        }

        cooldowns.set(userId, now);

        let inventory, economy, itemsData;
        try {
            inventory = readJSONFile(inventoryFilePath);
            economy = readJSONFile(economyFilePath);
            itemsData = readJSONFile(itemsFilePath);
        } catch (error) {
            console.error('Error reading file:', error.message);
            return message.reply('There was an error accessing the data files.');
        }

        const userInventory = inventory[userId] || [];

        if (!economy[userId]) {
            economy[userId] = { withdrawnCash: 0 };
        }

        const crimeSuccess = Math.random() < 0.45;
        const itemLost = Math.random() < 0.15;

        let cashEarned = 0;
        let crimeResultDescription = '';

        const embed = new EmbedBuilder().setFooter({ text: 'Your actions have consequences!' });

        if (crimeSuccess) {
            embed.setTitle('Crime Successful! 🎉').setColor('#00FF00');

            if (Math.random() < 0.2) { 
                const randomCrimeItem = getRandomItem(itemsData);

                const existingItem = userInventory.find(item => item.id === randomCrimeItem.item_ID);
                if (existingItem) {
                    existingItem.amount += 1;
                } else {
                    userInventory.push({
                        id: randomCrimeItem.item_ID,
                        name: randomCrimeItem.item_name,
                        emoji: randomCrimeItem.item_emoji,
                        amount: 1,
                        type: randomCrimeItem.item_type || 'crimeItemID',
                        price: randomCrimeItem.item_price || '50000 ⏣'
                    });
                }
                inventory[userId] = userInventory;
                writeJSONFile(inventoryFilePath, inventory);

                crimeResultDescription += `You found a new item: ${randomCrimeItem.item_emoji} **${randomCrimeItem.item_name}**! Its value is **${randomCrimeItem.item_price || '50000 ⏣'}**.\n`;
            }

            if (Math.random() < 0.4) {
                cashEarned = Math.floor(Math.random() * 5000) + 1;
                economy[userId].withdrawnCash += cashEarned;
                writeJSONFile(economyFilePath, economy);

                crimeResultDescription += `You've earned **${cashEarned} ⏣**! 💰`;
            } else if (!crimeResultDescription) {
                crimeResultDescription = "You successfully committed the crime, but didn't make any money.";
            }

        } else {
            embed.setTitle('Crime Failed 😔').setColor('#FF0000');

            if (itemLost) {
                economy[userId].withdrawnCash = 0;
                writeJSONFile(economyFilePath, economy);
                crimeResultDescription = 'The crime didn’t go as planned, and you lost all your withdrawn cash.';
            } else {
                crimeResultDescription = 'The crime was unsuccessful. Better luck next time!';
            }
        }

        embed.setDescription(crimeResultDescription);
        await message.channel.send({ embeds: [embed] });
    }
};

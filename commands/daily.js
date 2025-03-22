import { EmbedBuilder } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the path to the economy.json file
const economyPath = path.join(__dirname, '../data/economy.json');

// Minimum time between daily rewards in milliseconds (24 hours)
const COOLDOWN = 86400000; // 24 hours in milliseconds

export default {
    name: 'daily',
    description: 'Claim your daily reward!',
    
    async execute(message, args, client, context) {
        const now = Date.now();
        const { thumb, dailyReward, logToFile } = context;

        const userId = message.author.id;
        const userName = message.author.tag; // Get the username

        let economy;
        try {
            // Read the economy data file
            const data = await fs.readFile(economyPath, 'utf8');
            economy = JSON.parse(data);
        } catch (error) {
            console.error('Error reading economy data:', error);
            return message.channel.send('There was an error fetching the economy data.');
        }

        // Initialize economy data for the user if necessary
        if (!economy[userId]) {
            economy[userId] = {
                withdrawnCash: 0,
                bankBalance: 0,
                lastDaily: 0,
                lastWork: 0,
                userName: userName // Store the username
            };
            logToFile(`[daily] Initialized economy data for User ID: ${userId} (${userName})`);

            // Save the updated economy.json
            try {
                await fs.writeFile(economyPath, JSON.stringify(economy, null, 2), 'utf-8');
                console.log('Economy data successfully saved after initialization.');
            } catch (error) {
                console.error('Error writing economy data after initialization:', error);
                return message.channel.send('There was an error saving the economy data.');
            }
        } else if (economy[userId].userName !== userName) {
            // Update the username if it has changed
            economy[userId].userName = userName;

            // Save the updated economy.json
            try {
                await fs.writeFile(economyPath, JSON.stringify(economy, null, 2), 'utf-8');
                console.log('Economy data successfully saved after username update.');
            } catch (error) {
                console.error('Error writing economy data after username update:', error);
                return message.channel.send('There was an error saving the economy data.');
            }
        }

        const user = economy[userId];

        // Ensure lastDaily is a number
        user.lastDaily = typeof user.lastDaily === 'number' ? user.lastDaily : 0;

        const timeElapsed = now - user.lastDaily;
        const timeLeft = COOLDOWN - timeElapsed; // Time left in milliseconds

        if (timeElapsed >= COOLDOWN) {
            try {
                // Ensure dailyReward is valid
                if (typeof dailyReward !== 'number' || dailyReward <= 0) {
                    logToFile(`Error: Invalid dailyReward value: ${dailyReward}`);
                    return message.channel.send('There was an error with the daily reward value.');
                }

                // Update user withdrawn cash and save to file
                user.withdrawnCash += dailyReward;
                user.lastDaily = now;

                // Save the updated economy data
                try {
                    await fs.writeFile(economyPath, JSON.stringify(economy, null, 2), 'utf-8');
                    console.log('Economy data successfully saved after updating balance.');
                    
                    // Force another save to ensure data persistence
                    await fs.writeFile(economyPath, JSON.stringify(economy, null, 2), 'utf-8');
                    console.log('Economy data successfully re-saved after balance update.');
                    
                    // Re-read the file to confirm
                    const updatedData = await fs.readFile(economyPath, 'utf8');
                    const updatedEconomy = JSON.parse(updatedData);
                    if (JSON.stringify(economy) !== JSON.stringify(updatedEconomy)) {
                        console.error('Economy data mismatch after re-save.');
                        return message.channel.send('There was an error validating the economy data.');
                    }
                } catch (error) {
                    console.error('Error writing economy data after balance update:', error);
                    return message.channel.send('There was an error saving your daily reward.');
                }

                // Validate `thumb` URL
                if (typeof thumb !== 'string' || !thumb.startsWith('http')) {
                    logToFile(`Error: Invalid thumbnail URL: ${thumb}`);
                    return message.channel.send('There was an error with the thumbnail URL.');
                }

                const embed = new EmbedBuilder()
                    .setTitle('🌟 Daily Reward')
                    .setDescription(`You've claimed your daily reward of **⏣${dailyReward.toLocaleString()}**`)
                    .setColor('#f39c12')
                    .setThumbnail(thumb);

                await message.channel.send({ embeds: [embed] });
                logToFile(`[${userName}] Claimed daily reward of ⏣ ${dailyReward}. New withdrawn cash: ⏣ ${user.withdrawnCash}.`);
            } catch (error) {
                logToFile(`Error executing daily command: ${error.message}`);
                message.channel.send('There was an error processing your daily reward.');
            }
        } else {
            // Convert timeLeft to hours, minutes, and seconds
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

            const timeLeftFormatted = `${hours}h ${minutes}m ${seconds}s`;

            // Validate `thumb` URL
            if (typeof thumb !== 'string' || !thumb.startsWith('http')) {
                logToFile(`Error: Invalid thumbnail URL: ${thumb}`);
                return message.channel.send('There was an error with the thumbnail URL.');
            }

            const embed = new EmbedBuilder()
                .setTitle('⏳ Daily Cooldown')
                .setDescription(`You need to wait **${timeLeftFormatted}** before you can claim your daily reward again.`)
                .setColor('#e74c3c')
                .setThumbnail(thumb);

            await message.channel.send({ embeds: [embed] });
            logToFile(`[${userName}] On cooldown. Time left: ${timeLeftFormatted}.`);
        }
    }
};

import fs from 'fs';
import path from 'path';
import { EmbedBuilder } from 'discord.js';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the economy data file
const economyFilePath = path.join(__dirname, '..', 'data', 'economy.json');

export default {
    name: 'resetcooldowns',
    description: 'Reset all cooldowns and restart the bot (Owner only).',
    async execute(message, args, client, context) {
        const { admins, ownerId, logToFile } = context;

        try {
            // Check if the user has permission
            if (!admins.includes(message.author.id) && message.author.id !== ownerId) {
                const embed = new EmbedBuilder()
                    .setTitle('🚫 Permission Denied')
                    .setDescription("You must be an admin or the owner to use this command.")
                    .setColor('#e74c3c');

                await message.channel.send({ embeds: [embed] });
                logToFile(`[${message.guild.id}] [${message.author.tag}] Attempted to reset cooldowns without permission.`);
                return;
            }

            // Load existing data
            let economyData = {};
            if (fs.existsSync(economyFilePath)) {
                const data = fs.readFileSync(economyFilePath, 'utf8');
                economyData = JSON.parse(data);
            }

            logToFile(`Before reset: ${JSON.stringify(economyData, null, 2)}`);

            // Reset cooldowns
            for (const guildId in economyData) {
                for (const userId in economyData[guildId]) {
                    const user = economyData[guildId][userId];
                    if (user.lastDaily !== undefined) user.lastDaily = 0;
                    if (user.lastWork !== undefined) user.lastWork = 0;
                }
            }

            // Write updated data to file
            fs.writeFileSync(economyFilePath, JSON.stringify(economyData, null, 2), 'utf8');

            logToFile(`After reset: ${JSON.stringify(economyData, null, 2)}`);

            // Notify about the reset and restart
            const embed = new EmbedBuilder()
                .setTitle('🔄 Cooldowns Reset & Restarting')
                .setDescription("All cooldowns have been reset. The bot is restarting now.")
                .setColor('#2ecc71');

            await message.channel.send({ embeds: [embed] });
            logToFile(`[${message.guild.id}] [${message.author.tag}] Successfully reset all cooldowns. Restarting bot.`);

            // Restart the bot
            process.exit(0); // Exiting the process to be restarted by PM2 or similar

        } catch (error) {
            logToFile(`[${message.guild.id}] [${message.author.tag}] Error executing resetcooldowns command: ${error.message}`);
            console.error('Error executing resetcooldowns command:', error);
            message.channel.send('There was an error executing the reset cooldowns command.');
        }
    }
};

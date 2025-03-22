import { EmbedBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { contextFilePath } from '../constants.js'; // Import contextFilePath

export default {
    name: 'reload',
    aliases: ['restart'],
    description: 'Restarts the bot without wiping any data',
    async execute(message, args, client, context) {
        console.log(`Context file path: ${contextFilePath}`); // Debugging line

        if (!context) {
            console.error('Context is not defined.');
            return message.channel.send('There was an error with the command context.');
        }

        const isAdmin = context.admins.includes(message.author.id) || message.author.id === context.ownerId;

        if (!isAdmin) {
            return message.channel.send('You do not have permission to use this command.');
        }

        if (args[0] !== 'confirm') {
            // Save the context (channel and guild ID) to a file
            const contextData = {
                channelId: message.channel.id,
                guildId: message.guild.id
            };

            try {
                fs.writeFileSync(contextFilePath, JSON.stringify(contextData, null, 2), 'utf8');
                console.log('Context saved for restart.');
            } catch (error) {
                console.error(`Failed to save context: ${error.message}`);
                return message.channel.send('Failed to save context for restart.');
            }

            const embed = new EmbedBuilder()
                .setTitle('🔄 Bot Restarting')
                .setDescription('The bot is restarting. This process should take just a few seconds.')
                .setColor('#3498db');

            try {
                await message.channel.send({ embeds: [embed] });
            } catch (error) {
                console.error(`Failed to send restart message: ${error.message}`);
                return message.channel.send('Failed to send restart message.');
            }

            process.exit(0); // Terminate the process to trigger a restart
        } else {
            return message.channel.send('Please type `!reload` first, followed by `!reload confirm` to restart the bot.');
        }
    }
};

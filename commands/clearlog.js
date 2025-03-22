import { readFile, writeFile } from 'fs/promises';
import { EmbedBuilder } from 'discord.js';
import { fileURLToPath } from 'url';
import path from 'path';

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the user IDs who are allowed to run this command
const allowedUserIds = ['1271600306383355979', '987654321098765432']; // Replace with your allowed user IDs

export default {
    name: 'clearlog',
    description: 'Clears the log file and mainheist.json file.',
    async execute(message, args, client, context) {
        const logFilePath = path.join(__dirname, '../log.txt');
        const jsonFilePath = path.join(__dirname, '../serverdata/mainheist.json');

        try {
            // Check if the user is allowed to run this command
            if (!allowedUserIds.includes(message.author.id)) {
                return message.reply('You do not have permission to use this command.');
            }

            // Log command execution
            context.logToFile(`[${message.guild.id}] [${message.author.tag}] Executed clearlog command.`);

            // Clear the log file
            await writeFile(logFilePath, '', 'utf8');

            // Clear the mainheist.json file
            await writeFile(jsonFilePath, '{}', 'utf8');

            // Send a confirmation message
            const embed = new EmbedBuilder()
                .setTitle('Files Cleared')
                .setDescription('The log file and mainheist.json file have been successfully cleared.')
                .setColor('#00ff00')  // Green color for success
                .setTimestamp();

            await message.channel.send({ embeds: [embed] });

        } catch (error) {
            console.error('Error executing clearlog command:', error);
            message.reply('There was an error trying to clear the files.');
        }
    }
};

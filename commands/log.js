import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import fs from 'fs';
import path from 'path';

// Path to the log file
const logFilePath = path.resolve('./log.txt');

// Replace with your Discord User ID
const allowedUserId = '1271600306383355979';

export default {
    name: 'log',
    description: 'Log commands to view log size and contents',
    async execute(message, args) {
        // Check if the user is allowed to run this command
        if (message.author.id !== allowedUserId) {
            const noPermsEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('Permission Denied')
                .setDescription('You do not have permission to use this command.');
            return message.reply({ embeds: [noPermsEmbed] });
        }

        // Ensure args are present
        if (!args.length) {
            const usageEmbed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('Invalid Usage')
                .setDescription('Usage: !log size to check the log file size\nUsage: !log <number> to view the last <number> lines of the log.');
            return message.reply({ embeds: [usageEmbed] });
        }

        if (args[0] === 'size') {
            // Handle !log size command
            try {
                const stats = fs.statSync(logFilePath);
                const fileSizeInBytes = stats.size;
                const fileSizeInKB = (fileSizeInBytes / 1024).toFixed(2); // Convert to KB

                const sizeEmbed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('Log File Size')
                    .setDescription(`The size of log.txt is ${fileSizeInKB} KB.`);
                return message.reply({ embeds: [sizeEmbed] });
            } catch (error) {
                console.error('Error reading log file size:', error);
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('Error')
                    .setDescription('Could not retrieve the log file size. Please check if the file exists.');
                return message.reply({ embeds: [errorEmbed] });
            }
        }

        // Handle !log <number> command
        const linesToRead = parseInt(args[0], 10);
        if (isNaN(linesToRead) || linesToRead <= 0) {
            const invalidUsageEmbed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('Invalid Usage')
                .setDescription('Please provide a positive number of lines to read.');
            return message.reply({ embeds: [invalidUsageEmbed] });
        }

        try {
            const logData = fs.readFileSync(logFilePath, 'utf8');
            const logLines = logData.trim().split('\n');
            const totalLines = logLines.length;

            // Get the last `linesToRead` lines from the log
            const lastLines = logLines.slice(-linesToRead).reverse(); // Reverse the order of lines

            const totalDisplayedLines = lastLines.length;

            // Prepare pages
            const linesPerPage = 5; // Change this value to fit your needs
            const totalPages = Math.ceil(totalDisplayedLines / linesPerPage);
            let currentPage = 0;

            // Create an initial embed
            const createEmbed = (page) => {
                const start = page * linesPerPage;
                const end = start + linesPerPage;
                const currentLines = lastLines.slice(start, end).join('\n') || 'No logs available.';

                return new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('Log Content')
                    .setDescription(`Here are the last ${linesToRead} lines of log.txt (Page ${page + 1}/${totalPages}):`)
                    .addFields({ name: 'Log Lines', value: currentLines });
            };

            // Create the first embed
            const embed = createEmbed(currentPage);

            // Create buttons
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('previous')
                        .setLabel('Previous')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(currentPage === 0),
                    new ButtonBuilder()
                        .setCustomId('next')
                        .setLabel('Next')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(totalPages <= 1)
                );

            const msg = await message.reply({ embeds: [embed], components: [row] });

            // Create a collector for button interaction
            const filter = (interaction) => interaction.user.id === message.author.id;
            const collector = msg.createMessageComponentCollector({ filter, time: 60000 });

            collector.on('collect', async (interaction) => {
                if (interaction.customId === 'next') {
                    currentPage++;
                } else if (interaction.customId === 'previous') {
                    currentPage--;
                }

                // Update the embed and buttons
                const newEmbed = createEmbed(currentPage);
                await interaction.update({ embeds: [newEmbed], components: [row] });
                
                // Update button states
                row.components[0].setDisabled(currentPage === 0);
                row.components[1].setDisabled(currentPage >= totalPages - 1);
            });

            collector.on('end', () => {
                row.components.forEach((button) => button.setDisabled(true));
                msg.edit({ components: [row] });
            });
        } catch (error) {
            console.error('Error reading log file content:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('Error')
                .setDescription('Could not read the log file. Please check if the file exists.');
            return message.reply({ embeds: [errorEmbed] });
        }
    }
};

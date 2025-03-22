import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { ActionRowBuilder, ButtonBuilder, EmbedBuilder, ButtonStyle } from 'discord.js';

// Resolve the directory of the current module file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Construct the paths to the required files
const carsFilePath = resolve(__dirname, '../utils/cars.json');
const toolsFilePath = resolve(__dirname, '../utils/tools.json');
const itemsFilePath = resolve(__dirname, '../utils/items.json');
const adminsFilePath = resolve(__dirname, '../admins.json');

// Load and parse the JSON data
const carsData = JSON.parse(fs.readFileSync(carsFilePath, 'utf-8'));
const toolsData = JSON.parse(fs.readFileSync(toolsFilePath, 'utf-8'));
const itemsData = JSON.parse(fs.readFileSync(itemsFilePath, 'utf-8'));
const adminsData = JSON.parse(fs.readFileSync(adminsFilePath, 'utf-8'));

export default {
    name: 'IDs',
    aliases: ['ids'],
    description: 'Show all item IDs with pagination (admin only)',
    cooldown: 5,
    execute: async (message) => {
        // Check if the user is an admin
        if (!adminsData.includes(message.author.id)) {
            return message.channel.send('You do not have permission to use this command.');
        }

        // Combine car, tool, and item IDs from all categories
        const carIDs = carsData.manufacturers.flatMap(manufacturer => manufacturer.cars.map(car => ({ id: car.car_ID, name: car.car_name })));
        const toolIDs = toolsData.usage.flatMap(toolm => toolm.tools.map(tool => ({ id: tool.tool_ID, name: tool.tool_name })));

        // Extract item IDs from both 'usage' and 'crime_items' arrays
        const usageItemIDs = itemsData.usage.flatMap(category =>
            category.items.map(item => ({
                id: item.item_ID,
                name: item.item_name,
                category: category.itemm_name // Correctly referencing category's name
            }))
        );
        
        const crimeItemIDs = itemsData.crime_items.flatMap(category =>
            category.items.map(item => ({
                id: item.item_ID,
                name: item.item_name,
                category: category.category_name // Correctly referencing category's name
            }))
        );

        // Combine all IDs (cars, tools, usage items, and crime items)
        const allIDs = [...carIDs, ...toolIDs, ...usageItemIDs, ...crimeItemIDs];

        // Pagination settings
        const itemsPerPage = 20; // Number of items to show per page
        const totalPages = Math.ceil(allIDs.length / itemsPerPage);
        let currentPage = 1;

        // Helper function to create the embed message for a given page
        const createEmbed = (page) => {
            const start = (page - 1) * itemsPerPage;
            const end = start + itemsPerPage;
            const pageItems = allIDs.slice(start, end);

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Item IDs')
                .setDescription(pageItems.map(item => `**ID:** ${item.id} - **Name:** ${item.name} (**Category:** ${item.category})`).join('\n'))
                .setFooter({ text: `Page ${page} of ${totalPages}` });

            return embed;
        };

        // Create the message components for pagination
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('prev')
                    .setLabel('Previous')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(currentPage === 1),
                new ButtonBuilder()
                    .setCustomId('next')
                    .setLabel('Next')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(currentPage === totalPages)
            );

        // Send the initial embed message
        const msg = await message.channel.send({ embeds: [createEmbed(currentPage)], components: [row] });

        // Create an interaction collector for handling pagination
        const filter = (interaction) => ['prev', 'next'].includes(interaction.customId) && interaction.user.id === message.author.id;
        const collector = msg.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async (interaction) => {
            if (interaction.customId === 'prev') {
                currentPage = Math.max(currentPage - 1, 1);
            } else if (interaction.customId === 'next') {
                currentPage = Math.min(currentPage + 1, totalPages);
            }

            // Update the embed and buttons
            const updatedEmbed = createEmbed(currentPage);
            const updatedRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev')
                        .setLabel('Previous')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(currentPage === 1),
                    new ButtonBuilder()
                        .setCustomId('next')
                        .setLabel('Next')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(currentPage === totalPages)
                );

            await interaction.update({ embeds: [updatedEmbed], components: [updatedRow] });
        });

        collector.on('end', () => {
            // Disable all buttons after the collector ends
            row.components.forEach(button => button.setDisabled(true));
            msg.edit({ components: [row] });
        });
    }
};

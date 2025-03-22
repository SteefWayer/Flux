import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, Colors } from 'discord.js';

dotenv.config();

// Get the current directory from the URL
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
    name: 'developercommands',
    aliases: ['devcommands', 'devcmds'],
    description: 'Displays a list of developer commands with pagination.',
    execute: async (message, args) => {
        // Define your command pages
        const pages = [
            {
                title: '🔧 Developer Commands - Page 1',
                description: 'Welcome! Here are some useful pages of commands:\n\n' +
                    '**Page 2:** Economy commands\n' +
                    '**Page 3:** Badge commands\n' +
                    '**Page 4:** Bot commands',
                footer: 'Use the buttons below to navigate.',
            },
            {
                title: '💰 Economy Commands - Page 2',
                description: '**Economy commands:**\n\n' +
                    '`!addmoney @user <amount>` - Add money to a user. **Owner only.**\n' +
                    '`!addinventory @user <ID> <amount>` - Add an item to a user. **Owner only.**\n' +
                    '`!ids` - Show all IDs from items, tools, and more. **Owner only.**',
                footer: 'Use the buttons below to navigate.',
            },
            {
                title: '🏅 Badge Commands - Page 3',
                description: '**Badge commands:**\n\n' +
                    '`!addbadge @user <badge ID>` - Add a badge to any user. **Owner and dev only.**\n' +
                    '`!removebadge @user <badge ID>` - Remove a badge from any user. **Owner and dev only.**\n' +
                    '`!badgeids [page]` - Show all badge IDs. **Owner and dev only.**',
                footer: 'Use the buttons below to navigate.',
            },
            {
                title: '🤖 Bot Commands - Page 4',
                description: '**Additional Commands:**\n\n' +
                    '`!reload` - Restart the bot. **Owner only.**\n' +
                    '`!reset` - Reset all economy data. **Owner only.**\n',
                footer: 'Use the buttons below to navigate.',
            },
        ];

        let pageIndex = 0; // Track the current page index

        // Create an embed function
        const createEmbed = (page) => {
            return new EmbedBuilder()
                .setTitle(page.title)
                .setDescription(page.description)
                .setFooter({ text: page.footer })
                .setColor(Colors.Blue)
                .setTimestamp(); // Add a timestamp for better context
        };

        // Create buttons for pagination
        const createButtons = () => {
            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('prev')
                    .setLabel('◀️ Previous')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(pageIndex === 0), // Disable if on the first page
                new ButtonBuilder()
                    .setCustomId('next')
                    .setLabel('▶️ Next')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(pageIndex === pages.length - 1) // Disable if on the last page
            );
            return buttons;
        };

        // Send the initial embed and buttons
        const embedMessage = await message.channel.send({
            embeds: [createEmbed(pages[pageIndex])],
            components: [createButtons()],
        });

        // Create a filter for button interactions
        const filter = (interaction) => interaction.user.id === message.author.id;

        // Create a collector to handle button clicks
        const collector = embedMessage.createMessageComponentCollector({ filter, time: 60000 }); // 60 seconds timeout

        collector.on('collect', (interaction) => {
            if (interaction.customId === 'prev') {
                pageIndex = (pageIndex > 0) ? pageIndex - 1 : pages.length - 1; // Go to previous page
            } else if (interaction.customId === 'next') {
                pageIndex = (pageIndex < pages.length - 1) ? pageIndex + 1 : 0; // Go to next page
            }

            // Update the embed message and buttons
            embedMessage.edit({
                embeds: [createEmbed(pages[pageIndex])],
                components: [createButtons()],
            });

            // Acknowledge the interaction
            interaction.deferUpdate();
        });

        collector.on('end', () => {
            embedMessage.edit({ components: [] }); // Clear buttons after collector ends
        });
    },
};

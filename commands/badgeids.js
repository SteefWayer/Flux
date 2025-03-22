import { EmbedBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';

const userDataPath = path.resolve('./data/userdata.json');
const badgesPath = path.resolve('./utils/badges.json');

export default {
    name: 'badgeids',
    description: 'Displays all badge IDs and details.',
    execute: async (message, args) => {
        // Read userdata.json to get current user data
        let userData;
        try {
            userData = JSON.parse(fs.readFileSync(userDataPath, 'utf8'));
        } catch (error) {
            console.error('Error reading user data:', error);
            return message.channel.send('Failed to read user data. Please try again later.');
        }

        const userId = message.member.id;

        // Check if the user has badges
        const userBadges = userData[userId]?.badges || [];
        const hasPermission = userBadges.includes('B8') || userBadges.includes('B10');

        if (!hasPermission) {
            return message.reply("You don't have permission to use this command.");
        }

        // Read badges.json to get badge details
        let badges;
        try {
            badges = JSON.parse(fs.readFileSync(badgesPath, 'utf8'));
        } catch (error) {
            console.error('Error reading badges data:', error);
            return message.channel.send('Failed to read badge data. Please try again later.');
        }

        // Pagination setup
        const pageSize = 10;
        const totalPages = Math.ceil(badges.length / pageSize);
        let pageNumber = parseInt(args[0]) || 1;

        // Validate page number
        if (pageNumber < 1 || pageNumber > totalPages) {
            return message.reply(`Please provide a valid page number between 1 and ${totalPages}.`);
        }

        // Slice the badges for the current page
        const start = (pageNumber - 1) * pageSize;
        const end = start + pageSize;
        const badgesToShow = badges.slice(start, end);

        // Create the embed
        const embed = new EmbedBuilder()
            .setTitle(`Badge IDs (Page ${pageNumber}/${totalPages})`)
            .setColor('#FFD700')
            .setDescription('Here are the available badges:');

        badgesToShow.forEach(badge => {
            embed.addFields({
                name: `ID: ${badge.id}`,
                value: `${badge.emoji} **${badge.name}**\n${badge.description}`,
                inline: false,
            });
        });

        // Send the embed
        await message.channel.send({ embeds: [embed] });

        // Pagination options
        if (totalPages > 1) {
            const paginationEmbed = new EmbedBuilder()
                .setTitle('Pagination')
                .setColor('#FFD700')
                .setDescription(`Use \`!badgeids <page number>\` to view different pages.`);
            await message.channel.send({ embeds: [paginationEmbed] });
        }
    }
};

import fs from 'fs';
import path from 'path';
import { EmbedBuilder } from 'discord.js';

const userDataPath = path.resolve('./data/userdata.json');
const badgesPath = path.resolve('./utils/badges.json');

export default {
    name: 'badges',
    description: 'Displays the badges of the user or a mentioned user.',
    usage: '!badges @username',
    execute: async (message, args) => {
        // Read userdata.json to get current user data
        let userData;
        try {
            userData = JSON.parse(fs.readFileSync(userDataPath, 'utf8'));
        } catch (error) {
            console.error('Error reading user data:', error);
            return message.channel.send('Failed to read user data. Please try again later.');
        }

        // Read badges.json to get badge details
        let badges;
        try {
            badges = JSON.parse(fs.readFileSync(badgesPath, 'utf8'));
        } catch (error) {
            console.error('Error reading badges data:', error);
            return message.channel.send('Failed to read badges data. Please try again later.');
        }

        // Determine the target user
        const targetUser = message.mentions.users.first() || message.author;
        const targetUserId = targetUser.id;

        // Get user badges
        const userBadges = userData[targetUserId]?.badges || [];

        // Format badges with details
        const badgeDetails = userBadges.map(badgeId => {
            const badge = badges.find(b => b.id === badgeId);
            return badge ? `${badge.emoji} ${badge.name} - ${badge.description}` : null;
        }).filter(Boolean);

        // Create the embed
        const embed = new EmbedBuilder()
            .setTitle(`${targetUser.username}'s Badges`)
            .setColor(userBadges.length > 0 ? badges.find(b => b.id === userBadges[0])?.color || '#FFFFFF' : '#FFFFFF')
            .setDescription(badgeDetails.length > 0 ? badgeDetails.join('\n') : 'No badges found.');

        // Send the embed
        await message.channel.send({ embeds: [embed] });
    }
};

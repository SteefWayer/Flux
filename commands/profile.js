import { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } from 'discord.js';
import fs from 'fs';
import path from 'path';

// Define the paths to the userdata.json and badges.json files
const userDataPath = path.resolve('./data/userdata.json');
const badgesDataPath = path.resolve('./utils/badges.json');
const economyDataPath = path.resolve('./data/economy.json');

const BOT_OWNER_ID = '1271600306383355979';

export default {
    name: 'profile',
    aliases: ['userprofile', 'pinfo'],
    description: 'Displays your profile information.',
    usage: '!profile [@mention|userID]',
    execute: async (message, args) => {
        let targetUser;
        let userId;

        // Check if the first argument is a mention or a user ID
        if (args[0]) {
            if (message.mentions.users.first()) {
                targetUser = message.mentions.users.first();
            } else {
                // Try to fetch the user by ID
                try {
                    targetUser = await message.guild.members.fetch(args[0]);
                } catch (error) {
                    return message.reply('Cannot find the user in this guild.');
                }
            }
        } else {
            // Default to the author if no argument is provided
            targetUser = message.author;
        }

        userId = targetUser.id;

        // Read userdata.json to get profile data
        let userData;
        try {
            userData = JSON.parse(fs.readFileSync(userDataPath, 'utf8'));
        } catch (error) {
            console.error('Error reading user data:', error);
            return message.channel.send('Failed to read user data. Please try again later.');
        }

        // Read badges.json to get badge data
        let badgeData;
        try {
            badgeData = JSON.parse(fs.readFileSync(badgesDataPath, 'utf8'));
        } catch (error) {
            console.error('Error reading badge data:', error);
            return message.channel.send('Failed to read badge data. Please try again later.');
        }

        // Read economy.json to get user balance
        let economyData;
        try {
            economyData = JSON.parse(fs.readFileSync(economyDataPath, 'utf8'));
        } catch (error) {
            console.error('Error reading economy data:', error);
            return message.channel.send('Failed to read economy data. Please try again later.');
        }

        const pnickname = userData[userId]?.pnickname || 'Not set';
        const description = userData[userId]?.description || 'Not set';
        const userBalance = economyData[userId] ? economyData[userId].withdrawnCash + (economyData[userId].bankBalance || 0) : 0;

        // Create embed for bot owner's unique profile
        const embed = new EmbedBuilder()
            .setColor(userId === BOT_OWNER_ID ? '#FFD700' : '#3498db') // Gold for bot owner, blue for others
            .setTitle(`👤 Profile of ${targetUser.user ? targetUser.user.username : targetUser.username}`)
            .setThumbnail(targetUser.user ? targetUser.user.displayAvatarURL({ dynamic: true }) : targetUser.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: 'Nickname', value: `**${pnickname}**`, inline: true },
                { name: 'User ID', value: `\`${userId}\``, inline: true },
                { name: 'Total Balance', value: `💰 **${userBalance}**`, inline: false },
                { name: 'Description', value: `_${description}_`, inline: false }
            );

        // Add badges
        const badges = userData[userId]?.badges || [];
        if (badges.length > 0) {
            const badgeDescriptions = badges.map(badgeId => {
                const badge = badgeData.find(b => b.id === badgeId);
                return badge ? `${badge.emoji} **${badge.name}**: ${badge.description}` : 'Unknown Badge';
            });

            embed.addFields(
                { name: '🏅 Badges', value: badgeDescriptions.join('\n') || 'No badges', inline: false }
            );
        }

        // Add special badge for the bot owner
        if (userId === BOT_OWNER_ID) {
            embed.addFields(
                { name: '👑 Special Badge', value: '✨ **Bot Creator**', inline: true },
                { name: '🔧 Custom Features', value: 'You have access to exclusive commands and stats!', inline: false }
            );
        }

        embed.setFooter({ text: `Requested by ${message.author.username}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
            .setTimestamp();

        // Create buttons for details and roles
        const detailsButton = new ButtonBuilder()
            .setCustomId('show_details')
            .setLabel('Details')
            .setStyle(ButtonStyle.Primary);

        const rolesButton = new ButtonBuilder()
            .setCustomId('show_roles')
            .setLabel('Roles')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder().addComponents(detailsButton, rolesButton);

        const profileMessage = await message.channel.send({ embeds: [embed], components: [row] });

        // Create a collector for button interactions
        const collector = profileMessage.createMessageComponentCollector({ time: 60000 }); // 60 seconds

        collector.on('collect', async (interaction) => {
            await interaction.deferUpdate(); // Acknowledge the button click
            // Handle button clicks
            if (interaction.customId === 'show_details') {
                // Get command usage statistics
                const commandsRan = userData[userId]?.commands || { daily: 0, all: 0 };
                const detailsEmbed = new EmbedBuilder()
                    .setColor('#3498db')
                    .setTitle(`📋 Details for ${targetUser.user ? targetUser.user.username : targetUser.username}`)
                    .addFields(
                        { name: 'Joined Server', value: `\`${(await message.guild.members.fetch(userId)).joinedAt?.toDateString() || 'Unknown'}\``, inline: true },
                        { name: 'Account Created', value: `\`${targetUser.user ? targetUser.user.createdAt?.toDateString() : targetUser.createdAt?.toDateString() || 'Unknown'}\``, inline: true },
                        { name: 'Roles', value: `${(await message.guild.members.fetch(userId)).roles.cache.size ? (await message.guild.members.fetch(userId)).roles.cache.map(role => role.toString()).join(', ') : 'No roles'}`, inline: true },
                        { name: 'Bot', value: `\`${targetUser.user ? targetUser.user.bot : targetUser.bot ? 'Yes' : 'No'}\``, inline: true },
                        { name: 'Online Status', value: `\`${(await message.guild.members.fetch(userId)).presence?.status ? capitalizeFirstLetter((await message.guild.members.fetch(userId)).presence.status) : 'Offline'}\``, inline: true },
                        { name: 'Game', value: `\`${(await message.guild.members.fetch(userId)).presence?.activities[0]?.name || 'Not playing'}\``, inline: true },
                        { name: 'Commands Run', value: `Daily: **${commandsRan.daily}**, Total: **${commandsRan.all}**`, inline: false }
                    )
                    .setFooter({ text: `Requested by ${message.author.username}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();

                // Update the message to show the details embed and remove the buttons
                await profileMessage.edit({ embeds: [detailsEmbed], components: [] });
            } else if (interaction.customId === 'show_roles') {
                // Create a new embed for user roles
                const roles = (await message.guild.members.fetch(userId)).roles.cache.size ? (await message.guild.members.fetch(userId)).roles.cache.map(role => `${role.name} (ID: ${role.id})`).join('\n') : 'No roles';
                const rolesEmbed = new EmbedBuilder()
                    .setColor('#3498db')
                    .setTitle(`🛠️ Roles for ${targetUser.user ? targetUser.user.username : targetUser.username}`)
                    .setDescription(roles)
                    .setFooter({ text: `Requested by ${message.author.username}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();

                // Update the message to show the roles embed and remove the buttons
                await profileMessage.edit({ embeds: [rolesEmbed], components: [] });
            }
        });

        collector.on('end', () => {
            // Disable buttons after collector ends
            profileMessage.edit({ components: [] });
        });
    }
};

// Helper function to capitalize the first letter of a string
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

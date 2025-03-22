import { readFile } from 'fs/promises';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Convert import.meta.url to __filename and __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const xpFilePath = path.join(__dirname, '..', '..', 'data', 'xp.json');
const usersPerPage = 10;

const calculateLevel = (xp) => {
    let level = 1;
    let xpRequired = 300;
    let totalXPRequired = xpRequired;

    while (xp >= totalXPRequired) {
        level++;
        xpRequired += 50; // Increase required XP by 50 for each level
        totalXPRequired += xpRequired;
    }

    return level;
};

const getXPLeaderboard = async (guildId, client) => {
    try {
        const xpData = await readFile(xpFilePath, 'utf8');
        const xp = JSON.parse(xpData);

        // Check if the guild has data in xp.json
        if (!xp[guildId]) {
            throw new Error('No XP data for this guild.');
        }

        const guildXP = xp[guildId];
        const userIds = Object.keys(guildXP);
        const validUserIds = [];

        // Fetch valid users
        const users = await Promise.all(
            userIds.map(async id => {
                try {
                    const user = await client.users.fetch(id);
                    validUserIds.push(id);
                    return user;
                } catch (error) {
                    console.error(`Could not fetch user with ID ${id}:`, error);
                    return null;
                }
            })
        );

        const sortedUsers = validUserIds
            .map(id => {
                const userXP = guildXP[id].xp || 0;
                const level = calculateLevel(userXP);
                return {
                    id,
                    user: users.find(user => user && user.id === id),
                    username: guildXP[id].username || 'Unknown',
                    xp: userXP,
                    level: level
                };
            })
            .filter(user => user.user)
            .sort((a, b) => b.xp - a.xp);

        return sortedUsers;
    } catch (error) {
        console.error('Error reading XP data:', error);
        throw error;
    }
};

export const handleXPLeaderboard = async (message, args, client) => {
    try {
        const guildId = message.guild.id;
        const sortedUsers = await getXPLeaderboard(guildId, client);

        if (sortedUsers.length === 0) {
            return message.reply('No XP data available for this guild.');
        }

        const totalPages = Math.ceil(sortedUsers.length / usersPerPage);
        let page = args[1] ? parseInt(args[1], 10) : 1;
        if (isNaN(page) || page < 1) page = 1;
        if (page > totalPages) page = totalPages;

        const start = (page - 1) * usersPerPage;
        const end = start + usersPerPage;
        const usersOnPage = sortedUsers.slice(start, end);

        const positionEmoji = ['🥇', '🥈', '🥉'];

        const embed = new EmbedBuilder()
            .setTitle(`XP Leaderboard - Page ${page}/${totalPages}`)
            .setDescription(
                usersOnPage.map((user, index) => {
                    const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🔹';
                    return `${rankEmoji} **<@${user.id}>**\n` +
                           `__XP: ${user.xp.toLocaleString()} | Level: ${user.level}__`;
                }).join('\n') || 'No users found.'
            )
            .setColor('#00ff00')
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('prev_page')
                    .setLabel('Previous')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === 1),
                new ButtonBuilder()
                    .setCustomId('next_page')
                    .setLabel('Next')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === totalPages)
            );

        const leaderboardMessage = await message.channel.send({
            embeds: [embed],
            components: [row]
        });

        const filter = interaction => interaction.user.id === message.author.id;
        const collector = leaderboardMessage.createMessageComponentCollector({
            filter,
            time: 60000
        });

        collector.on('collect', async interaction => {
            if (interaction.customId === 'prev_page') page--;
            if (interaction.customId === 'next_page') page++;

            const newStart = (page - 1) * usersPerPage;
            const newEnd = newStart + usersPerPage;
            const newUsersOnPage = sortedUsers.slice(newStart, newEnd);

            const newEmbed = new EmbedBuilder()
                .setTitle(`XP Leaderboard - Page ${page}/${totalPages}`)
                .setDescription(
                    newUsersOnPage.map((user, index) => {
                        const position = newStart + index + 1;
                        const emoji = position <= 3 ? positionEmoji[position - 1] : '🔹';
                        return `${emoji} **<@${user.id}>**\n` +
                               `__XP: ${user.xp.toLocaleString()} | Level: ${user.level}__`;
                    }).join('\n') || 'No users found.'
                )
                .setColor('#3498db')
                .setFooter({ text: `Requested by ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
                .setTimestamp()
                .setThumbnail(client.user.displayAvatarURL());

            const newRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev_page')
                        .setLabel('Previous')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === 1),
                    new ButtonBuilder()
                        .setCustomId('next_page')
                        .setLabel('Next')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === totalPages)
                );

            await interaction.update({
                embeds: [newEmbed],
                components: [newRow]
            });
        });

        collector.on('end', () => {
            leaderboardMessage.edit({
                components: []
            });
        });

    } catch (error) {
        console.error('Error executing XP leaderboard command:', error);
        message.reply('There was an error trying to display the XP leaderboard.');
    }
};

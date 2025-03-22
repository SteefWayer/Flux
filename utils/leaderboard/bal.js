import { readFile } from 'fs/promises';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const economyFilePath = path.join(__dirname, '..', '..', 'data', 'economy.json');
const inventoryFilePath = path.join(__dirname, '..', '..', 'data', 'inventory.json');

const usersPerPage = 10;

const getBalanceLeaderboard = async (client) => {
    const economyData = await readFile(economyFilePath, 'utf8');
    const economy = JSON.parse(economyData);

    const inventoryData = await readFile(inventoryFilePath, 'utf8');
    const inventory = JSON.parse(inventoryData);

    const userIds = Object.keys(economy);
    const users = await Promise.all(
        userIds.map(async id => {
            try {
                return await client.users.fetch(id);
            } catch (error) {
                console.error(`Could not fetch user with ID ${id}:`, error);
                return null;
            }
        })
    );

    const sortedUsers = userIds
        .map(id => ({
            id,
            user: users.find(user => user && user.id === id),
            username: economy[id].userName || 'Unknown',
            balance: (economy[id].withdrawnCash || 0) + (economy[id].bankBalance || 0),
            inventorySize: Object.keys(inventory[id] || {}).length
        }))
        .filter(user => user.user)
        .sort((a, b) => b.balance - a.balance);

    return sortedUsers;
};

export const handleBalance = async (message, args, client) => {
    try {
        const sortedUsers = await getBalanceLeaderboard(client);

        const totalPages = Math.ceil(sortedUsers.length / usersPerPage);
        let page = args[1] ? parseInt(args[1], 10) : 1;
        if (isNaN(page) || page < 1) page = 1;
        if (page > totalPages) page = totalPages;

        const start = (page - 1) * usersPerPage;
        const end = start + usersPerPage;
        const usersOnPage = sortedUsers.slice(start, end);

        const positionEmoji = ['🥇', '🥈', '🥉'];

        const embed = new EmbedBuilder()
            .setTitle(`Leaderboard - Page ${page}/${totalPages}`)
            .setDescription(
                usersOnPage.map((user, index) => {
                    const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🔹';
                    return `${rankEmoji} <@${user.id}>\n` +
                           `__Balance: ⏣ ${user.balance.toLocaleString()}__ | 📦 **Inventory Size**: ${user.inventorySize}`;
                }).join('\n')
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
                .setTitle(`Leaderboard - Page ${page}/${totalPages}`)
                .setDescription(
                    newUsersOnPage.map((user, index) => {
                        const position = newStart + index + 1;
                        const emoji = position <= 3 ? positionEmoji[position - 1] : '🔹';
                        return `**${emoji} <@${user.id}>**\n` +
                               `__Balance: ⏣ ${user.balance.toLocaleString()}__ | 📦 **Inventory Size**: ${user.inventorySize}`;
                    }).join('\n')
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
        console.error('Error executing balance leaderboard command:', error);
        message.reply('There was an error trying to display the balance leaderboard.');
    }
};

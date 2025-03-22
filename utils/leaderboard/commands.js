import { readFile } from 'fs/promises';
import { EmbedBuilder } from 'discord.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Convert import.meta.url to __filename and __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const userdataFilePath = path.join(__dirname, '..', '..', 'data', 'userdata.json');
const usersPerPage = 10;

const getCommandLeaderboard = async () => {
    const userdata = await readFile(userdataFilePath, 'utf8');
    const users = JSON.parse(userdata);

    const userIds = Object.keys(users);
    const sortedUsers = userIds
        .map(id => ({
            id,
            username: users[id].pnickname || 'Unknown',
            commands: users[id].commands.all || 0,
        }))
        .sort((a, b) => b.commands - a.commands);

    return sortedUsers;
};

export const handleCommands = async (message, args) => {
    try {
        const sortedUsers = await getCommandLeaderboard();

        const totalPages = Math.ceil(sortedUsers.length / usersPerPage);
        let page = args[1] ? parseInt(args[1], 10) : 1;
        if (isNaN(page) || page < 1) page = 1;
        if (page > totalPages) page = totalPages;

        const start = (page - 1) * usersPerPage;
        const end = start + usersPerPage;
        const usersOnPage = sortedUsers.slice(start, end);

        const embed = new EmbedBuilder()
            .setTitle(`Command Leaderboard - Page ${page}/${totalPages}`)
            .setDescription(
                usersOnPage.map((user, index) => {
                    const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🔹';
                    return `${rankEmoji} <@${user.id}> - **Total Commands**: ${user.commands}`;
                }).join('\n')
            )
            .setColor('#00ff00')
            .setTimestamp();

        await message.channel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Error executing commands leaderboard command:', error);
        message.reply('There was an error trying to display the command leaderboard.');
    }
};

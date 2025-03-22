import fs from 'fs/promises';
import path from 'path';

console.log('Script loaded successfully.');

setTimeout(() => {
    console.log('10 seconds have passed since the script was loaded.');
}, 10000);

const xpFilePath = path.join(process.cwd(), './data/xp.json');
const levelsFilePath = path.join(process.cwd(), './utils/levels.json');
const serverModsFilePath = path.join(process.cwd(), './serverdata/servermods.json');

const readXPData = async () => {
    let xpData = {};
    try {
        const rawXPData = await fs.readFile(xpFilePath, 'utf-8');
        xpData = JSON.parse(rawXPData);
    } catch (err) {
        if (err.code === 'ENOENT') {
            console.error('XP data file not found. Initializing with empty data.');
        } else {
            console.error('Error reading XP data:', err);
        }
    }
    return xpData;
};

const readLevelsData = async () => {
    let levelsData = {};
    try {
        const rawLevelsData = await fs.readFile(levelsFilePath, 'utf-8');
        levelsData = JSON.parse(rawLevelsData);
    } catch (err) {
        console.error('Error reading levels data:', err);
    }
    return levelsData.levels;
};

const readServerModsData = async () => {
    let modsData = {};
    try {
        const rawModsData = await fs.readFile(serverModsFilePath, 'utf-8');
        modsData = JSON.parse(rawModsData);
    } catch (err) {
        console.error('Error reading server mods data:', err);
    }
    return modsData;
};

const writeXPData = async (xpData) => {
    try {
        await fs.writeFile(xpFilePath, JSON.stringify(xpData, null, 2), 'utf-8');
    } catch (err) {
        console.error('Error writing XP data:', err);
    }
};

const execute = async (message) => {
    const modsData = await readServerModsData();
    const guildId = message.guild.id;
    const memberId = message.member.id;
    const isAdmin = modsData[guildId]?.admins?.includes(memberId);

    if (!isAdmin) {
        return message.reply({
            embeds: [
                {
                    color: 0xFF0000,
                    title: 'Permission Denied',
                    description: '**You do not have permission to use this command.**',
                    fields: [
                        { name: 'Access Restricted', value: 'Only server administrators can execute this command.' },
                        { name: 'Server Owner Action', value: 'The server owner can add server administrators using the command: `!sadmin add @user`.' }
                    ],
                    footer: { text: 'Contact the server owner for more information.' },
                    timestamp: new Date(),
                },
            ],
        });
    }

    const args = message.content.split(' ').slice(1);
    const userMention = args[0];
    const level = parseInt(args[1], 10);

    if (!userMention || isNaN(level)) {
        return message.reply('Usage: !setlevel @user level');
    }

    const userId = userMention.replace(/[<@!>]/g, '');
    const xpData = await readXPData();
    const levels = await readLevelsData();

    if (!xpData[guildId]) xpData[guildId] = {};
    if (!xpData[guildId][userId]) {
        const username = message.guild.members.cache.get(userId)?.user.username || 'Unknown';
        xpData[guildId][userId] = { username, level: 1, xpRequiredForNextLevel: 300 };
    }

    if (level < 0 || level >= Object.keys(levels).length) {
        return message.reply('Please provide a valid level number.');
    }

    xpData[guildId][userId].level = level;
    const requiredXP = levels[level];
    xpData[guildId][userId].xp = requiredXP;
    xpData[guildId][userId].xpRequiredForNextLevel = levels[level + 1] || null;

    await writeXPData(xpData);
    await message.reply(`Successfully set <@${userId}>'s level to ${level} and XP to ${requiredXP}.`);
};

export default {
    name: 'setlevel',
    description: 'Set a specific level for a user, adjusting their XP accordingly.',
    execute,
};

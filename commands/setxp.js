// ./commands/setxp.js
import fs from 'fs/promises';
import path from 'path';

// Paths to the xp.json and levels.json files
const xpFilePath = path.join(process.cwd(), './data/xp.json');
const levelsFilePath = path.join(process.cwd(), './utils/levels.json');
const serverModsFilePath = path.join(process.cwd(), './serverdata/servermods.json'); // Path to servermods.json

// Function to read XP data from xp.json
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

// Function to read levels data from levels.json
const readLevelsData = async () => {
    let levelsData = {};
    try {
        const rawLevelsData = await fs.readFile(levelsFilePath, 'utf-8');
        levelsData = JSON.parse(rawLevelsData);
    } catch (err) {
        console.error('Error reading levels data:', err);
    }
    return levelsData.levels; // Return the levels object
};

// Function to read server mods data
const readServerModsData = async () => {
    let modsData = {};
    try {
        const rawModsData = await fs.readFile(serverModsFilePath, 'utf-8');
        modsData = JSON.parse(rawModsData);
    } catch (err) {
        console.error('Error reading server mods data:', err);
    }
    return modsData; // Return the mods data object
};

// Function to write XP data back to xp.json
const writeXPData = async (xpData) => {
    try {
        await fs.writeFile(xpFilePath, JSON.stringify(xpData, null, 2), 'utf-8');
    } catch (err) {
        console.error('Error writing XP data:', err);
    }
};

// Function to determine the level based on XP
const getLevelFromXP = (xp, levels) => {
    let level = 0;
    for (const [key, requiredXP] of Object.entries(levels)) {
        if (xp >= requiredXP) {
            level = parseInt(key);
        } else {
            break;
        }
    }
    return level;
};

// Command execution function
const execute = async (message) => {
    // Load server mods data to check admin permissions
    const modsData = await readServerModsData();
    const guildId = message.guild.id;
    const memberId = message.member.id;

    // Check if the member is in the list of server admins
    const isAdmin = modsData[guildId]?.admins?.includes(memberId);
    if (!isAdmin) {
        return message.reply({
            embeds: [
                {
                    color: 0xFF0000, // Red color
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

    // Ensure the command is called in the correct format
    const args = message.content.split(' ').slice(1);
    const userMention = args[0];
    const xpAmount = parseInt(args[1], 10);

    // Validate user mention and XP amount
    if (!userMention || isNaN(xpAmount)) {
        return message.reply('Usage: !setxp @user amount');
    }

    // Extract user ID from mention
    const userId = userMention.replace(/[<@!>]/g, '');

    const xpData = await readXPData();
    const levels = await readLevelsData(); // Get levels data

    // Ensure the server and user are tracked
    if (!xpData[guildId]) xpData[guildId] = {};
    if (!xpData[guildId][userId]) {
        const username = message.guild.members.cache.get(userId)?.user.username || 'Unknown';
        xpData[guildId][userId] = { username, level: 1, xpRequiredForNextLevel: 300 };
    }

    // Set the specific XP amount
    xpData[guildId][userId].xp = xpAmount;

    // Determine the new level based on the XP
    const newLevel = getLevelFromXP(xpAmount, levels);
    xpData[guildId][userId].level = newLevel;

    // Set the XP required for the next level
    xpData[guildId][userId].xpRequiredForNextLevel = levels[newLevel + 1] || null;

    // Write the updated XP data back to the file
    await writeXPData(xpData);

    await message.reply(`Successfully set <@${userId}>'s XP to ${xpAmount} and level to ${newLevel}.`);
};

// Default export with command name and execute function
export default {
    name: 'setxp',
    description: 'Set a specific XP amount for a user.',
    execute,
};

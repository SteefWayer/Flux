// ./commands/resetlevels.js
import fs from 'fs/promises';
import path from 'path';
import { EmbedBuilder } from 'discord.js'; // Import EmbedBuilder

// Path to the xp.json file
const xpFilePath = path.join(process.cwd(), './data/xp.json');

// Path to the server mods data file
const serverModsFilePath = path.join(process.cwd(), './serverdata/servermods.json');

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

// Function to write empty XP data back to xp.json
const writeXPData = async (xpData) => {
    try {
        await fs.writeFile(xpFilePath, JSON.stringify(xpData, null, 2), 'utf-8');
    } catch (err) {
        console.error('Error writing XP data:', err);
    }
};

// Function to load mods data from servermods.json
const loadModsData = async () => {
    let modsData = {};
    try {
        const rawModsData = await fs.readFile(serverModsFilePath, 'utf-8');
        modsData = JSON.parse(rawModsData);
    } catch (err) {
        console.error('Error reading server mods data:', err);
    }
    return modsData;
};

// Command execution function
const execute = async (message) => {
    // Load mods data
    const modsData = await loadModsData();
    const guildId = message.guild.id;

    // Check if the user is an admin from the mods data
    const memberId = message.member.id;
    if (!modsData[guildId] || !modsData[guildId].admins.includes(memberId)) {
        return message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#FF0000') // Set the color to red for a warning
                    .setTitle('Permission Denied')
                    .setDescription('**You do not have permission to use this command.**')
                    .addFields(
                        { name: 'Access Restricted', value: 'Only server administrators can execute this command.' },
                        { name: 'Server Owner Action', value: 'The server owner can add server administrators using the command: `!sadmin add @user`.' }
                    )
                    .setFooter({ text: 'Contact the server owner for more information.' })
                    .setTimestamp(),
            ],
        });
            }

    // Confirm that the command is being used correctly
    const args = message.content.split(' ').slice(1);
    if (args.length > 0) {
        return message.reply('Usage: !resetlevels');
    }

    // Read current XP data
    const xpData = await readXPData();

    // Check if the guild exists in the data
    if (!xpData[guildId]) {
        return message.reply('No XP data found for this server.');
    }

    // Reset all users' levels and XP for the guild
    xpData[guildId] = {}; // Clear the data for the entire guild

    // Write the updated (cleared) XP data back to the file
    await writeXPData(xpData);

    await message.reply('Successfully reset all levels and XP for this server.');
};

// Default export with command name and execute function
export default {
    name: 'resetlevels',
    description: 'Reset all user levels and XP for the entire server.',
    execute,
};

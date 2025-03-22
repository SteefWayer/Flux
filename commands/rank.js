import { generateRankImage } from '../utils/generateRankImage.js';
import { AttachmentBuilder } from 'discord.js';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix for ES module scope to get __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to xp.json
const xpFilePath = path.join(__dirname, '..', 'data', 'xp.json');

// Load XP data from xp.json
const loadXPData = async () => {
    try {
        const xpData = await readFile(xpFilePath, 'utf8');
        return JSON.parse(xpData);
    } catch (error) {
        console.error(`Error loading XP data: ${error.message}`);
        throw error;
    }
};

// Get user's XP and level based on server and user ID
const getUserXPAndLevel = async (serverId, userId, username) => {
    const xpData = await loadXPData();

    // Check if the user exists in the server's data
    if (xpData[serverId] && xpData[serverId][userId]) {
        const userXPData = xpData[serverId][userId];
        return {
            xp: userXPData.xp || 0,
            level: userXPData.level || 0,
            username: userXPData.username || username,
            nextLevelXP: userXPData.xpRequiredForNextLevel || 100, // Default value if not available
        };
    } else {
        // Return default values if the user doesn't exist in the data
        return {
            xp: 0,
            level: 0,
            username: username,
            nextLevelXP: 100, // Default value if no data
        };
    }
};

export default {
    name: 'rank',
    description: 'Displays user rank',
    async execute(message) {
        if (!message || !message.guild) {
            console.error('Message or guild not defined.');
            return;
        }

        const serverId = message.guild.id;
        const userId = message.author.id;
        const username = message.author.username;

        // Fetch user's XP and level from xp.json
        try {
            const userData = await getUserXPAndLevel(serverId, userId, username);
            const xp = userData.xp;
            const level = userData.level;
            const nextLevelXP = userData.nextLevelXP;
            const avatarUrl = message.author.displayAvatarURL({ format: 'png', size: 512 });

            // Generate rank image using actual data
            const rankImage = await generateRankImage({ username }, xp, level, nextLevelXP);

            // Create an attachment from the rank image buffer
            const attachment = new AttachmentBuilder(rankImage, { name: 'rank.png' });

            // Send the image as an attachment
            await message.reply({ files: [attachment] });
        } catch (error) {
            console.error('Error generating rank image:', error);
            await message.reply('There was an error generating your rank image.');
        }
    }
};

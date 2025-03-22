import { readFile, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const levelsFilePath = path.join(__dirname, 'utils', 'levels.json');
const xpFilePath = path.join(__dirname, 'data', 'xp.json');

const enableLogging = true;

const log = (message) => {
    if (enableLogging) {
        console.log(message);
    }
};

const loadLevels = async () => {
    try {
        const data = await readFile(levelsFilePath, 'utf8');
        return JSON.parse(data).levels;
    } catch (error) {
        log(`Failed to load levels: ${error.message}`);
        throw error;
    }
};

const loadXPData = async () => {
    try {
        const data = await readFile(xpFilePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        log(`Failed to load XP data: ${error.message}`);
        return {};
    }
};

const saveXPData = async (data) => {
    try {
        await writeFile(xpFilePath, JSON.stringify(data, null, 2));
    } catch (error) {
        log(`Failed to save XP data: ${error.message}`);
        throw error;
    }
};

const getLevelFromXP = (xp, levels) => {
    const sortedLevels = Object.entries(levels).reverse();
    for (const [level, requiredXP] of sortedLevels) {
        if (xp >= requiredXP) {
            return parseInt(level, 10);
        }
    }
    return 1;
};

const getRequiredXPForLevel = (level, levels) => {
    return levels[level] || 100;
};

export const handleXPAndLevel = async (serverId, userId, xpGained, username) => {
    try {
        const levels = await loadLevels();
        const xpData = await loadXPData();

        if (!xpData[serverId]) {
            xpData[serverId] = {};
        }

        if (!xpData[serverId][userId]) {
            xpData[serverId][userId] = {
                xp: 0,
                username,
                level: 0,
                xpRequiredForNextLevel: 100,
            };
        }

        const userData = xpData[serverId][userId];
        userData.xp += xpGained;
        const totalXP = userData.xp;

        const newLevel = getLevelFromXP(totalXP, levels);
        const previousLevel = userData.level || 0;

        if (newLevel > previousLevel) {
            userData.level = newLevel;

            const nextLevel = newLevel + 1;
            userData.xpRequiredForNextLevel = getRequiredXPForLevel(nextLevel, levels);

            log(`User ${username} leveled up from level ${previousLevel} to level ${newLevel}. Next level requires ${userData.xpRequiredForNextLevel} XP.`);
        }

        await saveXPData(xpData);
        return { previousLevel, newLevel };

    } catch (error) {
        log(`Error handling XP and level for user ${username}: ${error.message}`);
    }
};

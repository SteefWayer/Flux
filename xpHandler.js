import fs from 'fs/promises';
import path from 'path';
import { Events, Client } from 'discord.js';
import { handleXPAndLevel } from './levelhandler.js';
import { setupRoleRewardHandler } from './serverutils/serverxprolereward/rolereward.js';

const xpCooldowns = new Map();
const spamCooldowns = new Map();

const XP_COOLDOWN_DURATION = 10000;
const SPAM_COOLDOWN_DURATION = 20000;

const loggingEnabled = true;
const getRandomXP = () => Math.floor(Math.random() * (10 - 5 + 1)) + 5;
const xpFilePath = path.join(process.cwd(), './data/xp.json');

const log = (...messages) => {
    if (loggingEnabled) {
        console.log('[XPHandler]', ...messages);
    }
};

const readXPData = async () => {
    let xpData = {};
    try {
        const rawXPData = await fs.readFile(xpFilePath, 'utf-8');
        xpData = JSON.parse(rawXPData);
        log('Successfully read XP data.');
    } catch (err) {
        if (err.code === 'ENOENT') {
            log('XP data file not found. Initializing with empty data.');
        } else {
            console.error('Error reading XP data:', err);
        }
    }
    return xpData;
};

const writeXPData = async (xpData) => {
    try {
        await fs.writeFile(xpFilePath, JSON.stringify(xpData, null, 2), 'utf-8');
        log('Successfully wrote XP data.');
    } catch (err) {
        console.error('Error writing XP data:', err);
    }
};

const updateXP = async (client, channelId, guildId, userId, username, xp) => {
    const xpData = await readXPData();

    if (!xpData[guildId]) xpData[guildId] = {};
    if (!xpData[guildId][userId]) xpData[guildId][userId] = { xp: 0, username };
    xpData[guildId][userId].xp += xp;

    await writeXPData(xpData);
    const { previousLevel, newLevel } = await handleXPAndLevel(guildId, userId, xp, username);

    if (newLevel > previousLevel) {
        log(`${username} leveled up from level ${previousLevel} to ${newLevel}. Triggering role reward check.`);

        client.emit('levelUp', guildId, userId, newLevel, channelId);
    }
};

const isSpam = (message, lastMessageTime) => {
    const now = Date.now();
    const messageContent = message.content.trim();

    if (message.attachments.size > 0 || messageContent.length > 2000) {
        return true;
    }

    if (lastMessageTime && now - lastMessageTime < SPAM_COOLDOWN_DURATION) {
        return true;
    }

    return false;
};

export const handleXP = (client) => {
    setupRoleRewardHandler(client);

    client.on(Events.MessageCreate, async (message) => {
        if (message.author.bot) return;

        const userId = message.author.id;
        const guildId = message.guild.id;
        const username = message.author.username;
        const channelId = message.channel.id;

        const lastMessageTime = spamCooldowns.get(userId);
        if (isSpam(message, lastMessageTime)) {
            log(`Ignored spam from user ${message.author.tag} in server ${message.guild.name}.`);
            return;
        }

        spamCooldowns.set(userId, Date.now());

        if (xpCooldowns.has(userId)) {
            const lastXPTime = xpCooldowns.get(userId);
            if (Date.now() - lastXPTime < XP_COOLDOWN_DURATION) return;
        }

        const randomXP = getRandomXP();
        await updateXP(client, channelId, guildId, userId, username, randomXP);
        xpCooldowns.set(userId, Date.now());
        log(`Added ${randomXP} XP to user ${message.author.tag} (${username}) in server ${message.guild.name}.`);
    });
};

export const getChannelId = (message) => {
    return message.channel.id;
};

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

// Get the current directory from the URL
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TRIGGERS_FILE = path.join(__dirname, '../../serverdata/triggers.json');

// Map to store cooldowns
const cooldowns = new Map();

// Cooldown duration in milliseconds
const COOLDOWN_DURATION = 2000;

export const triggerHandler = (message) => {
    if (message.author.bot) return;

    const userId = message.author.id;

    // Check if the user is on cooldown
    if (cooldowns.has(userId)) {
        const expirationTime = cooldowns.get(userId);
        const now = Date.now();

        if (now < expirationTime) {
            return; 
        }
    }

    // Load triggers data from the JSON file
    let triggersData = {};
    if (fs.existsSync(TRIGGERS_FILE)) {
        const rawData = fs.readFileSync(TRIGGERS_FILE);
        triggersData = JSON.parse(rawData);
    }

    const guildId = message.guild.id;
    const channelId = message.channel.id;

    // Check if there are triggers for this guild and channel
    const channelTriggers = triggersData[guildId]?.[channelId];
    if (channelTriggers) {
        for (const { trigger, response } of channelTriggers) {
            if (message.content.toLowerCase().includes(trigger.toLowerCase())) {
                message.channel.send(response);
                cooldowns.set(userId, Date.now() + COOLDOWN_DURATION);
                break; 
            }
        }
    }
};

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { PermissionsBitField } from 'discord.js'; // Import PermissionsBitField for permission handling
import { fileURLToPath } from 'url';

dotenv.config();

// Get the current directory from the URL
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TRIGGERS_FILE = path.join(__dirname, '../serverdata/triggers.json');

export default {
    name: 'trigger',
    description: 'Manage custom triggers and responses.',
    usage: '!trigger <add/remove> <trigger>/<response>',
    execute: async (message, args) => {
        // Check if user has permission to manage messages
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return message.reply('You do not have permission to use this command.');
        }

        // Load triggers data from the JSON file or create it if it doesn't exist
        let triggersData = {};
        if (fs.existsSync(TRIGGERS_FILE)) {
            const rawData = fs.readFileSync(TRIGGERS_FILE);
            triggersData = JSON.parse(rawData);
        }

        const guildId = message.guild.id;
        const channelId = message.channel.id;

        // Ensure guild and channel exist in triggers data
        if (!triggersData[guildId]) {
            triggersData[guildId] = {};
        }
        if (!triggersData[guildId][channelId]) {
            triggersData[guildId][channelId] = [];
        }

        if (args[0] === 'add') {
            const [trigger, response] = args.slice(1).join(' ').split('/');

            // Validate trigger and response
            if (!trigger || !response) {
                return message.reply('Please provide a trigger and a response in the format: `!trigger add <trigger>/<response>`.');
            }

            // Add the trigger to the triggers data
            triggersData[guildId][channelId].push({ trigger: trigger.trim(), response: response.trim() });

            // Save the updated triggers data back to the JSON file
            fs.writeFileSync(TRIGGERS_FILE, JSON.stringify(triggersData, null, 2));

            return message.reply(`Trigger added: \`${trigger.trim()}\` will respond with: \`${response.trim()}\``);
        } else if (args[0] === 'remove') {
            const triggerToRemove = args.slice(1).join(' ').trim();

            // Find the trigger to remove (case-insensitive)
            const index = triggersData[guildId][channelId].findIndex(t => t.trigger.toLowerCase() === triggerToRemove.toLowerCase());

            if (index === -1) {
                return message.reply(`Trigger \`${triggerToRemove}\` not found.`);
            }

            // Remove the trigger from the triggers data
            triggersData[guildId][channelId].splice(index, 1);

            // Save the updated triggers data back to the JSON file
            fs.writeFileSync(TRIGGERS_FILE, JSON.stringify(triggersData, null, 2));

            return message.reply(`Trigger \`${triggerToRemove}\` has been removed.`);
        } else {
            return message.reply('Invalid command. Use `!trigger add <trigger>/<response>` or `!trigger remove <trigger>`.');
        }
    },
};

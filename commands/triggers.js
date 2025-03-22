import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

// Get the current directory from the URL
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TRIGGERS_FILE = path.join(__dirname, '../serverdata/triggers.json');

export default {
    name: 'triggers',
    description: 'Displays all triggers in the server.',
    usage: '!triggers',
    execute: async (message) => {
        // Check if the triggers file exists
        if (!fs.existsSync(TRIGGERS_FILE)) {
            return message.reply('No triggers found for this server.');
        }

        // Load triggers data from the JSON file
        const rawData = fs.readFileSync(TRIGGERS_FILE);
        const triggersData = JSON.parse(rawData);

        // Get the triggers for the current guild and channel
        const guildTriggers = triggersData[message.guild.id]?.[message.channel.id];

        if (!guildTriggers || guildTriggers.length === 0) {
            return message.reply('No triggers found for this channel.');
        }

        // Create a formatted list of triggers
        const triggerList = guildTriggers.map(t => `Trigger: \`${t.trigger}\` - Response: \`${t.response}\``).join('\n');

        // Send the trigger list as a message
        message.channel.send(`**Triggers for this channel:**\n${triggerList}`);
    },
};

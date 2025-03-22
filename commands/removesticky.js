// Import required modules
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PermissionsBitField } from 'discord.js'; // Import PermissionsBitField

// Utility to get the directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Command handler for the remove sticky command
export default {
    name: 'removesticky',
    aliases: ['remsticky', 'remstick'],
    description: 'Remove all sticky messages for the channel',
    execute(message) {
        // Check if the user has MANAGE_MESSAGES permission
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return message.reply("You don't have permission to use this command!");
        }

        const guildId = message.guild.id;
        const channelId = message.channel.id;

        const filePath = path.join(__dirname, '../serverutils/stickiedmessage/stickiedmessage.json');

        // Read existing data
        let data = [];
        if (fs.existsSync(filePath)) {
            const rawData = fs.readFileSync(filePath);
            if (rawData.length) {
                data = JSON.parse(rawData);
            }
        }

        // Filter out sticky messages for the channel
        const updatedData = data.filter(
            (item) => !(item.guildId === guildId && item.channelId === channelId)
        );

        if (data.length === updatedData.length) {
            return message.reply('No sticky messages found for this channel.');
        }

        // Write data back to the JSON file
        fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2));

        message.reply('All sticky messages removed for this channel!');
    },
};

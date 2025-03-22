// Import required modules
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PermissionsBitField } from 'discord.js'; // Import PermissionsBitField

// Utility to get the directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Command handler for the sticky command
export default {
    name: 'sticky',
    description: 'Save or update a sticky message for the channel',
    execute(message, args) {
        // Check if the user has MANAGE_MESSAGES permission
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return message.reply("You don't have permission to use this command!");
        }

        if (!args.length) {
            return message.reply('You need to provide a message to sticky!');
        }

        const guildId = message.guild.id;
        const channelId = message.channel.id;
        const stickyMessage = args.join(' ');

        const stickyData = {
            guildId,
            channelId,
            message: stickyMessage,
        };

        const filePath = path.join(__dirname, '../serverutils/stickiedmessage/stickiedmessage.json');

        // Read existing data
        let data = [];
        if (fs.existsSync(filePath)) {
            const rawData = fs.readFileSync(filePath);
            if (rawData.length) {
                data = JSON.parse(rawData);
            }
        }

        // Add or update the sticky message
        const existingIndex = data.findIndex(
            (item) => item.guildId === guildId && item.channelId === channelId
        );
        if (existingIndex >= 0) {
            data[existingIndex].message = stickyMessage;
        } else {
            data.push(stickyData);
        }

        // Write data back to the JSON file
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

        message.reply('Sticky message saved or updated!');
    },
};

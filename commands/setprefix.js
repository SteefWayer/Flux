import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PermissionsBitField } from 'discord.js'; // Import PermissionsBitField

export default {
    name: 'setprefix',
    description: 'Sets a new command prefix for this server',
    execute(message, args) {
        // Check if the user has "Manage Server" permission
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return message.reply('You do not have permission to change the prefix. Required Permission: Manage Server');
        }

        const newPrefix = args[0];
        if (!newPrefix) return message.reply('Please provide a new prefix.');

        // Convert import.meta.url to __dirname equivalent
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);

        // Path to the serversettings.json file
        const settingsPath = path.resolve(__dirname, '../serverdata/serversettings.json');

        // Load existing settings
        let serverSettings = {};
        if (fs.existsSync(settingsPath)) {
            const rawData = fs.readFileSync(settingsPath);
            serverSettings = JSON.parse(rawData);
        }

        // Initialize guild settings if not present
        if (!serverSettings[message.guild.id]) {
            serverSettings[message.guild.id] = {};
        }

        // Set the new prefix
        serverSettings[message.guild.id].prefix = newPrefix;

        // Save the updated settings back to the file
        fs.writeFileSync(settingsPath, JSON.stringify(serverSettings, null, 2));

        // Confirm the prefix change
        message.channel.send(`Prefix changed to: \`${newPrefix}\``);
    }
};

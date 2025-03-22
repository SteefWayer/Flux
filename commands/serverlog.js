import { PermissionsBitField } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import setupLoggingEvents from '../serverutils/serverlogging/serverlogging.js'; 

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const settingsFilePath = path.resolve(__dirname, '../serverdata/serversettings.json');

export default {
    name: 'serverlog',
    aliases: ['logsettings', 'setlog', 'logging'], // Added aliases
    description: 'Enable or disable server log and set a logging channel.',
    
    async execute(message, args, client) { // Added client as a parameter
        const { guild, author, channel } = message;

        // Check if user has "Manage Server" permission
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return message.reply('You do not have permission to use this command. (Manage Server required)');
        }

        // Load server settings from JSON
        let serverSettings = {};
        if (fs.existsSync(settingsFilePath)) {
            serverSettings = JSON.parse(fs.readFileSync(settingsFilePath, 'utf-8'));
        }

        const guildId = guild.id;

        // Check if user wants to disable logging
        if (args[0] === 'disable') {
            // Ensure the guild exists in serverSettings
            if (!serverSettings[guildId]) {
                return message.reply('Logging is already disabled for this server.');
            }

            // Set logging to false
            serverSettings[guildId].loggingEnabled = false;
            serverSettings[guildId].loggingChannelId = null;

            fs.writeFileSync(settingsFilePath, JSON.stringify(serverSettings, null, 2));
            return message.reply('Server logging has been disabled.');
        }

        // Get the mentioned channel or default to the current channel
        const mentionedChannel = message.mentions.channels.first();
        const logChannel = mentionedChannel ? mentionedChannel : channel;

        // Ensure the guild exists in serverSettings, and set default if not
        if (!serverSettings[guildId]) {
            serverSettings[guildId] = {};
        }

        // Set logging enabled and store the channel ID
        serverSettings[guildId].loggingEnabled = true;
        serverSettings[guildId].loggingChannelId = logChannel.id;

        // Save settings to JSON
        fs.writeFileSync(settingsFilePath, JSON.stringify(serverSettings, null, 2));

        // Set up logging events immediately after enabling logging
        await setupLoggingEvents(client);

        return message.reply(`Server logging has been enabled in <#${logChannel.id}>.`);
    }
};

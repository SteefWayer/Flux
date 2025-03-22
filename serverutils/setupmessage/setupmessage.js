// ./serverutils/setupmessage/setupmessage.js
import { EmbedBuilder } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';

// Resolve the path to the settings file
const settingsPath = path.resolve('serverdata', 'serversettings.json');

// Function to get the prefix for a given server
const getPrefixForServer = async (serverId) => {
    try {
        const settings = JSON.parse(await fs.readFile(settingsPath, 'utf8'));
        return settings[serverId]?.prefix || '!'; // Default to "!" if not found
    } catch (error) {
        console.error('Error reading server settings:', error);
        return '!'; // Fallback to default prefix in case of error
    }
};

// Function to send the setup message with all topics combined into one embed
const sendSetupMessage = async (channel) => {
    const prefix = await getPrefixForServer(channel.guild.id);

    // Create a single embed with multiple topics
    const setupEmbed = new EmbedBuilder()
        .setTitle('🚀 Server Setup Guide')
        .setDescription('Here are the commands to help you manage and set up your server.')
        .setColor('#8e44ad')
        .addFields(
            {
                name: '🔧 **Server Moderation**',
                value:
                `\`${prefix}logging (#channel)\` - Enable server logging.\n`,
                inline: false,
            },
            {
                name: '🤖 **Self Roles**',
                value:
                    `Start setting up self roles with these commands:`,
                inline: false,
            },
            {
                name: '👮 **Server Admins and Mods**',
                value:
                `\`${prefix}serveradmin add <@user>\` - Manage server administrators.\n` +
                `\`${prefix}servermod add <@user>\` - Manage server moderators.`,
                inline: false,
            },
            {
                name: '📦 **Embed Creation**',
                value:
                    `\`${prefix}createembed <title> <description>\` - Create a new embed with a title and description.\n`,
                inline: false,
            }
        )
        .setFooter({ text: 'Use the commands with the appropriate permissions to manage your server effectively.' });

    // Send the embed in the specified channel
    await channel.send({ embeds: [setupEmbed] });
};

export default sendSetupMessage;

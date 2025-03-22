import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { EmbedBuilder } from 'discord.js'; // Import EmbedBuilder

// Determine __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the JSON file where the mods data will be stored
const dataFilePath = join(__dirname, '../serverdata/servermods.json');

// Boolean flag to enable or disable logging
const loggingEnabled = false; // Set to false to disable logging

// Function to log messages if logging is enabled
const log = (message) => {
    if (loggingEnabled) {
        console.log(message);
    }
};

// Function to load data from the JSON file
const loadModsData = () => {
    if (!fs.existsSync(dataFilePath)) {
        log('No existing mods data found, initializing empty data.');
        return {};
    }
    const data = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
    log('Loaded mods data.');
    return data;
};

// Function to save data to the JSON file
const saveModsData = (data) => {
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf8');
    log('Saved mods data.');
};

// Command handler
const handleCommand = async (message) => {
    // Check if the user has administrator permissions
    const { member } = message;
    if (!member.permissions.has('Administrator')) {
        message.reply('You do not have permission to use this command.');
        return;
    }

    const args = message.content.split(' ').slice(1);
    const command = args[0];
    const user = message.mentions.users.first();

    const modsData = loadModsData();

    switch (command) {
        case 'add':
            if (!user) {
                message.reply('Please mention a user to add as a mod.');
                return;
            }
            if (!modsData[message.guild.id]) {
                modsData[message.guild.id] = { mods: [] }; // Initialize mods array
            }
            if (!modsData[message.guild.id].mods.includes(user.id)) {
                modsData[message.guild.id].mods.push(user.id);
                saveModsData(modsData);
                message.reply(`${user.tag} has been added as a server mod.`);
            } else {
                message.reply(`${user.tag} is already a server mod.`);
            }
            break;

        case 'remove':
            if (!user) {
                message.reply('Please mention a user to remove from mod.');
                return;
            }
            if (modsData[message.guild.id] && modsData[message.guild.id].mods.includes(user.id)) {
                modsData[message.guild.id].mods = modsData[message.guild.id].mods.filter(id => id !== user.id);
                saveModsData(modsData);
                message.reply(`${user.tag} has been removed from server mod.`);
            } else {
                message.reply(`${user.tag} is not a server mod.`);
            }
            break;

        case 'list':
            if (!modsData[message.guild.id] || modsData[message.guild.id].mods.length === 0) {
                message.reply('No server mods found.');
                return;
            }

            // Create an embed for the list command
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Server Moderators')
                .setDescription('Here are the current server moderators:')
                .addFields(
                    {
                        name: 'Moderators',
                        value: modsData[message.guild.id].mods.map(id => `<@${id}>`).join('\n') || 'No mods found',
                        inline: false
                    }
                )
                .setTimestamp()
                .setFooter({ text: 'Server Mod Management' });

            message.reply({ embeds: [embed] });
            break;

        default:
            message.reply('Unknown command. Use `!servermod add @user`, `!servermod remove @user`, or `!servermod list`.');
            break;
    }
};

// Default export with name and description
export default {
    name: 'servermod',
    aliases: ['smod'],
    description: 'Manage server moderators.',
    execute: handleCommand,
};

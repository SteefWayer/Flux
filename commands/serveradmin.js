import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { EmbedBuilder } from 'discord.js'; // Import EmbedBuilder

// Determine __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the JSON file where the admins data will be stored
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
const loadadminsData = () => {
    if (!fs.existsSync(dataFilePath)) {
        log('No existing admins data found, initializing empty data.');
        return {};
    }
    const data = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
    log('Loaded admins data.');
    return data;
};

// Function to save data to the JSON file
const saveadminsData = (data) => {
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf8');
    log('Saved admins data.');
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

    const adminsData = loadadminsData();

    switch (command) {
        case 'add':
            if (!user) {
                message.reply('Please mention a user to add as an admin.');
                return;
            }
            if (!adminsData[message.guild.id]) {
                adminsData[message.guild.id] = { admins: [] }; // Initialize admins array
            }
            if (!adminsData[message.guild.id].admins.includes(user.id)) {
                adminsData[message.guild.id].admins.push(user.id);
                saveadminsData(adminsData);
                message.reply(`${user.tag} has been added as a server admin.`);
            } else {
                message.reply(`${user.tag} is already a server admin.`);
            }
            break;

        case 'remove':
            if (!user) {
                message.reply('Please mention a user to remove from admin.');
                return;
            }
            if (adminsData[message.guild.id] && adminsData[message.guild.id].admins.includes(user.id)) {
                adminsData[message.guild.id].admins = adminsData[message.guild.id].admins.filter(id => id !== user.id);
                saveadminsData(adminsData);
                message.reply(`${user.tag} has been removed from server admin.`);
            } else {
                message.reply(`${user.tag} is not a server admin.`);
            }
            break;

        case 'list':
            if (!adminsData[message.guild.id] || adminsData[message.guild.id].admins.length === 0) {
                message.reply('No server admins found.');
                return;
            }

            // Create an embed for the list command
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Server Admins')
                .setDescription('Here are the current server admins:')
                .addFields(
                    {
                        name: 'Admins',
                        value: adminsData[message.guild.id].admins.map(id => `<@${id}>`).join('\n') || 'No admins found',
                        inline: false
                    }
                )
                .setTimestamp()
                .setFooter({ text: 'Server Admin Management' });

            message.reply({ embeds: [embed] });
            break;

        default:
            message.reply('Unknown command. Use `!serveradmin add @user`, `!serveradmin remove @user`, or `!serveradmin list`.');
            break;
    }
};

// Default export with name and description
export default {
    name: 'serveradmin',
    aliases: ['sadmin'],
    description: 'Manage server admins.',
    execute: handleCommand,
};

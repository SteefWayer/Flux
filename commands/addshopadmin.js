import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the path to the server settings file
const settingsFilePath = path.join(__dirname, '../serverdata/serversettings.json');

const addShopAdminCommand = {
    name: 'addshopadmin',
    description: 'Add a role that can manage server shop-related commands.',
    async execute(message, args) {
        // Check if the command was used in a server
        if (!message.guild) {
            return message.reply('This command can only be used in a server.');
        }

        // Check if the user has the required permissions (Administrator)
        if (!message.member.permissions.has('ADMINISTRATOR')) {
            return message.reply('You do not have permission to use this command. You need the Administrator permission.');
        }

        // Check if a role is mentioned
        if (args.length === 0) {
            return message.reply('Please mention the role you want to add.');
        }

        const role = message.mentions.roles.first();
        if (!role) {
            return message.reply('Please mention a valid role.');
        }

        let settingsData;
        try {
            // Read the server settings data
            const rawData = await fs.readFile(settingsFilePath, 'utf-8');
            settingsData = JSON.parse(rawData);
        } catch (err) {
            console.error(`Error reading server settings data: ${err.message}`);
            return message.reply('Error reading server settings data.');
        }

        const guildId = message.guild.id;

        // Initialize settings for the guild if not present
        if (!settingsData[guildId]) {
            settingsData[guildId] = {
                prefix: '!',
                shopAdmins: []
            };
        }

        // Ensure shopAdmins is initialized as an array
        if (!Array.isArray(settingsData[guildId].shopAdmins)) {
            settingsData[guildId].shopAdmins = [];
        }

        // Add the role to the list of shop admins if not already present
        if (!settingsData[guildId].shopAdmins.includes(role.id)) {
            settingsData[guildId].shopAdmins.push(role.id);

            // Save the updated settings data
            try {
                await fs.writeFile(settingsFilePath, JSON.stringify(settingsData, null, 4));
            } catch (err) {
                console.error(`Error saving server settings data: ${err.message}`);
                return message.reply('Error saving server settings data.');
            }

            return message.reply(`Successfully added the role **${role.name}** as a shop admin.`);
        } else {
            return message.reply('This role is already a shop admin.');
        }
    }
};

export default addShopAdminCommand;

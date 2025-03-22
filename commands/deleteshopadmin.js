import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the path to the serversettings file
const settingsFilePath = path.join(__dirname, '../serverdata/serversettings.json');

const deleteShopAdminCommand = {
    name: 'deleteshopadmin',
    aliases: ['delshopadmin', 'delsadmin'],
    description: 'Remove a role from being able to manage the server shop.',
    async execute(message, args) {
        if (!message.guild) {
            return message.reply('This command can only be used in a server.');
        }

        // Check if the user has administrative permissions
        if (!message.member.permissions.has('ADMINISTRATOR')) {
            return message.reply('You do not have permission to use this command. Only server administrators can use it.');
        }

        if (args.length === 0) {
            return message.reply('Please specify the role you want to remove from shop admin roles.');
        }

        const roleToRemove = args.join(' ').trim();

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

        // Check if there is shop admin data for the guild
        if (!settingsData[guildId] || !settingsData[guildId].shopAdmins) {
            return message.reply('No shop admin roles found for this server.');
        }

        const shopAdmins = settingsData[guildId].shopAdmins;
        const roleIndex = shopAdmins.indexOf(roleToRemove);

        if (roleIndex === -1) {
            return message.reply('The specified role is not a shop admin role.');
        }

        // Remove the role from the shop admin roles
        shopAdmins.splice(roleIndex, 1);

        // Save the updated settings data
        try {
            await fs.writeFile(settingsFilePath, JSON.stringify(settingsData, null, 4));
        } catch (err) {
            console.error(`Error saving server settings data: ${err.message}`);
            return message.reply('Error saving server settings data.');
        }

        // Send confirmation message
        return message.reply(`Successfully removed **${roleToRemove}** from the shop admin roles.`);
    }
};

export default deleteShopAdminCommand;

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { EmbedBuilder } from 'discord.js';

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the path to the serversettings file
const settingsFilePath = path.join(__dirname, '../serverdata/serversettings.json');

const shopAdminsCommand = {
    name: 'shopadmins',
    aliases: ['sadmins'],
    description: 'View the list of shop admin roles for this server.',
    async execute(message) {
        if (!message.guild) {
            return message.reply('This command can only be used in a server.');
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

        // Check if there is shop admin data for the guild
        if (!settingsData[guildId] || !settingsData[guildId].shopAdmins || settingsData[guildId].shopAdmins.length === 0) {
            return message.reply('No shop admin roles found for this server.');
        }

        const shopAdmins = settingsData[guildId].shopAdmins;

        // Create an embed to display the shop admin roles
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Shop Admin Roles')
            .setDescription('Here are the roles that can manage the server shop:')
            .setThumbnail(message.guild.iconURL())
            .addFields(
                { name: 'Roles:', value: shopAdmins.length > 0 ? shopAdmins.join('\n') : 'No roles set.' }
            );

        // Send the embed
        return message.reply({ embeds: [embed] });
    }
};

export default shopAdminsCommand;

import { EmbedBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Manually define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const settingsFilePath = path.join(__dirname, '../serverdata/serversettings.json');

// Command data
const commandData = {
    name: 'crazytimesetup',
    aliases: ['ctsetup'],
    execute: async (message, args) => {
        try {
            if (args[0] === 'setup') {
                const guildId = message.guild.id;
                const channelId = message.channel.id;

                // Save the server settings
                saveServerSettings(guildId, channelId);
                
                // Log the setup success
                console.log(`Crazy Time setup successful for Guild ID: ${guildId}, Channel ID: ${channelId}`);

                const embed = new EmbedBuilder()
                    .setTitle('🎉 Crazy Time Setup Successful 🎉')
                    .setDescription('Crazy Time has been successfully set up in this channel!')
                    .addFields(
                        { name: 'Guild ID:', value: guildId, inline: true },
                        { name: 'Channel ID:', value: channelId, inline: true },
                        { name: 'Next Steps:', value: 'You can now run the `!crazytime` command in this channel!' }
                    )
                    .setColor('#00FF00') // Green color for success
                    .setFooter({ text: 'Get ready for some fun! 🎡' });

                await message.reply({ embeds: [embed] });
            } else if (args[0] === 'remove') {
                const guildId = message.guild.id;

                // Remove the server settings
                removeServerSettings(guildId);
                
                // Log the removal success
                console.log(`Crazy Time setup removed for Guild ID: ${guildId}`);

                const embed = new EmbedBuilder()
                    .setTitle('❌ Crazy Time Setup Removed ❌')
                    .setDescription('Crazy Time has been successfully removed from this server.')
                    .setColor('#FF0000') // Red color for removal
                    .setFooter({ text: 'If you want to set it up again, use `!crazytimesetup setup`.' });

                await message.reply({ embeds: [embed] });
            } else {
                await message.reply('Invalid command usage. Please use `!crazytimesetup setup` to set up Crazy Time or `!crazytimesetup remove` to remove it.');
            }
        } catch (error) {
            console.error('Error executing Crazy Time setup:', error);
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Error ❌')
                .setDescription('An error occurred while trying to execute the command. Please try again later.')
                .setColor('#FF0000') // Red color for error
                .setFooter({ text: 'Error Details: ' + error.message });

            await message.reply({ embeds: [errorEmbed] });
        }
    },
};

// Function to save server settings
const saveServerSettings = (guildId, channelId) => {
    const rawData = fs.readFileSync(settingsFilePath);
    const serverSettings = JSON.parse(rawData);

    if (!serverSettings[guildId]) {
        serverSettings[guildId] = {};
    }
    serverSettings[guildId].crazyTimeEnabled = true; // Enable Crazy Time
    serverSettings[guildId].crazyTimeChannelId = channelId; // Set channel ID

    fs.writeFileSync(settingsFilePath, JSON.stringify(serverSettings, null, 2));
};

// Function to remove server settings
const removeServerSettings = (guildId) => {
    const rawData = fs.readFileSync(settingsFilePath);
    const serverSettings = JSON.parse(rawData);

    if (serverSettings[guildId]) {
        delete serverSettings[guildId].crazyTimeEnabled; // Disable Crazy Time
        delete serverSettings[guildId].crazyTimeChannelId; // Remove channel ID

        // Check if there are any settings left for the guild
        if (Object.keys(serverSettings[guildId]).length === 0) {
            delete serverSettings[guildId]; // Remove the guild entry if empty
        }

        fs.writeFileSync(settingsFilePath, JSON.stringify(serverSettings, null, 2));
    }
};

export default commandData;

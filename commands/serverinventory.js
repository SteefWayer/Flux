import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { EmbedBuilder } from 'discord.js';

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the path to the serverinventory file
const serverInventoryFilePath = path.join(__dirname, '../serverdata/serverinventory.json');

const serverInventoryCommand = {
    name: 'serverinventory',
    aliases: ['serverinv', 'sinv'],
    description: 'Displays your server-specific inventory.',
    async execute(message) {
        // Check if the command was used in a server
        if (!message.guild) {
            return message.reply('This command can only be used in a server.');
        }

        const userId = message.author.id;
        const guildId = message.guild.id;

        let serverInventory;
        try {
            // Read the serverinventory.json file
            const rawData = await fs.readFile(serverInventoryFilePath, 'utf-8');
            serverInventory = JSON.parse(rawData);
        } catch (error) {
            console.error('Error reading server inventory data:', error);
            return message.reply('There was an error retrieving the server inventory.');
        }

        // Get the user's inventory for the current server
        const userInventory = serverInventory[guildId]?.[userId];

        if (!userInventory || userInventory.length === 0) {
            return message.reply('You have no items in your inventory for this server.');
        }

        // Create an embed to display the inventory
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`${message.author.username}'s Server Inventory`)
            .setDescription('Here are the items you own in this server:')
            .setThumbnail(message.author.displayAvatarURL());

        // Add fields for each item in the user's inventory
        userInventory.forEach(item => {
            embed.addFields(
                {
                    name: `${item.emoji} **${item.name}**`,
                    value: `__Price:__ **⏣ ${item.price}**\n__Quantity:__ **${item.amount}**`,
                    inline: false
                }
            );
        });

        // Send the embed
        return message.reply({ embeds: [embed] });
    }
};

export default serverInventoryCommand;

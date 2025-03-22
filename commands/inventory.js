import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { EmbedBuilder } from 'discord.js';

// Resolve the directory of the current module file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Construct the path to the inventory JSON file
const inventoryFilePath = resolve(__dirname, '../data/inventory.json');

// Logging control
const loggingEnabled = true;

// Function to log messages
const log = (message) => {
    if (loggingEnabled) {
        console.log(message);
    }
};

// Main command implementation
export default {
    name: 'inventory',
    description: 'Manage your inventory or view another user\'s inventory',
    aliases: ['inv'],
    cooldown: 5,
    execute: async (message, args, client, context) => {
        let userId = message.author.id;
        if (args.length > 0) {
            const user = message.mentions.users.first() || client.users.cache.get(args[0]);
            if (user) {
                userId = user.id;
            } else {
                return message.channel.send('Invalid user specified.');
            }
        }

        // Load the user's inventory from the file
        let userInventory = {};
        try {
            const rawData = fs.readFileSync(inventoryFilePath, 'utf-8');
            if (rawData.trim() !== '') {
                userInventory = JSON.parse(rawData);
            }
        } catch (error) {
            console.error('Error reading or parsing inventory file:', error);
            return message.channel.send('Failed to read inventory data.');
        }

        const userItems = userInventory[userId] || [];
        log(`User ID: ${userId}, Inventory: ${JSON.stringify(userItems, null, 2)}`);

        // Format inventory items into an embed
        const inventoryFields = userItems.length === 0 
            ? [{ name: 'No Items', value: 'This inventory is empty.' }] 
            : userItems.map(item => {
                const emoji = item.emoji || '❓';
                const name = `${emoji} ${item.name}`;
                const value = `**Amount:** ${item.amount}\n**Price:** ${item.price || 'N/A'}`;

                return { name, value, inline: false };
            });

        // Display inventory in an embed
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`${userId === message.author.id ? message.author.username : `<@${userId}>`}'s Inventory`)
            .addFields(inventoryFields)
            .setTimestamp()
            .setFooter({ text: 'Inventory System', iconURL: client.user.displayAvatarURL() });

        return message.channel.send({ embeds: [embed] });
    }
};

import { EmbedBuilder } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const shopFilePath = path.resolve(__dirname, '../serverdata/servershop.json');

const serverShopCommand = {
    name: 'servershop',
    aliases: ['sshop', 'ss'],
    description: 'Display the shop for the current server.',
    async execute(message, args, client, context) {
        if (!message.guild) {
            return message.reply('This command can only be used in a server.');
        }

        // Load existing shop data
        let shopData = {};
        try {
            try {
                // Try to read the file
                const rawData = await fs.readFile(shopFilePath, 'utf-8');
                shopData = JSON.parse(rawData);
            } catch (err) {
                if (err.code === 'ENOENT') {
                    // File does not exist, initialize an empty object
                    shopData = {};
                } else {
                    // Other errors, rethrow
                    throw err;
                }
            }
        } catch (err) {
            console.error(`Error reading shop data: ${err.message}`);
            return message.reply('Error reading shop data.');
        }

        // Get the shop data for the guild
        const guildId = message.guild.id;
        const guildShop = shopData[guildId] || [];

        if (guildShop.length === 0) {
            return message.reply('There are no items in the shop for this server.');
        }

        // Create an embed for displaying the shop items
        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🛒 Server Shop 🛒')
            .setDescription('Here are the items available in the shop for this server:')
            .setThumbnail('https://example.com/your-thumbnail.png'); // Replace with your thumbnail URL

        // Add each shop item to the embed
        guildShop.forEach(item => {
            embed.addFields({
                name: `${item.emoji} ${item.name}`,
                value: `**Description:** ${item.description}\n**Price:** ${item.price} coins`,
                inline: false
            });
        });

        return message.reply({ embeds: [embed] });
    }
};

export default serverShopCommand;

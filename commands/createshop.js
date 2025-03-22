import { EmbedBuilder } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { nanoid } from 'nanoid'; // Use nanoid for generating unique IDs
import { fileURLToPath } from 'url';

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the paths to the relevant files
const settingsFilePath = path.join(__dirname, '../serverdata/serversettings.json');
const shopFilePath = path.join(__dirname, '../serverdata/servershop.json');

const createShopCommand = {
    name: 'createshop',
    aliases: ['addshop'],
    description: 'Create a shop with a name, description, price, and emoji.',
    async execute(message, args, client, context) {
        if (!message.guild) {
            return message.reply('This command can only be used in a server.');
        }

        // Check if the user has the required role or is the server owner
        let settingsData;
        try {
            const rawData = await fs.readFile(settingsFilePath, 'utf-8');
            settingsData = JSON.parse(rawData);
        } catch (err) {
            console.error(`Error reading server settings data: ${err.message}`);
            return message.reply('Error reading server settings data.');
        }

        const guildId = message.guild.id;
        const userRoles = message.member.roles.cache.map(role => role.id);
        const isOwner = message.author.id === message.guild.ownerId;

        // Check if the user has the required role or is the server owner
        const allowedRoles = settingsData[guildId]?.shopAdmins || [];
        if (!allowedRoles.some(roleId => userRoles.includes(roleId)) && !isOwner) {
            return message.reply('You do not have permission to use this command. Only roles with shop admin permissions or the server owner can use it.');
        }

        if (args.length === 0) {
            return message.reply('Please provide the shop details in the format: `!createshop name/description/price/emoji`.');
        }

        // Combine all arguments into a single string and split by '/'
        const input = args.join(' ');
        const [name, description, priceStr, emoji] = input.split('/');

        // Validate the extracted parameters
        if (!name || !description || !priceStr || !emoji) {
            return message.reply('Please provide all required details: name, description, price, and emoji.');
        }

        if (name.length > 25 || description.length > 25) {
            return message.reply('Name and description must be up to 25 characters long.');
        }

        const price = parseFloat(priceStr);

        if (isNaN(price) || price <= 0) {
            return message.reply('Please provide a valid price for your shop.');
        }

        // Generate a unique item ID
        const itemId = nanoid();

        // Create shop object
        const newShop = {
            id: itemId,
            name,
            description,
            price,
            emoji
        };

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

        // Initialize guild shop data if not exists
        if (!shopData[guildId]) {
            shopData[guildId] = [];
        }

        // Add the new shop to the guild's shop data
        shopData[guildId].push(newShop);

        // Save updated shop data
        try {
            await fs.writeFile(shopFilePath, JSON.stringify(shopData, null, 4));
        } catch (err) {
            console.error(`Error saving shop data: ${err.message}`);
            return message.reply('Error saving shop data.');
        }

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🛒 Shop Created Successfully 🛒')
            .setDescription(`**Shop Name:** ${name}\n**Description:** ${description}\n**Price:** ⏣ ${price}\n**Emoji:** ${emoji}`)
            .setThumbnail('https://example.com/your-thumbnail.png'); // Replace with your thumbnail URL

        return message.reply({ embeds: [embed] });
    }
};

export default createShopCommand;

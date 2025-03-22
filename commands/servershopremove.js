import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the paths to the relevant files
const settingsFilePath = path.join(__dirname, '../serverdata/serversettings.json');
const shopFilePath = path.join(__dirname, '../serverdata/servershop.json');

const serverShopRemoveCommand = {
    name: 'servershopremove',
    aliases: ['servershoprem', 'servshoprem', 'remshop', 'delshop', 'ssrem', 'ssremove'],
    description: 'Remove an item from the server shop.',
    async execute(message, args) {
        if (!message.guild) {
            return message.reply('This command can only be used in a server.');
        }

        if (args.length === 0) {
            return message.reply('Please specify the name of the item you want to remove.');
        }

        const itemName = args.join(' ').trim();

        // Read the server settings
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

        // Check if the user has the required role
        const allowedRoles = settingsData[guildId]?.shopAdmins || [];
        if (!allowedRoles.some(roleId => userRoles.includes(roleId))) {
            return message.reply('You do not have permission to use this command. Only roles with shop admin permissions can use it.');
        }

        // Read the shop data
        let shopData;
        try {
            const rawData = await fs.readFile(shopFilePath, 'utf-8');
            shopData = JSON.parse(rawData);
        } catch (err) {
            console.error(`Error reading shop data: ${err.message}`);
            return message.reply('Error reading shop data.');
        }

        // Check if the guild has a shop
        if (!shopData[guildId]) {
            return message.reply('No shop data found for this server.');
        }

        const guildShop = shopData[guildId];
        const itemIndex = guildShop.findIndex(item => item.name.toLowerCase() === itemName.toLowerCase());

        if (itemIndex === -1) {
            return message.reply('Item not found in the shop.');
        }

        // Remove the item from the shop
        guildShop.splice(itemIndex, 1);

        // Save the updated shop data
        try {
            await fs.writeFile(shopFilePath, JSON.stringify(shopData, null, 4));
        } catch (err) {
            console.error(`Error saving shop data: ${err.message}`);
            return message.reply('Error saving shop data.');
        }

        // Send confirmation message
        return message.reply(`Successfully removed **${itemName}** from the shop.`);
    }
};

export default serverShopRemoveCommand;

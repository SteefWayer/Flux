import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve file paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const inventoryFilePath = path.join(__dirname, '../data/inventory.json');

// Utility function to read and parse JSON files
const readJSONFile = async (filePath) => {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error(`[ERROR] Error reading ${filePath}:`, err.message);
        throw new Error(`[ERROR] Error reading data from ${filePath}.`);
    }
};

// Function to fetch and format user's inventory
const getUserInventory = (userId, inventoryData) => {
    console.log(`[INFO] Fetching inventory for user ID: ${userId}`);
    const userInventory = inventoryData[userId] || [];
    console.log(`[INFO] User Inventory: ${JSON.stringify(userInventory)}`);
    
    if (userInventory.length === 0) return 'No items available.';
    
    return userInventory.map((item, index) => `${index + 1}. ${item.name} (${item.amount})`).join('\n');
};

// Function to handle interactions with dropdown and button
const handleInteraction = async (interaction) => {
    console.log(`[INFO] Interaction detected: ${interaction.customId}`);
    
    if (interaction.isSelectMenu()) {
        const { customId, values } = interaction;
        console.log(`[INFO] Select Menu Custom ID: ${customId}`);
        console.log(`[INFO] Selected Values: ${values}`);
        
        if (customId !== 'trade_select_menu') {
            console.log('[WARN] Custom ID does not match "trade_select_menu".');
            return;
        }

        try {
            const inventoryData = await readJSONFile(inventoryFilePath);
            const selectedUserId = values[0] === 'user1'
                ? interaction.user.id
                : interaction.message.mentions.users.first()?.id;

            if (!selectedUserId) {
                console.log('[WARN] No valid user ID found.');
                await interaction.reply({ content: 'Could not determine the selected user.', ephemeral: true });
                return;
            }

            const inventoryText = getUserInventory(selectedUserId, inventoryData);
            const inventoryEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('Inventory')
                .setDescription(inventoryText)
                .setFooter({ text: 'Button pressed to refresh inventory.' });

            await interaction.update({ content: 'Updated inventory view:', embeds: [inventoryEmbed], components: [] });
        } catch (error) {
            console.error('[ERROR] Error handling select menu interaction:', error);
            await interaction.reply({ content: 'There was an error fetching the inventory.', ephemeral: true });
        }
    } else if (interaction.isButton()) {
        // Handle button interactions if needed
    }
};

// Define tradeCommand with const
const tradeCommand = {
    name: 'trade',
    description: 'Trade items with another user.',
    async execute(message, args) {
        if (args.length < 1) {
            return message.reply('Please mention a user to trade with.');
        }

        const targetUser = message.mentions.users.first();
        if (!targetUser) {
            return message.reply('Please mention a valid user to trade with.');
        }

        // Fetch inventory data
        console.log('[INFO] Fetching inventory data...');
        const inventoryData = await readJSONFile(inventoryFilePath);
        
        const selectMenuOptions = [
            new StringSelectMenuOptionBuilder()
                .setLabel('Your Inventory')
                .setValue('user1')
                .setDescription('Items from your inventory'),
            new StringSelectMenuOptionBuilder()
                .setLabel(`${targetUser.username}'s Inventory`)
                .setValue('user2')
                .setDescription(`Items from ${targetUser.username}'s inventory`)
        ];

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('trade_select_menu')
            .setPlaceholder('Select an inventory to view')
            .addOptions(selectMenuOptions);

        const actionRow = new ActionRowBuilder().addComponents(selectMenu);

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('Trade Proposal')
            .setDescription(`**From:** <@${message.author.id}> \n**To:** <@${targetUser.id}>`)
            .setFooter({ text: 'Select an option to view inventory.' });

        try {
            console.log('[INFO] Sending trade proposal...');
            await message.channel.send({ content: `Trade proposal from <@${message.author.id}> to <@${targetUser.id}>`, embeds: [embed], components: [actionRow] });
            console.log('[INFO] Trade proposal sent successfully.');
        } catch (error) {
            console.error('[ERROR] Error sending trade proposal:', error.message);
        }
    }
};

// Default export for the command
export default tradeCommand;

// Export interaction handler as a named export
export { handleInteraction };

import { EmbedBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define paths for the files
const economyFilePath = path.join(__dirname, '..', 'data', 'economy.json');
const inventoryFilePath = path.join(__dirname, '..', 'data', 'inventory.json');
const completedBusinessesFilePath = path.join(__dirname, '..', 'data', 'completedmissions.json');
const serverInventoryFilePath = path.join(__dirname, '..', 'serverdata', 'serverinventory.json'); // Path for serverinventory.json
const serverShopFilePath = path.join(__dirname, '..', 'serverdata', 'servershop.json'); // Path for servershop.json

// Function to reset economy data
const resetEconomyData = () => {
    try {
        fs.writeFileSync(economyFilePath, JSON.stringify({}, null, 2), 'utf8');
        console.log('Economy data has been reset.');
    } catch (error) {
        console.error(`Error resetting economy data: ${error.message}`);
    }
};

// Function to reset inventory data
const resetInventoryData = () => {
    try {
        fs.writeFileSync(inventoryFilePath, JSON.stringify({}, null, 2), 'utf8');
        console.log('Inventory data has been reset.');
    } catch (error) {
        console.error(`Error resetting inventory data: ${error.message}`);
    }
};

// Function to reset completed businesses data
const resetCompletedBusinessesData = () => {
    try {
        fs.writeFileSync(completedBusinessesFilePath, JSON.stringify({}, null, 2), 'utf8');
        console.log('Completed businesses data has been reset.');
    } catch (error) {
        console.error(`Error resetting completed businesses data: ${error.message}`);
    }
};

// Function to reset server inventory data
const resetServerInventoryData = () => {
    try {
        fs.writeFileSync(serverInventoryFilePath, JSON.stringify({}, null, 2), 'utf8');
        console.log('Server inventory data has been reset.');
    } catch (error) {
        console.error(`Error resetting server inventory data: ${error.message}`);
    }
};

// Function to reset server shop data
const resetServerShopData = () => {
    try {
        fs.writeFileSync(serverShopFilePath, JSON.stringify({}, null, 2), 'utf8');
        console.log('Server shop data has been reset.');
    } catch (error) {
        console.error(`Error resetting server shop data: ${error.message}`);
    }
};

export default {
    name: 'reset',
    description: 'Resets the bot and economy data',
    async execute(message, args, client, context) {
        if (!context) {
            console.error('Context is not defined.');
            return message.channel.send('There was an error with the command context.');
        }

        const isAdmin = context.admins.includes(message.author.id) || message.author.id === context.ownerId;

        if (!isAdmin) {
            return message.channel.send('You do not have permission to use this command.');
        }

        if (args[0] !== 'confirm') {
            // Initial reset command, awaiting confirmation
            const embed = new EmbedBuilder()
                .setTitle('⚠️ Confirmation Required')
                .setDescription('Please confirm the reset by typing `!reset confirm` within 30 seconds. This action will reset the bot and clear all economy, inventory, completed businesses, server inventory, and server shop data.')
                .setColor('#e67e22');

            await message.channel.send({ embeds: [embed] });

            // Awaiting the confirmation response
            const filter = (response) => {
                return response.author.id === message.author.id && response.content.toLowerCase() === '!reset confirm';
            };

            try {
                const collected = await message.channel.awaitMessages({
                    filter,
                    max: 1,
                    time: 30000, // 30 seconds
                    errors: ['time']
                });

                if (collected) {
                    resetEconomyData();
                    resetInventoryData();
                    resetCompletedBusinessesData();
                    resetServerInventoryData(); // Add this line to reset server inventory data
                    resetServerShopData(); // Add this line to reset server shop data

                    const confirmEmbed = new EmbedBuilder()
                        .setTitle('🔄 Reset Successful')
                        .setDescription('The bot has been reset and the economy, inventory, completed businesses, server inventory, and server shop data have been cleared.')
                        .setColor('#e74c3c');

                    await message.channel.send({ embeds: [confirmEmbed] });
                    process.exit(0); // Terminate the process to restart
                }
            } catch (err) {
                // If the confirmation is not received within the time limit
                const timeoutEmbed = new EmbedBuilder()
                    .setTitle('❌ Reset Canceled')
                    .setDescription('The reset process was not confirmed in time and has been canceled.')
                    .setColor('#c0392b');

                await message.channel.send({ embeds: [timeoutEmbed] });
            }
        } else {
            // If the 'confirm' argument was sent directly without the first step
            return message.channel.send('Please type `!reset` first, followed by `!reset confirm` to reset the bot.');
        }
    }
};

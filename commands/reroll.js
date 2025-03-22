import { readFile } from 'fs/promises';
import path from 'path';

// Define the path to the giveaways JSON file
const giveawaysFile = path.resolve('serverdata', 'giveaways.json');

// Function to read giveaways from the JSON file
const readGiveaways = async () => {
    try {
        const data = await readFile(giveawaysFile, 'utf-8'); // Read the file asynchronously
        return JSON.parse(data); // Parse and return JSON data
    } catch (error) {
        console.error('Error reading giveaways file:', error);
        throw new Error('Could not load giveaways.');
    }
};

// Utility function for logging, controlled by a boolean
const loggingEnabled = false; // Set to false to disable logging

const log = (...messages) => {
    if (loggingEnabled) {
        console.log(...messages);
    }
};

const handleCommand = async (message, args) => {
    // Log the command execution
    log(`Reroll command executed by ${message.author.tag} in channel ${message.channel.name} with args: ${args.join(', ')}`);

    try {
        // Ensure a message ID is provided
        if (args.length === 0) {
            return message.reply('⚠️ Please provide a message ID to reroll the giveaway.');
        }

        const messageId = args[0];
        const giveaways = await readGiveaways(); // Await the reading of giveaways

        // Check for the message ID in giveaways.json
        const giveaway = giveaways.find(g => g.messageId === messageId);

        if (!giveaway) {
            return message.reply('❌ No giveaway found with that message ID.');
        }

        // Log the contents of the giveaway for debugging
        log('Giveaway data:', giveaway);

        // Get participants from the giveaway data
        const participants = giveaway.participants;

        // If there are no valid users, return a message
        if (!participants || participants.length === 0) {
            return message.reply('⚠️ No valid users found for rerolling the giveaway.');
        }

        // Pick a random winner
        const winnerId = participants[Math.floor(Math.random() * participants.length)];
        const winnerMention = `<@${winnerId}>`;

        // Announce the new winner with a more formatted message
        await message.channel.send(`🎉 **New Winner** for the giveaway: ${winnerMention}! Congratulations! 🎉`);
        log(`Rerolled winner: ${winnerMention} for message ID: ${messageId}`);

    } catch (error) {
        log('Error executing reroll command:', error);
        message.reply('❌ There was an error executing the command.');
    }
};

export default {
    name: 'reroll',
    aliases: ['gawreroll'],
    description: 'Reroll a giveaway winner',
    execute: handleCommand,
};

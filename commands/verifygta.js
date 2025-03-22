import { Client, GatewayIntentBits } from 'discord.js';
import axios from 'axios';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const STEAM_API_KEY = 'YOUR_STEAM_API_KEY'; // Replace with your Steam API key
const GTA_V_APP_ID = 271590; // App ID for GTA V on Steam

// Enable or disable logging
const loggingEnabled = true;

const STEAM_URL = steamId => `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${STEAM_API_KEY}&steamid=${steamId}&include_played_free_games=1`;

async function verifyCommand(message) {
    if (message.content.startsWith('!verifysteam')) {
        const args = message.content.split(' ');
        const steamId = args[1];
        
        if (!steamId) {
            return message.reply('Please provide a Steam ID.');
        }

        if (loggingEnabled) console.log(`Attempting to verify Steam ID: ${steamId}`);

        try {
            // Request to check owned games
            const response = await axios.get(STEAM_URL(steamId));
            const games = response.data.response.games || [];

            // Check if GTA V is in the list of owned games
            const ownsGtaV = games.some(game => game.appid === GTA_V_APP_ID);

            if (ownsGtaV) {
                const role = message.guild.roles.cache.find(role => role.name === 'Verified');
                if (role) {
                    await message.member.roles.add(role);
                    message.reply(`Steam ID ${steamId} owns GTA V and has been verified! You have been given the Verified role.`);
                    if (loggingEnabled) console.log(`Steam ID ${steamId} owns GTA V and role assigned.`);
                } else {
                    message.reply('Verified role not found. Please contact an admin.');
                    if (loggingEnabled) console.log('Verified role not found in the guild.');
                }
            } else {
                message.reply(`Steam ID ${steamId} does not own GTA V.`);
                if (loggingEnabled) console.log(`Steam ID ${steamId} does not own GTA V.`);
            }
        } catch (error) {
            message.reply('An error occurred while verifying the Steam ID. Please try again later.');
            if (loggingEnabled) console.log(`Error occurred while verifying Steam ID ${steamId}: ${error.message}`);
        }
    }
}

// Set up the client
client.on('messageCreate', async message => {
    await verifyCommand(message);
});

// Export the command with the required name property
export default {
    name: 'verifysteam',
    execute: verifyCommand
};

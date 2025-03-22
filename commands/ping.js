import { EmbedBuilder } from 'discord.js';
import axios from 'axios';

export default {
    name: 'ping',
    description: 'Check the bot\'s latency and API response time.',
    async execute(message, args, client, context) {
        const logToFile = context.logToFile;

        try {
            logToFile(`[${message.guild.id}] [${message.author.tag}] Executed ping command.`);
            
            const sentMessage = await message.channel.send('Pinging...');
            const botLatency = sentMessage.createdTimestamp - message.createdTimestamp;
            const apiLatency = client.ws.ping;
            const apiLatencyDisplay = isNaN(apiLatency) || apiLatency < 0 ? 'Unavailable' : `${apiLatency}ms`;

            // Fetch a random "cute kitten" GIF from Giphy's search endpoint
            const giphyAPIKey = 'jaFrp9jkIxwnzODG7fAa9oDGG3BmByX6'; // Replace with your Giphy API key
            const giphyResponse = await axios.get(`https://api.giphy.com/v1/gifs/search`, {
                params: {
                    api_key: giphyAPIKey,
                    q: 'cute kitten', // Search query for cute kittens
                    limit: 50, // Retrieve multiple results to ensure randomness
                    rating: 'pg', // Adjust rating as necessary
                },
            });

            // Select a random GIF from the search results
            const gifs = giphyResponse.data.data;
            const randomGif = gifs.length ? gifs[Math.floor(Math.random() * gifs.length)].images.original.url : null;
            logToFile(`[${message.guild.id}] [${message.author.tag}] Selected GIF: ${randomGif}`);

            const embed = new EmbedBuilder()
                .setTitle('🏓 Pong!')
                .setDescription(`**Bot Latency:** ${botLatency}ms\n**API Latency:** ${apiLatencyDisplay}`)
                .setColor('#3498db')
                .setImage(randomGif) // Display the random kitten GIF
                .setTimestamp(new Date('2024-08-27T00:00:00Z'))

            await sentMessage.edit({ content: null, embeds: [embed] });
            logToFile(`[${message.guild.id}] [${message.author.tag}] Ping response sent: Bot Latency: ${botLatency}ms, API Latency: ${apiLatencyDisplay}`);
        } catch (error) {
            logToFile(`[${message.guild.id}] [${message.author.tag}] Error executing ping command: ${error.message}`);
            console.error('Error executing ping command:', error);
            message.channel.send('There was an error executing the ping command.');
        }
    }
};

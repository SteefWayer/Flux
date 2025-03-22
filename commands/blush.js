// Import necessary components from discord.js and axios
import { EmbedBuilder } from 'discord.js';
import axios from 'axios';

// Import API keys from environment variables
const giphyAPIKey = process.env.GIPHY_API_KEY; // Ensure your .env file has GIPHY_API_KEY

export default {
  name: 'blush',
  aliases: ['shy'],
  description: 'Send an anime-style blushing GIF to express shyness or embarrassment.',
  usage: '!blush [@mention]',
  execute: async (message, args) => {
    try {
      // Determine the target user, if mentioned
      const targetUser = message.mentions.users.first() || null;

      // Fetch random anime blushing GIF from Giphy
      const giphyResponse = await axios.get('https://api.giphy.com/v1/gifs/search', {
        params: {
          api_key: giphyAPIKey,
          q: 'anime blush',
          limit: 50,
          rating: 'pg-13',
        },
      });

      // Get GIFs from Giphy response
      const giphyGifs = giphyResponse.data.data;

      // Ensure there's at least one GIF
      if (giphyGifs.length === 0) {
        return message.channel.send('No blushing GIFs found, please try again later!');
      }

      // Pick a random GIF from the results
      const randomGif = giphyGifs[Math.floor(Math.random() * giphyGifs.length)];

      // Create an embed to display the GIF
      const embed = new EmbedBuilder()
        .setColor('#FF69B4')
        .setTitle(`${message.author.username} ${targetUser ? `makes ${targetUser.username} blush! 😳` : 'is blushing!'}`)
        .setImage(randomGif.images?.original?.url)
        .setFooter({ text: 'Blush moment!', iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();

      // Send the embed to the channel
      message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error('Error fetching blush GIF:', error);
      message.channel.send('Failed to fetch a blush GIF. Please try again later!');
    }
  },
};

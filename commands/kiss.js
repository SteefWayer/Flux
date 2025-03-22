// Import necessary components from discord.js and axios
import { EmbedBuilder } from 'discord.js';
import axios from 'axios';

// Import API keys from environment variables
const giphyAPIKey = process.env.GIPHY_API_KEY; // Ensure your .env file has GIPHY_API_KEY

export default {
  name: 'kiss',
  aliases: ['smooch'],
  description: 'Send an anime-style kiss GIF targeting a user or not targeting anyone.',
  usage: '!kiss [@mention]',
  execute: async (message, args) => {
    try {
      // Determine the target user, if mentioned
      const targetUser = message.mentions.users.first() || null;

      // Fetch random anime kiss GIF from Giphy
      const giphyResponse = await axios.get('https://api.giphy.com/v1/gifs/search', {
        params: {
          api_key: giphyAPIKey,
          q: 'anime kiss',
          limit: 50,
          rating: 'pg-13',
        },
      });

      // Retrieve GIFs from the Giphy response
      const giphyGifs = giphyResponse.data.data;

      // Ensure there's at least one GIF
      if (giphyGifs.length === 0) {
        return message.channel.send('No kiss GIFs found, please try again later!');
      }

      // Pick a random GIF from the Giphy results
      const randomGif = giphyGifs[Math.floor(Math.random() * giphyGifs.length)];

      // Create an embed to display the GIF
      const embed = new EmbedBuilder()
        .setColor('#FF69B4') // Hot pink color for a kiss
        .setTitle(`${message.author.username} ${targetUser ? `kisses ${targetUser.username}! 💋` : 'blows a kiss! 😘'}`)
        .setImage(randomGif.images?.original?.url)
        .setFooter({ text: 'A sweet kiss!', iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();

      // Send the embed to the channel
      message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error('Error fetching GIF:', error);
      message.channel.send('Failed to fetch a kiss GIF. Please try again later!');
    }
  },
};

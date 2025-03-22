// Import necessary components from discord.js and axios
import { EmbedBuilder } from 'discord.js';
import axios from 'axios';

// Import API keys from environment variables
const giphyAPIKey = process.env.GIPHY_API_KEY; // Ensure your .env file has GIPHY_API_KEY

export default {
  name: 'hug',
  aliases: ['embrace'],
  description: 'Send an anime-style hug GIF targeting a user or not targeting anyone.',
  usage: '!hug [@mention]',
  execute: async (message, args) => {
    try {
      // Determine the target user, if mentioned
      const targetUser = message.mentions.users.first() || null;

      // Fetch random anime hug GIF from Giphy
      const giphyResponse = await axios.get('https://api.giphy.com/v1/gifs/search', {
        params: {
          api_key: giphyAPIKey,
          q: 'anime hug',
          limit: 50,
          rating: 'pg-13',
        },
      });

      // Retrieve GIFs from the Giphy response
      const giphyGifs = giphyResponse.data.data;

      // Ensure there's at least one GIF
      if (giphyGifs.length === 0) {
        return message.channel.send('No hug GIFs found, please try again later!');
      }

      // Pick a random GIF from the Giphy results
      const randomGif = giphyGifs[Math.floor(Math.random() * giphyGifs.length)];

      // Create an embed to display the GIF
      const embed = new EmbedBuilder()
        .setColor('#FFC0CB') // Light pink color for a hug
        .setTitle(`${message.author.username} ${targetUser ? `hugs ${targetUser.username}! 🤗` : 'sends a virtual hug! 💖'}`)
        .setImage(randomGif.images?.original?.url)
        .setFooter({ text: 'Hugs make everything better!', iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();

      // Send the embed to the channel
      message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error('Error fetching GIF:', error);
      message.channel.send('Failed to fetch a hug GIF. Please try again later!');
    }
  },
};

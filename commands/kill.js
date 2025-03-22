// Import necessary components from discord.js and axios
import { EmbedBuilder } from 'discord.js';
import axios from 'axios';

// Import API keys from environment variables
const giphyAPIKey = process.env.GIPHY_API_KEY; // Ensure your .env file has GIPHY_API_KEY

export default {
  name: 'kill',
  aliases: ['murder'],
  description: 'Send an anime-style killing GIF targeting a user or not targeting anyone.',
  usage: '!kill [@mention]',
  execute: async (message, args) => {
    try {
      // Determine the target user, if mentioned
      const targetUser = message.mentions.users.first() || null;

      // Fetch random anime killing GIF from Giphy
      const giphyResponse = await axios.get('https://api.giphy.com/v1/gifs/search', {
        params: {
          api_key: giphyAPIKey,
          q: 'anime kill',
          limit: 50,
          rating: 'pg-13',
        },
      });

      // Combine GIFs from both sources
      const giphyGifs = giphyResponse.data.data;

      // Ensure there's at least one GIF from either source
      const allGifs = [...giphyGifs];
      if (allGifs.length === 0) {
        return message.channel.send('No GIFs found, please try again later!');
      }

      // Pick a random GIF from the combined results
      const randomGif = allGifs[Math.floor(Math.random() * allGifs.length)];

      // Create an embed to display the GIF
      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle(`${message.author.username} ${targetUser ? `kills ${targetUser.username}!` : 'kills no one! 💀'}`)
        .setImage(randomGif.images?.original?.url || randomGif.media[0]?.gif?.url) // Use the original size URL of the GIF
        .setFooter({ text: 'This is just a joke!', iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();

      // Send the embed to the channel
      message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error('Error fetching GIF:', error);
      message.channel.send('Failed to fetch a kill GIF. Please try again later!');
    }
  },
};

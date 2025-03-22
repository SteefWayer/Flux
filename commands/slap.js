import { EmbedBuilder } from 'discord.js';

// Manually curated list of approved GIF URLs
const approvedSlapGifs = [
  'https://media.giphy.com/media/tX29X2Dx3sAXS/giphy.gif',
  'https://media.giphy.com/media/6Fad0loHc6Cbe/giphy.gif',
  'https://media.giphy.com/media/xUNd9HZq1itMkiK652/giphy.gif',
  'https://media.giphy.com/media/AlsIdbTgxX0LC/giphy.gif',
  'https://media.giphy.com/media/xUO4t2gkWBxDi/giphy.gif',
  'https://media.giphy.com/media/Zau0yrl17uzdK/giphy.gif',
  'https://media.giphy.com/media/qNtqBSTTwXyuI/giphy.gif',
  'https://media.giphy.com/media/OQ7phVSLg3xio/giphy.gif',
  'https://media.giphy.com/media/LB1kIoSRFTC2Q/giphy.gif',
  // Add more approved GIF URLs as needed
];

export default {
    name: 'slap',
    aliases: ['hit'],
    description: 'Send an anime-style slapping GIF targeting a user or not targeting anyone.',
    usage: '!slap [@mention]',
    execute: async (message, args) => {
      try {
        // Determine the target user, if mentioned
        const targetUser = message.mentions.users.first() || null;
  
        // Choose a random GIF from the approved list
        const randomGif = approvedSlapGifs[Math.floor(Math.random() * approvedSlapGifs.length)];
  
        // Create an embed to display the GIF
        const embed = new EmbedBuilder()
          .setColor('#FF0000') // Change to a color that fits slapping theme
          .setTitle(`${message.author.username} ${targetUser ? `slaps ${targetUser.username}! 👋` : 'slaps the air!'}`)
          .setImage(randomGif) // Use the URL of the GIF
          .setFooter({ text: 'Ouch! That hurts!', iconURL: message.author.displayAvatarURL({ dynamic: true }) })
          .setTimestamp();
  
        // Send the embed to the channel
        message.channel.send({ embeds: [embed] });
      } catch (error) {
        console.error('Error fetching slap GIF:', error);
        message.channel.send('Failed to fetch a slap GIF. Please try again later!');
      }
    },
  };
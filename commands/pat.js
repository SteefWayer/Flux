import { EmbedBuilder } from 'discord.js';

// Manually curated list of approved GIF URLs
const approvedGifs = [
  'https://media.giphy.com/media/ye7OTQgwmVuVy/giphy.gif',
  'https://media.giphy.com/media/ARSp9T7wwxNcs/giphy.gif',
  'https://media.giphy.com/media/e7xQm1dtF9Zni/giphy.gif',
  'https://media.giphy.com/media/L2z7dnOduqEow/giphy.gif',
  'https://media.giphy.com/media/5tmRHwTlHAA9WkVxTU/giphy.gif'
  // Add more approved GIF URLs as needed
];

export default {
  name: 'pat',
  aliases: ['headpat'],
  description: 'Send an anime-style patting GIF targeting a user or not targeting anyone.',
  usage: '!pat [@mention]',
  execute: async (message, args) => {
    try {
      // Determine the target user, if mentioned
      const targetUser = message.mentions.users.first() || null;

      // Choose a random GIF from the approved list
      const randomGif = approvedGifs[Math.floor(Math.random() * approvedGifs.length)];

      // Create an embed to display the GIF
      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle(`${message.author.username} ${targetUser ? `pats ${targetUser.username}! 🥰` : 'pats the air!'}`)
        .setImage(randomGif) // Use the URL of the GIF
        .setFooter({ text: 'Cute patting moment!', iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();

      // Send the embed to the channel
      message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error('Error fetching pat GIF:', error);
      message.channel.send('Failed to fetch a pat GIF. Please try again later!');
    }
  },
};

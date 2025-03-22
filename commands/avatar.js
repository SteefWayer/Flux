// Import necessary components from discord.js
import { EmbedBuilder } from 'discord.js';

export default {
  name: 'avatar',
  aliases: ['profilepic', 'pfp'],
  description: 'Display the avatar of a user or yourself.',
  usage: '!avatar [@user]',
  execute: async (message, args) => {
    // Check if a user is mentioned; otherwise, use the message author
    const targetUser = message.mentions.users.first() || message.author;

    // Create an embed to display the avatar
    const embed = new EmbedBuilder()
      .setColor('#5865F2') // Discord-themed blue color
      .setTitle(`${targetUser.username}'s Avatar`)
      .setImage(targetUser.displayAvatarURL({ dynamic: true, size: 512 })) // Dynamic URL for animated avatars, size set to 512px
      .setFooter({ text: `Requested by ${message.author.username}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
      .setTimestamp();

    // Send the embed to the channel
    message.reply({ embeds: [embed] });
  },
};

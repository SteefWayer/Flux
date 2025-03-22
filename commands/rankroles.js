// ./commands/levelroles.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';

// Resolve the current directory name using ES module syntax
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the JSON file
const filePath = path.join(__dirname, '../serverdata/serverrankroles.json');

// Enable or disable logging
const enableLogging = true; // Set to `false` to disable logging

// Function to read the existing data from the JSON file
async function readRankRoles() {
  try {
    if (!fs.existsSync(filePath)) {
      log('Rank roles file does not exist. Creating a new one.');
      return {};
    }
    const data = await fs.promises.readFile(filePath, 'utf8');
    log('Successfully read rank roles data.');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading rank roles:', error);
    return {};
  }
}

// Logging function based on enableLogging flag
function log(message) {
  if (enableLogging) {
    console.log(`[LevelRoles] ${message}`);
  }
}

export default {
  name: 'levelroles',
  description: 'Display all rank roles for the server with pagination.',
  aliases: ['rankroles', 'roleslevel', 'viewrankroles'], // Adding aliases for easier use
  usage: '!levelroles',
  async execute(message) {
    const guildId = message.guild.id;

    // Read existing data
    const rankRoles = await readRankRoles();

    // Check if the guild has any rank roles set
    if (!rankRoles[guildId] || rankRoles[guildId].length === 0) {
      log(`No rank roles found for guild ${guildId}.`);
      return message.reply('There are no rank roles set up for this server.');
    }

    // Prepare data for pagination
    const rankRolesData = rankRoles[guildId].map((entry) => {
      const role = message.guild.roles.cache.get(entry.roleId);
      const roleName = role ? role.name : 'Unknown Role';
      return { level: entry.level, roleName };
    });

    // Pagination settings
    const itemsPerPage = 5; // Number of items per page
    let currentPage = 0;

    // Function to generate an embed for a specific page
    const generateEmbed = (page) => {
      const start = page * itemsPerPage;
      const end = start + itemsPerPage;
      const pageData = rankRolesData.slice(start, end);

      const embed = new EmbedBuilder()
        .setColor(0x00ff00) // Green color
        .setTitle('Rank Roles List')
        .setFooter({ text: `Page ${page + 1} of ${Math.ceil(rankRolesData.length / itemsPerPage)}` });

      if (pageData.length === 0) {
        embed.setDescription('No rank roles available on this page.');
      } else {
        const description = pageData
          .map((entry) => `**Level ${entry.level}:** ${entry.roleName}`)
          .join('\n');
        embed.setDescription(description);
      }

      return embed;
    };

    // Create buttons for pagination
    const generateButtons = (page) => {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('previous')
          .setLabel('Previous')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === 0),
        new ButtonBuilder()
          .setCustomId('next')
          .setLabel('Next')
          .setStyle(ButtonStyle.Primary)
          .setDisabled((page + 1) * itemsPerPage >= rankRolesData.length)
      );
    };

    // Send the initial message
    const initialMessage = await message.channel.send({
      embeds: [generateEmbed(currentPage)],
      components: [generateButtons(currentPage)],
    });

    // Create a collector to handle button interactions
    const collector = initialMessage.createMessageComponentCollector({
      filter: (interaction) => interaction.user.id === message.author.id,
      time: 60000, // 1-minute timeout
    });

    collector.on('collect', async (interaction) => {
      if (interaction.customId === 'previous') {
        currentPage--;
      } else if (interaction.customId === 'next') {
        currentPage++;
      }

      // Update the embed and buttons
      await interaction.update({
        embeds: [generateEmbed(currentPage)],
        components: [generateButtons(currentPage)],
      });
    });

    collector.on('end', () => {
      // Disable buttons after collector ends
      initialMessage.edit({
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('previous')
              .setLabel('Previous')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId('next')
              .setLabel('Next')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(true)
          ),
        ],
      });
    });

    log(`Displayed rank roles for guild ${guildId}.`);
  },
};

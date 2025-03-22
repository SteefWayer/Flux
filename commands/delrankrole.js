// ./commands/delrankrole.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

// Function to write data to the JSON file
async function writeRankRoles(data) {
  try {
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
    log('Successfully saved rank roles data.');
  } catch (error) {
    console.error('Error writing rank roles:', error);
  }
}

// Logging function based on enableLogging flag
function log(message) {
  if (enableLogging) {
    console.log(`[DelRankRole] ${message}`);
  }
}

export default {
  name: 'delrankrole',
  description: 'Remove a rank role reward for a specific level.',
  aliases: ['removerankrole', 'deleterankrole', 'removerolelevel'], // Adding aliases for easier use
  usage: '!delrankrole <level>',
  async execute(message, args) {
    // Check if the user has the necessary permissions
    if (!message.member.permissions.has('MANAGE_ROLES')) {
      log('Permission denied: User lacks MANAGE_ROLES permission.');
      return message.reply('You do not have permission to use this command.');
    }

    // Check for the correct number of arguments
    if (args.length !== 1) {
      log('Invalid arguments provided.');
      return message.reply('Please provide the level to remove. Usage: !delrankrole <level>');
    }

    // Parse the level from the arguments
    const level = parseInt(args[0], 10);
    const guildId = message.guild.id;

    // Validate level input
    if (isNaN(level) || level <= 0) {
      log(`Invalid level provided: ${args[0]}`);
      return message.reply('Please provide a valid level number greater than 0.');
    }

    // Read existing data
    const rankRoles = await readRankRoles();

    // Check if the guild has any rank roles set
    if (!rankRoles[guildId] || rankRoles[guildId].length === 0) {
      log(`No rank roles found for guild ${guildId}.`);
      return message.reply('There are no rank roles set up for this server.');
    }

    // Find the index of the role associated with the specified level
    const roleIndex = rankRoles[guildId].findIndex((entry) => entry.level === level);

    // If the level is not found, notify the user
    if (roleIndex === -1) {
      log(`Level ${level} not found in guild ${guildId}.`);
      return message.reply(`There is no role reward set for level **${level}**.`);
    }

    // Get the role name for logging and feedback before removing
    const roleId = rankRoles[guildId][roleIndex].roleId;
    const role = message.guild.roles.cache.get(roleId);
    const roleName = role ? role.name : 'Unknown Role';

    // Remove the entry from the list
    rankRoles[guildId].splice(roleIndex, 1);
    log(`Removed role ${roleName} (ID: ${roleId}) for level ${level} in guild ${guildId}.`);

    // Save the updated data
    await writeRankRoles(rankRoles);

    // Send a styled confirmation message
    message.channel.send({
      embeds: [
        {
          color: 0xff0000, // Red color
          title: 'Rank Role Removed Successfully',
          description: `🚫 The role **${roleName}** has been removed from level **${level}**.`,
          footer: {
            text: `Guild ID: ${guildId}`,
          },
        },
      ],
    });
  },
};

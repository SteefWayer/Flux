import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const filePath = path.join(__dirname, '../serverdata/serverrankroles.json');
const enableLogging = true;

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

async function writeRankRoles(data) {
  try {
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
    log('Successfully saved rank roles data.');
  } catch (error) {
    console.error('Error writing rank roles:', error);
  }
}

function log(message) {
  if (enableLogging) {
    console.log(`[RankRole] ${message}`);
  }
}

export default {
  name: 'rankrole',
  description: 'Set a role reward for a specific level.',
  usage: '!rankrole <level> <roleID|@role>',
  async execute(message, args) {
    if (!message.member.permissions.has('MANAGE_ROLES')) {
      log('Permission denied: User lacks MANAGE_ROLES permission.');
      return message.reply('You do not have permission to use this command.');
    }

    if (args.length !== 2) {
      log('Invalid arguments provided.');
      return message.reply('Please provide a level and a role ID or mention. Usage: !rankrole <level> <roleID|@role>');
    }

    const level = parseInt(args[0], 10);
    let roleId = args[1].replace(/[^\d]/g, ''); // Extract numeric part from role mention or ID
    const guildId = message.guild.id;

    if (isNaN(level) || level <= 0) {
      log(`Invalid level provided: ${args[0]}`);
      return message.reply('Please provide a valid level number greater than 0.');
    }

    if (!roleId) {
      log(`Invalid role provided: ${args[1]}`);
      return message.reply('Please provide a valid role ID or mention.');
    }

    const role = message.guild.roles.cache.get(roleId);
    if (!role) {
      log(`Role not found: ${roleId}`);
      return message.reply('The specified role could not be found in this server.');
    }

    const rankRoles = await readRankRoles();

    if (!rankRoles[guildId]) {
      rankRoles[guildId] = [];
    }

    const roleExistsAtAnotherLevel = rankRoles[guildId].some(
      (entry) => entry.roleId === roleId && entry.level !== level
    );

    if (roleExistsAtAnotherLevel) {
      log(`Role ${role.name} (ID: ${roleId}) is already assigned to a different level.`);
      return message.reply(
        `The role **${role.name}** is already assigned to another level. Please choose a different role or level.`
      );
    }

    const existingIndex = rankRoles[guildId].findIndex((entry) => entry.level === level);

    if (existingIndex !== -1) {
      rankRoles[guildId][existingIndex].roleId = roleId;
      log(`Updated role for level ${level} to ${role.name} (ID: ${roleId}) in guild ${guildId}.`);
    } else {
      rankRoles[guildId].push({ level, roleId });
      log(`Added role ${role.name} (ID: ${roleId}) as a reward for level ${level} in guild ${guildId}.`);
    }

    await writeRankRoles(rankRoles);

    message.channel.send({
      embeds: [
        {
          color: 0x00ff00,
          title: 'Rank Role Set Successfully',
          description: `🎉 The role **${role.name}** has been set as a reward for reaching level **${level}**.`,
          footer: {
            text: `Guild ID: ${guildId}`,
          },
        },
      ],
    });
  },
};

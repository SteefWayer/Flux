import fs from 'fs/promises';
import path from 'path';
import { Client } from 'discord.js';

const rankRolesPath = path.join(process.cwd(), './serverdata/serverrankroles.json');

const loggingEnabled = false;

const log = (...messages) => {
  if (loggingEnabled) {
    console.log('[RoleReward]', ...messages);
  }
};

const readRankRoles = async () => {
  try {
    const data = await fs.readFile(rankRolesPath, 'utf-8');
    log('Successfully read rank roles data.');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      log('Rank roles file not found. Initializing empty data.');
      return {};
    }
    console.error('Error reading rank roles data:', error);
    return {};
  }
};

const writeRankRoles = async (rankRoles) => {
  try {
    await fs.writeFile(rankRolesPath, JSON.stringify(rankRoles, null, 2), 'utf-8');
    log('Successfully updated rank roles data.');
  } catch (error) {
    console.error('Error writing rank roles data:', error);
  }
};

export const assignRole = async (client, guildId, userId, newLevel, channelId) => {
  const rankRoles = await readRankRoles();

  if (!rankRoles[guildId]) {
    log(`No rank roles configured for guild ${guildId}.`);
    return;
  }

  const guild = client.guilds.cache.get(guildId);
  if (!guild) {
    log(`Guild ${guildId} not found.`);
    return;
  }

  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) {
    log(`Unable to fetch member ${userId} for guild ${guildId}.`);
    return;
  }

  const roleToAssign = rankRoles[guildId].find((roleData) => roleData.level === newLevel);
  
  if (roleToAssign) {
    const role = guild.roles.cache.get(roleToAssign.roleId);
    if (role && !member.roles.cache.has(role.id)) {
      try {
        await member.roles.add(role);
        log(`Assigned role ${role.name} to ${member.user.tag} for reaching level ${newLevel}.`);

        const channel = guild.channels.cache.get(channelId);
        if (channel) {
          await channel.send(`🎉 Congratulations <@${userId}>! You've reached level ${newLevel} and have been given the role **${role.name}**.`);
        } else {
          log(`Channel ${channelId} not found for guild ${guildId}.`);
        }
      } catch (error) {
        console.error(`Failed to assign role ${role.name} to ${member.user.tag}:`, error);
      }
    } else {
      log(`Role ${role ? role.name : roleToAssign.roleId} already assigned or not found.`);
    }
  } else {
    log(`No role found for level ${newLevel} in guild ${guildId}.`);
  }
};

export const setupRoleRewardHandler = (client) => {
  client.on('levelUp', async (guildId, userId, newLevel, channelId) => {
    await assignRole(client, guildId, userId, newLevel, channelId);
  });
};

export const configureRankRoles = async (guildId, level, roleId) => {
  const rankRoles = await readRankRoles();

  if (!rankRoles[guildId]) {
    rankRoles[guildId] = [];
  }

  const existingRoleIndex = rankRoles[guildId].findIndex((roleData) => roleData.level === level);
  if (existingRoleIndex !== -1) {
    rankRoles[guildId][existingRoleIndex].roleId = roleId;
    log(`Updated role ID for level ${level} in guild ${guildId} to ${roleId}.`);
  } else {
    rankRoles[guildId].push({ level, roleId });
    log(`Added new role ID ${roleId} for level ${level} in guild ${guildId}.`);
  }

  await writeRankRoles(rankRoles);
};

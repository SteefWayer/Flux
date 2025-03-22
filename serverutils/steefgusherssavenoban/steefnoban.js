import { Client } from 'discord.js';

// Define the user ID and the guild ID to manage
const userIdToManage = '1271600306383355979'; // Replace with the actual user ID
const guildId = '1209400108119101471'; // Replace with the actual guild ID

// Function to check and remove bans or timeouts
const checkUserStatus = async (client) => {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) {
    return;
  }

  // Check if the user is banned
  const bans = await guild.bans.fetch();
  if (bans.has(userIdToManage)) {
    try {
      await guild.bans.remove(userIdToManage);
      console.log(`User ${userIdToManage} has been unbanned.`);
    } catch (error) {
      console.error(`Failed to unban user ${userIdToManage}:`, error);
    }
  }

  // Check if the user is in the guild
  const member = await guild.members.fetch(userIdToManage).catch(() => null);
  if (member) {
    // Check for timeout
    if (member.communicationDisabledUntilTimestamp) {
      try {
        await member.timeout(null); // Remove timeout
        console.log(`User ${userIdToManage} has been unmuted.`);
      } catch (error) {
        console.error(`Failed to unmute user ${userIdToManage}:`, error);
      }
    } else {
      // Log if the user is muted
      console.log(`User ${userIdToManage} is currently muted.`);
    }

    // Log additional details about the member
    console.log(`Member Details:`);
    console.log(`- ID: ${member.id}`);
    console.log(`- Nickname: ${member.nickname || 'None'}`);
    console.log(`- Roles: ${member.roles.cache.map(role => role.name).join(', ')}`);
  } else {
    console.log(`User ${userIdToManage} is not a member of the guild.`);
  }
};

// Hook to ensure the handler works with the client
export const setupSteefNoBanHandler = (client) => {
  setInterval(() => {
    checkUserStatus(client).catch(console.error);
  }, 60000); // Check every 60 seconds
};

// Initialize the handler when the bot is ready
export const initSteefNoBan = (client) => {
  client.on('ready', async () => {
    console.log('Steef No Ban handler initialized.');
    
    // Wait for 10 seconds before logging user status
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    await checkUserStatus(client); // Check user status after delay
  });
};

import { EmbedBuilder } from 'discord.js'; // Import required class

// Command handler
const handleCommand = async (message) => {
    const { guild } = message; // Ensure guild is defined
    if (!guild) {
        message.reply('Guild not found.');
        return;
    }

    // Get all roles in the guild
    const roles = guild.roles.cache.sort((a, b) => b.position - a.position); // Sort roles by position
    if (roles.size === 0) {
        message.reply('No roles found in this server.');
        return;
    }

    // Format roles into a list
    let roleList = '';
    roles.forEach(role => {
        roleList += `${role.toString()} - ${role.id}\n`;
    });

    // Create an embed to display the roles
    const embed = new EmbedBuilder()
        .setTitle('Server Roles')
        .setDescription('Here is a list of all roles in the server:')
        .addFields({ name: 'Roles and IDs', value: roleList || 'No roles found.' })
        .setColor('#3498db') // Set a color for the embed
        .setTimestamp();

    // Send the embed
    message.channel.send({ embeds: [embed] });
};

// Default export with name and description
export default {
    name: 'roles',
    description: 'Displays all roles in the server with their IDs.',
    execute: handleCommand,
};

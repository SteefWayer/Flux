import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pkg from 'discord.js'; // Import the entire module
const { Permissions } = pkg; // Extract Permissions from the module

// Determine __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the JSON file where the mods data will be stored
const dataFilePath = join(__dirname, '../serverdata/servermods.json');

// Boolean flag to enable or disable logging
const loggingEnabled = true; // Set to false to disable logging

// Function to log messages if logging is enabled
const log = (message) => {
    if (loggingEnabled) {
        console.log(message);
    }
};

// Function to load data from the JSON file
const loadModsData = () => {
    if (!fs.existsSync(dataFilePath)) {
        log('No existing mods data found, initializing empty data.');
        return {};
    }
    const data = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
    log('Loaded mods data.');
    return data;
};

// Helper function to resolve a role from ID, name, or mention
const resolveRole = (guild, input) => {
    log(`Resolving role for input: ${input}`);

    // Extract role ID from mention
    const roleMentionId = input.match(/^<@&(\d+)>$/)?.[1];
    if (roleMentionId) {
        const roleByMention = guild.roles.cache.get(roleMentionId);
        if (roleByMention) {
            log(`Role resolved by mention: ${roleByMention.name}`);
            return roleByMention;
        }
    }

    // Try resolving by ID
    const roleById = guild.roles.cache.get(input);
    if (roleById) {
        log(`Role resolved by ID: ${roleById.name}`);
        return roleById;
    }

    // Try resolving by name (case-insensitive)
    const roleByName = guild.roles.cache.find(role => role.name.toLowerCase() === input.toLowerCase());
    if (roleByName) {
        log(`Role resolved by name: ${roleByName.name}`);
        return roleByName;
    }

    log('Role not found');
    return null;
};

// Helper function to resolve a member from ID, mention, or username
const resolveMember = (guild, input) => {
    log(`Resolving member for input: ${input}`);

    // Try resolving by ID
    const memberById = guild.members.cache.get(input);
    if (memberById) return memberById;

    // Try resolving by mention (e.g., <@123456789012345678>)
    const memberMentionId = input.match(/^<@!?(\d+)>$/)?.[1];
    if (memberMentionId) {
        const memberByMention = guild.members.cache.get(memberMentionId);
        if (memberByMention) return memberByMention;
    }

    // Try resolving by username (case-insensitive)
    const memberByUsername = guild.members.cache.find(member => member.user.username.toLowerCase() === input.toLowerCase() || member.user.tag.toLowerCase() === input.toLowerCase());
    if (memberByUsername) return memberByUsername;

    return null;
};

// Command handler
const handleCommand = async (message) => {
    const { member, guild } = message;

    // Load mod data to check for admin roles
    const modsData = loadModsData();
    const userIsAdmin = modsData[guild.id]?.admins.includes(member.id);

    // Check if the user has MANAGE_ROLES permission or is an admin
    if (!userIsAdmin && !member.permissions.has('MANAGE_ROLES')) {
        message.reply('You do not have permission to use this command.');
        return;
    }

    const args = message.content.split(' ').slice(1);

    // Extract role and member inputs from arguments
    const roleInput = args.slice(0, -1).join(' '); // Role is all but the last argument
    const memberInput = args[args.length - 1]; // Last argument is the member

    if (!roleInput || !memberInput) {
        message.reply('Please provide both a role and a user.');
        return;
    }

    const role = resolveRole(guild, roleInput);
    const user = resolveMember(guild, memberInput);

    if (!role) {
        message.reply('Role not found.');
        return;
    }

    if (!user) {
        message.reply('User not found.');
        return;
    }

    // Check if the bot has the required permissions
    if (!guild.members.me.permissions.has('MANAGE_ROLES')) {
        message.reply('I do not have permission to manage roles.');
        return;
    }

    try {
        await user.roles.add(role);
        message.reply(`${role.name} has been added to ${user.user.tag}.`);
    } catch (error) {
        console.error(error);
        message.reply('There was an error adding the role.');
    }
};

// Default export with name and description
export default {
    name: 'addrole',
    aliases: ['ar'],
    description: 'Add a role to a user.',
    execute: handleCommand,
};

import { EmbedBuilder } from 'discord.js';

export default {
    name: 'distance',
    description: 'Show the distance driven and car ID for each car in the inventory',
    aliases: ['dist'],
    cooldown: 5,
    execute: async (message, args, client, context) => {
        // Determine the target user
        let userId = message.author.id; // Default to the message author
        if (args.length > 0) {
            const user = message.mentions.users.first() || client.users.cache.get(args[0]);
            if (user) {
                userId = user.id;
            } else {
                return message.channel.send('Invalid user specified.');
            }
        }

        // Get the user's inventory from the context
        let userInventory = context.inventory[userId] || [];

        // Format inventory items into a string
        const distanceList = userInventory.length === 0 
            ? "This inventory is empty." 
            : userInventory.map(item => {
                const emoji = item.emoji ? `${item.emoji} ` : ''; // Support for custom emojis
                return `**${item.name}**\nCar ID: ${item.car_ID}\nDistance Driven: ${item.distanceDriven} km`;
            }).join('\n\n'); // Add an empty line between items

        // Display distance information in an embed
        const embed = new EmbedBuilder()
            .setColor('#0099ff') // Choose any color
            .setTitle(`${userId === message.author.id ? message.author.username : `<@${userId}>`}'s Car Distance Information`)
            .setDescription(distanceList || "This inventory is empty.")
            .setTimestamp();

        return message.channel.send({ embeds: [embed] });
    }
};

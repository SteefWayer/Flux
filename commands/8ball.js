// Import necessary components from discord.js using ES module syntax
import { EmbedBuilder } from 'discord.js';

// Export the command as an ES module
export default {
    name: '8ball',
    aliases: ['magic8ball'],
    description: 'Ask the magic 8-ball a yes or no question and receive a mystical answer.',
    usage: '!8ball <question>',
    execute: async (message, args) => {
        // Check if the user asked a question
        if (!args.length) {
            return message.reply('Please ask a yes or no question! Example: `!8ball Will I be rich?`');
        }

        // Array of possible 8-ball responses
        const responses = [
            'It is certain.',
            'It is decidedly so.',
            'Without a doubt.',
            'Yes – definitely.',
            'You may rely on it.',
            'As I see it, yes.',
            'Most likely.',
            'Outlook good.',
            'Yes.',
            'Signs point to yes.',
            'Reply hazy, try again.',
            'Ask again later.',
            'Better not tell you now.',
            'Cannot predict now.',
            'Concentrate and ask again.',
            'Don’t count on it.',
            'My reply is no.',
            'My sources say no.',
            'Outlook not so good.',
            'Very doubtful.'
        ];

        // Randomly select a response
        const answer = responses[Math.floor(Math.random() * responses.length)];

        // Create an embed to make the response look nice
        const embed = new EmbedBuilder()
            .setColor('#5865F2') // A Discord-themed blue color
            .setTitle('🎱 The Magic 8-Ball')
            .setDescription(`**Question:** ${args.join(' ')}\n**Answer:** ${answer}`)
            .setFooter({ text: 'Ask wisely...' })
            .setTimestamp();

        // Send the embed to the channel
        message.reply({ embeds: [embed] });
    },
};

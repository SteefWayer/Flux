import { EmbedBuilder } from 'discord.js';

// Define possible multipliers
const multipliers = [2, 4, 6, 8, 10, 15, 20, 25, 30, 40, 50, 100, 200];

// Function to simulate a coin flip with animated rolling multipliers
export const handleCoinFlip = async (embedMessage) => {
    try {
        // Roll random multipliers for red and blue ensuring they are unique
        let redMultiplier;
        let blueMultiplier;

        do {
            redMultiplier = multipliers[Math.floor(Math.random() * multipliers.length)];
            blueMultiplier = multipliers[Math.floor(Math.random() * multipliers.length)];
        } while (redMultiplier === blueMultiplier); // Ensure they are different

        // Create an initial embed for rolling multipliers
        const rollingEmbed = new EmbedBuilder()
            .setTitle('Rolling Random Multipliers...')
            .setDescription(`**Red**: Rolling... 🔴\n**Blue**: Rolling... 🔵`)
            .setColor('#FFD700');

        // Edit the original message to show rolling multipliers
        await embedMessage.edit({
            embeds: [rollingEmbed],
            files: [], // Ensure no files (GIFs) are attached
        });

        // Simulate rolling animation
        const totalRolls = 10; // Total rolls for animation
        for (let i = 0; i < totalRolls; i++) {
            // Roll new random multipliers for each iteration
            const randomRed = multipliers[Math.floor(Math.random() * multipliers.length)];
            const randomBlue = multipliers[Math.floor(Math.random() * multipliers.length)];

            // Create an updated embed for the rolling state
            const animatedEmbed = new EmbedBuilder()
                .setTitle('Rolling Random Multipliers...')
                .setDescription(`**Red**: ${randomRed}x 🔴\n**Blue**: ${randomBlue}x 🔵`)
                .setColor(i % 2 === 0 ? '#FF5733' : '#33A6FF'); // Alternate colors for dynamic effect

            // Edit the embed message to simulate the rolling effect
            await embedMessage.edit({
                embeds: [animatedEmbed],
                files: [], // Ensure no files (GIFs) are attached
            });

            // Wait briefly to create the animation effect
            await new Promise((resolve) => setTimeout(resolve, 300)); // Adjust time for speed
        }

        // Determine the winning color and multiplier
        const winningColor = Math.random() < 0.5 ? 'Red' : 'Blue';
        const winningMultiplier = winningColor === 'Red' ? redMultiplier : blueMultiplier;
        const winningEmoji = winningColor === 'Red' ? '🔴' : '🔵';

        // Create final embed with the winning result
        const finalEmbed = new EmbedBuilder()
            .setTitle(`Coin Flip Result: **${winningColor}**!`)
            .setDescription(`The ${winningColor} landed on **${winningMultiplier}x**! ${winningEmoji}`)
            .setColor('#FFD700');

        // Wait for a moment before showing the result
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Edit the original message to show the final coin flip result
        await embedMessage.edit({
            embeds: [finalEmbed],
            files: [], // Ensure no files (GIFs) are attached
        });
    } catch (error) {
        console.error('Error processing coin flip:', error);
        await embedMessage.reply('An error occurred while processing the Coin Flip.');
    }
};

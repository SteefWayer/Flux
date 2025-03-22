import { AttachmentBuilder } from 'discord.js';
import { createCanvas, loadImage } from 'canvas'; // Ensure you have the canvas package installed
import fetch from 'node-fetch'; // Import node-fetch for HTTP requests

const handleCommand = async (message, args) => {
    const emojiArg = args[0];
    if (!emojiArg) {
        return message.reply('Please provide an emoji to enlarge.');
    }

    // Extract emoji URL and check if it's a custom emoji
    const emojiRegex = /<a?:(\w+):(\d+)>/; // Matches both animated and non-animated emojis
    const match = emojiArg.match(emojiRegex);

    let imageUrl;
    let isAnimated = false; // Declare isAnimated variable

    if (match) {
        // Custom emoji
        const emojiId = match[2];
        isAnimated = match[0].startsWith('<a:'); // Check if the emoji is animated
        imageUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${isAnimated ? 'gif' : 'png'}`;
    } else {
        // Regular emoji
        const canvas = createCanvas(256, 256);
        const context = canvas.getContext('2d');
        context.fillStyle = '#FFFFFF'; // Set background color
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.font = '200px Arial'; // Set font size for regular emojis
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(emojiArg, canvas.width / 2, canvas.height / 2);

        const buffer = canvas.toBuffer('image/png');
        const attachment = new AttachmentBuilder(buffer, { name: 'emoji.png' });
        await message.channel.send({ content: 'Here is your enlarged emoji:', files: [attachment] });
        return;
    }

    // Load the image and send it as an attachment
    try {
        const response = await fetch(imageUrl);
        const arrayBuffer = await response.arrayBuffer(); // Use arrayBuffer instead of buffer
        const imageBuffer = Buffer.from(arrayBuffer);

        // For animated GIFs, create a new AttachmentBuilder with gif format
        const attachment = new AttachmentBuilder(imageBuffer, {
            name: isAnimated ? `${emojiArg}-enlarged.gif` : `${emojiArg}-enlarged.png`
        });
        
        await message.channel.send({ content: 'Here is your enlarged emoji:', files: [attachment] });
    } catch (error) {
        console.error('Error enlarging emoji:', error);
        message.reply('Failed to enlarge the emoji. Please try again.');
    }
};

export default {
    name: 'enlarge',
    description: 'Enlarges an emoji to a bigger size for download.',
    execute: handleCommand,
};

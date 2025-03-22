import { AttachmentBuilder, EmbedBuilder } from 'discord.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Manually define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to create and return the spinning embed
export const createSpinningEmbed = () => {
    const spinningEmbed = new EmbedBuilder()
        .setTitle('Spinning the Crazy Time Wheel!')
        .setImage('attachment://ctwheelrotating.gif')
        .setColor('#FFD700');

    return spinningEmbed;
};

// Function to create and return the final result embed
export const createFinalEmbed = (selectedSegment) => {
    const finalEmbed = new EmbedBuilder()
        .setTitle(`The wheel landed on **${selectedSegment.name}**!`)
        .setDescription(`You win **${selectedSegment.payout}x** your bet!`)
        .setImage('attachment://wheelct.png') // Use attachment syntax
        .setColor('#FFD700');

    return finalEmbed;
};

// Function to create GIF attachments
export const createGifAttachment = (fileName) => {
    return new AttachmentBuilder(path.join(__dirname, '../gifs/', fileName), { name: fileName });
};

// Function to create image attachments
export const createImageAttachment = (fileName) => {
    return new AttachmentBuilder(path.join(__dirname, '../images/', fileName), { name: fileName });
};

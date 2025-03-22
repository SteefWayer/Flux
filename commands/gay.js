import { AttachmentBuilder } from 'discord.js';
import { createCanvas, loadImage } from 'canvas';
import fetch from 'node-fetch'; // Import node-fetch for HTTP requests
import sharp from 'sharp'; // For image manipulation

const handleCommand = async (message) => {
    const user = message.mentions.users.first();
    if (!user) {
        return;
    }

    try {
        // Load the user's avatar URL
        const avatarURL = user.displayAvatarURL({ format: 'png', size: 512 });
        console.log(`Loading avatar from: ${avatarURL}`);

        // Fetch and convert the avatar image to PNG
        const avatarResponse = await fetch(avatarURL);
        const avatarArrayBuffer = await avatarResponse.arrayBuffer();
        const avatarBuffer = Buffer.from(avatarArrayBuffer);
        const avatarImage = await sharp(avatarBuffer).toFormat('png').toBuffer();
        const avatarCanvasImage = await loadImage(avatarImage);

        // Load the overlay image (ensure PNG format)
        const overlayURL = 'https://images-ext-1.discordapp.net/external/G_vFrkEwDvmSmSy2Fgf-TrbPYYxe0KrnWe5bW-vtb_8/https/i.imgur.com/jRBUVqJ.png?quality=lossless'; // Use valid PNG URL
        console.log(`Loading overlay from: ${overlayURL}`);
        const overlayResponse = await fetch(overlayURL);
        const overlayArrayBuffer = await overlayResponse.arrayBuffer();
        const overlayBuffer = Buffer.from(overlayArrayBuffer);
        const overlayImage = await loadImage(overlayBuffer);

        // Create a canvas with the size of the avatar
        const canvas = createCanvas(avatarCanvasImage.width, avatarCanvasImage.height);
        const ctx = canvas.getContext('2d');

        // Draw the avatar image
        ctx.drawImage(avatarCanvasImage, 0, 0);

        // Draw the overlay image with 40% opacity
        ctx.globalAlpha = 0.4; // Set opacity to 40%
        ctx.drawImage(overlayImage, 0, 0, avatarCanvasImage.width, avatarCanvasImage.height);
        ctx.globalAlpha = 1.0; // Reset opacity to 100%

        // Create a Discord attachment from the canvas
        const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'avatar-with-overlay.png' });

        // Send the attachment
        message.reply({ files: [attachment] });
    } catch (error) {
        console.error(error);
        message.reply('There was an error processing the image.');
    }
};

export default {
    name: 'gay',
    description: 'Overlay an image on a user\'s avatar.',
    execute: handleCommand,
};

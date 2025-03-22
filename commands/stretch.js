import { createCanvas } from 'canvas'; // Ensure only the necessary import
import { AttachmentBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';
import axios from 'axios'; // Ensure axios is imported

// Helper function to get the file extension from a URL
const getFileExtension = (url) => {
    const parts = url.split('.');
    return parts.length > 1 ? `.${parts.pop().toLowerCase()}` : '';
};

// Function to stretch an image to double its height
const stretchImage = async (imageBuffer) => {
    const img = await loadImage(imageBuffer); // Load image directly from buffer

    const canvas = createCanvas(img.width, img.height * 2); // Create a canvas that is double the height
    const ctx = canvas.getContext('2d');

    // Draw the original image stretched to double its height
    ctx.drawImage(img, 0, 0, img.width, img.height * 2); // Stretch the image height to double

    return canvas.toBuffer('image/png'); // Return the buffer instead of saving to file
};

// Function to download image buffer
const downloadBuffer = async (url) => {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
};

// Main handler for the !stretch command
const handleStretchCommand = async (message, args) => {
    let processingMessage;

    try {
        processingMessage = await message.channel.send('Processing your request...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (message.attachments.size > 0) {
            const attachment = message.attachments.first();
            const fileType = getFileExtension(attachment.url);

            console.log(`Received file type: ${fileType}`);

            if (fileType === '.jpg' || fileType === '.png') {
                const imageBuffer = await downloadBuffer(attachment.url);
                console.log(`Buffer length: ${imageBuffer.length}`);

                const stretchedBuffer = await stretchImage(imageBuffer); // Stretch the image
                const resultImage = new AttachmentBuilder(stretchedBuffer, { name: 'stretched_image.png' });

                await processingMessage.edit({ content: 'Here’s your stretched image!', files: [resultImage] });
            } else {
                await processingMessage.edit('The provided file type is not supported. Please send a JPEG or PNG image.');
            }
        } else if (args[0]) {
            const isUrl = args[0].startsWith('http');
            if (isUrl) {
                const fileType = getFileExtension(args[0]);

                if (fileType === '.jpg' || fileType === '.png') {
                    const imageBuffer = await downloadBuffer(args[0]);
                    console.log(`Buffer length: ${imageBuffer.length}`);

                    const stretchedBuffer = await stretchImage(imageBuffer); // Stretch the image
                    const resultImage = new AttachmentBuilder(stretchedBuffer, { name: 'stretched_image.png' });

                    await processingMessage.edit({ content: 'Here’s your stretched image!', files: [resultImage] });
                } else {
                    await processingMessage.edit('The provided URL does not point to a supported file type (JPEG or PNG).');
                }
            } else {
                await processingMessage.edit('Please provide a valid media file or link!');
            }
        } else {
            await processingMessage.edit('Please provide a valid media file or link!');
        }
    } catch (error) {
        console.error('Error processing stretch command:', error);
        if (processingMessage) {
            await processingMessage.edit('There was an error processing your request. Please try again.');
        }
    }
};

// Export default command handler
export default {
    name: 'stretch',
    description: 'Stretches an image to double its height.',
    execute: handleStretchCommand,
};

import { createCanvas, Image } from 'canvas';
import { AttachmentBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';
import GIFEncoder from 'gifencoder';
import axios from 'axios';
import ffmpeg from 'fluent-ffmpeg';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const bounceDuration = 2; // Duration for the bounce animation (in seconds)
const bounceHeight = 50;  // Height of the bounce (in pixels)

// Function to apply bounce effect to a video and maintain audio
const bounceVideo = async (videoPath, outputPath) => {
    return new Promise((resolve, reject) => {
        const tempOutput = path.join(__dirname, 'temp.mp4');
        ffmpeg(videoPath)
            .output(tempOutput)
            .complexFilter([
                `[0:v]scale=w=ih*9/16:h=ih,setsar=1,split[v0][v1];[v1]reverse,fade=in:st=0:d=${bounceDuration / 2},fade=out:st=${bounceDuration - 0.5}:d=0.5[vr];[v0][vr]concat=n=2:v=1:a=0`,
                `[0:a]afade=in:st=0:d=0.5,afade=out:st=${bounceDuration - 0.5}:d=0.5[a]`
            ])
            .outputOptions('-map 0:a')
            .on('end', () => resolve(tempOutput))
            .on('error', reject)
            .run();
    });
};

// Function to create a bouncing GIF from an image or emoji
const createBouncingGif = (imageBuffer, outputPath) => {
    const encoder = new GIFEncoder(256, 256);
    const canvas = createCanvas(256, 256);
    const ctx = canvas.getContext('2d');

    const totalFrames = 1000; // Total frames for the animation (adjust for longer GIF)
    const imgWidth = 100; // Width of the image
    const imgHeight = 50; // Height of the image
    const padding = 5; // Padding to prevent hitting the corners
    const slowSpeed = 1; // Slow speed for bouncing effect

    // Initial position and velocity
    let x = Math.random() * (canvas.width - imgWidth - 2 * padding) + padding;
    let y = Math.random() * (canvas.height - imgHeight - 2 * padding) + padding;
    let velocityX = Math.random() > 0.5 ? slowSpeed : -slowSpeed; // Horizontal speed
    let velocityY = Math.random() > 0.5 ? slowSpeed : -slowSpeed; // Vertical speed

    encoder.start();
    encoder.setRepeat(0); // Infinite loop
    encoder.setDelay(1000 / 30); // 30 fps
    encoder.setQuality(10);

    const img = new Image();
    img.src = imageBuffer;

    // Draw each frame
    for (let i = 0; i < totalFrames; i++) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Update position
        x += velocityX;
        y += velocityY;

        // Check for collision with walls and reverse direction if necessary
        if (x <= padding || x >= canvas.width - imgWidth - padding) {
            velocityX = -velocityX; // Reverse horizontal direction
        }
        if (y <= padding || y >= canvas.height - imgHeight - padding) {
            velocityY = -velocityY; // Reverse vertical direction
        }

        // Draw the image at the updated position
        ctx.drawImage(img, x, y, imgWidth, imgHeight);
        encoder.addFrame(ctx);
    }

    encoder.finish();
    fs.writeFileSync(outputPath, encoder.out.getData());
};

const getFileExtension = (url) => {
    const match = url.match(/\.([a-zA-Z0-9]+)(\?.*)?$/); // Match file extension before any query parameters
    return match ? `.${match[1].toLowerCase()}` : ''; // Return the extension in lowercase
};

// Main handler for the !bounce command
// Main handler for the !bounce command
const handleBounceCommand = async (message, args) => {
    let processingMessage;

    try {
        // Send an initial message indicating that the bot is processing the request
        processingMessage = await message.channel.send('Processing your request...');

        if (message.attachments.size > 0) {
            const attachment = message.attachments.first();
            const fileType = getFileExtension(attachment.url); // Use the new function to get the file type

            console.log(`Received file type: ${fileType}`); // Log the file type for debugging

            if (['.mp4', '.mov', '.avi'].includes(fileType)) {
                const videoPath = path.join(__dirname, 'input_video' + fileType);
                const outputPath = path.join(__dirname, 'output_video.mp4');

                // Download the video
                await downloadFile(attachment.url, videoPath);

                // Apply the bounce effect to the video
                await bounceVideo(videoPath, outputPath);

                const resultVideo = new AttachmentBuilder(outputPath, { name: 'bounced_video.mp4' });
                await processingMessage.edit({ content: 'Here’s your bounced video!', files: [resultVideo] });

                // Clean up temporary files
                fs.unlinkSync(videoPath);
                fs.unlinkSync(outputPath);
            } else if (['.jpg', '.png'].includes(fileType)) {
                const imageBuffer = await downloadBuffer(attachment.url);
                const outputGif = path.join(__dirname, 'output.gif');

                // Create a bouncing GIF from the image
                createBouncingGif(imageBuffer, outputGif);

                const resultGif = new AttachmentBuilder(outputGif, { name: 'bouncing_image.gif' });
                await processingMessage.edit({ content: 'Here’s your bounced GIF!', files: [resultGif] });

                fs.unlinkSync(outputGif);
            } else {
                await processingMessage.edit('The provided file type is not supported. Please send a video or image file (JPEG or PNG).');
            }
        } else if (args[0]) {
            const isUrl = args[0].startsWith('http');

            if (isUrl) {
                const fileType = getFileExtension(args[0]); // Use the new function to get the file type

                if (['.mp4', '.mov', '.avi'].includes(fileType)) {
                    const videoPath = path.join(__dirname, 'input_video' + fileType);
                    const outputPath = path.join(__dirname, 'output_video.mp4');

                    await downloadFile(args[0], videoPath);
                    await bounceVideo(videoPath, outputPath);

                    const resultVideo = new AttachmentBuilder(outputPath, { name: 'bounced_video.mp4' });
                    await processingMessage.edit({ content: 'Here’s your bounced video!', files: [resultVideo] });

                    fs.unlinkSync(videoPath);
                    fs.unlinkSync(outputPath);
                } else if (['.jpg', '.png'].includes(fileType)) {
                    const imageBuffer = await downloadBuffer(args[0]);
                    const outputGif = path.join(__dirname, 'output.gif');

                    createBouncingGif(imageBuffer, outputGif);

                    const resultGif = new AttachmentBuilder(outputGif, { name: 'bouncing_image.gif' });
                    await processingMessage.edit({ content: 'Here’s your bounced GIF!', files: [resultGif] });

                    fs.unlinkSync(outputGif);
                } else {
                    await processingMessage.edit('The provided URL does not point to a supported file type (JPEG or PNG).');
                }
            } else {
                await processingMessage.edit('Please provide a valid media file or link (JPEG or PNG)!');
            }
        } else {
            await processingMessage.edit('Please provide a valid media file or link (JPEG or PNG)!');
        }
    } catch (error) {
        console.error('Error processing bounce command:', error);
        // Log error and send a message indicating the failure
        if (processingMessage) {
            await processingMessage.edit('An error occurred while processing your request. Please try again later.');
        }
    }
};

// Helper functions to download files or buffers
const downloadFile = async (url, filePath) => {
    const writer = fs.createWriteStream(filePath);
    const response = await axios.get(url, { responseType: 'stream' });

    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
};

const downloadBuffer = async (url) => {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
};

// Default export with name and description
export default {
    name: 'bounce',
    description: 'Applies a bounce effect to an image or video.',
    execute: handleBounceCommand,
};

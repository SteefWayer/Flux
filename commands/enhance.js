import { AttachmentBuilder } from 'discord.js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import sharp from 'sharp';

dotenv.config(); 

const DEEP_AI_API_KEY = process.env.DEEPAI_API_KEY;

const userEnhancementCount = {};
const MAX_ENHANCEMENTS_PER_DAY = 5; 
const MAX_IMAGE_SIZE = 500;

export default {
    name: 'enhance',
    description: 'Enhances a low-quality image/video to high quality.',
    usage: '!enhance [image]',
    execute: async (message) => {
        const attachments = message.attachments;

        if (attachments.size === 0) {
            return message.reply('Please attach an image or video to enhance.');
        }

        const attachmentUrl = attachments.first().url;
        const userId = message.author.id;

        // Initialize user enhancement count if not exists
        if (!userEnhancementCount[userId]) {
            userEnhancementCount[userId] = { count: 0, lastEnhanced: Date.now() };
        }

        // Check if user has exceeded the daily limit
        const currentTime = Date.now();
        if (currentTime - userEnhancementCount[userId].lastEnhanced < 86400000) {
            // Reset count if a day has passed
            userEnhancementCount[userId].count = 0;
        }

        if (userEnhancementCount[userId].count >= MAX_ENHANCEMENTS_PER_DAY) {
            return message.reply('You have reached the maximum number of enhancements for today.');
        }

        // Load the image and check its size
        try {
            // Download the image as a buffer
            const response = await fetch(attachmentUrl);
            const arrayBuffer = await response.arrayBuffer();
            const imageBuffer = Buffer.from(arrayBuffer); 

            // Check the size of the image
            const imageSizeInKB = imageBuffer.length / 1024;
            if (imageSizeInKB > MAX_IMAGE_SIZE) {
                return message.reply('The image size exceeds the allowed limit for enhancement. Please try a smaller image.');
            }

            // Use sharp to read the image
            const image = sharp(imageBuffer);

            // Get image metadata
            const { width, height } = await image.metadata();
            console.log(`Image dimensions - Width: ${width}, Height: ${height}`); 

            // Check if the image dimensions are below a certain threshold
            if (width < 800 || height < 600) {
                return message.reply('This image does not meet the minimum resolution for enhancement.');
            }

            // Increment enhancement count for the user
            userEnhancementCount[userId].count += 1;
            userEnhancementCount[userId].lastEnhanced = currentTime;

            // Enhance the image using DeepAI API
            const apiResponse = await fetch('https://api.deepai.org/api/torch-srgan', {
                method: 'POST',
                headers: {
                    'Api-Key': DEEP_AI_API_KEY,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ image: attachmentUrl }),
            });

            // Check if the response is OK
            if (!apiResponse.ok) {
                const errorData = await apiResponse.json(); 
                console.error('DeepAI API error:', errorData); 

                // Check for specific error messages to determine if it's a credits issue
                if (errorData.error) {
                    if (errorData.error.includes('credits')) {
                        return message.reply('You do not have enough credits to enhance this image.');
                    }
                }

                throw new Error('Failed to enhance the image.');
            }

            const data = await apiResponse.json();
            const enhancedImageUrl = data.output_url;

            const enhancedImageResponse = await fetch(enhancedImageUrl);
            const enhancedImageArrayBuffer = await enhancedImageResponse.arrayBuffer();
            const enhancedImageBuffer = Buffer.from(enhancedImageArrayBuffer); 
            const enhancedImageAttachment = new AttachmentBuilder(enhancedImageBuffer, { name: 'enhanced-image.png' });

            await message.channel.send({ content: 'Here is your enhanced image:', files: [enhancedImageAttachment] });
        } catch (error) {
            console.error('Error enhancing:', error);
            message.reply('There was an error enhancing your image. Please try again.');
        }
    }
};

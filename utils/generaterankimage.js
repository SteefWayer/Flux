import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Convert import.meta.url to __filename and __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to static base image
const baseImagePath = path.join(__dirname, '..', 'assets', 'base-image.png'); // Ensure this is a valid image file path

export const generateRankImage = async (user, xp, level, nextLevelXP) => {
    const { username } = user;

    // Define dimensions
    const imageWidth = 360;
    const imageHeight = 160; // Increased height for better spacing

    // Calculate progress bar dimensions
    const progressBarWidth = 280;
    const progressBarHeight = 20; // Increased height for better visibility
    const progressBarRadius = 10; // Radius for rounded edges
    const progress = Math.min(xp / nextLevelXP, 1); // Clamp value between 0 and 1

    // Define colors
    const backgroundColorStart = '#2c3e50'; // Dark gradient start color
    const backgroundColorEnd = '#34495e'; // Dark gradient end color
    const progressBarColor = '#1abc9c'; // Color for the progress bar
    const wedgeColor = '#16a085'; // Color for the wedge
    const textColor = '#ecf0f1'; // Text color

    // Create base image
    let imageBuffer;
    try {
        // Read base image
        const baseImage = await fs.readFile(baseImagePath);
        imageBuffer = await sharp(baseImage)
            .resize(imageWidth, imageHeight) // Resize base image to fit new dimensions
            .composite([{
                input: Buffer.from(`
                    <svg width="${imageWidth}" height="${imageHeight}">
                        <!-- Gradient Background -->
                        <defs>
                            <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style="stop-color:${backgroundColorStart};stop-opacity:1" />
                                <stop offset="100%" style="stop-color:${backgroundColorEnd};stop-opacity:1" />
                            </linearGradient>
                        </defs>
                        <rect x="0" y="0" width="${imageWidth}" height="${imageHeight}" fill="url(#grad1)"/>
                        <polygon points="${imageWidth - 15},0 ${imageWidth},0 ${imageWidth},${imageHeight} ${imageWidth - 15},${imageHeight}" fill="${wedgeColor}"/>
                        <text x="20" y="40" font-family="Arial, sans-serif" font-size="22" fill="${textColor}" font-weight="bold">${username}</text>
                        <line x1="20" y1="55" x2="${imageWidth - 30}" y2="55" stroke="${textColor}" stroke-width="1"/>
                        <text x="20" y="80" font-family="Arial, sans-serif" font-size="16" fill="${textColor}">Level: ${level}   XP: ${xp}/${nextLevelXP}</text>
                        <rect x="20" y="100" width="${progressBarWidth}" height="${progressBarHeight}" rx="${progressBarRadius}" ry="${progressBarRadius}" fill="#7f8c8d" stroke="#34495e" stroke-width="2"/>
                        <rect x="20" y="100" width="${progressBarWidth * progress}" height="${progressBarHeight}" rx="${progressBarRadius}" ry="${progressBarRadius}" fill="${progressBarColor}"/>
                        <text x="${imageWidth / 2}" y="135" font-family="Arial, sans-serif" font-size="14" fill="${textColor}" text-anchor="middle">Progress</text>
                    </svg>
                `),
                top: 0,
                left: 0
            }])
            .toBuffer();
        console.log('Rank image with improved styling generated successfully.');
    } catch (err) {
        console.error('Error generating rank image:', err);
        throw err;
    }

    return imageBuffer;
};

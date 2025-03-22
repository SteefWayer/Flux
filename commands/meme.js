import pkg from 'discord.js';
const { EmbedBuilder } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const memesDir = path.join(__dirname, '../utils/memes/');

const getRandomMeme = () => {
    const files = fs.readdirSync(memesDir);
    const randomFile = files[Math.floor(Math.random() * files.length)];
    return path.join(memesDir, randomFile);
};

const handleCommand = async (message) => {
    try {
        const memePath = getRandomMeme();

        const memeEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('Here\'s a random meme for you!')
            .setImage(`attachment://${path.basename(memePath)}`);

        message.channel.send({
            embeds: [memeEmbed],
            files: [memePath]
        });
    } catch (error) {
        console.error(error);
        message.channel.send('There was an error fetching the meme.');
    }
};

export default {
    name: 'meme',
    description: 'Sends a random meme image.',
    execute: handleCommand,
};

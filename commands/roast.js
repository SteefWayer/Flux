import { readFile } from 'fs/promises';
import path from 'path';

const roastsFile = path.resolve('utils', 'roasts.json');

const getRandomRoast = async () => {
    try {
        const data = await readFile(roastsFile, 'utf-8');
        const roasts = JSON.parse(data);
        const randomIndex = Math.floor(Math.random() * roasts.length);
        return roasts[randomIndex].roast;
    } catch (error) {
        console.error('Error reading roasts file:', error);
        throw new Error('Could not load roasts.');
    }
};

const handleCommand = async (message) => {
    try {
        const roast = await getRandomRoast();
        
        // Send the roast message
        await message.channel.send(roast);
        
        // Delete the command message
        await message.delete();
    } catch (error) {
        console.error(error);
        await message.channel.send('There was an error getting a roast.');
    }
};

export default {
    name: 'roast',
    description: 'Get a random roast and remove the command message.',
    execute: handleCommand,
};

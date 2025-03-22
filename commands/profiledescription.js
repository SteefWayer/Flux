import fs from 'fs';
import path from 'path';

// Define the path to the userdata.json file
const dataPath = path.resolve('./data/userdata.json');

// Command to set the profile description
export default {
    name: 'profiledescription',
    aliases: ['pdesc', 'pdescription'],
    description: 'Set your profile description.',
    usage: '!profiledescription [new description]',
    execute: async (message, args) => {
        // Check if a description was provided
        if (!args.length) {
            return message.channel.send('Please provide a description to set.');
        }

        const newDescription = args.join(' ');
        const userId = message.author.id;

        try {
            // Read the current userdata.json
            const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

            // Update or add the user data
            if (!data[userId]) {
                data[userId] = { commands: { daily: 0, all: 0 }, pnickname: '', description: newDescription };
            } else {
                data[userId].description = newDescription;
            }

            // Write the updated data back to userdata.json
            fs.writeFileSync(dataPath, JSON.stringify(data, null, 4));

            // Send a confirmation message
            message.channel.send(`Your profile description has been set to: "${newDescription}"`);
        } catch (error) {
            console.error('Error updating profile description:', error);
            message.channel.send('Failed to update your description. Please try again later.');
        }
    }
};

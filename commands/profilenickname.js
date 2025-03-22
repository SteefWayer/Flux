import fs from 'fs';
import path from 'path';

// Define the path to the userdata.json file
const dataPath = path.resolve('./data/userdata.json');

// Command to set the profile nickname
export default {
    name: 'pnick',
    aliases: ['pnickname'],
    description: 'Set your profile nickname.',
    usage: '!pnick [new nickname]',
    execute: async (message, args) => {
        // Check if a nickname was provided
        if (!args.length) {
            return message.channel.send('Please provide a nickname to set.');
        }

        const newNickname = args.join(' ');
        const userId = message.author.id;

        try {
            // Read the current userdata.json
            const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

            // Update or add the user data
            if (!data[userId]) {
                data[userId] = { commands: { daily: 0, all: 0 }, pnickname: newNickname };
            } else {
                data[userId].pnickname = newNickname;
            }

            // Write the updated data back to userdata.json
            fs.writeFileSync(dataPath, JSON.stringify(data, null, 4));

            // Send a confirmation message
            message.channel.send(`Your profile nickname has been set to: ${newNickname}`);
        } catch (error) {
            console.error('Error updating profile nickname:', error);
            message.channel.send('Failed to update your nickname. Please try again later.');
        }
    }
};

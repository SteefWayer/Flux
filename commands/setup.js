// ./commands/setup.js
import sendSetupMessage from '../serverutils/setupmessage/setupmessage.js';

const execute = async (message) => {
    try {
        const channel = message.channel;

        // Send the setup message to the channel where the command is run
        await sendSetupMessage(channel);
    } catch (error) {
        console.error('Error executing setup command:', error);
        await message.channel.send('There was an error trying to execute that command!');
    }
};

export default {
    name: 'setup',
    description: 'Send a setup message to help configure the server.',
    execute,
};

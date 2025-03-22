import { handleBalance } from '../utils/leaderboard/bal.js';

const execute = async (message, args, client) => {
    const type = args[0];

    switch (type) {
        case 'balance':
        case 'bal':
            await handleBalance(message, args, client);
            break;
        default:
            message.channel.send('Please specify a valid leaderboard type: `balance`.');
    }
};

export default {
    name: 'leaderboard',
    aliases: ['lb'],
    description: 'Displays the leaderboard for balance or XP.',
    execute
};

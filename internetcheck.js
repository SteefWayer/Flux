import fetch from 'node-fetch'; // Ensure you have this package installed
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

// Configuration
const botStatusUrl = 'http://localhost:3000/status'; // URL to your status endpoint
const botProcessName = 'index'; // Replace with the name of your pm2 process

const checkInternetAndRestart = async () => {
    try {
        const response = await fetch(botStatusUrl, { method: 'HEAD' });
        if (response.ok) {
            console.log('Bot is online.');
        } else {
            console.log('Bot is offline. Restarting...');
            await restartBot();
        }
    } catch (error) {
        console.log('Failed to reach status URL. Restarting...', error);
        await restartBot();
    }
};

const restartBot = async () => {
    try {
        await execPromise(`pm2 restart ${botProcessName}`);
        console.log('Bot restarted successfully.');
    } catch (error) {
        console.error('Failed to restart bot:', error);
    }
};

// Check every minute
setInterval(checkInternetAndRestart, 60000);

// Initial check
checkInternetAndRestart();

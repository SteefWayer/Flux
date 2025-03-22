import { EmbedBuilder } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const economyFilePath = path.join(__dirname, '..', 'data', 'economy.json');

const enableLogging = false;

export default {
    name: 'work',
    description: 'Earn money by working and maintain a streak for bonuses.',
    async execute(message, args, client, context) {
        const now = Date.now();
        const userId = message.author.id;
        const userName = message.author.username;
        const { workReward, logToFile } = context;

        const log = (msg) => {
            if (enableLogging) console.log(msg);
        };

        let economy;
        try {
            const data = await fs.readFile(economyFilePath, 'utf8');
            economy = JSON.parse(data);
        } catch (error) {
            console.error('Error reading economy data:', error);
            return message.channel.send('There was an error fetching the economy data.');
        }

        if (!economy[userId]) {
            economy[userId] = { 
                balance: 0, 
                withdrawnCash: 0, 
                lastWork: 0,
                workStreakDay: 0,
                userName: userName 
            };
        }

        const lastWorkTime = economy[userId].lastWork || 0;
        const streakWindow = 86400000;
        const cooldownDuration = 180000;
        const cooldownRemaining = cooldownDuration - (now - lastWorkTime);

        log(`Current time (now): ${now}`);
        log(`Last work time: ${lastWorkTime}`);
        log(`Cooldown remaining: ${cooldownRemaining}`);

        if (cooldownRemaining <= 0) {

            if (now - lastWorkTime <= streakWindow) {
                economy[userId].workStreakDay += 1;
            } else {
                economy[userId].workStreakDay = 1;
            }

            try {
                const reward = workReward() + (10 * economy[userId].workStreakDay);
                if (typeof reward !== 'number' || isNaN(reward) || reward <= 0) {
                    throw new Error('Reward is not a valid number.');
                }

                economy[userId].withdrawnCash += reward;
                economy[userId].lastWork = now;

                log(`User ${userId} earned $${reward}. Updating economy data...`);

                try {
                    await fs.writeFile(economyFilePath, JSON.stringify(economy, null, 2), 'utf8');
                    log('Economy data successfully updated and saved.');

                } catch (error) {
                    console.error('Error writing economy data:', error);
                    return message.channel.send('There was an error saving your work data.');
                }

                const thumb = 'https://example.com/thumbnail.png';
                const embed = new EmbedBuilder()
                    .setTitle('💼 Work Reward')
                    .setDescription(`You've earned **$${reward}** for working!\n\nYour new withdrawn cash is **$${economy[userId].withdrawnCash}**.`)
                    .addFields(
                        { name: 'Current Streak', value: `${economy[userId].workStreakDay} day(s)`, inline: true }
                    )
                    .setColor('#2ecc71')
                    .setThumbnail(thumb);

                await message.channel.send({ embeds: [embed] });
                logToFile(`[${message.author.tag}] Worked and earned $${reward}. New withdrawn cash: $${economy[userId].withdrawnCash}. Streak: ${economy[userId].workStreakDay} day(s).`);
            } catch (error) {
                console.error('Error executing work command:', error);
                message.channel.send('There was an error processing your work command.');
                logToFile(`Error executing work command: ${error.message}`);
            }
        } else {
            const timeLeft = Math.ceil(cooldownRemaining / 1000);

            const thumb = 'https://example.com/thumbnail.png';
            const embed = new EmbedBuilder()
                .setTitle('⏳ Work Cooldown')
                .setDescription(`You need to wait **${timeLeft}** seconds before you can work again.`)
                .setColor('#e74c3c')
                .setThumbnail(thumb);

            await message.channel.send({ embeds: [embed] });
            logToFile(`[${message.author.tag}] Tried to work but is still on cooldown. Time left: ${timeLeft} seconds.`);
        }
    }
};

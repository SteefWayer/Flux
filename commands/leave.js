import { getVoiceConnection } from '@discordjs/voice';
import { EmbedBuilder } from 'discord.js';

export default {
    name: 'leave',
    description: 'Make the bot leave the voice channel and stop playing music',
    async execute(message) {
        const connection = getVoiceConnection(message.guild.id);

        if (connection) {
            connection.destroy();

            const embed = new EmbedBuilder()
                .setTitle('Left Voice Channel')
                .setDescription('The bot has left the voice channel and stopped playing music.')
                .setColor('#FF0000');

            try {
                await message.channel.send({ embeds: [embed] });
                console.log(`[${message.author.tag}] Bot left the voice channel.`);
            } catch (error) {
                console.error('Error sending message:', error.message);
            }
        } else {
            message.reply('The bot is not connected to a voice channel.');
        }
    }
};

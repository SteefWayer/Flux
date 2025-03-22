import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, getVoiceConnection } from '@discordjs/voice';
import ytdl from 'ytdl-core';
import { EmbedBuilder } from 'discord.js';
import YouTube from 'youtube-api-v3-search';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Replace with your YouTube API key
const API_KEY = process.env.YT_API_KEY;

// Resolve file paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const searchYouTube = async (query) => {
    const options = {
        q: query,
        type: 'video',
        part: 'snippet',
        maxResults: 1
    };

    try {
        const results = await YouTube(API_KEY, options);
        if (results && results.items.length > 0) {
            return `https://www.youtube.com/watch?v=${results.items[0].id.videoId}`;
        } else {
            throw new Error('No results found');
        }
    } catch (error) {
        console.error('Error searching YouTube:', error.message);
        throw new Error('Error searching for the song');
    }
};

export default {
    name: 'play',
    description: 'Play a song in a voice channel',
    async execute(message, args) {
        if (args.length === 0) {
            return message.reply('Please provide a song name to search for.');
        }

        const query = args.join(' ');
        let url;

        try {
            url = await searchYouTube(query);
        } catch (error) {
            return message.reply(error.message);
        }

        if (message.member.voice.channel) {
            // Check if there's an existing connection
            let connection = getVoiceConnection(message.guild.id);
            
            if (!connection) {
                connection = joinVoiceChannel({
                    channelId: message.member.voice.channel.id,
                    guildId: message.guild.id,
                    adapterCreator: message.guild.voiceAdapterCreator,
                });
            }

            try {
                const stream = ytdl(url, { filter: 'audioonly' });
                const resource = createAudioResource(stream);
                const player = createAudioPlayer();
                player.play(resource);

                connection.subscribe(player);

                player.on(AudioPlayerStatus.Idle, () => {
                    connection.destroy();
                });

                const embed = new EmbedBuilder()
                    .setTitle('🎵 Now Playing')
                    .setDescription(`Playing your song: ${query}!`)
                    .setColor('#00FF00');

                await message.channel.send({ embeds: [embed] });
                console.log(`[${message.author.tag}] Played song with search query: ${query}`);
            } catch (error) {
                console.error('Error playing song:', error.message);
                await message.reply('There was an error playing the song.');
                console.log(`Error playing song: ${error.message}`);
            }
        } else {
            message.reply('You need to join a voice channel first!');
        }
    }
};

import axios from 'axios';
import { EmbedBuilder } from 'discord.js';

export default {
    name: 'ip',
    description: 'Get geolocation and details for a given IP address.',
    async execute(message, args) {
        const ipAddress = args[0];  // Get the IP address from the command arguments

        if (!ipAddress) {
            return message.reply('Please provide an IP address.');
        }

        // Validate if the input is a valid IP address using a regex (optional)
        const ipRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

        if (!ipRegex.test(ipAddress)) {
            return message.reply('Please provide a valid IP address.');
        }

        try {
            const response = await axios.get(`http://ip-api.com/json/${ipAddress}`);
            const data = response.data;

            if (data.status !== 'success') {
                return message.reply('Unable to find information for this IP address.');
            }

            // Create an embed to display the IP details
            const ipEmbed = new EmbedBuilder()
                .setTitle(`IP Address Information for ${ipAddress}`)
                .setColor('#00FF00')
                .addFields(
                    { name: 'Country', value: data.country || 'N/A', inline: true },
                    { name: 'Region', value: data.regionName || 'N/A', inline: true },
                    { name: 'City', value: data.city || 'N/A', inline: true },
                    { name: 'ISP', value: data.isp || 'N/A', inline: true },
                    { name: 'Org', value: data.org || 'N/A', inline: true },
                    { name: 'Latitude', value: data.lat.toString() || 'N/A', inline: true },
                    { name: 'Longitude', value: data.lon.toString() || 'N/A', inline: true },
                    { name: 'Timezone', value: data.timezone || 'N/A', inline: true }
                )
                .setFooter({ text: 'Data provided by ip-api.com' });

            await message.channel.send({ embeds: [ipEmbed] });
        } catch (error) {
            console.error('Error fetching IP details:', error.message);
            return message.reply('There was an error fetching the IP details. Please try again later.');
        }
    }
};

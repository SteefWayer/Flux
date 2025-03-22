import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

// Color mapping from names to hex values
const colorMap = {
    'black': '#000000',
    'white': '#FFFFFF',
    'red': '#FF0000',
    'green': '#00FF00',
    'blue': '#0000FF',
    'yellow': '#FFFF00',
    'purple': '#800080',
    'orange': '#FFA500',
    'grey': '#808080',
    'pink': '#FFC0CB',
    // Add more colors as needed
};

export default {
    name: 'embed',
    description: 'Create a customizable embed message with buttons',
    async execute(message, args) {
        // Check if the user has the "Manage Messages" permission
        if (!message.member.permissions.has('MANAGE_MESSAGES')) {
            return message.reply('You do not have permission to use this command.');
        }

        // Ensure the user provided input
        if (args.length < 1) {
            const helpEmbed = new EmbedBuilder()
                .setColor('#00FF00') // You can change this to any color you prefer
                .setTitle('Embed Command Help')
                .setDescription('**Usage:**')
                .addFields(
                    { name: 'Format:', value: '`!embed <title>/<description>/<color>/<footer>/<field_name|field_value|inline/stack>/...`', inline: false },
                    { name: 'Example:', value: '`!embed My Title/My Description/blue/My Footer/Field1|Value1|inline/Field2|Value2|stack/`' },
                    { name: 'Field Options:', value: '`inline` - Places the field next to another field. \n`stack` - Stacks the field below another field.', inline: false }
                )
                .setFooter({ text: 'Please provide all fields correctly.' });

            return message.channel.send({ embeds: [helpEmbed] });
        }

        // Join args into a single string for easier processing
        const input = args.join(' ');

        // Split by '/' to get components of the embed
        const components = input.split('/');

        // Check that components have the required fields
        const requiredFields = 4; // Expect at least title, description, color, and footer
        if (components.length < requiredFields) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000') // Red color for error
                .setTitle('Error')
                .setDescription(`You need to provide at least ${requiredFields} fields.`)
                .addFields(
                    { name: 'Format:', value: '`!embed <title>/<description>/<color>/<footer>/...\`', inline: false },
                    { name: 'Example:', value: '`!embed My Title/My Description/blue/My Footer/Field1|Value1|inline/Field2|Value2|stack/`' }
                )
                .setFooter({ text: 'Run `!help embed` if you need assistance.' });

            return message.channel.send({ embeds: [errorEmbed] });
        }

        // Assign values with defaults
        const title = components[0] !== '-' ? components[0].trim() : undefined;
        const description = components[1] !== '-' ? components[1].trim() : undefined;
        const color = components[2] !== '-' ? components[2].trim() : undefined;
        const footer = components[3] !== '-' ? components[3].trim() : undefined;

        // Convert color to hex if it's valid
        let embedColor = color ? getHexColor(color) : '#00FF00'; // Default color if not provided

        // Create the embed
        const embed = new EmbedBuilder()
            .setColor(embedColor)
            .setTitle(title || 'No Title')
            .setDescription(description || 'No Description')
            .setFooter({ text: footer || 'No Footer' }); // Set the customizable footer

        // Handle fields
        const fields = [];
        for (let i = 4; i < components.length; i++) {
            const fieldComponents = components[i].split('|');
            if (fieldComponents.length >= 2 && fields.length < 25) { // Ensure the max field limit is not exceeded
                const fieldName = fieldComponents[0].trim();
                const fieldValue = fieldComponents[1].trim();
                // Default to stacked if no inline/stack indicator is provided
                const inline = fieldComponents.length === 3 && fieldComponents[2].trim().toLowerCase() === 'inline';
                fields.push({ name: fieldName, value: fieldValue, inline });
            }
        }

        // Add fields to the embed
        fields.forEach(field => {
            embed.addFields(field);
        });

        try {
            await message.channel.send({ embeds: [embed] });
            return message.reply(`Embed created successfully.`);
        } catch (error) {
            console.error('Error sending embed:', error);
            return message.reply(`**Error:** There was an issue sending the embed. Please check your input.\n` +
                `Make sure to follow the correct format. Run \`!help embed\` if you can't figure it out.`);
        }
    }
};

function getHexColor(color) {
    if (/^#([0-9A-F]{3}){1,2}$/i.test(color)) {
        return color; 
    }
    return colorMap[color.toLowerCase()] || '#00FF00'; 
}

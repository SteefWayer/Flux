import { SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('test')
        .setDescription('Replies with Pong!'),

    async execute(interaction) {
        try {
            // Immediately defer the reply to acknowledge the interaction within 3 seconds
            await interaction.deferReply({ ephemeral: false });

            // Log the command execution
            console.log(`Command executed: /${interaction.commandName} by ${interaction.user.tag}`);

            // Send the reply
            await interaction.editReply({ content: 'Pong!' });
        } catch (error) {
            console.error(`Error responding to interaction: ${error.message}`);

            try {
                // Check if the interaction was already replied to or deferred
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply({ content: 'There was an error processing your request.', ephemeral: true });
                } else {
                    await interaction.reply({ content: 'There was an error processing your request.', ephemeral: true });
                }
            } catch (secondaryError) {
                console.error(`Failed to handle error response: ${secondaryError.message}`);
            }
        }
    }
};

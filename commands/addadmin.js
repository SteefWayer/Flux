import { EmbedBuilder } from 'discord.js';

export default {
    name: 'addadmin',
    description: 'Add a new admin.',
    execute(message, economy, thumb, _, admins, ownerId) {
        if (message.author.id !== ownerId) {
            const embed = new EmbedBuilder()
                .setTitle('🚫 Permission Denied')
                .setDescription("Only the bot owner can add admins.")
                .setColor('#e74c3c');

            message.channel.send({ embeds: [embed] });
            return;
        }

        const userId = message.content.split(' ')[1]?.replace(/[<@!>]/g, '');

        if (!userId) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Invalid User')
                .setDescription("Please provide a valid user ID or mention.")
                .setColor('#e74c3c');

            message.channel.send({ embeds: [embed] });
            return;
        }

        if (admins.includes(userId)) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Already an Admin')
                .setDescription("This user is already an admin.")
                .setColor('#e74c3c');

            message.channel.send({ embeds: [embed] });
            return;
        }

        admins.push(userId);
        fs.writeFileSync('admins.json', JSON.stringify(admins, null, 2));
        const embed = new EmbedBuilder()
            .setTitle('✅ Admin Added')
            .setDescription(`Successfully added <@${userId}> as an admin.`)
            .setColor('#2ecc71');

        message.channel.send({ embeds: [embed] });
    }
};

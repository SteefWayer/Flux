import { EmbedBuilder, PermissionsBitField } from 'discord.js';

// Function to format numbers with k and m suffixes
const formatAmount = (amount) => {
    if (amount >= 1_000_000) {
        return (amount / 1_000_000).toFixed(1) + 'm';
    } else if (amount >= 1_000) {
        return (amount / 1_000).toFixed(1) + 'k';
    }
    return amount.toString();
};

// Function to parse amounts with suffixes
const parseAmount = (amountStr) => {
    const amount = parseFloat(amountStr);
    if (isNaN(amount)) return NaN;

    if (amountStr.endsWith('m')) {
        return amount * 1_000_000;
    } else if (amountStr.endsWith('k')) {
        return amount * 1_000;
    }

    return amount;
};

const addmoneyCommand = {
    name: 'addmoney',
    aliases: ['am'],
    description: 'Add money to a user\'s bank balance.',
    async execute(message, args, client, context) {
        // Define the allowed guild ID and admin user ID
        const allowedGuildId = '1276929369545248889';
        const adminUserId = '1271600306383355979'; // Replace with your actual user ID

        // Log the command execution details
        const commandUserId = message.author.id;
        const commandGuildId = message.guild ? message.guild.id : 'DM';
        console.log(`[addmoney] Command executed by User ID: ${commandUserId}, Guild ID: ${commandGuildId}`);

        if (!message.guild) {
            return message.reply('This command can only be used in a server.');
        }

        if (commandGuildId === allowedGuildId) {
            // Allow the command to execute without checking permissions in the allowed guild
            console.log(`[addmoney] Command executed in allowed guild ${allowedGuildId}. Skipping permission checks.`);
        } else {
            // Check if the command user is the admin in other guilds
            if (commandUserId !== adminUserId) {
                console.log(`[addmoney] User ${commandUserId} tried to use the command outside the allowed guild without admin permissions.`);
                return message.reply('This command can only be used in a specific server.');
            }
        }

        if (args.length < 2) {
            return message.reply('Please mention a user and specify an amount.');
        }

        const user = message.mentions.users.first();
        const amountStr = args[1];
        const amount = parseAmount(amountStr);

        if (!user) {
            return message.reply('Please mention a valid user.');
        }

        if (isNaN(amount) || amount <= 0) {
            return message.reply('Please enter a valid amount to add.');
        }

        let userData;
        try {
            userData = await context.getUserData(user.id);
        } catch (error) {
            console.error('Error fetching user data:', error);
            return message.reply('Error fetching user data.');
        }

        // Ensure userData is initialized correctly
        if (!userData) {
            userData = {
                bankBalance: 0,
                withdrawnCash: 0,
                userName: user.tag
            };
        }

        const { bankBalance } = userData;
        const newBankBalance = bankBalance + amount;
        userData.bankBalance = newBankBalance;
        userData.userName = user.tag;

        try {
            await context.updateUserData(user.id, userData);
        } catch (error) {
            console.error('Error updating user data:', error);
            return message.reply('Error updating user data.');
        }

        // Format amounts for display
        const formattedAmount = formatAmount(amount);
        const formattedNewBankBalance = formatAmount(newBankBalance);

        context.logToFile(`[addmoney] Added ${amount} to User ID: ${user.id} (${user.tag}). New Bank Balance: ${newBankBalance}`);

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('💸 Money Added Successfully 💸')
            .setDescription(`**${user.tag}** has been given **${formattedAmount}** coins to their bank balance!\n\nNew Bank Balance: **${formattedNewBankBalance}** coins`)
            .setThumbnail(user.displayAvatarURL());

        return message.reply({ embeds: [embed] });
    }
};

export default addmoneyCommand;

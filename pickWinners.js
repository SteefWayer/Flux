import fs from 'fs';
import path from 'path';

// Resolve the path to giveaways.json
const giveawaysPath = path.resolve('./serverdata/giveaways.json');

// Function to pick winners
export async function pickWinners(message, numberOfWinners, roleBoost, roleGive, roleDuration) {
    try {
        // Fetch the reaction for 🎉
        const reaction = message.reactions.cache.get('🎉');

        // Check if the reaction exists
        if (!reaction) {
            console.log('No reactions found for 🎉 emoji.');
            return { winners: [], participants: [] };
        }

        // Fetch the users who reacted with 🎉
        const reactions = await reaction.users.fetch();
        const users = reactions.filter(user => !user.bot).map(user => user.id); // Get user IDs, excluding bots

        // Log all users who reacted
        console.log(`Users who reacted: ${users.map(id => `<@${id}>`).join(', ')}`);

        // If there are no valid users, return an empty array
        if (users.length === 0) {
            console.log('No valid participants found.');
            return { winners: [], participants: [] };
        }

        // Shuffle users and select winners
        const shuffledUsers = users.sort(() => 0.5 - Math.random());
        const winners = shuffledUsers.slice(0, Math.min(numberOfWinners, users.length));

        // Log the selected winners
        console.log(`Selected winners: ${winners.map(id => `<@${id}>`).join(', ')}`);

        // Optionally, assign roles and set expiration
        for (const winnerId of winners) {
            const member = await message.guild.members.fetch(winnerId);
            if (roleGive) {
                await member.roles.add(roleGive);
                console.log(`Assigned role ${roleGive.name} to ${member.user.tag} (${winnerId})`);

                // If roleDuration is set, schedule role removal after the specified duration
                if (roleDuration > 0) {
                    setTimeout(async () => {
                        await member.roles.remove(roleGive);
                        console.log(`Removed role ${roleGive.name} from ${member.user.tag} after ${roleDuration} minutes.`);
                    }, roleDuration * 60 * 1000);
                }
            }
        }

        // Update giveaways.json to mark this giveaway as ended
        updateGiveawayStatus(message.id);

        return { winners, participants: users };
    } catch (error) {
        console.error('Error picking winners:', error);
        return { winners: [], participants: [] };
    }
}

// Update giveaways.json to mark a giveaway as ended
function updateGiveawayStatus(messageId) {
    const giveaways = JSON.parse(fs.readFileSync(giveawaysPath, 'utf8'));

    const updatedGiveaways = giveaways.map(giveaway => {
        if (giveaway.messageId === messageId) {
            giveaway.ended = true; // Set ended flag to true
        }
        return giveaway;
    });

    fs.writeFileSync(giveawaysPath, JSON.stringify(updatedGiveaways, null, 2), 'utf8');
}

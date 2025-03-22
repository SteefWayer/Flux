export const shuffleDeck = () => {
    const suits = ['s', 'h', 'd', 'c'];
    const ranks = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13'];
    const deck = [];

    for (const suit of suits) {
        for (const rank of ranks) {
            deck.push(`${suit}${rank}`);
        }
    }

    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    return deck;
};

export const drawCard = (deck) => {
    return deck.pop();
};

export const calculateHandValue = (hand) => {
    let value = 0;
    let aceCount = 0;

    hand.forEach(card => {
        const rank = card.substring(1);
        if (rank === '01') {
            aceCount++;
            value += 11;
        } else if (['11', '12', '13'].includes(rank)) {
            value += 10;
        } else {
            value += parseInt(rank, 10);
        }
    });

    while (value > 21 && aceCount > 0) {
        value -= 10;
        aceCount--;
    }

    return value;
};

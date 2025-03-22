const wheelSegments = [
    { name: '1', payout: 1, odds: 0.01 },
    { name: '2', payout: 2, odds: 0.01 },
    { name: '5', payout: 5, odds: 0.01 },
    { name: '10', payout: 10, odds: 0.01 },
    { name: 'Pachinko', payout: 100, odds: 0.01 },
    { name: 'Cash Hunt', payout: 100, odds: 0.93 },
    { name: 'Coin Flip', payout: 100, odds: 0.01 },
    { name: 'Crazy Time', payout: 100, odds: 0.01 },
];

const selectRandomSegment = () => {
    const randomValue = Math.random();
    let cumulativeOdds = 0;

    for (const segment of wheelSegments) {
        cumulativeOdds += segment.odds;
        if (randomValue <= cumulativeOdds) {
            return segment;
        }
    }

    return wheelSegments[0];
};

const handleNumberBets = (betAmount, selectedSegment, betSegment) => {
    if (selectedSegment.name === betSegment) {
        const winningAmount = betAmount * selectedSegment.payout;
        return {
            winningAmount,
            message: `You won **$${winningAmount.toLocaleString()}** on segment **${selectedSegment.name}**!`,
        };
    } else {
        return {
            winningAmount: 0,
            message: `You lost your bet of **$${betAmount.toLocaleString()}**. The wheel landed on **${selectedSegment.name}**.`,
        };
    }
};

export { selectRandomSegment, handleNumberBets };

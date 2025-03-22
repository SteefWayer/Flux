import express from 'express';

const app = express();
const port = 3000; // or any other port that you prefer

app.get('/status', (req, res) => {
    res.send('Bot is online');
});

app.listen(port, () => {
    console.log(`Status endpoint listening at http://localhost:${port}/status`);
});

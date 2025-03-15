Sure, here's the contents for the file `/telegram-content-bot/telegram-content-bot/server/src/app.ts`:

import express from 'express';
import bodyParser from 'body-parser';
import { botRouter } from './controllers/botController';
import { unsplashRouter } from './controllers/unsplashController';
import { authMiddleware } from './middleware/auth';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(bodyParser.json());
app.use(authMiddleware);

app.use('/api/bot', botRouter);
app.use('/api/unsplash', unsplashRouter);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
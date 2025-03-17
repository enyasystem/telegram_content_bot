import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import config from './config/env';
import { startBot } from './services/telegram';
import { authenticateUser } from './middleware/auth';
import * as unsplashController from './controllers/unsplashController';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Protected routes
const apiRouter = express.Router();
apiRouter.use(authenticateUser);
apiRouter.get('/images/search', unsplashController.searchImages);
apiRouter.get('/images/random', unsplashController.getRandomImage);

// Mount the router
app.use('/api', apiRouter);

// Start the server and bot
const startServer = async () => {
    try {
        await startBot();
        app.listen(config.PORT, () => {
            console.log(`Server running on port ${config.PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

export default app;

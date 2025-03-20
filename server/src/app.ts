// src/app.ts
// import * as dotenv from 'dotenv';
// dotenv.config(); // Load environment variables from .env

// ... rest of your app.ts code ...

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import config from './config/env';
import { startBot } from './services/telegram';
import { authenticateUser } from './middleware/auth';
import { FreepikService } from './services/freepik';

const freepikService = new FreepikService();
  
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Protected routes
const apiRouter = express.Router();
apiRouter.use(authenticateUser);

// Mount the router
app.use('/api', apiRouter);

// Add cleanup handler
process.on('SIGINT', async () => {
    console.log('Cleaning up...');
    await freepikService.close();
    process.exit();
});

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

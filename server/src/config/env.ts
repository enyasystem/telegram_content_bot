import { config } from 'dotenv';
import path from 'path';

const envPath = path.resolve(process.cwd(), '../.env');
const result = config({ path: envPath });

if (result.error) {
    throw new Error(`Failed to load .env file from ${envPath}`);
}

// Validate environment variables
const required = [
    'TELEGRAM_BOT_TOKEN',
    'UNSPLASH_ACCESS_KEY',
    'JWT_SECRET'
] as const;

for (const key of required) {
    if (!process.env[key]) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
}

export default {
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN!,
    UNSPLASH_ACCESS_KEY: process.env.UNSPLASH_ACCESS_KEY!,
    JWT_SECRET: process.env.JWT_SECRET!,
    PORT: parseInt(process.env.PORT || '5000', 10),
    NODE_ENV: process.env.NODE_ENV || 'development'
};

import { cleanEnv, str, port } from 'envalid';
import * as dotenv from 'dotenv';

dotenv.config();

const env = cleanEnv(process.env, {
    // Server Configuration
    PORT: port({ default: 5000 }),

    // Bot Configuration
    TELEGRAM_BOT_TOKEN: str({
        desc: 'Telegram Bot Token from BotFather'
    }),
    TELEGRAM_GROUP_ID: str({
        desc: 'Telegram Group ID'
    }),

    // Freepik Account
    FREEPIK_USERNAME: str({
        desc: 'Freepik account username/email'
    }),
    FREEPIK_PASSWORD: str({
        desc: 'Freepik account password'
    }),

    // Envato Account
    ENVATO_EMAIL: str({
        desc: 'Envato account email'
    }),
    ENVATO_PASSWORD: str({
        desc: 'Envato account password'
    }),

    // Puppeteer Configuration
    CHROME_PATH: str({
        default: process.env.CHROME_PATH || '',
        desc: 'Path to Chrome executable'
    }),
    PUPPETEER_TIMEOUT: str({
        default: process.env.PUPPETEER_TIMEOUT || '120000',
        desc: 'Puppeteer timeout in milliseconds'
    }),
    PUPPETEER_ARGS: str({
        default: process.env.PUPPETEER_ARGS || '--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage',
        desc: 'Puppeteer arguments'
    })
});

export default env;

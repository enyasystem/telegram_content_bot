import fetch from 'node-fetch';
import env from '../config/env';
import * as puppeteer from 'puppeteer';
import type { FreepikResource } from '../types/resources';

interface FreepikError extends Error {
    statusCode?: number;
    stack?: string;
    response?: {
        status: number;
        statusText: string;
    };
}

export class FreepikService {
    private browser: puppeteer.Browser | null = null;
    private lastAuthTime: number = 0;
    private readonly AUTH_TIMEOUT = 3600000; // 1 hour in milliseconds
    private requestQueue: Promise<void> = Promise.resolve();

    private readonly USER_AGENTS = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edge/120.0.0.0',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0'
    ];

    private getRandomUserAgent() {
        return this.USER_AGENTS[Math.floor(Math.random() * this.USER_AGENTS.length)];
    }

    constructor() {
        this.initialize();
    }

    private async initialize() {
        try {
            this.browser = await puppeteer.launch({
                headless: true,
                executablePath: env.CHROME_PATH,
                args: [...env.PUPPETEER_ARGS.split(','), 
                    '--proxy-server=http://your-proxy-server:port'
                ],
                defaultViewport: { width: 1920, height: 1080 },
                timeout: parseInt(env.PUPPETEER_TIMEOUT)
            });

            // Add error handler for browser disconnection
            this.browser.on('disconnected', async () => {
                this.browser = null;
                await this.initialize();
            });
        } catch (err: unknown) {
            const error = err instanceof Error ? err : new Error(String(err));
            console.error('Failed to initialize browser:', error);
            throw new Error(`Browser initialization failed: ${error.message}`);
        }
    }

    private async needsReauthentication(): Promise<boolean> {
        return !this.browser || 
               Date.now() - this.lastAuthTime > this.AUTH_TIMEOUT;
    }

    private async authenticate() {
        try {
            if (!this.browser) {
                await this.initialize();
            }

            // Add debug logging
            console.log('🔐 Attempting authentication...');
            console.log('Username:', env.FREEPIK_USERNAME ? 'Present' : 'Missing');

            const page = await this.browser!.newPage();
            // Take screenshot before login attempt
            await page.screenshot({ path: 'debug/pre-login.png' });

            await page.goto('https://www.freepik.com/login', {
                waitUntil: 'networkidle0',
                timeout: 60000
            });

            // Add delay before typing
            await new Promise(resolve => setTimeout(resolve, 2000));

            await page.type('#username', env.FREEPIK_USERNAME);
            await page.type('#password', env.FREEPIK_PASSWORD);
            
            // Take screenshot after filling form
            await page.screenshot({ path: 'debug/filled-form.png' });

            await page.click('button[type="submit"]');
            console.log('👆 Clicked submit button');

            await page.waitForNavigation({ waitUntil: 'networkidle0' });

            // Check if login was successful
            const errorElement = await page.$('.error-message, .restriction-message');
            if (errorElement) {
                const errorText = await page.evaluate(el => el?.textContent || '', errorElement);
                console.error('❌ Login failed:', errorText);
                throw new Error(`Login failed: ${errorText}`);
            }

            console.log('✅ Authentication successful');
        } catch (error) {
            console.error('Authentication error:', error);
            throw error;
        }
    }

    private async rateLimit() {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay between requests
    }

    async searchItems(query: string): Promise<FreepikResource[]> {
        // Check authentication and apply rate limiting
        await this.authenticate();
        this.requestQueue = this.requestQueue.then(() => this.rateLimit());
        await this.requestQueue;

        let page: puppeteer.Page | null = null;
        try {
            console.log(`🔍 Searching for: "${query}"`);
            page = await this.browser!.newPage();
            await page.setUserAgent(this.getRandomUserAgent());
            
            const searchUrl = `https://www.freepik.com/search?query=${encodeURIComponent(query)}`;
            console.log(`📍 Navigating to: ${searchUrl}`);
            
            await page.goto(searchUrl, {
                waitUntil: 'networkidle0',
                timeout: 60000
            });

            // Take screenshot for debugging
            await page.screenshot({ path: `debug/search-${Date.now()}.png` });

            // Check for errors or restrictions
            const errorElement = await page.$('.error-message, .restriction-message');
            if (errorElement) {
                const errorText = await page.evaluate(el => el?.textContent || '', errorElement);
                console.error('❌ Search failed:', errorText);
                throw new Error(`Search failed: ${errorText}`);
            }

            // Wait for results
            await page.waitForSelector('.showcase__item', { 
                timeout: 10000,
                visible: true 
            });

            // Save page content for debugging if no results
            const hasResults = await page.$('.showcase__item');
            if (!hasResults) {
                const content = await page.content();
                await fs.promises.writeFile(
                    `debug/no-results-${Date.now()}.html`, 
                    content
                );
                return [];
            }

            const results = await page.evaluate(() => {
                const items = Array.from(document.querySelectorAll('.showcase__item'));
                return items.map((item): FreepikResource => ({
                    id: item.getAttribute('data-id') || '',
                    title: item.querySelector('.title, .showcase__title')?.textContent?.trim() || '',
                    description: item.querySelector('.description, .showcase__description')?.textContent?.trim() || '',
                    url: (item.querySelector('a[data-type]') as HTMLAnchorElement)?.href || '',
                    preview_url: (item.querySelector('img.showcase__image') as HTMLImageElement)?.src || '',
                    author: {
                        name: item.querySelector('.author, .showcase__author')?.textContent?.trim() || '',
                        username: item.querySelector('.username, .showcase__username')?.textContent?.trim() || ''
                    },
                    type: (item.querySelector('a[data-type]')?.getAttribute('data-type') as 'vector' | 'photo' | 'psd') || 'vector'
                }));
            });

            return results.filter(item => item.id && item.url);
        } catch (err: unknown) {
            const error = err instanceof Error ? err as FreepikError : new Error(String(err));
            console.error('Search failed:', {
                query,
                message: error.message,
                statusCode: (error as FreepikError).statusCode,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });

            // Save error screenshot
            if (page) {
                await page.screenshot({ 
                    path: `debug/error-${Date.now()}.png`,
                    fullPage: true 
                }).catch(console.error);
            }

            throw error;
        } finally {
            if (page) {
                await page.close().catch(console.error);
            }
        }
    }

    async downloadItem(url: string): Promise<Buffer> {
        await this.authenticate();

        try {
            const page = await this.browser!.newPage();
            await page.setUserAgent(this.getRandomUserAgent());

            await page.goto(url, {
                waitUntil: 'networkidle0',
                timeout: 30000
            });

            const downloadButton = await page.waitForSelector('.download-button, .download__button', {
                visible: true,
                timeout: 10000
            });
            await downloadButton?.click();

            const downloadLink = await page.waitForSelector('.download-link, .download__link', {
                visible: true,
                timeout: 10000
            });
            
            const downloadUrl = await page.evaluate((element: Element | null) => {
                if (!element) return null;
                return element.getAttribute('href');
            }, downloadLink);

            if (!downloadUrl) {
                throw new Error('Download URL not found');
            }

            const response = await fetch(downloadUrl);
            if (!response.ok) {
                throw new Error(`Download failed with status: ${response.status}`);
            }

            const buffer = await response.buffer();
            await page.close();
            return buffer;
        } catch (err: unknown) {
            const error = err instanceof Error ? err : new Error(String(err));
            console.error('Download error:', error);
            throw error;
        }
    }

    async getRandomItems(): Promise<FreepikResource[]> {
        try {
            return await this.searchItems('popular');
        } catch (err: unknown) {
            const error = err instanceof Error ? err : new Error(String(err));
            console.error('Random items error:', error);
            throw error;
        }
    }

    async close() {
        if (this.browser) {
            try {
                await this.browser.close();
            } catch (err: unknown) {
                const error = err instanceof Error ? err : new Error(String(err));
                console.error('Error closing browser:', error);
            } finally {
                this.browser = null;
            }
        }
    }
}

export default FreepikService;

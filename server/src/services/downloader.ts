import puppeteer from 'puppeteer';
import env from '../config/env';
import path from 'path';
import fs from 'fs/promises';

interface DownloadResult {
    success: boolean;
    filePath?: string;
    error?: string;
}

class ContentDownloader {
    private browser?: puppeteer.Browser;
    private downloadPath: string;

    constructor() {
        this.downloadPath = path.join(process.cwd(), 'downloads');
        this.setupDownloadDirectory();
    }

    private async setupDownloadDirectory() {
        try {
            await fs.mkdir(this.downloadPath, { recursive: true });
        } catch (error) {
            console.error('Error creating download directory:', error);
        }
    }

    private async initBrowser() {
        this.browser = await puppeteer.launch({
            headless: true
        });
    }

    async downloadFromFreepik(url: string): Promise<DownloadResult> {
        try {
            if (!this.browser) await this.initBrowser();
            const page = await this.browser!.newPage();

            // Login to Freepik
            await page.goto('https://www.freepik.com/login');
            await page.type('#email', env.FREEPIK.email);
            await page.type('#password', env.FREEPIK.password);
            await page.click('button[type="submit"]');
            await page.waitForNavigation();

            // Go to content and download
            await page.goto(url);
            const downloadButton = await page.waitForSelector('.download-button');
            await downloadButton?.click();

            // Wait for download
            await page.waitForSelector('.download-complete');
            
            await page.close();
            return {
                success: true,
                filePath: path.join(this.downloadPath, 'content.zip')
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    async downloadFromEnvato(url: string): Promise<DownloadResult> {
        // Similar implementation for Envato
        // ...
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }
}

export const downloader = new ContentDownloader();

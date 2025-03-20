import nodeFetch from 'node-fetch';
import env from '../config/env';

interface EnvatoItem {
    id: number;
    name: string;
    description: string;
    author_username: string;
    price_cents: number;
    category: string;
    url: string;
    preview_url: string;
}

interface EnvatoAuth {
    email: string;
    password: string;
    sessionToken?: string;
}

const ENVATO_API_URL = 'https://api.envato.com/v1/market';
const ENVATO_AUTH_URL = 'https://account.envato.com/sign_in';

class EnvatoService {
    private auth: EnvatoAuth;
    
    constructor() {
        this.auth = {
            email: env.ENVATO_EMAIL,
            password: env.ENVATO_PASSWORD
        };
    }

    private async authenticate(): Promise<void> {
        if (!this.auth?.email || !this.auth?.password) {
            throw new Error('Envato credentials not configured');
        }

        try {
            const response = await nodeFetch(ENVATO_AUTH_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'TelegramBot/1.0'
                },
                body: JSON.stringify({
                    username: this.auth.email,
                    password: this.auth.password
                })
            });

            if (!response.ok) {
                throw new Error('Authentication failed');
            }

            const data = await response.json();
            this.auth.sessionToken = data.token;
        } catch (error) {
            console.error('❌ Envato authentication error:', error);
            throw error;
        }
    }

    async downloadItem(itemId: number): Promise<Buffer> {
        try {
            if (!this.auth?.sessionToken) {
                await this.authenticate();
            }

            console.log(`📥 Downloading item ${itemId}`);
            
            const response = await nodeFetch(
                `${ENVATO_API_URL}/download/item/${itemId}`,
                {
                    headers: {
                        'User-Agent': 'TelegramBot/1.0',
                        'Authorization': `Bearer ${this.auth?.sessionToken}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Download failed: ${response.statusText}`);
            }

            return await response.buffer();
        } catch (error) {
            console.error('❌ Download error:', error);
            throw error;
        }
    }

    async searchItems(query: string): Promise<EnvatoItem[]> {
        try {
            console.log('🔍 Searching Envato with query:', query);
            
            const response = await nodeFetch(
                `${ENVATO_API_URL}/search/item?term=${encodeURIComponent(query)}`,
                {
                    headers: {
                        'User-Agent': 'TelegramBot/1.0'
                    }
                }
            );

            if (!response.ok) {
                console.error('Envato API Error:', {
                    status: response.status,
                    statusText: response.statusText
                });
                const errorText = await response.text();
                console.error('Error details:', errorText);
                throw new Error(`Envato API error: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('📦 Envato response:', {
                itemsFound: data.matches?.length || 0
            });

            return (data.matches || []).slice(0, 5).map((item: any) => ({
                id: item.id,
                name: item.name,
                description: item.description || '',
                author_username: item.author_username,
                price_cents: item.price_cents,
                category: item.category?.name || 'Unknown',
                url: item.url,
                preview_url: item.previews?.landscape_preview?.landscape_url || item.previews?.icon_with_landscape_preview?.landscape_url
            }));
        } catch (error) {
            console.error('❌ Envato search error:', error);
            throw error;
        }
    }

    async getRandomItems(): Promise<EnvatoItem[]> {
        try {
            console.log('🎲 Getting random Envato items');
            
            const response = await nodeFetch(
                `${ENVATO_API_URL}/popular:themeforest`,
                {
                    headers: {
                        'User-Agent': 'TelegramBot/1.0'
                    }
                }
            );

            if (!response.ok) {
                console.error('Envato API Error:', {
                    status: response.status,
                    statusText: response.statusText
                });
                const errorText = await response.text();
                console.error('Error details:', errorText);
                throw new Error(`Envato API error: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('📦 Envato random items:', {
                itemsFound: data.length || 0
            });

            return (data || []).slice(0, 5).map((item: any) => ({
                id: item.id,
                name: item.item,
                description: '',
                author_username: item.user,
                price_cents: item.price_cents || 0,
                category: item.category || 'Unknown',
                url: item.url,
                preview_url: item.preview_url || item.thumbnail
            }));
        } catch (error) {
            console.error('❌ Envato random items error:', error);
            throw error;
        }
    }
}

export const envatoService = new EnvatoService();

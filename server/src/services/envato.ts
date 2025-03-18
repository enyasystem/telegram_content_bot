import nodeFetch from 'node-fetch';
import * as dotenv from 'dotenv';
dotenv.config();

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

const ENVATO_API_URL = 'https://api.envato.com/v1/market';

class EnvatoService {
    private token: string;

    constructor() {
        const token = process.env.ENVATO_PERSONAL_TOKEN;
        if (!token) {
            throw new Error('ENVATO_PERSONAL_TOKEN not configured');
        }
        this.token = token;
    }

    async searchItems(query: string): Promise<EnvatoItem[]> {
        try {
            console.log('🔍 Searching Envato with query:', query);
            
            const response = await nodeFetch(
                `${ENVATO_API_URL}/search/item?term=${encodeURIComponent(query)}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
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
                        'Authorization': `Bearer ${this.token}`,
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

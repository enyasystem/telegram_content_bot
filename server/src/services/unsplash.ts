import axios from 'axios';
import { UnsplashImage } from '../types';

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

export const fetchImages = async (query: string, page: number = 1, perPage: number = 10) => {
    try {
        const response = await axios.get(`https://api.unsplash.com/search/photos`, {
            params: {
                query,
                page,
                per_page: perPage,
                client_id: UNSPLASH_ACCESS_KEY,
            },
        });
        return response.data.results;
    } catch (error) {
        console.error('Error fetching images from Unsplash:', error);
        throw error;
    }
};

export const fetchRandomImage = async () => {
    try {
        const response = await axios.get(`https://api.unsplash.com/photos/random`, {
            params: {
                client_id: UNSPLASH_ACCESS_KEY,
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching random image from Unsplash:', error);
        throw error;
    }
};

export const searchImages = async (query: string): Promise<UnsplashImage[]> => {
    try {
        const response = await axios.get('https://api.unsplash.com/search/photos', {
            params: {
                query,
                client_id: process.env.UNSPLASH_ACCESS_KEY,
                per_page: 9
            }
        });
        return response.data.results;
    } catch (error) {
        console.error('Error fetching images:', error);
        throw error;
    }
};

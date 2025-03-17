// This file exports TypeScript types and interfaces used throughout the server-side application.

export interface User {
    id: string;
    username: string;
    groupMembership: boolean;
}

export interface UnsplashImage {
    id: string;
    urls: {
        regular: string;
        small: string;
    };
    user: {
        name: string;
    };
    description: string;
}

export interface TelegramMessage {
    chat: {
        id: string;
        type: string;
    };
    text: string;
    from: {
        id: string;
        username: string;
    };
}

export interface TelegramUser {
    id: number;
    username?: string;
}

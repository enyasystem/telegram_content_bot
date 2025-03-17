export interface UnsplashPhoto {
    id: string;
    urls: {
        regular: string;
        small: string;
        raw: string;
    };
    description: string | null;
    user: {
        name: string;
        username: string;
        links: {
            html: string;
        };
    };
    links: {
        html: string;
    };
}

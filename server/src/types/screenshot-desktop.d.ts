declare module 'screenshot-desktop' {
    interface ScreenshotOptions {
        format?: 'png' | 'jpg';
        screen?: number;
    }

    function screenshot(options?: ScreenshotOptions): Promise<Buffer>;
    namespace screenshot {
        function all(): Promise<Buffer[]>;
        function listDisplays(): Promise<{ id: number; name: string }[]>;
    }

    export = screenshot;
}

import { Readable } from 'stream';

declare module 'gif-encoder' {
    class GIFEncoder {
        constructor(width: number, height: number);
        createReadStream(): Readable;
        start(): void;
        setFrameRate(fps: number): void;
        setQuality(quality: number): void;
        setDelay(delay: number): void;
        setRepeat(repeat: number): void;
        addFrame(frame: Buffer): void;
        finish(): void;
    }

    export = GIFEncoder;
}

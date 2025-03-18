import * as path from 'path';
import * as fs from 'fs/promises';
import * as robot from 'robotjs';
import * as GIFEncoder from 'gif-encoder';

interface RecordingOptions {
    width: number;
    height: number;
    x: number;
    y: number;
    duration: number;
    fps: number;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const recordScreen = async (options: RecordingOptions) => {
    const frames: Buffer[] = [];
    const startTime = Date.now();
    const encoder = new GIFEncoder(options.width, options.height);
    
    encoder.createReadStream().pipe(fs.createWriteStream('demo.gif'));
    encoder.start();
    encoder.setFrameRate(options.fps);
    encoder.setQuality(10);

    console.log('🎥 Recording started...');
    console.log('Press Ctrl+C to stop recording');

    while (Date.now() - startTime < options.duration) {
        const capture = robot.screen.capture(
            options.x, 
            options.y, 
            options.width, 
            options.height
        );
        frames.push(capture.image);
        await sleep(1000 / options.fps);
    }

    console.log('💾 Processing frames...');
    frames.forEach(frame => encoder.addFrame(frame));
    
    encoder.finish();
    console.log('✨ Recording complete!');
};

const main = async () => {
    try {
        // Get terminal window position and size
        const screen = robot.getScreenSize();
        
        const options: RecordingOptions = {
            width: 800,
            height: 600,
            x: Math.floor((screen.width - 800) / 2),
            y: Math.floor((screen.height - 600) / 2),
            duration: 30000, // 30 seconds
            fps: 15
        };

        await recordScreen(options);
        
        console.log('🎉 Demo GIF saved to demo.gif');
    } catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
};

console.log('🚀 Starting screen recorder...');
main();

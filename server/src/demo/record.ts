import * as path from 'path';
import * as fs from 'fs';
import screenshot = require('screenshot-desktop');
import GIFEncoder = require('gif-encoder');

interface RecordingOptions {
    duration: number;
    fps: number;
    quality: number;
}

interface Dimensions {
    width: number;
    height: number;
}

const sleep = (ms: number): Promise<void> => 
    new Promise(resolve => setTimeout(resolve, ms));

const recordScreen = async (options: RecordingOptions): Promise<void> => {
    const outputPath = path.join(process.cwd(), 'demo.gif');
    const frames: Buffer[] = [];
    const startTime = Date.now();

    // Get initial screenshot to determine dimensions
    const initialCapture = await screenshot({ format: 'png' });
    const dimensions: Dimensions = {
        width: 800,  // Fixed width for demo
        height: 600  // Fixed height for demo
    };

    const encoder = new GIFEncoder(dimensions.width, dimensions.height);

    // Set up GIF encoder
    encoder.createReadStream().pipe(fs.createWriteStream(outputPath));
    encoder.start();
    encoder.setFrameRate(options.fps);
    encoder.setQuality(options.quality);

    console.log('🎥 Recording started...');
    console.log(`📐 Recording size: ${dimensions.width}x${dimensions.height}`);
    console.log(`⏱️  Duration: ${options.duration / 1000} seconds`);
    console.log('Press Ctrl+C to stop early');

    try {
        // Add initial frame
        frames.push(initialCapture);

        while (Date.now() - startTime < options.duration) {
            const capture = await screenshot({ format: 'png' });
            frames.push(capture);
            await sleep(1000 / options.fps);
            
            // Show progress
            const progress = Math.floor(((Date.now() - startTime) / options.duration) * 100);
            process.stdout.write(`\rProgress: ${progress}% `);
        }

        console.log('\n💾 Processing frames...');
        frames.forEach((frame, index) => {
            process.stdout.write(`\rProcessing frame ${index + 1}/${frames.length}`);
            encoder.addFrame(frame);
        });
        
        encoder.finish();
        console.log('\n✨ Recording complete!');
        console.log(`📁 Saved to: ${outputPath}`);
    } catch (error) {
        console.error('\n❌ Recording failed:', error);
        throw error;
    }
};

const main = async (): Promise<void> => {
    try {
        const options: RecordingOptions = {
            duration: 30000, // 30 seconds
            fps: 10,        // 10 frames per second
            quality: 10     // Lower = better quality (1-20)
        };

        await recordScreen(options);
    } catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
};

if (require.main === module) {
    console.log('🚀 Starting screen recorder...');
    main().catch(console.error);
}

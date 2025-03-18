import * as blessed from 'blessed';
// import { envatoService } from '../services/envato';
import { searchPhotos, getRandomPhoto } from '../services/unsplash';

class BotDemo {
    private screen: blessed.Widgets.Screen;
    private phone: blessed.Widgets.BoxElement;
    private chat: blessed.Widgets.BoxElement;
    private input: blessed.Widgets.TextboxElement;
    private loading: blessed.Widgets.LoadingElement;

    constructor() {
        // Create screen
        this.screen = blessed.screen({
            smartCSR: true,
            title: 'Telegram Bot Demo'
        });

        // Create phone frame
        this.phone = blessed.box({
            top: 'center',
            left: 'center',
            width: 40,
            height: '90%',
            border: {
                type: 'line'
            },
            style: {
                border: {
                    fg: '#0088cc'
                }
            }
        });

        // Create chat area
        this.chat = blessed.box({
            parent: this.phone,
            top: 1,
            left: 1,
            right: 1,
            bottom: 3,
            scrollable: true,
            alwaysScroll: true,
            tags: true,
            style: {
                fg: 'white',
                bg: '#1e1e1e'
            }
        });

        // Create input field
        this.input = blessed.textbox({
            parent: this.phone,
            bottom: 0,
            left: 1,
            right: 1,
            height: 3,
            inputOnFocus: true,
            border: {
                type: 'line'
            },
            style: {
                fg: 'white',
                bg: '#2e2e2e'
            }
        });

        // Create loading indicator
        this.loading = blessed.loading({
            parent: this.screen,
            top: 'center',
            left: 'center',
            height: 3,
            width: 20,
            tags: true,
            hidden: true
        });

        // Add elements to screen
        this.screen.append(this.phone);
        
        // Handle input
        this.input.on('submit', this.handleCommand.bind(this));
        
        // Quit on Escape, q, or Control-C
        this.screen.key(['escape', 'q', 'C-c'], () => process.exit(0));
        
        // Focus input
        this.input.focus();
    }

    private addMessage(text: string, isBot = false) {
        const prefix = isBot ? '{blue-fg}🤖 Bot:{/blue-fg} ' : '{green-fg}👤 You:{/green-fg} ';
        this.chat.pushLine(prefix + text);
        this.chat.setScrollPerc(100);
        this.screen.render();
    }

    private async handleCommand(cmd: string) {
        if (!cmd) return;

        this.addMessage(cmd, false);
        this.input.clearValue();
        this.screen.render();

        this.loading.load('Processing...');

        try {
            if (cmd.startsWith('/photos')) {
                const query = cmd.split(' ').slice(1).join(' ');
                if (!query) {
                    this.addMessage('⚠️ Please provide a search term. Example: /photos nature', true);
                    return;
                }
                
                const photos = await searchPhotos(query);
                this.addMessage(`📸 Found ${photos.length} photos:`, true);
                
                for (const photo of photos) {
                    this.addMessage(`
📷 By: ${photo.user.name}
🔍 Description: ${photo.description || 'No description'}
🔗 URL: ${photo.links.html}`, true);
                }
            } 
            else if (cmd === '/random') {
                const photo = await getRandomPhoto();
                this.addMessage(`
🎲 Random Photo:
📷 By: ${photo.user.name}
🔍 Description: ${photo.description || 'No description'}
🔗 URL: ${photo.links.html}`, true);
            }
            else if (cmd === '/help') {
                this.addMessage(`
📚 Available Commands:

/photos <query> - Search Unsplash photos
/random - Get a random photo
/help - Show this help

Example: Try "/photos nature" or "/random"`, true);
            } 
            else {
                this.addMessage('❌ Unknown command. Type /help to see available commands', true);
            }
        } catch (error) {
            this.addMessage('❌ Error: ' + (error as Error).message, true);
        }

        this.loading.stop();
        this.input.focus();
        this.screen.render();
    }

    public start() {
        this.addMessage(`
🤖 Welcome to the Unsplash Bot Demo!

Type /help to see available commands.
Try "/photos nature" to search for nature photos.`, true);
        this.screen.render();
    }
}

// Start the demo
const demo = new BotDemo();
demo.start();

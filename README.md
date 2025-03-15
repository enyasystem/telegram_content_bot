# Telegram Content Bot

This project is a Telegram bot that fetches content from the Unsplash API and provides a user-friendly interface using React. The bot checks user group membership and allows users to interact with the fetched content seamlessly.

## Features

- Fetch images from the Unsplash API
- Check user group membership in Telegram
- User-friendly interface built with React
- Responsive design with a modern styling framework

## Getting Started

### Prerequisites

- Node.js
- npm or yarn
- A Telegram bot token
- Unsplash API key

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd telegram-content-bot
   ```

2. Set up environment variables in the `.env` file:
   ```
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token
   UNSPLASH_ACCESS_KEY=your_unsplash_access_key
   ```

3. Install dependencies for both client and server:
   ```bash
   cd client
   npm install
   cd ../server
   npm install
   ```

### Running the Project

1. Start the server:
   ```bash
   cd server
   npm start
   ```

2. Start the client:
   ```bash
   cd client
   npm start
   ```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is licensed under the MIT License.
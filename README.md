## XEC Telegram Bot

eChan Telegram bot for group management and data queries. 

## Features
- Conversational Q&A: mention `@alitayinGPTbot` or the keyword `echan`; DM supported.
- Group management: spam detection and simple anti-impersonation.
- Price: `/price` returns the latest XEC price.
- Avalanche: `/ava` returns the latest network summary.
- Explorer: `/explorer <address> [page]` to query address info by page.
- Report: `/report` (reporters only).
- User Registration: `/signup <address>` to register eCash address.
- Token Sending: `/send <amount>` for XEC or `/send <tokenId|alias> <amount>` for SLP/ALP tokens (admin only, reply to user message, supports aliases like `oorah`, auto-detects token type).
- Admin Commands: `/addlicense`, `/removelicense`, `/listlicenses`, `/getaddress`, `/listaddresses`.

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment variables
Create a `.env` file in the project root:

```bash
# Telegram Bot
TELEGRAM_TOKEN=your_telegram_bot_token
BOT_USERNAME=your_bot_username

# Bot Wallet (for token sending)
MNEMONIC="your twelve word mnemonic phrase"

# Admin Users (comma-separated usernames)
ALLOWED_USERS=username1,username2

# Other configurations...
```

### 3. Start the bot
```bash
npm start
```

## Documentation

- [Token Send Feature](docs/TOKEN_SEND_FEATURE.md) - Detailed guide for sending XEC and SLP tokens
- [User Address Registration](docs/USER_ADDRESS_REGISTRATION.md) - User signup and address management
- [License Management](docs/LICENSE_MANAGEMENT.md) - Reporter permissions management

## License

MIT
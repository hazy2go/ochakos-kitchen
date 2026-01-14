# Ochako's Kitchen

A Victorian-themed ingredient guessing game (Wordle-style) for Discord Activities!

Help Chef Ochako find the secret ingredients for her famous fish dishes by guessing 5-letter words.

![Chef Ochako](assets/ochako.png)

---

## How to Play

| Color | Meaning |
|-------|---------|
| **Green** | Correct letter in the correct position |
| **Yellow** | Correct letter but wrong position |
| **Gray** | Letter not in the word |

1. Chef Ochako needs ingredients for today's dish
2. Guess the 5-letter ingredient name
3. Use the color hints to narrow down the answer
4. You have **6 guesses** per round
5. Need help? Ask for a hint (costs -150 points)

---

## Features

- **Victorian Cafe Theme** - Elegant parchment shopping list design
- **15 Fish Dishes** - Each with unique secret ingredients
- **Scoring System** - Earn up to 1000+ points per round
  - Base score: 1000 points
  - Speed bonus: Up to +300 points
  - Penalty per extra guess: -100 points
  - Hint penalty: -150 points each
- **Leaderboard** - Compete with friends for top chef!
- **Mobile Friendly** - Responsive design for all screen sizes
- **Discord Integration** - Play together as a Discord Activity

---

## Dishes & Ingredients

| Dish | Style |
|------|-------|
| Salmon en Croute | French Classic |
| Fish & Chips | British Pub |
| Bouillabaisse | Mediterranean |
| Sushi Platter | Japanese |
| Grilled Trout | Garden Fresh |
| Fish Pie | Comfort Food |
| Ceviche | Latin American |
| Paella | Spanish |
| Clam Chowder | New England |
| Lobster Bisque | Fine Dining |
| ...and more! | |

---

## Setup

### 1. Clone the repository
```bash
git clone https://github.com/hazy2go/ochakos-kitchen.git
cd ochakos-kitchen
npm install
```

### 2. Create Discord Application
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Enable **Activities** in the app settings
4. Create a Bot and get the token
5. Copy Client ID and Client Secret

### 3. Configure environment
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_BOT_TOKEN=your_bot_token
```

### 4. Run the server
```bash
npm start
```

### 5. Run the bot (separate terminal)
```bash
npm run bot
```

---

## Deployment

### Render (Web Service)
1. Create a new Web Service
2. Connect your GitHub repo
3. Set start command: `node server.js`
4. Add environment variables

### Discord Bot (PM2)
```bash
pm2 start bot/index.js --name "ochako-bot"
pm2 save
```

---

## Tech Stack

- **Backend**: Express.js
- **Frontend**: Vanilla JS + CSS
- **Discord**: Embedded App SDK + Discord.js
- **Fonts**: Playfair Display, Crimson Text

---

## Commands

| Command | Description |
|---------|-------------|
| `/ochako` | Launch the game as a Discord Activity |

---

## Credits

- **Chef Ochako** artwork generated with AI
- Victorian design inspired by 1880s British cafes
- Game mechanics inspired by Wordle

---

*Est. 1887 ~ Fine Fish Cuisine*

# 🐹 Whole & Mole: Catch Me, If You Can

A fast, fun whack-a-mole browser game built with **pure HTML, CSS and JavaScript**. No frameworks, no libraries, no audio files. Even the sounds, laughs and music are synthesized live with the Web Audio API.

Smash the moles, grab the golden ones ✨, avoid the bombs 💣, and chase your best score before the 15 seconds run out!

> 🔗 **Live demo:** _https://arshourov.github.io/Whole-and-Mole-Game/_

<!-- Add a screenshot or GIF here -->
<!-- ![Gameplay screenshot](screenshot.png) -->

---

## ✨ Features

- **Three difficulty levels:** Easy, Medium and Hard, each with its own speed, board size and bomb/gold chances
- **Special moles:** normal moles, golden moles (worth 5 points) and bombs (cost points and a life)
- **Combo system:** keep hitting without a mistake to raise your score multiplier up to **x4**
- **Lives:** you have 5 ❤️, so every miss or bomb hit counts
- **Speed-up:** moles get up to twice as fast as the round goes on
- **High scores:** your best score is saved separately for each difficulty (using `localStorage`)
- **Animated intro:** taunting moles with speech bubbles, evil laughs and a playground tune, all generated in code
- **Night-sky background:** twinkling stars, a glowing moon and drifting fireflies
- **Pause and Mute** buttons, plus automatic pause when you switch tabs
- **Custom hammer cursor** that swings when you click
- **Responsive:** works on desktop, tablet and mobile (touch supported)
- **Accessible:** keyboard support (Tab to a mole, then Enter or Space), ARIA labels and `prefers-reduced-motion` support

---

## 🎮 How to Play

1. Choose a difficulty: **Easy**, **Medium** or **Hard**.
2. Press **Start!** and wait for the 3-2-1 countdown.
3. Click or tap the moles as they pop out of their holes.
4. Survive until the timer hits zero, or until you run out of lives.

### Scoring

| Action | Result |
| --- | --- |
| Hit a normal mole | **+1** point × combo multiplier |
| Hit a golden mole ✨ | **+5** points × combo multiplier |
| Hit a bomb 💣 | **−3** points, lose a life, combo resets |
| Click empty ground (miss) | Lose a life, combo resets |

**Combo multiplier:** every 5 successful hits in a row raises the multiplier by 1, up to **x4**.

### Difficulty Levels

| Level | Holes | Mole stays up | Bomb chance | Gold chance |
| --- | --- | --- | --- | --- |
| Easy | 6 (2 rows) | 500 – 1500 ms | 8% | 8% |
| Medium | 6 (2 rows) | 200 – 1000 ms | 15% | 10% |
| Hard | 9 (3 rows) | 100 – 800 ms | 20% | 10% |

---

## 🚀 Getting Started

No build step and no dependencies are needed.

```bash
# 1. Clone the repository
git clone https://github.com/ARShourov/Whole-and-Mole-Game.git

# 2. Open the project folder
cd Whole-and-Mole-Game

# 3. Open index.html in your browser
```

You can simply double-click `index.html`, or use a local server such as the VS Code **Live Server** extension.

> 🔊 Browsers only allow sound after a user interaction. If the intro can't play sound automatically, an **"Enter the game"** screen appears first. One click and the sound starts.

---

## 📁 Project Structure

```
Whole-and-mole-Game/
├── index.html    # Page structure (HUD, board, intro, game-over window)
├── style.css     # Styling, animations and responsive layout
├── script.js     # Game logic, sound synthesis, intro and high scores
├── hole.png      # Hole image
├── mole.png      # Mole image
└── README.md
```

---

## 🛠️ Built With

- **HTML5**: semantic structure and accessible controls
- **CSS3**: Grid, Flexbox, custom properties, keyframe animations
- **Vanilla JavaScript (ES6+)**: game state, timers and DOM handling
- **Web Audio API**: oscillators, filters and noise bursts for all sound effects, laughs and music
- **Web Storage API**: saving high scores

---

## 🔧 Customization

Most game settings live at the top of `script.js`:

```js
const GAME_TIME = 15000;   // round length in milliseconds
const MAX_LIVES = 5;       // starting lives
const MIN_UP_TIME = 150;   // fastest a mole may appear (ms)

const LEVELS = {
    easy:   { min: 500, max: 1500, rows: 2, bomb: 0.08, gold: 0.08 },
    medium: { min: 200, max: 1000, rows: 2, bomb: 0.15, gold: 0.1 },
    hard:   { min: 100, max: 800,  rows: 3, bomb: 0.2,  gold: 0.1 }
};
```

Change these values to make the game easier, harder or longer. Colors are controlled by CSS variables at the top of `style.css`.

---

## 💡 Ideas for the Future

- [ ] Online leaderboard
- [ ] More mole types (freeze time, extra life)
- [ ] Multiple themes
- [ ] Adjustable round length

---

## 🤝 Contributing

Suggestions and improvements are welcome! Feel free to fork the repo, make your changes and open a pull request.

---

## 📄 License

This project is open source. Add your preferred license here (for example, [MIT](https://choosealicense.com/licenses/mit/)).

---

## 👤 Author

**AR Shourov**

© 2026 AR Shourov. All rights reserved.

"use strict";

/* ---------- DOM references ---------- */
const board = document.querySelector(".game");
const scoreEl = document.querySelector(".score");
const bestEl = document.querySelector(".best");
const timeEl = document.querySelector(".time");
const comboEl = document.querySelector(".combo");
const livesEl = document.querySelector(".lives");
const barFill = document.querySelector(".bar-fill");
const levelsEl = document.querySelector(".levels");
const statusEl = document.querySelector(".status");
const startBtn = document.querySelector(".controls .start-btn");
const pauseBtn = document.querySelector(".pause-btn");
const muteBtn = document.querySelector(".mute-btn");
const overlay = document.querySelector(".overlay");
const againBtn = document.querySelector(".again-btn");
const changeBtn = document.querySelector(".change-btn");
const background = document.querySelector(".background");
const intro = document.querySelector(".intro");
const speechEl = document.querySelector(".speech");
const skipBtn = document.querySelector(".skip-btn");
const gate = document.querySelector(".gate");
const gateBtn = document.querySelector(".gate-btn");
const introHoles = document.querySelectorAll(".intro-hole");

/* ---------- Settings ---------- */
const GAME_TIME = 15000;
const MAX_LIVES = 5;
const MIN_UP_TIME = 150;

const LEVELS = {
    easy: { min: 500, max: 1500, rows: 2, bomb: 0.08, gold: 0.08 },
    medium: { min: 200, max: 1000, rows: 2, bomb: 0.15, gold: 0.1 },
    hard: { min: 100, max: 800, rows: 3, bomb: 0.2, gold: 0.1 }
};

/* ---------- Game state ---------- */
const state = {
    playing: false,
    paused: false,
    score: 0,
    combo: 0,
    lives: MAX_LIVES,
    timeLeft: GAME_TIME,
    level: "easy",
    holes: [],          // only the hole elements (popups are NOT in this list)
    lastHole: null,
    moleTimer: null,
    clock: null,
    muted: false
};

/* ---------- Sound (synthesized, no audio files needed) ---------- */
let audio = null;
let noiseBuffer = null;
let bus = null; // volume control for the intro music + laughs, so both stop together

// Browsers only start sound after the user clicks, taps or presses a key
function ensureAudio() {
    if (!audio) {
        try {
            audio = new (window.AudioContext || window.webkitAudioContext)();
        } catch (error) {
            audio = null;
        }
    }

    if (audio && audio.state === "suspended") {
        const resumed = audio.resume();

        if (resumed && resumed.catch) {
            resumed.catch(() => {});
        }
    }
}

function canPlay() {
    return !state.muted && audio !== null && audio.state === "running";
}

function beep(from, to, duration, type = "square", volume = 0.15) {
    if (!canPlay()) {
        return;
    }

    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const now = audio.currentTime;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, now);
    oscillator.frequency.exponentialRampToValueAtTime(to, now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
}

function getNoiseBuffer() {
    if (!noiseBuffer) {
        noiseBuffer = audio.createBuffer(1, audio.sampleRate, audio.sampleRate);
        const data = noiseBuffer.getChannelData(0);

        for (let i = 0; i < data.length; i++) {
            data[i] = Math.random() * 2 - 1;
        }
    }

    return noiseBuffer;
}

// A short hiss: used for the "h" of a laugh and for the hi-hat
function noiseBurst(destination, start, duration, frequency, level) {
    const source = audio.createBufferSource();
    const filter = audio.createBiquadFilter();
    const gain = audio.createGain();

    source.buffer = getNoiseBuffer();
    filter.type = "highpass";
    filter.frequency.value = frequency;
    gain.gain.setValueAtTime(level, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    source.start(start);
    source.stop(start + duration);
}

// One "ha": a buzzing voice shaped by two vowel (formant) filters,
// with a fast pitch wobble that makes it sound like a chuckle
function voice(destination, start, duration, from, to, wobble) {
    const oscillator = audio.createOscillator();
    const wobbleOsc = audio.createOscillator();
    const wobbleGain = audio.createGain();
    const gain = audio.createGain();

    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(from, start);
    oscillator.frequency.exponentialRampToValueAtTime(to, start + duration);

    wobbleOsc.frequency.value = wobble;
    wobbleGain.gain.value = from * 0.05;
    wobbleOsc.connect(wobbleGain);
    wobbleGain.connect(oscillator.frequency);

    [[800, 5, 1], [1250, 6, 0.7]].forEach((formant) => {
        const filter = audio.createBiquadFilter();
        const level = audio.createGain();

        filter.type = "bandpass";
        filter.frequency.value = formant[0];
        filter.Q.value = formant[1];
        level.gain.value = formant[2];

        oscillator.connect(filter);
        filter.connect(level);
        level.connect(gain);
    });

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(1.6, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    gain.connect(destination);

    noiseBurst(destination, start, 0.05, 2500, 0.15);

    oscillator.start(start);
    wobbleOsc.start(start);
    oscillator.stop(start + duration + 0.02);
    wobbleOsc.stop(start + duration + 0.02);
}

// Each laugh is a list of [delay, length, start pitch, end pitch, wobble speed]
const LAUGHS = {
    // "Hah-hah-hah!"
    short: [
        [0, 0.15, 520, 400, 22],
        [0.2, 0.15, 480, 370, 22],
        [0.4, 0.22, 440, 320, 22]
    ],
    // "Heh-heh-heh-heh!"
    sneaky: [
        [0, 0.12, 620, 500, 26],
        [0.17, 0.12, 600, 480, 26],
        [0.34, 0.12, 580, 460, 26],
        [0.51, 0.2, 540, 380, 26]
    ],
    // "Mwaaa-ha-ha-ha-HAAAA!"
    evil: [
        [0, 0.45, 300, 540, 6],
        [0.55, 0.14, 520, 400, 24],
        [0.75, 0.14, 490, 380, 24],
        [0.95, 0.14, 460, 350, 24],
        [1.15, 0.4, 440, 250, 8]
    ]
};

function laugh(kind) {
    if (!canPlay() || !LAUGHS[kind]) {
        return;
    }

    const destination = bus || audio.destination;
    const now = audio.currentTime + 0.02;

    LAUGHS[kind].forEach((note) => {
        voice(destination, now + note[0], note[1], note[2], note[3], note[4]);
    });
}

/* Taunting playground tune ("nyah nyah nee-nyah nyah") with a bouncy bass */
const TUNE = [
    [392, 1], [392, 1], [330, 1], [392, 1], [440, 2], [392, 1], [330, 1],
    [330, 1], [294, 1], [262, 2], [262, 1], [294, 1], [330, 2]
];
const EIGHTH = 0.25;

function playNote(destination, type, frequency, start, duration, level) {
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(level, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start(start);
    oscillator.stop(start + duration);
}

function startMusic() {
    if (!canPlay()) {
        return;
    }

    bus = audio.createGain();
    bus.gain.value = 0.8;
    bus.connect(audio.destination);

    const begin = audio.currentTime + 0.05;
    const loopLength = 16 * EIGHTH;

    // Schedule 3 loops (12 seconds): longer than the intro; it is faded out when the intro ends
    for (let loop = 0; loop < 3; loop++) {
        const loopStart = begin + loop * loopLength;
        let position = 0;

        TUNE.forEach((note) => {
            playNote(bus, "square", note[0], loopStart + position * EIGHTH, note[1] * EIGHTH * 0.85, 0.05);
            position += note[1];
        });

        for (let beat = 0; beat < 8; beat++) {
            const bassNote = beat % 2 === 0 ? 131 : 98;
            playNote(bus, "triangle", bassNote, loopStart + beat * 0.5, 0.4, 0.16);
        }

        for (let step = 0; step < 16; step++) {
            noiseBurst(bus, loopStart + step * EIGHTH + EIGHTH / 2, 0.04, 6000, 0.03);
        }
    }
}

function stopMusic() {
    if (!bus || !audio) {
        return;
    }

    const fading = bus;
    const now = audio.currentTime;

    bus = null;
    fading.gain.cancelScheduledValues(now);
    fading.gain.setValueAtTime(fading.gain.value, now);
    fading.gain.linearRampToValueAtTime(0, now + 0.5);
    setTimeout(() => fading.disconnect(), 600);
}

const sfx = {
    hit() {
        beep(320, 120, 0.15);
    },
    gold() {
        beep(880, 1320, 0.2, "sine");
        setTimeout(() => beep(1320, 1760, 0.2, "sine"), 90);
    },
    bomb() {
        beep(140, 30, 0.4, "sawtooth", 0.25);
    },
    miss() {
        beep(160, 90, 0.12, "triangle");
    },
    tick() {
        beep(600, 600, 0.1, "sine");
    },
    go() {
        beep(600, 1200, 0.25, "sine");
    },
    over() {
        beep(500, 300, 0.3, "triangle");
        setTimeout(() => beep(300, 150, 0.5, "triangle"), 250);
    }
};

/* ---------- Helpers ---------- */
function getLevel() {
    const checked = document.querySelector('input[name="level"]:checked');
    return checked ? checked.id : "easy";
}

function randomTime(min, max) {
    return Math.round(Math.random() * (max - min) + min);
}

function getMultiplier() {
    return Math.min(4, 1 + Math.floor(state.combo / 5));
}

function bestKey() {
    return "mole-best-" + state.level;
}

function loadBest() {
    try {
        return Number(localStorage.getItem(bestKey())) || 0;
    } catch (error) {
        return 0;
    }
}

function saveBest(value) {
    try {
        localStorage.setItem(bestKey(), value);
    } catch (error) {
        /* storage unavailable: ignore */
    }
}

/* ---------- Animated background ---------- */
function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
}

function createBackground() {
    // Twinkling stars
    for (let i = 0; i < 60; i++) {
        const star = document.createElement("span");

        star.className = "star";
        star.style.left = randomBetween(0, 100) + "%";
        star.style.top = randomBetween(0, 75) + "%";
        star.style.setProperty("--size", randomBetween(1, 3) + "px");
        star.style.setProperty("--duration", randomBetween(2, 5) + "s");
        star.style.setProperty("--delay", randomBetween(0, 5) + "s");
        background.appendChild(star);
    }

    // Fireflies drifting upwards
    for (let i = 0; i < 18; i++) {
        const firefly = document.createElement("span");

        firefly.className = "firefly";
        firefly.style.left = randomBetween(0, 100) + "%";
        firefly.style.setProperty("--size", randomBetween(3, 6) + "px");
        firefly.style.setProperty("--duration", randomBetween(10, 20) + "s");
        firefly.style.setProperty("--delay", randomBetween(0, 15) + "s");
        firefly.style.setProperty("--drift", randomBetween(-60, 60) + "px");
        background.appendChild(firefly);
    }
}

/* ---------- Intro animation ---------- */
const INTRO_STEPS = [
    { hole: 0, text: "Past... over here! 👀", laugh: "short", hold: 1000 },
    { hole: 2, text: "Too slow! 😜", laugh: "sneaky", hold: 1000 },
    { hole: 1, text: "Catch me, if you can! 🔨", laugh: "evil", hold: 1600 }
];

let introDone = false;

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function showSpeech(text) {
    speechEl.textContent = text;
    speechEl.classList.remove("show");
    void speechEl.offsetWidth; // restart the animation
    speechEl.classList.add("show");
}

function finishIntro() {
    if (introDone) {
        return;
    }

    introDone = true;
    stopMusic(); // the music fades out while the splash screen closes
    intro.classList.add("leaving");

    setTimeout(() => {
        intro.remove();
        document.body.classList.remove("intro-active");
        document.body.classList.add("revealed");
    }, 600);
}

async function playIntro() {
    const lastIndex = INTRO_STEPS.length - 1;

    startMusic();

    for (let i = 0; i <= lastIndex; i++) {
        const step = INTRO_STEPS[i];
        const hole = introHoles[step.hole];

        showSpeech(step.text);
        laugh(step.laugh);
        hole.classList.add("up");
        await wait(step.hold);

        if (introDone) {
            return;
        }

        // The last mole stays up and keeps taunting
        if (i < lastIndex) {
            hole.classList.remove("up");
            await wait(450);
        }
    }

    await wait(600);
    finishIntro();
}

// Play the intro with sound right away if the browser allows it,
// otherwise show the "Enter" screen: one click and the sound starts automatically
async function startExperience() {
    ensureAudio();

    if (audio) {
        try {
            await Promise.race([audio.resume(), wait(300)]);
        } catch (error) {
            /* ignore */
        }
    }

    if (audio && audio.state === "running") {
        playIntro();
        return;
    }

    gate.hidden = false;
    gateBtn.focus();
}

async function enterFromGate() {
    gate.hidden = true;
    ensureAudio();

    if (audio) {
        try {
            await audio.resume();
        } catch (error) {
            /* ignore */
        }
    }

    playIntro();
}

/* ---------- Board & HUD ---------- */
function buildBoard() {
    state.level = getLevel();
    state.holes = [];
    state.lastHole = null;

    const rows = LEVELS[state.level].rows;
    board.style.setProperty("--rows", rows);
    board.innerHTML = "";

    for (let i = 0; i < rows * 3; i++) {
        const hole = document.createElement("div");
        const mole = document.createElement("button");

        hole.className = "hole";
        mole.className = "mole";
        mole.type = "button";
        mole.setAttribute("aria-label", "Mole");
        mole.dataset.type = "normal";

        hole.appendChild(mole);
        board.appendChild(hole);
        state.holes.push(hole);
    }

    bestEl.textContent = loadBest();
}

function updateHUD() {
    scoreEl.textContent = state.score;
    comboEl.textContent = "x" + getMultiplier();
    livesEl.textContent = "❤️".repeat(state.lives) + "🖤".repeat(MAX_LIVES - state.lives);
    timeEl.textContent = (state.timeLeft / 1000).toFixed(1);
    barFill.style.width = (state.timeLeft / GAME_TIME) * 100 + "%";
    barFill.classList.toggle("low", state.timeLeft < 5000);
}

function bumpScore() {
    scoreEl.classList.remove("bump");
    void scoreEl.offsetWidth; // restart the animation
    scoreEl.classList.add("bump");
}

function showPopup(x, y, text, className) {
    const popup = document.createElement("span");

    popup.className = "pop " + className;
    popup.textContent = text;
    popup.style.left = x + "px";
    popup.style.top = y + "px";
    board.appendChild(popup);

    // Remove with a timer (animationend never fires if animations are disabled)
    setTimeout(() => popup.remove(), 800);
}

function lowerAllMoles() {
    state.holes.forEach((hole) => hole.classList.remove("up"));
}

/* ---------- Mole loop ---------- */
function randomHole() {
    let hole;

    do {
        hole = state.holes[Math.floor(Math.random() * state.holes.length)];
    } while (hole === state.lastHole && state.holes.length > 1);

    state.lastHole = hole;
    return hole;
}

function peep() {
    if (!state.playing || state.paused) {
        return;
    }

    const settings = LEVELS[state.level];
    // Moles get up to twice as fast as the round goes on
    const speed = 1 - 0.5 * (1 - state.timeLeft / GAME_TIME);
    const time = Math.max(MIN_UP_TIME, randomTime(settings.min, settings.max) * speed);

    const roll = Math.random();
    let type = "normal";
    if (roll < settings.bomb) {
        type = "bomb";
    } else if (roll < settings.bomb + settings.gold) {
        type = "gold";
    }

    const hole = randomHole();
    hole.querySelector(".mole").dataset.type = type;
    hole.classList.add("up");

    state.moleTimer = setTimeout(() => {
        hole.classList.remove("up");
        state.moleTimer = setTimeout(peep, 150);
    }, time);
}

/* ---------- Input ---------- */
function loseLife() {
    state.lives--;
    state.combo = 0;

    if (state.lives <= 0) {
        endGame("Out of lives!");
    }
}

function whack(target, x, y) {
    if (!state.playing || state.paused) {
        return;
    }

    const mole = target.closest(".mole");
    const hole = mole ? mole.parentNode : null;

    // Clicked empty ground (or a mole that is already down)
    if (!hole || !hole.classList.contains("up")) {
        sfx.miss();
        showPopup(x, y, "miss", "bad");
        loseLife();
        updateHUD();
        return;
    }

    const type = mole.dataset.type;

    hole.classList.remove("up");
    mole.classList.add("dizzy");
    setTimeout(() => mole.classList.remove("dizzy"), 400);

    if (type === "bomb") {
        sfx.bomb();
        state.score = Math.max(0, state.score - 3);
        showPopup(x, y, "-3 💥", "bad");
        loseLife();
    } else {
        state.combo++;
        const points = (type === "gold" ? 5 : 1) * getMultiplier();
        state.score += points;

        if (type === "gold") {
            sfx.gold();
        } else {
            sfx.hit();
        }
        showPopup(x, y, "+" + points, type === "gold" ? "gold" : "good");
    }

    bumpScore();
    updateHUD();
}

board.addEventListener("pointerdown", (event) => {
    if (!event.isTrusted) {
        return;
    }

    const rect = board.getBoundingClientRect();
    board.classList.add("smash");
    whack(event.target, event.clientX - rect.left, event.clientY - rect.top);
});

["pointerup", "pointerleave", "pointercancel"].forEach((name) => {
    board.addEventListener(name, () => board.classList.remove("smash"));
});

// Keyboard support (Enter / Space on a focused mole)
board.addEventListener("click", (event) => {
    if (event.detail !== 0 || !event.isTrusted) {
        return;
    }

    const boardRect = board.getBoundingClientRect();
    const targetRect = event.target.getBoundingClientRect();
    const x = targetRect.left - boardRect.left + targetRect.width / 2;
    const y = targetRect.top - boardRect.top + targetRect.height / 2;

    whack(event.target, x, y);
});

/* ---------- Game flow ---------- */
function runClock() {
    clearInterval(state.clock);

    state.clock = setInterval(() => {
        state.timeLeft -= 100;
        updateHUD();

        if (state.timeLeft <= 0) {
            endGame("Time's up!");
        }
    }, 100);
}

function startGame() {
    ensureAudio();

    clearInterval(state.clock);
    clearTimeout(state.moleTimer);
    overlay.hidden = true;
    buildBoard();

    state.score = 0;
    state.combo = 0;
    state.lives = MAX_LIVES;
    state.timeLeft = GAME_TIME;
    state.paused = false;
    state.playing = false;
    updateHUD();

    startBtn.textContent = "Starting...";
    startBtn.disabled = true;
    pauseBtn.disabled = true;
    levelsEl.classList.add("locked");

    let count = 3;

    function countdown() {
        if (count > 0) {
            statusEl.textContent = count + "...";
            sfx.tick();
            count--;
            setTimeout(countdown, 700);
            return;
        }

        statusEl.textContent = "Go go go!";
        sfx.go();
        state.playing = true;
        document.body.classList.add("playing");
        pauseBtn.disabled = false;
        pauseBtn.textContent = "Pause";
        startBtn.textContent = "Running...";
        runClock();
        peep();
    }

    countdown();
}

function togglePause() {
    if (!state.playing) {
        return;
    }

    state.paused = !state.paused;

    if (state.paused) {
        clearInterval(state.clock);
        clearTimeout(state.moleTimer);
        lowerAllMoles();
        pauseBtn.textContent = "Resume";
        statusEl.textContent = "Paused";
    } else {
        pauseBtn.textContent = "Pause";
        statusEl.textContent = "Go go go!";
        runClock();
        peep();
    }
}

function endGame(reason) {
    state.playing = false;
    document.body.classList.remove("playing");
    clearInterval(state.clock);
    clearTimeout(state.moleTimer);
    lowerAllMoles();

    state.timeLeft = Math.max(0, state.timeLeft);
    updateHUD();
    sfx.over();

    const isNewBest = state.score > 0 && state.score > loadBest();
    if (isNewBest) {
        saveBest(state.score);
        bestEl.textContent = state.score;
    }

    const plural = state.score === 1 ? "" : "s";
    const bestText = document.querySelector(".over-best");

    document.querySelector(".over-title").textContent = reason;
    document.querySelector(".over-score").textContent = "You scored " + state.score + " point" + plural + ".";
    bestText.textContent = isNewBest ? "🏆 New high score!" : "Best (" + state.level + "): " + loadBest();
    bestText.className = isNewBest ? "over-best new-best" : "over-best";

    startBtn.textContent = "Play again!";
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    levelsEl.classList.remove("locked");
    statusEl.textContent = "Pick a difficulty and press Play again.";

    overlay.hidden = false;
    againBtn.focus();
}

function closeOverlay() {
    overlay.hidden = true;
    startBtn.focus();
}

/* ---------- Event wiring ---------- */
startBtn.addEventListener("click", startGame);
againBtn.addEventListener("click", startGame);
changeBtn.addEventListener("click", closeOverlay);
pauseBtn.addEventListener("click", togglePause);

overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
        closeOverlay();
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !overlay.hidden) {
        closeOverlay();
    }
});

muteBtn.addEventListener("click", () => {
    state.muted = !state.muted;
    muteBtn.textContent = state.muted ? "🔇" : "🔊";
});

levelsEl.addEventListener("change", () => {
    if (!state.playing) {
        buildBoard();
    }
});

document.addEventListener("visibilitychange", () => {
    if (document.hidden && state.playing && !state.paused) {
        togglePause();
    }
});

skipBtn.addEventListener("click", finishIntro);

gateBtn.addEventListener("click", enterFromGate);

/* ---------- Init ---------- */
document.querySelector(".year").textContent = new Date().getFullYear();
createBackground();
buildBoard();
updateHUD();
startExperience();
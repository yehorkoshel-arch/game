import { LANGS, LOCATION_NAMES, SKINS_BASE } from "../data/gameData.js";
import {
  getLevelNames,
  LEVELS_KYIV,
  LEVELS_LVIV,
} from "../levels/levelFactory.js";
import { loadGameSave, saveGameSave } from "../state/saveState.js";
import { focusApp, setActiveScreen, setText } from "../ui/dom.js";
import {
  cancelSpeech,
  normalizeSpeechText,
  playRecordedVoice,
} from "../audio/tts.js";

function getLevels() {
  return currentLocation === 0 ? LEVELS_KYIV : LEVELS_LVIV;
}

const FINISH_DIST = 800;
const save = loadGameSave();
let lang = "uk",
  totalCoins = save.totalCoins || 0,
  owned = save.owned || ["default"],
  selectedSkin = save.selectedSkin || "default";
let currentLevel = save.currentLevel || 0;
let currentLocation = save.currentLocation || 0; // 0=Київ, 1=Львів
let progressKyiv = save.progressKyiv || 0,
  progressLviv = save.progressLviv || 0; // скільки рівнів пройдено у кожній локації
let settingDiff = save.settingDiff || "normal",
  settingLives = save.settingLives || 3,
  settingDist = save.settingDist || 800,
  settingSound = save.settingSound || false,
  settingVib = save.settingVib || false;
function saveGame() {
  saveGameSave({
    totalCoins,
    owned,
    selectedSkin,
    settingDiff,
    settingLives,
    settingDist,
    settingSound,
    settingVib,
    currentLevel,
    currentLocation,
    progressKyiv,
    progressLviv,
  });
}

// ── MUSIC ENGINE ─────────────────────────────────────────────────────────────
// Melody: "Як тебе не любити, Києве мій" (Як тебе не любити)
// Notes encoded as [semitones from C4, duration in beats]
const MELODY_NOTES = [
  // Phrase 1: Як тебе не лю-би-ти
  [0, 1],
  [2, 1],
  [4, 1],
  [5, 1],
  [7, 2],
  [5, 1],
  [4, 1],
  // Phrase 2: Ки-є-ве мій
  [2, 1],
  [0, 1],
  [2, 1],
  [4, 2],
  [0, 2],
  // Phrase 3: Як тебе не лю-би-ти
  [0, 1],
  [2, 1],
  [4, 1],
  [5, 1],
  [7, 2],
  [9, 1],
  [7, 1],
  // Phrase 4: Віч-ний мій
  [5, 1],
  [4, 1],
  [2, 1],
  [0, 3],
  [0, 1],
  // Phrase 5: Мі-сто кві-ту й ка-ли-ни
  [4, 1],
  [4, 1],
  [5, 1],
  [7, 1],
  [9, 1],
  [7, 1],
  [5, 1],
  [4, 1],
  // Phrase 6: Бать-ків-ський по-ріг
  [2, 1],
  [2, 1],
  [4, 1],
  [5, 1],
  [7, 2],
  [5, 1],
  // Phrase 7: Ук-ра-ї-но-ро-ди-но
  [7, 1],
  [9, 1],
  [7, 1],
  [5, 1],
  [4, 1],
  [2, 1],
  [0, 1],
  [2, 1],
  // Phrase 8: Ки-їв — мій при-віт
  [4, 1],
  [5, 1],
  [7, 1],
  [9, 1],
  [7, 4],
];
// Bass/chord root notes (one per bar roughly): simple alternating I-V
const BASS_PATTERN = [0, 7, 0, 5, 0, 7, 0, 5, 0, 4, 0, 5, 0, 7, 0, 5];

let audioCtx = null,
  musicPlaying = false;
let musicNodes = []; // keep refs to stop them
let melodyIdx = 0,
  bassIdx = 0;
let nextNoteTime = 0,
  scheduleAhead = 0.08,
  schedulerTimer = null;
const CHORD_PATTERN = [0, 5, 7, 4, 0, 9, 5, 7];
let drumStep = 0,
  chordIdx = 0;
const BPM = 126;
const BEAT = 60 / BPM;

// Lyric display
let lyricIdx = 0,
  lyricTimer = null;
const LYRIC_DIV = (() => {
  const d = document.createElement("div");
  d.id = "lyricBanner";
  d.style.cssText =
    "position:absolute;bottom:50px;left:0;right:0;text-align:center;pointer-events:none;font-size:15px;color:#ffd700;text-shadow:0 1px 6px #000,0 0 20px rgba(255,215,0,0.4);opacity:0;transition:opacity 0.5s;font-style:italic;letter-spacing:0.5px;padding:0 20px";
  document.getElementById("app").appendChild(d);
  return d;
})();

function noteToHz(semitone) {
  // C4 = 261.63 Hz, semitone offset from C4
  return 261.63 * Math.pow(2, semitone / 12);
}

function playNote(
  freq,
  startTime,
  duration,
  type = "sine",
  gain = 0.18,
  detune = 0,
) {
  if (!audioCtx) return null;
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  if (detune) osc.detune.setValueAtTime(detune, startTime);
  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.02);
  gainNode.gain.setValueAtTime(gain, startTime + duration * 0.75);
  gainNode.gain.linearRampToValueAtTime(0, startTime + duration - 0.01);
  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration);
  musicNodes.push(osc);
  return osc;
}
function playNoise(
  startTime,
  duration,
  gain = 0.08,
  filterFreq = 900,
  type = "bandpass",
) {
  if (!audioCtx) return;
  const len = Math.max(1, Math.floor(audioCtx.sampleRate * duration));
  const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++)
    d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
  const src = audioCtx.createBufferSource(),
    g = audioCtx.createGain(),
    f = audioCtx.createBiquadFilter();
  f.type = type;
  f.frequency.value = filterFreq;
  f.Q.value = 1.2;
  g.gain.setValueAtTime(gain, startTime);
  g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  src.connect(f);
  f.connect(g);
  g.connect(audioCtx.destination);
  src.start(startTime);
  src.stop(startTime + duration);
  musicNodes.push(src);
}
function scheduleDrums(barStart) {
  const stepDur = BEAT / 2;
  for (let s = 0; s < 4; s++) {
    const t = barStart + s * stepDur;
    if ((drumStep + s) % 4 === 0) {
      playNote(55, t, 0.12, "sine", 0.16);
      playNoise(t, 0.08, 0.05, 150, "lowpass");
    }
    if ((drumStep + s) % 4 === 2) playNoise(t, 0.1, 0.07, 420, "bandpass");
    playNoise(t, 0.035, s % 2 ? 0.025 : 0.04, 5200, "highpass");
  }
  drumStep = (drumStep + 4) % 16;
}
function scheduleChord(root, startTime, dur) {
  const notes = [root, root + 4, root + 7, root + 12];
  notes.forEach((semi, i) => {
    const t = startTime + i * (dur / 5);
    playNote(noteToHz(semi), t, dur * 0.55, "sawtooth", 0.035, -8 + i * 5);
  });
  playNote(noteToHz(root + 7), startTime, dur, "triangle", 0.035, 6);
}

function scheduleMusic() {
  if (!musicPlaying || !audioCtx) return;
  while (nextNoteTime < audioCtx.currentTime + scheduleAhead) {
    const [semi, beats] = MELODY_NOTES[melodyIdx % MELODY_NOTES.length];
    const dur = beats * BEAT;
    const freq = noteToHz(semi);
    const accent = melodyIdx % 4 === 0 ? 1.15 : 1;
    playNote(freq, nextNoteTime, dur * 0.94, "triangle", 0.18 * accent);
    playNote(
      noteToHz(semi + 12),
      nextNoteTime + dur * 0.04,
      dur * 0.45,
      "sine",
      0.035,
    );
    playNote(noteToHz(semi + 4), nextNoteTime, dur * 0.8, "sine", 0.055);

    if (melodyIdx % 2 === 0) {
      const bassSemi = BASS_PATTERN[bassIdx % BASS_PATTERN.length] - 12;
      playNote(noteToHz(bassSemi), nextNoteTime, dur * 1.65, "triangle", 0.13);
      playNote(
        noteToHz(bassSemi + 12),
        nextNoteTime + dur * 0.48,
        dur * 0.35,
        "square",
        0.035,
      );
      bassIdx++;
    }
    if (melodyIdx % 4 === 0) {
      const root = CHORD_PATTERN[chordIdx % CHORD_PATTERN.length];
      scheduleChord(root, nextNoteTime, dur * 2.2);
      scheduleDrums(nextNoteTime);
      chordIdx++;
    }

    nextNoteTime += dur;
    melodyIdx++;
    // Loop
    if (melodyIdx >= MELODY_NOTES.length) melodyIdx = 0;
  }
  schedulerTimer = setTimeout(scheduleMusic, 25);
}

// Запуск музичного супроводу
function startMusic() {
  if (musicPlaying) return;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      return;
    }
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  musicPlaying = true;
  melodyIdx = 0;
  bassIdx = 0;
  drumStep = 0;
  chordIdx = 0;
  nextNoteTime = audioCtx.currentTime + 0.1;
  scheduleMusic();
  startLyrics();
}

function stopMusic() {
  musicPlaying = false;
  if (schedulerTimer) {
    clearTimeout(schedulerTimer);
    schedulerTimer = null;
  }
  musicNodes.forEach((n) => {
    try {
      n.stop();
    } catch (e) {}
  });
  musicNodes = [];
  stopLyrics();
}

function startLyrics() {
  lyricIdx = 0;
  showLyric();
}
function stopLyrics() {
  if (lyricTimer) {
    clearTimeout(lyricTimer);
    lyricTimer = null;
  }
  LYRIC_DIV.style.opacity = "0";
}
function showLyric() {
  if (!musicPlaying) return;
  const lines = t().lyrics || [];
  if (!lines.length) return;
  const line = lines[lyricIdx % lines.length];
  LYRIC_DIV.textContent = line;
  LYRIC_DIV.style.opacity = "1";
  lyricTimer = setTimeout(() => {
    LYRIC_DIV.style.opacity = "0";
    lyricIdx++;
    lyricTimer = setTimeout(showLyric, 600);
  }, 2600);
}
// ─────────────────────────────────────────────────────────────────────────────

// ── SOUND EFFECTS ────────────────────────────────────────────────────────────
function getSfxCtx() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      return null;
    }
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}
function sfxJump() {
  const c = getSfxCtx();
  if (!c) return;
  const now = c.currentTime;
  const osc = c.createOscillator(),
    g = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(300, now);
  osc.frequency.exponentialRampToValueAtTime(660, now + 0.13);
  g.gain.setValueAtTime(0.22, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(now);
  osc.stop(now + 0.18);
}
function sfxLand() {
  const c = getSfxCtx();
  if (!c) return;
  const now = c.currentTime;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * 0.07), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++)
    d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3) * 0.6;
  const src = c.createBufferSource(),
    g = c.createGain();
  const filt = c.createBiquadFilter();
  filt.type = "lowpass";
  filt.frequency.value = 380;
  src.buffer = buf;
  src.connect(filt);
  filt.connect(g);
  g.connect(c.destination);
  g.gain.setValueAtTime(0.38, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
  src.start(now);
}
function sfxStep(dir) {
  // dir: -1=ліво, 1=право
  const c = getSfxCtx();
  if (!c) return;
  const now = c.currentTime;
  const osc = c.createOscillator(),
    g = c.createGain();
  osc.type = "sine";
  // ліво — низхідний, право — висхідний
  const f1 = dir < 0 ? 320 : 220,
    f2 = dir < 0 ? 180 : 380;
  osc.frequency.setValueAtTime(f1, now);
  osc.frequency.exponentialRampToValueAtTime(f2, now + 0.08);
  g.gain.setValueAtTime(0.14, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(now);
  osc.stop(now + 0.1);
  // короткий шелест (слайд по доріжці)
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * 0.05), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++)
    d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2) * 0.3;
  const src = c.createBufferSource(),
    g2 = c.createGain();
  const filt = c.createBiquadFilter();
  filt.type = "bandpass";
  filt.frequency.value = 600;
  filt.Q.value = 1;
  src.buffer = buf;
  src.connect(filt);
  filt.connect(g2);
  g2.connect(c.destination);
  g2.gain.setValueAtTime(0.12, now);
  g2.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
  src.start(now);
}
function sfxShot() {
  // звук пострілу ТЦК
  const c = getSfxCtx();
  if (!c) return;
  const now = c.currentTime;
  // хлопок
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * 0.08), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++)
    d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 0.8) * 0.9;
  const src = c.createBufferSource(),
    g = c.createGain();
  const filt = c.createBiquadFilter();
  filt.type = "bandpass";
  filt.frequency.value = 900;
  filt.Q.value = 0.5;
  src.buffer = buf;
  src.connect(filt);
  filt.connect(g);
  g.connect(c.destination);
  g.gain.setValueAtTime(0.6, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  src.start(now);
  // свист кулі
  const osc = c.createOscillator(),
    g2 = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(1800, now + 0.03);
  osc.frequency.exponentialRampToValueAtTime(600, now + 0.18);
  g2.gain.setValueAtTime(0.08, now + 0.03);
  g2.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  osc.connect(g2);
  g2.connect(c.destination);
  osc.start(now + 0.03);
  osc.stop(now + 0.18);
}
function sfxMachineGunBurst() {
  [0, 0.055, 0.11].forEach((delay) => setTimeout(sfxShot, delay * 1000));
}
function sfxCoin() {
  const c = getSfxCtx();
  if (!c) return;
  const now = c.currentTime;
  [0, 0.08].forEach((delay, i) => {
    const osc = c.createOscillator(),
      g = c.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(i === 0 ? 900 : 1350, now + delay);
    g.gain.setValueAtTime(0.16, now + delay);
    g.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.14);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(now + delay);
    osc.stop(now + delay + 0.14);
  });
}
function sfxHit() {
  const c = getSfxCtx();
  if (!c) return;
  const now = c.currentTime;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * 0.2), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++)
    d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 1.4) * 0.8;
  const src = c.createBufferSource(),
    g = c.createGain();
  const filt = c.createBiquadFilter();
  filt.type = "bandpass";
  filt.frequency.value = 200;
  filt.Q.value = 0.8;
  src.buffer = buf;
  src.connect(filt);
  filt.connect(g);
  g.connect(c.destination);
  g.gain.setValueAtTime(0.55, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
  src.start(now);
}
function sfxWin() {
  const c = getSfxCtx();
  if (!c) return;
  const now = c.currentTime;
  // Урочистий фанфар: C-E-G-C-E (висхідний)
  const fanfare = [
    [523, 0],
    [659, 0.15],
    [784, 0.3],
    [1047, 0.48],
    [1319, 0.68],
  ];
  fanfare.forEach(([freq, delay]) => {
    const osc = c.createOscillator(),
      g = c.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, now + delay);
    g.gain.setValueAtTime(0, now + delay);
    g.gain.linearRampToValueAtTime(0.22, now + delay + 0.04);
    g.gain.setValueAtTime(0.22, now + delay + 0.18);
    g.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.38);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(now + delay);
    osc.stop(now + delay + 0.4);
  });
  // Тремтячий акорд в кінці
  [523, 659, 784].forEach((freq, i) => {
    const osc = c.createOscillator(),
      g = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now + 1.0);
    g.gain.setValueAtTime(0.12, now + 1.0);
    g.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(now + 1.0);
    osc.stop(now + 1.8);
  });
}

function sfxGameOver() {
  const c = getSfxCtx();
  if (!c) return;
  const now = c.currentTime;
  // Низхідний сумний акорд: G-Eb-C (мінор вниз)
  const sad = [
    [392, 0],
    [311, 0.22],
    [261, 0.46],
  ];
  sad.forEach(([freq, delay]) => {
    const osc = c.createOscillator(),
      g = c.createGain();
    osc.type = "sawtooth";
    const filt = c.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.value = 800;
    osc.frequency.setValueAtTime(freq, now + delay);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.85, now + delay + 0.35);
    g.gain.setValueAtTime(0.18, now + delay);
    g.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.55);
    osc.connect(filt);
    filt.connect(g);
    g.connect(c.destination);
    osc.start(now + delay);
    osc.stop(now + delay + 0.6);
  });
  // Фінальний низький гул
  const osc2 = c.createOscillator(),
    g2 = c.createGain();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(130, now + 0.9);
  osc2.frequency.exponentialRampToValueAtTime(80, now + 1.4);
  g2.gain.setValueAtTime(0.2, now + 0.9);
  g2.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
  osc2.connect(g2);
  g2.connect(c.destination);
  osc2.start(now + 0.9);
  osc2.stop(now + 1.4);
}
// ─────────────────────────────────────────────────────────────────────────────

let gameState = "idle",
  score = 0,
  runCoins = 0,
  lives = 3,
  spd = 2.8,
  fr = 0,
  totalDist = 0;
let pLane = 1,
  pY = 270,
  pVY = 0,
  pSlide = false,
  slideT = 0,
  inv = 0,
  flash = 0;
let obs = [],
  coins = [],
  parts = [],
  confetti = [],
  bullets = [],
  playerBullets = [];
let bgOff = 0,
  chaserX = -100,
  raf = null;
let fireCooldown = 0;
const LEVEL_CLEAR_INPUT_DELAY = 150;
const LEVEL_CLEAR_AUTO_DELAY = 360;
const LEVEL_START_SPEED_CAP = 2.54;
let finishX = 9999,
  finishActive = false,
  winTimer = 0,
  levelClearTimer = 0;
let tckSceneSeenLevels = {},
  tckScene = null;
const W = 680,
  H = 420,
  GND = 270,
  LANES = [150, 340, 530];

function getAndriiWeapon(level = currentLevel, location = currentLocation) {
  const levelIndex = Number(level);
  const locationIndex = Number(location);
  if (levelIndex >= 2) return "minigun";
  return locationIndex === 1 ? "machinegun" : null;
}

function t() {
  return LANGS[lang];
}
window.addEventListener("load", () => setTimeout(focusApp, 100));
function unlockGameAudio() {
  const c = getSfxCtx();
  if (c && c.state === "suspended") c.resume().catch(() => {});
}
document.getElementById("app").addEventListener("pointerdown", () => {
  focusApp();
  unlockGameAudio();
  beginIntroAfterGesture();
});
function buildLevelBar() {
  const bar = document.getElementById("lvlBar");
  bar.innerHTML = "";
  const lvNames = getLevelNames(currentLocation, lang);
  const progress = currentLocation === 0 ? progressKyiv : progressLviv;
  const levels = getLevels();
  levels.forEach((lv, i) => {
    const btn = document.createElement("button");
    const done = i < progress;
    const isCur = i === progress;
    const locked = i > progress;
    btn.className = "lvl-btn" + (done ? " done" : isCur ? " current" : "");
    if (!locked) btn.classList.add("unlocked");
    btn.innerHTML = `<span>${done ? "✓" : locked ? "🔒" : i + 1}</span><span class="lvl-btn-name">${(lvNames[i] || "").slice(0, 5)}</span>`;
    if (!locked) {
      btn.onclick = () => {
        currentLevel = i;
        saveGame();
        showScreen("sGame");
        startLevel();
      };
    }
    bar.appendChild(btn);
  });
  // update tab active state
  document
    .querySelectorAll(".loc-tab")
    .forEach((b) =>
      b.classList.toggle("active", Number(b.dataset.loc) === currentLocation),
    );
  // update loc tab labels with language
  const locNames = LOCATION_NAMES[lang] || LOCATION_NAMES.uk;
  document
    .querySelectorAll(".loc-tab")
    .forEach((b, i) => (b.textContent = locNames[i]));
}

function applyLang() {
  const L = t();
  document.getElementById("menuSub").textContent = L.sub;
  document.getElementById("btnPlay").textContent = L.play;
  document.getElementById("btnShopOpen").textContent = L.shop;
  document.getElementById("menuCoinsLabel").textContent = L.coins;
  document.getElementById("shopTitle").textContent = L.shopTitle;
  document.getElementById("btnBackShop").textContent = L.back;
  document.getElementById("btnBackSettings").textContent = L.back;
  document.getElementById("hudPts").textContent = L.pts;
  document.getElementById("cLeft").textContent = L.left;
  document.getElementById("cJump").textContent = L.jump;
  document.getElementById("cSlide").textContent = L.slide;
  document.getElementById("cRight").textContent = L.right;
  const weapon = getAndriiWeapon(currentLevel, currentLocation);
  document.getElementById("cMenu").textContent = L.menu;
  document.getElementById("cFire").textContent =
    weapon === "minigun" ? "\u041c\u0456\u043d\u0456\u0433\u0430\u043d" : weapon ? "\u0412\u043e\u0433\u043e\u043d\u044c" : L.menu;
  document.getElementById("cFire").style.display = weapon ? "" : "none";
  document
    .querySelectorAll(".lbtn")
    .forEach((b) => b.classList.toggle("active", b.dataset.lang === lang));
  buildLevelBar();
  buildShop();
  buildSettings();
}

function buildSettings() {
  const L = t();
  document.getElementById("settingsTitle").textContent = L.settingsTitle;
  document.getElementById("sLblDiff").textContent = L.lblDiff;
  document.getElementById("sDescDiff").textContent = L.descDiff;
  document.getElementById("sLblLives").textContent = L.lblLives;
  document.getElementById("sDescLives").textContent = L.descLives;
  document.getElementById("sLblDist").textContent = L.lblDist;
  document.getElementById("sDescDist").textContent = L.descDist;
  document.getElementById("sLblSound").textContent = L.lblSound;
  document.getElementById("sDescSound").textContent = L.descSound;
  document.getElementById("sLblVib").textContent = L.lblVib;
  document.getElementById("sDescVib").textContent = L.descVib;

  // Difficulty labels
  const diffLabels = [L.diffEasy, L.diffNorm, L.diffHard];
  document.querySelectorAll("#segDiff .seg-btn").forEach((b, i) => {
    b.textContent = diffLabels[i];
    b.classList.toggle("active", b.dataset.val === settingDiff);
  });
  document.querySelectorAll("#segLives .seg-btn").forEach((b) => {
    b.classList.toggle("active", Number(b.dataset.val) === settingLives);
  });
  document.querySelectorAll("#segDist .seg-btn").forEach((b) => {
    b.classList.toggle("active", Number(b.dataset.val) === settingDist);
  });

  const ts = document.getElementById("togSound");
  ts.className = "tog " + (settingSound ? "on" : "off");
  const tv = document.getElementById("togVib");
  tv.className = "tog " + (settingVib ? "on" : "off");
}
document.querySelectorAll(".lbtn").forEach((b) => {
  b.onclick = () => {
    lang = b.dataset.lang;
    applyLang();
    if (musicPlaying) {
      stopLyrics();
      startLyrics();
    }
  };
});

function showScreen(id) {
  setActiveScreen(id);
  if (settingSound) {
    if (id === "sMenu" || id === "sGame") {
      startMusic();
    } else {
      stopMusic();
    }
  }
}
function syncCoins() {
  setText("menuCoins", totalCoins);
  setText("shopCoins", totalCoins);
}

function drawSkinPreview(canvas, sk) {
  const c = canvas.getContext("2d");
  const w = 52,
    h = 62;
  c.clearRect(0, 0, w, h);
  const cx = w / 2,
    by = h - 4; // base y (feet)

  // legs
  c.fillStyle = sk.shoes || "#111";
  c.fillRect(cx - 10, by - 14, 8, 14);
  c.fillRect(cx + 2, by - 14, 8, 14);

  // shorts
  c.fillStyle = sk.shorts || "#222";
  c.fillRect(cx - 12, by - 24, 24, 12);

  // shirt / body
  c.fillStyle = sk.shirt;
  c.beginPath();
  if (c.roundRect) {
    c.roundRect(cx - 13, by - 46, 26, 24, 4);
  } else {
    c.rect(cx - 13, by - 46, 26, 24);
  }
  c.fill();

  // scarf / belt accent
  if (sk.scarf) {
    c.fillStyle = sk.scarf;
    c.fillRect(cx - 13, by - 24, 26, 5);
  }

  // arms
  c.strokeStyle = sk.skin;
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(cx - 10, by - 40);
  c.lineTo(cx - 16, by - 28);
  c.moveTo(cx + 10, by - 40);
  c.lineTo(cx + 16, by - 28);
  c.stroke();

  // head
  c.fillStyle = sk.mask || sk.skin;
  c.beginPath();
  c.arc(cx, by - 57, 12, 0, Math.PI * 2);
  c.fill();

  // hair / hat
  if (sk.id === "ninja") {
    // head wrap
    c.fillStyle = "#111";
    c.beginPath();
    c.arc(cx, by - 60, 12, Math.PI, 0);
    c.fill();
    // eyes slit
    c.fillStyle = "#ff3300";
    c.fillRect(cx - 7, by - 60, 14, 3);
  } else if (sk.id === "cossack") {
    // оселедець (mohawk)
    c.fillStyle = sk.hair || "#8b4513";
    c.beginPath();
    c.arc(cx, by - 68, 5, 0, Math.PI * 2);
    c.fill();
    c.fillRect(cx - 3, by - 75, 6, 10);
    // вуса
    c.fillStyle = "#5d3a1a";
    c.fillRect(cx - 8, by - 54, 7, 2);
    c.fillRect(cx + 1, by - 54, 7, 2);
    // шапка (смужка)
    c.fillStyle = sk.hat || "#111";
    c.fillRect(cx - 12, by - 68, 24, 5);
  } else {
    // blond hair
    c.fillStyle = sk.hair || "#e8c45c";
    c.beginPath();
    c.arc(cx, by - 61, 12, Math.PI, 0);
    c.fill();
  }

  // backpack strap for default
  if (sk.id === "default") {
    c.strokeStyle = "rgba(0,0,0,0.5)";
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(cx - 8, by - 44);
    c.lineTo(cx + 10, by - 26);
    c.stroke();
  }
}
function buildShop() {
  const L = t(),
    grid = document.getElementById("shopGrid");
  grid.innerHTML = "";
  SKINS_BASE.forEach((sk, i) => {
    const div = document.createElement("div");
    div.className =
      "sitem" +
      (owned.includes(sk.id) ? " owned" : "") +
      (selectedSkin === sk.id ? " selected" : "");
    const cv2 = document.createElement("canvas");
    cv2.width = 52;
    cv2.height = 62;
    drawSkinPreview(cv2, sk);
    const nm = document.createElement("div");
    nm.className = "sitem-name";
    nm.textContent = L.skins[i] ? L.skins[i].name : sk.id;
    const pr = document.createElement("div");
    if (selectedSkin === sk.id) {
      pr.className = "sitem-owned";
      pr.textContent = L.owned;
    } else if (owned.includes(sk.id)) {
      pr.className = "sitem-owned";
      pr.textContent = L.equip;
    } else {
      pr.className = "sitem-price";
      pr.textContent = sk.price + "₴";
    }
    div.appendChild(cv2);
    div.appendChild(nm);
    div.appendChild(pr);
    div.onclick = () => {
      if (owned.includes(sk.id)) {
        selectedSkin = sk.id;
        buildShop();
      } else if (totalCoins >= sk.price) {
        totalCoins -= sk.price;
        owned.push(sk.id);
        selectedSkin = sk.id;
        syncCoins();
        saveGame();
        buildShop();
      }
    };
    grid.appendChild(div);
  });
}

document.getElementById("btnPlay").onclick = () => {
  focusApp();
  // Продовжити з останнього збереженого рівня
  currentLevel = currentLocation === 0 ? progressKyiv : progressLviv;
  showScreen("sGame");
  startLevel();
};
document.querySelectorAll(".loc-tab").forEach((b) => {
  b.onclick = () => {
    currentLocation = Number(b.dataset.loc);
    currentLevel = currentLocation === 0 ? progressKyiv : progressLviv;
    saveGame();
    applyLang();
  };
});
document.getElementById("btnShopOpen").onclick = () => {
  buildShop();
  syncCoins();
  showScreen("sShop");
};
document.getElementById("btnBackShop").onclick = () => {
  showScreen("sMenu");
  syncCoins();
  saveGame();
};
document.getElementById("btnSettingsOpen").onclick = () => {
  buildSettings();
  showScreen("sSettings");
};
document.getElementById("btnBackSettings").onclick = () => {
  saveGame();
  showScreen("sMenu");
};
document.getElementById("cMenu").onclick = () => {
  stopGame();
  showScreen("sMenu");
  syncCoins();
  saveGame();
  buildLevelBar();
};

// Settings controls
document.querySelectorAll("#segDiff .seg-btn").forEach((b) => {
  b.onclick = () => {
    settingDiff = b.dataset.val;
    buildSettings();
  };
});
document.querySelectorAll("#segLives .seg-btn").forEach((b) => {
  b.onclick = () => {
    settingLives = Number(b.dataset.val);
    buildSettings();
  };
});
document.querySelectorAll("#segDist .seg-btn").forEach((b) => {
  b.onclick = () => {
    settingDist = Number(b.dataset.val);
    buildSettings();
  };
});
document.getElementById("togSound").onclick = () => {
  settingSound = !settingSound;
  if (settingSound) startMusic();
  else stopMusic();
  buildSettings();
};
document.getElementById("togVib").onclick = () => {
  settingVib = !settingVib;
  buildSettings();
};
document.getElementById("cLeft").onclick = () => act("ArrowLeft");
document.getElementById("cRight").onclick = () => act("ArrowRight");
document.getElementById("cJump").onclick = () => act("ArrowUp");
document.getElementById("cSlide").onclick = () => act("ArrowDown");
document.getElementById("cFire").onclick = () => fireAndriiWeapon();

const keys = {};
document.addEventListener("keydown", (e) => {
  if (
    ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "KeyF"].includes(
      e.code,
    )
  )
    e.preventDefault();
  if (!keys[e.code]) {
    keys[e.code] = true;
    act(e.code);
  }
});
document.addEventListener("keyup", (e) => {
  keys[e.code] = false;
});
function act(c) {
  if (gameState === "story") return;
  if (gameState === "over") {
    restartLevel();
    return;
  }
  if (gameState === "win") {
    showScreen("sMenu");
    syncCoins();
    buildLevelBar();
    return;
  }
  if (gameState === "levelClear") {
    if (levelClearTimer > LEVEL_CLEAR_INPUT_DELAY) {
      nextLevel();
      return;
    }
    return;
  }
  if (gameState !== "run") return;
  if ((c === "ArrowUp" || c === "Space") && pY >= GND - 2) {
    pVY = -16;
    sfxJump();
  }
  if (c === "ArrowDown") {
    pSlide = true;
    slideT = 44;
  }
  if (c === "ArrowLeft" && pLane > 0) {
    pLane--;
    sfxStep(-1);
  }
  if (c === "ArrowRight" && pLane < 2) {
    pLane++;
    sfxStep(1);
  }
  if (c === "KeyF") fireAndriiWeapon();
}

function fireAndriiWeapon() {
  const weapon = getAndriiWeapon(currentLevel, currentLocation);
  if (gameState !== "run" || !weapon || fireCooldown > 0) return;
  pSlide = true;
  slideT = Math.max(slideT, 18);
  const x = LANES[pLane] + 24;
  const y = pSlide ? pY - 12 : pY - 34;
  if (weapon === "minigun") {
    fireCooldown = 12;
    for (let i = 0; i < 9; i++) {
      playerBullets.push({
        x: x + i * 8,
        y: y - 4 + (i % 3) * 3,
        lane: i % 3,
        vx: 13.5 + i * 0.7,
        life: 50,
        type: "minigun",
      });
    }
    sfxMachineGunBurst();
    setTimeout(sfxShot, 170);
    return;
  }

  fireCooldown = 16;
  for (let i = 0; i < 3; i++) {
    playerBullets.push({
      x: x + i * 12,
      y: y - i * 2,
      lane: pLane,
      vx: 11 + i * 0.9,
      life: 46,
      type: "machinegun",
    });
  }
  sfxMachineGunBurst();
}

function nextLevel() {
  currentLevel++;
  // зберігаємо прогрес для поточної локації
  if (currentLocation === 0)
    progressKyiv = Math.max(progressKyiv, currentLevel);
  else progressLviv = Math.max(progressLviv, currentLevel);
  saveGame();
  if (currentLevel >= getLevels().length) {
    gameState = "win";
    sfxWin();
    speakAndriiForce(ANDRII_WIN);
    const bonus = 300;
    runCoins += bonus;
    totalCoins += runCoins;
    syncCoins();
    saveGame();
    hudUp();
    winTimer = 0;
    return;
  }
  buildLevelBar();
  startLevel();
}

function getLvl() {
  return getLevels()[Math.min(currentLevel, getLevels().length - 1)];
}

function startLevel() {
  focusApp();
  const tckSceneKey = currentLocation + ":" + currentLevel;
  if (currentLocation === 1 && currentLevel === 1 && !tckSceneSeenLevels[tckSceneKey]) {
    beginTckScene(tckSceneKey);
    return;
  }
  const lv = getLvl();
  score = 0;
  runCoins = 0;
  lives = settingLives;
  spd = Math.min(lv.baseSpd, LEVEL_START_SPEED_CAP);
  fr = 0;
  totalDist = 0;
  pLane = 1;
  pY = GND;
  pVY = 0;
  pSlide = false;
  slideT = 0;
  obs = [];
  coins = [];
  parts = [];
  confetti = [];
  bullets = [];
  playerBullets = [];
  fireCooldown = 0;
  bgOff = 0;
  chaserX = -100;
  inv = 0;
  flash = 0;
  finishX = 9999;
  finishActive = false;
  winTimer = 0;
  levelClearTimer = 0;
  andriiFirstObs = false;
  andriiCooldown = 0;
  bubbleText = "";
  bubbleTimer = 0;
  gameState = "run";
  hudUp();
  if (raf) cancelAnimationFrame(raf);
  loop();
  // Андрій кричить на старті з затримкою
  setTimeout(() => speakAndrii(ANDRII_START), 800);
}

function restartLevel() {
  startLevel();
}

function startGame() {
  // використовується тільки якщо треба явно почати з рівня 1
  currentLevel = currentLocation === 0 ? progressKyiv : progressLviv;
  startLevel();
}
function stopGame() {
  gameState = "stopped";
  tckScene = null;
  if (raf) {
    cancelAnimationFrame(raf);
    raf = null;
  }
}
function hudUp() {
  document.getElementById("hLives").textContent = lives;
  document.getElementById("hScore").textContent = score;
  document.getElementById("hCoins").textContent = runCoins;
  document.getElementById("hudPts").textContent = t().pts;
  const lv = getLvl();
  const rem = Math.max(0, Math.round(lv.dist - totalDist));
  document.getElementById("hDist").textContent =
    rem > 0 ? rem + " " + t().dist : "";
  const lvNames = getLevelNames(currentLocation, lang);
  const locNames = LOCATION_NAMES[lang] || LOCATION_NAMES.uk;
  document.getElementById("hudLevel").textContent =
    (t().levelLabel || "Level") +
    " " +
    (currentLevel + 1) +
    " · " +
    (locNames[currentLocation] || "") +
    " · " +
    (lvNames[currentLevel] || "");
}

const cv = document.getElementById("gc"),
  ctx = cv.getContext("2d");

function spawnObs() {
  const lv = getLvl();
  const types = lv.obsTypes;
  obs.push({
    x: W + 30,
    lane: Math.floor(Math.random() * 3),
    type: types[Math.floor(Math.random() * types.length)],
  });
}
function spawnCoin() {
  const l = Math.floor(Math.random() * 3),
    hi = Math.random() < 0.35;
  coins.push({ x: W + 20, lane: l, y: hi ? GND - 70 : GND, done: false });
}
function addParts(x, y, col) {
  for (let i = 0; i < 7; i++)
    parts.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 5,
      vy: -Math.random() * 6 - 2,
      life: 36,
      col,
    });
}
function drawBullets() {
  bullets.forEach((b) => {
    const alpha = Math.min(1, b.life / 15);
    // траса (слід)
    ctx.globalAlpha = alpha * 0.35;
    ctx.fillStyle = "#ff8800";
    ctx.fillRect(b.x + 5, b.y - 2, 18, 4);
    // куля
    ctx.globalAlpha = alpha;
    const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 5);
    g.addColorStop(0, "#ffee88");
    g.addColorStop(1, "rgba(255,140,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffcc00";
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });
  playerBullets.forEach((b) => {
    const alpha = Math.min(1, b.life / 12);
    ctx.globalAlpha = alpha * 0.35;
    ctx.fillStyle = "#3aa7ff";
    ctx.fillRect(b.x - 20, b.y - 2, 22, 4);
    ctx.globalAlpha = alpha;
    const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 6);
    g.addColorStop(0, "#fff6a0");
    g.addColorStop(0.55, "#ffd700");
    g.addColorStop(1, "rgba(0,120,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}

function addConfetti() {
  const cols = [
    "#ffd700",
    "#ff6b6b",
    "#6bcb77",
    "#00e5ff",
    "#ff69b4",
    "#ffffff",
  ];
  for (let i = 0; i < 60; i++)
    confetti.push({
      x: Math.random() * W,
      y: -10 - Math.random() * 80,
      vx: (Math.random() - 0.5) * 3,
      vy: 2 + Math.random() * 3,
      col: cols[Math.floor(Math.random() * cols.length)],
      size: 4 + Math.random() * 6,
      life: 140,
      rot: Math.random() * Math.PI * 2,
      rv: (Math.random() - 0.5) * 0.2,
    });
}

function drawBG() {
  const lv = getLvl();
  ctx.fillStyle = lv.sky;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = lv.road;
  ctx.fillRect(0, GND - 10, W, H - GND + 10);

  const off = (bgOff * 0.25) % 400;
  for (let bx = -400; bx < W + 400; bx += 400) {
    const x = bx - off;
    ctx.fillStyle = lv.bldA;
    ctx.fillRect(x, 80, 100, H - 130);
    ctx.fillStyle = lv.bldB;
    ctx.fillRect(x + 120, 110, 70, H - 160);
    ctx.fillStyle = lv.bldC;
    ctx.fillRect(x + 210, 60, 50, H - 110);
  }

  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = "#1a2030";
    ctx.fillRect(LANES[i] - 42, GND - 4, 84, H - GND + 4);
  }

  ctx.fillStyle = "#22304a";
  ctx.fillRect(0, GND - 5, W, 10);
}

function drawFinishLine() {
  if (!finishActive) return;
  const fx = finishX;
  ctx.fillStyle = "#fff";
  ctx.fillRect(fx - 3, GND - 120, 6, 120);
  ctx.fillStyle = "#fff";
  ctx.fillRect(fx + 97, GND - 120, 6, 120);
  const sq = 12;
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 9; col++) {
      ctx.fillStyle = (row + col) % 2 === 0 ? "#fff" : "#000";
      ctx.fillRect(fx - 3 + col * sq, GND - 120 + row * sq, sq, sq);
    }
  }
  const ribbonY = GND - 122;
  ctx.fillStyle = "#ff0044";
  ctx.fillRect(fx - 3, ribbonY, 106, 8);
  const wave = Math.sin(fr * 0.08) * 4;
  ctx.fillStyle = "#ffd700";
  ctx.font = "bold 13px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("FINISH", fx + 48, GND - 128 + wave);
  ctx.textAlign = "left";
  const flagColors = ["#ffd700", "#0057b7"];
  for (let fi = 0; fi < 2; fi++) {
    const px = fx + (fi === 0 ? -3 : 97),
      py = GND - 120;
    ctx.fillStyle = "#888";
    ctx.fillRect(px - 2, py - 30, 4, 30);
    ctx.fillStyle = flagColors[0];
    ctx.fillRect(px + 2, py - 28, 18, 8);
    ctx.fillStyle = flagColors[1];
    ctx.fillRect(px + 2, py - 20, 18, 8);
  }
}

function drawConfetti() {
  confetti = confetti.filter((c) => {
    c.x += c.vx;
    c.y += c.vy;
    c.rot += c.rv;
    c.life--;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.rot);
    ctx.globalAlpha = Math.min(1, c.life / 20);
    ctx.fillStyle = c.col;
    ctx.fillRect(-c.size / 2, -c.size / 4, c.size, c.size / 2);
    ctx.restore();
    ctx.globalAlpha = 1;
    return c.life > 0;
  });
}

function getSkin() {
  return SKINS_BASE.find((s) => s.id === selectedSkin) || SKINS_BASE[0];
}

function drawAndriiWeapon(x, y, slide = false) {
  const weapon = getAndriiWeapon(currentLevel, currentLocation);
  if (!weapon) return;
  const recoil = fireCooldown > 10 ? Math.sin(fr * 0.9) * 3 : 0;
  const baseX = slide ? x - 2 : x + 9;
  const baseY = slide ? y - 19 : y - 31;

  ctx.save();
  ctx.translate(baseX, baseY);
  ctx.rotate(slide ? -0.08 : -0.12);

  if (weapon === "minigun") {
    const spin = fr * 0.45;
    ctx.fillStyle = "#15181d";
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-10, -11, 36, 22, 5);
    else ctx.fillRect(-10, -11, 36, 22);
    ctx.fill();

    ctx.fillStyle = "#303842";
    ctx.fillRect(-5, -7, 24, 14);
    ctx.fillStyle = "#6b5a2e";
    ctx.fillRect(4, 8, 18, 16);
    ctx.fillStyle = "#d7b94a";
    for (let i = 0; i < 6; i++) ctx.fillRect(6 + i * 3, 10, 2, 12);

    for (let i = 0; i < 5; i++) {
      const off = Math.sin(spin + i * 1.26) * 5;
      ctx.strokeStyle = i % 2 === 0 ? "#08090b" : "#424b55";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(18 + recoil, off);
      ctx.lineTo(70 + recoil, off - 2);
      ctx.stroke();
    }

    ctx.fillStyle = "#222832";
    ctx.beginPath();
    ctx.arc(18, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#59636f";
    ctx.beginPath();
    ctx.arc(18, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    if (fireCooldown > 7) {
      ctx.fillStyle = "rgba(255,210,70,0.95)";
      ctx.beginPath();
      ctx.moveTo(74 + recoil, -2);
      ctx.lineTo(112 + recoil, -17);
      ctx.lineTo(101 + recoil, -2);
      ctx.lineTo(118 + recoil, 9);
      ctx.lineTo(75 + recoil, 7);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
    return;
  }

  ctx.fillStyle = "#1b1f25";
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(-8, -8, 30, 16, 4);
  else ctx.fillRect(-8, -8, 30, 16);
  ctx.fill();

  ctx.fillStyle = "#39424c";
  ctx.fillRect(-4, -5, 22, 4);
  ctx.fillStyle = "#0b0d10";
  ctx.fillRect(-18, -5, 14, 10);

  ctx.strokeStyle = "#08090b";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(18 + recoil, -1);
  ctx.lineTo(62 + recoil, -4);
  ctx.stroke();

  ctx.strokeStyle = "#4f5964";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(20 + recoil, 3);
  ctx.lineTo(58 + recoil, 0);
  ctx.stroke();

  ctx.fillStyle = "#6b5a2e";
  ctx.fillRect(6, 7, 16, 15);
  ctx.fillStyle = "#d7b94a";
  for (let i = 0; i < 5; i++) ctx.fillRect(8 + i * 3, 9, 2, 11);

  ctx.strokeStyle = "#d7b94a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 7; i++) {
    const bx = -8 - i * 4;
    const by = 12 + Math.sin(i + fr * 0.2) * 2;
    if (i === 0) ctx.moveTo(bx, by);
    else ctx.lineTo(bx, by);
  }
  ctx.stroke();

  if (fireCooldown > 10) {
    ctx.fillStyle = "rgba(255,210,70,0.95)";
    ctx.beginPath();
    ctx.moveTo(65 + recoil, -4);
    ctx.lineTo(92 + recoil, -17);
    ctx.lineTo(84 + recoil, -3);
    ctx.lineTo(98 + recoil, 8);
    ctx.lineTo(66 + recoil, 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,180,0.65)";
    ctx.beginPath();
    ctx.arc(68 + recoil, 0, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawPlayer() {
  const sk = getSkin();
  const x = LANES[pLane],
    y = pY;
  const al = inv > 0 ? (Math.sin(fr * 0.5) > 0 ? 0.3 : 1) : 1;
  ctx.globalAlpha = al;

  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(x, y + 8, 14, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  const run = Math.sin(fr * 0.3) * 8;

  if (pSlide) {
    // ── SLIDE pose ──────────────────────────────────────────
    // body horizontal
    ctx.fillStyle = sk.shirt;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x - 22, y - 14, 44, 16, 5);
    } else {
      ctx.fillRect(x - 22, y - 14, 44, 16);
    }
    ctx.fill();
    // legs
    ctx.fillStyle = sk.shorts || "#222";
    ctx.fillRect(x + 4, y - 8, 26, 12);
    ctx.fillStyle = sk.shoes || "#111";
    ctx.fillRect(x + 20, y - 6, 14, 8);
    // head
    ctx.fillStyle = sk.mask || sk.skin;
    ctx.beginPath();
    ctx.arc(x - 18, y - 14, 12, 0, Math.PI * 2);
    ctx.fill();
    if (sk.id === "ninja") {
      ctx.fillStyle = "#111";
      ctx.beginPath();
      ctx.arc(x - 18, y - 17, 12, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = "#ff3300";
      ctx.fillRect(x - 25, y - 17, 14, 3);
    } else if (sk.id === "cossack") {
      ctx.fillStyle = sk.hair;
      ctx.beginPath();
      ctx.arc(x - 18, y - 25, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#5d3a1a";
      ctx.fillRect(x - 26, y - 16, 7, 2);
      ctx.fillRect(x - 19, y - 16, 7, 2);
    } else {
      ctx.fillStyle = sk.hair;
      ctx.beginPath();
      ctx.arc(x - 18, y - 18, 12, Math.PI, 0);
      ctx.fill();
    }
    drawAndriiWeapon(x, y, true);
  } else {
    // ── NORMAL / JUMP pose ───────────────────────────────────
    // legs
    ctx.fillStyle = sk.shoes || "#111";
    ctx.fillRect(x - 10, y - 2, 7, 18 + run);
    ctx.fillRect(x + 3, y - 2, 7, 18 - run);

    // shorts
    ctx.fillStyle = sk.shorts || "#222";
    ctx.fillRect(x - 13, y - 18, 26, 16);

    // shirt
    ctx.fillStyle = sk.shirt;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x - 15, y - 42, 30, 26, 6);
    } else {
      ctx.fillRect(x - 15, y - 42, 30, 26);
    }
    ctx.fill();

    // scarf / belt
    if (sk.scarf) {
      ctx.fillStyle = sk.scarf;
      ctx.fillRect(x - 15, y - 18, 30, 6);
    }

    // bag strap (only default)
    if (sk.id === "default") {
      ctx.strokeStyle = "#1a1a1a";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x - 10, y - 40);
      ctx.lineTo(x + 12, y - 15);
      ctx.stroke();
    }

    // arms
    ctx.strokeStyle = sk.skin;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x - 12, y - 34);
    ctx.lineTo(x - 18, y - 20 + run * 0.2);
    ctx.moveTo(x + 12, y - 34);
    ctx.lineTo(x + 18, y - 20 - run * 0.2);
    ctx.stroke();

    // head
    ctx.fillStyle = sk.mask || sk.skin;
    ctx.beginPath();
    ctx.arc(x, y - 54, 13, 0, Math.PI * 2);
    ctx.fill();

    if (sk.id === "ninja") {
      // head wrap
      ctx.fillStyle = "#111111";
      ctx.beginPath();
      ctx.arc(x, y - 57, 13, Math.PI, 0);
      ctx.fill();
      // eye slit
      ctx.fillStyle = "#ff3300";
      ctx.fillRect(x - 9, y - 57, 18, 4);
      // belt
      ctx.fillStyle = "#cc0000";
      ctx.fillRect(x - 15, y - 22, 30, 5);
      // arm wraps
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 12, y - 34);
      ctx.lineTo(x - 18, y - 20 + run * 0.2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + 12, y - 34);
      ctx.lineTo(x + 18, y - 20 - run * 0.2);
      ctx.stroke();
    } else if (sk.id === "cossack") {
      // оселедець
      ctx.fillStyle = sk.hair;
      ctx.beginPath();
      ctx.arc(x, y - 64, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(x - 3, y - 72, 6, 12);
      // шапка (смужка)
      ctx.fillStyle = sk.hat || "#111";
      ctx.fillRect(x - 13, y - 65, 26, 5);
      // вуса
      ctx.fillStyle = "#5d3a1a";
      ctx.fillRect(x - 9, y - 52, 8, 2);
      ctx.fillRect(x + 1, y - 52, 8, 2);
      // вишивка на сорочці
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.fillRect(x - 3, y - 40, 6, 10);
    } else {
      // blond hair
      ctx.fillStyle = sk.hair || "#e8c45c";
      ctx.beginPath();
      ctx.arc(x, y - 58, 12, Math.PI, 0);
      ctx.fill();
    }
    drawAndriiWeapon(x, y, false);
  }

  ctx.globalAlpha = 1;
}
function drawChaser() {
  if (gameState === "win") return;
  const cx = chaserX,
    cy = GND;
  const lp = Math.sin(fr * 0.32) * 10;

  // небезпечна зона — аура рожева коли близько
  const dangerPct = Math.min(Math.max((chaserX + 100) / (LANES[0] - 80), 0), 1);
  if (dangerPct > 0.5) {
    const auraAlpha = (dangerPct - 0.5) * 0.35;
    ctx.fillStyle = `rgba(255,100,180,${auraAlpha})`;
    ctx.fillRect(cx - 20, cy - 80, 40, H - cy + 80);
  }

  // тінь
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + 4, 13, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // ноги
  ctx.fillStyle = "#f0d0a8";
  ctx.fillRect(cx - 10, cy, 7, 14 + lp);
  ctx.fillRect(cx + 3, cy, 7, 14 - lp);
  // кросівки
  ctx.fillStyle = "#ff69b4";
  ctx.fillRect(cx - 11, cy + 12 + lp, 10, 6);
  ctx.fillRect(cx + 2, cy + 12 - lp, 10, 6);
  // підошва
  ctx.fillStyle = "#fff";
  ctx.fillRect(cx - 12, cy + 17 + lp, 11, 3);
  ctx.fillRect(cx + 1, cy + 17 - lp, 11, 3);

  // спідниця / плаття
  ctx.fillStyle = "#e91e8c";
  ctx.beginPath();
  ctx.moveTo(cx - 16, cy);
  ctx.lineTo(cx - 14, cy - 28);
  ctx.lineTo(cx + 14, cy - 28);
  ctx.lineTo(cx + 16, cy);
  ctx.closePath();
  ctx.fill();
  // візерунок на спідниці (серця)
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.font = "8px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("♥", cx - 5, cy - 10);
  ctx.fillText("♥", cx + 5, cy - 18);
  ctx.textAlign = "left";

  // тіло (топ)
  ctx.fillStyle = "#c2185b";
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(cx - 12, cy - 46, 24, 20, 4);
  } else {
    ctx.fillRect(cx - 12, cy - 46, 24, 20);
  }
  ctx.fill();

  // руки
  ctx.strokeStyle = "#f0d0a8";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(cx - 10, cy - 40);
  ctx.lineTo(cx - 18, cy - 26 + lp * 0.3);
  ctx.moveTo(cx + 10, cy - 40);
  ctx.lineTo(cx + 18, cy - 26 - lp * 0.3);
  ctx.stroke();

  // шия
  ctx.fillStyle = "#f0d0a8";
  ctx.fillRect(cx - 4, cy - 52, 8, 7);

  // голова
  ctx.fillStyle = "#f0d0a8";
  ctx.beginPath();
  ctx.arc(cx, cy - 60, 12, 0, Math.PI * 2);
  ctx.fill();
  // вуха
  ctx.fillStyle = "#e8c090";
  ix.beginPath();
  ctx.arc(cx - 12, cy - 60, 3, 0, Math.PI * 2);
  ctx.fill();
  ix.beginPath();
  ctx.arc(cx + 12, cy - 60, 3, 0, Math.PI * 2);
  ctx.fill();
  // сережки
  ctx.fillStyle = "#ff69b4";
  ctx.beginPath();
  ctx.arc(cx - 12, cy - 55, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 12, cy - 55, 2, 0, Math.PI * 2);
  ctx.fill();

  // очі
  ctx.fillStyle = "#333";
  ctx.beginPath();
  ctx.arc(cx - 4, cy - 62, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 4, cy - 62, 2.5, 0, Math.PI * 2);
  ctx.fill();
  // вії
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 6, cy - 65);
  ctx.lineTo(cx - 4, cy - 67);
  ctx.moveTo(cx - 3, cy - 65);
  ctx.lineTo(cx - 2, cy - 67);
  ctx.moveTo(cx + 3, cy - 65);
  ctx.lineTo(cx + 2, cy - 67);
  ctx.moveTo(cx + 6, cy - 65);
  ctx.lineTo(cx + 4, cy - 67);
  ctx.stroke();
  // рум'янець
  ctx.fillStyle = "rgba(255,150,150,0.4)";
  ctx.beginPath();
  ctx.ellipse(cx - 7, cy - 57, 4, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 7, cy - 57, 4, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // рот (усмішка)
  ctx.strokeStyle = "#c07060";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy - 56, 3, 0.2, Math.PI - 0.2);
  ctx.stroke();

  // волосся (довге, темне)
  ctx.fillStyle = "#3a1a0a";
  // верхівка
  ctx.beginPath();
  ctx.arc(cx, cy - 68, 12, Math.PI, 0);
  ctx.fill();
  // хвіст ліворуч
  ctx.beginPath();
  ctx.moveTo(cx - 12, cy - 62);
  ctx.quadraticCurveTo(
    cx - 20,
    cy - 48 + lp * 0.2,
    cx - 16,
    cy - 34 + lp * 0.3,
  );
  ctx.lineWidth = 7;
  ctx.strokeStyle = "#3a1a0a";
  ctx.stroke();
  // хвіст праворуч
  ctx.beginPath();
  ctx.moveTo(cx + 12, cy - 62);
  ctx.quadraticCurveTo(
    cx + 20,
    cy - 48 - lp * 0.2,
    cx + 16,
    cy - 34 - lp * 0.3,
  );
  ctx.stroke();
  ctx.lineWidth = 1;

  // іконка x2 над головою коли близько
  if (dangerPct > 0.45) {
    const pulse = 0.7 + Math.sin(fr * 0.15) * 0.3;
    ctx.globalAlpha = (pulse * (dangerPct - 0.45)) / 0.55;
    ctx.fillStyle = "#ffd700";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("x2 💰", cx, cy - 84);
    ctx.textAlign = "left";
    ctx.globalAlpha = 1;
  }
}

function drawObs(o) {
  const x = o.x;
  if (o.type === "kiosk") {
    ctx.fillStyle = "#c8860a";
    ctx.fillRect(x - 24, GND - 46, 48, 46);
    ctx.fillStyle = "#e8a020";
    ctx.fillRect(x - 24, GND - 54, 48, 10);
    ctx.fillStyle = "#5588aa";
    ctx.fillRect(x - 16, GND - 42, 32, 22);
    ctx.fillStyle = "#ff4444";
    ctx.font = "bold 8px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("КІОСК", x, GND - 57);
    ctx.textAlign = "left";
  } else if (o.type === "cop") {
    const lp = Math.sin(fr * 0.32) * 10;
    const gx = x,
      gy = GND;

    // --- тінь ---
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath();
    ctx.ellipse(gx, gy + 4, 14, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // --- ноги (анімація бігу) ---
    ctx.fillStyle = "#1a237e";
    ctx.fillRect(gx - 10, gy, 8, 16 + lp);
    ctx.fillRect(gx + 2, gy, 8, 16 - lp);
    // чоботи
    ctx.fillStyle = "#111";
    ctx.fillRect(gx - 11, gy + 14 + lp, 10, 7);
    ctx.fillRect(gx + 1, gy + 14 - lp, 10, 7);

    // --- тіло (бронежилет) ---
    // основа кителя
    ctx.fillStyle = "#1565c0";
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(gx - 14, gy - 46, 28, 46, 3);
    } else {
      ctx.fillRect(gx - 14, gy - 46, 28, 46);
    }
    ctx.fill();
    // бронежилет поверх
    ctx.fillStyle = "#263238";
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(gx - 11, gy - 44, 22, 36, 2);
    } else {
      ctx.fillRect(gx - 11, gy - 44, 22, 36);
    }
    ctx.fill();
    // жовті лямки бронежилету
    ctx.fillStyle = "#ffd600";
    ctx.fillRect(gx - 11, gy - 44, 4, 36);
    ctx.fillRect(gx + 7, gy - 44, 4, 36);
    // напис ОХОРОНА
    ctx.fillStyle = "#ffd600";
    ctx.font = "bold 5px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("ОХОРОНА", gx, gy - 20);
    ctx.textAlign = "left";
    // значок (нагрудний)
    ctx.fillStyle = "#ffcc00";
    ctx.beginPath();
    ctx.arc(gx + 4, gy - 34, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a237e";
    ctx.beginPath();
    ctx.arc(gx + 4, gy - 34, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // --- руки ---
    // ліва рука (вільна, розмахує)
    ctx.strokeStyle = "#f0c880";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(gx - 12, gy - 38);
    ctx.lineTo(gx - 20, gy - 22 + lp * 0.3);
    ctx.stroke();
    // права рука (з кийком)
    ctx.strokeStyle = "#f0c880";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(gx + 12, gy - 38);
    ctx.lineTo(gx + 20, gy - 24 - lp * 0.3);
    ctx.stroke();
    // кийок
    ctx.strokeStyle = "#5d4037";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(gx + 20, gy - 24 - lp * 0.3);
    ctx.lineTo(gx + 28, gy - 44 - lp * 0.3);
    ctx.stroke();
    // ручка кийка
    ctx.fillStyle = "#3e2723";
    ctx.beginPath();
    ctx.arc(gx + 28, gy - 45 - lp * 0.3, 4, 0, Math.PI * 2);
    ctx.fill();

    // --- шия ---
    ctx.fillStyle = "#f0c880";
    ctx.fillRect(gx - 5, gy - 52, 10, 8);

    // --- голова ---
    ctx.fillStyle = "#f0c880";
    ctx.beginPath();
    ctx.arc(gx, gy - 62, 13, 0, Math.PI * 2);
    ctx.fill();
    // вуха
    ctx.fillStyle = "#e8b870";
    ctx.beginPath();
    ctx.arc(gx - 13, gy - 62, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(gx + 13, gy - 62, 4, 0, Math.PI * 2);
    ctx.fill();
    // очі (сердиті — насуплені брови)
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.arc(gx - 5, gy - 64, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(gx + 5, gy - 64, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // брови (насуплені)
    ctx.strokeStyle = "#3e2723";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(gx - 9, gy - 69);
    ctx.lineTo(gx - 2, gy - 67);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(gx + 9, gy - 69);
    ctx.lineTo(gx + 2, gy - 67);
    ctx.stroke();
    // рот (стиснутий)
    ctx.strokeStyle = "#c07850";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(gx - 4, gy - 57);
    ctx.lineTo(gx + 4, gy - 57);
    ctx.stroke();

    // --- берет ---
    ctx.fillStyle = "#1a237e";
    ctx.beginPath();
    ctx.ellipse(gx, gy - 73, 14, 8, 0, Math.PI, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(gx, gy - 73, 13, Math.PI, 0);
    ctx.fill();
    // кокарда на береті
    ctx.fillStyle = "#ffcc00";
    ctx.beginPath();
    ctx.arc(gx + 5, gy - 74, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a237e";
    ctx.beginPath();
    ctx.arc(gx + 5, gy - 74, 1.5, 0, Math.PI * 2);
    ctx.fill();
    // обідок берету
    ctx.fillStyle = "#0d47a1";
    ctx.fillRect(gx - 14, gy - 75, 28, 4);
  } else if (o.type === "tck") {
    // ТЦК — камуфляжна форма, каска, папка/повістка в руці
    const gx = x,
      gy = GND;
    const lp = Math.sin(fr * 0.32) * 10;

    // тінь
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath();
    ctx.ellipse(gx, gy + 4, 14, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // ноги
    ctx.fillStyle = "#4a5a2a";
    ctx.fillRect(gx - 10, gy, 8, 16 + lp);
    ctx.fillRect(gx + 2, gy, 8, 16 - lp);
    // берці (тактичні)
    ctx.fillStyle = "#2a1e0e";
    ctx.fillRect(gx - 11, gy + 14 + lp, 11, 7);
    ctx.fillRect(gx + 0, gy + 14 - lp, 11, 7);

    // тіло — камуфляж
    ctx.fillStyle = "#4a5a2a";
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(gx - 14, gy - 46, 28, 46, 3);
    } else {
      ctx.fillRect(gx - 14, gy - 46, 28, 46);
    }
    ctx.fill();
    // камуфляжні плями
    ctx.fillStyle = "#2e3a14";
    ctx.fillRect(gx - 12, gy - 42, 8, 8);
    ctx.fillRect(gx + 2, gy - 30, 7, 7);
    ctx.fillRect(gx - 8, gy - 18, 6, 6);
    ctx.fillRect(gx + 4, gy - 44, 5, 5);
    ctx.fillStyle = "#6a7a3a";
    ctx.fillRect(gx - 5, gy - 38, 6, 5);
    ctx.fillRect(gx + 5, gy - 22, 5, 6);
    // бронежилет (беж)
    ctx.fillStyle = "#8a7a5a";
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(gx - 10, gy - 44, 20, 34, 2);
    } else {
      ctx.fillRect(gx - 10, gy - 44, 20, 34);
    }
    ctx.fill();
    // напис ТЦК
    ctx.fillStyle = "#2e1e08";
    ctx.font = "bold 5px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("ТЦК", gx, gy - 24);
    ctx.textAlign = "left";
    // нашивка прапор
    ctx.fillStyle = "#1565c0";
    ctx.fillRect(gx + 2, gy - 40, 12, 4);
    ctx.fillStyle = "#ffd700";
    ctx.fillRect(gx + 2, gy - 36, 12, 4);

    // ліва рука (вільна)
    ctx.strokeStyle = "#c8a870";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(gx - 12, gy - 38);
    ctx.lineTo(gx - 20, gy - 22 + lp * 0.3);
    ctx.stroke();

    // права рука (з папкою/повісткою або рушницею)
    ctx.strokeStyle = "#c8a870";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(gx + 12, gy - 38);
    ctx.lineTo(gx + 20, gy - 26 - lp * 0.3);
    ctx.stroke();
    if (currentLocation === 1 && currentLevel >= 2) {
      // рушниця/автомат
      ctx.strokeStyle = "#2a2a2a";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(gx + 18, gy - 30 - lp * 0.3);
      ctx.lineTo(gx + 38, gy - 38 - lp * 0.3);
      ctx.stroke();
      // ствол
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(gx + 34, gy - 38 - lp * 0.3);
      ctx.lineTo(gx + 46, gy - 40 - lp * 0.3);
      ctx.stroke();
      // магазин
      ctx.fillStyle = "#333";
      ctx.fillRect(gx + 24, gy - 32 - lp * 0.3, 5, 10);
      // дульний спалах (якщо є куля з цього ТЦК щойно створена)
      if (o.muzzleFlash > 0) {
        o.muzzleFlash--;
        ctx.fillStyle = "rgba(255,200,50,0.9)";
        ctx.beginPath();
        ctx.arc(gx + 46, gy - 40 - lp * 0.3, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,150,0.6)";
        ctx.beginPath();
        ctx.arc(gx + 46, gy - 40 - lp * 0.3, 10, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // папка (повістка)
      ctx.fillStyle = "#f5e6c8";
      ctx.fillRect(gx + 18, gy - 34 - lp * 0.3, 14, 18);
      ctx.fillStyle = "#d4c4a0";
      ctx.fillRect(gx + 19, gy - 33 - lp * 0.3, 12, 2);
      ctx.fillRect(gx + 19, gy - 29 - lp * 0.3, 12, 2);
      ctx.fillRect(gx + 19, gy - 25 - lp * 0.3, 8, 2);
      ctx.fillStyle = "#c0392b";
      ctx.font = "bold 4px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("ПОВІСТ", gx + 25, gy - 20 - lp * 0.3);
      ctx.textAlign = "left";
    }

    // шия
    ctx.fillStyle = "#c8a870";
    ctx.fillRect(gx - 5, gy - 52, 10, 8);

    // голова
    ctx.fillStyle = "#c8a870";
    ctx.beginPath();
    ctx.arc(gx, gy - 62, 13, 0, Math.PI * 2);
    ctx.fill();
    // вуха
    ctx.fillStyle = "#b89060";
    ctx.beginPath();
    ctx.arc(gx - 13, gy - 62, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(gx + 13, gy - 62, 4, 0, Math.PI * 2);
    ctx.fill();
    // очі (підозрілі)
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.arc(gx - 5, gy - 64, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(gx + 5, gy - 64, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // брови (насуплені)
    ctx.strokeStyle = "#2e1e08";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(gx - 9, gy - 69);
    ctx.lineTo(gx - 2, gy - 67);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(gx + 9, gy - 69);
    ctx.lineTo(gx + 2, gy - 67);
    ctx.stroke();
    // рот
    ctx.strokeStyle = "#a07050";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(gx - 4, gy - 57);
    ctx.lineTo(gx + 4, gy - 57);
    ctx.stroke();
    // вуса
    ctx.strokeStyle = "#5a3a18";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(gx - 5, gy - 59);
    ctx.lineTo(gx - 1, gy - 58);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(gx + 5, gy - 59);
    ctx.lineTo(gx + 1, gy - 58);
    ctx.stroke();

    // каска (тактична, пісочна)
    ctx.fillStyle = "#5a6a2e";
    ctx.beginPath();
    ctx.ellipse(gx, gy - 74, 15, 9, 0, Math.PI, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(gx, gy - 73, 14, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = "#4a5820";
    ctx.fillRect(gx - 15, gy - 75, 30, 4);
    // підбородний ремінь каски
    ctx.strokeStyle = "#3a4818";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(gx - 13, gy - 68);
    ctx.lineTo(gx - 6, gy - 62);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(gx + 13, gy - 68);
    ctx.lineTo(gx + 6, gy - 62);
    ctx.stroke();
  } else {
    // bollard
    for (let i = -1; i <= 1; i++) {
      ctx.fillStyle = "#f0c000";
      ctx.fillRect(x + i * 18 - 5, GND - 36, 10, 36);
      ctx.fillStyle = "#cc0000";
      ctx.fillRect(x + i * 18 - 5, GND - 40, 10, 8);
    }
    ctx.fillStyle = "#ccc";
    ctx.fillRect(x - 24, GND - 28, 48, 5);
  }
}

function drawCoin(c) {
  if (c.done) return;
  const x = LANES[c.lane],
    y = c.y - 14;
  const g = ctx.createRadialGradient(x, y, 0, x, y, 20);
  g.addColorStop(0, "rgba(255,255,180,1)");
  g.addColorStop(1, "rgba(255,215,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, 20, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffd700";
  ctx.beginPath();
  ctx.arc(x, y, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#b8860b";
  ctx.font = "bold 10px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("₴", x, y + 3);
  ctx.textAlign = "left";
}

function drawDistBar() {
  const lv = getLvl();
  const pct = Math.min(totalDist / lv.dist, 1);
  const bw = 160,
    bh = 6,
    bx = W / 2 - bw / 2,
    by = 12;
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = "#ffd700";
  ctx.fillRect(bx, by, bw * pct, bh);
  ctx.fillStyle = "#fff";
  ctx.font = "9px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(Math.round(pct * 100) + "%", W / 2, by + bh + 10);
  ctx.textAlign = "left";
  if (pct >= 0.8) {
    ctx.fillStyle = "rgba(255,215,0,0.15)";
    ctx.fillRect(0, 0, W, H);
  }
}

function drawLevelClearOverlay() {
  const L = t();
  const a = Math.min(levelClearTimer / 25, 0.78);
  ctx.fillStyle = `rgba(5,30,5,${a})`;
  ctx.fillRect(0, 0, W, H);
  if (levelClearTimer < 18) return;
  const a2 = Math.min((levelClearTimer - 18) / 18, 1);
  ctx.globalAlpha = a2;
  ctx.textAlign = "center";
  // level cleared title
  ctx.fillStyle = "#6bcb77";
  ctx.font = "bold 30px sans-serif";
  ctx.fillText(L.levelClear || "Level cleared!", W / 2, H / 2 - 52);
  // level name
  const lvNames = getLevelNames(currentLocation, lang);
  ctx.fillStyle = "#ffd700";
  ctx.font = "bold 18px sans-serif";
  ctx.fillText(
    (L.levelLabel || "Level") +
      " " +
      (currentLevel + 1) +
      ": " +
      (lvNames[currentLevel] || ""),
    W / 2,
    H / 2 - 18,
  );
  // next level preview
  if (currentLevel + 1 < getLevels().length) {
    ctx.fillStyle = "#aabbcc";
    ctx.font = "14px sans-serif";
    ctx.fillText(
      "→ " +
        (L.levelLabel || "Level") +
        " " +
        (currentLevel + 2) +
        ": " +
        (lvNames[currentLevel + 1] || ""),
      W / 2,
      H / 2 + 12,
    );
  }
  // coins earned
  ctx.fillStyle = "#ffd700";
  ctx.font = "13px sans-serif";
  ctx.fillText(
    "+" + getLvl().bonusCoins + "₴ " + (L.winBonus || "bonus"),
    W / 2,
    H / 2 + 40,
  );
  // press to continue
  if (levelClearTimer > LEVEL_CLEAR_INPUT_DELAY) {
    const remaining = Math.max(
      0,
      Math.ceil((LEVEL_CLEAR_AUTO_DELAY - levelClearTimer) / 60),
    );
    ctx.fillStyle = "#8899aa";
    ctx.font = "12px sans-serif";
    ctx.fillText(
      (L.restart || "Press any key") + " · " + remaining + "s",
      W / 2,
      H / 2 + 68,
    );
  }
  ctx.textAlign = "left";
  ctx.globalAlpha = 1;
}

function pRect() {
  const x = LANES[pLane];
  if (pSlide) return { x: x - 16, y: pY + 11, w: 32, h: 14 };
  return { x: x - 12, y: pY - 44, w: 24, h: 68 };
}
function oRect(o) {
  if (o.type === "kiosk") return { x: o.x - 24, y: GND - 46, w: 48, h: 46 };
  if (o.type === "cop") return { x: o.x - 14, y: GND - 75, w: 28, h: 75 };
  if (o.type === "tck") return { x: o.x - 14, y: GND - 75, w: 28, h: 75 };
  return { x: o.x - 26, y: GND - 40, w: 52, h: 40 };
}
function hit(a, b) {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}

function drawParts() {
  parts = parts.filter((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.35;
    p.life--;
    ctx.globalAlpha = p.life / 36;
    ctx.fillStyle = p.col;
    ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
    ctx.globalAlpha = 1;
    return p.life > 0;
  });
}

function drawHUDCanvas() {
  if (flash > 0) {
    ctx.globalAlpha = (flash / 22) * 0.4;
    ctx.fillStyle = "#ff2020";
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    flash--;
  }
  const bw = 90,
    pct = Math.min(Math.max((chaserX + 100) / (LANES[0] - 80), 0), 1);
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(W - bw - 10, 8, bw, 7);
  // рожевий колір бару — небезпечна зона дає x2
  const barCol = pct > 0.45 ? "#ff69b4" : "#6bcb77";
  ctx.fillStyle = barCol;
  ctx.fillRect(W - bw - 10, 8, bw * (1 - pct), 7);
  // x2 label коли активний
  if (pct > 0.45) {
    const pulse = 0.6 + Math.sin(fr * 0.2) * 0.4;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = "#ffd700";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("x2💰", W - 10, 7);
    ctx.textAlign = "left";
    ctx.globalAlpha = 1;
  }
}

function drawWinOverlay() {
  const L = t();
  const alpha = Math.min(winTimer / 30, 0.75);
  ctx.fillStyle = `rgba(5,20,10,${alpha})`;
  ctx.fillRect(0, 0, W, H);
  if (winTimer < 20) return;
  const a2 = Math.min((winTimer - 20) / 20, 1);
  ctx.globalAlpha = a2;
  ctx.fillStyle = "#ffd700";
  ctx.font = "bold 34px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(L.win, W / 2, H / 2 - 44);
  ctx.fillStyle = "#6bcb77";
  ctx.font = "16px sans-serif";
  ctx.fillText(L.score + ": " + score, W / 2, H / 2 - 6);
  ctx.fillStyle = "#ffd700";
  ctx.font = "14px sans-serif";
  ctx.fillText(
    L.earned + ": " + runCoins + "₴   " + L.winBonus + ": +50₴",
    W / 2,
    H / 2 + 22,
  );
  ctx.fillStyle = "#aabbcc";
  ctx.font = "13px sans-serif";
  ctx.fillText(L.total + ": " + totalCoins + "₴", W / 2, H / 2 + 48);
  ctx.fillStyle = "#8899aa";
  ctx.font = "12px sans-serif";
  ctx.fillText("↩ " + (t().back || "Back to menu"), W / 2, H / 2 + 76);
  ctx.textAlign = "left";
  ctx.globalAlpha = 1;
}

function drawOverlay() {
  const L = t();
  ctx.fillStyle = "rgba(5,10,20,0.72)";
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = "center";
  if (gameState === "idle") {
    ctx.fillStyle = "#ffd700";
    ctx.font = "bold 30px sans-serif";
    ctx.fillText("KYIV RUNNER", W / 2, H / 2 - 30);
    ctx.fillStyle = "#8899aa";
    ctx.font = "14px sans-serif";
    ctx.fillText(L.pressAny, W / 2, H / 2 + 10);
  } else if (gameState === "over") {
    const lvNames = getLevelNames(currentLocation, lang);
    ctx.fillStyle = "#ff4444";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText(L.caught, W / 2, H / 2 - 50);
    ctx.fillStyle = "#aabbcc";
    ctx.font = "13px sans-serif";
    ctx.fillText(
      (L.levelLabel || "Level") +
        " " +
        (currentLevel + 1) +
        " — " +
        (lvNames[currentLevel] || ""),
      W / 2,
      H / 2 - 18,
    );
    ctx.fillStyle = "#ffd700";
    ctx.font = "15px sans-serif";
    ctx.fillText(
      L.score + ": " + score + "   " + L.earned + ": " + runCoins + "₴",
      W / 2,
      H / 2 + 8,
    );
    ctx.fillStyle = "#6bcb77";
    ctx.font = "13px sans-serif";
    ctx.fillText(L.total + ": " + totalCoins + "₴", W / 2, H / 2 + 32);
    ctx.fillStyle = "#8899aa";
    ctx.font = "12px sans-serif";
    ctx.fillText(
      L.restart || "Press any key to retry level",
      W / 2,
      H / 2 + 56,
    );
  }
  ctx.textAlign = "left";
}

const TCK_SCENE_LINES = [
  {
    at: 50,
    who: "Андрій",
    text: "От лишенько, чорна машина... Вони вже близько. Що робити?",
    rate: 0.92,
    pitch: 1.55,
  },
  {
    at: 320,
    who: "ТЦК",
    text: "Підпиши документи, хлопче.",
    rate: 0.82,
    pitch: 0.7,
  },
  {
    at: 610,
    who: "Андрій",
    text: "Я не буду підписувати ваші документи.",
    rate: 0.95,
    pitch: 1.55,
  },
  {
    at: 900,
    who: "ТЦК",
    text: "А ну, ти, хлопче, зараз підеш до нас. Іди сюди.",
    rate: 0.82,
    pitch: 0.7,
  },
  {
    at: 1190,
    who: "Андрій",
    text: "Ні. Я маю добігти до фінішу.",
    rate: 0.95,
    pitch: 1.55,
  },
  {
    at: 1460,
    who: "ТЦК",
    text: "Не сперечайся, хлопче. Ми все одно наздоженемо.",
    rate: 0.82,
    pitch: 0.7,
  },
  {
    at: 1760,
    who: "Андрій",
    text: "Спробуйте наздогнати. Я не здаюся.",
    rate: 0.95,
    pitch: 1.55,
  },
  {
    at: 2040,
    who: "ТЦК",
    text: "Тримайте його.",
    rate: 0.82,
    pitch: 0.7,
  },
  {
    at: 2280,
    who: "Андрій",
    text: "Роботроне, допоможи. Я побіг.",
    rate: 0.95,
    pitch: 1.55,
  },
];
const TCK_SCENE_END_FRAME = 2700;

function beginTckScene(sceneKey) {
  gameState = "story";
  fr = 0;
  bgOff = 0;
  pLane = 0;
  pY = GND;
  pSlide = false;
  slideT = 0;
  obs = [];
  coins = [];
  parts = [];
  bullets = [];
  confetti = [];
  bubbleText = "";
  bubbleTimer = 0;
  tckScene = { frame: 0, line: null, lineIndex: -1, sceneKey, spoken: false, waitUntil: 50 };
  if (raf) cancelAnimationFrame(raf);
  loop();
}

function finishTckScene() {
  if (tckScene && tckScene.sceneKey) tckSceneSeenLevels[tckScene.sceneKey] = true;
  tckScene = null;
  startLevel();
}

function updateTckScene() {
  if (!tckScene) return;
  tckScene.frame++;
  fr++;
  bgOff += 1.2;
  if (!tckScene.spoken && tckScene.frame >= tckScene.waitUntil) {
    tckScene.lineIndex++;
    tckScene.line = TCK_SCENE_LINES[tckScene.lineIndex] || null;
    if (tckScene.line) {
      tckScene.spoken = true;
      speakSceneLine(tckScene.line);
    }
  }
  if (!tckScene.line && tckScene.lineIndex >= TCK_SCENE_LINES.length) finishTckScene();
}

function drawSpeechBox(who, text, x, y, align = "left") {
  const maxW = 270,
    lineH = 16,
    pad = 9;
  ctx.font = "bold 13px sans-serif";
  const words = text.split(" ");
  const lines = [];
  let cur = "";
  words.forEach((word) => {
    const test = cur ? cur + " " + word : word;
    if (ctx.measureText(test).width > maxW - pad * 2 && cur) {
      lines.push(cur);
      cur = word;
    } else cur = test;
  });
  if (cur) lines.push(cur);
  const h = pad * 2 + 18 + lines.length * lineH;
  const w = maxW;
  const bx = align === "right" ? x - w : x;
  ctx.fillStyle = "rgba(8,12,24,0.9)";
  ctx.strokeStyle = who === "Андрій" ? "#ffd700" : "#ff5c5c";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(bx, y, w, h, 8);
  else ctx.rect(bx, y, w, h);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = who === "Андрій" ? "#ffd700" : "#ff9a9a";
  ctx.fillText(who, bx + pad, y + 18);
  ctx.fillStyle = "#eef3ff";
  ctx.font = "13px sans-serif";
  lines.forEach((line, i) => ctx.fillText(line, bx + pad, y + 38 + i * lineH));
}

function drawStoryAndrii(x, y) {
  ctx.save();
  const oldLane = pLane,
    oldY = pY,
    oldSlide = pSlide,
    oldInv = inv,
    oldLaneX = LANES[0];
  pLane = 0;
  pY = y;
  pSlide = false;
  inv = 0;
  LANES[0] = x;
  drawPlayer();
  LANES[0] = oldLaneX;
  pLane = oldLane;
  pY = oldY;
  pSlide = oldSlide;
  inv = oldInv;
  ctx.restore();
}

function drawTckPerson(x, y, step = 0) {
  const sway = Math.sin((fr + step) * 0.12) * 3;
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(x, y + 8, 15, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#273245";
  ctx.fillRect(x - 13, y - 48, 26, 34);
  ctx.fillStyle = "#1a2230";
  ctx.fillRect(x - 15, y - 22, 30, 12);
  ctx.fillStyle = "#1b2638";
  ctx.fillRect(x - 12, y - 14 + sway, 9, 20);
  ctx.fillRect(x + 3, y - 14 - sway, 9, 20);
  ctx.fillStyle = "#111";
  ctx.fillRect(x - 13, y + 3 + sway, 12, 6);
  ctx.fillRect(x + 1, y + 3 - sway, 12, 6);
  ctx.fillStyle = "#d8b38c";
  ctx.beginPath();
  ctx.arc(x, y - 60, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#172033";
  ctx.fillRect(x - 13, y - 72, 26, 8);
  ctx.fillStyle = "#ffd700";
  ctx.fillRect(x - 4, y - 46, 8, 4);
  ctx.strokeStyle = "#d8b38c";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x - 12, y - 40);
  ctx.lineTo(x - 24, y - 24);
  ctx.moveTo(x + 12, y - 40);
  ctx.lineTo(x + 24, y - 24);
  ctx.stroke();
}

function drawBlackCar(x, y) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(x + 58, y + 48, 90, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#050608";
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, 128, 48, 10);
  else ctx.rect(x, y, 128, 48);
  ctx.fill();
  ctx.fillStyle = "#121722";
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x + 22, y - 22, 74, 34, 8);
  else ctx.rect(x + 22, y - 22, 74, 34);
  ctx.fill();
  ctx.fillStyle = "#1e3048";
  ctx.fillRect(x + 30, y - 16, 26, 20);
  ctx.fillRect(x + 62, y - 16, 28, 20);
  ctx.fillStyle = "#111";
  ctx.fillRect(x + 12, y + 30, 104, 14);
  ctx.fillStyle = "#ffdf66";
  ctx.fillRect(x + 110, y + 14, 10, 8);
  ctx.fillStyle = "#dd2233";
  ctx.fillRect(x + 3, y + 18, 8, 8);
  ctx.fillStyle = "#090909";
  [26, 100].forEach((wx) => {
    ctx.beginPath();
    ctx.arc(x + wx, y + 45, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#30343a";
    ctx.beginPath();
    ctx.arc(x + wx, y + 45, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#090909";
  });
  ctx.restore();
}

function drawTckScene() {
  if (!tckScene) return;
  const f = tckScene.frame;
  const lv = getLvl();
  ctx.fillStyle = lv.sky;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#101927";
  ctx.fillRect(0, 0, W, 80);
  ctx.fillStyle = lv.road;
  ctx.fillRect(0, GND - 16, W, H - GND + 16);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = "#1a2030";
    ctx.fillRect(LANES[i] - 42, GND - 4, 84, H - GND + 4);
  }
  ctx.fillStyle = "#22304a";
  ctx.fillRect(0, GND - 5, W, 10);
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  for (let x = -80 + ((f * 2) % 120); x < W + 120; x += 120)
    ctx.fillRect(x, GND + 36, 54, 4);

  const carX = Math.min(430, -170 + f * 3.1);
  drawBlackCar(carX, GND - 68);
  drawStoryAndrii(160, GND);

  const tckAlpha = Math.min(1, Math.max(0, (f - 150) / 70));
  ctx.globalAlpha = tckAlpha;
  drawTckPerson(455, GND, 0);
  drawTckPerson(515, GND, 20);
  ctx.globalAlpha = 1;

  if (tckScene.line) {
    const fromAndrii = tckScene.line.who === "Андрій";
    drawSpeechBox(
      tckScene.line.who,
      tckScene.line.text,
      fromAndrii ? 28 : 650,
      54,
      fromAndrii ? "left" : "right",
    );
  }

  ctx.fillStyle = "rgba(0,0,0,0.42)";
  ctx.fillRect(0, H - 34, W, 34);
  ctx.fillStyle = "#aabbcc";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Натисни будь-яку кнопку, щоб пропустити сцену", W / 2, H - 13);
  ctx.textAlign = "left";
}

function update() {
  if (gameState === "story") {
    updateTckScene();
    return;
  }
  if (gameState === "win") {
    winTimer++;
    if (winTimer === 1) {
      addConfetti();
      addConfetti();
    }
    if (winTimer % 40 === 0 && winTimer < 120) addConfetti();
    return;
  }
  if (gameState === "levelClear") {
    levelClearTimer++;
    if (levelClearTimer === 1) {
      addConfetti();
    }
    if (levelClearTimer % 60 === 0 && levelClearTimer < LEVEL_CLEAR_AUTO_DELAY)
      addConfetti();
    if (levelClearTimer >= LEVEL_CLEAR_AUTO_DELAY) {
      nextLevel();
    }
    return;
  }
  if (gameState !== "run") return;
  fr++;
  const lv = getLvl();
  const FDIST = lv.dist;
  const diffMult = { easy: 0.75, normal: 1.0, hard: 1.4 }[settingDiff] || 1.0;
  const base = Math.min(lv.baseSpd, LEVEL_START_SPEED_CAP) * diffMult;
  const maxS = lv.maxSpd * diffMult;
  const accel = 0.0012 * diffMult * (1 + currentLevel * 0.15);
  const pct = Math.min(totalDist / FDIST, 1);
  if (pct < 0.5) {
    spd = Math.min(base + fr * accel, maxS);
  } else {
    spd = Math.min(spd, maxS);
  }
  score = Math.round((fr * spd) / 10);
  totalDist += spd / 60;

  if (!finishActive && totalDist >= FDIST - 200) {
    finishActive = true;
    finishX = W + 100;
  }
  if (finishActive) {
    finishX -= spd;
    if (finishX < W / 2 && totalDist >= FDIST) {
      const bonus = lv.bonusCoins;
      runCoins += bonus;
      totalCoins += runCoins;
      syncCoins();
      saveGame();
      hudUp();
      // last level?
      if (currentLevel >= getLevels().length - 1) {
        gameState = "win";
        sfxWin();
        winTimer = 0;
        speakAndriiForce(ANDRII_WIN);
      } else {
        gameState = "levelClear";
        sfxWin();
        levelClearTimer = 0;
        speakAndriiForce(ANDRII_WIN);
      }
      addConfetti();
      return;
    }
  }

  pY += pVY;
  const wasAirborne = pY < GND;
  pVY += 0.75;
  if (pY >= GND) {
    if (wasAirborne && pVY > 3) sfxLand();
    pY = GND;
    pVY = 0;
  }
  if (pSlide) {
    slideT--;
    if (slideT <= 0) pSlide = false;
  }
  if (inv > 0) inv--;
  if (fireCooldown > 0) fireCooldown--;
  if (chaserX < LANES[0] - 100) chaserX += 0.5 + (spd - 2.8) * 0.1;
  if (andriiCooldown > 0) andriiCooldown--;

  // перший ворог на екрані — Андрій реагує
  if (!andriiFirstObs && obs.length > 0) {
    const firstEnemy = obs.find((o) => o.type === "cop" || o.type === "tck");
    if (firstEnemy && firstEnemy.x < W - 50) {
      andriiFirstObs = true;
      speakAndrii(firstEnemy.type === "tck" ? ANDRII_TCK : ANDRII_COP);
    }
  }
  bgOff += spd;

  const interval = Math.max(
    160 - Math.floor(spd * 6),
    settingDiff === "hard" ? 55 : 80,
  );
  if (fr % interval === 0 && totalDist < FDIST - 100) spawnObs();
  if (fr % 110 === 0 && totalDist < FDIST - 50) spawnCoin();

  obs.forEach((o) => (o.x -= spd));
  coins.forEach((c) => (c.x -= spd));

  // ТЦК стрілянина — лише Львів, рівень >= 2 (index >= 2)
  if (currentLocation === 1 && currentLevel >= 1) {
    obs.forEach((o) => {
      if (o.type !== "tck") return;
      if (!o.shotCooldown) o.shotCooldown = 0;
      o.shotCooldown--;
      // стріляє коли ТЦК на екрані та ближче 500px до гравця
      const playerX = LANES[pLane];
      const dist = o.x - playerX;
      if (dist > 30 && dist < 480 && o.shotCooldown <= 0) {
        const fireRate = Math.max(90 - currentLevel * 3, 30);
        o.shotCooldown = fireRate + ((Math.random() * 40) | 0);
        bullets.push({
          x: o.x - 16,
          y: GND - 38,
          lane: o.lane,
          vx: -(spd + 5),
          life: 80,
        });
        o.muzzleFlash = 5;
        sfxShot();
      }
    });
  }

  // рухаємо кулі
  bullets.forEach((b) => {
    b.x += b.vx;
    b.life--;
  });
  bullets = bullets.filter((b) => b.life > 0 && b.x > -20);
  playerBullets.forEach((b) => {
    b.x += b.vx;
    b.life--;
  });
  playerBullets = playerBullets.filter((b) => b.life > 0 && b.x < W + 40);

  playerBullets = playerBullets.filter((b) => {
    let hitEnemy = false;
    obs = obs.filter((o) => {
      if (hitEnemy || b.lane !== o.lane || (o.type !== "tck" && o.type !== "cop")) return true;
      const br =
        b.type === "minigun"
          ? { x: b.x - 8, y: b.y - 5, w: 16, h: 10 }
          : { x: b.x - 5, y: b.y - 4, w: 10, h: 8 };
      if (!hit(br, oRect(o))) return true;
      hitEnemy = true;
      addParts(o.x, GND - 36, "#ffd700");
      return false;
    });
    return !hitEnemy;
  });

  obs = obs.filter((o) => o.x > -80);
  coins = coins.filter((c) => !c.done && c.x > -20);

  const pr = pRect(),
    px = LANES[pLane];

  // перевірка куль
  bullets = bullets.filter((b) => {
    if (b.lane !== pLane) return true;
    const br = { x: b.x - 5, y: b.y - 4, w: 10, h: 8 };
    if (hit(pr, br) && inv === 0) {
      lives--;
      inv = 75;
      flash = 22;
      sfxHit();
      addParts(px, pY - 30, "#ff6600");
      if (settingVib && navigator.vibrate) navigator.vibrate(80);
      if (lives <= 0) {
        gameState = "over";
        sfxGameOver();
        speakAndriiForce(ANDRII_LOSE);
        totalCoins += runCoins;
        syncCoins();
        saveGame();
      }
      hudUp();
      return false;
    }
    return true;
  });

  obs.forEach((o) => {
    if (o.lane !== pLane) return;
    if (pSlide && o.type === "bollard") return;
    if (pY < GND - 50 && o.type === "kiosk") return;
    if (hit(pr, oRect(o)) && inv === 0) {
      lives--;
      inv = 75;
      flash = 22;
      sfxHit();
      addParts(px, pY - 20, "#ff4444");
      speakAndrii(ANDRII_HIT);
      if (settingVib && navigator.vibrate) navigator.vibrate(120);
      if (lives <= 0) {
        gameState = "over";
        sfxGameOver();
        speakAndriiForce(ANDRII_LOSE);
        totalCoins += runCoins;
        syncCoins();
        saveGame();
      }
      hudUp();
    }
  });
  coins = coins.filter((c) => {
    if (c.lane !== pLane) return true;
    const cr = { x: LANES[c.lane] - 8, y: c.y - 22, w: 16, h: 16 };
    if (hit(pr, cr)) {
      const dangerPct = Math.min(
        Math.max((chaserX + 100) / (LANES[0] - 80), 0),
        1,
      );
      const mult = dangerPct > 0.45 ? 2 : 1;
      runCoins += mult;
      totalCoins += mult;
      c.done = true;
      sfxCoin();
      addParts(LANES[c.lane], c.y - 14, "#ffd700");
      if (mult === 2) {
        addParts(LANES[c.lane], c.y - 28, "#ff69b4");
      }
      return false;
    }
    return true;
  });
  if (fr % 15 === 0) hudUp();
}

function loop() {
  if (gameState === "stopped") return;
  ctx.clearRect(0, 0, W, H);
  if (gameState === "story") {
    drawTckScene();
    update();
    if (gameState === "story") raf = requestAnimationFrame(loop);
    return;
  }
  drawBG();
  drawFinishLine();
  coins.forEach(drawCoin);
  obs.forEach(drawObs);
  drawChaser();
  drawPlayer();
  drawParts();
  drawBullets();
  drawAndriiBubble();
  if (gameState === "run") {
    drawHUDCanvas();
    drawDistBar();
  }
  if (gameState === "win") {
    drawConfetti();
    drawWinOverlay();
  }
  if (gameState === "levelClear") {
    drawConfetti();
    drawLevelClearOverlay();
  }
  if (gameState === "idle" || gameState === "over") drawOverlay();
  update();
  raf = requestAnimationFrame(loop);
}

// ── INTRO ──────────────────────────────────────────────────────────────────
const ANDRII_START = [
  "Ну що ж, побігли!",
  "Поїхали! Тримайтесь!",
  "Вперед, нікого не боюся!",
];
const ANDRII_COP = [
  "О, охоронець! Не дожене!",
  "Ану, спробуй мене зупини!",
  "Я швидший за тебе!",
  "Біжи-біжи, не доженеш!",
];
const ANDRII_TCK = [
  "ТЦК?! Та я вас не боюся!",
  "Повістку? Ні дякую, побіжу!",
  "Не сьогодні, хлопці!",
  "Я ще встигну на урок!",
];
const ANDRII_HIT = [
  "Ой! Але я не здаюсь!",
  "Все одно добіжу!",
  "Це ще не кінець!",
];
const ANDRII_LOSE = [
  "Ай, боляче! Але я повернусь!",
  "Ой боляче... Дайте відпочити!",
  "Ай! Цього разу не вийшло...",
];
const ANDRII_WIN = [
  "УРА! ПЕРЕМОГА! Я зробив це!",
  "Ура! Дійшов до фінішу! Слава Україні!",
  "ПЕРЕМОГА! Ніхто мене не зупинить!",
];

let andriiCooldown = 0; // щоб не кричав занадто часто
let andriiFirstObs = false; // флаг першого зіткнення з перешкодою на рівні

function speakAndrii(lines) {
  if (andriiCooldown > 0) return;
  andriiCooldown = 180;
  _doSpeakAndrii(lines);
}
function speakAndriiForce(lines) {
  andriiCooldown = 300;
  cancelSpeech();
  const text = lines[Math.floor(Math.random() * lines.length)];
  bubbleText = text;
  bubbleTimer = 260;
  speakAndWait(text, () => {});
}
function speakSceneLine(line) {
  cancelSpeech();
  bubbleText = line.text;
  bubbleTimer = 640;
  speakAndWait(line.text).then(() => {
    if (!tckScene || tckScene.line !== line) return;
    tckScene.spoken = false;
    tckScene.waitUntil = tckScene.frame + 90;
  });
}
function _doSpeakAndrii(lines) {
  const text = lines[Math.floor(Math.random() * lines.length)];
  showAndriiBubble(text);
  speakAndWait(text, () => {});
}

// Bubble над гравцем
let bubbleText = "",
  bubbleTimer = 0;
function showAndriiBubble(text) {
  bubbleText = text;
  bubbleTimer = 160;
}
function drawAndriiBubble() {
  if (bubbleTimer <= 0) return;
  bubbleTimer--;
  const x = LANES[pLane],
    y = pY - 80;
  const alpha = Math.min(1, bubbleTimer / 20);
  ctx.globalAlpha = alpha;
  // хмарка
  const pad = 8,
    tw = ctx.measureText(bubbleText).width + pad * 2;
  const bx = Math.max(10, Math.min(W - tw - 10, x - tw / 2));
  const by = Math.max(8, y - 30);
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.beginPath();
  ctx.roundRect
    ? ctx.roundRect(bx, by, tw, 22, 5)
    : ctx.fillRect(bx, by, tw, 22);
  ctx.fill();
  // хвіст хмарки
  ctx.beginPath();
  ctx.moveTo(x - 6, by + 22);
  ctx.lineTo(x, by + 32);
  ctx.lineTo(x + 6, by + 22);
  ctx.fill();
  // текст
  ctx.fillStyle = "#1a1a2e";
  ctx.font = "bold 11px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(bubbleText, bx + pad, by + 15);
  ctx.globalAlpha = 1;
}

const STORY = [
  "Привіт! Я Роботрон-9000.",
  "Хочу розповісти тобі одну важливу історію...",
  "Жив собі хлопець на ім'я Андрій.",
  "Звичайний київський школяр — добрий і веселий.",
  "Кожного ранку він біг на уроки вулицями міста.",
  "Але сьогодні щось пішло не так...",
  "Охоронці вирішили його зупинити!",
  "Андрій не злякався.",
  "Він побіг — швидко, спритно, хоробро!",
  "Допоможи йому добігти до фінішу.",
  "Слава Україні! 🇺🇦",
];

const ic = document.getElementById("introCanvas");
const ix = ic.getContext("2d");
const IW = 340,
  IH = 220;
let iFr = 0,
  iRaf = null,
  iPhase = 0,
  iCharIdx = 0,
  iTyping = false,
  introStarted = false;
let iTypedText = "",
  iPhaseTimer = 0;
const ISTATE = { TYPING: 0, PAUSE: 1, DONE: 2 };
let iState = ISTATE.TYPING;

// Малюємо робота
function drawBot(f, talking) {
  ix.clearRect(0, 0, IW, IH);
  // фон
  const grad = ix.createLinearGradient(0, 0, 0, IH);
  grad.addColorStop(0, "#06061a");
  grad.addColorStop(1, "#0a1228");
  ix.fillStyle = grad;
  ix.fillRect(0, 0, IW, IH);
  // сітка
  ix.strokeStyle = "rgba(0,180,255,0.06)";
  ix.lineWidth = 1;
  for (let i = 0; i < IW; i += 20) {
    ix.beginPath();
    ix.moveTo(i, 0);
    ix.lineTo(i, IH);
    ix.stroke();
  }
  for (let i = 0; i < IH; i += 20) {
    ix.beginPath();
    ix.moveTo(0, i);
    ix.lineTo(IW, i);
    ix.stroke();
  }

  const cx = 170,
    bob = Math.sin(f * 0.05) * 3;
  const step = Math.sin(f * 0.12) * 12;
  const arm = Math.sin(f * 0.09) * 0.3;

  // тінь
  ix.fillStyle = "rgba(0,150,255,0.08)";
  ix.beginPath();
  ix.ellipse(cx, IH - 18, 22, 5, 0, 0, Math.PI * 2);
  ix.fill();

  // ноги
  ix.fillStyle = "#1a3a6a";
  ix.fillRect(cx - 18, IH - 58 + bob, 12, 28 + step);
  ix.fillRect(cx + 6, IH - 58 + bob, 12, 28 - step);
  // ступні
  ix.fillStyle = "#0d2a52";
  ix.fillRect(cx - 20, IH - 32 + bob + step, 16, 7);
  ix.fillRect(cx + 4, IH - 32 + bob - step, 16, 7);
  // блиск ступень
  ix.fillStyle = "rgba(0,180,255,0.25)";
  ix.fillRect(cx - 19, IH - 32 + bob + step, 14, 2);
  ix.fillRect(cx + 5, IH - 32 + bob - step, 14, 2);

  // тіло
  const bodyY = IH - 115 + bob;
  ix.fillStyle = "#122a5a";
  ix.beginPath();
  ix.roundRect
    ? ix.roundRect(cx - 28, bodyY, 56, 58, 6)
    : ix.fillRect(cx - 28, bodyY, 56, 58);
  ix.fill();
  // ребра тіла
  ix.strokeStyle = "rgba(0,150,255,0.3)";
  ix.lineWidth = 1;
  for (let r = 0; r < 3; r++) {
    ix.beginPath();
    ix.moveTo(cx - 28, bodyY + 10 + r * 14);
    ix.lineTo(cx + 28, bodyY + 10 + r * 14);
    ix.stroke();
  }
  // панель
  ix.fillStyle = "#0a1e44";
  ix.beginPath();
  ix.roundRect
    ? ix.roundRect(cx - 18, bodyY + 8, 36, 28, 3)
    : ix.fillRect(cx - 18, bodyY + 8, 36, 28);
  ix.fill();
  // кнопки
  const btns = [
    ["#ff4455", cx - 10, bodyY + 16],
    ["#ffd700", cx, bodyY + 16],
    ["#44ff99", cx + 10, bodyY + 16],
    ["#00aaff", cx - 5, bodyY + 27],
    ["#ff66ff", cx + 5, bodyY + 27],
  ];
  btns.forEach(([c, bx, by], i) => {
    ix.fillStyle = c;
    ix.beginPath();
    ix.arc(bx, by, 2.5, 0, Math.PI * 2);
    ix.fill();
    if (f % 40 < 20 && Math.floor(f / 40) % 5 === i) {
      ix.fillStyle = c;
      ix.globalAlpha = 0.4;
      ix.beginPath();
      ix.arc(bx, by, 5, 0, Math.PI * 2);
      ix.fill();
      ix.globalAlpha = 1;
    }
  });
  // нашивка UA
  ix.fillStyle = "#1565c0";
  ix.fillRect(cx - 26, bodyY + 2, 14, 8);
  ix.fillStyle = "#ffd700";
  ix.fillRect(cx - 26, bodyY + 6, 14, 4);

  // руки
  ix.save();
  ix.translate(cx - 28, bodyY + 8);
  ix.rotate(-arm - 0.15);
  ix.fillStyle = "#1a3a6a";
  ix.fillRect(-5, -5, 10, 28);
  ix.fillStyle = "#0d2a52";
  ix.beginPath();
  ix.arc(0, 26, 6, 0, Math.PI * 2);
  ix.fill();
  ix.restore();
  ix.save();
  ix.translate(cx + 28, bodyY + 8);
  ix.rotate(arm + 0.15);
  ix.fillStyle = "#1a3a6a";
  ix.fillRect(-5, -5, 10, 28);
  ix.fillStyle = "#0d2a52";
  ix.beginPath();
  ix.arc(0, 26, 6, 0, Math.PI * 2);
  ix.fill();
  ix.restore();

  // шия
  ix.fillStyle = "#0f2248";
  ix.fillRect(cx - 6, bodyY - 10, 12, 12);

  // голова
  const hy = bodyY - 55;
  ix.fillStyle = "#122a5a";
  ix.beginPath();
  ix.roundRect
    ? ix.roundRect(cx - 24, hy, 48, 46, 8)
    : ix.fillRect(cx - 24, hy, 48, 46);
  ix.fill();
  // вуха-динаміки
  ix.fillStyle = "#0a1e44";
  ix.beginPath();
  ix.arc(cx - 24, hy + 20, 7, 0, Math.PI * 2);
  ctx.fill();
  ix.beginPath();
  ix.arc(cx + 24, hy + 20, 7, 0, Math.PI * 2);
  ctx.fill();
  // решітки вух
  ix.strokeStyle = "rgba(0,150,255,0.5)";
  ix.lineWidth = 1;
  for (let d = -4; d <= 4; d += 2) {
    ix.beginPath();
    ix.moveTo(cx - 24 + d, hy + 14);
    ix.lineTo(cx - 24 + d, hy + 26);
    ix.stroke();
    ix.beginPath();
    ix.moveTo(cx + 24 + d, hy + 14);
    ix.lineTo(cx + 24 + d, hy + 26);
    ix.stroke();
  }
  // антена
  ix.strokeStyle = "#4488cc";
  ix.lineWidth = 2;
  ix.beginPath();
  ix.moveTo(cx, hy);
  ix.lineTo(cx, hy - 18);
  ix.stroke();
  const aGlow = 0.5 + 0.5 * Math.sin(f * 0.15);
  ix.fillStyle = `rgba(255,60,100,${aGlow})`;
  ix.beginPath();
  ix.arc(cx, hy - 20, 4, 0, Math.PI * 2);
  ix.fill();
  if (aGlow > 0.8) {
    ix.fillStyle = "rgba(255,60,100,0.2)";
    ix.beginPath();
    ix.arc(cx, hy - 20, 9, 0, Math.PI * 2);
    ix.fill();
  }

  // очі — LED матриці
  const eyeGlow = 0.65 + 0.35 * Math.sin(f * 0.07);
  const eyeX = Math.sin(f * 0.03) * 2;
  [-1, 1].forEach((side, si) => {
    const ex = cx + side * 10;
    ix.fillStyle = "#040e1e";
    ix.fillRect(ex - 7, hy + 8, 14, 12);
    ix.fillStyle = `rgba(0,200,255,${eyeGlow})`;
    ix.fillRect(ex - 5, hy + 10, 10, 8);
    ix.fillStyle = "#fff";
    ix.fillRect(ex - 3 + eyeX, hy + 11, 4, 4);
    // scan line
    const scan = ((f * 0.8) % 12) | 0;
    ix.fillStyle = "rgba(0,255,255,0.2)";
    ix.fillRect(ex - 5, hy + 10 + (scan % 8), 10, 1);
  });

  // рот
  ix.fillStyle = "#040e1e";
  ix.fillRect(cx - 12, hy + 26, 24, 10);
  if (talking) {
    // рот говорить — LED сегменти
    const seg = Math.floor(f * 0.3) % 4;
    ix.fillStyle = "#ff4466";
    if (seg === 0) ix.fillRect(cx - 10, hy + 28, 20, 2);
    else if (seg === 1) {
      ix.fillRect(cx - 10, hy + 28, 20, 2);
      ix.fillRect(cx - 10, hy + 32, 20, 2);
    } else if (seg === 2) ix.fillRect(cx - 8, hy + 28, 16, 5);
    else {
      ix.fillRect(cx - 10, hy + 28, 8, 5);
      ix.fillRect(cx + 2, hy + 28, 8, 5);
    }
    // хвилі звуку
    ix.strokeStyle = "rgba(255,60,100,0.4)";
    ix.lineWidth = 1.5;
    [18, 26, 34].forEach((r, wi) => {
      ix.globalAlpha = 0.5 - wi * 0.15;
      ix.beginPath();
      ix.arc(cx, hy + 31, r, Math.PI, 0);
      ix.stroke();
    });
    ix.globalAlpha = 1;
  } else {
    ix.fillStyle = "#1a3a6a";
    ix.fillRect(cx - 8, hy + 30, 16, 3);
  }

  // голограмний обідок
  const halo = 0.3 + 0.2 * Math.sin(f * 0.04);
  ix.strokeStyle = `rgba(0,200,255,${halo})`;
  ix.lineWidth = 1.5;
  ix.beginPath();
  ix.roundRect
    ? ix.roundRect(cx - 25, hy - 1, 50, 48, 9)
    : ix.strokeRect(cx - 25, hy - 1, 50, 48);
  ix.stroke();
  // підпис
  ix.fillStyle = `rgba(0,200,255,${0.5 + 0.3 * Math.sin(f * 0.05)})`;
  ix.font = "bold 8px monospace";
  ix.textAlign = "center";
  ix.fillText("РОБОТРОН-9000", cx, IH - 6);
  ix.textAlign = "left";
}

// Друкарська машинка по символах
function typeNextChar() {
  if (iState !== ISTATE.TYPING) return;
  const full = STORY[iPhase];
  if (iCharIdx < full.length) {
    iCharIdx++;
    iTypedText = full.slice(0, iCharIdx);
    document.getElementById("introSubtitle").textContent =
      iTypedText + (iCharIdx < full.length ? "▋" : "");
    setTimeout(typeNextChar, full[iCharIdx - 1] === " " ? 60 : 38);
  } else {
    // Фраза повністю набрана на екрані, тепер чекаємо озвучку.
    const fullPhrase = STORY[iPhase];
    document.getElementById("introSubtitle").textContent = fullPhrase;
    iState = ISTATE.PAUSE;

    speakAndWait(fullPhrase).then(() => {
      // невеличка затримка після того, як голос закінчив говорити перед зміною слайду
      setTimeout(() => {
        if (iRaf) advancePhase();
      }, 500);
    });
  }
}

function advancePhase() {
  iPhase++;
  if (iPhase >= STORY.length) {
    finishIntro();
    return;
  }
  iCharIdx = 0;
  iTypedText = "";
  iState = ISTATE.TYPING;
  document.getElementById("introSubtitle").textContent = "";
  setTimeout(typeNextChar, 200);
}

// Говоримо фразу голосом — повертає Promise, що резолвиться лише по закінченню мовлення
function speakAndWait(text) {
  const cleanText = normalizeSpeechText(
    text
      .replace(/Роботрон-9000/g, "Роботрон девʼять тисяч")
      .replace(/Слава Україні/g, "Слава Україні!")
      .replace(/Андрій/g, "Андрій"),
  );

  return new Promise((resolve) => {
    if (playRecordedVoice(cleanText, resolve)) return;
    setTimeout(resolve, Math.max(900, cleanText.length * 60));
  });
}

function iTick() {
  iFr++;
  drawBot(iFr, iState === ISTATE.PAUSE);
  iRaf = requestAnimationFrame(iTick);
}

function finishIntro() {
  if (iRaf) {
    cancelAnimationFrame(iRaf);
    iRaf = null;
  }
  if (iPhaseTimer) {
    clearTimeout(iPhaseTimer);
    iPhaseTimer = null;
  }
  cancelSpeech();
  showScreen("sMenu");
}

document.getElementById("introSkip").onclick = () => {
  focusApp();
  finishIntro();
};

function startIntro() {
  introStarted = true;
  iFr = 0;
  iPhase = 0;
  iCharIdx = 0;
  iTypedText = "";
  iState = ISTATE.TYPING;
  document.getElementById("introSubtitle").textContent = "";
  iRaf = requestAnimationFrame(iTick);
  setTimeout(typeNextChar, 800);
}
function beginIntroAfterGesture() {
  if (introStarted) return;
  startIntro();
}
drawBot(0, false);
document.getElementById("introSubtitle").textContent =
  "Натисни на екран, щоб почати.";
applyLang();

// CUSTOM STORY PATCH
const LEVEL1_INTRO_TEXT =
  "Ого, дивіться! Щось проїжджає дорогою... Цікаво, що це?";
const LEVEL2_DIALOG = [
  "ТЦК: Зупиніться, Андрію!",
  "Андрій: Ні, я побіжу далі!",
  "ТЦК: Тоді наздоженемо!",
  "Андрій: Спробуйте!",
];

export {};

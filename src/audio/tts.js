import { VOICE_CLIPS } from "./voiceManifest.js";

let recordedAudio = null;
let recordedAudioDone = null;
let speechDone = null;

export function cancelSpeech() {
  if (recordedAudio) {
    const onDone = recordedAudioDone;
    recordedAudio.onended = null;
    recordedAudio.onerror = null;
    recordedAudio.pause();
    recordedAudio.currentTime = 0;
    recordedAudio = null;
    recordedAudioDone = null;
    onDone?.();
  }
  if ("speechSynthesis" in window) {
    const onDone = speechDone;
    speechDone = null;
    window.speechSynthesis.cancel();
    onDone?.();
  }
}

const SPEECH_LOCALES = {
  en: "en-US",
  de: "de-DE",
  fr: "fr-FR",
  es: "es-ES",
};

export function playSystemVoice(text, language, onDone) {
  if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
    return false;
  }

  const locale = SPEECH_LOCALES[language];
  if (!locale) return false;

  const voices = window.speechSynthesis.getVoices();
  const languageCode = locale.slice(0, 2).toLowerCase();
  const voice = voices.find((item) => item.lang.toLowerCase() === locale.toLowerCase())
    || voices.find((item) => item.lang.toLowerCase().startsWith(languageCode));

  cancelSpeech();
  const utterance = new SpeechSynthesisUtterance(text);
  let completed = false;
  const finish = () => {
    if (completed) return;
    completed = true;
    speechDone = null;
    onDone();
  };
  utterance.lang = locale;
  if (voice) utterance.voice = voice;
  utterance.rate = 0.94;
  utterance.pitch = 0.82;
  utterance.onend = finish;
  utterance.onerror = finish;
  speechDone = finish;
  window.speechSynthesis.speak(utterance);
  window.setTimeout(finish, Math.max(4000, String(text).length * 130));
  return true;
}

export function normalizeSpeechText(text) {
  return String(text || "")
    .replace(/Роботрон-9000/g, "Роботрон девʼять тисяч")
    .replace(/Роботрон девять тисяч/g, "Роботрон девʼять тисяч")
    .replace(/ТЦК/g, "те це ка")
    .replace(/Києве/g, "Києве")
    .replace(/Слава Україні/g, "Слава Україні")
    .replace(/УРА/g, "Ура")
    .replace(/ПЕРЕМОГА/g, "Перемога")
    .replace(/[.,!?;:…"'“”„«»()[\]{}<>—–-]/g, " ")
    .replace(/[ʼ'`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function playRecordedVoice(text, onDone) {
  const key = normalizeSpeechText(text);
  const src = VOICE_CLIPS[key];
  if (!src) return false;

  cancelSpeech();
  let completed = false;
  let watchdog = null;
  const finish = () => {
    if (completed) return;
    completed = true;
    if (watchdog) window.clearTimeout(watchdog);
    if (recordedAudio) {
      recordedAudio.onended = null;
      recordedAudio.onerror = null;
    }
    recordedAudio = null;
    recordedAudioDone = null;
    onDone();
  };
  recordedAudio = new Audio(src);
  recordedAudioDone = finish;
  recordedAudio.onended = finish;
  watchdog = window.setTimeout(finish, Math.max(5000, key.length * 140));
  recordedAudio.onerror = () => {
    console.warn("Recorded voice file unavailable", src);
    finish();
  };
  recordedAudio.play().catch((err) => {
    console.warn("Recorded voice playback failed", err);
    finish();
  });
  return true;
}

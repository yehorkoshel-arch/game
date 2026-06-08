import { VOICE_CLIPS } from "./voiceManifest.js";

let recordedAudio = null;

export function cancelSpeech() {
  if (recordedAudio) {
    recordedAudio.pause();
    recordedAudio.currentTime = 0;
    recordedAudio = null;
  }
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
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
  utterance.lang = locale;
  if (voice) utterance.voice = voice;
  utterance.rate = 0.94;
  utterance.pitch = 0.82;
  utterance.onend = onDone;
  utterance.onerror = onDone;
  window.speechSynthesis.speak(utterance);
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
  recordedAudio = new Audio(src);
  recordedAudio.onended = () => {
    recordedAudio = null;
    onDone();
  };
  recordedAudio.onerror = () => {
    console.warn("Recorded voice file unavailable", src);
    recordedAudio = null;
    onDone();
  };
  recordedAudio.play().catch((err) => {
    console.warn("Recorded voice playback failed", err);
    recordedAudio = null;
    onDone();
  });
  return true;
}

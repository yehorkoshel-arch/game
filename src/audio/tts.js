import { VOICE_CLIPS } from "./voiceManifest.js";

let recordedAudio = null;

export function cancelSpeech() {
  if (recordedAudio) {
    recordedAudio.pause();
    recordedAudio.currentTime = 0;
    recordedAudio = null;
  }
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

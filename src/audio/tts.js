export const PIPER_TTS_ENABLED = false;

export function setTtsStatus(text) {
  const element = document.getElementById("ttsStatus");
  if (element) element.textContent = text || "";
}

export function showMissingUkrainianVoice() {
  setTtsStatus(
    "Український системний голос не знайдено. Не вмикаю російський fallback.",
  );
}

export function cancelSpeech() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
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

export function pickUkrainianVoice() {
  if (!window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((voice) => {
      const lang = (voice.lang || "").toLowerCase().replace("_", "-");
      return lang === "uk" || lang.startsWith("uk-");
    }) || null
  );
}

export function waitForUkrainianVoice(onReady, onMissing = showMissingUkrainianVoice) {
  const voice = pickUkrainianVoice();
  if (voice) {
    onReady(voice);
    return;
  }
  if (!window.speechSynthesis) {
    onMissing();
    return;
  }
  if (window.speechSynthesis.getVoices().length > 0) {
    onMissing();
    return;
  }
  let done = false;
  const finish = (nextVoice) => {
    if (done) return;
    done = true;
    window.speechSynthesis.onvoiceschanged = null;
    if (nextVoice) onReady(nextVoice);
    else onMissing();
  };
  window.speechSynthesis.onvoiceschanged = () => finish(pickUkrainianVoice());
  setTimeout(() => finish(pickUkrainianVoice()), 700);
}

export function speakTextWithSystemVoice(text, options = {}, onMissing = showMissingUkrainianVoice) {
  if (!window.speechSynthesis) return;
  waitForUkrainianVoice((voice) => {
    const utterance = new SpeechSynthesisUtterance(normalizeSpeechText(text));
    utterance.voice = voice;
    utterance.lang = "uk-UA";
    utterance.rate = options.rate ?? 0.98;
    utterance.pitch = options.pitch ?? 1.25;
    utterance.volume = options.volume ?? 1;
    window.speechSynthesis.speak(utterance);
  }, onMissing);
}

export function speakChunksWithSystemVoice(text, onDone, options = {}) {
  if (!window.speechSynthesis) {
    onDone();
    return;
  }
  cancelSpeech();

  const chunks = [];
  const parts = normalizeSpeechText(text).split(/\s+/);
  let current = "";
  parts.forEach((part) => {
    current += (current ? " " : "") + part;
    if (current.length >= 44) {
      if (current.trim()) chunks.push(current.trim());
      current = "";
    }
  });
  if (current.trim()) chunks.push(current.trim());
  if (chunks.length === 0) {
    onDone();
    return;
  }

  let index = 0;
  function speakChunk() {
    if (index >= chunks.length) {
      onDone();
      return;
    }
    const voice = pickUkrainianVoice();
    if (!voice) {
      waitForUkrainianVoice(
        () => speakChunk(),
        () => {
          showMissingUkrainianVoice();
          setTimeout(onDone, Math.max(1200, text.length * 72));
        },
      );
      return;
    }
    const utterance = new SpeechSynthesisUtterance(chunks[index]);
    utterance.voice = voice;
    utterance.lang = "uk-UA";
    utterance.rate = options.rate ?? 0.92;
    utterance.pitch = options.pitch ?? 0.45;
    utterance.volume = options.volume ?? 1;

    let moved = false;
    const next = () => {
      if (!moved) {
        moved = true;
        index++;
        speakChunk();
      }
    };
    const fallback = setTimeout(next, chunks[index].length * 82 + 900);
    utterance.onend = () => {
      clearTimeout(fallback);
      next();
    };
    utterance.onerror = () => {
      clearTimeout(fallback);
      next();
    };
    window.speechSynthesis.speak(utterance);
  }

  waitForUkrainianVoice(() => speakChunk(), () => {
    showMissingUkrainianVoice();
    setTimeout(onDone, Math.max(1200, text.length * 72));
  });
}

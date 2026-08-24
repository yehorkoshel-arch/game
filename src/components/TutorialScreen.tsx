import { useEffect, useState } from 'react';
import { UI_TEXT } from '../data/gameData.js';

type LanguageCode = keyof typeof UI_TEXT;

function getActiveLanguage(): LanguageCode {
  const activeLang = document.querySelector<HTMLButtonElement>('.lbtn.active')?.dataset.lang;
  return activeLang && activeLang in UI_TEXT ? (activeLang as LanguageCode) : 'uk';
}

export function TutorialScreen() {
  const [visible, setVisible] = useState(false);
  const [language, setLanguage] = useState<LanguageCode>(getActiveLanguage);
  const [legacyReady, setLegacyReady] = useState(
    () => Boolean((window as Window & { __kyivRunnerLegacyReady?: boolean }).__kyivRunnerLegacyReady),
  );

  useEffect(() => {
    const onLegacyReady = () => setLegacyReady(true);
    const onOpenTutorial = () => {
      setLanguage(getActiveLanguage());
      setVisible(true);
    };
    const onLanguageChanged = (event: Event) => {
      const nextLang = (event as CustomEvent<{ lang?: string }>).detail?.lang;
      setLanguage(nextLang && nextLang in UI_TEXT ? (nextLang as LanguageCode) : getActiveLanguage());
    };
    window.addEventListener('kyiv-runner:legacy-ready', onLegacyReady);
    window.addEventListener('kyiv-runner:open-tutorial', onOpenTutorial);
    window.addEventListener('kyiv-runner:language-changed', onLanguageChanged);
    return () => {
      window.removeEventListener('kyiv-runner:legacy-ready', onLegacyReady);
      window.removeEventListener('kyiv-runner:open-tutorial', onOpenTutorial);
      window.removeEventListener('kyiv-runner:language-changed', onLanguageChanged);
    };
  }, []);

  useEffect(() => {
    if (!visible) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return;
      event.preventDefault();
      startGame();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [visible, legacyReady]);

  const startGame = () => {
    if (!legacyReady) return;
    setVisible(false);
    document.getElementById('btnPlay')?.click();
  };

  const closeTutorial = () => setVisible(false);

  if (!visible) return null;

  const copy = UI_TEXT[language] || UI_TEXT.uk;

  return (
    <div className="tutorial-screen" id="tutorial-overlay" role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
      <div className="tutorial-content">
        <h2 id="tutorial-title">{copy.tutorialTitle}</h2>
        <div className="tutorial-steps">
          <div className="step">
            <span className="key">← / →</span>
            <p>{copy.tutorialMove}</p>
          </div>
          <div className="step">
            <span className="key">Space / ↑</span>
            <p>{copy.tutorialJump}</p>
          </div>
          <div className="step">
            <span className="key">↓</span>
            <p>{copy.tutorialSlide}</p>
          </div>
          <div className="step">
            <span className="key">F</span>
            <p>{copy.tutorialFire}</p>
          </div>
          <div className="step">
            <span className="key">E</span>
            <p>{copy.tutorialBackpack || 'Відкрий рюкзак і активуй зібраний бонус.'}</p>
          </div>
          <div className="step">
            <span className="key">Щит / Розгін</span>
            <p>{copy.tutorialShield || 'Щит захищає від удару; на розгоні збирай монети й шукай секретний прохід.'}</p>
          </div>
        </div>
        <div className="tutorial-actions">
          <button className="btn-secondary" type="button" onClick={closeTutorial}>{copy.tutorialClose || 'Закрити'}</button>
          <button className="btn-primary" id="start-game-btn" type="button" onClick={startGame} disabled={!legacyReady}>
            {legacyReady ? copy.tutorialStart : copy.tutorialLoading}
          </button>
        </div>
      </div>
    </div>
  );
}

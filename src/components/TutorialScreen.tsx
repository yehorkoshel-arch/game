import { useEffect, useState } from 'react';

export function TutorialScreen() {
  const [visible, setVisible] = useState(false);
  const [legacyReady, setLegacyReady] = useState(
    () => Boolean((window as Window & { __kyivRunnerLegacyReady?: boolean }).__kyivRunnerLegacyReady),
  );

  useEffect(() => {
    const onLegacyReady = () => setLegacyReady(true);
    const onOpenTutorial = () => setVisible(true);
    window.addEventListener('kyiv-runner:legacy-ready', onLegacyReady);
    window.addEventListener('kyiv-runner:open-tutorial', onOpenTutorial);
    return () => {
      window.removeEventListener('kyiv-runner:legacy-ready', onLegacyReady);
      window.removeEventListener('kyiv-runner:open-tutorial', onOpenTutorial);
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

  if (!visible) return null;

  return (
    <div className="tutorial-screen" id="tutorial-overlay" role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
      <div className="tutorial-content">
        <h2 id="tutorial-title">Навчання</h2>
        <div className="tutorial-steps">
          <div className="step">
            <span className="key">← / →</span>
            <p>Міняй смугу, щоб обходити перешкоди.</p>
          </div>
          <div className="step">
            <span className="key">Space / ↑</span>
            <p>Стрибай через ями, конуси та машини.</p>
          </div>
          <div className="step">
            <span className="key">↓</span>
            <p>Роби слайд під небезпечними перешкодами.</p>
          </div>
          <div className="step">
            <span className="key">F</span>
            <p>Стріляй, коли зброя доступна.</p>
          </div>
        </div>
        <button className="btn-primary" id="start-game-btn" type="button" onClick={startGame} disabled={!legacyReady}>
          {legacyReady ? 'Погнали!' : 'Завантаження...'}
        </button>
      </div>
    </div>
  );
}

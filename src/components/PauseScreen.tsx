export function PauseScreen() {
  return (
    <div id="pausePanel" className="pause-panel" aria-live="polite">
      <div className="pause-panel-title">Пауза</div>
      <div className="pause-panel-stats">Гра призупинена</div>
      <div className="pause-panel-actions">
        <button className="pause-panel-btn primary" id="btnResume" type="button">
          Продовжити
        </button>
        <button className="pause-panel-btn" id="btnRestart" type="button">
          Спочатку
        </button>
        <button className="pause-panel-btn" id="btnPauseMenu" type="button">
          В меню
        </button>
      </div>
    </div>
  );
}

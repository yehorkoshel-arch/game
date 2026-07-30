import { PauseScreen } from './PauseScreen';
import { SecondPlayerCanvas } from './SecondPlayerCanvas';

export function GameScreen() {
  return (
    <div id="sGame" className="screen">
      <div id="multiplayer-container">
        <div className="player-screen player-screen-primary">
          <h3 id="playerOneTitle">{'\u0413\u0440\u0430\u0432\u0435\u0446\u044c 1'}</h3>
          <div className="player-key-hint" id="playerOneHint">A/D · W/Space · S</div>
          <canvas id="gc" width={680} height={420} />
        </div>
        <div className="player-screen player-screen-secondary">
          <h3 id="playerTwoTitle">{'\u0413\u0440\u0430\u0432\u0435\u0446\u044c 2'}</h3>
          <div className="player-key-hint" id="playerTwoHint">↑ jump · ↓ slide</div>
          <SecondPlayerCanvas />
        </div>
      </div>
      <PauseScreen />
      <div id="endPanel" className="end-panel" aria-live="polite">
        <div className="end-panel-title" id="endPanelTitle">Результат</div>
        <div className="end-panel-stats" id="endPanelStats">0 очок · 0 монет</div>
        <div className="end-panel-actions">
          <button className="end-panel-btn primary" id="btnRetryRun" type="button">
            Ще раз
          </button>
          <button className="end-panel-btn" id="btnNextRun" type="button">
            Далі
          </button>
          <button className="end-panel-btn" id="btnEndMenu" type="button">
            В меню
          </button>
        </div>
      </div>
      <div id="hud">
        <div className="hud-l">
          {'\u2665'} <span id="hLives">0</span> &nbsp;&nbsp; <span id="hScore">763</span> <span id="hudPts">очок</span>
        </div>
        <div style={{ color: '#aabbcc', fontSize: '12px', fontWeight: 500 }} id="hudLevel">
          Рівень 1
        </div>
        <div className="hud-coin" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>
            {'\u20b4'} <span id="hCoins">4</span> &nbsp; <span id="hDist" style={{ color: '#aabbcc' }}>704 м до фінішу</span>
          </span>
          <button className="hud-pause-btn" id="btnPauseHud" type="button" title="Пауза (Esc / P)">
            Пауза
          </button>
        </div>
      </div>
      <div id="ctrlbar">
        <button className="cbtn" id="cMenu" style={{ borderColor: '#554', color: '#aa9' }} type="button">
          {'\u2630'} Меню
        </button>
        <button className="cbtn" id="btnPause" style={{ borderColor: '#ffd700', color: '#ffd700' }} type="button" title="Пауза (Esc / P)">
          Пауза
        </button>
        <button className="cbtn" id="cLeft" type="button">
          {'\u25c0'} Ліво
        </button>
        <button className="cbtn" id="cJump" type="button">
          {'\u25b2'} Стрибок
        </button>
        <button className="cbtn" id="cSlide" type="button">
          {'\u25bc'} Слайд
        </button>
        <button className="cbtn" id="cRight" type="button">
          Право {'\u25b6'}
        </button>
        <button className="cbtn" id="cFire" style={{ borderColor: '#665522', color: '#ffd76a' }} type="button">
          Вогонь
        </button>
        <button className="cbtn" id="cBonus" style={{ borderColor: '#41666e', color: '#9ee8ff' }} type="button">
          Бонус
        </button>
      </div>
    </div>
  );
}

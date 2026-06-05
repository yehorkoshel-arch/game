export function GameScreen() {
  return (
    <div id="sGame" className="screen">
      <canvas id="gc" width={680} height={420} />
      <div id="hud">
        <div className="hud-l">
          {"\u2665"} <span id="hLives">0</span> &nbsp;&nbsp; <span id="hScore">763</span> <span id="hudPts">очок</span>
        </div>
        <div style={{ color: '#aabbcc', fontSize: '12px', fontWeight: 500 }} id="hudLevel">
          Рівень 1
        </div>
        <div className="hud-coin">
          {"\u20b4"} <span id="hCoins">4</span> &nbsp; <span id="hDist" style={{ color: '#aabbcc' }}>704 м до фінішу</span>
        </div>
      </div>
      <div id="ctrlbar">
        <button className="cbtn" id="cMenu" style={{ borderColor: '#554', color: '#aa9' }} type="button">
          {"\u2630"} Меню
        </button>
        <button className="cbtn" id="cLeft" type="button">
          {"\u25c0"} Ліво
        </button>
        <button className="cbtn" id="cJump" type="button">
          {"\u25b2"} Стрибок
        </button>
        <button className="cbtn" id="cSlide" type="button">
          {"\u25bc"} Слайд
        </button>
        <button className="cbtn" id="cRight" type="button">
          Право {"\u25b6"}
        </button>
        <button className="cbtn" id="cFire" style={{ borderColor: '#665522', color: '#ffd76a' }} type="button">
          Вогонь
        </button>
      </div>
    </div>
  );
}

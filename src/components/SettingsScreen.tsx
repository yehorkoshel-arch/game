export function SettingsScreen() {
  return (
    <div id="sSettings" className="screen">
      <div className="settings-header">
        <div className="settings-header-title" id="settingsTitle">
          Налаштування
        </div>
      </div>
      <div className="settings-body">
        <div className="srow">
          <div>
            <div className="srow-label" id="sLblDiff">Складність</div>
            <div className="srow-desc" id="sDescDiff">Впливає на швидкість та частоту перешкод</div>
          </div>
          <div className="seg" id="segDiff">
            <button className="seg-btn" data-val="easy" type="button">Легка</button>
            <button className="seg-btn active" data-val="normal" type="button">Норм</button>
            <button className="seg-btn" data-val="hard" type="button">Важка</button>
          </div>
        </div>
        <div className="srow">
          <div>
            <div className="srow-label" id="sLblLives">Початкові життя</div>
            <div className="srow-desc" id="sDescLives">Кількість спроб за забіг</div>
          </div>
          <div className="seg" id="segLives">
            <button className="seg-btn" data-val="2" type="button">2</button>
            <button className="seg-btn active" data-val="3" type="button">3</button>
            <button className="seg-btn" data-val="5" type="button">5</button>
          </div>
        </div>
        <div className="srow">
          <div>
            <div className="srow-label" id="sLblDist">Довжина траси</div>
            <div className="srow-desc" id="sDescDist">Відстань до фінішу</div>
          </div>
          <div className="seg" id="segDist">
            <button className="seg-btn" data-val="400" type="button">400 м</button>
            <button className="seg-btn active" data-val="800" type="button">800 м</button>
            <button className="seg-btn" data-val="1400" type="button">1400 м</button>
          </div>
        </div>
        <div className="srow music-settings-row">
          <div className="music-settings-copy">
            <div className="srow-label" id="sLblSound">Музика</div>
            <div className="srow-desc" id="sDescSound">Оберіть фонову мелодію</div>
          </div>
          <button className="tog off" id="togSound" type="button" aria-label="Увімкнути музику" />
          <div className="music-track-picker">
            <div className="seg" id="segMusic">
              <button className="seg-btn" data-val="kyiv" type="button">
                Як тебе не любити, Києве мій
              </button>
              <button className="seg-btn" data-val="march" type="button">
                Шалійте, шалійте, скажені кати
              </button>
            </div>
          </div>
        </div>
        <div className="srow">
          <div>
            <div className="srow-label" id="sLblVib">Вібрація</div>
            <div className="srow-desc" id="sDescVib">Вібрація при зіткненні</div>
          </div>
          <button className="tog off" id="togVib" type="button" />
        </div>
      </div>
      <div className="settings-footer">
        <button className="mbtn-back" id="btnBackSettings" type="button">
          Повернутись до меню
        </button>
      </div>
    </div>
  );
}

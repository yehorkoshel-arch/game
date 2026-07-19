import { DancingAndrii } from './DancingAndrii';

export function MenuScreen() {
  const showDebugPanel = false;

  return (
    <div id="sMenu" className="screen">
      <div id="menuTimeBadge" className="menu-time-badge">
        День
      </div>
      <DancingAndrii />
      <button className="gear-btn" id="btnSettingsOpen" title="Налаштування" type="button">
        ⚙
      </button>
      <button className="quest-icon-btn" id="btnQuestsOpen" title="Квести" type="button">
        ✓
        <span id="questReadyBadge" className="quest-ready-badge">0</span>
      </button>
      <button className="achievement-icon-btn" id="btnAchievementsOpen" title="Досягнення" type="button">
        ★
        <span id="achievementReadyBadge" className="quest-ready-badge">0</span>
      </button>
      <button className="collection-icon-btn" id="btnCollectionOpen" title="Колекція" type="button">
        ◧
      </button>
      <div className="lang-bar">
        <button className="lbtn active" data-lang="uk" type="button">
          UA
        </button>
        <button className="lbtn" data-lang="en" type="button">
          EN
        </button>
        <button className="lbtn" data-lang="de" type="button">
          DE
        </button>
        <button className="lbtn" data-lang="fr" type="button">
          FR
        </button>
        <button className="lbtn" data-lang="es" type="button">
          ES
        </button>
      </div>
      <div className="title">KYIV RUNNER</div>
      <div className="sub" id="menuSub">
        вулицями столиці
      </div>
      <button className="mbtn mbtn-play" id="btnPlay" type="button">
        ГРАТИ
      </button>
      <button className="mbtn mbtn-shop" id="btnShopOpen" type="button">
        МАГАЗИН
      </button>
      <button className="mbtn mbtn-backpack" id="btnBackpackOpen" type="button">
        🎒 Рюкзак
      </button>
      <div className="loc-tabs" id="locTabs">
        <button className="loc-tab active" data-loc="0" type="button">
          🇺🇦 Київ
        </button>
        <button className="loc-tab" data-loc="1" type="button">
          🦁 Львів
        </button>
      </div>
      <div
        className="lvl-bar"
        id="lvlBar"
        style={{
          flexWrap: 'wrap',
          justifyContent: 'center',
          maxWidth: '380px',
          maxHeight: '90px',
          overflowY: 'auto',
        }}
      />
      {showDebugPanel ? (
        <div className="debug-level-panel">
          <div className="debug-level-title">Швидка перевірка</div>
          <div className="debug-preset-grid" id="debugPresetBar" />
          <div className="debug-level-grid" id="debugLevelBar" />
        </div>
      ) : null}
      <div style={{ marginTop: '14px', fontSize: '12px', color: '#556677' }}>
        <span id="menuCoinsLabel">Монети</span>: <span id="menuCoins" style={{ color: '#ffd700' }}>396</span> ₴
      </div>
    </div>
  );
}

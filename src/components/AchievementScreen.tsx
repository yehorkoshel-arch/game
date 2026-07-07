export function AchievementScreen() {
  return (
    <div id="sAchievements" className="screen">
      <header className="quest-header">
        <div>
          <div className="quest-header-title">Досягнення</div>
          <div className="quest-header-subtitle">Особливі цілі Андрія</div>
        </div>
        <div className="quest-header-reward">Бейджі</div>
      </header>
      <div className="quest-body">
        <div id="achievementList" className="achievement-list" />
      </div>
      <footer className="quest-footer">
        <button className="mbtn-back" id="btnBackAchievements" type="button">
          ← До меню
        </button>
      </footer>
    </div>
  );
}

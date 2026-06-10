export function QuestScreen() {
  return (
    <div id="sQuests" className="screen">
      <header className="quest-header">
        <div>
          <div className="quest-header-title">Квести</div>
          <div className="quest-header-subtitle">Виконай усі 10 завдань</div>
        </div>
        <div className="quest-header-reward">100 ₴ за квест</div>
      </header>
      <div className="quest-body">
        <div id="questList" className="quest-list" />
      </div>
      <footer className="quest-footer">
        <button className="mbtn-back" id="btnBackQuests" type="button">
          ← До меню
        </button>
      </footer>
    </div>
  );
}

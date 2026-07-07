export function BackpackScreen() {
  return (
    <div id="sBackpack" className="screen">
      <div className="backpack-panel">
        <div className="backpack-title">🎒 Рюкзак бонусів</div>
        <div className="backpack-sub">
          Зберігай магніт, щит і супер-стрибок, а під час гри активуй кнопкою E.
        </div>
        <div className="backpack-slots" id="backpackSlotsPreview">
          <div className="backpack-slot">M</div>
          <div className="backpack-slot">S</div>
        </div>
        <div className="backpack-info" id="backpackInfo">
          Слотів: 2 / 3
        </div>
        <button className="mbtn mbtn-play" id="btnBackpackUpgrade" type="button">
          Відкрити 3-й слот
        </button>
        <button className="mbtn-back" id="btnBackBackpack" type="button">
          Назад
        </button>
      </div>
    </div>
  );
}

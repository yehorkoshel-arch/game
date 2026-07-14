export function CollectionScreen() {
  return (
    <div id="sCollection" className="screen">
      <header className="quest-header">
        <div>
          <div className="quest-header-title">Колекція</div>
          <div className="quest-header-subtitle">Листівки Києва та Львова</div>
        </div>
        <div id="collectionCount" className="quest-header-reward">0/0</div>
      </header>
      <div className="quest-body">
        <div id="collectionList" className="collection-list" />
      </div>
      <footer className="quest-footer">
        <button className="mbtn-back" id="btnBackCollection" type="button">
          ← До меню
        </button>
      </footer>
    </div>
  );
}

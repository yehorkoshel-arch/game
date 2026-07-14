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
      <div id="postcardViewer" className="postcard-viewer" aria-hidden="true">
        <div className="postcard-viewer-panel">
          <button className="postcard-viewer-close" id="btnClosePostcard" type="button">
            ×
          </button>
          <div id="postcardViewerArt" className="postcard-viewer-art">?</div>
          <div className="postcard-viewer-copy">
            <div id="postcardViewerCity" className="postcard-viewer-city" />
            <div id="postcardViewerTitle" className="postcard-viewer-title" />
            <div id="postcardViewerDesc" className="postcard-viewer-desc" />
          </div>
        </div>
      </div>
      <footer className="quest-footer">
        <button className="mbtn-back" id="btnBackCollection" type="button">
          ← До меню
        </button>
      </footer>
    </div>
  );
}

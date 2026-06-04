export function ShopScreen() {
  return (
    <div id="sShop" className="screen">
      <div className="shop-header">
        <div className="shop-header-title" id="shopTitle">
          Магазин скінів
        </div>
        <div className="shop-coins-badge">
          ₴ <span id="shopCoins">396</span>
        </div>
      </div>
      <div className="shop-body">
        <div className="shop-grid" id="shopGrid">
          <div className="sitem owned selected">
            <canvas width={52} height={62} />
            <div className="sitem-name">Школяр</div>
            <div className="sitem-owned">✓ Обрано</div>
          </div>
          <div className="sitem">
            <canvas width={52} height={62} />
            <div className="sitem-name">Ніндзя</div>
            <div className="sitem-price">100₴</div>
          </div>
          <div className="sitem">
            <canvas width={52} height={62} />
            <div className="sitem-name">Козак</div>
            <div className="sitem-price">180₴</div>
          </div>
        </div>
      </div>
      <div className="shop-footer">
        <button className="mbtn-back" id="btnBackShop" type="button">
          ← Повернутись до меню
        </button>
      </div>
    </div>
  );
}

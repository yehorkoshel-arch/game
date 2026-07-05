# Handoff для продовження розробки гри

Дата: 2026-07-05
Репозиторій: `yehorkoshel-arch/game`
Локальна папка: `C:\Users\Yehor\Documents\Codex\2026-06-03\github-repo\work\game`

## Поточний стан

- Останній коміт: `c139198 Add waving people in city windows`.
- Гілка була синхронна з `origin/main` перед останньою незавершеною роботою.
- Є незакомічені зміни у `src/legacy/game.js`.
- Ці зміни почали фічу:
  - реакції міста;
  - бонусні монети з вікон;
  - секретний дід з балкона з прапором;
  - апгрейди зброї в магазині.

## Важливо

Незакомічена фіча ще не завершена. Не робити commit/push, поки не дороблено і не пройшла збірка.

Перевірити стан:

```powershell
git status --short --branch
git diff -- src/legacy/game.js
```

## Що вже додано в незакомічених змінах

У `src/legacy/game.js` уже частково додано:

- `weaponUpgrades` у збереження:
  - `fireRate`
  - `damage`
  - `laser`
- масив `WEAPON_UPGRADES` з цінами:
  - швидкий мініган: `450`
  - потужні кулі: `650`
  - лазерний бластер: `900`
- новий масив стану `cityGifts`;
- функцію `spawnCityGift(secret = false)`;
- функцію `drawBalconyGrandpa(...)`;
- скидання `cityGifts` при старті рівня, story-сцені та бос-сцені.

## Що треба доробити

1. Доробити малювання бонусів міста:
   - додати `drawCityGift(gift)`;
   - викликати `cityGifts.forEach(drawCityGift)` у `loop()` поруч із монетами.

2. Доробити рух і збір бонусів:
   - у `update()` рухати `cityGifts`;
   - фільтрувати подарунки за `life`;
   - при зіткненні з Андрієм додавати `gift.value` до `runCoins`;
   - викликати `addQuestProgress("coins", gift.value)`, `sfxCoin()`, `addParts(...)`, `hudUp()`.

3. Додати періодичний спавн:
   - звичайний подарунок з вікон раз на кілька секунд;
   - рідше `spawnCityGift(true)` для діда з балкона.

4. Доробити магазин апгрейдів:
   - після списку скінів додати окремий блок “Покращення зброї”;
   - для кожного `WEAPON_UPGRADES` показати назву, опис, ціну або “Куплено”;
   - при покупці списувати монети, ставити `weaponUpgrades[id] = true`, зберігати гру.

5. Підключити апгрейди до зброї:
   - `fireRate`: зменшити `fireCooldown` для `minigun` і `machinegun`;
   - `damage`: збільшити damage по boss-босу;
   - `laser`: додати тип кулі `laser`, довший hitbox і інший вигляд у `drawBullets`.

6. Перевірити місце в diff біля boss-сцени:
   - зараз у diff видно змінений блок:
     ```js
     obs = [];
       coins = [];
       cityGifts = [];
     ```
   - треба вирівняти відступи й переконатись, що синтаксис не зламаний.

## Команди перевірки

```powershell
node --check src/legacy/game.js
npm.cmd run build
git diff --check
```

Якщо все добре:

```powershell
git add src/legacy/game.js src/styles/global.css
git commit -m "Add city reactions and weapon upgrades"
```

Push користувач часто робить вручну, але якщо попросить:

```powershell
git push origin main
```

## Попередні важливі коміти

- `c139198` — люди у вікнах махають Андрію.
- `4d860a8` — виправлення збережень, lifecycle і стабільної збірки.
- `0acbfd6` — фікс фінішу в Києві.
- `c7a5117` — мініган влучає по цілях у Львові через смуги.
- `fc6bd4a` — фікси маршруту й діалогів у Львові.

## Короткий промпт для нового чату

Продовж розробку гри в `C:\Users\Yehor\Documents\Codex\2026-06-03\github-repo\work\game`. Прочитай `HANDOFF.md`, перевір `git status` і `git diff`. Треба доробити незавершену фічу: реакції міста, бонусні монети з вікон, секретний дід з балкона і апгрейди зброї в магазині. Не пушити без окремого прохання.

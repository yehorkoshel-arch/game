# Handoff для продовження розробки гри

Дата оновлення: 2026-07-15
Репозиторій: `yehorkoshel-arch/game`
Локальна папка: `C:\Users\Yehor\Documents\Codex\2026-06-03\github-repo\work\game`

## Поточний стан

- Проєкт: Vite + React + TypeScript, основна логіка гри все ще у `src/legacy/game.js`.
- Деплой: GitHub Pages через `.github/workflows/pages.yml`.
- GitHub Pages URL: `https://yehorkoshel-arch.github.io/game/`.
- Гілка `main` синхронна з `origin/main` на момент оновлення handoff.
- Робоче дерево було чисте перед оновленням цього файлу.
- Останні коміти:
  - `aa4b74f Update game.js`
  - `8cb2088 Update IntroScreen.tsx`
  - `1157ec0 Update game.js`
  - `625aaff Update game.js`
  - `f2dd0e0 Update voiceManifest.js`
  - `840e261 Роботрон`

## Як перевіряти

```powershell
cd C:\Users\Yehor\Documents\Codex\2026-06-03\github-repo\work\game
git status --short --branch
node --check src/legacy/game.js
npm.cmd run build
```

Для голосових файлів:

```powershell
node --input-type=module -e "import fs from 'node:fs'; import { VOICE_CLIPS } from './src/audio/voiceManifest.js'; const missing = Object.entries(VOICE_CLIPS).filter(([,src]) => !fs.existsSync('public' + src.replace('/game',''))); if (missing.length) { console.error(missing); process.exit(1); } console.log('Voice files OK:', Object.keys(VOICE_CLIPS).length);"
```

## Важливе про файл `game.js`

`src/legacy/game.js` має проблемне старе кодування. `apply_patch` часто падає з `invalid utf-8`.

Для редагування цього файлу краще використовувати PowerShell:

```powershell
$path = 'src\legacy\game.js'
$enc = [System.Text.Encoding]::Default
$lines = [System.Collections.Generic.List[string]]::new()
[System.IO.File]::ReadAllLines($path, $enc) | ForEach-Object { [void]$lines.Add($_) }
# редагування рядків
[System.IO.File]::WriteAllLines($path, $lines, $enc)
```

Нові українські рядки у `game.js` краще додавати через `\u....`, щоб не отримати mojibake.

## Остання важлива зона: запуск гри та Роботрон

Проблема: на iPad/Safari користувач міг бачити інтро або `...`, але не міг зайти в гру.

Що зроблено:

- `IntroScreen.tsx`: кнопка інтро тепер `▶ Увійти в гру`.
- `src/legacy/game.js`:
  - `handleAppGesture(event)` слухає `pointerdown`, `click`, `touchstart`;
  - клік по `#introSkip` не запускає інтро повторно;
  - `introSkip.onclick` робить `stopPropagation`, `focusApp()`, `finishIntro()`;
  - `beginIntroAfterGesture()` має guard через `introStarted`;
  - автостарт інтро через `introAutoStartTimer` запускається лише якщо `sIntro` активний і інтро ще не стартувало.

Перевірка конфлікту запуску:

- `touchstart/pointerdown/click` можуть прийти разом, але повторний старт блокується `introStarted`.
- Кнопка входу відсікається через `skipPressed`.
- `npm.cmd run build` проходить.

## Роботрон і голос

Файли:

- `src/audio/voiceManifest.js`
- `src/audio/tts.js`
- `public/audio/voice/robot_intro_*.mp3`
- `src/legacy/game.js`

Що важливо:

- Усі 11 інтро-фраз Роботрона мають mp3.
- Для `Слава Україні` додано окремий ключ у manifest без прапора, щоб нормалізація тексту знаходила файл.
- У `drawBot()` виправляли неправильний canvas context: всередині intro robot renderer має бути `ix.fill()` / `ix.stroke()`, не `ctx.fill()`.
- `drawBot wrong ctx calls` має бути `0`, якщо перевіряти блок `drawBot`.

## Поточні реалізовані фічі

У грі вже є багато фіч, які користувач просив по ходу:

- Київ і Львів з різними дорогами.
- Дощовий Київ, сонячні/міські варіанти, вибір часу доби в меню.
- Дорога з перспективою, смугами, стрілками руху, конусами, ямами, калюжами, трафіком.
- Львівська бруківка, кав'ярня, будинки, трамвай.
- Роботрон на інтро, голосові репліки, скін `Неоновий Роботрон`, танець з Андрієм.
- Марічка: модель, історія з проєктом, озвучені фрази, участь у фіналі школи.
- Магазин скінів і апгрейдів.
- Рюкзак бонусів.
- Квести, ланцюжок Марічки, досягнення/колекція.
- Міні-мапа/прогрес рівня.
- Зброя: пістолет у Львові, мініган, апгрейди зброї.
- Київський бос-машина/трансформер.
- Секретні маршрути: метро/тунелі/дахи/переходи.
- Фініш зі школою: Андрій заходить у школу.

## Типові ризики

1. GitHub Pages cache:
   - після push відкривати з query string, наприклад:
     `https://yehorkoshel-arch.github.io/game/?v=<commit>`
   - на iPad/Safari може триматися старий bundle.

2. Голосові файли:
   - не додавати ключ у `voiceManifest.js`, якщо mp3 не існує в `public/audio/voice`.
   - якщо згенеровано нові mp3, перевірити manifest.

3. `game.js` encoding:
   - не переписувати весь файл через UTF-8 без перевірки.
   - після редагування завжди `node --check src/legacy/game.js`.

4. Не робити push без прохання користувача.
   - користувач часто просить: "commit", "push", або "Push робимо руками, ти тільки commit".
   - Якщо не просив push, не пушити.

## Рекомендований наступний крок

Якщо користувач знову каже, що не може зайти:

1. Перевірити deployed commit або попросити/перевірити Actions.
2. Дати URL з cache bust:
   `https://yehorkoshel-arch.github.io/game/?v=<останній_commit>`
3. Якщо проблема лишається, тимчасово додати debug text на intro:
   - показувати `introStarted`, `iState`, `iPhase`;
   - або зробити кнопку `Увійти в гру` повністю незалежною від intro logic: напряму `showScreen("sMenu")`, `cancelSpeech()`, `cancelAnimationFrame(iRaf)`.

## Короткий промпт для нового чату

Продовж розробку гри в `C:\Users\Yehor\Documents\Codex\2026-06-03\github-repo\work\game`. Спочатку прочитай `HANDOFF.md`, перевір `git status --short --branch`, `node --check src/legacy/game.js` і `npm.cmd run build`. Основна логіка в `src/legacy/game.js`, файл має проблемне кодування, тому редагуй його обережно через PowerShell Encoding.Default. Не пушити без окремого прохання.

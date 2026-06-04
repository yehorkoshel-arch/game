# Kyiv Runner

Гра перенесена на мінімальну структуру Vite + React + TypeScript.

## Структура

- `index.html` - точка входу Vite і import map для browser TTS.
- `src/App.tsx` - основна React-збірка екранів і підключення ігрової логіки після монтування.
- `src/components/` - окремі React-компоненти екранів гри.
- `src/data/gameData.js` - тексти інтерфейсу, скіни та назви локацій.
- `src/levels/levelFactory.js` - генерація рівнів, палітр трас і наборів перешкод.
- `src/state/saveState.js` - читання та запис прогресу гри в браузері.
- `src/ui/dom.js` - невеликі DOM-helper-и для фокуса, екранів і тексту.
- `src/main.tsx` - запуск React.
- `src/styles/global.css` - стилі гри.
- `src/legacy/game.js` - поточна JavaScript-логіка гри без переписування.
- `vite.config.ts` - base path `/game/` для GitHub Pages.
- `.github/workflows/pages.yml` - збірка `dist` і деплой на GitHub Pages.

## Команди

```bash
npm install
npm run dev
npm run build
```

Наступний крок реструктуризації: поступово винести ігрову логіку з `src/legacy/game.js` у модулі `audio`, `levels`, `render` і `state`.

# Kyiv Runner

Гра перенесена на мінімальну структуру Vite + React + TypeScript.

## Структура

- `index.html` - точка входу Vite і import map для browser TTS.
- `src/App.tsx` - React-обгортка HTML-розмітки гри.
- `src/main.tsx` - запуск React і підключення ігрової логіки.
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

Наступний крок реструктуризації: поступово винести ігрову логіку з `src/legacy/game.js` у модулі `audio`, `levels`, `render`, `state` і React-компоненти.

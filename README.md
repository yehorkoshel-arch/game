# Kyiv Runner

Гра перенесена на мінімальну структуру Vite + React + TypeScript.

## Структура

- `index.html` - точка входу Vite і import map для browser TTS.
- `src/App.tsx` - основна React-збірка екранів і підключення ігрової логіки після монтування.
- `src/components/` - окремі React-компоненти екранів гри.
- `src/data/gameData.js` - тексти інтерфейсу, скіни та назви локацій.
- `src/levels/levelFactory.js` - генерація рівнів, палітр трас і наборів перешкод.
- `src/audio/tts.js` - українська системна озвучка і прапорець експериментального Piper TTS.
- `src/audio/voiceManifest.js` - manifest готових аудіофайлів для реплік.
- `public/audio/voice/` - місце для `.webm`/`.mp3`/`.wav` озвучки.
- `public/voice-recorder.html` - сторінка для запису реплік через мікрофон.
- `src/state/saveState.js` - читання та запис прогресу гри в браузері.
- `src/ui/dom.js` - невеликі DOM-helper-и для фокуса, екранів і тексту.
- `src/main.tsx` - запуск React.
- `src/styles/global.css` - стилі гри.
- `src/legacy/game.js` - поточна JavaScript-логіка гри без переписування.
- `vite.config.ts` - base path `/game/` для GitHub Pages.
- `.github/workflows/pages.yml` - збірка `dist` і деплой на GitHub Pages.

## Команди

```bash
cd C:\Users\Yehor\Documents\Codex\2026-06-03\github-repo\work\game
npm install
npm run dev
npm run build
npm run voice:generate
```

Для цих команд потрібен звичайний Node.js LTS з npm у системному PATH.
`npm run voice:generate` генерує `.mp3` для всіх реплік через Edge TTS голос `uk-UA-OstapNeural` і оновлює `src/audio/voiceManifest.js`.
Для жіночого голосу можна запустити `npm run voice:generate:female`.

Наступний крок реструктуризації: поступово винести ігрову логіку з `src/legacy/game.js` у модулі `audio`, `levels`, `render` і `state`.

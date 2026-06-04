export function IntroScreen() {
  return (
    <div id="sIntro" className="screen active">
      <canvas id="introCanvas" width={340} height={220} />
      <div id="introSubtitle">...</div>
      <div id="ttsStatus" />
      <button id="introSkip" type="button">
        ▶ Пропустити
      </button>
    </div>
  );
}

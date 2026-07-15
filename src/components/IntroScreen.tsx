export function IntroScreen() {
  return (
    <div id="sIntro" className="screen active">
      <canvas id="introCanvas" width={340} height={220} />
      <div id="introSubtitle">...</div>
      <button id="introSkip" type="button">
        ▶ Увійти в гру
      </button>
    </div>
  );
}

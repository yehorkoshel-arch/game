export function IntroScreen() {
  const enterGame = () => {
    (window as Window & { __kyivRunnerFinishIntroRequested?: boolean }).__kyivRunnerFinishIntroRequested = true;
    window.dispatchEvent(new Event("kyiv-runner:finish-intro"));
  };

  return (
    <div id="sIntro" className="screen active">
      <canvas id="introCanvas" width={340} height={220} />
      <div id="introSubtitle">...</div>
      <button id="introSkip" type="button" onClick={enterGame}>
        ▶ Увійти в гру
      </button>
    </div>
  );
}

export function IntroScreen() {
  const enterGame = () => {
    document.querySelectorAll(".screen").forEach((screen) => {
      screen.classList.remove("active");
    });
    document.getElementById("sMenu")?.classList.add("active");
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

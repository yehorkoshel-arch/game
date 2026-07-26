import { useEffect } from 'react';

export function IntroScreen() {
  useEffect(() => {
    const canvas = document.getElementById('introCanvas') as HTMLCanvasElement | null;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let frame = 0;
    let raf = 0;
    const drawFallbackRobotron = () => {
      frame += 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = 92 + Math.sin(frame * 0.04) * 3;
      const glow = 0.28 + Math.sin(frame * 0.05) * 0.08;

      const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
      bg.addColorStop(0, '#101a34');
      bg.addColorStop(1, '#0a0d1e');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = `rgba(0, 200, 255, ${glow})`;
      ctx.lineWidth = 1;
      for (let x = 26; x < canvas.width; x += 28) {
        ctx.beginPath();
        ctx.moveTo(x, 20);
        ctx.lineTo(x, canvas.height - 18);
        ctx.stroke();
      }
      for (let y = 24; y < canvas.height; y += 22) {
        ctx.beginPath();
        ctx.moveTo(20, y);
        ctx.lineTo(canvas.width - 20, y);
        ctx.stroke();
      }

      ctx.shadowColor = '#00d9ff';
      ctx.shadowBlur = 18;
      ctx.fillStyle = '#196fd0';
      ctx.fillRect(cx - 35, cy - 44, 70, 44);
      ctx.fillRect(cx - 27, cy + 10, 54, 58);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#34eaff';
      ctx.fillRect(cx - 20, cy - 31, 13, 12);
      ctx.fillRect(cx + 7, cy - 31, 13, 12);
      ctx.fillStyle = '#071526';
      ctx.fillRect(cx - 16, cy - 27, 5, 5);
      ctx.fillRect(cx + 11, cy - 27, 5, 5);

      ctx.strokeStyle = '#071526';
      ctx.lineWidth = 4;
      ctx.strokeRect(cx - 12, cy - 9, 24, 8);

      ctx.strokeStyle = '#00d9ff';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(cx - 18, cy + 68);
      ctx.lineTo(cx - 18, cy + 96);
      ctx.moveTo(cx + 18, cy + 68);
      ctx.lineTo(cx + 18, cy + 96);
      ctx.stroke();

      ctx.fillStyle = '#ffd93b';
      ctx.fillRect(cx - 20, cy + 21, 15, 7);
      ['#ff3d71', '#ffd93b', '#27f58a', '#00e5ff'].forEach((color, index) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(cx - 8 + index * 11, cy + 39, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.strokeStyle = '#00d9ff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 44);
      ctx.lineTo(cx, cy - 64);
      ctx.stroke();
      ctx.fillStyle = '#ff3d71';
      ctx.beginPath();
      ctx.arc(cx, cy - 68, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#00d9ff';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('ROBOTRON-9000', cx, canvas.height - 16);
      ctx.textAlign = 'left';

      raf = window.requestAnimationFrame(drawFallbackRobotron);
    };

    drawFallbackRobotron();
    return () => window.cancelAnimationFrame(raf);
  }, []);

  const enterGame = () => {
    (window as Window & { __kyivRunnerFinishIntroRequested?: boolean }).__kyivRunnerFinishIntroRequested = true;
    window.dispatchEvent(new Event("kyiv-runner:finish-intro"));
  };

  return (
    <div id="sIntro" className="screen active">
      <canvas id="introCanvas" width={340} height={220} />
      <div id="introSubtitle">Натисни на екран, щоб почати.</div>
      <button id="introSkip" type="button" onClick={enterGame}>
        ▶ Увійти в гру
      </button>
    </div>
  );
}

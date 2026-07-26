import { useEffect } from 'react';

export function IntroScreen() {
  useEffect(() => {
    const canvas = document.getElementById('introCanvas') as HTMLCanvasElement | null;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let frame = 0;
    let raf = 0;
    let stopped = false;
    const stopFallback = () => {
      stopped = true;
      if (raf) window.cancelAnimationFrame(raf);
    };
    const roundedRect = (x: number, y: number, width: number, height: number, radius: number) => {
      if (ctx.roundRect) {
        ctx.roundRect(x, y, width, height, radius);
        return;
      }
      ctx.rect(x, y, width, height);
    };
    const drawFallbackRobotron = () => {
      if (stopped) return;
      frame += 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2 + 74;
      const cy = 108 + Math.sin(frame * 0.04) * 3;
      const glow = 0.28 + Math.sin(frame * 0.05) * 0.08;

      const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
      bg.addColorStop(0, '#171a38');
      bg.addColorStop(1, '#0b0d22');
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
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#123b88';
      ctx.beginPath();
      roundedRect(cx - 22, cy - 52, 44, 34, 7);
      ctx.fill();
      ctx.beginPath();
      roundedRect(cx - 25, cy - 7, 50, 50, 5);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#34eaff';
      ctx.fillRect(cx - 13, cy - 41, 9, 8);
      ctx.fillRect(cx + 4, cy - 41, 9, 8);
      ctx.fillStyle = '#071526';
      ctx.fillRect(cx - 10, cy - 38, 3, 3);
      ctx.fillRect(cx + 7, cy - 38, 3, 3);

      ctx.strokeStyle = '#071526';
      ctx.lineWidth = 3;
      ctx.strokeRect(cx - 9, cy - 25, 18, 7);

      ctx.strokeStyle = '#00d9ff';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(cx - 15, cy + 43);
      ctx.lineTo(cx - 15, cy + 70);
      ctx.moveTo(cx + 15, cy + 43);
      ctx.lineTo(cx + 15, cy + 70);
      ctx.stroke();

      ctx.fillStyle = '#ffd93b';
      ctx.fillRect(cx - 18, cy + 4, 12, 7);
      ['#ff3d71', '#ffd93b', '#27f58a', '#00e5ff'].forEach((color, index) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(cx - 10 + index * 7, cy + 20, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.strokeStyle = '#00d9ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 52);
      ctx.lineTo(cx, cy - 67);
      ctx.stroke();
      ctx.fillStyle = '#ff3d71';
      ctx.beginPath();
      ctx.arc(cx, cy - 71, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#123b88';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      const arm = Math.sin(frame * 0.08) * 5;
      ctx.beginPath();
      ctx.moveTo(cx - 25, cy + 2);
      ctx.lineTo(cx - 43, cy + 18 + arm);
      ctx.moveTo(cx + 25, cy + 2);
      ctx.lineTo(cx + 43, cy + 18 - arm);
      ctx.stroke();

      ctx.fillStyle = '#00d9ff';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('ROBOTRON-9000', cx, canvas.height - 16);
      ctx.textAlign = 'left';

      raf = window.requestAnimationFrame(drawFallbackRobotron);
    };

    window.addEventListener('kyiv-runner:legacy-ready', stopFallback);
    drawFallbackRobotron();
    return () => {
      window.removeEventListener('kyiv-runner:legacy-ready', stopFallback);
      stopFallback();
    };
  }, []);

  const startStory = (event?: React.MouseEvent<HTMLElement>) => {
    event?.stopPropagation();
    const win = window as Window & {
      __kyivRunnerStartIntroRequested?: boolean;
      __kyivRunnerLegacyReady?: boolean;
      __kyivRunnerLegacyFailed?: boolean;
    };
    win.__kyivRunnerStartIntroRequested = true;
    window.dispatchEvent(new Event('kyiv-runner:start-intro'));
    if (win.__kyivRunnerLegacyReady) return;
    const subtitle = document.getElementById('introSubtitle');
    if (win.__kyivRunnerLegacyFailed) {
      if (subtitle) subtitle.textContent = 'Гра не завантажилась. Онови сторінку Ctrl + F5.';
      return;
    }
    if (subtitle) subtitle.textContent = 'Роботрон завантажує історію... Зачекай секунду.';
  };

  const skipIntro = (event?: React.MouseEvent<HTMLButtonElement>) => {
    event?.stopPropagation();
    const win = window as Window & {
      __kyivRunnerFinishIntroRequested?: boolean;
      __kyivRunnerLegacyReady?: boolean;
      __kyivRunnerLegacyFailed?: boolean;
    };
    win.__kyivRunnerFinishIntroRequested = true;
    window.dispatchEvent(new Event("kyiv-runner:finish-intro"));
    window.setTimeout(() => {
      if (win.__kyivRunnerLegacyReady) return;
      const subtitle = document.getElementById('introSubtitle');
      if (win.__kyivRunnerLegacyFailed) {
        if (subtitle) subtitle.textContent = 'Гра не завантажилась. Онови сторінку Ctrl + F5.';
        return;
      }
      if (subtitle) subtitle.textContent = 'Роботрон завантажує меню... Зачекай секунду.';
      const intro = document.getElementById('sIntro');
      if (!intro?.classList.contains('active')) return;
    }, 160);
  };

  return (
    <div id="sIntro" className="screen active" onClick={startStory}>
      <canvas id="introCanvas" width={340} height={220} />
      <div id="introSubtitle">Натисни на екран, щоб почати.</div>
      <button id="introStory" type="button" onClick={startStory}>
        ▷ Розповісти історію
      </button>
      <button id="introSkip" type="button" onClick={skipIntro}>
        ▶ Увійти в гру
      </button>
    </div>
  );
}

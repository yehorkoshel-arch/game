import { useEffect, useRef } from 'react';
import { LANGS, UI_TEXT } from '../data/gameData.js';

type LanguageCode = keyof typeof UI_TEXT;

function getActiveLanguage(): LanguageCode {
  const activeLang = document.querySelector<HTMLButtonElement>('.lbtn.active')?.dataset.lang;
  return activeLang && activeLang in UI_TEXT ? (activeLang as LanguageCode) : 'uk';
}

type PlayerTwoState = {
  y: number;
  vy: number;
  isJumping: boolean;
  isSliding: boolean;
  slideTimer: number;
  score: number;
};

export function SecondPlayerCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<PlayerTwoState>({
    y: 0,
    vy: 0,
    isJumping: false,
    isSliding: false,
    slideTimer: 0,
    score: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return undefined;

    const groundY = 318;
    playerRef.current.y = groundY;
    let frame = 0;
    let raf = 0;
    let language = getActiveLanguage();

    const drawRunner = (x: number, y: number, slide: boolean) => {
      const step = Math.sin(frame * 0.28) * 8;
      ctx.fillStyle = 'rgba(0,0,0,.24)';
      ctx.beginPath();
      ctx.ellipse(x, y + 7, slide ? 28 : 20, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      if (slide) {
        ctx.save();
        ctx.translate(x, y - 10);
        ctx.rotate(-0.18);
        ctx.translate(-x, -y + 10);
        ctx.fillStyle = '#ffe45c';
        ctx.fillRect(x - 25, y - 28, 48, 18);
        ctx.fillStyle = '#f0d0a8';
        ctx.beginPath();
        ctx.arc(x - 28, y - 26, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1f5b8f';
        ctx.fillRect(x - 8, y - 26, 30, 7);
        ctx.restore();
        return;
      }

      ctx.strokeStyle = '#1f5b8f';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - 7, y - 18);
      ctx.lineTo(x - 10, y - 2 + step);
      ctx.moveTo(x + 7, y - 18);
      ctx.lineTo(x + 10, y - 2 - step);
      ctx.stroke();

      ctx.fillStyle = '#ffe45c';
      ctx.beginPath();
      ctx.moveTo(x - 18, y - 18);
      ctx.lineTo(x - 13, y - 48);
      ctx.quadraticCurveTo(x, y - 58, x + 13, y - 48);
      ctx.lineTo(x + 18, y - 18);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#f0d0a8';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x - 12, y - 44);
      ctx.lineTo(x - 22, y - 28 + step * 0.2);
      ctx.moveTo(x + 12, y - 44);
      ctx.lineTo(x + 22, y - 28 - step * 0.2);
      ctx.stroke();

      ctx.fillStyle = '#f0d0a8';
      ctx.beginPath();
      ctx.arc(x, y - 70, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3a1a0a';
      ctx.beginPath();
      ctx.arc(x, y - 78, 14, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#0057b7';
      ctx.beginPath();
      ctx.arc(x - 9, y - 84, 4, 0, Math.PI * 2);
      ctx.arc(x + 5, y - 85, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(x - 2, y - 87, 4, 0, Math.PI * 2);
      ctx.arc(x + 12, y - 83, 4, 0, Math.PI * 2);
      ctx.fill();
    };

    const draw = () => {
      frame++;
      const p = playerRef.current;
      p.score += 1;

      if (p.isJumping) {
        p.y += p.vy;
        p.vy += 0.7;
        if (p.y >= groundY) {
          p.y = groundY;
          p.vy = 0;
          p.isJumping = false;
        }
      }
      if (p.isSliding) {
        p.slideTimer--;
        if (p.slideTimer <= 0) p.isSliding = false;
      }

      const roadOffset = (frame * 3) % 70;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
      sky.addColorStop(0, '#16213d');
      sky.addColorStop(1, '#10151f');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#263348';
      ctx.beginPath();
      ctx.moveTo(220, 120);
      ctx.lineTo(460, 120);
      ctx.lineTo(620, canvas.height);
      ctx.lineTo(60, canvas.height);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,.72)';
      ctx.lineWidth = 4;
      ctx.setLineDash([24, 28]);
      ctx.lineDashOffset = roadOffset;
      ctx.beginPath();
      ctx.moveTo(340, 130);
      ctx.lineTo(340, canvas.height);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#ffcc00';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'left';
      const copy = { ...LANGS[language], ...(UI_TEXT[language] || UI_TEXT.uk) };
      ctx.fillText(copy.player2, 22, 34);
      ctx.fillStyle = '#aebfe0';
      ctx.font = '12px Arial';
      ctx.fillText(copy.player2Hint || 'ArrowUp jump - ArrowDown slide', 22, 54);
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.floor(p.score / 10)} ${copy.pts}`, canvas.width - 22, 34);
      ctx.textAlign = 'left';

      drawRunner(340, p.y, p.isSliding);
      raf = requestAnimationFrame(draw);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const p = playerRef.current;
      if (event.code === 'ArrowUp' && !p.isJumping) {
        event.preventDefault();
        p.isJumping = true;
        p.vy = -16;
      }
      if (event.code === 'ArrowDown') {
        event.preventDefault();
        p.isSliding = true;
        p.slideTimer = 52;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    const onLanguageChanged = (event: Event) => {
      const nextLang = (event as CustomEvent<{ lang?: string }>).detail?.lang;
      language = nextLang && nextLang in UI_TEXT ? (nextLang as LanguageCode) : getActiveLanguage();
    };
    window.addEventListener('kyiv-runner:language-changed', onLanguageChanged);
    raf = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('kyiv-runner:language-changed', onLanguageChanged);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <canvas ref={canvasRef} id="gameCanvas2" width={680} height={420} />;
}

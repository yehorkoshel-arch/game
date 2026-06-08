import { useEffect, useRef } from 'react';

export function DancingAndrii() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let frame = 0;
    let animationId = 0;

    const draw = () => {
      frame += 0.08;
      const bounce = Math.abs(Math.sin(frame * 2)) * 7;
      const sway = Math.sin(frame) * 5;
      const armSwing = Math.sin(frame * 2.3) * 13;
      const legSwing = Math.sin(frame * 2) * 8;
      const x = canvas.width / 2 + sway;
      const ground = 137 - bounce;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.beginPath();
      ctx.ellipse(canvas.width / 2, 142, 27 - bounce * 0.8, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(x, ground);
      ctx.rotate(Math.sin(frame * 2) * 0.05);

      ctx.strokeStyle = '#151821';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-7, -31);
      ctx.lineTo(-10 - legSwing, 0);
      ctx.moveTo(7, -31);
      ctx.lineTo(10 + legSwing, 0);
      ctx.stroke();

      ctx.strokeStyle = '#f0c89b';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(-15, -61);
      ctx.lineTo(-26 - armSwing, -43 - Math.abs(armSwing) * 0.6);
      ctx.moveTo(15, -61);
      ctx.lineTo(26 + armSwing, -43 - Math.abs(armSwing) * 0.6);
      ctx.stroke();

      ctx.fillStyle = '#1565c0';
      ctx.beginPath();
      ctx.roundRect(-17, -72, 34, 43, 7);
      ctx.fill();

      ctx.fillStyle = '#ffd700';
      ctx.fillRect(-17, -37, 34, 6);
      ctx.fillRect(-3, -68, 6, 18);

      ctx.fillStyle = '#f0c89b';
      ctx.beginPath();
      ctx.arc(0, -88, 15, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#6b3d20';
      ctx.beginPath();
      ctx.arc(0, -92, 15, Math.PI, 0);
      ctx.fill();

      ctx.fillStyle = '#2b1a13';
      ctx.beginPath();
      ctx.arc(-5, -89, 1.7, 0, Math.PI * 2);
      ctx.arc(5, -89, 1.7, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#7a3d28';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -84, 6, 0.15, Math.PI - 0.15);
      ctx.stroke();

      ctx.restore();
      animationId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="menu-dancing-andrii"
      width={130}
      height={150}
      aria-label="Андрій танцює"
    />
  );
}

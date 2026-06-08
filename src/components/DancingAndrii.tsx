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
      const x = 62 + sway;
      const ground = 137 - bounce;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.beginPath();
      ctx.ellipse(62, 142, 27 - bounce * 0.8, 6, 0, 0, Math.PI * 2);
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

      const robotPhase = frame + Math.PI / 2;
      const robotBounce = Math.abs(Math.sin(robotPhase * 2)) * 6;
      const robotSway = Math.sin(robotPhase) * 7;
      const robotArm = Math.sin(robotPhase * 2.5) * 15;
      const robotLeg = Math.sin(robotPhase * 2) * 7;
      const robotX = 618 + robotSway;
      const robotGround = 137 - robotBounce;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.beginPath();
      ctx.ellipse(618, 142, 25 - robotBounce * 0.7, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(robotX, robotGround);
      ctx.rotate(Math.sin(robotPhase * 2) * -0.07);

      ctx.strokeStyle = '#1a3a6a';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-8, -30);
      ctx.lineTo(-10 - robotLeg, 0);
      ctx.moveTo(8, -30);
      ctx.lineTo(10 + robotLeg, 0);
      ctx.stroke();

      ctx.strokeStyle = '#1a3a6a';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(-17, -61);
      ctx.lineTo(-27 - robotArm, -43 - Math.abs(robotArm) * 0.55);
      ctx.moveTo(17, -61);
      ctx.lineTo(27 + robotArm, -43 - Math.abs(robotArm) * 0.55);
      ctx.stroke();

      ctx.fillStyle = '#122a5a';
      ctx.beginPath();
      ctx.roundRect(-23, -78, 46, 50, 6);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 150, 255, 0.35)';
      ctx.lineWidth = 1;
      for (let rib = 0; rib < 3; rib += 1) {
        ctx.beginPath();
        ctx.moveTo(-23, -68 + rib * 12);
        ctx.lineTo(23, -68 + rib * 12);
        ctx.stroke();
      }

      ctx.fillStyle = '#0a1e44';
      ctx.beginPath();
      ctx.roundRect(-15, -69, 30, 25, 3);
      ctx.fill();
      const buttons = [
        ['#ff4455', -9, -61],
        ['#ffd700', 0, -61],
        ['#44ff99', 9, -61],
        ['#00aaff', -5, -51],
        ['#ff66ff', 5, -51],
      ] as const;
      buttons.forEach(([color, bx, by], index) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(bx, by, 2.5, 0, Math.PI * 2);
        ctx.fill();
        if (Math.floor(frame * 5) % buttons.length === index) {
          ctx.globalAlpha = 0.35;
          ctx.beginPath();
          ctx.arc(bx, by, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      });
      ctx.fillStyle = '#1565c0';
      ctx.fillRect(-21, -74, 12, 7);
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(-21, -70, 12, 3);

      ctx.fillStyle = '#0f2248';
      ctx.fillRect(-5, -86, 10, 9);

      ctx.fillStyle = '#122a5a';
      ctx.beginPath();
      ctx.roundRect(-20, -116, 40, 32, 7);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 200, 255, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#0a1e44';
      ctx.beginPath();
      ctx.arc(-20, -101, 6, 0, Math.PI * 2);
      ctx.arc(20, -101, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#040e1e';
      ctx.fillRect(-15, -108, 12, 11);
      ctx.fillRect(3, -108, 12, 11);
      ctx.fillStyle = '#00e5ff';
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 8;
      ctx.fillRect(-12, -105, 6, 5);
      ctx.fillRect(6, -105, 6, 5);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#040e1e';
      ctx.fillRect(-10, -94, 20, 7);
      ctx.fillStyle = '#1a3a6a';
      ctx.fillRect(-7, -92, 14, 2);

      ctx.strokeStyle = '#4488cc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -116);
      ctx.lineTo(0, -128);
      ctx.stroke();
      ctx.fillStyle = '#ff3c64';
      ctx.shadowColor = '#ff3c64';
      ctx.shadowBlur = 7;
      ctx.beginPath();
      ctx.arc(0, -130, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

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
      width={680}
      height={150}
      aria-label="Андрій і Роботрон танцюють"
    />
  );
}

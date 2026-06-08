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
      const robotX = 170 + robotSway;
      const robotGround = 137 - robotBounce;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.beginPath();
      ctx.ellipse(170, 142, 25 - robotBounce * 0.7, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(robotX, robotGround);
      ctx.rotate(Math.sin(robotPhase * 2) * -0.07);

      ctx.strokeStyle = '#546273';
      ctx.lineWidth = 9;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-8, -30);
      ctx.lineTo(-10 - robotLeg, 0);
      ctx.moveTo(8, -30);
      ctx.lineTo(10 + robotLeg, 0);
      ctx.stroke();

      ctx.strokeStyle = '#6d7d90';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(-17, -61);
      ctx.lineTo(-27 - robotArm, -43 - Math.abs(robotArm) * 0.55);
      ctx.moveTo(17, -61);
      ctx.lineTo(27 + robotArm, -43 - Math.abs(robotArm) * 0.55);
      ctx.stroke();

      ctx.fillStyle = '#364250';
      ctx.beginPath();
      ctx.roundRect(-19, -75, 38, 47, 6);
      ctx.fill();
      ctx.strokeStyle = '#8b9bad';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#00e5ff';
      ctx.fillRect(-12, -64, 24, 4);
      ctx.fillRect(-3, -55, 6, 15);

      ctx.fillStyle = '#4d5c6c';
      ctx.beginPath();
      ctx.roundRect(-17, -103, 34, 28, 7);
      ctx.fill();
      ctx.strokeStyle = '#96a7b8';
      ctx.stroke();

      ctx.fillStyle = '#111820';
      ctx.fillRect(-12, -95, 24, 10);
      ctx.fillStyle = '#00e5ff';
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 8;
      ctx.fillRect(-8, -92, 5, 4);
      ctx.fillRect(3, -92, 5, 4);
      ctx.shadowBlur = 0;

      ctx.strokeStyle = '#8b9bad';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -103);
      ctx.lineTo(3, -113);
      ctx.stroke();
      ctx.fillStyle = '#ff3df2';
      ctx.beginPath();
      ctx.arc(3, -115, 4, 0, Math.PI * 2);
      ctx.fill();

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
      width={230}
      height={150}
      aria-label="Андрій і Роботрон танцюють"
    />
  );
}

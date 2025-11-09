import React, { useEffect, useRef } from "react";

const StarfieldBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let stars: { x: number; y: number; radius: number; speed: number }[] = [];
    const STAR_COUNT = 150;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resize);
    resize();

    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 1.2,
        speed: 0.05 + Math.random() * 0.3,
      });
    }

    let mouseX = 0,
      mouseY = 0;
    document.addEventListener("mousemove", (e) => {
      mouseX = e.clientX / window.innerWidth - 0.5;
      mouseY = e.clientY / window.innerHeight - 0.5;
    });

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let s of stars) {
        s.x += mouseX * s.speed;
        s.y += mouseY * s.speed;

        // Wrap-around edges
        if (s.x < 0) s.x = canvas.width;
        if (s.x > canvas.width) s.x = 0;
        if (s.y < 0) s.y = canvas.height;
        if (s.y > canvas.height) s.y = 0;

        ctx.beginPath();
        // Blue-indigo twinkle
        const hue = 220 + Math.random() * 40; // slight blue variation
        const alpha = 0.6 + Math.random() * 0.3;
        ctx.fillStyle = `hsla(${hue}, 90%, 80%, ${alpha})`;
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full -z-10"
      style={{
        background: "radial-gradient(circle at center, #001CAC, #0A1D56)",
      }}
    />
  );
};

export default StarfieldBackground;

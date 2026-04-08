"use client";
import { useEffect, useRef } from "react";

const HEX = "0123456789abcdef";
function rchar() { return HEX[Math.floor(Math.random() * 16)]; }
function rstr(n = 8) { let s = ""; for (let i = 0; i < n; i++) s += rchar(); return s; }

export default function HashBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const FS = 11;  // font size px
    const CW = 22;  // column width px

    let W = 0, H = 0, raf: number;

    interface Col {
      x: number;
      tailY: number;  // y of bottom of the trail
      speed: number;
      len: number;
      chars: string[];
    }

    let cols: Col[] = [];

    function init() {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
      cols = Array.from({ length: Math.floor(W / CW) }, (_, i) => {
        const len = 12 + Math.floor(Math.random() * 18);
        return {
          x: i * CW + 4,
          tailY: H + Math.random() * H,
          speed: 28 + Math.random() * 38,
          len,
          chars: Array.from({ length: len }, () => rstr()),
        };
      });
    }

    let last = 0, frame = 0;

    function draw(t: number) {
      const dt = Math.min((t - last) / 1000, 0.05);
      last = t;
      frame++;

      ctx.clearRect(0, 0, W, H);
      ctx.font = `${FS}px 'JetBrains Mono', monospace`;

      for (const col of cols) {
        // Mutate a random char occasionally for subtle flicker
        if (frame % 5 === 0) {
          col.chars[Math.floor(Math.random() * col.len)] = rstr();
        }

        for (let i = 0; i < col.len; i++) {
          // Trail scrolls upward: tailY is bottom, head is at tailY - len*FS
          const y = col.tailY - i * FS;
          if (y < 0 || y > H) continue;

          // t=0 → tail (faint), t=1 → head (bright)
          const t = i / col.len;
          const alpha = 0.02 + t * 0.10;

          ctx.fillStyle =
            i === col.len - 1
              ? "rgba(200, 255, 255, 0.15)"  // bright leading char
              : `rgba(0, 243, 255, ${alpha})`;

          ctx.fillText(col.chars[i], col.x, y);
        }

        // Move trail upward
        col.tailY -= col.speed * dt;

        // Reset when fully off top of screen
        if (col.tailY + col.len * FS < 0) {
          col.tailY = H + Math.random() * H * 0.4;
          col.speed = 28 + Math.random() * 38;
          col.len = 12 + Math.floor(Math.random() * 18);
          col.chars = Array.from({ length: col.len }, () => rstr());
        }
      }

      raf = requestAnimationFrame(draw);
    }

    init();
    window.addEventListener("resize", init);
    raf = requestAnimationFrame((t) => { last = t; requestAnimationFrame(draw); });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", init);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
    />
  );
}

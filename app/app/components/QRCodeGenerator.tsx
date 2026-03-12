"use client";

import React, { useEffect, useRef } from "react";
import QRCode from "qrcode";

interface QRCodeGeneratorProps {
  data: string;
  size?: number;
  colorDark?: string;
  colorLight?: string;
}

export default function QRCodeGenerator({
  data,
  size = 200,
  colorDark = "#00f0ff", // Cyber Cyan
  colorLight = "#0e0f12", // Dark Background
}: QRCodeGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && data) {
      QRCode.toCanvas(
        canvasRef.current,
        data,
        {
          width: size,
          margin: 2,
          color: {
            dark: colorDark,
            light: colorLight,
          },
          errorCorrectionLevel: "H",
        },
        (err) => {
          if (err) console.error("Error generating QR code", err);
        }
      );
    }
  }, [data, size, colorDark, colorLight]);

  return (
    <div className="flex flex-col items-center justify-center p-4 border border-cyan-500/30 bg-black/50 rounded-lg blur-bg-subtle relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"></div>
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"></div>
      
      <p className="text-cyan-400 text-xs tracking-widest uppercase mb-4 font-mono">
        Autenticação Criptográfica
      </p>
      
      <div className="relative p-2 bg-gradient-to-br from-cyan-900/20 to-purple-900/20 rounded shadow-[0_0_15px_rgba(0,240,255,0.1)] group-hover:shadow-[0_0_25px_rgba(0,240,255,0.2)] transition-shadow duration-300">
        <canvas ref={canvasRef}></canvas>
        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-400"></div>
        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-400"></div>
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyan-400"></div>
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-400"></div>
      </div>
      
      <p className="text-gray-500 text-[10px] mt-4 font-mono text-center">
        SCAN PARA VERIFICAR RFC 3161 OVER HTTP
      </p>
    </div>
  );
}

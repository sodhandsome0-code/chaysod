import React, { useRef, useState, useEffect } from 'react';
import { PenTool, RotateCcw, Check, Sparkles } from 'lucide-react';

interface DigitalSignaturePadProps {
  initialSignature?: string;
  inspectorName: string;
  onSave: (dataUrl: string) => void;
  onClose?: () => void;
}

export const DigitalSignaturePad: React.FC<DigitalSignaturePadProps> = ({
  initialSignature,
  inspectorName,
  onSave,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    ctx.scale(ratio, ratio);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a'; // Deep navy blue ink for official look
    ctx.lineWidth = 2.5;

    // If initial signature exists, load it
    if (initialSignature) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setHasDrawn(true);
      };
      img.src = initialSignature;
    }
  }, [initialSignature]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    setHasDrawn(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasDrawn(false);
  };

  // Generate a neat cursive digital sample signature for quick demo
  const handleGenerateSample = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    handleClear();
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    ctx.save();
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Cursive stroke approximation
    ctx.beginPath();
    ctx.moveTo(w * 0.15, h * 0.6);
    ctx.bezierCurveTo(w * 0.25, h * 0.2, w * 0.35, h * 0.8, w * 0.45, h * 0.35);
    ctx.bezierCurveTo(w * 0.5, h * 0.65, w * 0.6, h * 0.3, w * 0.7, h * 0.5);
    ctx.bezierCurveTo(w * 0.75, h * 0.75, w * 0.85, h * 0.45, w * 0.9, h * 0.5);
    ctx.stroke();

    // Underline flourish
    ctx.beginPath();
    ctx.moveTo(w * 0.18, h * 0.75);
    ctx.bezierCurveTo(w * 0.45, h * 0.68, w * 0.65, h * 0.82, w * 0.88, h * 0.72);
    ctx.stroke();

    ctx.restore();
    setHasDrawn(true);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
    if (onClose) onClose();
  };

  return (
    <div className="flex flex-col space-y-3">
      <div className="flex items-center justify-between text-xs text-slate-300">
        <span className="flex items-center gap-1.5 font-medium">
          <PenTool className="w-3.5 h-3.5 text-pink-400" />
          <span>เซ็นชื่อกำกับ: {inspectorName || 'ผู้ตรวจสอบ'}</span>
        </span>
        <button
          type="button"
          onClick={handleGenerateSample}
          className="text-[11px] text-pink-400 hover:text-pink-300 flex items-center gap-1 hover:underline"
        >
          <Sparkles className="w-3 h-3 text-amber-300" />
          สร้างลายเซ็นจำลองด่วน
        </button>
      </div>

      {/* Signature Canvas Box with Realistic Paper Background */}
      <div className="relative w-full h-36 bg-slate-100 rounded-xl border-2 border-slate-600/70 overflow-hidden shadow-inner touch-none">
        {/* Baseline guide line */}
        <div className="absolute inset-x-4 bottom-8 border-b border-dashed border-slate-300 pointer-events-none" />
        <span className="absolute bottom-2 left-4 text-[10px] text-slate-400 select-none pointer-events-none font-mono">
          ✕ ลงชื่อบนเส้นประ (Sign above)
        </span>

        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-full cursor-crosshair"
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <button
          type="button"
          onClick={handleClear}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center gap-1.5 transition-all active:scale-95"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
          <span>ล้างลายเซ็น</span>
        </button>

        <div className="flex gap-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-all"
            >
              ยกเลิก
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasDrawn}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold text-white flex items-center gap-1.5 transition-all shadow-md ${
              hasDrawn
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-95 shadow-pink-500/30 active:scale-95'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            <span>ยืนยันบันทึกลายเซ็น</span>
          </button>
        </div>
      </div>
    </div>
  );
};

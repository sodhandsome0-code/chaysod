import React, { useState, useRef, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Shield, Lock, Unlock, Key, RotateCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { sounds } from '../utils/audio';

interface SafeLockScreenProps {
  onUnlockSuccess: () => void;
}

const TARGET_CODE = '7412369';
// Dial notch symbols representing digits around the safe dial
const DIAL_NOTCHES = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

export const SafeLockScreen: React.FC<SafeLockScreenProps> = ({ onUnlockSuccess }) => {
  const [currentRotation, setCurrentRotation] = useState<number>(0);
  const [enteredCode, setEnteredCode] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isUnlocking, setIsUnlocking] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [boltState, setBoltState] = useState<'locked' | 'retracting' | 'unlocked'>('locked');
  const [selectedNotch, setSelectedNotch] = useState<string>('0');

  const dialRef = useRef<HTMLDivElement | null>(null);
  const centerCoordRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const startAngleRef = useRef<number>(0);
  const prevAngleRef = useRef<number>(0);

  // Update center coords for drag rotation
  const updateCenter = useCallback(() => {
    if (dialRef.current) {
      const rect = dialRef.current.getBoundingClientRect();
      centerCoordRef.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }
  }, []);

  useEffect(() => {
    updateCenter();
    window.addEventListener('resize', updateCenter);
    return () => window.removeEventListener('resize', updateCenter);
  }, [updateCenter]);

  // Check code whenever enteredCode changes
  useEffect(() => {
    if (enteredCode === TARGET_CODE) {
      triggerUnlockSequence();
    } else if (enteredCode.length >= TARGET_CODE.length) {
      sounds.playError();
      setErrorMessage('รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
      const timer = setTimeout(() => {
        setEnteredCode('');
        setErrorMessage(null);
      }, 1400);
      return () => clearTimeout(timer);
    }
  }, [enteredCode]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      if (key >= '0' && key <= '9') {
        e.preventDefault();
        rotateAndInputChar(key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        setEnteredCode((prev) => prev.slice(0, -1));
        sounds.playTick(800);
      } else if (e.key === 'Escape') {
        handleReset();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const triggerUnlockSequence = () => {
    setIsUnlocking(true);
    setBoltState('retracting');
    sounds.playUnlock();

    // Fire fireworks / confetti burst
    try {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#f97316', '#ec4899', '#a855f7', '#38bdf8', '#fbbf24'],
      });
    } catch {}

    setTimeout(() => {
      setBoltState('unlocked');
    }, 900);

    setTimeout(() => {
      onUnlockSuccess();
    }, 1800);
  };

  const handleReset = () => {
    sounds.playTumblerClunk();
    setEnteredCode('');
    setErrorMessage(null);
  };

  const rotateAndInputChar = (char: string) => {
    // Find index on dial
    const idx = DIAL_NOTCHES.indexOf(char);
    if (idx !== -1) {
      const targetDeg = (idx / DIAL_NOTCHES.length) * 360;
      setCurrentRotation(targetDeg);
      setSelectedNotch(char);
    }
    sounds.playTick(1000 + Math.random() * 400);
    setEnteredCode((prev) => (prev.length < TARGET_CODE.length ? prev + char : prev));
  };

  // Drag handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isUnlocking) return;
    updateCenter();
    setIsDragging(true);
    const rad = Math.atan2(e.clientY - centerCoordRef.current.y, e.clientX - centerCoordRef.current.x);
    startAngleRef.current = rad * (180 / Math.PI) - currentRotation;
    prevAngleRef.current = currentRotation;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || isUnlocking) return;
    const rad = Math.atan2(e.clientY - centerCoordRef.current.y, e.clientX - centerCoordRef.current.x);
    let deg = rad * (180 / Math.PI) - startAngleRef.current;
    deg = (deg % 360 + 360) % 360;

    // Detect passing notches for sound tick
    const notchIndex = Math.round((deg / 360) * DIAL_NOTCHES.length) % DIAL_NOTCHES.length;
    const notchChar = DIAL_NOTCHES[notchIndex];

    if (notchChar !== selectedNotch) {
      sounds.playTick(1100 + (notchIndex % 4) * 80);
      setSelectedNotch(notchChar);
    }

    setCurrentRotation(deg);
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    // Snap to closest notch and enter character
    const notchIndex = Math.round((currentRotation / 360) * DIAL_NOTCHES.length) % DIAL_NOTCHES.length;
    const char = DIAL_NOTCHES[notchIndex];
    const snappedDeg = (notchIndex / DIAL_NOTCHES.length) * 360;
    setCurrentRotation(snappedDeg);
    sounds.playTumblerClunk();
    setEnteredCode((prev) => (prev.length < TARGET_CODE.length ? prev + char : prev));
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 z-10 select-none overflow-hidden">
      {/* Heavy Safe Door Frame */}
      <div
        className={`relative w-full max-w-4xl transition-all duration-1000 ease-in-out transform ${
          isUnlocking ? 'scale-105 opacity-0 pointer-events-none translate-y-4' : 'scale-100 opacity-100'
        }`}
      >
        {/* Glow ambient light behind the safe */}
        <div className="absolute -inset-4 bg-gradient-to-r from-orange-500/20 via-pink-500/20 to-purple-600/30 rounded-[48px] blur-3xl opacity-75 animate-pulse" />

        {/* 3D Vault Outer Frame */}
        <div className="relative bg-gradient-to-b from-[#151c34] via-[#0d1326] to-[#080d1a] border-4 border-slate-700/60 rounded-[38px] p-6 sm:p-10 shadow-[0_25px_80px_rgba(0,0,0,0.8),inset_0_2px_15px_rgba(255,255,255,0.15)] backdrop-blur-2xl">
          {/* Industrial Vault Bolt Studs along perimeter */}
          <div className="absolute top-4 left-6 flex space-x-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-4 h-4 rounded-full bg-gradient-to-b from-slate-400 via-slate-600 to-slate-900 border border-slate-500/50 shadow-inner"
              />
            ))}
          </div>
          <div className="absolute top-4 right-6 flex space-x-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-4 h-4 rounded-full bg-gradient-to-b from-slate-400 via-slate-600 to-slate-900 border border-slate-500/50 shadow-inner"
              />
            ))}
          </div>

          {/* Top Title: Metallic Embossed Text "คลังยา" */}
          <div className="text-center mb-6 pt-2">
            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-pink-300 font-medium tracking-widest uppercase mb-3 shadow-[0_0_15px_rgba(236,72,153,0.3)]">
              <Shield className="w-3.5 h-3.5 text-pink-400" />
              <span>รพ.สต.บ้านห้วยแอ่ง (ชายสดV1)</span>
            </div>

            {/* Glossy Metallic Embossed Text "คลังยา" */}
            <h1
              className="text-5xl sm:text-7xl font-extrabold tracking-wider mb-2 font-['Chakra_Petch']"
              style={{
                background:
                  'linear-gradient(180deg, #ffffff 0%, #cbd5e1 35%, #94a3b8 50%, #e2e8f0 65%, #64748b 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter:
                  'drop-shadow(0 4px 6px rgba(0,0,0,0.9)) drop-shadow(0 1px 2px rgba(255,255,255,0.4)) drop-shadow(0 0 25px rgba(244,114,182,0.4))',
              }}
            >
              คลังยา
            </h1>
            <p className="text-sm sm:text-base text-slate-400 font-light tracking-wide flex items-center justify-center gap-2">
              <Lock className="w-4 h-4 text-orange-400" />
              ระบบบริหารจัดการคลังยาอัตโนมัติ · ตู้เซฟควบคุมความปลอดภัยสูง
            </p>
          </div>

          {/* Main Vault Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mt-6">
            {/* Left/Center: Interactive 3D Realistic Safe Dial */}
            <div className="lg:col-span-7 flex flex-col items-center justify-center">
              <div className="relative p-6 sm:p-8 rounded-full bg-gradient-to-b from-[#1c233c] to-[#0c1020] border-2 border-slate-700/80 shadow-[0_20px_50px_rgba(0,0,0,0.9),inset_0_4px_20px_rgba(255,255,255,0.12)]">
                {/* Outer Calibrated Dial Ring with tick notches */}
                <div className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-full flex items-center justify-center bg-gradient-to-br from-slate-700 via-slate-900 to-slate-950 p-3 shadow-2xl border-4 border-slate-600">
                  {/* Fixed Reference Pointer Arrow at 12 o'clock */}
                  <div className="absolute top-1 z-30 flex flex-col items-center">
                    <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[14px] border-t-pink-500 drop-shadow-[0_0_8px_rgba(236,72,153,0.9)]" />
                    <div className="w-1.5 h-3 bg-pink-500 rounded-full animate-ping" />
                  </div>

                  {/* ROTATING 3D DIAL */}
                  <div
                    ref={dialRef}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    className="relative w-full h-full rounded-full cursor-grab active:cursor-grabbing touch-none transition-transform"
                    style={{
                      transform: `rotate(${currentRotation}deg)`,
                      transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.2, 0.9, 0.3, 1.2)',
                    }}
                  >
                    {/* Brushed Metal Background Texture with Radial Conic Sheen */}
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{
                        background:
                          'conic-gradient(from 0deg, #334155, #1e293b, #64748b, #1e293b, #475569, #1e293b, #64748b, #334155)',
                        boxShadow: 'inset 0 0 25px rgba(0,0,0,0.8), 0 8px 30px rgba(0,0,0,0.7)',
                      }}
                    />

                    {/* Ring of Graduation Notches & Characters */}
                    {DIAL_NOTCHES.map((char, index) => {
                      const angle = (index / DIAL_NOTCHES.length) * 360;
                      return (
                        <div
                          key={index}
                          className="absolute inset-0 flex items-start justify-center pointer-events-none"
                          style={{
                            transform: `rotate(${angle}deg)`,
                          }}
                        >
                          <div className="pt-2 flex flex-col items-center">
                            {/* Metallic Tick mark */}
                            <div className="w-0.5 h-3 bg-gradient-to-b from-amber-300 to-amber-500 shadow-[0_0_4px_rgba(251,191,36,0.8)]" />
                            {/* Engraved Character */}
                            <span className="text-xs sm:text-sm font-black mt-1 font-mono tracking-tighter text-slate-200">
                              {char}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {/* Intermediate Fine Tick lines for realistic machining feel */}
                    {Array.from({ length: 40 }).map((_, i) => (
                      <div
                        key={`tick-${i}`}
                        className="absolute inset-0 flex items-start justify-center pointer-events-none"
                        style={{ transform: `rotate(${(i / 40) * 360}deg)` }}
                      >
                        <div className="w-0.5 h-1.5 bg-slate-500/70 pt-1" />
                      </div>
                    ))}

                    {/* Center Knob Hub with Chrome Rim & Knurled Texture */}
                    <div className="absolute inset-16 sm:inset-20 rounded-full bg-gradient-to-br from-slate-200 via-slate-400 to-slate-800 p-2 shadow-[0_15px_35px_rgba(0,0,0,0.9),inset_0_2px_10px_rgba(255,255,255,0.8)] flex items-center justify-center">
                      <div className="w-full h-full rounded-full bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-950 flex flex-col items-center justify-center border border-slate-500/60 shadow-inner">
                        <Key className="w-6 h-6 sm:w-8 sm:h-8 text-pink-400 drop-shadow-[0_0_12px_rgba(244,114,182,0.8)]" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                          ROTATE
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sub-label under dial */}
                <div className="text-center mt-3 text-xs text-slate-400 flex items-center justify-center gap-1.5">
                  <RotateCw className="w-3.5 h-3.5 text-orange-400 animate-spin" style={{ animationDuration: '6s' }} />
                  <span>ลากหมุนวงล้อรหัสเซฟ หรือกดปุ่มตัวเลขด้านข้าง</span>
                </div>
              </div>
            </div>

            {/* Right: Electronic Combination Status & Quick Control Panel */}
            <div className="lg:col-span-5 flex flex-col space-y-5">
              {/* High-tech Cyber OLED Display for Code Digits (Masked for Security) */}
              <div className="bg-slate-950/80 rounded-2xl border-2 border-slate-700/80 p-5 shadow-[inset_0_0_20px_rgba(0,0,0,0.9)] relative overflow-hidden">
                <div className="absolute top-0 right-0 px-3 py-1 bg-pink-500/20 text-pink-400 text-[10px] font-mono rounded-bl-lg border-b border-l border-pink-500/30">
                  SECURE VAULT
                </div>

                <div className="text-xs text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  สถานะการป้อนรหัสผ่าน (รหัสผ่าน 7 หลัก)
                </div>

                {/* Digit Display Boxes - Masked Bullet Dots */}
                <div className="flex items-center justify-center gap-2.5 py-4">
                  {Array.from({ length: TARGET_CODE.length }).map((_, idx) => {
                    const hasChar = idx < enteredCode.length;
                    return (
                      <div
                        key={idx}
                        className={`w-10 h-12 rounded-xl flex items-center justify-center font-mono text-2xl font-bold transition-all duration-300 ${
                          hasChar
                            ? 'bg-gradient-to-b from-pink-500/25 to-purple-600/35 border-2 border-pink-400 text-pink-300 shadow-[0_0_15px_rgba(236,72,153,0.5)] scale-105'
                            : 'bg-slate-900/90 border border-slate-700/70 text-slate-600'
                        }`}
                      >
                        {hasChar ? '●' : '○'}
                      </div>
                    );
                  })}
                </div>

                {/* Error Banner */}
                {errorMessage && (
                  <div className="mt-2 text-xs text-red-400 bg-red-950/50 border border-red-500/40 rounded-lg p-2 text-center flex items-center justify-center gap-1 animate-bounce">
                    <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="mt-2 text-center text-[11px] text-slate-400 font-light">
                  ระบบตู้เซฟเข้ารหัสความปลอดภัยระดับโรงพยาบาล
                </div>
              </div>

              {/* Standard Vault Numeric Keypad */}
              <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 p-4">
                <div className="text-xs font-semibold text-slate-300 mb-3 flex items-center justify-between">
                  <span>แป้นกดรหัสตู้เซฟ (Numeric Keypad)</span>
                  <span className="text-[11px] text-slate-400 font-mono">0-9</span>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((btn) => (
                    <button
                      key={btn}
                      type="button"
                      onClick={() => rotateAndInputChar(btn)}
                      className="h-12 rounded-xl font-mono text-lg font-bold bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-pink-500/40 hover:text-white transition-all active:scale-95 flex items-center justify-center shadow-md"
                    >
                      {btn}
                    </button>
                  ))}

                  {/* Bottom Row: Backspace, 0, Clear */}
                  <button
                    type="button"
                    onClick={() => {
                      setEnteredCode((prev) => prev.slice(0, -1));
                      sounds.playTick(800);
                    }}
                    className="h-12 rounded-xl text-xs font-bold bg-slate-800/80 hover:bg-slate-700 text-amber-300 border border-slate-700 transition-all flex items-center justify-center active:scale-95 shadow-md"
                    title="ลบตัวล่าสุด"
                  >
                    ⌫ ลบ
                  </button>

                  <button
                    type="button"
                    onClick={() => rotateAndInputChar('0')}
                    className="h-12 rounded-xl font-mono text-lg font-bold bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-pink-500/40 hover:text-white transition-all active:scale-95 flex items-center justify-center shadow-md"
                  >
                    0
                  </button>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="h-12 rounded-xl text-xs font-bold bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-700/50 transition-all flex items-center justify-center active:scale-95 shadow-md"
                    title="ล้างรหัสผ่านทั้งหมด"
                  >
                    ล้าง
                  </button>
                </div>
              </div>

              {/* Security Level Tag */}
              <div className="text-[11px] text-slate-500 flex items-center justify-between px-1">
                <span>ความปลอดภัยระดับห้องยาหลัก</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> เชื่อมต่อระบบพร้อม
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Vault Unlocking Cinematic Overlay */}
      {isUnlocking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none bg-black/60 backdrop-blur-xl transition-all duration-700">
          <div className="flex flex-col items-center justify-center text-center space-y-4 animate-scale-up">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-orange-500 via-pink-500 to-purple-600 p-1 shadow-[0_0_60px_rgba(236,72,153,0.8)] animate-spin">
              <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center">
                <Unlock className="w-10 h-10 text-pink-400 animate-pulse" />
              </div>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-pink-400 to-purple-400 font-['Chakra_Petch']">
              สลักกลไกปลดล็อกสำเร็จ!
            </h2>
            <p className="text-slate-300 text-sm font-medium">กำลังเปิดประตูคลังยา รพ.สต.บ้านห้วยแอ่ง...</p>
          </div>
        </div>
      )}
    </div>
  );
};

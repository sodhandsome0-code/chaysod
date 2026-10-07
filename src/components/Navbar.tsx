import React, { useState, useEffect } from 'react';
import {
  Shield,
  LayoutDashboard,
  Building2,
  PackageCheck,
  Brain,
  Settings,
  Lock,
  Cloud,
  Clock,
  Printer,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

interface NavbarProps {
  currentTab: 'dashboard' | 'internal' | 'external' | 'ai_planning' | 'settings';
  onSelectTab: (tab: 'dashboard' | 'internal' | 'external' | 'ai_planning' | 'settings') => void;
  onLock: () => void;
  onOpenPrint: () => void;
  isFirestoreConnected: boolean;
  onSyncFirestore?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onLock,
  onOpenPrint,
  isFirestoreConnected,
  onSyncFirestore,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-[#060c1e]/85 backdrop-blur-xl border-b border-slate-700/60 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Left Brand */}
          <div className="flex items-center gap-3">
            <div className="relative group cursor-pointer" onClick={() => onSelectTab('dashboard')}>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 via-pink-500 to-purple-600 p-[2px] shadow-[0_0_20px_rgba(236,72,153,0.4)]">
                <div className="w-full h-full bg-[#080f26] rounded-2xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-pink-400 group-hover:scale-110 transition-transform" />
                </div>
              </div>
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#060c1e]" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-wide font-['Kanit']">
                  ระบบบริหารคลังยา
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-gradient-to-r from-orange-500 to-pink-600 text-white shadow-sm">
                  ชายสดV1
                </span>
              </div>
              <p className="text-xs text-slate-400 font-light flex items-center gap-1.5">
                <span>รพ.สต.บ้านห้วยแอ่ง</span>
                <span className="text-slate-600">•</span>
                <span className="text-pink-300/80 font-mono text-[11px]">Sub-District Hospital</span>
              </p>
            </div>
          </div>

          {/* Center Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1.5 bg-[#0a122e]/80 p-1.5 rounded-2xl border border-slate-700/60 shadow-inner">
            <button
              onClick={() => onSelectTab('dashboard')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
                currentTab === 'dashboard'
                  ? 'bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 text-white shadow-[0_0_15px_rgba(236,72,153,0.4)]'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>แดชบอร์ด</span>
            </button>

            <button
              onClick={() => onSelectTab('internal')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
                currentTab === 'internal'
                  ? 'bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 text-white shadow-[0_0_15px_rgba(236,72,153,0.4)]'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Building2 className="w-4 h-4 text-cyan-400" />
              <span>คลังยาใน (รับ-จ่าย)</span>
            </button>

            <button
              onClick={() => onSelectTab('external')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
                currentTab === 'external'
                  ? 'bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 text-white shadow-[0_0_15px_rgba(236,72,153,0.4)]'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <PackageCheck className="w-4 h-4 text-pink-400" />
              <span>คลังยานอก (ตรวจวันหมดอายุ)</span>
            </button>

            <button
              onClick={() => onSelectTab('ai_planning')}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
                currentTab === 'ai_planning'
                  ? 'bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 text-white shadow-[0_0_15px_rgba(236,72,153,0.4)]'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Brain className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>วางแผนเบิกยา AI</span>
              <span className="px-1.5 py-0.2 rounded-full bg-pink-500/20 text-pink-300 text-[10px] font-mono border border-pink-500/30">
                3 รอบนัด
              </span>
            </button>

            <button
              onClick={() => onSelectTab('settings')}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${
                currentTab === 'settings'
                  ? 'bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 text-white shadow-[0_0_15px_rgba(236,72,153,0.4)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span className="hidden lg:inline">ตั้งค่า</span>
            </button>
          </nav>

          {/* Right Status Badges & Action Buttons */}
          <div className="flex items-center gap-2.5">
            {/* Realtime Clock Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700/80 text-xs font-mono text-cyan-300 shadow-inner">
              <Clock className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>{timeStr}</span>
            </div>

            {/* Firestore Status Badge */}
            <div
              onClick={onSyncFirestore}
              title={isFirestoreConnected ? 'Firebase Firestore ออนไลน์ (คลิกเพื่อรีเฟรช)' : 'กำลังเชื่อมต่อ Firestore...'}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700 text-[11px] font-medium text-slate-300 cursor-pointer hover:border-slate-500 transition-colors"
            >
              <Cloud
                className={`w-3.5 h-3.5 ${
                  isFirestoreConnected ? 'text-emerald-400' : 'text-amber-400 animate-spin'
                }`}
              />
              <span className="hidden xl:inline">
                {isFirestoreConnected ? 'Firestore เชื่อมต่อแล้ว' : 'กำลังซิงค์...'}
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  isFirestoreConnected ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
                }`}
              />
            </div>

            {/* Quick Print Button */}
            <button
              onClick={onOpenPrint}
              className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
              title="พิมพ์รายงานสรุป A4 แนวนอน"
            >
              <Printer className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">พิมพ์รายงาน</span>
            </button>

            {/* Lock Safe Button */}
            <button
              onClick={onLock}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-red-950/50 hover:bg-red-900/60 border border-red-700/50 text-red-300 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
              title="ล็อกตู้เซฟคลังยา"
            >
              <Lock className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden sm:inline">ล็อกตู้เซฟ</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-800">
          <button
            onClick={() => onSelectTab('dashboard')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 ${
              currentTab === 'dashboard' ? 'bg-pink-600 text-white' : 'text-slate-400'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>แดชบอร์ด</span>
          </button>
          <button
            onClick={() => onSelectTab('internal')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 ${
              currentTab === 'internal' ? 'bg-pink-600 text-white' : 'text-slate-400'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>คลังยาใน</span>
          </button>
          <button
            onClick={() => onSelectTab('external')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 ${
              currentTab === 'external' ? 'bg-pink-600 text-white' : 'text-slate-400'
            }`}
          >
            <PackageCheck className="w-3.5 h-3.5" />
            <span>คลังยานอก</span>
          </button>
          <button
            onClick={() => onSelectTab('ai_planning')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 ${
              currentTab === 'ai_planning' ? 'bg-pink-600 text-white' : 'text-slate-400'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>วางแผน AI</span>
          </button>
          <button
            onClick={() => onSelectTab('settings')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 ${
              currentTab === 'settings' ? 'bg-pink-600 text-white' : 'text-slate-400'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>ตั้งค่า</span>
          </button>
        </div>
      </div>
    </header>
  );
};

import React from 'react';
import {
  TrendingUp,
  Coins,
  Package,
  AlertTriangle,
  Building2,
  PackageCheck,
  Brain,
  Calendar,
  FileSpreadsheet,
  Printer,
  ArrowUpRight,
  ShieldCheck,
  Activity,
  Layers,
} from 'lucide-react';
import { Drug, ExternalDrugItem, SystemSettings } from '../types/inventory';
import { MONTH_SHORT_NAMES } from '../data/defaultDrugs';

interface DashboardViewProps {
  drugs: Drug[];
  externalDrugs: ExternalDrugItem[];
  settings: SystemSettings;
  monthlyReceiptTotals: number[];
  monthlyDispenseTotals: number[];
  currentStockValue: number;
  cumulativeRequisition: number;
  onNavigateToInternal: () => void;
  onNavigateToExternal: () => void;
  onNavigateToAIPlanning?: () => void;
  onOpenPrint: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  drugs,
  externalDrugs,
  settings,
  monthlyReceiptTotals,
  monthlyDispenseTotals,
  currentStockValue,
  cumulativeRequisition,
  onNavigateToInternal,
  onNavigateToExternal,
  onNavigateToAIPlanning,
  onOpenPrint,
}) => {
  const remainingBudget = Math.max(0, settings.budgetTotal - cumulativeRequisition);
  const budgetUsagePercent = Math.min(
    100,
    settings.budgetTotal > 0 ? (cumulativeRequisition / settings.budgetTotal) * 100 : 0
  );

  const expiringCount = externalDrugs.filter(
    (d) => d.expiryStatus === 'warning' || d.expiryStatus === 'expired'
  ).length;

  const lowStockCount = drugs.filter((d) => (d.currentStock || 0) < 5).length;

  // Max value for bar chart scaling
  const maxMonthlyVal = Math.max(
    ...monthlyReceiptTotals,
    ...monthlyDispenseTotals,
    1000
  );

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Top Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-[#0d163a]/90 via-[#18113c]/85 to-[#2a0e2d]/80 border border-slate-700/60 shadow-[0_15px_35px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-pink-500/15 via-purple-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-pink-300 font-medium mb-2.5">
              <ShieldCheck className="w-3.5 h-3.5 text-pink-400" />
              <span>ปีงบประมาณ พ.ศ. {settings.fiscalYear}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-wide font-['Kanit']">
              ระบบบริหารคลังยา รพ.สต.บ้านห้วยแอ่ง <span className="text-pink-400">(ชายสดV1)</span>
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl font-light">
              ศูนย์รวมข้อมูลและติดตามคลังยาใน-คลังยานอก บัญชีรับ-จ่ายยา รายงานงบประมาณ และระบบตรวจสอบวันหมดอายุแบบดิจิทัล
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onNavigateToAIPlanning}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:opacity-95 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-lg shadow-purple-500/25 active:scale-95 transition-all"
            >
              <Brain className="w-4 h-4 text-amber-200 animate-pulse" />
              <span>วางแผนเบิกยา AI (3 รอบนัด)</span>
            </button>
            <button
              onClick={onNavigateToInternal}
              className="px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-600 text-slate-100 text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-md active:scale-95 transition-all"
            >
              <Building2 className="w-4 h-4 text-cyan-400" />
              <span>เบิก-จ่ายคลังยาใน</span>
            </button>
            <button
              onClick={onNavigateToExternal}
              className="px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-600 text-slate-100 text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-md active:scale-95 transition-all"
            >
              <PackageCheck className="w-4 h-4 text-pink-400" />
              <span>ตรวจสอบคลังยานอก</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Current Stock Value */}
        <div className="relative group overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-[#0c1432]/85 to-[#080d22]/90 border border-slate-700/70 hover:border-pink-500/50 shadow-xl backdrop-blur-xl transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/10 rounded-full blur-2xl group-hover:bg-pink-500/20 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">มูลค่ายาปัจจุบันในคลัง</span>
            <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center">
              <Coins className="w-5 h-5 text-pink-400" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
              ฿{currentStockValue.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-pink-300/80 mt-1 flex items-center gap-1 font-medium">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>คำนวณจากยอดคงเหลือ × ราคาทุน</span>
            </p>
          </div>
        </div>

        {/* Card 2: Remaining Budget */}
        <div className="relative group overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-[#0c1432]/85 to-[#080d22]/90 border border-slate-700/70 hover:border-purple-500/50 shadow-xl backdrop-blur-xl transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">มูลค่าคงเหลือเบิกในปีงบประมาณ</span>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-400" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono tracking-tight">
              ฿{remainingBudget.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center justify-between">
              <span>จากวงเงิน ฿{settings.budgetTotal.toLocaleString('th-TH')}</span>
              <span className="text-purple-300 font-mono">{budgetUsagePercent.toFixed(1)}% ใช้ไป</span>
            </p>
          </div>
        </div>

        {/* Card 3: Drug Catalog Count */}
        <div className="relative group overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-[#0c1432]/85 to-[#080d22]/90 border border-slate-700/70 hover:border-cyan-500/50 shadow-xl backdrop-blur-xl transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">รายการยามาตรฐาน</span>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <Layers className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
              {drugs.length} <span className="text-sm font-normal text-slate-400">รายการ</span>
            </div>
            <p className="text-xs text-cyan-300/80 mt-1 flex items-center gap-1.5">
              <span>คลังยาใน รพ.สต.บ้านห้วยแอ่ง</span>
            </p>
          </div>
        </div>

        {/* Card 4: External Pharmacy & Alerts */}
        <div className="relative group overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-[#0c1432]/85 to-[#080d22]/90 border border-slate-700/70 hover:border-orange-500/50 shadow-xl backdrop-blur-xl transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl group-hover:bg-orange-500/20 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">คลังยานอก & การเตือน</span>
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center">
              <PackageCheck className="w-5 h-5 text-orange-400" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight flex items-center gap-2">
              <span>{externalDrugs.length}</span>
              {expiringCount > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-950/80 text-red-400 border border-red-500/40 flex items-center gap-1 font-sans">
                  <AlertTriangle className="w-3 h-3" />
                  {expiringCount} ใกล้หมดอายุ
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center justify-between">
              <span>รายการเบิกจ่ายสะสม</span>
              <span className="text-orange-300">2 ผู้ตรวจกำกับ</span>
            </p>
          </div>
        </div>
      </div>

      {/* Middle Section: Budget Utilization Progress & Monthly Requisition Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (8 cols): Monthly Requisition vs Dispense Bar Chart */}
        <div className="lg:col-span-8 bg-[#091028]/80 rounded-3xl p-6 border border-slate-700/60 backdrop-blur-xl shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 font-['Kanit']">
                <Activity className="w-5 h-5 text-pink-400" />
                <span>การเคลื่อนไหวรับ-จ่ายยารายเดือน ปีงบฯ {settings.fiscalYear}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                เปรียบเทียบมูลค่ารับยาเข้า (เบิก) และมูลค่าจ่ายยาออกทั้ง 12 เดือน (ต.ค. - ก.ย.)
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="w-3 h-3 rounded bg-gradient-to-r from-orange-500 to-pink-500" />
                <span>รับเข้า (บาท)</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="w-3 h-3 rounded bg-purple-500" />
                <span>จ่ายออก (บาท)</span>
              </div>
            </div>
          </div>

          {/* Interactive Chart Container */}
          <div className="h-64 flex items-end justify-between gap-1 sm:gap-2 pt-6 pb-2 px-2 border-b border-slate-800">
            {MONTH_SHORT_NAMES.map((mName, i) => {
              const recVal = monthlyReceiptTotals[i] || 0;
              const dispVal = monthlyDispenseTotals[i] || 0;
              const recHeight = maxMonthlyVal > 0 ? (recVal / maxMonthlyVal) * 100 : 0;
              const dispHeight = maxMonthlyVal > 0 ? (dispVal / maxMonthlyVal) * 100 : 0;

              return (
                <div key={mName} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                  {/* Tooltip on hover */}
                  <div className="absolute -top-14 bg-slate-900 border border-slate-700 p-2 rounded-lg text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl z-20 whitespace-nowrap">
                    <p className="font-bold text-pink-300">เดือน {mName}</p>
                    <p>รับ: ฿{recVal.toLocaleString()}</p>
                    <p>จ่าย: ฿{dispVal.toLocaleString()}</p>
                  </div>

                  <div className="w-full flex items-end justify-center gap-1 h-full">
                    {/* Receive bar */}
                    <div
                      className="w-1/2 max-w-[14px] bg-gradient-to-t from-orange-600 to-pink-500 rounded-t-sm transition-all duration-500 hover:brightness-125"
                      style={{ height: `${Math.max(recHeight, 4)}%` }}
                    />
                    {/* Dispense bar */}
                    <div
                      className="w-1/2 max-w-[14px] bg-gradient-to-t from-purple-700 to-purple-400 rounded-t-sm transition-all duration-500 hover:brightness-125"
                      style={{ height: `${Math.max(dispHeight, 4)}%` }}
                    />
                  </div>

                  <span className="text-[10px] sm:text-xs text-slate-400 mt-2 font-mono">{mName}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
            <span>วงเงินงบประมาณรวมทั้งสิ้น: ฿{settings.budgetTotal.toLocaleString()}</span>
            <span className="text-pink-400 font-medium">เบิกสะสมรวม: ฿{cumulativeRequisition.toLocaleString()}</span>
          </div>
        </div>

        {/* Right (4 cols): Annual Budget Gauge & Quick Links */}
        <div className="lg:col-span-4 flex flex-col space-y-6">
          {/* Budget Gauge Card */}
          <div className="bg-[#091028]/80 rounded-3xl p-6 border border-slate-700/60 backdrop-blur-xl shadow-xl flex-1 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-white font-['Kanit'] flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-400" />
                <span>การบริหารงบประมาณปี {settings.fiscalYear}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">สัดส่วนการเบิกจ่ายเทียบกับเพดานงบ</p>
            </div>

            {/* Circular Progress Gauge */}
            <div className="my-6 flex flex-col items-center justify-center">
              <div className="relative w-40 h-40 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#1e293b"
                    strokeWidth="10"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="url(#budgetGrad)"
                    strokeWidth="10"
                    strokeDasharray={251.2}
                    strokeDashoffset={251.2 - (251.2 * budgetUsagePercent) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                  <defs>
                    <linearGradient id="budgetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#f97316" />
                      <stop offset="50%" stopColor="#ec4899" />
                      <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                  </defs>
                </svg>

                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-black text-white font-mono">
                    {budgetUsagePercent.toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest">ใช้ไปแล้ว</span>
                </div>
              </div>

              <div className="w-full mt-4 space-y-2 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">เบิกใช้สะสม:</span>
                  <span className="font-mono font-bold text-pink-400">
                    ฿{cumulativeRequisition.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">คงเหลือเบิกได้อีก:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    ฿{remainingBudget.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={onOpenPrint}
              className="w-full py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-600 text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5 text-amber-300" />
              <span>พิมพ์ชุดสรุปบัญชีประจำเดือน</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Summary: Top Essential Drugs & Expiring Alert List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Essential Medications Spotlight */}
        <div className="bg-[#091028]/80 rounded-3xl p-6 border border-slate-700/60 backdrop-blur-xl shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white font-['Kanit'] flex items-center gap-2">
              <Package className="w-4 h-4 text-cyan-400" />
              <span>รายการยาจำเป็นหลักในคลังยาใน (126 รายการ)</span>
            </h3>
            <button
              onClick={onNavigateToInternal}
              className="text-xs text-pink-400 hover:text-pink-300 flex items-center gap-1 font-medium"
            >
              <span>ดูทั้งหมด</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-800/80 max-h-72 overflow-y-auto pr-1">
            {drugs.slice(0, 6).map((d) => (
              <div key={d.id} className="py-2.5 flex items-center justify-between hover:bg-white/[0.02] px-2 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-slate-800 text-pink-400 font-mono text-xs font-bold flex items-center justify-center border border-slate-700">
                    {d.no}
                  </span>
                  <div>
                    <h4 className="text-xs sm:text-sm font-semibold text-slate-200">{d.name}</h4>
                    <span className="text-[11px] text-slate-400">
                      หน่วย: {d.unit} · หมวดหมู่: {d.category || 'ยาสามัญ'}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs sm:text-sm font-mono font-bold text-amber-300">
                    ฿{d.costPrice.toFixed(2)}
                  </div>
                  <span className="text-[10px] text-slate-500">ราคาทุนต่อหน่วย</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: External Pharmacy Verified Items & Expiry Notice */}
        <div className="bg-[#091028]/80 rounded-3xl p-6 border border-slate-700/60 backdrop-blur-xl shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white font-['Kanit'] flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-pink-400" />
              <span>รายการยาในคลังยานอก & สถานะวันหมดอายุ</span>
            </h3>
            <button
              onClick={onNavigateToExternal}
              className="text-xs text-pink-400 hover:text-pink-300 flex items-center gap-1 font-medium"
            >
              <span>ตรวจสอบ</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          {externalDrugs.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              ยังไม่มีรายการยาที่เบิกจ่ายเข้าคลังยานอก
              <br />
              <button
                onClick={onNavigateToInternal}
                className="mt-3 px-3 py-1.5 rounded-lg bg-pink-600/30 text-pink-300 hover:bg-pink-600/50 border border-pink-500/30 text-xs"
              >
                + ทำรายการเบิกยาจากคลังยาใน
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80 max-h-72 overflow-y-auto pr-1">
              {externalDrugs.slice(0, 6).map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between hover:bg-white/[0.02] px-2 rounded-lg transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-semibold text-slate-200">{item.name}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          item.expiryStatus === 'expired'
                            ? 'bg-red-950/80 text-red-400 border border-red-500/40'
                            : item.expiryStatus === 'warning'
                            ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
                            : 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40'
                        }`}
                      >
                        {item.expiryStatus === 'expired'
                          ? 'หมดอายุแล้ว'
                          : item.expiryStatus === 'warning'
                          ? 'ใกล้หมดอายุ'
                          : 'ปกติ'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      จำนวน: {item.quantity} {item.unit} · Lot: {item.lotNumber || '-'} · Exp: {item.expiryDate || '-'}
                    </p>
                  </div>

                  <div className="text-right text-[11px]">
                    <div className="text-slate-300 font-medium">{item.inspector1Name || 'รอตรวจสอบ'}</div>
                    <div className="text-[10px] text-slate-500">{item.inspector1Position || 'เจ้าหน้าที่'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

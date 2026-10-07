import React, { useState, useMemo } from 'react';
import {
  PackageCheck,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  PenTool,
  Printer,
  Download,
  Search,
  Filter,
  ShieldCheck,
  UserCheck,
  Building2,
  Sparkles,
  Coins,
  CheckSquare,
  Square,
} from 'lucide-react';
import { ExternalDrugItem, SystemSettings, AVAILABLE_INSPECTORS } from '../types/inventory';
import { DigitalSignaturePad } from './DigitalSignaturePad';

interface ExternalPharmacyViewProps {
  externalDrugs: ExternalDrugItem[];
  settings: SystemSettings;
  onUpdateExternalDrug: (id: string, updates: Partial<ExternalDrugItem>) => void;
  onBatchSignAll: (
    inspector1: { name: string; pos: string; sig: string },
    inspector2: { name: string; pos: string; sig: string }
  ) => void;
  onOpenPrint: () => void;
  onDownloadExcel: () => void;
  onNavigateToInternal: () => void;
}

export const ExternalPharmacyView: React.FC<ExternalPharmacyViewProps> = ({
  externalDrugs,
  settings,
  onUpdateExternalDrug,
  onBatchSignAll,
  onOpenPrint,
  onDownloadExcel,
  onNavigateToInternal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'not_expired' | 'within_6_months' | 'expired'>('all');

  // Signature modal state
  const [signingItem, setSigningItem] = useState<{
    item: ExternalDrugItem | null;
    inspectorSlot: 1 | 2;
  } | null>(null);

  // Batch Sign Modal State
  const [isBatchSignModalOpen, setIsBatchSignModalOpen] = useState(false);
  const [bInspector1Name, setBInspector1Name] = useState(
    settings.inspector1DefaultName || AVAILABLE_INSPECTORS[0].name
  );
  const [bInspector1Pos, setBInspector1Pos] = useState(
    settings.inspector1DefaultPos || AVAILABLE_INSPECTORS[0].position
  );
  const [bInspector1Sig, setBInspector1Sig] = useState<string>('');

  const [bInspector2Name, setBInspector2Name] = useState(
    settings.inspector2DefaultName || AVAILABLE_INSPECTORS[1].name
  );
  const [bInspector2Pos, setBInspector2Pos] = useState(
    settings.inspector2DefaultPos || AVAILABLE_INSPECTORS[1].position
  );
  const [bInspector2Sig, setBInspector2Sig] = useState<string>('');

  // Active signature drawer in batch modal
  const [activeBatchPadSlot, setActiveBatchPadSlot] = useState<1 | 2 | null>(null);

  // Total requisition value for this batch / external inventory
  const totalRequisitionValue = useMemo(() => {
    return externalDrugs.reduce((sum, item) => sum + item.quantity * item.costPrice, 0);
  }, [externalDrugs]);

  // Calculate days until expiry and mapped status
  const calculateDaysLeft = (expiryDateStr: string) => {
    if (!expiryDateStr) return { days: 999, status: 'not_expired' as const };
    const exp = new Date(expiryDateStr);
    if (isNaN(exp.getTime())) return { days: 999, status: 'not_expired' as const };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = exp.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return { days: diffDays, status: 'expired' as const };
    if (diffDays <= 180) return { days: diffDays, status: 'within_6_months' as const };
    return { days: diffDays, status: 'not_expired' as const };
  };

  // Resolve current active expiry choice for item
  const getResolvedStatus = (item: ExternalDrugItem): 'not_expired' | 'within_6_months' | 'expired' => {
    if (item.expiryStatus === 'expired') return 'expired';
    if (item.expiryStatus === 'within_6_months' || item.expiryStatus === 'warning') return 'within_6_months';
    if (item.expiryStatus === 'not_expired' || item.expiryStatus === 'safe') return 'not_expired';
    return calculateDaysLeft(item.expiryDate).status;
  };

  // Filtered external drugs
  const filteredItems = useMemo(() => {
    return externalDrugs.filter((item) => {
      const matchSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(item.drugNo).includes(searchTerm) ||
        (item.lotNumber && item.lotNumber.toLowerCase().includes(searchTerm.toLowerCase()));

      const currentStatus = getResolvedStatus(item);
      const matchStatus = statusFilter === 'all' || currentStatus === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [externalDrugs, searchTerm, statusFilter]);

  // Counts
  const counts = useMemo(() => {
    let not_expired = 0;
    let within_6_months = 0;
    let expired = 0;

    externalDrugs.forEach((d) => {
      const st = getResolvedStatus(d);
      if (st === 'expired') expired++;
      else if (st === 'within_6_months') within_6_months++;
      else not_expired++;
    });

    return { total: externalDrugs.length, not_expired, within_6_months, expired };
  }, [externalDrugs]);

  // Handle single item signature save
  const handleSaveItemSignature = (dataUrl: string) => {
    if (!signingItem?.item) return;
    const updates: Partial<ExternalDrugItem> = {};

    if (signingItem.inspectorSlot === 1) {
      updates.inspector1Signature = dataUrl;
      updates.inspector1Name =
        signingItem.item.inspector1Name || settings.inspector1DefaultName || AVAILABLE_INSPECTORS[0].name;
      updates.inspector1Position =
        signingItem.item.inspector1Position || settings.inspector1DefaultPos || AVAILABLE_INSPECTORS[0].position;
    } else {
      updates.inspector2Signature = dataUrl;
      updates.inspector2Name =
        signingItem.item.inspector2Name || settings.inspector2DefaultName || AVAILABLE_INSPECTORS[1].name;
      updates.inspector2Position =
        signingItem.item.inspector2Position || settings.inspector2DefaultPos || AVAILABLE_INSPECTORS[1].position;
    }

    updates.inspectionDate = new Date().toLocaleDateString('th-TH');
    onUpdateExternalDrug(signingItem.item.id, updates);
    setSigningItem(null);
  };

  // Submit Batch Sign
  const handleConfirmBatchSign = (e: React.FormEvent) => {
    e.preventDefault();
    onBatchSignAll(
      { name: bInspector1Name, pos: bInspector1Pos, sig: bInspector1Sig },
      { name: bInspector2Name, pos: bInspector2Pos, sig: bInspector2Sig }
    );
    setIsBatchSignModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Top Banner with Total Requisition Value */}
      <div className="bg-[#091028]/85 rounded-3xl p-5 sm:p-6 border border-slate-700/60 shadow-xl backdrop-blur-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-xs text-pink-300 font-medium mb-1">
              <PackageCheck className="w-3.5 h-3.5" />
              <span>คลังยานอก (Requisitioned Drug Inventory & Expiry Inspection)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white font-['Kanit']">
              ระบบตรวจสอบและกำกับคลังยานอก รพ.สต.บ้านห้วยแอ่ง
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              แสดงเฉพาะรายการยาที่ถูกเบิกมาจาก <strong>&quot;คลังยาใน&quot;</strong> · มีช่องตรวจวันหมดอายุ 3 ตัวเลือก พร้อมระบบลงชื่อผู้ตรวจสอบ
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* PROMINENT HEADER DISPLAY: Total Requisition Value */}
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-amber-500/15 border-2 border-amber-500/40 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <Coins className="w-5 h-5 text-amber-400 animate-pulse" />
              <div>
                <span className="text-[10px] text-amber-300/80 uppercase tracking-wider block">
                  มูลค่าที่เบิกยาครั้งนี้ (Total Value)
                </span>
                <span className="text-base sm:text-lg font-black font-mono text-amber-300">
                  ฿{totalRequisitionValue.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsBatchSignModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 hover:opacity-95 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-lg shadow-pink-500/25 active:scale-95 transition-all"
            >
              <PenTool className="w-4 h-4 text-amber-200" />
              <span>ลงชื่อผู้ตรวจสอบ 2 คน (ชุดรวม)</span>
            </button>

            <button
              onClick={onOpenPrint}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all active:scale-95"
            >
              <Printer className="w-4 h-4 text-amber-300" />
              <span>พิมพ์ใบตรวจสอบคลังยานอก</span>
            </button>
          </div>
        </div>

        {/* 4 Status Filter Buttons: All, ไม่หมดอายุ, หมดอายุภายใน 6 เดือน, หมดอายุ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800">
          <button
            onClick={() => setStatusFilter('all')}
            className={`p-3 rounded-2xl border text-left transition-all ${
              statusFilter === 'all'
                ? 'bg-slate-800/80 border-pink-500 shadow-md'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <span className="text-[11px] text-slate-400 block">รายการยาทั้งหมด</span>
            <span className="text-xl font-bold font-mono text-white">{counts.total}</span>
          </button>

          <button
            onClick={() => setStatusFilter('not_expired')}
            className={`p-3 rounded-2xl border text-left transition-all ${
              statusFilter === 'not_expired'
                ? 'bg-emerald-950/40 border-emerald-500 shadow-md'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <span className="text-[11px] text-emerald-400 block flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>ไม่หมดอายุ</span>
            </span>
            <span className="text-xl font-bold font-mono text-emerald-300">{counts.not_expired}</span>
          </button>

          <button
            onClick={() => setStatusFilter('within_6_months')}
            className={`p-3 rounded-2xl border text-left transition-all ${
              statusFilter === 'within_6_months'
                ? 'bg-amber-950/40 border-amber-500 shadow-md'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <span className="text-[11px] text-amber-400 block flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>หมดอายุภายใน 6 เดือน</span>
            </span>
            <span className="text-xl font-bold font-mono text-amber-300">{counts.within_6_months}</span>
          </button>

          <button
            onClick={() => setStatusFilter('expired')}
            className={`p-3 rounded-2xl border text-left transition-all ${
              statusFilter === 'expired'
                ? 'bg-red-950/40 border-red-500 shadow-md'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <span className="text-[11px] text-red-400 block flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              <span>หมดอายุ</span>
            </span>
            <span className="text-xl font-bold font-mono text-red-400">{counts.expired}</span>
          </button>
        </div>

        {/* Search and Item Counter */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="relative w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหายาที่เบิกมา, Lot number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 text-xs transition-colors"
            />
          </div>

          <div className="text-slate-400 text-xs">
            แสดง <strong className="text-pink-400">{filteredItems.length}</strong> จากทั้งหมด {externalDrugs.length} รายการ
          </div>
        </div>
      </div>

      {/* Main Table for External Pharmacy */}
      <div className="bg-[#091028]/95 rounded-3xl border border-slate-700/60 shadow-2xl overflow-hidden backdrop-blur-xl">
        {filteredItems.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <PackageCheck className="w-12 h-12 mx-auto text-slate-600 animate-pulse" />
            <h3 className="text-base font-bold text-white">ยังไม่มีรายการยาในคลังยานอก</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              รายการยาในคลังยานอกจะปรากฏเมื่อมีการเบิกจ่ายยาออกมาจาก &quot;คลังยาใน&quot;
            </p>
            <button
              onClick={onNavigateToInternal}
              className="mt-3 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-pink-600 text-white text-xs font-semibold shadow-md active:scale-95"
            >
              ➔ ไปยังคลังยาในเพื่อเบิกยา
            </button>
          </div>
        ) : (
          <div className="max-h-[72vh] overflow-y-auto overflow-x-auto relative">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="sticky top-0 z-20 bg-[#0e1738] shadow-md border-b-2 border-slate-700">
                <tr className="bg-[#0e1738] text-white border-b border-slate-700 text-center uppercase tracking-wider font-semibold">
                  <th className="py-3 px-2 w-12 border-r border-slate-700">ลำดับ</th>
                  <th className="py-3 px-3 text-left border-r border-slate-700 min-w-[190px]">ชื่อยา (เบิกจากคลังยาใน)</th>
                  <th className="py-3 px-2 w-16 border-r border-slate-700">หน่วย</th>
                  <th className="py-3 px-2 w-20 border-r border-slate-700">จำนวนที่เบิก</th>
                  <th className="py-3 px-2 w-24 border-r border-slate-700">Lot Number</th>
                  <th className="py-3 px-3 w-56 border-r border-slate-700 bg-pink-950/30 text-pink-300">
                    🔍 ผลการตรวจวันหมดอายุ (3 ตัวเลือก)
                  </th>
                  <th className="py-3 px-3 w-52 border-r border-slate-700 bg-purple-950/20 text-purple-300">
                    ✍️ ผู้ตรวจสอบคนที่ 1
                  </th>
                  <th className="py-3 px-3 w-52 bg-purple-950/20 text-purple-300">
                    ✍️ ผู้ตรวจสอบคนที่ 2
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredItems.map((item, index) => {
                  const { days } = calculateDaysLeft(item.expiryDate);
                  const resolvedStatus = getResolvedStatus(item);

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-2 text-center font-mono font-bold text-pink-400 border-r border-slate-800">
                        {index + 1}
                      </td>

                      <td className="py-3 px-3 font-semibold text-slate-100 border-r border-slate-800">
                        <div className="text-xs">{item.name}</div>
                        <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                          ราคาทุน: ฿{item.costPrice.toFixed(2)} · มูลค่า: ฿{(item.quantity * item.costPrice).toFixed(2)}
                        </div>
                      </td>

                      <td className="py-3 px-2 text-center font-mono text-slate-300 border-r border-slate-800">
                        {item.unit}
                      </td>

                      <td className="py-3 px-2 text-center font-mono font-bold text-amber-300 border-r border-slate-800">
                        {item.quantity.toLocaleString()}
                      </td>

                      <td className="py-3 px-2 text-center font-mono text-slate-300 border-r border-slate-800">
                        {item.lotNumber || '-'}
                      </td>

                      {/* SPECIAL COLUMN: 3 Checkbox Options for Expiration Inspection */}
                      <td className="py-3 px-3 border-r border-slate-700 bg-pink-950/10">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-mono text-slate-300 font-medium">
                              Exp: {item.expiryDate || 'ไม่ได้ระบุ'}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {days <= 0 ? `(เกิน ${Math.abs(days)} วัน)` : `(เหลือ ${days} วัน)`}
                            </span>
                          </div>

                          {/* 3 Clickable Checkboxes */}
                          <div className="space-y-1 text-xs">
                            {/* Option 1: ไม่หมดอายุ */}
                            <button
                              type="button"
                              onClick={() => onUpdateExternalDrug(item.id, { expiryStatus: 'not_expired' })}
                              className={`w-full flex items-center gap-1.5 px-2 py-1 rounded-lg border text-left transition-all ${
                                resolvedStatus === 'not_expired'
                                  ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300 font-bold shadow-sm'
                                  : 'bg-slate-900/50 border-slate-700/60 text-slate-400 hover:text-white'
                              }`}
                            >
                              {resolvedStatus === 'not_expired' ? (
                                <CheckSquare className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                              ) : (
                                <Square className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                              )}
                              <span>ไม่หมดอายุ</span>
                            </button>

                            {/* Option 2: หมดอายุภายใน 6 เดือน */}
                            <button
                              type="button"
                              onClick={() => onUpdateExternalDrug(item.id, { expiryStatus: 'within_6_months' })}
                              className={`w-full flex items-center gap-1.5 px-2 py-1 rounded-lg border text-left transition-all ${
                                resolvedStatus === 'within_6_months'
                                  ? 'bg-amber-950/70 border-amber-500 text-amber-300 font-bold shadow-sm'
                                  : 'bg-slate-900/50 border-slate-700/60 text-slate-400 hover:text-white'
                              }`}
                            >
                              {resolvedStatus === 'within_6_months' ? (
                                <CheckSquare className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                              ) : (
                                <Square className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                              )}
                              <span>หมดอายุภายใน 6 เดือน</span>
                            </button>

                            {/* Option 3: หมดอายุ */}
                            <button
                              type="button"
                              onClick={() => onUpdateExternalDrug(item.id, { expiryStatus: 'expired' })}
                              className={`w-full flex items-center gap-1.5 px-2 py-1 rounded-lg border text-left transition-all ${
                                resolvedStatus === 'expired'
                                  ? 'bg-red-950/70 border-red-500 text-red-300 font-bold shadow-sm'
                                  : 'bg-slate-900/50 border-slate-700/60 text-slate-400 hover:text-white'
                              }`}
                            >
                              {resolvedStatus === 'expired' ? (
                                <CheckSquare className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                              ) : (
                                <Square className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                              )}
                              <span>หมดอายุ</span>
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* INSPECTOR 1 */}
                      <td className="py-3 px-3 border-r border-slate-700 bg-slate-900/30">
                        <div className="flex flex-col space-y-1.5">
                          {/* Selector for Inspector 1 */}
                          <select
                            value={item.inspector1Name || settings.inspector1DefaultName || AVAILABLE_INSPECTORS[0].name}
                            onChange={(e) => {
                              const found = AVAILABLE_INSPECTORS.find((ins) => ins.name === e.target.value);
                              onUpdateExternalDrug(item.id, {
                                inspector1Name: e.target.value,
                                inspector1Position: found ? found.position : item.inspector1Position,
                              });
                            }}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 text-[11px] font-semibold focus:border-pink-500 focus:outline-none"
                          >
                            {AVAILABLE_INSPECTORS.map((ins) => (
                              <option key={ins.name} value={ins.name}>
                                {ins.name}
                              </option>
                            ))}
                          </select>

                          <div className="text-[10px] text-slate-400">
                            {item.inspector1Position || settings.inspector1DefaultPos || AVAILABLE_INSPECTORS[0].position}
                          </div>

                          {/* Digital Signature Display */}
                          <div
                            onClick={() => setSigningItem({ item, inspectorSlot: 1 })}
                            className="h-12 w-full bg-slate-100 rounded-lg border border-slate-300 p-1 flex items-center justify-center cursor-pointer hover:border-pink-500 transition-colors shadow-sm relative group"
                            title="คลิกเพื่อเซ็นชื่อหรือแก้ไขลายเซ็น"
                          >
                            {item.inspector1Signature ? (
                              <img
                                src={item.inspector1Signature}
                                alt="Signature 1"
                                className="max-h-full max-w-full object-contain"
                              />
                            ) : (
                              <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 group-hover:text-pink-600">
                                <PenTool className="w-3 h-3 text-pink-500" />
                                <span>คลิกเพื่อลงลายเซ็น</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* INSPECTOR 2 */}
                      <td className="py-3 px-3 bg-slate-900/30">
                        <div className="flex flex-col space-y-1.5">
                          {/* Selector for Inspector 2 */}
                          <select
                            value={item.inspector2Name || settings.inspector2DefaultName || AVAILABLE_INSPECTORS[1].name}
                            onChange={(e) => {
                              const found = AVAILABLE_INSPECTORS.find((ins) => ins.name === e.target.value);
                              onUpdateExternalDrug(item.id, {
                                inspector2Name: e.target.value,
                                inspector2Position: found ? found.position : item.inspector2Position,
                              });
                            }}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 text-[11px] font-semibold focus:border-purple-500 focus:outline-none"
                          >
                            {AVAILABLE_INSPECTORS.map((ins) => (
                              <option key={ins.name} value={ins.name}>
                                {ins.name}
                              </option>
                            ))}
                          </select>

                          <div className="text-[10px] text-slate-400">
                            {item.inspector2Position || settings.inspector2DefaultPos || AVAILABLE_INSPECTORS[1].position}
                          </div>

                          {/* Digital Signature Display */}
                          <div
                            onClick={() => setSigningItem({ item, inspectorSlot: 2 })}
                            className="h-12 w-full bg-slate-100 rounded-lg border border-slate-300 p-1 flex items-center justify-center cursor-pointer hover:border-pink-500 transition-colors shadow-sm relative group"
                            title="คลิกเพื่อเซ็นชื่อหรือแก้ไขลายเซ็น"
                          >
                            {item.inspector2Signature ? (
                              <img
                                src={item.inspector2Signature}
                                alt="Signature 2"
                                className="max-h-full max-w-full object-contain"
                              />
                            ) : (
                              <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 group-hover:text-purple-600">
                                <PenTool className="w-3 h-3 text-purple-500" />
                                <span>คลิกเพื่อลงลายเซ็น</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: Individual Signature Drawing Pad Modal */}
      {signingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="bg-[#0c1432] border border-slate-700 rounded-3xl p-6 w-full max-w-md shadow-2xl animate-scale-up">
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
              <PenTool className="w-5 h-5 text-pink-400" />
              <span>ลงลายเซ็นดิจิทัล ผู้ตรวจสอบคนที่ {signingItem.inspectorSlot}</span>
            </h3>

            <div className="mb-3 text-xs text-slate-300 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <p>
                <strong>รายการยา:</strong> {signingItem.item?.name}
              </p>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Lot: {signingItem.item?.lotNumber || '-'} · วันหมดอายุ: {signingItem.item?.expiryDate || '-'}
              </p>
            </div>

            <DigitalSignaturePad
              inspectorName={
                signingItem.inspectorSlot === 1
                  ? signingItem.item?.inspector1Name || settings.inspector1DefaultName || AVAILABLE_INSPECTORS[0].name
                  : signingItem.item?.inspector2Name || settings.inspector2DefaultName || AVAILABLE_INSPECTORS[1].name
              }
              initialSignature={
                signingItem.inspectorSlot === 1
                  ? signingItem.item?.inspector1Signature
                  : signingItem.item?.inspector2Signature
              }
              onSave={handleSaveItemSignature}
              onClose={() => setSigningItem(null)}
            />
          </div>
        </div>
      )}

      {/* MODAL 2: Batch 2-Inspector Signing Modal with Inspector Choices */}
      {isBatchSignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-[#0c1432] border border-slate-700 rounded-3xl p-6 w-full max-w-2xl shadow-2xl animate-scale-up my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-pink-400" />
                <span>ระบบลงชื่อผู้ตรวจสอบ 2 คน ประจำรอบคลังยานอก (ชุดรวม)</span>
              </h3>
              <button onClick={() => setIsBatchSignModalOpen(false)} className="text-slate-400 hover:text-white text-lg">
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmBatchSign} className="mt-4 space-y-6 text-xs">
              <p className="text-slate-300 text-xs">
                เลือกระบุผู้ตรวจสอบจากรายชื่อบุคลากรประจำ และลงลายเซ็นกำกับในทุกรายการยาของคลังยานอก
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Inspector 1 Panel */}
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-700/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-pink-300 text-sm flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-pink-400" />
                      <span>ผู้ตรวจสอบคนที่ 1</span>
                    </span>
                    <span className="text-[10px] text-slate-400">ผู้ตรวจสอบ</span>
                  </div>

                  <div>
                    <label className="text-slate-300 block mb-1">เลือกผู้ตรวจสอบ *</label>
                    <select
                      value={bInspector1Name}
                      onChange={(e) => {
                        setBInspector1Name(e.target.value);
                        const found = AVAILABLE_INSPECTORS.find((ins) => ins.name === e.target.value);
                        if (found) setBInspector1Pos(found.position);
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-pink-400 focus:outline-none mb-2"
                    >
                      {AVAILABLE_INSPECTORS.map((ins) => (
                        <option key={ins.name} value={ins.name}>
                          {ins.name} ({ins.position})
                        </option>
                      ))}
                    </select>

                    <label className="text-slate-400 block mb-1 text-[11px]">หรือแก้ไขชื่อ-นามสกุล:</label>
                    <input
                      type="text"
                      required
                      value={bInspector1Name}
                      onChange={(e) => setBInspector1Name(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-white focus:border-pink-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 block mb-1">ตำแหน่งงาน *</label>
                    <input
                      type="text"
                      required
                      value={bInspector1Pos}
                      onChange={(e) => setBInspector1Pos(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-pink-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 block mb-1">ลายเซ็นดิจิทัล</label>
                    {activeBatchPadSlot === 1 ? (
                      <DigitalSignaturePad
                        inspectorName={bInspector1Name}
                        initialSignature={bInspector1Sig}
                        onSave={(sig) => {
                          setBInspector1Sig(sig);
                          setActiveBatchPadSlot(null);
                        }}
                        onClose={() => setActiveBatchPadSlot(null)}
                      />
                    ) : (
                      <div
                        onClick={() => setActiveBatchPadSlot(1)}
                        className="h-20 w-full bg-slate-100 rounded-xl border-2 border-slate-600 flex items-center justify-center cursor-pointer p-1 relative shadow-inner"
                      >
                        {bInspector1Sig ? (
                          <img src={bInspector1Sig} alt="Sig 1" className="max-h-full max-w-full object-contain" />
                        ) : (
                          <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                            <PenTool className="w-3.5 h-3.5 text-pink-500" />
                            <span>คลิกเพื่อวาดลายเซ็น</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Inspector 2 Panel */}
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-700/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-300 text-sm flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-purple-400" />
                      <span>ผู้ตรวจสอบคนที่ 2</span>
                    </span>
                    <span className="text-[10px] text-slate-400">ผู้ตรวจสอบ</span>
                  </div>

                  <div>
                    <label className="text-slate-300 block mb-1">เลือกผู้ตรวจสอบ *</label>
                    <select
                      value={bInspector2Name}
                      onChange={(e) => {
                        setBInspector2Name(e.target.value);
                        const found = AVAILABLE_INSPECTORS.find((ins) => ins.name === e.target.value);
                        if (found) setBInspector2Pos(found.position);
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-purple-400 focus:outline-none mb-2"
                    >
                      {AVAILABLE_INSPECTORS.map((ins) => (
                        <option key={ins.name} value={ins.name}>
                          {ins.name} ({ins.position})
                        </option>
                      ))}
                    </select>

                    <label className="text-slate-400 block mb-1 text-[11px]">หรือแก้ไขชื่อ-นามสกุล:</label>
                    <input
                      type="text"
                      required
                      value={bInspector2Name}
                      onChange={(e) => setBInspector2Name(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-white focus:border-purple-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 block mb-1">ตำแหน่งงาน *</label>
                    <input
                      type="text"
                      required
                      value={bInspector2Pos}
                      onChange={(e) => setBInspector2Pos(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-purple-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 block mb-1">ลายเซ็นดิจิทัล</label>
                    {activeBatchPadSlot === 2 ? (
                      <DigitalSignaturePad
                        inspectorName={bInspector2Name}
                        initialSignature={bInspector2Sig}
                        onSave={(sig) => {
                          setBInspector2Sig(sig);
                          setActiveBatchPadSlot(null);
                        }}
                        onClose={() => setActiveBatchPadSlot(null)}
                      />
                    ) : (
                      <div
                        onClick={() => setActiveBatchPadSlot(2)}
                        className="h-20 w-full bg-slate-100 rounded-xl border-2 border-slate-600 flex items-center justify-center cursor-pointer p-1 relative shadow-inner"
                      >
                        {bInspector2Sig ? (
                          <img src={bInspector2Sig} alt="Sig 2" className="max-h-full max-w-full object-contain" />
                        ) : (
                          <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                            <PenTool className="w-3.5 h-3.5 text-purple-500" />
                            <span>คลิกเพื่อวาดลายเซ็น</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBatchSignModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 hover:opacity-95 text-white font-bold transition-all shadow-lg active:scale-95"
                >
                  บันทึกลายเซ็นกำกับทั้ง 2 ท่าน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};


import React, { useState, useMemo } from 'react';
import {
  Brain,
  Calendar,
  Package,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Printer,
  Search,
  Filter,
  PlusCircle,
  FileText,
  Sparkles,
  Users,
  Clock,
  ShieldCheck,
  ChevronRight,
  Info,
  Layers,
  Edit2,
  Trash2,
  RefreshCw,
  Coins,
  CheckSquare,
  Square,
} from 'lucide-react';
import {
  Drug,
  PatientPID,
  ClinicSession,
  PickListItem,
  RestockPlanningItem,
  AIStockAnalysisReport,
  SystemSettings,
} from '../types/inventory';
import {
  getUpcoming3FridaySessions,
  calculatePickListForSession,
  calculateRestockPlanning,
  runGeminiStrategicAnalysis,
} from '../utils/aiPlanningEngine';
import { PickListPrintModal } from './PickListPrintModal';
import { RestockOrderPrintModal } from './RestockOrderPrintModal';
import { PatientFormModal } from './PatientFormModal';

interface AIPlanningViewProps {
  drugs: Drug[];
  ledgerValues: Record<string, string | number>;
  patients: PatientPID[];
  onAddPatient: (patient: PatientPID) => void;
  onUpdatePatient: (patient: PatientPID) => void;
  onDeletePatient: (id: string) => void;
  onResetDefaultPatients: () => void;
  settings: SystemSettings;
}

export const AIPlanningView: React.FC<AIPlanningViewProps> = ({
  drugs,
  ledgerValues,
  patients,
  onAddPatient,
  onUpdatePatient,
  onDeletePatient,
  onResetDefaultPatients,
  settings,
}) => {
  // Navigation tabs within AI Planning
  const [activeTab, setActiveTab] = useState<'restock' | 'picklist' | 'patients'>('restock');

  // Sessions: 3 upcoming Friday clinic dates
  const sessions = useMemo(() => getUpcoming3FridaySessions(), []);
  const [selectedSessionIdx, setSelectedSessionIdx] = useState<number>(0);
  const activeSession = sessions[selectedSessionIdx] || sessions[0];

  // Restock calculation across 3 sessions
  const restockItems = useMemo(() => {
    return calculateRestockPlanning(patients, sessions, drugs, ledgerValues);
  }, [patients, sessions, drugs, ledgerValues]);

  // Pick list calculation for currently selected session
  const pickListItems = useMemo(() => {
    return calculatePickListForSession(patients, activeSession.cycleType, drugs, ledgerValues);
  }, [patients, activeSession, drugs, ledgerValues]);

  // Filters for Restock Table
  const [restockFilter, setRestockFilter] = useState<'all' | 'critical' | 'safe'>('all');
  const [restockSearch, setRestockSearch] = useState('');

  // Filters for Patients Table
  const [patientSearch, setPatientSearch] = useState('');
  const [patientCycleFilter, setPatientCycleFilter] = useState<'all' | 'fri_1' | 'fri_3'>('all');

  // Pick list view mode
  const [picklistMode, setPicklistMode] = useState<'summary' | 'patient_checklist'>('summary');
  const [checkedPids, setCheckedPids] = useState<Record<string, boolean>>({});

  // Modals state
  const [isPickListPrintOpen, setIsPickListPrintOpen] = useState(false);
  const [isRestockPrintOpen, setIsRestockPrintOpen] = useState(false);
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [patientToEdit, setPatientToEdit] = useState<PatientPID | null>(null);

  // Gemini AI Strategic Report State
  const [aiReport, setAiReport] = useState<AIStockAnalysisReport | null>(null);
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);

  // Key KPI Numbers
  const criticalItems = useMemo(() => restockItems.filter((i) => i.recommendedOrderQty > 0), [restockItems]);
  const totalRecommendedQty = useMemo(
    () => criticalItems.reduce((sum, i) => sum + i.recommendedOrderQty, 0),
    [criticalItems]
  );
  const totalEstimatedCost = useMemo(
    () => criticalItems.reduce((sum, i) => sum + i.estimatedCost, 0),
    [criticalItems]
  );
  const safeItemsCount = restockItems.length - criticalItems.length;

  // Filtered restock items
  const filteredRestockItems = useMemo(() => {
    return restockItems.filter((item) => {
      const matchSearch =
        item.drugName.toLowerCase().includes(restockSearch.toLowerCase()) ||
        String(item.drugNo).includes(restockSearch);
      const matchFilter =
        restockFilter === 'all' ||
        (restockFilter === 'critical' && item.recommendedOrderQty > 0) ||
        (restockFilter === 'safe' && item.recommendedOrderQty === 0);
      return matchSearch && matchFilter;
    });
  }, [restockItems, restockSearch, restockFilter]);

  // Filtered patients
  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
        p.pid.toLowerCase().includes(patientSearch.toLowerCase()) ||
        p.clinicGroup.toLowerCase().includes(patientSearch.toLowerCase());
      const matchCycle =
        patientCycleFilter === 'all' || p.appointmentCycle === patientCycleFilter;
      return matchSearch && matchCycle;
    });
  }, [patients, patientSearch, patientCycleFilter]);

  // Run Gemini Strategic Analysis
  const handleRunAIAnalysis = async () => {
    setIsAnalyzingAI(true);
    try {
      const report = await runGeminiStrategicAnalysis(restockItems, sessions, patients);
      setAiReport(report);
    } catch {
      // Fallback
    } finally {
      setIsAnalyzingAI(false);
    }
  };

  const toggleCheckPatient = (pid: string) => {
    setCheckedPids((prev) => ({ ...prev, [pid]: !prev[pid] }));
  };

  return (
    <div className="space-y-6 pb-16 animate-fade-in text-xs">
      {/* Top Futuristic Header Banner */}
      <div className="bg-[#091028]/85 rounded-3xl p-5 sm:p-6 border border-slate-700/60 shadow-xl backdrop-blur-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30 text-xs text-pink-300 font-medium mb-1">
              <Brain className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
              <span>AI Drug Restock & Dispensing Engine (นโยบาย 3 รอบนัด)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white font-['Kanit'] flex items-center gap-2">
              <span>ระบบ AI คำนวณวางแผนเบิกยาสำรองและจัดยารายนัด</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              คำนวณยอดจัดยาสำหรับรอบจ่ายยาทุกวันศุกร์ที่ 1 และ 3 พร้อมวิเคราะห์ยอดเบิกยาสำรองเข้าคลังใหญ่ให้ครอบคลุมการจ่าย <strong>3 รอบนัดถัดไป</strong> เสมอ
            </p>
          </div>

          {/* Quick Timeline Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 flex items-center gap-1.5 text-[11px]">
              <Calendar className="w-3.5 h-3.5 text-pink-400" />
              <span>จ่ายยา: <strong>ศุกร์ที่ 1 & 3</strong> (2 รอบ/ด.)</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 flex items-center gap-1.5 text-[11px]">
              <Package className="w-3.5 h-3.5 text-amber-400" />
              <span>เบิกใหญ่: <strong>1 ครั้ง/เดือน</strong> (รับกลางเดือน)</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-pink-950/40 border border-pink-500/40 text-pink-300 flex items-center gap-1.5 text-[11px] font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-pink-400" />
              <span>เกณฑ์สำรอง: <strong>3 รอบนัดถัดไป</strong></span>
            </div>
          </div>
        </div>

        {/* Tab Switcher Buttons */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab('restock')}
            className={`px-4 py-2.5 rounded-2xl font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'restock'
                ? 'bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/25'
                : 'bg-slate-900/60 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-amber-200" />
            <span>AI วางแผนเบิกยาสำรอง 3 รอบนัด</span>
            {criticalItems.length > 0 && (
              <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                {criticalItems.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('picklist')}
            className={`px-4 py-2.5 rounded-2xl font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'picklist'
                ? 'bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/25'
                : 'bg-slate-900/60 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4 text-pink-300" />
            <span>ใบเตรียมยารายนัด (Pick List)</span>
          </button>

          <button
            onClick={() => setActiveTab('patients')}
            className={`px-4 py-2.5 rounded-2xl font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'patients'
                ? 'bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/25'
                : 'bg-slate-900/60 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            <Users className="w-4 h-4 text-cyan-300" />
            <span>ทะเบียนผู้ป่วย PID ({patients.length} ราย)</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          TAB 1: MONTHLY 3-CYCLE RESTOCK CALCULATION ENGINE
         ======================================================== */}
      {activeTab === 'restock' && (
        <div className="space-y-6">
          {/* 4 Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Recommended Order Quantity */}
            <div className="bg-[#091028]/85 p-5 rounded-3xl border border-slate-700/60 shadow-xl backdrop-blur-xl relative overflow-hidden group">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-medium uppercase tracking-wider">AI แนะนำเบิกเพิ่ม (รวม)</span>
                <div className="w-9 h-9 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
                  <Package className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl sm:text-3xl font-black font-mono text-amber-300">
                  {totalRecommendedQty.toLocaleString()}
                </span>
                <span className="text-xs text-slate-400 ml-1.5">หน่วย</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                <span className="text-amber-400 font-semibold">{criticalItems.length} รายการยา</span>
                <span>ที่ยอดคงคลังไม่พอจ่าย 3 รอบ</span>
              </div>
            </div>

            {/* Card 2: Estimated Restock Budget */}
            <div className="bg-[#091028]/85 p-5 rounded-3xl border border-slate-700/60 shadow-xl backdrop-blur-xl relative overflow-hidden group">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-medium uppercase tracking-wider">มูลค่างบประมาณที่ต้องเบิก</span>
                <div className="w-9 h-9 rounded-2xl bg-pink-500/10 flex items-center justify-center text-pink-400 border border-pink-500/20">
                  <Coins className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl sm:text-3xl font-black font-mono text-pink-300">
                  ฿{totalEstimatedCost.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 mt-2">
                คำนวณจาก [ยอดเบิกเพิ่ม × ราคาทุน]
              </div>
            </div>

            {/* Card 3: Stockout Risk Alert */}
            <div className="bg-[#091028]/85 p-5 rounded-3xl border border-slate-700/60 shadow-xl backdrop-blur-xl relative overflow-hidden group">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-medium uppercase tracking-wider">สถานะความเสี่ยงยาขาดคลัง</span>
                <div className={`w-9 h-9 rounded-2xl flex items-center justify-center border ${
                  criticalItems.length > 0
                    ? 'bg-red-500/10 text-red-400 border-red-500/30'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                }`}>
                  {criticalItems.length > 0 ? (
                    <AlertTriangle className="w-4 h-4" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                </div>
              </div>
              <div className="mt-3">
                <span className={`text-2xl sm:text-3xl font-black font-mono ${
                  criticalItems.length > 0 ? 'text-red-400' : 'text-emerald-400'
                }`}>
                  {criticalItems.length > 0 ? `${criticalItems.length} รายการ` : 'ปลอดภัย 100%'}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 mt-2">
                {safeItemsCount} รายการมีสต็อกเพียงพอ 3 รอบ
              </div>
            </div>

            {/* Card 4: Registered PIDs */}
            <div className="bg-[#091028]/85 p-5 rounded-3xl border border-slate-700/60 shadow-xl backdrop-blur-xl relative overflow-hidden group">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-medium uppercase tracking-wider">ผู้ป่วยในระบบคลินิก</span>
                <div className="w-9 h-9 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl sm:text-3xl font-black font-mono text-cyan-300">
                  {patients.length}
                </span>
                <span className="text-xs text-slate-400 ml-1.5">คน (PID)</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-2">
                รอบศุกร์ที่ 1: {patients.filter((p) => p.appointmentCycle === 'fri_1').length} คน · รอบศุกร์ที่ 3: {patients.filter((p) => p.appointmentCycle === 'fri_3').length} คน
              </div>
            </div>
          </div>

          {/* 3 Upcoming Friday Clinic Sessions Timeline Carousel */}
          <div className="bg-[#091028]/90 p-5 rounded-3xl border border-slate-700/60 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-pink-400" />
                <span>จำลองไทม์ไลน์ 3 รอบนัดถัดไป ที่นำมาใช้คำนวณยอดเบิกสำรอง</span>
              </h3>
              <span className="text-[11px] text-slate-400">
                นโยบายสำรองยา รพ.สต.บ้านห้วยแอ่ง (Buffer for Monthly Restock)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {sessions.map((s, idx) => {
                const count = patients.filter((p) => p.appointmentCycle === s.cycleType).length;
                return (
                  <div
                    key={s.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      idx === 0
                        ? 'bg-pink-950/20 border-pink-500/40'
                        : idx === 1
                        ? 'bg-purple-950/20 border-purple-500/40'
                        : 'bg-indigo-950/20 border-indigo-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-pink-300">รอบที่ {s.sessionNumber}</span>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-700">
                        {s.dateStr}
                      </span>
                    </div>
                    <div className="font-extrabold text-sm text-white mt-1">{s.title}</div>
                    <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
                      <span>ประเภทนัด: <strong>{s.cycleType === 'fri_1' ? 'ศุกร์ที่ 1' : 'ศุกร์ที่ 3'}</strong></span>
                      <span className="text-white font-mono font-bold bg-slate-900/80 px-2 py-0.5 rounded">
                        ผู้ป่วย {count} คน
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Strategic Gemini AI Advisor Box */}
          <div className="bg-gradient-to-r from-purple-950/40 via-pink-950/30 to-slate-950/60 rounded-3xl p-5 border border-purple-500/30 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-purple-500/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  <Brain className="w-5 h-5 text-pink-400 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <span>Gemini AI Strategic Advisor · ข้อเสนอแนะเชิงกลยุทธ์</span>
                    <span className="px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 text-[10px] border border-pink-500/30">
                      Smart Planning
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    วิเคราะห์ความเสี่ยงยาขาดคลัง อัตราความต่อเนื่องของการรักษา และแผนการใช้จ่ายงบประมาณ
                  </p>
                </div>
              </div>

              <button
                onClick={handleRunAIAnalysis}
                disabled={isAnalyzingAI}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 hover:opacity-95 text-white font-bold flex items-center gap-2 shadow-lg shadow-pink-500/25 active:scale-95 transition-all self-start sm:self-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzingAI ? 'animate-spin' : ''}`} />
                <span>{isAnalyzingAI ? 'AI กำลังประมวลผล...' : '🤖 ให้ AI วิเคราะห์กลยุทธ์เชิงลึก'}</span>
              </button>
            </div>

            {aiReport ? (
              <div className="mt-4 space-y-3 animate-fade-in text-xs">
                <div className="p-3 rounded-2xl bg-slate-900/80 border border-purple-500/30 text-slate-200">
                  <div className="font-bold text-pink-300 text-xs mb-1">📋 บทสรุปสถานะคลังยา:</div>
                  <p className="leading-relaxed">{aiReport.summary}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-2xl bg-slate-900/70 border border-slate-800 text-slate-300">
                    <div className="font-bold text-red-400 flex items-center gap-1.5 mb-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>จุดเสี่ยงและข้อเฝ้าระวัง (Stockout Risks):</span>
                    </div>
                    <ul className="space-y-1 list-disc list-inside text-[11px] text-slate-300">
                      {aiReport.stockoutRisks.map((risk, i) => (
                        <li key={i}>{risk}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-900/70 border border-slate-800 text-slate-300">
                    <div className="font-bold text-emerald-400 flex items-center gap-1.5 mb-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>คำแนะนำการเบิกยา (Ordering Action):</span>
                    </div>
                    <ul className="space-y-1 list-disc list-inside text-[11px] text-slate-300">
                      {aiReport.orderingRecommendations.map((rec, i) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950/90 border border-slate-800 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-bold text-cyan-300">ข้อเสนอแนะเชิงปฏิบัติการ: </span>
                    <span className="text-slate-300">{aiReport.executiveAdvice}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-3 text-slate-400 text-xs flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-pink-400" />
                <span>คลิกปุ่ม <strong>&quot;ให้ AI วิเคราะห์กลยุทธ์เชิงลึก&quot;</strong> เพื่อให้ระบบสังเคราะห์ข้อแนะนำและตรวจจับความเสี่ยงยาขาดคลังล่วงหน้า</span>
              </div>
            )}
          </div>

          {/* Main Restock Planning Table */}
          <div className="bg-[#091028]/95 rounded-3xl border border-slate-700/60 shadow-2xl overflow-hidden backdrop-blur-xl">
            {/* Table Control Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Layers className="w-4 h-4 text-pink-400" />
                  <span>ตารางวิเคราะห์ความต้องการยา 3 รอบนัดและสูตรคำนวณเบิกยา AI</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  สูตร: [ปริมาณยาที่ต้องเบิกเพิ่ม] = [ยอดรวมยาที่ต้องใช้ใน 3 รอบนัดถัดไป] − [ปริมาณยาคงเหลือในคลังปัจจุบัน]
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {/* Search */}
                <div className="relative w-48 sm:w-60">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อยา, รหัสยา..."
                    value={restockSearch}
                    onChange={(e) => setRestockSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 text-xs"
                  />
                </div>

                {/* Filter */}
                <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-700">
                  <button
                    onClick={() => setRestockFilter('all')}
                    className={`px-2.5 py-1 rounded-lg font-semibold ${
                      restockFilter === 'all'
                        ? 'bg-pink-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    ทั้งหมด ({restockItems.length})
                  </button>
                  <button
                    onClick={() => setRestockFilter('critical')}
                    className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 ${
                      restockFilter === 'critical'
                        ? 'bg-red-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>ต้องเบิกเพิ่ม</span>
                    <span className="bg-red-950 px-1.5 rounded text-[10px]">{criticalItems.length}</span>
                  </button>
                  <button
                    onClick={() => setRestockFilter('safe')}
                    className={`px-2.5 py-1 rounded-lg font-semibold ${
                      restockFilter === 'safe'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    ยาเพียงพอ ({safeItemsCount})
                  </button>
                </div>

                {/* Print Order Slip Button */}
                <button
                  onClick={() => setIsRestockPrintOpen(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-95 text-white font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all text-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>🖨 พิมพ์ใบเสนอเบิกยา AI (A4)</span>
                </button>
              </div>
            </div>

            {/* Scrollable Table */}
            <div className="max-h-[68vh] overflow-y-auto overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="sticky top-0 z-20 bg-[#0e1738] shadow-md border-b-2 border-slate-700 text-center uppercase tracking-wider font-semibold text-slate-200">
                  <tr>
                    <th className="py-3 px-2 w-10 border-r border-slate-700">ลำดับ</th>
                    <th className="py-3 px-3 text-left border-r border-slate-700 min-w-[190px]">ชื่อยา</th>
                    <th className="py-3 px-2 w-14 border-r border-slate-700">หน่วย</th>
                    <th className="py-3 px-2 w-16 border-r border-slate-700">ราคาทุน</th>
                    <th className="py-3 px-2 w-20 border-r border-slate-700 bg-slate-900/60 text-slate-300">
                      คงคลังปัจจุบัน
                    </th>
                    <th className="py-3 px-2 w-16 border-r border-slate-700 text-slate-400">รอบ 1</th>
                    <th className="py-3 px-2 w-16 border-r border-slate-700 text-slate-400">รอบ 2</th>
                    <th className="py-3 px-2 w-16 border-r border-slate-700 text-slate-400">รอบ 3</th>
                    <th className="py-3 px-2 w-20 border-r border-slate-700 bg-purple-950/30 text-purple-200 font-bold">
                      รวม 3 รอบนัด
                    </th>
                    <th className="py-3 px-3 w-28 border-r border-slate-700 bg-amber-950/40 text-amber-300 font-black">
                      AI แนะนำเบิกเพิ่ม
                    </th>
                    <th className="py-3 px-3 w-24 border-r border-slate-700 text-pink-300">มูลค่าที่เบิก</th>
                    <th className="py-3 px-3 w-44 bg-slate-900/80">สถานะความพร้อมคลัง</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredRestockItems.map((item, idx) => {
                    const isCritical = item.recommendedOrderQty > 0;
                    return (
                      <tr
                        key={item.drugNo}
                        className={`hover:bg-slate-800/40 transition-colors ${
                          isCritical ? 'bg-amber-950/15' : ''
                        }`}
                      >
                        <td className="py-3 px-2 text-center font-mono font-bold text-pink-400 border-r border-slate-800">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-100 border-r border-slate-800">
                          <div>{item.drugName}</div>
                          <div className="text-[10px] text-slate-500 font-normal">
                            รหัสยา: {item.drugNo} · ครอบคลุม: {item.coverageSessions} รอบนัด
                          </div>
                        </td>
                        <td className="py-3 px-2 text-center text-slate-300 border-r border-slate-800">
                          {item.unit}
                        </td>
                        <td className="py-3 px-2 text-center font-mono text-slate-300 border-r border-slate-800">
                          ฿{item.costPrice.toFixed(2)}
                        </td>
                        <td className="py-3 px-2 text-center font-mono font-bold text-white border-r border-slate-800 bg-slate-900/30">
                          {item.currentStock.toLocaleString()}
                        </td>
                        <td className="py-3 px-2 text-center font-mono text-slate-400 border-r border-slate-800">
                          {item.cycle1Usage || '-'}
                        </td>
                        <td className="py-3 px-2 text-center font-mono text-slate-400 border-r border-slate-800">
                          {item.cycle2Usage || '-'}
                        </td>
                        <td className="py-3 px-2 text-center font-mono text-slate-400 border-r border-slate-800">
                          {item.cycle3Usage || '-'}
                        </td>
                        <td className="py-3 px-2 text-center font-mono font-bold text-purple-300 border-r border-slate-800 bg-purple-950/20">
                          {item.totalRequiredNext3Cycles.toLocaleString()}
                        </td>

                        {/* AI Recommended Order Qty */}
                        <td className="py-3 px-3 text-center border-r border-slate-800 bg-amber-950/20">
                          {isCritical ? (
                            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-black text-sm">
                              +{item.recommendedOrderQty.toLocaleString()}
                            </div>
                          ) : (
                            <span className="font-mono text-slate-500 text-xs">0 (พอจ่าย)</span>
                          )}
                        </td>

                        {/* Estimated Cost */}
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-200 border-r border-slate-800">
                          {isCritical ? `฿${item.estimatedCost.toFixed(2)}` : '-'}
                        </td>

                        {/* Status Label */}
                        <td className="py-3 px-3">
                          {isCritical ? (
                            <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                              <span>ต้องเบิกเพิ่ม {item.recommendedOrderQty} {item.unit}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                              <span>ยามีเพียงพอ ไม่ต้องเบิกเพิ่ม</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 2: PER-VISIT PICK LIST & DISPENSING SLIP
         ======================================================== */}
      {activeTab === 'picklist' && (
        <div className="space-y-6">
          {/* Clinic Session Selector Card */}
          <div className="bg-[#091028]/90 p-5 rounded-3xl border border-slate-700/60 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="text-[11px] text-pink-400 font-semibold mb-1">
                เลือกรอบนัดคลินิกที่ต้องการจัดเตรียมยา
              </div>
              <h3 className="text-base font-bold text-white font-['Kanit'] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-pink-400" />
                <span>{activeSession.title}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                รอบจ่ายยา: <strong>{activeSession.cycleType === 'fri_1' ? 'ทุกวันศุกร์ที่ 1 ของเดือน' : 'ทุกวันศุกร์ที่ 3 ของเดือน'}</strong> · มีผู้ป่วย {pickListItems.reduce((acc, it) => acc + it.patientCount, 0)} ยอดสั่งยา
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Session Switcher */}
              <div className="flex items-center bg-slate-900 p-1 rounded-2xl border border-slate-700">
                {sessions.map((s, idx) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSessionIdx(idx)}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all text-xs ${
                      selectedSessionIdx === idx
                        ? 'bg-gradient-to-r from-orange-500 to-pink-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    รอบ {idx + 1} ({s.cycleType === 'fri_1' ? 'ศุกร์ที่ 1' : 'ศุกร์ที่ 3'})
                  </button>
                ))}
              </div>

              {/* View Mode Switcher */}
              <div className="flex items-center bg-slate-900 p-1 rounded-2xl border border-slate-700 text-xs">
                <button
                  onClick={() => setPicklistMode('summary')}
                  className={`px-3 py-1.5 rounded-xl font-bold ${
                    picklistMode === 'summary'
                      ? 'bg-pink-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ตารางสรุปยอดหยิบยา
                </button>
                <button
                  onClick={() => setPicklistMode('patient_checklist')}
                  className={`px-3 py-1.5 rounded-xl font-bold ${
                    picklistMode === 'patient_checklist'
                      ? 'bg-pink-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  จัดยาลงซองรายบุคคล
                </button>
              </div>

              <button
                onClick={() => setIsPickListPrintOpen(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-95 text-white font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all text-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>🖨 พิมพ์ใบเตรียมยารายนัด A4</span>
              </button>
            </div>
          </div>

          {/* VIEW MODE 1: SUMMARY PICK LIST TABLE */}
          {picklistMode === 'summary' ? (
            <div className="bg-[#091028]/95 rounded-3xl border border-slate-700/60 shadow-2xl overflow-hidden backdrop-blur-xl">
              <div className="p-4 border-b border-slate-800 flex justify-between items-center text-xs">
                <span className="font-bold text-white">
                  รายการยาที่ต้องหยิบจัดเตรียมในรอบนี้ ({pickListItems.length} ชนิด)
                </span>
                <span className="text-slate-400">
                  ปริมาณยารวมที่ต้องจ่าย: <strong className="text-pink-400 font-mono text-sm">{pickListItems.reduce((sum, i) => sum + i.totalRequiredQty, 0).toLocaleString()}</strong> หน่วย
                </span>
              </div>

              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-[#0e1738] text-slate-200 uppercase font-semibold text-center border-b border-slate-700">
                  <tr>
                    <th className="py-3 px-2 w-12 border-r border-slate-700">ลำดับ</th>
                    <th className="py-3 px-3 text-left border-r border-slate-700 min-w-[200px]">ชื่อยา</th>
                    <th className="py-3 px-2 w-16 border-r border-slate-700">หน่วย</th>
                    <th className="py-3 px-2 w-24 border-r border-slate-700">จำนวนผู้ป่วยที่ใช้</th>
                    <th className="py-3 px-3 w-32 border-r border-slate-700 bg-pink-950/30 text-pink-300 font-bold">
                      ยอดรวมที่ต้องจัดเตรียม
                    </th>
                    <th className="py-3 px-3 w-28 border-r border-slate-700 text-slate-400">คงคลังปัจจุบัน</th>
                    <th className="py-3 px-3 min-w-[220px] text-left">รายชื่อผู้ป่วย (PID)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {pickListItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-500">
                        ยังไม่มีรายการยาสำหรับรอบนัดนี้ (กรุณาตรวจสอบการลงทะเบียนผู้ป่วยในรอบนัด)
                      </td>
                    </tr>
                  ) : (
                    pickListItems.map((item, idx) => (
                      <tr key={item.drugNo} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-2 text-center font-mono font-bold text-pink-400 border-r border-slate-800">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-100 border-r border-slate-800">
                          {item.drugName} <span className="text-[10px] text-slate-500">({item.drugNo})</span>
                        </td>
                        <td className="py-3 px-2 text-center text-slate-300 border-r border-slate-800">
                          {item.unit}
                        </td>
                        <td className="py-3 px-2 text-center font-mono text-cyan-300 border-r border-slate-800 font-bold">
                          {item.patientCount} คน
                        </td>
                        <td className="py-3 px-3 text-center border-r border-slate-800 bg-pink-950/20">
                          <span className="font-mono font-black text-pink-300 text-base">
                            {item.totalRequiredQty.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-slate-400 border-r border-slate-800">
                          {item.currentStock.toLocaleString()}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1.5">
                            {item.patients.map((p, pIdx) => (
                              <span
                                key={pIdx}
                                className="inline-flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-[11px] text-slate-300"
                              >
                                <span className="font-mono text-pink-400">{p.pid}</span>
                                <span>{p.name.split(' ')[0]}</span>
                                <strong className="text-amber-300 font-mono">({p.qty})</strong>
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* VIEW MODE 2: PATIENT DISPENSING CHECKLIST */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(() => {
                const activePatients = patients.filter((p) => p.appointmentCycle === activeSession.cycleType);
                if (activePatients.length === 0) {
                  return (
                    <div className="col-span-2 p-12 text-center text-slate-500 bg-[#091028]/85 rounded-3xl border border-slate-800">
                      ไม่มีผู้ป่วยนัดในรอบ {activeSession.title}
                    </div>
                  );
                }

                return activePatients.map((pat) => {
                  const isChecked = Boolean(checkedPids[pat.pid]);
                  return (
                    <div
                      key={pat.pid}
                      className={`p-4 rounded-3xl border transition-all ${
                        isChecked
                          ? 'bg-emerald-950/30 border-emerald-500/50 shadow-md'
                          : 'bg-[#091028]/90 border-slate-700/60 shadow-lg'
                      }`}
                    >
                      <div className="flex items-start justify-between pb-2.5 border-b border-slate-800">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono bg-pink-950/80 text-pink-300 border border-pink-500/30 px-2 py-0.5 rounded-lg font-bold text-xs">
                              {pat.pid}
                            </span>
                            <span className="font-bold text-sm text-white">{pat.name}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1">
                            อายุ {pat.age} ปี · {pat.clinicGroup}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleCheckPatient(pat.pid)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                            isChecked
                              ? 'bg-emerald-500 text-black border-emerald-400 font-bold'
                              : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                          }`}
                        >
                          {isChecked ? (
                            <>
                              <CheckSquare className="w-4 h-4 text-black" />
                              <span>จัดยาเสร็จแล้ว</span>
                            </>
                          ) : (
                            <>
                              <Square className="w-4 h-4 text-slate-500" />
                              <span>คลิกเมื่อจัดยาเสร็จ</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Patient Meds List */}
                      <div className="mt-3 space-y-2">
                        {pat.medications.map((m, mIdx) => (
                          <div
                            key={mIdx}
                            className="flex items-center justify-between p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs"
                          >
                            <div className="flex-1">
                              <span className="font-semibold text-slate-200">• {m.drugName}</span>
                              <div className="text-[10px] text-slate-400">{m.instructions || 'ตามแพทย์สั่ง'}</div>
                            </div>
                            <span className="font-mono font-bold text-amber-300 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700 ml-2">
                              {m.qtyPerCycle} {m.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          TAB 3: PATIENT PID REGISTRY & MEDICATION REGIMEN
         ======================================================== */}
      {activeTab === 'patients' && (
        <div className="space-y-4">
          <div className="bg-[#091028]/90 p-5 rounded-3xl border border-slate-700/60 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white font-['Kanit'] flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-400" />
                <span>ทะเบียนข้อมูลผู้ป่วยรายบุคคล (Patient PID Registry)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                จัดเก็บข้อมูล PID, สูตรยาประจำที่ต้องใช้, และรอบนัดประจำ (ศุกร์ที่ 1 หรือ 3)
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Search */}
              <div className="relative w-48 sm:w-60">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหา PID, ชื่อผู้ป่วย, คลินิก..."
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-xs"
                />
              </div>

              {/* Cycle Filter */}
              <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-700">
                <button
                  onClick={() => setPatientCycleFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-semibold ${
                    patientCycleFilter === 'all'
                      ? 'bg-cyan-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ทั้งหมด ({patients.length})
                </button>
                <button
                  onClick={() => setPatientCycleFilter('fri_1')}
                  className={`px-2.5 py-1 rounded-lg font-semibold ${
                    patientCycleFilter === 'fri_1'
                      ? 'bg-pink-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ศุกร์ที่ 1
                </button>
                <button
                  onClick={() => setPatientCycleFilter('fri_3')}
                  className={`px-2.5 py-1 rounded-lg font-semibold ${
                    patientCycleFilter === 'fri_3'
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ศุกร์ที่ 3
                </button>
              </div>

              {/* Add Patient Button */}
              <button
                onClick={() => {
                  setPatientToEdit(null);
                  setIsPatientModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 hover:opacity-95 text-white font-bold flex items-center gap-1.5 shadow-lg active:scale-95 transition-all text-xs"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ เพิ่มผู้ป่วย PID ใหม่</span>
              </button>

              <button
                onClick={onResetDefaultPatients}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                title="รีเซ็ตกลับเป็นตัวอย่างผู้ป่วยมาตรฐาน"
              >
                🔄 รีเซ็ตตัวอย่าง
              </button>
            </div>
          </div>

          {/* Patients Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPatients.map((pat) => (
              <div
                key={pat.id}
                className="bg-[#091028]/95 rounded-3xl p-4 border border-slate-700/60 shadow-xl backdrop-blur-xl flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono bg-pink-950/80 text-pink-300 border border-pink-500/30 px-2 py-0.5 rounded-lg font-bold text-xs">
                        {pat.pid}
                      </span>
                      <h4 className="font-bold text-white text-sm mt-1">{pat.name}</h4>
                      <div className="text-[10px] text-slate-400">
                        อายุ {pat.age} ปี ({pat.gender || 'ไม่ระบุ'}) · {pat.clinicGroup}
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border ${
                        pat.appointmentCycle === 'fri_1'
                          ? 'bg-pink-950/50 border-pink-500/40 text-pink-300'
                          : 'bg-purple-950/50 border-purple-500/40 text-purple-300'
                      }`}
                    >
                      {pat.appointmentCycle === 'fri_1' ? 'ศุกร์ที่ 1' : 'ศุกร์ที่ 3'}
                    </span>
                  </div>

                  {/* Medicines list */}
                  <div className="mt-3 pt-3 border-t border-slate-800 space-y-1.5">
                    <div className="text-[10px] text-slate-400 font-semibold">
                      ยาประจำรอบนัด ({pat.medications.length} ชนิด):
                    </div>
                    {pat.medications.map((m, mIdx) => (
                      <div
                        key={mIdx}
                        className="flex items-center justify-between text-[11px] bg-slate-950/70 p-1.5 rounded-lg border border-slate-800"
                      >
                        <span className="text-slate-300 truncate max-w-[170px]">• {m.drugName}</span>
                        <span className="font-mono font-bold text-amber-300">
                          {m.qtyPerCycle} {m.unit}
                        </span>
                      </div>
                    ))}
                  </div>

                  {pat.notes && (
                    <div className="mt-2.5 text-[10px] text-slate-500 bg-slate-900/50 p-2 rounded-xl">
                      📝 {pat.notes}
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                  <button
                    onClick={() => {
                      setPatientToEdit(pat);
                      setIsPatientModalOpen(true);
                    }}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                    title="แก้ไข"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeletePatient(pat.id)}
                    className="p-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/50 text-red-400"
                    title="ลบ"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODALS */}
      <PickListPrintModal
        isOpen={isPickListPrintOpen}
        onClose={() => setIsPickListPrintOpen(false)}
        session={activeSession}
        pickList={pickListItems}
        settings={settings}
      />

      <RestockOrderPrintModal
        isOpen={isRestockPrintOpen}
        onClose={() => setIsRestockPrintOpen(false)}
        planningItems={restockItems}
        sessions={sessions}
        settings={settings}
      />

      <PatientFormModal
        isOpen={isPatientModalOpen}
        onClose={() => setIsPatientModalOpen(false)}
        onSave={(pat) => {
          if (patientToEdit) {
            onUpdatePatient(pat);
          } else {
            onAddPatient(pat);
          }
        }}
        patientToEdit={patientToEdit}
        drugs={drugs}
      />
    </div>
  );
};

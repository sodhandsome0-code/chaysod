import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Users,
  Search,
  CheckSquare,
  Square,
  Calendar,
  Layers,
  ArrowRight,
  Filter,
  X,
  FileText,
  UserCheck,
  RefreshCw,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { PatientPID, ClinicSession } from '../types/inventory';

interface PatientImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: PatientPID[];
  activeSession: ClinicSession;
  onSelectPatientsForSession: (selectedPids: string[], sessionLabel?: string) => void;
  currentSelectedPids: string[];
}

export const PatientImportModal: React.FC<PatientImportModalProps> = ({
  isOpen,
  onClose,
  patients,
  activeSession,
  onSelectPatientsForSession,
  currentSelectedPids,
}) => {
  if (!isOpen) return null;

  // Working set of selected PIDs
  const [selectedPids, setSelectedPids] = useState<Set<string>>(() => {
    if (currentSelectedPids && currentSelectedPids.length > 0) {
      return new Set(currentSelectedPids);
    }
    // Default: all patients matching current session cycle
    const matching = patients
      .filter((p) => p.appointmentCycle === activeSession.cycleType)
      .map((p) => p.pid);
    return new Set(matching);
  });

  const [activeImportTab, setActiveImportTab] = useState<'system_select' | 'file_upload'>('system_select');
  const [searchQuery, setSearchQuery] = useState('');
  const [cycleFilter, setCycleFilter] = useState<'all' | 'match_session' | 'fri_1' | 'fri_3'>('match_session');
  const [uploadFeedback, setUploadFeedback] = useState<{
    matched: string[];
    notFound: string[];
    totalParsed: number;
    filename: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter patients in list
  const filteredPatients = patients.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const matchQuery =
      !q ||
      p.pid.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      p.clinicGroup.toLowerCase().includes(q);

    let matchCycle = true;
    if (cycleFilter === 'match_session') {
      matchCycle = p.appointmentCycle === activeSession.cycleType;
    } else if (cycleFilter === 'fri_1') {
      matchCycle = p.appointmentCycle === 'fri_1';
    } else if (cycleFilter === 'fri_3') {
      matchCycle = p.appointmentCycle === 'fri_3';
    }

    return matchQuery && matchCycle;
  });

  const togglePid = (pid: string) => {
    setSelectedPids((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) {
        next.delete(pid);
      } else {
        next.add(pid);
      }
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    setSelectedPids((prev) => {
      const next = new Set(prev);
      filteredPatients.forEach((p) => next.add(p.pid));
      return next;
    });
  };

  const handleDeselectAllVisible = () => {
    setSelectedPids((prev) => {
      const next = new Set(prev);
      filteredPatients.forEach((p) => next.delete(p.pid));
      return next;
    });
  };

  const handleSelectAllMatchingCycle = () => {
    const matching = patients
      .filter((p) => p.appointmentCycle === activeSession.cycleType)
      .map((p) => p.pid);
    setSelectedPids(new Set(matching));
  };

  // Handle CSV / Excel File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        const parsedPids: string[] = [];

        rawJson.forEach((row) => {
          if (Array.isArray(row)) {
            row.forEach((cell) => {
              if (cell !== undefined && cell !== null) {
                const str = String(cell).trim();
                // Match PID patterns like PID-1001, PID1001, or numbers like 1001 or HN
                const matches = str.match(/PID[-_\s]?\d+/gi);
                if (matches) {
                  matches.forEach((m) => parsedPids.push(m.replace(/\s+/g, '').toUpperCase()));
                } else if (/^\d{4,6}$/.test(str)) {
                  parsedPids.push(`PID-${str}`);
                }
              }
            });
          }
        });

        // Unique PIDs from file
        const uniqueUploaded = Array.from(new Set(parsedPids));
        const existingPidMap = new Map<string, string>();
        patients.forEach((p) => {
          existingPidMap.set(p.pid.toLowerCase().replace(/[^a-z0-9]/g, ''), p.pid);
        });

        const matched: string[] = [];
        const notFound: string[] = [];

        uniqueUploaded.forEach((raw) => {
          const normalized = raw.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (existingPidMap.has(normalized)) {
            matched.push(existingPidMap.get(normalized)!);
          } else {
            notFound.push(raw);
          }
        });

        // Automatically add matched PIDs to selection
        setSelectedPids((prev) => {
          const next = new Set(prev);
          matched.forEach((m) => next.add(m));
          return next;
        });

        setUploadFeedback({
          matched,
          notFound,
          totalParsed: uniqueUploaded.length,
          filename: file.name,
        });
      } catch (err) {
        alert('เกิดข้อผิดพลาดในการอ่านไฟล์ กรุณาตรวจสอบว่าเป็นไฟล์ CSV หรือ Excel (.xlsx) ที่ถูกต้อง');
      }
    };

    reader.readAsBinaryString(file);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleApply = () => {
    onSelectPatientsForSession(Array.from(selectedPids));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#0b1330] border border-slate-700 rounded-3xl p-6 w-full max-w-4xl shadow-2xl animate-scale-up my-4 text-xs text-white max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800 shrink-0">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-medium mb-1">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <span>รอบนัดจัดยา: {activeSession.title}</span>
            </div>
            <h3 className="text-lg font-bold text-white font-['Kanit'] flex items-center gap-2">
              <Users className="w-5 h-5 text-pink-400" />
              <span>เลือกและนำเข้ารายชื่อ PID ประจำวันนัด (Daily Patient Import & Processing)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              ระบบจะนำรายชื่อ PID ที่เลือกมาคำนวณสรุปยอดรวมยาที่ต้องจัดในนัดนี้ และสร้างใบเตรียมยารายบุคคลอัตโนมัติ
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 pt-4 pb-3 border-b border-slate-800/80 shrink-0">
          <button
            onClick={() => setActiveImportTab('system_select')}
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${
              activeImportTab === 'system_select'
                ? 'bg-gradient-to-r from-orange-500 to-pink-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <UserCheck className="w-4 h-4 text-pink-200" />
            <span>เลือกจากทะเบียน PID ในระบบ ({selectedPids.size} รายที่เลือก)</span>
          </button>

          <button
            onClick={() => setActiveImportTab('file_upload')}
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${
              activeImportTab === 'file_upload'
                ? 'bg-gradient-to-r from-orange-500 to-pink-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Upload className="w-4 h-4 text-cyan-300" />
            <span>นำเข้าไฟล์รายชื่อ PID (CSV / Excel)</span>
          </button>
        </div>

        {/* Body based on tab */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {activeImportTab === 'system_select' && (
            <div className="space-y-4">
              {/* Quick Preset Buttons & Search */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
                {/* Search */}
                <div className="md:col-span-5 relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ค้นหา PID, ชื่อ-นามสกุล, หรือคลินิก..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-pink-500"
                  />
                </div>

                {/* Filter Cycle */}
                <div className="md:col-span-4 flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
                  <button
                    onClick={() => setCycleFilter('match_session')}
                    className={`px-2 py-1 rounded-lg font-semibold flex-1 ${
                      cycleFilter === 'match_session' ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    รอบนัดปัจจุบัน
                  </button>
                  <button
                    onClick={() => setCycleFilter('all')}
                    className={`px-2 py-1 rounded-lg font-semibold flex-1 ${
                      cycleFilter === 'all' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    ทุกรอบนัด
                  </button>
                </div>

                {/* Preset Actions */}
                <div className="md:col-span-3 flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={handleSelectAllVisible}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-semibold border border-slate-700"
                  >
                    เลือกทั้งหมด
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAllVisible}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 text-[11px] font-semibold border border-slate-700"
                  >
                    ล้างการเลือก
                  </button>
                </div>
              </div>

              {/* Patient Selection Cards/Table */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredPatients.length === 0 ? (
                  <div className="col-span-3 p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                    ไม่พบข้อมูลผู้ป่วยที่ตรงตามเงื่อนไขการค้นหา
                  </div>
                ) : (
                  filteredPatients.map((pat) => {
                    const isSelected = selectedPids.has(pat.pid);
                    const isCycleMatch = pat.appointmentCycle === activeSession.cycleType;

                    return (
                      <div
                        key={pat.id}
                        onClick={() => togglePid(pat.pid)}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-gradient-to-br from-pink-950/40 to-purple-950/30 border-pink-500/70 shadow-lg shadow-pink-500/10'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-1.5">
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-pink-400 shrink-0" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-600 shrink-0" />
                              )}
                              <span className="font-mono font-bold text-pink-300 bg-pink-950/60 border border-pink-500/30 px-1.5 py-0.5 rounded text-[11px]">
                                {pat.pid}
                              </span>
                            </div>

                            <span
                              className={`text-[9px] px-2 py-0.5 rounded-md font-bold border ${
                                isCycleMatch
                                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                                  : 'bg-slate-800 border-slate-700 text-slate-400'
                              }`}
                            >
                              {pat.appointmentCycle === 'fri_1' ? 'ศุกร์ 1' : 'ศุกร์ 3'}
                            </span>
                          </div>

                          <h4 className="font-bold text-sm text-white mt-1.5">{pat.name}</h4>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            อายุ {pat.age} ปี · {pat.clinicGroup}
                          </div>

                          {/* Meds preview */}
                          <div className="mt-2 pt-2 border-t border-slate-800/80 text-[10px] space-y-0.5">
                            <div className="text-slate-500 font-semibold">
                              ยาประจำ ({pat.medications.length} ชนิด):
                            </div>
                            <div className="text-slate-300 truncate">
                              {pat.medications.map((m) => `${m.drugName} (${m.qtyPerCycle})`).join(', ')}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {activeImportTab === 'file_upload' && (
            <div className="space-y-4">
              {/* File Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-pink-500 rounded-3xl p-8 text-center cursor-pointer transition-colors bg-slate-900/50 hover:bg-slate-900/80 group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  className="hidden"
                />
                <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-orange-500 via-pink-500 to-purple-600 p-[2px] mb-3 group-hover:scale-105 transition-transform">
                  <div className="w-full h-full bg-[#0b1330] rounded-2xl flex items-center justify-center">
                    <FileSpreadsheet className="w-7 h-7 text-pink-400" />
                  </div>
                </div>
                <h4 className="text-base font-bold text-white font-['Kanit']">
                  คลิกเพื่อเลือกไฟล์รายชื่อผู้ป่วย (CSV หรือ Excel)
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  รองรับไฟล์ตารางนัดหมายที่มีคอลัมน์ <strong>PID</strong> (เช่น PID-1001, 1001, หรือ HN) ระบบจะค้นหาและจับคู่กับฐานข้อมูลผู้ป่วยในระบบโดยอัตโนมัติ
                </p>
                <div className="inline-flex items-center gap-2 mt-4 px-3 py-1.5 rounded-xl bg-slate-800 text-[11px] text-cyan-300">
                  <FileText className="w-3.5 h-3.5" />
                  <span>รองรับทั้ง .xlsx, .xls และ .csv</span>
                </div>
              </div>

              {/* Upload Feedback */}
              {uploadFeedback && (
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <div>
                        <h4 className="font-bold text-white text-sm">
                          ประมวลผลไฟล์สำเร็จ: {uploadFeedback.filename}
                        </h4>
                        <div className="text-[11px] text-slate-400">
                          อ่านรหัสได้ทั้งหมด {uploadFeedback.totalParsed} รายการ
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40">
                      <span className="font-bold text-emerald-300 block mb-1">
                        ✓ ตรงกับทะเบียน PID ในระบบ ({uploadFeedback.matched.length} ราย):
                      </span>
                      <div className="max-h-28 overflow-y-auto text-[11px] text-slate-300 space-y-0.5">
                        {uploadFeedback.matched.map((m, idx) => (
                          <div key={idx} className="font-mono">
                            • {m}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/40">
                      <span className="font-bold text-amber-300 block mb-1">
                        ⚠️ ไม่พบในทะเบียนผู้ป่วย ({uploadFeedback.notFound.length} ราย):
                      </span>
                      <div className="max-h-28 overflow-y-auto text-[11px] text-slate-400 space-y-0.5">
                        {uploadFeedback.notFound.length === 0 ? (
                          <span>ครบทุกรายการ</span>
                        ) : (
                          uploadFeedback.notFound.map((nf, idx) => (
                            <div key={idx} className="font-mono">
                              • {nf}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">จำนวน PID ที่เลือกเตรียมจัดยา:</span>
            <span className="px-2.5 py-1 rounded-xl bg-pink-950/80 border border-pink-500/50 text-pink-300 font-mono font-bold text-sm">
              {selectedPids.size} ราย
            </span>
            <button
              onClick={handleSelectAllMatchingCycle}
              className="text-xs text-cyan-400 hover:underline ml-2"
            >
              (รีเซ็ตเป็นรอบนัดมาตรฐาน {activeSession.cycleType === 'fri_1' ? 'ศุกร์ 1' : 'ศุกร์ 3'})
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 hover:opacity-95 text-white font-bold flex items-center gap-2 shadow-lg active:scale-95 transition-all text-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>ยืนยันและประมวลผลยอดจัดยา ({selectedPids.size} PID)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

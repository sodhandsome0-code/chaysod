import React, { useState, useMemo, useRef } from 'react';
import {
  Building2,
  PlusCircle,
  ArrowRightLeft,
  Search,
  Filter,
  Download,
  Printer,
  RotateCcw,
  Save,
  CheckCircle,
  FileSpreadsheet,
  Calendar,
  AlertCircle,
  Trash2,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { Drug, ExternalDrugItem, SystemSettings } from '../types/inventory';
import { MONTH_NAMES, MONTH_SHORT_NAMES } from '../data/defaultDrugs';

interface InternalPharmacyViewProps {
  drugs: Drug[];
  ledgerValues: Record<string, string | number>;
  onUpdateLedgerValue: (key: string, val: string) => void;
  onBatchUpdateLedger: (updates: Record<string, string>) => void;
  onDispenseToExternal: (data: {
    drug: Drug;
    quantity: number;
    lotNumber: string;
    expiryDate: string;
    notes?: string;
  }) => void;
  onReceiveDrug: (data: {
    drug: Drug;
    quantity: number;
    lotNumber: string;
    expiryDate: string;
    unitPrice?: number;
    notes?: string;
  }) => void;
  selectedMonth: number;
  setSelectedMonth: (m: number) => void;
  rowsPerDrug: number;
  setRowsPerDrug: (r: number) => void;
  settings: SystemSettings;
  onOpenPrint: () => void;
  onDownloadExcel: () => void;
  onCarryOverPreviousMonth: () => void;
  onClearCurrentMonth: () => void;
}

export const InternalPharmacyView: React.FC<InternalPharmacyViewProps> = ({
  drugs,
  ledgerValues,
  onUpdateLedgerValue,
  onBatchUpdateLedger,
  onDispenseToExternal,
  onReceiveDrug,
  selectedMonth,
  setSelectedMonth,
  rowsPerDrug,
  setRowsPerDrug,
  settings,
  onOpenPrint,
  onDownloadExcel,
  onCarryOverPreviousMonth,
  onClearCurrentMonth,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState<'all' | number>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const tableContainerRef = useRef<HTMLDivElement | null>(null);

  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isDispenseModalOpen, setIsDispenseModalOpen] = useState(false);
  const [selectedDrugForModal, setSelectedDrugForModal] = useState<Drug | null>(null);

  // Form states for Receive Modal
  const [receiveQty, setReceiveQty] = useState('');
  const [receiveLot, setReceiveLot] = useState('');
  const [receiveExp, setReceiveExp] = useState('');
  const [receivePrice, setReceivePrice] = useState('');

  // Form states for Dispense Modal
  const [dispenseQty, setDispenseQty] = useState('');
  const [dispenseLot, setDispenseLot] = useState('');
  const [dispenseExp, setDispenseExp] = useState('');
  const [dispenseNotes, setDispenseNotes] = useState('');

  // Filtered drug list
  const filteredDrugs = useMemo(() => {
    if (!searchTerm.trim()) return drugs;
    const term = searchTerm.toLowerCase();
    return drugs.filter(
      (d) =>
        d.name.toLowerCase().includes(term) ||
        String(d.no).includes(term) ||
        (d.category && d.category.toLowerCase().includes(term))
    );
  }, [drugs, searchTerm]);

  // Displayed drugs based on pagination (Default 'all' shows all 126 items)
  const totalPages = pageSize === 'all' ? 1 : Math.ceil(filteredDrugs.length / pageSize);
  const displayedDrugs = useMemo(() => {
    if (pageSize === 'all') return filteredDrugs;
    const start = (currentPage - 1) * pageSize;
    return filteredDrugs.slice(start, start + pageSize);
  }, [filteredDrugs, pageSize, currentPage]);

  const scrollToDrug = (drugNo: number) => {
    if (pageSize !== 'all') {
      const idx = filteredDrugs.findIndex((d) => d.no === drugNo);
      if (idx !== -1) {
        const page = Math.floor(idx / pageSize) + 1;
        setCurrentPage(page);
      }
    }
    setTimeout(() => {
      const el = document.getElementById(`drug-row-${drugNo}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const scrollToTop = () => {
    tableContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Helper to calculate calculations per drug
  const getDrugCalculations = (drugNo: number) => {
    const rawCost = ledgerValues[`c.${drugNo}`];
    const defCost = drugs.find((d) => d.no === drugNo)?.costPrice || 0;
    const cost = rawCost !== undefined && rawCost !== '' ? parseFloat(String(rawCost).replace(/,/g, '')) || 0 : defCost;
    const opening = parseFloat(String(ledgerValues[`b.${drugNo}`] || 0).replace(/,/g, '')) || 0;

    let totalRec = 0;
    let totalDisp = 0;
    let runningBal = opening;

    const rowBalances: (number | null)[] = [];

    for (let k = 0; k < rowsPerDrug; k++) {
      const rq = parseFloat(String(ledgerValues[`rq.${drugNo}.${k}`] || 0).replace(/,/g, '')) || 0;
      const pq = parseFloat(String(ledgerValues[`pq.${drugNo}.${k}`] || 0).replace(/,/g, '')) || 0;

      runningBal += rq - pq;
      totalRec += rq;
      totalDisp += pq;

      if (rq || pq || (k === 0 && opening)) {
        rowBalances.push(runningBal);
      } else {
        rowBalances.push(null);
      }
    }

    const recValue = totalRec * cost;
    const dispValue = totalDisp * cost;
    const balValue = runningBal * cost;

    return {
      cost,
      opening,
      totalRec,
      totalDisp,
      endBalance: runningBal,
      recValue,
      dispValue,
      balValue,
      rowBalances,
    };
  };

  // Grand totals for current month view
  const currentMonthTotals = useMemo(() => {
    let sumOpenVal = 0;
    let sumRecVal = 0;
    let sumDispVal = 0;
    let sumBalVal = 0;

    drugs.forEach((d) => {
      const calc = getDrugCalculations(d.no);
      sumOpenVal += calc.opening * calc.cost;
      sumRecVal += calc.recValue;
      sumDispVal += calc.dispValue;
      sumBalVal += calc.balValue;
    });

    return {
      sumOpenVal,
      sumRecVal,
      sumDispVal,
      sumBalVal,
    };
  }, [drugs, ledgerValues, rowsPerDrug]);

  // Handle open receive modal for specific drug
  const handleOpenReceive = (drug: Drug) => {
    setSelectedDrugForModal(drug);
    setReceiveQty('');
    setReceiveLot('');
    setReceiveExp('');
    setReceivePrice(String(drug.costPrice));
    setIsReceiveModalOpen(true);
  };

  // Handle open dispense modal for specific drug
  const handleOpenDispense = (drug: Drug) => {
    setSelectedDrugForModal(drug);
    setDispenseQty('');
    setDispenseLot('');
    setDispenseExp('');
    setDispenseNotes('เบิกจ่ายเข้าคลังยานอก รพ.สต.บ้านห้วยแอ่ง');
    setIsDispenseModalOpen(true);
  };

  // Submit Receive
  const handleConfirmReceive = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDrugForModal || !receiveQty) return;

    const qty = parseFloat(receiveQty);
    if (isNaN(qty) || qty <= 0) return;

    onReceiveDrug({
      drug: selectedDrugForModal,
      quantity: qty,
      lotNumber: receiveLot,
      expiryDate: receiveExp,
      unitPrice: receivePrice ? parseFloat(receivePrice) : undefined,
    });

    setIsReceiveModalOpen(false);
  };

  // Submit Dispense
  const handleConfirmDispense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDrugForModal || !dispenseQty) return;

    const qty = parseFloat(dispenseQty);
    if (isNaN(qty) || qty <= 0) return;

    onDispenseToExternal({
      drug: selectedDrugForModal,
      quantity: qty,
      lotNumber: dispenseLot,
      expiryDate: dispenseExp,
      notes: dispenseNotes,
    });

    setIsDispenseModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Top Banner and Month Selector Bar */}
      <div className="bg-[#091028]/85 rounded-3xl p-5 sm:p-6 border border-slate-700/60 shadow-xl backdrop-blur-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300 font-medium mb-1">
              <Building2 className="w-3.5 h-3.5" />
              <span>คลังยาใน (Internal Drug Stock Ledger)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white font-['Kanit']">
              บัญชีรับ-จ่ายยา ประจำเดือน {MONTH_NAMES[selectedMonth]} พ.ศ. {settings.fiscalYear}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              ระบบบันทึกรับเข้า-จ่ายออก ตรวจสอบยอดยกมา ยอดคงเหลือ และคำนวณมูลค่าทางการอัตโนมัติ
            </p>
          </div>

          {/* Month Selector Carousel / Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
            <div className="flex items-center bg-slate-900/90 p-1 rounded-2xl border border-slate-700">
              {MONTH_SHORT_NAMES.map((m, idx) => (
                <button
                  key={m}
                  onClick={() => setSelectedMonth(idx)}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedMonth === idx
                      ? 'bg-gradient-to-r from-orange-500 to-pink-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Controls Ribbon */}
        <div className="mt-5 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหายาด้วยชื่อ หรือลำดับ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 text-xs transition-colors"
              />
            </div>

            {/* Quick Section Jump Bar */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-400 text-[11px] flex items-center gap-1">
                <Layers className="w-3 h-3 text-pink-400" />
                <span>ข้ามไปยัง:</span>
              </span>
              {[
                { label: '1-25', start: 1 },
                { label: '26-50', start: 26 },
                { label: '51-75', start: 51 },
                { label: '76-100', start: 76 },
                { label: '101-126', start: 101 },
              ].map((jump) => (
                <button
                  key={jump.label}
                  type="button"
                  onClick={() => scrollToDrug(jump.start)}
                  className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] font-mono hover:text-white transition-all active:scale-95"
                >
                  {jump.label}
                </button>
              ))}
            </div>

            {/* Display Mode / Page Size */}
            <label className="flex items-center gap-1.5 text-slate-300">
              <span className="text-slate-400">การแสดงผล:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(e.target.value === 'all' ? 'all' : Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-pink-500 font-medium"
              >
                <option value="all">แสดงทั้งหมด ({filteredDrugs.length} รายการ)</option>
                <option value={30}>30 รายการ/หน้า</option>
                <option value={50}>50 รายการ/หน้า</option>
                <option value={100}>100 รายการ/หน้า</option>
              </select>
            </label>

            {/* Rows Per Drug Selector */}
            <label className="flex items-center gap-1.5 text-slate-300">
              <span className="text-slate-400">แถวต่อยา:</span>
              <select
                value={rowsPerDrug}
                onChange={(e) => setRowsPerDrug(Number(e.target.value))}
                className="bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-pink-500"
              >
                <option value={1}>1 แถว</option>
                <option value={2}>2 แถว (ค่าเริ่มต้น)</option>
                <option value={3}>3 แถว</option>
                <option value={4}>4 แถว</option>
              </select>
            </label>

            {/* Total Items Badge */}
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-pink-500/10 border border-pink-500/20 text-[11px] font-semibold text-pink-300">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {displayedDrugs.length}/{filteredDrugs.length} รายการ (ครบ 126 รายการ)
              </span>
            </div>

            {/* Carry-over Button */}
            <button
              onClick={onCarryOverPreviousMonth}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-medium flex items-center gap-1.5 transition-all active:scale-95"
              title="ดึงยอดยกมาจากยอดคงเหลือเดือนก่อนหน้า"
            >
              <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
              <span>ดึงยอดยกมาจากเดือนก่อน</span>
            </button>

            {/* Clear Month Button */}
            <button
              onClick={onClearCurrentMonth}
              className="px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-800/50 font-medium flex items-center gap-1.5 transition-all active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              <span>ล้างข้อมูลเดือนนี้</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Download Excel */}
            <button
              onClick={onDownloadExcel}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/70 border border-emerald-600/60 text-emerald-300 font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>ดาวน์โหลด Excel</span>
            </button>

            {/* Print Official Format */}
            <button
              onClick={onOpenPrint}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 hover:opacity-95 text-white font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-md shadow-pink-500/20"
            >
              <Printer className="w-3.5 h-3.5 text-amber-200" />
              <span>พิมพ์แบบฟอร์มทางการ (A4)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Monthly Financial Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#0b132e]/80 rounded-2xl p-4 border border-slate-800 shadow-md">
          <span className="text-[11px] text-slate-400 block">① มูลค่ายกมา (ต้นเดือน)</span>
          <span className="text-lg font-mono font-bold text-white">
            ฿{currentMonthTotals.sumOpenVal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="bg-[#0b132e]/80 rounded-2xl p-4 border border-slate-800 shadow-md">
          <span className="text-[11px] text-orange-400 block">② มูลค่ารับยาเข้า (เดือนนี้)</span>
          <span className="text-lg font-mono font-bold text-orange-300">
            ฿{currentMonthTotals.sumRecVal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="bg-[#0b132e]/80 rounded-2xl p-4 border border-slate-800 shadow-md">
          <span className="text-[11px] text-purple-400 block">③ มูลค่าจ่ายยาออก (เดือนนี้)</span>
          <span className="text-lg font-mono font-bold text-purple-300">
            ฿{currentMonthTotals.sumDispVal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="bg-[#0b132e]/80 rounded-2xl p-4 border border-slate-800 shadow-md">
          <span className="text-[11px] text-emerald-400 block">④ มูลค่าคงเหลือ (ปลายเดือน)</span>
          <span className="text-lg font-mono font-bold text-emerald-300">
            ฿{currentMonthTotals.sumBalVal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Main Ledger Table with Scrollable Container & Sticky Header */}
      <div className="bg-[#091028]/95 rounded-3xl border border-slate-700/60 shadow-2xl overflow-hidden backdrop-blur-xl relative">
        <div ref={tableContainerRef} className="max-h-[72vh] overflow-y-auto overflow-x-auto relative scroll-smooth">
          <table className="w-full text-xs text-left border-collapse">
            {/* Table Header with Sticky Lock */}
            <thead className="sticky top-0 z-20 bg-[#0c1432] shadow-lg border-b-2 border-slate-700">
              <tr className="bg-[#0e1738] text-white border-b border-slate-700 text-center uppercase tracking-wider font-semibold">
                <th colSpan={5} className="py-2.5 px-3 border-r border-slate-700 text-pink-300">
                  ข้อมูลรายการยา (Drug Master)
                </th>
                <th colSpan={4} className="py-2.5 px-3 border-r border-slate-700 text-amber-300 bg-amber-950/20">
                  ▼ รับเข้าคลัง (Receiving)
                </th>
                <th colSpan={4} className="py-2.5 px-3 border-r border-slate-700 text-purple-300 bg-purple-950/20">
                  ▲ จ่ายออก (Dispensing)
                </th>
                <th colSpan={2} className="py-2.5 px-3 text-emerald-300 bg-emerald-950/20">
                  ยอดคงเหลือ & จัดการ
                </th>
              </tr>
              <tr className="bg-[#0a122e] text-[11px] text-slate-300 border-b border-slate-700/80 text-center font-medium">
                <th className="py-2 px-2 w-12 border-r border-slate-800">ลำดับ</th>
                <th className="py-2 px-3 text-left border-r border-slate-800 min-w-[200px]">ชื่อยา</th>
                <th className="py-2 px-2 w-16 border-r border-slate-800">หน่วย</th>
                <th className="py-2 px-2 w-20 border-r border-slate-800">ราคาทุน</th>
                <th className="py-2 px-2 w-20 border-r border-slate-700">ยอดยกมา</th>

                {/* In columns */}
                <th className="py-2 px-2 w-20 border-r border-slate-800 bg-amber-950/10">วันที่รับ</th>
                <th className="py-2 px-2 w-20 border-r border-slate-800 bg-amber-950/10">จำนวนรับ</th>
                <th className="py-2 px-2 w-24 border-r border-slate-800 bg-amber-950/10">Lot no.</th>
                <th className="py-2 px-2 w-20 border-r border-slate-700 bg-amber-950/10">Exp date</th>

                {/* Out columns */}
                <th className="py-2 px-2 w-20 border-r border-slate-800 bg-purple-950/10">วันที่จ่าย</th>
                <th className="py-2 px-2 w-20 border-r border-slate-800 bg-purple-950/10">จำนวนจ่าย</th>
                <th className="py-2 px-2 w-24 border-r border-slate-800 bg-purple-950/10">Lot no.</th>
                <th className="py-2 px-2 w-20 border-r border-slate-700 bg-purple-950/10">Exp date</th>

                {/* Balance columns */}
                <th className="py-2 px-2 w-24 border-r border-slate-800 bg-emerald-950/10">ยอดคงเหลือ</th>
                <th className="py-2 px-2 w-28 bg-slate-900">การดำเนินการ</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {displayedDrugs.map((drug) => {
                const calc = getDrugCalculations(drug.no);
                const rawCost = ledgerValues[`c.${drug.no}`];
                const costVal = rawCost !== undefined ? rawCost : drug.costPrice.toFixed(2);
                const openVal = ledgerValues[`b.${drug.no}`] || '';

                return (
                  <React.Fragment key={drug.id}>
                    {Array.from({ length: rowsPerDrug }).map((_, rowIndex) => {
                      const isFirstRow = rowIndex === 0;
                      const bal = calc.rowBalances[rowIndex];

                      return (
                        <tr
                          key={`${drug.no}-${rowIndex}`}
                          id={isFirstRow ? `drug-row-${drug.no}` : undefined}
                          className={`hover:bg-slate-800/40 transition-colors ${
                            rowIndex === rowsPerDrug - 1 ? 'border-b-2 border-slate-700/50' : ''
                          }`}
                        >
                          {/* Rowspan cells rendered only on first row */}
                          {isFirstRow && (
                            <>
                              <td
                                rowSpan={rowsPerDrug + 1}
                                className="py-2 px-2 text-center font-mono font-bold text-pink-400 border-r border-slate-800 align-top bg-slate-900/30"
                              >
                                {drug.no}
                              </td>
                              <td
                                rowSpan={rowsPerDrug + 1}
                                className="py-2 px-3 font-semibold text-slate-100 border-r border-slate-800 align-top"
                              >
                                <div className="text-xs">{drug.name}</div>
                                <span className="text-[10px] text-slate-400 font-normal">
                                  {drug.category || 'ยาสามัญ'}
                                </span>
                              </td>
                              <td
                                rowSpan={rowsPerDrug + 1}
                                className="py-2 px-2 text-center text-slate-300 border-r border-slate-800 align-top font-mono"
                              >
                                {drug.unit}
                              </td>
                              <td
                                rowSpan={rowsPerDrug + 1}
                                className="py-1 px-1 border-r border-slate-800 align-top"
                              >
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={costVal}
                                  onChange={(e) => onUpdateLedgerValue(`c.${drug.no}`, e.target.value)}
                                  className="w-full text-center bg-slate-900/60 border border-slate-700/80 rounded px-1 py-1 font-mono text-amber-300 text-xs focus:bg-slate-950 focus:border-pink-500 focus:outline-none"
                                />
                              </td>
                              <td
                                rowSpan={rowsPerDrug + 1}
                                className="py-1 px-1 border-r border-slate-700 align-top"
                              >
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={openVal}
                                  placeholder="0"
                                  onChange={(e) => onUpdateLedgerValue(`b.${drug.no}`, e.target.value)}
                                  className="w-full text-center bg-slate-900/60 border border-slate-700/80 rounded px-1 py-1 font-mono text-white text-xs focus:bg-slate-950 focus:border-pink-500 focus:outline-none"
                                />
                              </td>
                            </>
                          )}

                          {/* Inward Inputs */}
                          <td className="py-0.5 px-1 border-r border-slate-800 bg-amber-950/5">
                            <input
                              type="text"
                              placeholder="ว/ด/ป"
                              value={ledgerValues[`ri.${drug.no}.${rowIndex}`] || ''}
                              onChange={(e) => onUpdateLedgerValue(`ri.${drug.no}.${rowIndex}`, e.target.value)}
                              className="w-full text-center bg-transparent py-1 text-slate-300 font-mono text-[11px] focus:bg-amber-950/40 focus:outline-none rounded"
                            />
                          </td>
                          <td className="py-0.5 px-1 border-r border-slate-800 bg-amber-950/5">
                            <input
                              type="text"
                              inputMode="numeric"
                              placeholder="-"
                              value={ledgerValues[`rq.${drug.no}.${rowIndex}`] || ''}
                              onChange={(e) => onUpdateLedgerValue(`rq.${drug.no}.${rowIndex}`, e.target.value)}
                              className="w-full text-center bg-transparent py-1 font-mono text-amber-300 font-semibold text-xs focus:bg-amber-950/40 focus:outline-none rounded"
                            />
                          </td>
                          <td className="py-0.5 px-1 border-r border-slate-800 bg-amber-950/5">
                            <input
                              type="text"
                              placeholder="Lot"
                              value={ledgerValues[`rl.${drug.no}.${rowIndex}`] || ''}
                              onChange={(e) => onUpdateLedgerValue(`rl.${drug.no}.${rowIndex}`, e.target.value)}
                              className="w-full text-center bg-transparent py-1 text-slate-300 font-mono text-[11px] focus:bg-amber-950/40 focus:outline-none rounded"
                            />
                          </td>
                          <td className="py-0.5 px-1 border-r border-slate-700 bg-amber-950/5">
                            <input
                              type="text"
                              placeholder="Exp"
                              value={ledgerValues[`rx.${drug.no}.${rowIndex}`] || ''}
                              onChange={(e) => onUpdateLedgerValue(`rx.${drug.no}.${rowIndex}`, e.target.value)}
                              className="w-full text-center bg-transparent py-1 text-slate-300 font-mono text-[11px] focus:bg-amber-950/40 focus:outline-none rounded"
                            />
                          </td>

                          {/* Outward Inputs */}
                          <td className="py-0.5 px-1 border-r border-slate-800 bg-purple-950/5">
                            <input
                              type="text"
                              placeholder="ว/ด/ป"
                              value={ledgerValues[`pi.${drug.no}.${rowIndex}`] || ''}
                              onChange={(e) => onUpdateLedgerValue(`pi.${drug.no}.${rowIndex}`, e.target.value)}
                              className="w-full text-center bg-transparent py-1 text-slate-300 font-mono text-[11px] focus:bg-purple-950/40 focus:outline-none rounded"
                            />
                          </td>
                          <td className="py-0.5 px-1 border-r border-slate-800 bg-purple-950/5">
                            <input
                              type="text"
                              inputMode="numeric"
                              placeholder="-"
                              value={ledgerValues[`pq.${drug.no}.${rowIndex}`] || ''}
                              onChange={(e) => onUpdateLedgerValue(`pq.${drug.no}.${rowIndex}`, e.target.value)}
                              className="w-full text-center bg-transparent py-1 font-mono text-purple-300 font-semibold text-xs focus:bg-purple-950/40 focus:outline-none rounded"
                            />
                          </td>
                          <td className="py-0.5 px-1 border-r border-slate-800 bg-purple-950/5">
                            <input
                              type="text"
                              placeholder="Lot"
                              value={ledgerValues[`pl.${drug.no}.${rowIndex}`] || ''}
                              onChange={(e) => onUpdateLedgerValue(`pl.${drug.no}.${rowIndex}`, e.target.value)}
                              className="w-full text-center bg-transparent py-1 text-slate-300 font-mono text-[11px] focus:bg-purple-950/40 focus:outline-none rounded"
                            />
                          </td>
                          <td className="py-0.5 px-1 border-r border-slate-700 bg-purple-950/5">
                            <input
                              type="text"
                              placeholder="Exp"
                              value={ledgerValues[`px.${drug.no}.${rowIndex}`] || ''}
                              onChange={(e) => onUpdateLedgerValue(`px.${drug.no}.${rowIndex}`, e.target.value)}
                              className="w-full text-center bg-transparent py-1 text-slate-300 font-mono text-[11px] focus:bg-purple-950/40 focus:outline-none rounded"
                            />
                          </td>

                          {/* Balance Cell */}
                          <td className="py-1 px-2 border-r border-slate-800 text-center font-mono font-bold bg-slate-900/40">
                            {bal !== null && (
                              <span className={bal < 0 ? 'text-red-400 font-extrabold' : 'text-emerald-300'}>
                                {bal.toLocaleString()}
                              </span>
                            )}
                          </td>

                          {/* Action Button */}
                          {isFirstRow && (
                            <td rowSpan={rowsPerDrug + 1} className="py-2 px-2 text-center align-middle bg-slate-900/30">
                              <div className="flex flex-col gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenReceive(drug)}
                                  className="w-full py-1 px-1.5 rounded bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/40 text-[10px] font-semibold transition-all active:scale-95"
                                  title="บันทึกรับยาเข้าคลังยาใน"
                                >
                                  + รับยา
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenDispense(drug)}
                                  className="w-full py-1 px-1.5 rounded bg-pink-600/30 hover:bg-pink-600/50 text-pink-200 border border-pink-500/40 text-[10px] font-semibold transition-all active:scale-95"
                                  title="เบิกจ่ายเข้าคลังยานอก"
                                >
                                  ➔ จ่ายออก
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}

                    {/* Total Summary Row for This Drug */}
                    <tr className="bg-slate-900/70 border-b-2 border-slate-700/80 text-[11px] font-medium text-slate-300">
                      <td colSpan={2} className="py-1.5 px-2 text-right border-r border-slate-800 text-slate-400">
                        รวมมูลค่ารับ:
                      </td>
                      <td colSpan={2} className="py-1.5 px-2 text-left font-mono font-bold text-amber-300 border-r border-slate-700">
                        {calc.recValue > 0 ? `฿${calc.recValue.toFixed(2)}` : '-'}
                      </td>
                      <td colSpan={2} className="py-1.5 px-2 text-right border-r border-slate-800 text-slate-400">
                        รวมมูลค่าจ่าย:
                      </td>
                      <td colSpan={2} className="py-1.5 px-2 text-left font-mono font-bold text-purple-300 border-r border-slate-700">
                        {calc.dispValue > 0 ? `฿${calc.dispValue.toFixed(2)}` : '-'}
                      </td>
                      <td className="py-1.5 px-2 text-center font-mono font-bold text-emerald-400 border-r border-slate-800">
                        {calc.balValue > 0 ? `฿${calc.balValue.toFixed(2)}` : '-'}
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Table Pagination & Navigation Footer */}
      <div className="bg-[#0b132e]/80 rounded-2xl p-4 border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2 text-slate-400">
          <Layers className="w-4 h-4 text-pink-400" />
          <span>
            แสดงรายการที่{' '}
            <strong className="text-white">
              {pageSize === 'all'
                ? `1 - ${filteredDrugs.length}`
                : `${(currentPage - 1) * pageSize + 1} - ${Math.min(currentPage * pageSize, filteredDrugs.length)}`}
            </strong>{' '}
            จากทั้งหมด <strong className="text-pink-400">{filteredDrugs.length}</strong> รายการ (ครบชุด 126 รายการ)
          </span>
        </div>

        {pageSize !== 'all' && totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => {
                setCurrentPage((p) => Math.max(1, p - 1));
                scrollToTop();
              }}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 disabled:opacity-40 hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setCurrentPage(i + 1);
                  scrollToTop();
                }}
                className={`w-7 h-7 rounded-lg text-xs font-mono font-bold transition-all ${
                  currentPage === i + 1
                    ? 'bg-gradient-to-r from-orange-500 to-pink-600 text-white shadow-md'
                    : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                {i + 1}
              </button>
            ))}

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => {
                setCurrentPage((p) => Math.min(totalPages, p + 1));
                scrollToTop();
              }}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 disabled:opacity-40 hover:bg-slate-800 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={scrollToTop}
          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white flex items-center gap-1.5 transition-all active:scale-95 text-xs ml-auto sm:ml-0"
        >
          <ArrowUp className="w-3.5 h-3.5 text-pink-400" />
          <span>กลับขึ้นบนสุด</span>
        </button>
      </div>

      {/* MODAL 1: Receive Drug Modal */}
      {isReceiveModalOpen && selectedDrugForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="bg-[#0c1432] border border-slate-700 rounded-3xl p-6 w-full max-w-md shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-amber-400" />
                <span>บันทึกรับยาเข้าคลังยาใน</span>
              </h3>
              <button
                onClick={() => setIsReceiveModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmReceive} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">รายการยา</label>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-semibold">
                  #{selectedDrugForModal.no} {selectedDrugForModal.name} ({selectedDrugForModal.unit})
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">จำนวนที่รับเข้า *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    autoFocus
                    placeholder="ระบุจำนวน"
                    value={receiveQty}
                    onChange={(e) => setReceiveQty(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">ราคาทุนต่อหน่วย (บาท)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={receivePrice}
                    onChange={(e) => setReceivePrice(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-amber-300 font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Lot Number</label>
                  <input
                    type="text"
                    placeholder="เช่น LOT6809"
                    value={receiveLot}
                    onChange={(e) => setReceiveLot(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">วันหมดอายุ (Exp Date)</label>
                  <input
                    type="date"
                    value={receiveExp}
                    onChange={(e) => setReceiveExp(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsReceiveModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all shadow-lg active:scale-95"
                >
                  ยืนยันบันทึกรับยา
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Dispense to External Pharmacy Modal */}
      {isDispenseModalOpen && selectedDrugForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="bg-[#0c1432] border border-slate-700 rounded-3xl p-6 w-full max-w-md shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-pink-400" />
                <span>เบิกยาเข้า &quot;คลังยานอก&quot;</span>
              </h3>
              <button
                onClick={() => setIsDispenseModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmDispense} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">รายการยา</label>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-semibold">
                  #{selectedDrugForModal.no} {selectedDrugForModal.name} ({selectedDrugForModal.unit})
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">จำนวนที่เบิกจ่าย *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    autoFocus
                    placeholder="ระบุจำนวน"
                    value={dispenseQty}
                    onChange={(e) => setDispenseQty(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:border-pink-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Lot Number</label>
                  <input
                    type="text"
                    placeholder="เช่น LOT6809"
                    value={dispenseLot}
                    onChange={(e) => setDispenseLot(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:border-pink-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">วันหมดอายุสำหรับตรวจสอบในคลังยานอก *</label>
                <input
                  type="date"
                  required
                  value={dispenseExp}
                  onChange={(e) => setDispenseExp(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:border-pink-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">หมายเหตุการเบิก</label>
                <input
                  type="text"
                  value={dispenseNotes}
                  onChange={(e) => setDispenseNotes(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-pink-400 focus:outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-pink-950/30 border border-pink-500/20 text-[11px] text-pink-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-pink-400 mt-0.5" />
                <span>
                  รายการยานี้จะถูกส่งเข้าไปยังเมนู <strong>&quot;คลังยานอก&quot;</strong> โดยอัตโนมัติ เพื่อให้ผู้ตรวจสอบทั้ง 2 คนลงชื่อดิจิทัลและตรวจวันหมดอายุ
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDispenseModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-95 text-white font-bold transition-all shadow-lg active:scale-95"
                >
                  ยืนยันเบิกยาเข้าคลังยานอก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

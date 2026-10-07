import React, { useState, useMemo } from 'react';
import { Printer, Download, X, FileText, CheckCircle2, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { Drug, ExternalDrugItem, SystemSettings } from '../types/inventory';
import { MONTH_NAMES, MONTH_SHORT_NAMES } from '../data/defaultDrugs';

interface PrintReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportType: 'internal' | 'external' | 'summary';
  drugs: Drug[];
  externalDrugs: ExternalDrugItem[];
  ledgerValues: Record<string, string | number>;
  selectedMonth: number;
  rowsPerDrug: number;
  settings: SystemSettings;
  monthlyReceiptTotals: number[];
  monthlyDispenseTotals: number[];
  currentStockValue: number;
  cumulativeRequisition: number;
}

const DRUGS_PER_PAGE = 18; // Standard A4 Landscape fits 18 medicines with 2 rows per medicine

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  isOpen,
  onClose,
  reportType: initialReportType,
  drugs,
  externalDrugs,
  ledgerValues,
  selectedMonth,
  rowsPerDrug,
  settings,
  monthlyReceiptTotals,
  monthlyDispenseTotals,
  currentStockValue,
  cumulativeRequisition,
}) => {
  const [reportType, setReportType] = useState<'internal' | 'external' | 'summary'>(initialReportType);
  const [previewPage, setPreviewPage] = useState<number>(0); // 0 = all pages in sequence, 1..N = specific page preview

  // Split drugs into paginated chunks of 18 items
  const drugPages = useMemo(() => {
    const pages: Drug[][] = [];
    for (let i = 0; i < drugs.length; i += DRUGS_PER_PAGE) {
      pages.push(drugs.slice(i, i + DRUGS_PER_PAGE));
    }
    return pages;
  }, [drugs]);

  const totalPages = drugPages.length + 1; // Last page is financial summary

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const remainingBudget = Math.max(0, settings.budgetTotal - cumulativeRequisition);

  // Helper to compute calculations per drug
  const getCalc = (d: Drug) => {
    const rawCost = ledgerValues[`c.${d.no}`];
    const cost = rawCost !== undefined && rawCost !== '' ? parseFloat(String(rawCost).replace(/,/g, '')) || 0 : d.costPrice;
    const open = parseFloat(String(ledgerValues[`b.${d.no}`] || 0).replace(/,/g, '')) || 0;

    let tr = 0;
    let tp = 0;
    let run = open;

    for (let k = 0; k < rowsPerDrug; k++) {
      const rq = parseFloat(String(ledgerValues[`rq.${d.no}.${k}`] || 0).replace(/,/g, '')) || 0;
      const pq = parseFloat(String(ledgerValues[`pq.${d.no}.${k}`] || 0).replace(/,/g, '')) || 0;
      run += rq - pq;
      tr += rq * cost;
      tp += pq * cost;
    }

    return {
      cost,
      open,
      tr,
      tp,
      end: run,
      balVal: run * cost,
    };
  };

  // Total requisition value for External Pharmacy
  const totalExternalRequisitionValue = useMemo(() => {
    return externalDrugs.reduce((sum, item) => sum + item.quantity * item.costPrice, 0);
  }, [externalDrugs]);

  // Reusable Page Header for Official A4 Sheet (Internal Pharmacy)
  const renderOfficialHeader = (pageNumber: number, totalSheets: number, title: string) => (
    <div className="border-[1.8px] border-black rounded-lg overflow-hidden flex flex-row items-stretch mb-3 text-black">
      {/* Brand Box */}
      <div className="bg-black text-white p-2.5 flex flex-col justify-center min-w-[200px]">
        <span className="text-[8px] tracking-widest uppercase opacity-90 leading-tight">
          SUB-DISTRICT HEALTH PROMOTING HOSPITAL
        </span>
        <b className="text-sm font-extrabold">{settings.hospitalName || 'รพ.สต.บ้านห้วยแอ่ง'}</b>
      </div>

      {/* Title & Month Strip */}
      <div className="flex-1 p-2 flex flex-col justify-center border-l-[1.5px] border-black">
        <h1 className="text-sm font-extrabold m-0 leading-tight">{title}</h1>
        <span className="text-[10px] text-gray-700 mt-0.5">
          ปีงบประมาณ พ.ศ. {settings.fiscalYear} · Drug Stock Ledger (ชายสดV1)
        </span>
        <div className="flex gap-1 mt-1">
          {MONTH_SHORT_NAMES.map((s, i) => (
            <span
              key={s}
              className={`text-[8.5px] font-semibold border border-black rounded px-1.5 py-0.2 ${
                i === selectedMonth ? 'bg-black text-white font-bold' : 'text-black'
              }`}
            >
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* Month Badge */}
      <div className="p-2 flex flex-col justify-center text-center border-l-[1.5px] border-dashed border-black min-w-[120px]">
        <span className="text-[8.5px] font-bold">ประจำเดือน</span>
        <b className="text-sm font-extrabold leading-tight">{MONTH_NAMES[selectedMonth]}</b>
        <span className="text-[8.5px]">พ.ศ. {settings.fiscalYear}</span>
      </div>

      {/* Metadata & Page Number */}
      <div className="p-2 flex flex-col justify-center text-[9px] border-l-[1.5px] border-black min-w-[160px] space-y-0.5">
        <div>
          <strong>แผ่นที่:</strong> {pageNumber} / {totalSheets}
        </div>
        <div>
          <strong>ผู้บันทึกข้อมูล:</strong> {settings.pharmacistName || 'นายศักดิ์ดา  กุลโชติ'}
        </div>
        <div>
          <strong>ตำแหน่ง:</strong> {settings.recorderPosition || 'พยาบาลวิชาชีพ'}
        </div>
        <div>
          <strong>วันที่:</strong> {new Date().toLocaleDateString('th-TH')}
        </div>
      </div>
    </div>
  );

  // Dedicated Official Header for External Pharmacy Sheet (With Prominent Requisition Value)
  const renderExternalOfficialHeader = (pageNumber: number, totalSheets: number) => (
    <div className="border-[1.8px] border-black rounded-lg overflow-hidden flex flex-row items-stretch mb-3 text-black">
      {/* Brand Box */}
      <div className="bg-black text-white p-2.5 flex flex-col justify-center min-w-[190px]">
        <span className="text-[8px] tracking-widest uppercase opacity-90 leading-tight">
          SUB-DISTRICT HEALTH PROMOTING HOSPITAL
        </span>
        <b className="text-sm font-extrabold">{settings.hospitalName || 'รพ.สต.บ้านห้วยแอ่ง'}</b>
      </div>

      {/* Title Strip */}
      <div className="flex-1 p-2 flex flex-col justify-center border-l-[1.5px] border-black">
        <h1 className="text-sm font-extrabold m-0 leading-tight">
          ใบตรวจสอบคลังยานอก (Requisitioned Drug & Expiry Inspection)
        </h1>
        <div className="text-[10px] text-gray-700 mt-0.5">
          ปีงบประมาณ พ.ศ. {settings.fiscalYear} · บัญชีรับ–จ่ายและตรวจสอบวันหมดอายุยา (ชายสดV1)
        </div>
      </div>

      {/* PROMINENT REQUISITION VALUE DISPLAY AT HEADER */}
      <div className="p-2 flex flex-col justify-center text-center border-l-[1.5px] border-black min-w-[185px] bg-amber-50">
        <span className="text-[8.5px] font-bold text-amber-950 uppercase tracking-wide">
          มูลค่าที่เบิกยาครั้งนี้
        </span>
        <b className="text-base font-extrabold leading-tight text-black font-mono">
          ฿{totalExternalRequisitionValue.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </b>
        <span className="text-[8px] text-gray-700 font-semibold">บาท (รวมทุกรายการ)</span>
      </div>

      {/* Metadata & Page Number */}
      <div className="p-2 flex flex-col justify-center text-[9px] border-l-[1.5px] border-black min-w-[165px] space-y-0.5">
        <div>
          <strong>แผ่นที่:</strong> {pageNumber} / {totalSheets}
        </div>
        <div>
          <strong>ผู้บันทึกข้อมูล:</strong> {settings.pharmacistName || 'นายศักดิ์ดา  กุลโชติ'}
        </div>
        <div>
          <strong>ตำแหน่ง:</strong> {settings.recorderPosition || 'พยาบาลวิชาชีพ'}
        </div>
        <div>
          <strong>วันที่ตรวจ/พิมพ์:</strong> {new Date().toLocaleDateString('th-TH')}
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex flex-col items-center justify-start p-2 sm:p-6 print:p-0 print:bg-white print:static print:overflow-visible print:w-full print:h-auto">
      {/* Top Controls Toolbar (Hidden on Print) */}
      <div className="w-full max-w-[297mm] bg-[#0c1432] border border-slate-700/80 rounded-2xl p-4 mb-4 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xl print:hidden">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="p-2 rounded-xl bg-pink-500/20 text-pink-300 font-bold flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span>แบบฟอร์มเอกสารทางการ A4 แนวนอน (ครบ 126 รายการ)</span>
          </div>

          {/* Report Tab Switcher */}
          <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setReportType('internal')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                reportType === 'internal'
                  ? 'bg-gradient-to-r from-orange-500 to-pink-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              คลังยาใน (126 รายการ)
            </button>
            <button
              onClick={() => setReportType('external')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                reportType === 'external'
                  ? 'bg-gradient-to-r from-orange-500 to-pink-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              คลังยานอก (2 ผู้ตรวจ)
            </button>
            <button
              onClick={() => setReportType('summary')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                reportType === 'summary'
                  ? 'bg-gradient-to-r from-orange-500 to-pink-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              สรุปมูลค่าประจำเดือน
            </button>
          </div>
        </div>

        {/* Page navigator & Print Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {reportType === 'internal' && (
            <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-xl border border-slate-700 text-slate-300">
              <span className="text-[11px] text-slate-400">พรีวิว:</span>
              <button
                onClick={() => setPreviewPage(0)}
                className={`px-2 py-1 rounded text-[11px] font-semibold ${
                  previewPage === 0 ? 'bg-pink-600 text-white' : 'hover:bg-slate-800'
                }`}
              >
                ทุกแผ่น (1-{totalPages})
              </button>
              {Array.from({ length: totalPages }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setPreviewPage(idx + 1)}
                  className={`w-6 h-6 rounded text-[11px] font-mono font-bold ${
                    previewPage === idx + 1 ? 'bg-pink-600 text-white' : 'hover:bg-slate-800 text-slate-400'
                  }`}
                  title={idx === totalPages - 1 ? 'แผ่นสรุปมูลค่า' : `แผ่นที่ ${idx + 1}`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={handlePrint}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-95 text-white font-bold flex items-center gap-1.5 shadow-lg active:scale-95 transition-all text-xs"
          >
            <Printer className="w-4 h-4" />
            <span>🖨 สั่งพิมพ์ A4 (ครบทุกแผ่น)</span>
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* PRINTABLE SHEETS CONTAINER */}
      <div className="w-full flex flex-col items-center gap-8 print:gap-0 print:m-0 print:p-0 print:w-full print:block">
        {/* ========================================================
            VIEW 1: INTERNAL PHARMACY (ALL 126 DRUGS CHUNKED IN A4 PAGES)
           ======================================================== */}
        {reportType === 'internal' && (
          <>
            {drugPages.map((pageItems, pageIdx) => {
              const pageNumber = pageIdx + 1;
              const isShownInPreview = previewPage === 0 || previewPage === pageNumber;

              return (
                <div
                  key={`page-${pageIdx}`}
                  className={`w-full max-w-[297mm] min-h-[208mm] bg-white text-black p-6 sm:p-8 font-['Sarabun'] shadow-2xl rounded-sm print:shadow-none print:m-0 print:p-4 print:w-full print:max-w-none print:min-h-0 print:rounded-none print:block print:break-after-page ${
                    isShownInPreview ? 'block' : 'hidden'
                  }`}
                  style={{ pageBreakAfter: 'always', breakAfter: 'page' }}
                >
                  {/* Header */}
                  {renderOfficialHeader(pageNumber, totalPages, 'บัญชีรับ–จ่ายยา (คลังยาใน)')}

                  {/* Table with ALL 18 drugs on this sheet */}
                  <table className="w-full border-collapse border border-black text-[9.5px] text-center">
                    <thead>
                      <tr className="bg-gray-100 font-bold border-b border-black">
                        <th rowSpan={2} className="border border-black p-1 w-8">ลำดับ</th>
                        <th rowSpan={2} className="border border-black p-1 text-left min-w-[190px]">ชื่อยา</th>
                        <th rowSpan={2} className="border border-black p-1 w-12">หน่วย</th>
                        <th rowSpan={2} className="border border-black p-1 w-14">ราคาทุน</th>
                        <th rowSpan={2} className="border border-black p-1 w-14">ยอดยกมา</th>
                        <th colSpan={4} className="border border-black p-0.5 bg-gray-200">▼ รับเข้า</th>
                        <th colSpan={4} className="border border-black p-0.5 bg-gray-200">▲ จ่ายออก</th>
                        <th rowSpan={2} className="border border-black p-1 w-16 bg-gray-100">คงเหลือ</th>
                        <th rowSpan={2} className="border border-black p-1 w-18">มูลค่าคงเหลือ</th>
                      </tr>
                      <tr className="bg-gray-50 text-[8.5px] font-bold border-b border-black">
                        <th className="border border-black p-0.5 w-12">วันที่</th>
                        <th className="border border-black p-0.5 w-12">จำนวน</th>
                        <th className="border border-black p-0.5 w-14">Lot</th>
                        <th className="border border-black p-0.5 w-12">Exp</th>
                        <th className="border border-black p-0.5 w-12">วันที่</th>
                        <th className="border border-black p-0.5 w-12">จำนวน</th>
                        <th className="border border-black p-0.5 w-14">Lot</th>
                        <th className="border border-black p-0.5 w-12">Exp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageItems.map((d) => {
                        const calc = getCalc(d);
                        return (
                          <React.Fragment key={d.id}>
                            <tr className="border-b border-gray-400 print-avoid-break">
                              <td rowSpan={rowsPerDrug} className="border border-black p-0.5 font-bold align-top">{d.no}</td>
                              <td rowSpan={rowsPerDrug} className="border border-black p-0.5 text-left font-semibold align-top">{d.name}</td>
                              <td rowSpan={rowsPerDrug} className="border border-black p-0.5 align-top">{d.unit}</td>
                              <td rowSpan={rowsPerDrug} className="border border-black p-0.5 align-top">{calc.cost.toFixed(2)}</td>
                              <td rowSpan={rowsPerDrug} className="border border-black p-0.5 align-top">{calc.open || '-'}</td>

                              {/* Row 0 */}
                              <td className="border border-black p-0.5">{ledgerValues[`ri.${d.no}.0`] || '-'}</td>
                              <td className="border border-black p-0.5 font-bold">{ledgerValues[`rq.${d.no}.0`] || '-'}</td>
                              <td className="border border-black p-0.5">{ledgerValues[`rl.${d.no}.0`] || '-'}</td>
                              <td className="border border-black p-0.5">{ledgerValues[`rx.${d.no}.0`] || '-'}</td>

                              <td className="border border-black p-0.5">{ledgerValues[`pi.${d.no}.0`] || '-'}</td>
                              <td className="border border-black p-0.5 font-bold">{ledgerValues[`pq.${d.no}.0`] || '-'}</td>
                              <td className="border border-black p-0.5">{ledgerValues[`pl.${d.no}.0`] || '-'}</td>
                              <td className="border border-black p-0.5">{ledgerValues[`px.${d.no}.0`] || '-'}</td>

                              <td rowSpan={rowsPerDrug} className="border border-black p-0.5 font-bold bg-gray-50 align-top">
                                {calc.end}
                              </td>
                              <td rowSpan={rowsPerDrug} className="border border-black p-0.5 font-bold align-top">
                                ฿{calc.balVal.toFixed(2)}
                              </td>
                            </tr>
                            {/* Extra rows if rowsPerDrug > 1 */}
                            {Array.from({ length: rowsPerDrug - 1 }).map((_, extraIdx) => {
                              const r = extraIdx + 1;
                              return (
                                <tr key={`${d.no}-${r}`} className="border-b border-gray-300 print-avoid-break">
                                  <td className="border border-black p-0.5">{ledgerValues[`ri.${d.no}.${r}`] || '-'}</td>
                                  <td className="border border-black p-0.5 font-bold">{ledgerValues[`rq.${d.no}.${r}`] || '-'}</td>
                                  <td className="border border-black p-0.5">{ledgerValues[`rl.${d.no}.${r}`] || '-'}</td>
                                  <td className="border border-black p-0.5">{ledgerValues[`rx.${d.no}.${r}`] || '-'}</td>

                                  <td className="border border-black p-0.5">{ledgerValues[`pi.${d.no}.${r}`] || '-'}</td>
                                  <td className="border border-black p-0.5 font-bold">{ledgerValues[`pq.${d.no}.${r}`] || '-'}</td>
                                  <td className="border border-black p-0.5">{ledgerValues[`pl.${d.no}.${r}`] || '-'}</td>
                                  <td className="border border-black p-0.5">{ledgerValues[`px.${d.no}.${r}`] || '-'}</td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Page Footer */}
                  <div className="mt-auto pt-3 flex justify-between text-[9px] text-gray-700">
                    <span>
                      ยอดยกมา = ยอดคงเหลือสิ้นเดือนก่อน · แสดงรายการที่ {pageItems[0]?.no} - {pageItems[pageItems.length - 1]?.no} จากทั้งหมด 126 รายการ
                    </span>
                    <span>ต่อแผ่นถัดไป ▶ (แผ่น {pageNumber} / {totalPages})</span>
                  </div>
                </div>
              );
            })}

            {/* FINAL SUMMARY PAGE (PAGE T) */}
            <div
              className={`w-full max-w-[297mm] min-h-[208mm] bg-white text-black p-6 sm:p-8 font-['Sarabun'] shadow-2xl rounded-sm print:shadow-none print:m-0 print:p-4 print:w-full print:max-w-none print:min-h-0 print:rounded-none print:block print:break-after-page ${
                previewPage === 0 || previewPage === totalPages ? 'block' : 'hidden'
              }`}
              style={{ pageBreakAfter: 'always', breakAfter: 'page' }}
            >
              {renderOfficialHeader(totalPages, totalPages, 'สรุปมูลค่าประจำเดือนและงบประมาณ')}

              {/* 6 Official Financial Boxes */}
              <div className="grid grid-cols-3 gap-3 mb-4 text-black">
                <div className="border-[1.4px] border-black rounded p-2">
                  <div className="font-bold text-[10px] pb-1 border-b border-black bg-gray-100 px-1 -mx-2 -mt-2 rounded-t">
                    ① มูลค่ายกมา (ต้นเดือน)
                  </div>
                  <div className="text-base font-extrabold mt-2 font-mono">฿{currentStockValue.toLocaleString()} บาท</div>
                  <div className="text-[8px] text-gray-600 mt-1">= Σ ยอดยกมา × ราคาทุน</div>
                </div>

                <div className="border-[1.4px] border-black rounded p-2">
                  <div className="font-bold text-[10px] pb-1 border-b border-black bg-gray-100 px-1 -mx-2 -mt-2 rounded-t">
                    ② มูลค่ารับยา (เดือนนี้)
                  </div>
                  <div className="text-base font-extrabold mt-2 font-mono">
                    ฿{(monthlyReceiptTotals[selectedMonth] || 0).toLocaleString()} บาท
                  </div>
                  <div className="text-[8px] text-gray-600 mt-1">= Σ จำนวนรับ × ราคาทุน</div>
                </div>

                <div className="border-[1.4px] border-black rounded p-2">
                  <div className="font-bold text-[10px] pb-1 border-b border-black bg-gray-100 px-1 -mx-2 -mt-2 rounded-t">
                    ③ มูลค่าจ่ายยา (เดือนนี้)
                  </div>
                  <div className="text-base font-extrabold mt-2 font-mono">
                    ฿{(monthlyDispenseTotals[selectedMonth] || 0).toLocaleString()} บาท
                  </div>
                  <div className="text-[8px] text-gray-600 mt-1">= Σ จำนวนจ่าย × ราคาทุน</div>
                </div>

                <div className="border-[2px] border-black rounded p-2 bg-gray-50">
                  <div className="font-bold text-[10px] pb-1 border-b border-black bg-gray-200 px-1 -mx-2 -mt-2 rounded-t">
                    ④ มูลค่าคงคลัง
                  </div>
                  <div className="text-base font-extrabold mt-2 font-mono">
                    ฿{(currentStockValue + (monthlyReceiptTotals[selectedMonth] || 0)).toLocaleString()} บาท
                  </div>
                  <div className="text-[8px] text-gray-600 mt-1">= ① มูลค่ายกมา + ② มูลค่ารับเข้า</div>
                </div>

                <div className="border-[1.4px] border-black rounded p-2">
                  <div className="font-bold text-[10px] pb-1 border-b border-black bg-gray-100 px-1 -mx-2 -mt-2 rounded-t">
                    มูลค่าคงเหลือปลายเดือน
                  </div>
                  <div className="text-base font-extrabold mt-2 font-mono">
                    ฿{(currentStockValue + (monthlyReceiptTotals[selectedMonth] || 0) - (monthlyDispenseTotals[selectedMonth] || 0)).toLocaleString()} บาท
                  </div>
                  <div className="text-[8px] text-gray-600 mt-1">= ④ − ③ (ยกไปเดือนถัดไป)</div>
                </div>

                <div className="border-[2px] border-black rounded p-2 bg-black text-white">
                  <div className="font-bold text-[10px] pb-1 border-b border-white bg-black px-1 -mx-2 -mt-2 rounded-t text-white">
                    ⑤ มูลค่าที่เบิกได้อีก ปีงบฯ {settings.fiscalYear}
                  </div>
                  <div className="text-base font-extrabold mt-2 font-mono text-white">
                    ฿{remainingBudget.toLocaleString()} บาท
                  </div>
                  <div className="text-[8px] text-gray-300 mt-1">
                    = {settings.budgetTotal.toLocaleString()} − เบิกสะสม
                  </div>
                </div>
              </div>

              {/* 12-Month Table */}
              <div className="mb-4">
                <table className="w-full border-collapse border border-black text-[9px] text-center">
                  <thead>
                    <tr className="bg-gray-100 font-bold border-b border-black">
                      <th className="border border-black p-1 text-left w-36">เบิกยาปี {settings.fiscalYear}</th>
                      {MONTH_SHORT_NAMES.map((m, idx) => (
                        <th
                          key={m}
                          className={`border border-black p-1 ${idx === selectedMonth ? 'bg-black text-white' : ''}`}
                        >
                          {m}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-black p-1 font-bold text-left">มูลค่าเบิก (บาท)</td>
                      {monthlyReceiptTotals.map((v, i) => (
                        <td key={i} className="border border-black p-1 font-mono font-semibold">
                          {v > 0 ? v.toLocaleString() : '-'}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="border border-black p-1 font-bold text-left">มูลค่าจ่าย (บาท)</td>
                      {monthlyDispenseTotals.map((v, i) => (
                        <td key={i} className="border border-black p-1 font-mono">
                          {v > 0 ? v.toLocaleString() : '-'}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
                <div className="mt-1 text-[9px] text-gray-700">
                  วงเงินงบประมาณปี {settings.fiscalYear} : <b>{settings.budgetTotal.toLocaleString()} บาท</b> · มูลค่าเบิกสะสมรวม : <b>{cumulativeRequisition.toLocaleString()} บาท</b> · เบิกได้อีก : <b>{remainingBudget.toLocaleString()} บาท</b>
                </div>
              </div>

              {/* Official 3 Signature Footer Blocks */}
              <div className="mt-8 pt-6 border-t-[1.5px] border-black flex justify-between items-end text-[10px] leading-tight print-avoid-break">
                <div className="text-center w-60">
                  <div className="h-10 flex items-end justify-center font-serif text-sm">
                    ............................................................
                  </div>
                  <div className="font-bold mt-1">({settings.pharmacistName || 'นายศักดิ์ดา  กุลโชติ'})</div>
                  <div>ตำแหน่ง {settings.recorderPosition || 'พยาบาลวิชาชีพ'} / ผู้บันทึกข้อมูล</div>
                </div>

                <div className="text-center w-60">
                  <div className="h-10 flex items-end justify-center font-serif text-sm">
                    ............................................................
                  </div>
                  <div className="font-bold mt-1">({settings.inspector1DefaultName || 'นางสาวนันทิดา  พรมมา'})</div>
                  <div>ตำแหน่ง {settings.inspector1DefaultPos || 'นักวิชาการสาธารณสุข'} / ผู้ตรวจสอบคนที่ 1</div>
                </div>

                <div className="text-center w-60">
                  <div className="h-10 flex items-end justify-center font-serif text-sm">
                    ............................................................
                  </div>
                  <div className="font-bold mt-1">({settings.inspector2DefaultName || 'นางสาวปนัสยา  ปะนัสสุจ่า'})</div>
                  <div>ตำแหน่ง {settings.inspector2DefaultPos || 'นักวิชาการสาธารณสุข'} / ผู้ตรวจสอบคนที่ 2</div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ========================================================
            VIEW 2: EXTERNAL PHARMACY (WITH REQUISITION VALUE & 3 EXPIRY CHOICES)
           ======================================================== */}
        {reportType === 'external' && (
          <div
            className="w-full max-w-[297mm] min-h-[208mm] bg-white text-black p-6 sm:p-8 font-['Sarabun'] shadow-2xl rounded-sm print:shadow-none print:m-0 print:p-4 print:w-full print:max-w-none print:min-h-0 print:rounded-none print:block"
          >
            {renderExternalOfficialHeader(1, 1)}

            <table className="w-full border-collapse border border-black text-[9px] text-center">
              <thead>
                <tr className="bg-gray-100 font-bold border-b border-black">
                  <th className="border border-black p-1 w-7">ลำดับ</th>
                  <th className="border border-black p-1 text-left min-w-[160px]">ชื่อยา (เบิกจากคลังยาใน)</th>
                  <th className="border border-black p-1 w-12">หน่วย</th>
                  <th className="border border-black p-1 w-14">ราคาทุน</th>
                  <th className="border border-black p-1 w-14">จำนวนเบิก</th>
                  <th className="border border-black p-1 w-16 bg-amber-50">มูลค่าที่เบิก</th>
                  <th className="border border-black p-1 w-16">Lot No.</th>
                  <th className="border border-black p-1 w-16">วันหมดอายุ</th>
                  <th className="border border-black p-1 w-44 bg-gray-200">
                    ผลการตรวจวันหมดอายุ (3 ตัวเลือก)
                  </th>
                  <th className="border border-black p-1 w-36">ผู้ตรวจคนที่ 1</th>
                  <th className="border border-black p-1 w-36">ผู้ตรวจคนที่ 2</th>
                </tr>
              </thead>
              <tbody>
                {externalDrugs.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="border border-black p-6 text-center text-gray-500">
                      ไม่มีรายการยาที่เบิกจ่ายเข้าคลังยานอกในรอบนี้
                    </td>
                  </tr>
                ) : (
                  <>
                    {externalDrugs.map((item, idx) => {
                      const itemVal = item.quantity * item.costPrice;
                      const isNotExpired = item.expiryStatus === 'not_expired' || item.expiryStatus === 'safe';
                      const isWithin6 = item.expiryStatus === 'within_6_months' || item.expiryStatus === 'warning';
                      const isExpired = item.expiryStatus === 'expired';

                      return (
                        <tr key={item.id} className="border-b border-black print-avoid-break">
                          <td className="border border-black p-1 font-bold">{idx + 1}</td>
                          <td className="border border-black p-1 text-left font-semibold">{item.name}</td>
                          <td className="border border-black p-1">{item.unit}</td>
                          <td className="border border-black p-1 font-mono">{item.costPrice.toFixed(2)}</td>
                          <td className="border border-black p-1 font-bold font-mono">{item.quantity.toLocaleString()}</td>
                          <td className="border border-black p-1 font-bold font-mono bg-amber-50/50">
                            ฿{itemVal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="border border-black p-1 font-mono">{item.lotNumber || '-'}</td>
                          <td className="border border-black p-1 font-mono">{item.expiryDate || '-'}</td>

                          {/* 3 CHECKBOX CHOICES FOR EXPIRY INSPECTION */}
                          <td className="border border-black p-1 text-left text-[8px] bg-gray-50/60">
                            <div className="space-y-0.5 leading-tight">
                              {/* Option 1: ไม่หมดอายุ */}
                              <div className="flex items-center gap-1">
                                <span
                                  className={`inline-block w-3 h-3 border border-black text-center font-bold text-[8.5px] leading-3 ${
                                    isNotExpired ? 'bg-black text-white' : 'bg-white'
                                  }`}
                                >
                                  {isNotExpired ? '✓' : ''}
                                </span>
                                <span className={isNotExpired ? 'font-bold text-black' : 'text-gray-700'}>
                                  ไม่หมดอายุ
                                </span>
                              </div>

                              {/* Option 2: หมดอายุภายใน 6 เดือน */}
                              <div className="flex items-center gap-1">
                                <span
                                  className={`inline-block w-3 h-3 border border-black text-center font-bold text-[8.5px] leading-3 ${
                                    isWithin6 ? 'bg-black text-white' : 'bg-white'
                                  }`}
                                >
                                  {isWithin6 ? '✓' : ''}
                                </span>
                                <span className={isWithin6 ? 'font-bold text-black' : 'text-gray-700'}>
                                  หมดอายุภายใน 6 เดือน
                                </span>
                              </div>

                              {/* Option 3: หมดอายุ */}
                              <div className="flex items-center gap-1">
                                <span
                                  className={`inline-block w-3 h-3 border border-black text-center font-bold text-[8.5px] leading-3 ${
                                    isExpired ? 'bg-black text-white' : 'bg-white'
                                  }`}
                                >
                                  {isExpired ? '✓' : ''}
                                </span>
                                <span className={isExpired ? 'font-bold text-red-700' : 'text-gray-700'}>
                                  หมดอายุ
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Inspector 1 */}
                          <td className="border border-black p-1 text-[8.5px]">
                            <div className="font-semibold">{item.inspector1Name || settings.inspector1DefaultName}</div>
                            {item.inspector1Signature ? (
                              <img src={item.inspector1Signature} alt="Sig1" className="h-6 mx-auto my-0.5 object-contain" />
                            ) : (
                              <div className="h-5 flex items-center justify-center text-gray-400 font-mono text-[8px]">(ลงลายเซ็น)</div>
                            )}
                            <div className="text-[7.5px] text-gray-600">{item.inspector1Position || settings.inspector1DefaultPos}</div>
                          </td>

                          {/* Inspector 2 */}
                          <td className="border border-black p-1 text-[8.5px]">
                            <div className="font-semibold">{item.inspector2Name || settings.inspector2DefaultName}</div>
                            {item.inspector2Signature ? (
                              <img src={item.inspector2Signature} alt="Sig2" className="h-6 mx-auto my-0.5 object-contain" />
                            ) : (
                              <div className="h-5 flex items-center justify-center text-gray-400 font-mono text-[8px]">(ลงลายเซ็น)</div>
                            )}
                            <div className="text-[7.5px] text-gray-600">{item.inspector2Position || settings.inspector2DefaultPos}</div>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Summary row for Requisition Total */}
                    <tr className="bg-gray-100 font-bold border-t-2 border-black text-[9px]">
                      <td colSpan={5} className="border border-black p-1.5 text-right font-extrabold">
                        รวมมูลค่าที่เบิกยาครั้งนี้ทั้งหมด :
                      </td>
                      <td className="border border-black p-1.5 text-center font-mono font-black text-black bg-amber-100">
                        ฿{totalExternalRequisitionValue.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td colSpan={5} className="border border-black p-1 text-left text-gray-600 text-[8px]">
                        บาท (รวมทั้งสิ้น {externalDrugs.length} รายการ)
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>

            {/* Signature Footer */}
            <div className="mt-8 pt-4 border-t border-black flex justify-between items-end text-[10px] leading-tight print-avoid-break">
              <div className="text-center w-60">
                <div className="h-8 flex items-end justify-center font-serif">
                  ............................................................
                </div>
                <div className="font-bold mt-1">({settings.pharmacistName || 'นายศักดิ์ดา  กุลโชติ'})</div>
                <div>ตำแหน่ง {settings.recorderPosition || 'พยาบาลวิชาชีพ'} / ผู้บันทึกข้อมูล</div>
              </div>

              <div className="text-center w-60">
                <div className="h-8 flex items-end justify-center font-serif">
                  ............................................................
                </div>
                <div className="font-bold mt-1">({settings.inspector1DefaultName || 'นางสาวนันทิดา  พรมมา'})</div>
                <div>ตำแหน่ง {settings.inspector1DefaultPos || 'นักวิชาการสาธารณสุข'} / ผู้ตรวจสอบคนที่ 1</div>
              </div>

              <div className="text-center w-60">
                <div className="h-8 flex items-end justify-center font-serif">
                  ............................................................
                </div>
                <div className="font-bold mt-1">({settings.inspector2DefaultName || 'นางสาวปนัสยา  ปะนัสสุจ่า'})</div>
                <div>ตำแหน่ง {settings.inspector2DefaultPos || 'นักวิชาการสาธารณสุข'} / ผู้ตรวจสอบคนที่ 2</div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            VIEW 3: SUMMARY ONLY
           ======================================================== */}
        {reportType === 'summary' && (
          <div className="w-full max-w-[297mm] min-h-[208mm] bg-white text-black p-6 sm:p-8 font-['Sarabun'] shadow-2xl rounded-sm print:shadow-none print:m-0 print:p-4 print:w-full print:max-w-none print:min-h-0 print:rounded-none">
            {renderOfficialHeader(1, 1, 'สรุปมูลค่ายาและงบประมาณประจำเดือน')}

            {/* Same Summary Page Content */}
            <div className="grid grid-cols-3 gap-3 mb-4 text-black">
              <div className="border-[1.4px] border-black rounded p-2">
                <div className="font-bold text-[10px] pb-1 border-b border-black bg-gray-100 px-1 -mx-2 -mt-2 rounded-t">
                  ① มูลค่ายกมา (ต้นเดือน)
                </div>
                <div className="text-base font-extrabold mt-2 font-mono">฿{currentStockValue.toLocaleString()} บาท</div>
              </div>

              <div className="border-[1.4px] border-black rounded p-2">
                <div className="font-bold text-[10px] pb-1 border-b border-black bg-gray-100 px-1 -mx-2 -mt-2 rounded-t">
                  ② มูลค่ารับยา (เดือนนี้)
                </div>
                <div className="text-base font-extrabold mt-2 font-mono">
                  ฿{(monthlyReceiptTotals[selectedMonth] || 0).toLocaleString()} บาท
                </div>
              </div>

              <div className="border-[1.4px] border-black rounded p-2">
                <div className="font-bold text-[10px] pb-1 border-b border-black bg-gray-100 px-1 -mx-2 -mt-2 rounded-t">
                  ③ มูลค่าจ่ายยา (เดือนนี้)
                </div>
                <div className="text-base font-extrabold mt-2 font-mono">
                  ฿{(monthlyDispenseTotals[selectedMonth] || 0).toLocaleString()} บาท
                </div>
              </div>

              <div className="border-[2px] border-black rounded p-2 bg-gray-50">
                <div className="font-bold text-[10px] pb-1 border-b border-black bg-gray-200 px-1 -mx-2 -mt-2 rounded-t">
                  ④ มูลค่าคงคลัง
                </div>
                <div className="text-base font-extrabold mt-2 font-mono">
                  ฿{(currentStockValue + (monthlyReceiptTotals[selectedMonth] || 0)).toLocaleString()} บาท
                </div>
              </div>

              <div className="border-[1.4px] border-black rounded p-2">
                <div className="font-bold text-[10px] pb-1 border-b border-black bg-gray-100 px-1 -mx-2 -mt-2 rounded-t">
                  มูลค่าคงเหลือปลายเดือน
                </div>
                <div className="text-base font-extrabold mt-2 font-mono">
                  ฿{(currentStockValue + (monthlyReceiptTotals[selectedMonth] || 0) - (monthlyDispenseTotals[selectedMonth] || 0)).toLocaleString()} บาท
                </div>
              </div>

              <div className="border-[2px] border-black rounded p-2 bg-black text-white">
                <div className="font-bold text-[10px] pb-1 border-b border-white bg-black px-1 -mx-2 -mt-2 rounded-t text-white">
                  ⑤ มูลค่าที่เบิกได้อีก ปีงบฯ {settings.fiscalYear}
                </div>
                <div className="text-base font-extrabold mt-2 font-mono text-white">
                  ฿{remainingBudget.toLocaleString()} บาท
                </div>
              </div>
            </div>

            {/* 12 Month Table */}
            <table className="w-full border-collapse border border-black text-[9px] text-center mb-6">
              <thead>
                <tr className="bg-gray-100 font-bold border-b border-black">
                  <th className="border border-black p-1 text-left w-36">เบิกยาปี {settings.fiscalYear}</th>
                  {MONTH_SHORT_NAMES.map((m) => (
                    <th key={m} className="border border-black p-1">{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-black p-1 font-bold text-left">มูลค่าเบิก (บาท)</td>
                  {monthlyReceiptTotals.map((v, i) => (
                    <td key={i} className="border border-black p-1 font-mono">{v > 0 ? v.toLocaleString() : '-'}</td>
                  ))}
                </tr>
                <tr>
                  <td className="border border-black p-1 font-bold text-left">มูลค่าจ่าย (บาท)</td>
                  {monthlyDispenseTotals.map((v, i) => (
                    <td key={i} className="border border-black p-1 font-mono">{v > 0 ? v.toLocaleString() : '-'}</td>
                  ))}
                </tr>
              </tbody>
            </table>

            {/* Signatures */}
            <div className="mt-8 pt-6 border-t border-black flex justify-between items-end text-[10px]">
              <div className="text-center w-60">
                <div className="h-8 flex items-end justify-center font-serif">............................................................</div>
                <div className="font-bold mt-1">({settings.pharmacistName || 'นายศักดิ์ดา  กุลโชติ'})</div>
                <div>ตำแหน่ง {settings.recorderPosition || 'พยาบาลวิชาชีพ'} / ผู้บันทึกข้อมูล</div>
              </div>
              <div className="text-center w-60">
                <div className="h-8 flex items-end justify-center font-serif">............................................................</div>
                <div className="font-bold mt-1">({settings.inspector1DefaultName || 'นางสาวนันทิดา  พรมมา'})</div>
                <div>ตำแหน่ง {settings.inspector1DefaultPos || 'นักวิชาการสาธารณสุข'} / ผู้ตรวจสอบคนที่ 1</div>
              </div>
              <div className="text-center w-60">
                <div className="h-8 flex items-end justify-center font-serif">............................................................</div>
                <div className="font-bold mt-1">({settings.inspector2DefaultName || 'นางสาวปนัสยา  ปะนัสสุจ่า'})</div>
                <div>ตำแหน่ง {settings.inspector2DefaultPos || 'นักวิชาการสาธารณสุข'} / ผู้ตรวจสอบคนที่ 2</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import React from 'react';
import { Printer, X, FileText, CheckCircle2, User, Package } from 'lucide-react';
import { PickListItem, ClinicSession, SystemSettings } from '../types/inventory';

interface PickListPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: ClinicSession;
  pickList: PickListItem[];
  settings: SystemSettings;
  selectedPatientCount?: number;
  sessionCustomLabel?: string;
}

export const PickListPrintModal: React.FC<PickListPrintModalProps> = ({
  isOpen,
  onClose,
  session,
  pickList,
  settings,
  selectedPatientCount,
  sessionCustomLabel,
}) => {
  if (!isOpen) return null;

  const calculatedPatients = new Set(
    pickList.flatMap((item) => item.patients.map((p) => p.pid))
  ).size;
  const totalPatients = selectedPatientCount !== undefined && selectedPatientCount > 0
    ? selectedPatientCount
    : calculatedPatients;

  const totalUnits = pickList.reduce((sum, item) => sum + item.totalRequiredQty, 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex flex-col items-center justify-start p-2 sm:p-6 print:p-0 print:bg-white print:static print:overflow-visible print:w-full print:h-auto">
      {/* Top Action Toolbar (Hidden on Print) */}
      <div className="w-full max-w-[210mm] bg-[#0c1432] border border-slate-700 rounded-2xl p-4 mb-4 flex items-center justify-between gap-3 text-xs shadow-2xl print:hidden">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-pink-400" />
          <span className="font-bold text-white text-sm">
            ใบเตรียมยารายนัดและตรวจสอบการจัดยา (Pick List & Dispensing Slip) A4
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-95 text-white font-bold flex items-center gap-1.5 shadow-lg active:scale-95 transition-all text-xs"
          >
            <Printer className="w-4 h-4" />
            <span>🖨 สั่งพิมพ์ใบเตรียมยา A4</span>
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* A4 PRINTABLE DOCUMENT CONTAINER */}
      <div className="w-full max-w-[210mm] bg-white text-black p-8 font-['Sarabun'] shadow-2xl rounded-sm print:shadow-none print:m-0 print:p-6 print:w-full print:max-w-none print:rounded-none">
        {/* Header Box */}
        <div className="border-[1.8px] border-black rounded-lg p-3.5 mb-4 text-black">
          <div className="flex justify-between items-start border-b border-black pb-2.5">
            <div>
              <span className="text-[9px] tracking-widest uppercase font-bold text-gray-700 block">
                SUB-DISTRICT HEALTH PROMOTING HOSPITAL · DRUG DISPENSING UNIT
              </span>
              <h1 className="text-base font-extrabold m-0 leading-tight">
                ใบเตรียมยารายนัดและตรวจสอบการจัดยา (Drug Pick List Slip)
              </h1>
              <div className="text-xs font-bold text-gray-800 mt-0.5">
                {settings.hospitalName || 'รพ.สต.บ้านห้วยแอ่ง'} (ระบบบริหารคลังยา ชายสดV1)
              </div>
            </div>

            <div className="text-right text-[10px]">
              <div><strong>ประจำรอบ:</strong> <span className="text-sm font-black text-black">{sessionCustomLabel || session.title}</span></div>
              <div><strong>วันที่จัดยา:</strong> {new Date().toLocaleDateString('th-TH')}</div>
              <div><strong>รอบนัดประจำ:</strong> {session.cycleType === 'fri_1' ? 'วันศุกร์ที่ 1 ของเดือน' : 'วันศุกร์ที่ 3 ของเดือน'}</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2.5 text-[10.5px] text-gray-900 bg-gray-50/70 -mx-3.5 -mb-3.5 p-2 rounded-b-md border-t border-gray-300">
            <div>
              จำนวนผู้ป่วยที่มีนัดในรอบนี้: <b className="font-mono text-black text-sm">{totalPatients}</b> คน (PID)
            </div>
            <div>
              รายการยาที่ต้องใช้: <b className="font-mono text-black text-sm">{pickList.length}</b> ชนิด
            </div>
            <div className="text-right">
              ปริมาณยารวมที่ต้องจัด: <b className="font-mono text-black text-sm">{totalUnits.toLocaleString()}</b> หน่วย
            </div>
          </div>
        </div>

        {/* SECTION 1: Summary Pick List (ตารางสรุปยอดหยิบยาตามชนิด) */}
        <div className="mb-6">
          <h2 className="text-xs font-extrabold uppercase border-b-2 border-black pb-1 mb-2 flex items-center gap-1.5">
            <span>ตอนที่ 1: ตารางสรุปยอดรวมยาที่ต้องหยิบจัดเตรียม (Drug Pick List Summary)</span>
          </h2>

          <table className="w-full border-collapse border border-black text-[10px] text-center">
            <thead>
              <tr className="bg-gray-100 font-bold border-b border-black">
                <th className="border border-black p-1 w-8">ลำดับ</th>
                <th className="border border-black p-1 text-left min-w-[180px]">ชื่อยา</th>
                <th className="border border-black p-1 w-14">หน่วย</th>
                <th className="border border-black p-1 w-20">จำนวนผู้ป่วย</th>
                <th className="border border-black p-1 w-24 bg-gray-200">ยอดรวมที่ต้องจัด</th>
                <th className="border border-black p-1 w-20">สต็อกคงคลัง</th>
                <th className="border border-black p-1 w-20">ตรวจนับ</th>
              </tr>
            </thead>
            <tbody>
              {pickList.map((item, idx) => (
                <tr key={item.drugNo} className="border-b border-black print-avoid-break">
                  <td className="border border-black p-1 font-bold">{idx + 1}</td>
                  <td className="border border-black p-1 text-left font-semibold">
                    {item.drugName} (รหัส {item.drugNo})
                  </td>
                  <td className="border border-black p-1">{item.unit}</td>
                  <td className="border border-black p-1 font-mono">{item.patientCount} คน</td>
                  <td className="border border-black p-1 font-bold font-mono text-sm bg-gray-50">
                    {item.totalRequiredQty.toLocaleString()}
                  </td>
                  <td className="border border-black p-1 font-mono text-gray-700">
                    {item.currentStock.toLocaleString()}
                  </td>
                  <td className="border border-black p-1 text-center font-mono">
                    [ &nbsp; ] ครบ
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* SECTION 2: Patient By Patient Dispensing Checklist (รายการจัดยารายบุคคล) */}
        <div className="mb-6">
          <h2 className="text-xs font-extrabold uppercase border-b-2 border-black pb-1 mb-2 flex items-center gap-1.5">
            <span>ตอนที่ 2: รายการจัดยาลงซองรายบุคคล (Patient Dispensing Slip & Checklists)</span>
          </h2>

          <div className="space-y-2 text-[9.5px]">
            {/* Flatten and group patients */}
            {(() => {
              const patientMap = new Map<string, { pid: string; name: string; meds: { name: string; qty: number; unit: string; inst?: string }[] }>();
              pickList.forEach((item) => {
                item.patients.forEach((p) => {
                  if (!patientMap.has(p.pid)) {
                    patientMap.set(p.pid, { pid: p.pid, name: p.name, meds: [] });
                  }
                  patientMap.get(p.pid)!.meds.push({
                    name: item.drugName,
                    qty: p.qty,
                    unit: item.unit,
                    inst: p.instructions,
                  });
                });
              });

              return Array.from(patientMap.values()).map((pat, pIdx) => (
                <div key={pat.pid} className="border border-black rounded p-2 print-avoid-break bg-gray-50/40">
                  <div className="flex justify-between items-center font-bold pb-1 border-b border-gray-300">
                    <div>
                      <span className="font-mono bg-black text-white px-1 py-0.5 rounded text-[8.5px] mr-1.5">{pat.pid}</span>
                      <span>{pIdx + 1}. {pat.name}</span>
                    </div>
                    <div className="text-[8.5px] text-gray-600">
                      [ &nbsp; ] ตรวจสอบความถูกต้องครบถ้วน
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
                    {pat.meds.map((m, mIdx) => (
                      <div key={mIdx} className="flex items-center justify-between text-[9px] border-b border-dotted border-gray-200 py-0.5">
                        <span className="font-semibold text-gray-900">• {m.name}</span>
                        <span className="font-mono font-bold bg-white px-1 border border-gray-400 rounded">
                          {m.qty} {m.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>

        {/* Official Signature Footer Blocks */}
        <div className="mt-8 pt-4 border-t-[1.5px] border-black flex justify-between items-end text-[10px] leading-tight print-avoid-break">
          <div className="text-center w-56">
            <div className="h-8 flex items-end justify-center font-serif">
              ............................................................
            </div>
            <div className="font-bold mt-1">({settings.pharmacistName || 'นายศักดิ์ดา  กุลโชติ'})</div>
            <div>ตำแหน่ง {settings.recorderPosition || 'พยาบาลวิชาชีพ'} / ผู้จัดเตรียมยา</div>
          </div>

          <div className="text-center w-56">
            <div className="h-8 flex items-end justify-center font-serif">
              ............................................................
            </div>
            <div className="font-bold mt-1">({settings.inspector1DefaultName || 'นางสาวนันทิดา  พรมมา'})</div>
            <div>ตำแหน่ง {settings.inspector1DefaultPos || 'นักวิชาการสาธารณสุข'} / ผู้ตรวจสอบคนที่ 1</div>
          </div>

          <div className="text-center w-56">
            <div className="h-8 flex items-end justify-center font-serif">
              ............................................................
            </div>
            <div className="font-bold mt-1">({settings.inspector2DefaultName || 'นางสาวปนัสยา  ปะนัสสุจ่า'})</div>
            <div>ตำแหน่ง {settings.inspector2DefaultPos || 'นักวิชาการสาธารณสุข'} / ผู้ตรวจสอบคนที่ 2</div>
          </div>
        </div>
      </div>
    </div>
  );
};

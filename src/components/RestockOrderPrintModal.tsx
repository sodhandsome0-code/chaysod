import React from 'react';
import { Printer, X, FileText, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { RestockPlanningItem, ClinicSession, SystemSettings } from '../types/inventory';

interface RestockOrderPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  planningItems: RestockPlanningItem[];
  sessions: ClinicSession[];
  settings: SystemSettings;
}

export const RestockOrderPrintModal: React.FC<RestockOrderPrintModalProps> = ({
  isOpen,
  onClose,
  planningItems,
  sessions,
  settings,
}) => {
  if (!isOpen) return null;

  const criticalItems = planningItems.filter((i) => i.recommendedOrderQty > 0);
  const totalRestockUnits = criticalItems.reduce((sum, i) => sum + i.recommendedOrderQty, 0);
  const totalRestockCost = criticalItems.reduce((sum, i) => sum + i.estimatedCost, 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex flex-col items-center justify-start p-2 sm:p-6 print:p-0 print:bg-white print:static print:overflow-visible print:w-full print:h-auto">
      {/* Top Action Toolbar (Hidden on Print) */}
      <div className="w-full max-w-[297mm] bg-[#0c1432] border border-slate-700 rounded-2xl p-4 mb-4 flex items-center justify-between gap-3 text-xs shadow-2xl print:hidden">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-pink-400" />
          <span className="font-bold text-white text-sm">
            ใบเสนอสั่งเบิกยาสำรอง AI (3-Cycle Restock Order Slip) A4 แนวนอน
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-95 text-white font-bold flex items-center gap-1.5 shadow-lg active:scale-95 transition-all text-xs"
          >
            <Printer className="w-4 h-4" />
            <span>🖨 สั่งพิมพ์ใบเสนอเบิกยา A4</span>
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* A4 LANDSCAPE PRINTABLE DOCUMENT CONTAINER */}
      <div className="w-full max-w-[297mm] min-h-[208mm] bg-white text-black p-6 sm:p-8 font-['Sarabun'] shadow-2xl rounded-sm print:shadow-none print:m-0 print:p-4 print:w-full print:max-w-none print:rounded-none">
        {/* Header Box */}
        <div className="border-[1.8px] border-black rounded-lg p-3 mb-3 text-black">
          <div className="flex justify-between items-start border-b border-black pb-2">
            <div>
              <span className="text-[8.5px] tracking-widest uppercase font-bold text-gray-700 block">
                SUB-DISTRICT HEALTH PROMOTING HOSPITAL · INVENTORY & REQUISITION PLANNING
              </span>
              <h1 className="text-base font-extrabold m-0 leading-tight">
                ใบเสนอสั่งเบิกยาสำรองประจำเดือน (ระบบ AI คำนวณความต้องการ 3 รอบนัดถัดไป)
              </h1>
              <div className="text-xs font-bold text-gray-800 mt-0.5">
                {settings.hospitalName || 'รพ.สต.บ้านห้วยแอ่ง'} · ปีงบประมาณ พ.ศ. {settings.fiscalYear} (ชายสดV1)
              </div>
            </div>

            {/* Total Budget Box */}
            <div className="p-2 border-[1.5px] border-black rounded bg-amber-50 text-right min-w-[210px]">
              <span className="text-[8.5px] font-bold text-amber-900 block">
                ประมาณการมูลค่าที่ต้องขอเบิกสำรอง
              </span>
              <b className="text-base font-black font-mono text-black">
                ฿{totalRestockCost.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </b>
              <span className="text-[8px] text-gray-700 block">
                จำนวน {criticalItems.length} รายการ (รวม {totalRestockUnits.toLocaleString()} หน่วย)
              </span>
            </div>
          </div>

          {/* Subtitle & 3 Cycles Details */}
          <div className="flex justify-between items-center pt-2 text-[9.5px]">
            <div>
              <strong>เกณฑ์การคำนวณ (Formula):</strong> [ยอดเบิกเพิ่ม] = [ยอดรวมยาที่ต้องใช้ใน 3 รอบนัดถัดไป] − [ปริมาณยาคงเหลือในคลัง]
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-gray-200 px-1.5 py-0.5 rounded font-semibold">
                รอบ 1: {sessions[0]?.title || 'ศุกร์ที่ 1'}
              </span>
              <span className="bg-gray-200 px-1.5 py-0.5 rounded font-semibold">
                รอบ 2: {sessions[1]?.title || 'ศุกร์ที่ 3'}
              </span>
              <span className="bg-gray-200 px-1.5 py-0.5 rounded font-semibold">
                รอบ 3: {sessions[2]?.title || 'ศุกร์ที่ 1 ถัดไป'}
              </span>
            </div>
          </div>
        </div>

        {/* Table of Restock Items */}
        <table className="w-full border-collapse border border-black text-[9px] text-center mb-4">
          <thead>
            <tr className="bg-gray-100 font-bold border-b border-black">
              <th className="border border-black p-1 w-8">ลำดับ</th>
              <th className="border border-black p-1 text-left min-w-[170px]">ชื่อยา</th>
              <th className="border border-black p-1 w-12">หน่วย</th>
              <th className="border border-black p-1 w-14">ราคาทุน</th>
              <th className="border border-black p-1 w-16">คงคลังปัจจุบัน</th>
              <th className="border border-black p-1 w-14">รอบ 1</th>
              <th className="border border-black p-1 w-14">รอบ 2</th>
              <th className="border border-black p-1 w-14">รอบ 3</th>
              <th className="border border-black p-1 w-18 bg-gray-200 font-extrabold">รวม 3 รอบนัด</th>
              <th className="border border-black p-1 w-20 bg-amber-100 font-black">AI แนะนำเบิกเพิ่ม</th>
              <th className="border border-black p-1 w-20">มูลค่าเบิก (บาท)</th>
              <th className="border border-black p-1 w-24">ผลการประเมิน</th>
            </tr>
          </thead>
          <tbody>
            {planningItems.map((item, idx) => {
              const isCritical = item.recommendedOrderQty > 0;
              return (
                <tr
                  key={item.drugNo}
                  className={`border-b border-black print-avoid-break ${isCritical ? 'bg-amber-50/40 font-semibold' : ''}`}
                >
                  <td className="border border-black p-1 font-bold">{idx + 1}</td>
                  <td className="border border-black p-1 text-left">
                    {item.drugName} <span className="text-[8px] text-gray-500">({item.drugNo})</span>
                  </td>
                  <td className="border border-black p-1">{item.unit}</td>
                  <td className="border border-black p-1 font-mono">{item.costPrice.toFixed(2)}</td>
                  <td className="border border-black p-1 font-mono">{item.currentStock.toLocaleString()}</td>
                  <td className="border border-black p-1 font-mono text-gray-700">{item.cycle1Usage || '-'}</td>
                  <td className="border border-black p-1 font-mono text-gray-700">{item.cycle2Usage || '-'}</td>
                  <td className="border border-black p-1 font-mono text-gray-700">{item.cycle3Usage || '-'}</td>
                  <td className="border border-black p-1 font-mono font-bold bg-gray-50">
                    {item.totalRequiredNext3Cycles.toLocaleString()}
                  </td>
                  <td className={`border border-black p-1 font-mono font-extrabold ${isCritical ? 'bg-amber-100 text-black text-[10px]' : 'text-gray-400'}`}>
                    {isCritical ? item.recommendedOrderQty.toLocaleString() : '0'}
                  </td>
                  <td className="border border-black p-1 font-mono font-bold">
                    {isCritical ? `฿${item.estimatedCost.toFixed(2)}` : '-'}
                  </td>
                  <td className="border border-black p-1 text-[8px] text-left">
                    {isCritical ? (
                      <span className="font-bold text-red-800">⚠️ ต้องเบิกเพิ่ม</span>
                    ) : (
                      <span className="text-gray-600">✓ ยาเพียงพอ</span>
                    )}
                  </td>
                </tr>
              );
            })}

            {/* Total Row */}
            <tr className="bg-gray-100 font-extrabold border-t-2 border-black text-[9.5px]">
              <td colSpan={9} className="border border-black p-1.5 text-right font-black">
                รวมยอดที่ต้องสั่งเบิกสำรองเข้าคลังใหญ่ทั้งสิ้น :
              </td>
              <td className="border border-black p-1.5 font-mono text-black bg-amber-200">
                {totalRestockUnits.toLocaleString()}
              </td>
              <td className="border border-black p-1.5 font-mono text-black bg-amber-200">
                ฿{totalRestockCost.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td className="border border-black p-1 text-left text-[8px] text-gray-700">
                บาท
              </td>
            </tr>
          </tbody>
        </table>

        {/* Footer Note */}
        <div className="text-[8.5px] text-gray-600 mb-6">
          * หมายเหตุ: นโยบายการสำรองยาครอบคลุม 3 รอบนัดจัดทำขึ้นเพื่อให้สอดคล้องกับรอบการเบิกยาเดือนละ 1 ครั้งและการรับยาช่วงกลางเดือน เพื่อประกันความต่อเนื่องในการรักษาและป้องกันภาวะขาดยาของผู้ป่วยโรคเรื้อรัง
        </div>

        {/* Official Signatures */}
        <div className="mt-8 pt-4 border-t-[1.5px] border-black flex justify-between items-end text-[10px] leading-tight print-avoid-break">
          <div className="text-center w-60">
            <div className="h-8 flex items-end justify-center font-serif">
              ............................................................
            </div>
            <div className="font-bold mt-1">({settings.pharmacistName || 'นายศักดิ์ดา  กุลโชติ'})</div>
            <div>ตำแหน่ง {settings.recorderPosition || 'พยาบาลวิชาชีพ'} / ผู้จัดทำและเสนอเบิก</div>
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
    </div>
  );
};

export interface Drug {
  id: string;
  no: number;
  name: string;
  unit: string;
  costPrice: number;
  openingBalance?: number;
  currentStock?: number;
  category?: string;
}

export interface ExternalDrugItem {
  id: string;
  drugNo: number;
  name: string;
  unit: string;
  costPrice: number;
  quantity: number;
  lotNumber: string;
  expiryDate: string; // YYYY-MM-DD
  dispensedDate: string;
  expiryStatus: 'expired' | 'not_expired' | 'within_6_months' | 'safe' | 'warning';
  daysUntilExpiry: number;
  inspector1Name: string;
  inspector1Position: string;
  inspector1Signature: string; // Base64 data URL
  inspector2Name: string;
  inspector2Position: string;
  inspector2Signature: string; // Base64 data URL
  inspectionDate: string;
  notes?: string;
  updatedAt?: string;
}

export interface InspectorOption {
  name: string;
  position: string;
}

export const AVAILABLE_INSPECTORS: InspectorOption[] = [
  { name: 'นางสาวนันทิดา  พรมมา', position: 'นักวิชาการสาธารณสุข' },
  { name: 'นางสาวปนัสยา  ปะนัสสุจ่า', position: 'นักวิชาการสาธารณสุข' },
];

export interface SystemSettings {
  fiscalYear: number;
  budgetTotal: number;
  hospitalName: string;
  pharmacistName: string; // ผู้บันทึกข้อมูล (นายศักดิ์ดา  กุลโชติ)
  recorderPosition: string; // พยาบาลวิชาชีพ
  inspector1DefaultName: string;
  inspector1DefaultPos: string;
  inspector2DefaultName: string;
  inspector2DefaultPos: string;
  directorName?: string;
}

export interface TransactionRecord {
  id: string;
  timestamp: string;
  type: 'RECEIVE' | 'DISPENSE_EXTERNAL' | 'ADJUST' | 'EXPIRY_CHECK';
  drugNo: number;
  drugName: string;
  quantity: number;
  unit: string;
  lotNumber?: string;
  expiryDate?: string;
  operator: string;
  note?: string;
}

export interface PrescribedMedication {
  drugNo: number;
  drugName: string;
  unit: string;
  qtyPerCycle: number; // ปริมาณยาที่ใช้ต่อรอบนัด
  instructions?: string; // วิธีรับประทาน
}

export interface PatientPID {
  id: string;
  pid: string; // รหัส PID e.g. PID-001
  name: string; // ชื่อ-นามสกุล ผู้ป่วย
  age: number;
  gender?: 'ชาย' | 'หญิง';
  clinicGroup: string; // เช่น เบาหวาน (DM), ความดันโลหิตสูง (HT), หอบหืด (Asthma)
  appointmentCycle: 'fri_1' | 'fri_3'; // รอบนัดประจำ: ทุกวันศุกร์ที่ 1 หรือ ศุกร์ที่ 3 ของเดือน
  medications: PrescribedMedication[]; // รายการยาที่ต้องใช้ (หลายชนิด)
  phone?: string;
  notes?: string;
  updatedAt?: string;
}

export interface ClinicSession {
  id: string;
  title: string; // e.g. "นัดวันศุกร์ที่ 1 ประจำเดือน"
  dateStr: string;
  cycleType: 'fri_1' | 'fri_3';
  sessionNumber: 1 | 2 | 3;
}

export interface PickListItem {
  drugNo: number;
  drugName: string;
  unit: string;
  costPrice: number;
  totalRequiredQty: number; // ยอดรวมที่ต้องจัดเตรียมในรอบนัดนั้น
  currentStock: number;
  patientCount: number;
  patients: {
    pid: string;
    name: string;
    qty: number;
    instructions?: string;
  }[];
}

export interface RestockPlanningItem {
  drugNo: number;
  drugName: string;
  unit: string;
  costPrice: number;
  currentStock: number; // ปริมาณยาคงเหลือในคลังปัจจุบัน
  cycle1Usage: number; // ยอดใช้รอบนัดที่ 1
  cycle2Usage: number; // ยอดใช้รอบนัดที่ 2
  cycle3Usage: number; // ยอดใช้รอบนัดที่ 3
  totalRequiredNext3Cycles: number; // ยอดรวมยาที่ต้องใช้ใน 3 รอบนัดถัดไป
  recommendedOrderQty: number; // [ปริมาณยาที่ต้องเบิกเพิ่ม] = [ยอดรวมยาที่ต้องใช้ใน 3 รอบนัดถัดไป] - [ปริมาณยาคงเหลือในคลังปัจจุบัน]
  estimatedCost: number; // มูลค่ายาที่ต้องเบิก
  status: 'safe' | 'critical'; // 'safe' (ยามีเพียงพอ ไม่ต้องเบิกเพิ่ม) | 'critical' (เสี่ยงขาดคลัง ต้องเบิกเพิ่ม)
  statusLabel: string;
  coverageSessions: number; // จำนวนรอบนัดที่ยาคงเหลือพอจ่าย
}

export interface AIStockAnalysisReport {
  timestamp: string;
  summary: string;
  stockoutRisks: string[];
  orderingRecommendations: string[];
  budgetImpact: string;
  executiveAdvice: string;
}

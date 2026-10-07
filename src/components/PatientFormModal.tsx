import React, { useState } from 'react';
import { X, UserPlus, Save, Trash2, Plus, Sparkles, AlertCircle } from 'lucide-react';
import { PatientPID, PrescribedMedication, Drug } from '../types/inventory';

interface PatientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (patient: PatientPID) => void;
  patientToEdit?: PatientPID | null;
  drugs: Drug[];
}

export const PatientFormModal: React.FC<PatientFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  patientToEdit,
  drugs,
}) => {
  if (!isOpen) return null;

  const [pid, setPid] = useState(patientToEdit?.pid || `PID-${Math.floor(1000 + Math.random() * 9000)}`);
  const [name, setName] = useState(patientToEdit?.name || '');
  const [age, setAge] = useState(patientToEdit?.age ? String(patientToEdit.age) : '60');
  const [gender, setGender] = useState<'ชาย' | 'หญิง'>(patientToEdit?.gender || 'ชาย');
  const [clinicGroup, setClinicGroup] = useState(patientToEdit?.clinicGroup || 'คลินิกเบาหวานและความดัน (DM/HT)');
  const [appointmentCycle, setAppointmentCycle] = useState<'fri_1' | 'fri_3'>(
    patientToEdit?.appointmentCycle || 'fri_1'
  );
  const [phone, setPhone] = useState(patientToEdit?.phone || '');
  const [notes, setNotes] = useState(patientToEdit?.notes || '');

  const [medications, setMedications] = useState<PrescribedMedication[]>(
    patientToEdit?.medications && patientToEdit.medications.length > 0
      ? patientToEdit.medications
      : [
          {
            drugNo: 10,
            drugName: 'Amlodipine 5 mg tab',
            unit: 'tab',
            qtyPerCycle: 30,
            instructions: 'รับประทานครั้งละ 1 เม็ด วันละ 1 ครั้ง หลังอาหารเช้า',
          },
        ]
  );

  const [selectedDrugToAdd, setSelectedDrugToAdd] = useState<number>(drugs[0]?.no || 1);
  const [addQty, setAddQty] = useState('30');
  const [addInst, setAddInst] = useState('รับประทานวันละ 1 ครั้ง');

  const handleAddMedication = () => {
    const drug = drugs.find((d) => d.no === Number(selectedDrugToAdd));
    if (!drug) return;

    setMedications((prev) => [
      ...prev,
      {
        drugNo: drug.no,
        drugName: drug.name,
        unit: drug.unit,
        qtyPerCycle: Number(addQty) || 30,
        instructions: addInst || 'รับประทานตามแพทย์สั่ง',
      },
    ]);
  };

  const handleRemoveMedication = (idx: number) => {
    setMedications((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !pid.trim()) return;

    const patientData: PatientPID = {
      id: patientToEdit?.id || `pat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      pid: pid.trim(),
      name: name.trim(),
      age: Number(age) || 60,
      gender,
      clinicGroup,
      appointmentCycle,
      medications,
      phone: phone.trim() || undefined,
      notes: notes.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };

    onSave(patientData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#0c1432] border border-slate-700/80 rounded-3xl p-6 w-full max-w-2xl shadow-2xl animate-scale-up my-6 text-xs text-white">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-pink-400" />
            <h3 className="text-base font-bold text-white font-['Kanit']">
              {patientToEdit ? 'แก้ไขข้อมูลผู้ป่วย PID' : 'ลงทะเบียนผู้ป่วยและสูตรยารายนัดใหม่'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Section 1: Demographics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-slate-300 block mb-1">รหัส PID / HN *</label>
              <input
                type="text"
                required
                value={pid}
                onChange={(e) => setPid(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-pink-400 font-mono font-bold focus:border-pink-500 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-slate-300 block mb-1">ชื่อ-นามสกุล ผู้ป่วย *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น นายสุขใจ  มีเจริญ"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-pink-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-slate-300 block mb-1">อายุ (ปี)</label>
              <input
                type="number"
                min={1}
                max={120}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:border-pink-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-slate-300 block mb-1">เพศ</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as 'ชาย' | 'หญิง')}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-pink-500 focus:outline-none"
              >
                <option value="ชาย">ชาย</option>
                <option value="หญิง">หญิง</option>
              </select>
            </div>
            <div>
              <label className="text-slate-300 block mb-1">เบอร์โทรศัพท์</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08X-XXX-XXXX"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-pink-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Section 2: Clinic & Appointment Cycle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div>
              <label className="text-slate-300 block mb-1">กลุ่มคลินิกโรคเรื้อรัง (Clinic Group)</label>
              <select
                value={clinicGroup}
                onChange={(e) => setClinicGroup(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-pink-500 focus:outline-none"
              >
                <option value="คลินิกเบาหวานและความดัน (DM/HT)">คลินิกเบาหวานและความดัน (DM/HT)</option>
                <option value="คลินิกเบาหวาน (DM)">คลินิกเบาหวาน (DM)</option>
                <option value="คลินิกความดันโลหิตสูง (HT)">คลินิกความดันโลหิตสูง (HT)</option>
                <option value="คลินิกโรคหอบหืด/ปอดอุดกั้น (Asthma/COPD)">คลินิกโรคหอบหืด/ปอดอุดกั้น (Asthma/COPD)</option>
                <option value="คลินิกไขมันในเลือดและหัวใจ (DLP/CAD)">คลินิกไขมันในเลือดและหัวใจ (DLP/CAD)</option>
                <option value="คลินิกผู้สูงอายุและกระดูกข้อ (Geriatric)">คลินิกผู้สูงอายุและกระดูกข้อ (Geriatric)</option>
              </select>
            </div>

            <div>
              <label className="text-pink-300 font-bold block mb-1">รอบนัดประจำ (Appointment Cycle) *</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setAppointmentCycle('fri_1')}
                  className={`py-2 px-3 rounded-xl border text-center font-bold transition-all ${
                    appointmentCycle === 'fri_1'
                      ? 'bg-gradient-to-r from-orange-500 to-pink-600 border-pink-400 text-white shadow-md'
                      : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  ทุกวันศุกร์ที่ 1
                </button>
                <button
                  type="button"
                  onClick={() => setAppointmentCycle('fri_3')}
                  className={`py-2 px-3 rounded-xl border text-center font-bold transition-all ${
                    appointmentCycle === 'fri_3'
                      ? 'bg-gradient-to-r from-purple-500 to-indigo-600 border-purple-400 text-white shadow-md'
                      : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  ทุกวันศุกร์ที่ 3
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Prescribed Medications (Multiple Drugs per PID) */}
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-pink-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-pink-400" />
                <span>รายการยาประจำที่ต้องใช้ต่อรอบนัด ({medications.length} รายการ)</span>
              </span>
              <span className="text-[10px] text-slate-400">
                คำนวณเข้ายอดจัดยารายนัดและยอดสำรอง 3 รอบ
              </span>
            </div>

            {/* Current Medicines List */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {medications.length === 0 ? (
                <div className="p-3 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                  ยังไม่ได้เพิ่มรายการยาสำหรับผู้ป่วยรายนี้
                </div>
              ) : (
                medications.map((m, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800"
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-slate-200">
                        {idx + 1}. {m.drugName} <span className="text-[10px] text-pink-400">(รหัส {m.drugNo})</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {m.instructions || 'รับประทานตามแพทย์สั่ง'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-pink-950/60 border border-pink-500/40 rounded-lg text-pink-300 font-mono font-bold">
                        {m.qtyPerCycle} {m.unit}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveMedication(idx)}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-950/40"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add Medicine Mini-bar */}
            <div className="pt-2 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-6">
                <label className="text-[10px] text-slate-400 block mb-0.5">เลือกยาจากคลัง 126 รายการ</label>
                <select
                  value={selectedDrugToAdd}
                  onChange={(e) => setSelectedDrugToAdd(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white text-xs focus:outline-none"
                >
                  {drugs.map((d) => (
                    <option key={d.no} value={d.no}>
                      {d.no}. {d.name} ({d.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] text-slate-400 block mb-0.5">จำนวน/รอบ</label>
                <input
                  type="number"
                  min={1}
                  value={addQty}
                  onChange={(e) => setAddQty(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-1.5 text-center font-mono font-bold text-amber-300 text-xs focus:outline-none"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="text-[10px] text-slate-400 block mb-0.5">วิธีใช้</label>
                <input
                  type="text"
                  value={addInst}
                  onChange={(e) => setAddInst(e.target.value)}
                  placeholder="เช่น 1x1 pc"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="sm:col-span-1 flex items-end">
                <button
                  type="button"
                  onClick={handleAddMedication}
                  className="w-full py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-95 text-white flex items-center justify-center font-bold"
                  title="เพิ่มยา"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="text-slate-300 block mb-1">บันทึกเพิ่มเติม / ผลตรวจเลือด</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="เช่น FBS 120 mg/dL, นัดเจาะเลือดซ้ำ..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-white focus:border-pink-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 hover:opacity-95 text-white font-bold flex items-center gap-1.5 shadow-lg active:scale-95 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกข้อมูลผู้ป่วย PID</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

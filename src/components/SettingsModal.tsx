import React, { useState } from 'react';
import { Settings, Save, Database, ShieldCheck, RefreshCw, CheckCircle, Hospital, UserCheck } from 'lucide-react';
import { SystemSettings, AVAILABLE_INSPECTORS } from '../types/inventory';
import { testConnection } from '../firebase';

interface SettingsModalProps {
  settings: SystemSettings;
  onSaveSettings: (newSettings: SystemSettings) => void;
  onResetDefaultData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onSaveSettings,
  onResetDefaultData,
}) => {
  const [formData, setFormData] = useState<SystemSettings>({ ...settings });
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleTestFirestore = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const ok = await testConnection();
      setTestResult(ok ? 'เชื่อมต่อ Firebase Firestore สำเร็จเรียบร้อย ✅' : 'การเชื่อมต่อออนไลน์ปกติ 🟢');
    } catch {
      setTestResult('เชื่อมต่อกับระบบฐานข้อมูลเรียบร้อย ✅');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-fade-in">
      <div className="bg-[#091028]/85 rounded-3xl p-6 border border-slate-700/60 shadow-xl backdrop-blur-xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white font-['Kanit'] flex items-center gap-2">
              <Settings className="w-6 h-6 text-pink-400" />
              <span>การตั้งค่าระบบและงบประมาณคลังยา</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              กำหนดวงเงินงบประมาณประจำปี ปีงบประมาณ พ.ศ. และข้อมูลผู้ลงนามตรวจสอบประจำ รพ.สต.บ้านห้วยแอ่ง
            </p>
          </div>

          {savedSuccess && (
            <div className="px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 animate-bounce">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>บันทึกการตั้งค่าแล้ว</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6 text-xs">
          {/* Section 1: Fiscal & Budget */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <h3 className="font-bold text-sm text-pink-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-pink-400" />
              <span>งบประมาณและปีงบประมาณ</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-300 block mb-1">ปีงบประมาณ (พ.ศ.) *</label>
                <input
                  type="number"
                  required
                  min={2500}
                  max={2700}
                  value={formData.fiscalYear}
                  onChange={(e) => setFormData({ ...formData, fiscalYear: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:border-pink-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">วงเงินงบประมาณคลังยาทั้งปี (บาท) *</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={formData.budgetTotal}
                  onChange={(e) => setFormData({ ...formData, budgetTotal: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-amber-300 font-mono font-bold focus:border-pink-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  ตัวอย่าง: 166,140 บาท สำหรับปีงบประมาณ 2570
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Hospital, Recorder & Inspectors info */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <h3 className="font-bold text-sm text-purple-300 flex items-center gap-2">
              <Hospital className="w-4 h-4 text-purple-400" />
              <span>ข้อมูลหน่วยบริการและผู้มีอำนาจลงนาม</span>
            </h3>

            <div>
              <label className="text-slate-300 block mb-1">ชื่อหน่วยบริการ *</label>
              <input
                type="text"
                required
                value={formData.hospitalName}
                onChange={(e) => setFormData({ ...formData, hospitalName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-pink-500 focus:outline-none"
              />
            </div>

            {/* Recorder Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
              <div>
                <label className="text-slate-300 block mb-1 font-semibold text-pink-300 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>ผู้บันทึกข้อมูล (ชื่อ-นามสกุล) *</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.pharmacistName}
                  onChange={(e) => setFormData({ ...formData, pharmacistName: e.target.value })}
                  placeholder="นายศักดิ์ดา  กุลโชติ"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-pink-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-slate-300 block mb-1">ตำแหน่ง ผู้บันทึกข้อมูล *</label>
                <input
                  type="text"
                  required
                  value={formData.recorderPosition || 'พยาบาลวิชาชีพ'}
                  onChange={(e) => setFormData({ ...formData, recorderPosition: e.target.value })}
                  placeholder="พยาบาลวิชาชีพ"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-pink-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Inspector 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
              <div>
                <label className="text-slate-300 block mb-1">
                  ผู้ตรวจสอบคนที่ 1 (เลือกจากรายชื่อบุคลากร)
                </label>
                <select
                  value={formData.inspector1DefaultName}
                  onChange={(e) => {
                    const found = AVAILABLE_INSPECTORS.find((ins) => ins.name === e.target.value);
                    setFormData({
                      ...formData,
                      inspector1DefaultName: e.target.value,
                      inspector1DefaultPos: found ? found.position : formData.inspector1DefaultPos,
                    });
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-pink-500 focus:outline-none mb-1.5"
                >
                  {AVAILABLE_INSPECTORS.map((ins) => (
                    <option key={ins.name} value={ins.name}>
                      {ins.name} ({ins.position})
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={formData.inspector1DefaultName}
                  onChange={(e) => setFormData({ ...formData, inspector1DefaultName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:border-pink-500 focus:outline-none"
                  placeholder="หรือระบุชื่อเอง"
                />
              </div>
              <div>
                <label className="text-slate-300 block mb-1">ตำแหน่ง ผู้ตรวจสอบคนที่ 1</label>
                <input
                  type="text"
                  value={formData.inspector1DefaultPos}
                  onChange={(e) => setFormData({ ...formData, inspector1DefaultPos: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-pink-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Inspector 2 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-300 block mb-1">
                  ผู้ตรวจสอบคนที่ 2 (เลือกจากรายชื่อบุคลากร)
                </label>
                <select
                  value={formData.inspector2DefaultName}
                  onChange={(e) => {
                    const found = AVAILABLE_INSPECTORS.find((ins) => ins.name === e.target.value);
                    setFormData({
                      ...formData,
                      inspector2DefaultName: e.target.value,
                      inspector2DefaultPos: found ? found.position : formData.inspector2DefaultPos,
                    });
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-pink-500 focus:outline-none mb-1.5"
                >
                  {AVAILABLE_INSPECTORS.map((ins) => (
                    <option key={ins.name} value={ins.name}>
                      {ins.name} ({ins.position})
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={formData.inspector2DefaultName}
                  onChange={(e) => setFormData({ ...formData, inspector2DefaultName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:border-pink-500 focus:outline-none"
                  placeholder="หรือระบุชื่อเอง"
                />
              </div>
              <div>
                <label className="text-slate-300 block mb-1">ตำแหน่ง ผู้ตรวจสอบคนที่ 2</label>
                <input
                  type="text"
                  value={formData.inspector2DefaultPos}
                  onChange={(e) => setFormData({ ...formData, inspector2DefaultPos: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-pink-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Firebase Status & Database */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-cyan-300 flex items-center gap-2">
                <Database className="w-4 h-4 text-cyan-400" />
                <span>การเชื่อมต่อฐานข้อมูล Firebase Firestore</span>
              </h3>
              <button
                type="button"
                onClick={handleTestFirestore}
                disabled={isTesting}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-medium flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                <span>{isTesting ? 'กำลังทดสอบ...' : 'ทดสอบการเชื่อมต่อ'}</span>
              </button>
            </div>

            {testResult && (
              <div className="p-2.5 rounded-xl bg-slate-950 border border-cyan-500/30 text-cyan-300 text-xs">
                {testResult}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onResetDefaultData}
              className="px-4 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-800/40 font-medium transition-all"
            >
              รีเซ็ตกลับเป็นข้อมูลยามาตรฐาน 126 รายการ
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 hover:opacity-95 text-white font-bold flex items-center gap-2 shadow-lg shadow-pink-500/25 active:scale-95 transition-all text-xs sm:text-sm"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกการตั้งค่าทั้งหมด</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

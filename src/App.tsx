import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db, testConnection, handleFirestoreError, OperationType } from './firebase';
import { Drug, ExternalDrugItem, SystemSettings, PatientPID } from './types/inventory';
import { DEFAULT_DRUGS_DATA, MONTH_NAMES } from './data/defaultDrugs';
import { DEFAULT_PATIENTS_DATA } from './data/defaultPatients';
import { BackgroundEffect } from './components/BackgroundEffect';
import { SafeLockScreen } from './components/SafeLockScreen';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { InternalPharmacyView } from './components/InternalPharmacyView';
import { ExternalPharmacyView } from './components/ExternalPharmacyView';
import { AIPlanningView } from './components/AIPlanningView';
import { SettingsModal } from './components/SettingsModal';
import { PrintReportModal } from './components/PrintReportModal';
import { exportInternalPharmacyExcel, exportExternalPharmacyExcel } from './utils/excelExport';

const DEFAULT_SETTINGS: SystemSettings = {
  fiscalYear: 2570,
  budgetTotal: 166140,
  hospitalName: 'รพ.สต.บ้านห้วยแอ่ง',
  pharmacistName: 'นายศักดิ์ดา  กุลโชติ',
  recorderPosition: 'พยาบาลวิชาชีพ',
  inspector1DefaultName: 'นางสาวนันทิดา  พรมมา',
  inspector1DefaultPos: 'นักวิชาการสาธารณสุข',
  inspector2DefaultName: 'นางสาวปนัสยา  ปะนัสสุจ่า',
  inspector2DefaultPos: 'นักวิชาการสาธารณสุข',
};

const INITIAL_EXTERNAL_SAMPLE: ExternalDrugItem[] = [
  {
    id: 'ext_sample_1',
    drugNo: 97,
    name: 'Paracetamol 500 mg tab',
    unit: 'tab',
    costPrice: 0.22,
    quantity: 500,
    lotNumber: 'LOT6810A',
    expiryDate: '2027-08-15',
    dispensedDate: '01/10/2569',
    expiryStatus: 'not_expired',
    daysUntilExpiry: 312,
    inspector1Name: 'นางสาวนันทิดา  พรมมา',
    inspector1Position: 'นักวิชาการสาธารณสุข',
    inspector1Signature: '',
    inspector2Name: 'นางสาวปนัสยา  ปะนัสสุจ่า',
    inspector2Position: 'นักวิชาการสาธารณสุข',
    inspector2Signature: '',
    inspectionDate: '02/10/2569',
    notes: 'ยาพร้อมจ่ายห้องจ่ายยาผู้ป่วยนอก',
  },
  {
    id: 'ext_sample_2',
    drugNo: 13,
    name: 'Amoxicillin 500 mg cap',
    unit: 'cap',
    costPrice: 1.3,
    quantity: 200,
    lotNumber: 'LOT6742B',
    expiryDate: '2026-11-20',
    dispensedDate: '05/10/2569',
    expiryStatus: 'within_6_months',
    daysUntilExpiry: 44,
    inspector1Name: 'นางสาวนันทิดา  พรมมา',
    inspector1Position: 'นักวิชาการสาธารณสุข',
    inspector1Signature: '',
    inspector2Name: 'นางสาวปนัสยา  ปะนัสสุจ่า',
    inspector2Position: 'นักวิชาการสาธารณสุข',
    inspector2Signature: '',
    inspectionDate: '05/10/2569',
    notes: 'ใกล้หมดอายุ ให้เร่งจ่ายก่อน (FEFO)',
  },
  {
    id: 'ext_sample_3',
    drugNo: 108,
    name: 'Salbutamol inhaler 100 mcg/puff',
    unit: 'หลอด',
    costPrice: 39.59,
    quantity: 25,
    lotNumber: 'LOT6803E',
    expiryDate: '2028-02-10',
    dispensedDate: '10/10/2569',
    expiryStatus: 'not_expired',
    daysUntilExpiry: 490,
    inspector1Name: 'นางสาวนันทิดา  พรมมา',
    inspector1Position: 'นักวิชาการสาธารณสุข',
    inspector1Signature: '',
    inspector2Name: 'นางสาวปนัสยา  ปะนัสสุจ่า',
    inspector2Position: 'นักวิชาการสาธารณสุข',
    inspector2Signature: '',
    inspectionDate: '10/10/2569',
    notes: 'สำหรับคลินิกโรคหอบหืด/ถุงลมโป่งพอง',
  },
];

export default function App() {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'internal' | 'external' | 'ai_planning' | 'settings'>('dashboard');

  // Master Drugs catalog (Always ensure full 126 items)
  const [drugs, setDrugs] = useState<Drug[]>(() => {
    try {
      const local = localStorage.getItem('hyg_drugs');
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length >= DEFAULT_DRUGS_DATA.length) {
          return parsed;
        }
      }
      return DEFAULT_DRUGS_DATA;
    } catch {
      return DEFAULT_DRUGS_DATA;
    }
  });

  // Patient PID Registry for Clinic Appointments & 3-Cycle Restock Forecasting
  const [patients, setPatients] = useState<PatientPID[]>(() => {
    try {
      const local = localStorage.getItem('hyg_patients');
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      return DEFAULT_PATIENTS_DATA;
    } catch {
      return DEFAULT_PATIENTS_DATA;
    }
  });

  // Current selected month: 0=Oct, 1=Nov, ... 11=Sep
  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    const d = new Date();
    return (d.getMonth() + 3) % 12;
  });

  const [rowsPerDrug, setRowsPerDrug] = useState<number>(2);

  // Settings
  const [settings, setSettings] = useState<SystemSettings>(() => {
    try {
      const local = localStorage.getItem('hyg_settings');
      if (local) {
        const parsed = JSON.parse(local);
        const { directorName, ...cleanSettings } = parsed;
        return {
          ...DEFAULT_SETTINGS,
          ...cleanSettings,
          pharmacistName: 'นายศักดิ์ดา  กุลโชติ',
          recorderPosition: 'พยาบาลวิชาชีพ',
          inspector1DefaultName: cleanSettings.inspector1DefaultName && !cleanSettings.inspector1DefaultName.includes('สมพร') ? cleanSettings.inspector1DefaultName : 'นางสาวนันทิดา  พรมมา',
          inspector1DefaultPos: cleanSettings.inspector1DefaultPos && !cleanSettings.inspector1DefaultPos.includes('เภสัช') ? cleanSettings.inspector1DefaultPos : 'นักวิชาการสาธารณสุข',
          inspector2DefaultName: cleanSettings.inspector2DefaultName && !cleanSettings.inspector2DefaultName.includes('อาทิตย์') ? cleanSettings.inspector2DefaultName : 'นางสาวปนัสยา  ปะนัสสุจ่า',
          inspector2DefaultPos: cleanSettings.inspector2DefaultPos && !cleanSettings.inspector2DefaultPos.includes('ผู้อำนวยการ') ? cleanSettings.inspector2DefaultPos : 'นักวิชาการสาธารณสุข',
        };
      }
      return DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // Multi-month ledger values: stored as Record<monthKey, Record<cellKey, value>>
  const [allLedgerValues, setAllLedgerValues] = useState<Record<string, Record<string, string | number>>>(() => {
    try {
      const local = localStorage.getItem('hyg_all_ledgers');
      return local ? JSON.parse(local) : {};
    } catch {
      return {};
    }
  });

  // External Pharmacy Items
  const [externalDrugs, setExternalDrugs] = useState<ExternalDrugItem[]>(() => {
    try {
      const local = localStorage.getItem('hyg_external_drugs');
      return local ? JSON.parse(local) : INITIAL_EXTERNAL_SAMPLE;
    } catch {
      return INITIAL_EXTERNAL_SAMPLE;
    }
  });

  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [isFirestoreConnected, setIsFirestoreConnected] = useState(false);

  const monthKey = `${settings.fiscalYear}_${selectedMonth}`;
  const currentMonthLedger = allLedgerValues[monthKey] || {};

  // Check Firestore connection on boot
  useEffect(() => {
    testConnection().then((connected) => {
      setIsFirestoreConnected(connected);
    });
  }, []);

  // Save changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('hyg_drugs', JSON.stringify(drugs));
    } catch {}
  }, [drugs]);

  useEffect(() => {
    try {
      localStorage.setItem('hyg_settings', JSON.stringify(settings));
    } catch {}
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem('hyg_all_ledgers', JSON.stringify(allLedgerValues));
    } catch {}
  }, [allLedgerValues]);

  useEffect(() => {
    try {
      localStorage.setItem('hyg_external_drugs', JSON.stringify(externalDrugs));
    } catch {}
  }, [externalDrugs]);

  useEffect(() => {
    try {
      localStorage.setItem('hyg_patients', JSON.stringify(patients));
    } catch {}
  }, [patients]);

  // Firestore sync listener for Settings
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'system_settings', 'main_config'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<SystemSettings>;
          setSettings((prev) => ({ ...prev, ...data }));
        }
      },
      (error) => {
        console.warn('Firestore settings listener offline/sync notice', error);
      }
    );
    return () => unsub();
  }, []);

  // Firestore sync listener for External Drugs
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'external_drugs'),
      (snap) => {
        if (!snap.empty) {
          const items: ExternalDrugItem[] = [];
          snap.forEach((d) => items.push(d.data() as ExternalDrugItem));
          if (items.length > 0) {
            setExternalDrugs(items);
          }
        }
      },
      (error) => {
        console.warn('Firestore external_drugs listener offline/sync notice', error);
      }
    );
    return () => unsub();
  }, []);

  // Firestore sync listener for Patients PID (listening to both patient_pids and patients)
  useEffect(() => {
    // 1. Primary listener: patient_pids collection
    const unsubPatientPids = onSnapshot(
      collection(db, 'patient_pids'),
      (snap) => {
        if (!snap.empty) {
          const items: PatientPID[] = [];
          snap.forEach((d) => {
            const data = d.data() as PatientPID & { isDeleted?: boolean };
            if (!data.isDeleted) {
              items.push(data);
            }
          });
          if (items.length > 0) {
            setPatients(items);
          }
        }
      },
      (error) => {
        console.warn('Firestore patient_pids listener offline notice', error);
      }
    );

    // 2. Fallback listener: patients collection
    const unsubPatients = onSnapshot(
      collection(db, 'patients'),
      (snap) => {
        if (!snap.empty) {
          const items: PatientPID[] = [];
          snap.forEach((d) => {
            const data = d.data() as PatientPID & { isDeleted?: boolean };
            if (!data.isDeleted) {
              items.push(data);
            }
          });
          if (items.length > 0) {
            setPatients((prev) => (prev.length > 0 ? prev : items));
          }
        }
      },
      (error) => {
        console.warn('Firestore patients listener offline/sync notice', error);
      }
    );

    return () => {
      unsubPatientPids();
      unsubPatients();
    };
  }, []);

  // Patient CRUD handlers
  const handleAddPatient = (newPatient: PatientPID) => {
    setPatients((prev) => [newPatient, ...prev]);
    // Sync to patient_pids as requested and maintain backwards compatibility
    setDoc(doc(db, 'patient_pids', newPatient.id), newPatient).catch((err) => {
      console.warn('Failed background sync of patient to patient_pids', err);
    });
    setDoc(doc(db, 'patients', newPatient.id), newPatient).catch(() => {});
  };

  const handleUpdatePatient = (updated: PatientPID) => {
    setPatients((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setDoc(doc(db, 'patient_pids', updated.id), updated).catch((err) => {
      console.warn('Failed background sync of patient update to patient_pids', err);
    });
    setDoc(doc(db, 'patients', updated.id), updated).catch(() => {});
  };

  const handleDeletePatient = (id: string) => {
    setPatients((prev) => prev.filter((p) => p.id !== id));
    setDoc(doc(db, 'patient_pids', id), { isDeleted: true }, { merge: true }).catch((err) => {
      console.warn('Failed background deletion of patient in patient_pids', err);
    });
    setDoc(doc(db, 'patients', id), { isDeleted: true }, { merge: true }).catch(() => {});
  };

  const handleResetDefaultPatients = async () => {
    setPatients(DEFAULT_PATIENTS_DATA);
    try {
      for (const pat of DEFAULT_PATIENTS_DATA) {
        await setDoc(doc(db, 'patient_pids', pat.id), pat);
        await setDoc(doc(db, 'patients', pat.id), pat);
      }
    } catch (err) {
      console.warn('Failed background reset of patients to Firestore', err);
    }
  };

  // Update a single ledger cell value
  const handleUpdateLedgerValue = (key: string, val: string) => {
    setAllLedgerValues((prev) => {
      const updatedMonth = { ...(prev[monthKey] || {}), [key]: val };
      const next = { ...prev, [monthKey]: updatedMonth };

      // Async sync to Firestore
      setDoc(
        doc(db, 'internal_ledgers', monthKey),
        {
          id: monthKey,
          fiscalYear: settings.fiscalYear,
          monthIndex: selectedMonth,
          entries: JSON.stringify(updatedMonth),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      ).catch((err) => {
        console.warn('Failed background sync to Firestore', err);
      });

      return next;
    });
  };

  const handleBatchUpdateLedger = (updates: Record<string, string>) => {
    setAllLedgerValues((prev) => {
      const updatedMonth = { ...(prev[monthKey] || {}), ...updates };
      const next = { ...prev, [monthKey]: updatedMonth };
      return next;
    });
  };

  // Dispense from internal pharmacy into external pharmacy
  const handleDispenseToExternal = (data: {
    drug: Drug;
    quantity: number;
    lotNumber: string;
    expiryDate: string;
    notes?: string;
  }) => {
    const drugNo = data.drug.no;
    const now = new Date();
    const dateStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear() + 543}`;

    // 1. Record into Internal Pharmacy ledger
    // Find next empty row for this drug
    let targetRow = 0;
    for (let r = 0; r < rowsPerDrug; r++) {
      if (!currentMonthLedger[`pq.${drugNo}.${r}`]) {
        targetRow = r;
        break;
      }
    }

    const newUpdates: Record<string, string> = {
      [`pi.${drugNo}.${targetRow}`]: dateStr,
      [`pq.${drugNo}.${targetRow}`]: String(data.quantity),
      [`pl.${drugNo}.${targetRow}`]: data.lotNumber || '',
      [`px.${drugNo}.${targetRow}`]: data.expiryDate || '',
    };
    handleBatchUpdateLedger(newUpdates);

    // 2. Add or update in External Pharmacy
    const newExtItem: ExternalDrugItem = {
      id: `ext_${Date.now()}_${drugNo}`,
      drugNo: data.drug.no,
      name: data.drug.name,
      unit: data.drug.unit,
      costPrice: data.drug.costPrice,
      quantity: data.quantity,
      lotNumber: data.lotNumber || '-',
      expiryDate: data.expiryDate,
      dispensedDate: dateStr,
      expiryStatus: 'safe',
      daysUntilExpiry: 365,
      inspector1Name: settings.inspector1DefaultName,
      inspector1Position: settings.inspector1DefaultPos,
      inspector1Signature: '',
      inspector2Name: settings.inspector2DefaultName,
      inspector2Position: settings.inspector2DefaultPos,
      inspector2Signature: '',
      inspectionDate: dateStr,
      notes: data.notes || 'เบิกจากคลังยาใน',
    };

    setExternalDrugs((prev) => [newExtItem, ...prev]);

    // Save to Firestore
    setDoc(doc(db, 'external_drugs', newExtItem.id), newExtItem).catch((err) =>
      console.warn('Firestore write warning', err)
    );
  };

  // Receive drug into internal pharmacy
  const handleReceiveDrug = (data: {
    drug: Drug;
    quantity: number;
    lotNumber: string;
    expiryDate: string;
    unitPrice?: number;
    notes?: string;
  }) => {
    const drugNo = data.drug.no;
    const now = new Date();
    const dateStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear() + 543}`;

    let targetRow = 0;
    for (let r = 0; r < rowsPerDrug; r++) {
      if (!currentMonthLedger[`rq.${drugNo}.${r}`]) {
        targetRow = r;
        break;
      }
    }

    const newUpdates: Record<string, string> = {
      [`ri.${drugNo}.${targetRow}`]: dateStr,
      [`rq.${drugNo}.${targetRow}`]: String(data.quantity),
      [`rl.${drugNo}.${targetRow}`]: data.lotNumber || '',
      [`rx.${drugNo}.${targetRow}`]: data.expiryDate || '',
    };

    if (data.unitPrice) {
      newUpdates[`c.${drugNo}`] = data.unitPrice.toFixed(2);
    }

    handleBatchUpdateLedger(newUpdates);
  };

  // Update External drug
  const handleUpdateExternalDrug = (id: string, updates: Partial<ExternalDrugItem>) => {
    setExternalDrugs((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
    updateDoc(doc(db, 'external_drugs', id), updates).catch((err) =>
      console.warn('Firestore update warning', err)
    );
  };

  // Batch sign all external drugs by the 2 inspectors
  const handleBatchSignAll = (
    inspector1: { name: string; pos: string; sig: string },
    inspector2: { name: string; pos: string; sig: string }
  ) => {
    const todayStr = new Date().toLocaleDateString('th-TH');
    setExternalDrugs((prev) =>
      prev.map((item) => {
        const updated = {
          ...item,
          inspector1Name: inspector1.name,
          inspector1Position: inspector1.pos,
          inspector1Signature: inspector1.sig || item.inspector1Signature,
          inspector2Name: inspector2.name,
          inspector2Position: inspector2.pos,
          inspector2Signature: inspector2.sig || item.inspector2Signature,
          inspectionDate: todayStr,
        };

        // Push to Firestore
        setDoc(doc(db, 'external_drugs', item.id), updated).catch(() => {});
        return updated;
      })
    );
  };

  // Pull previous month balance
  const handleCarryOverPreviousMonth = () => {
    if (selectedMonth === 0) {
      alert('เดือนตุลาคม เป็นเดือนแรกของปีงบประมาณ กรุณาระบุยอดยกมาต้นปี');
      return;
    }
    const prevKey = `${settings.fiscalYear}_${selectedMonth - 1}`;
    const prevData = allLedgerValues[prevKey];
    if (!prevData) {
      alert(`ยังไม่พบข้อมูลของเดือน ${MONTH_NAMES[selectedMonth - 1]}`);
      return;
    }

    const updates: Record<string, string> = {};
    drugs.forEach((d) => {
      const open = parseFloat(String(prevData[`b.${d.no}`] || 0)) || 0;
      let rec = 0;
      let disp = 0;
      for (let k = 0; k < rowsPerDrug; k++) {
        rec += parseFloat(String(prevData[`rq.${d.no}.${k}`] || 0)) || 0;
        disp += parseFloat(String(prevData[`pq.${d.no}.${k}`] || 0)) || 0;
      }
      const endBal = open + rec - disp;
      if (endBal > 0) {
        updates[`b.${d.no}`] = String(endBal);
      }
      if (prevData[`c.${d.no}`]) {
        updates[`c.${d.no}`] = String(prevData[`c.${d.no}`]);
      }
    });

    handleBatchUpdateLedger(updates);
    alert(`ดึงยอดยกมาจากเดือน ${MONTH_NAMES[selectedMonth - 1]} เรียบร้อยแล้ว`);
  };

  // Clear current month
  const handleClearCurrentMonth = () => {
    if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการล้างข้อมูลเดือน ${MONTH_NAMES[selectedMonth]} ทั้งหมด?`)) {
      setAllLedgerValues((prev) => {
        const next = { ...prev };
        delete next[monthKey];
        return next;
      });
    }
  };

  // Calculations for all 12 months
  const monthlyTotals = useMemo(() => {
    const receipts: number[] = Array(12).fill(0);
    const dispenses: number[] = Array(12).fill(0);

    for (let m = 0; m < 12; m++) {
      const k = `${settings.fiscalYear}_${m}`;
      const mData = allLedgerValues[k] || {};

      drugs.forEach((d) => {
        const rawCost = mData[`c.${d.no}`];
        const cost = rawCost !== undefined && rawCost !== '' ? parseFloat(String(rawCost)) || d.costPrice : d.costPrice;

        let recQty = 0;
        let dispQty = 0;
        for (let r = 0; r < rowsPerDrug; r++) {
          recQty += parseFloat(String(mData[`rq.${d.no}.${r}`] || 0)) || 0;
          dispQty += parseFloat(String(mData[`pq.${d.no}.${r}`] || 0)) || 0;
        }

        receipts[m] += recQty * cost;
        dispenses[m] += dispQty * cost;
      });
    }

    return { receipts, dispenses };
  }, [drugs, allLedgerValues, settings.fiscalYear, rowsPerDrug]);

  // Current stock value in current active month
  const currentStockValue = useMemo(() => {
    let total = 0;
    drugs.forEach((d) => {
      const rawCost = currentMonthLedger[`c.${d.no}`];
      const cost = rawCost !== undefined && rawCost !== '' ? parseFloat(String(rawCost)) || d.costPrice : d.costPrice;
      const open = parseFloat(String(currentMonthLedger[`b.${d.no}`] || 0)) || 0;

      let rec = 0;
      let disp = 0;
      for (let r = 0; r < rowsPerDrug; r++) {
        rec += parseFloat(String(currentMonthLedger[`rq.${d.no}.${r}`] || 0)) || 0;
        disp += parseFloat(String(currentMonthLedger[`pq.${d.no}.${r}`] || 0)) || 0;
      }
      const endBal = open + rec - disp;
      total += endBal * cost;
    });
    return total;
  }, [drugs, currentMonthLedger, rowsPerDrug]);

  // Cumulative Requisition across months
  const cumulativeRequisition = useMemo(() => {
    return monthlyTotals.receipts.reduce((a, b) => a + b, 0);
  }, [monthlyTotals.receipts]);

  // Save Settings
  const handleSaveSettings = (newSettings: SystemSettings) => {
    setSettings(newSettings);
    setDoc(doc(db, 'system_settings', 'main_config'), newSettings).catch((err) =>
      console.warn('Firestore settings write warning', err)
    );
  };

  // Reset to default 126 catalog
  const handleResetDefaultData = () => {
    if (confirm('ต้องการรีเซ็ตรายการยากลับเป็นชุดมาตรฐาน 126 รายการของ รพ.สต.บ้านห้วยแอ่ง หรือไม่?')) {
      setDrugs(DEFAULT_DRUGS_DATA);
      setExternalDrugs(INITIAL_EXTERNAL_SAMPLE);
      setAllLedgerValues({});
      localStorage.clear();
      alert('รีเซ็ตข้อมูลระบบคลังยาเรียบร้อย');
    }
  };

  return (
    <div className="min-h-screen text-slate-100 font-sans selection:bg-pink-500 selection:text-white">
      {/* Dark Futuristic Background Effect with Neon Stars & Gradients */}
      <BackgroundEffect />

      {/* VIEW 1: 3D SAFE LOCK SCREEN (If not unlocked yet) */}
      {!isUnlocked ? (
        <SafeLockScreen onUnlockSuccess={() => setIsUnlocked(true)} />
      ) : (
        /* VIEW 2: AUTHENTICATED HOSPITAL INVENTORY MANAGEMENT SYSTEM */
        <div className="relative z-10 flex flex-col min-h-screen">
          {/* Header Navigation */}
          <Navbar
            currentTab={currentTab}
            onSelectTab={setCurrentTab}
            onLock={() => setIsUnlocked(false)}
            onOpenPrint={() => setIsPrintOpen(true)}
            isFirestoreConnected={isFirestoreConnected}
            onSyncFirestore={() => testConnection().then(setIsFirestoreConnected)}
          />

          {/* Main Body View based on tab */}
          <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 w-full">
            {currentTab === 'dashboard' && (
              <DashboardView
                drugs={drugs}
                externalDrugs={externalDrugs}
                settings={settings}
                monthlyReceiptTotals={monthlyTotals.receipts}
                monthlyDispenseTotals={monthlyTotals.dispenses}
                currentStockValue={currentStockValue}
                cumulativeRequisition={cumulativeRequisition}
                onNavigateToInternal={() => setCurrentTab('internal')}
                onNavigateToExternal={() => setCurrentTab('external')}
                onNavigateToAIPlanning={() => setCurrentTab('ai_planning')}
                onOpenPrint={() => setIsPrintOpen(true)}
              />
            )}

            {currentTab === 'internal' && (
              <InternalPharmacyView
                drugs={drugs}
                ledgerValues={currentMonthLedger}
                onUpdateLedgerValue={handleUpdateLedgerValue}
                onBatchUpdateLedger={handleBatchUpdateLedger}
                onDispenseToExternal={handleDispenseToExternal}
                onReceiveDrug={handleReceiveDrug}
                selectedMonth={selectedMonth}
                setSelectedMonth={setSelectedMonth}
                rowsPerDrug={rowsPerDrug}
                setRowsPerDrug={setRowsPerDrug}
                settings={settings}
                onOpenPrint={() => setIsPrintOpen(true)}
                onDownloadExcel={() =>
                  exportInternalPharmacyExcel(drugs, currentMonthLedger, selectedMonth, settings, rowsPerDrug)
                }
                onCarryOverPreviousMonth={handleCarryOverPreviousMonth}
                onClearCurrentMonth={handleClearCurrentMonth}
              />
            )}

            {currentTab === 'external' && (
              <ExternalPharmacyView
                externalDrugs={externalDrugs}
                settings={settings}
                onUpdateExternalDrug={handleUpdateExternalDrug}
                onBatchSignAll={handleBatchSignAll}
                onOpenPrint={() => setIsPrintOpen(true)}
                onDownloadExcel={() => exportExternalPharmacyExcel(externalDrugs, settings)}
                onNavigateToInternal={() => setCurrentTab('internal')}
              />
            )}

            {currentTab === 'ai_planning' && (
              <AIPlanningView
                drugs={drugs}
                ledgerValues={currentMonthLedger}
                patients={patients}
                onAddPatient={handleAddPatient}
                onUpdatePatient={handleUpdatePatient}
                onDeletePatient={handleDeletePatient}
                onResetDefaultPatients={handleResetDefaultPatients}
                settings={settings}
              />
            )}

            {currentTab === 'settings' && (
              <SettingsModal
                settings={settings}
                onSaveSettings={handleSaveSettings}
                onResetDefaultData={handleResetDefaultData}
              />
            )}
          </main>

          {/* Printable Report Modal */}
          <PrintReportModal
            isOpen={isPrintOpen}
            onClose={() => setIsPrintOpen(false)}
            reportType={currentTab === 'external' ? 'external' : 'internal'}
            drugs={drugs}
            externalDrugs={externalDrugs}
            ledgerValues={currentMonthLedger}
            selectedMonth={selectedMonth}
            rowsPerDrug={rowsPerDrug}
            settings={settings}
            monthlyReceiptTotals={monthlyTotals.receipts}
            monthlyDispenseTotals={monthlyTotals.dispenses}
            currentStockValue={currentStockValue}
            cumulativeRequisition={cumulativeRequisition}
          />
        </div>
      )}
    </div>
  );
}

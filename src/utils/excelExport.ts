import * as XLSX from 'xlsx';
import { Drug, ExternalDrugItem, SystemSettings } from '../types/inventory';
import { MONTH_NAMES } from '../data/defaultDrugs';

export function exportInternalPharmacyExcel(
  drugs: Drug[],
  ledgerValues: Record<string, string | number>,
  selectedMonth: number,
  settings: SystemSettings,
  rowsPerDrug: number = 2
) {
  const monthName = MONTH_NAMES[selectedMonth] || 'ประจำเดือน';
  const fileName = `คลังยาใน_${monthName}_${settings.fiscalYear}.xlsx`;

  // Build Headers
  const headers = [
    'ลำดับ',
    'ชื่อยา',
    'หน่วยนับ',
    'ราคาทุน (บาท)',
    'ยอดยกมา',
  ];

  for (let k = 1; k <= rowsPerDrug; k++) {
    headers.push(`รับ${k} วันที่`, `รับ${k} จำนวน`, `รับ${k} Lot`, `รับ${k} Exp`);
  }
  for (let k = 1; k <= rowsPerDrug; k++) {
    headers.push(`จ่าย${k} วันที่`, `จ่าย${k} จำนวน`, `จ่าย${k} Lot`, `จ่าย${k} Exp`);
  }

  headers.push('รวมจำนวนรับ', 'รวมจำนวนจ่าย', 'ยอดคงเหลือ', 'รวมมูลค่ารับ (บาท)', 'รวมมูลค่าจ่าย (บาท)', 'มูลค่าคงเหลือ (บาท)');

  const rows: (string | number)[][] = [headers];

  let totalRecVal = 0;
  let totalDispVal = 0;
  let totalBalVal = 0;

  drugs.forEach((d) => {
    const rawCost = ledgerValues[`c.${d.no}`];
    const cost = rawCost !== undefined && rawCost !== '' ? parseFloat(String(rawCost).replace(/,/g, '')) || 0 : d.costPrice;
    const open = parseFloat(String(ledgerValues[`b.${d.no}`] || 0).replace(/,/g, '')) || 0;

    let totalRec = 0;
    let totalDisp = 0;

    const rowData: (string | number)[] = [
      d.no,
      d.name,
      d.unit,
      cost,
      open || 0,
    ];

    // Receive cols
    for (let k = 0; k < rowsPerDrug; k++) {
      const ri = ledgerValues[`ri.${d.no}.${k}`] || '';
      const rq = parseFloat(String(ledgerValues[`rq.${d.no}.${k}`] || 0).replace(/,/g, '')) || 0;
      const rl = ledgerValues[`rl.${d.no}.${k}`] || '';
      const rx = ledgerValues[`rx.${d.no}.${k}`] || '';

      rowData.push(String(ri), rq || '', String(rl), String(rx));
      totalRec += rq;
    }

    // Dispense cols
    for (let k = 0; k < rowsPerDrug; k++) {
      const pi = ledgerValues[`pi.${d.no}.${k}`] || '';
      const pq = parseFloat(String(ledgerValues[`pq.${d.no}.${k}`] || 0).replace(/,/g, '')) || 0;
      const pl = ledgerValues[`pl.${d.no}.${k}`] || '';
      const px = ledgerValues[`px.${d.no}.${k}`] || '';

      rowData.push(String(pi), pq || '', String(pl), String(px));
      totalDisp += pq;
    }

    const endBal = open + totalRec - totalDisp;
    const recVal = totalRec * cost;
    const dispVal = totalDisp * cost;
    const balVal = endBal * cost;

    rowData.push(
      totalRec || 0,
      totalDisp || 0,
      endBal,
      parseFloat(recVal.toFixed(2)),
      parseFloat(dispVal.toFixed(2)),
      parseFloat(balVal.toFixed(2))
    );

    totalRecVal += recVal;
    totalDispVal += dispVal;
    totalBalVal += balVal;

    rows.push(rowData);
  });

  // Grand summary row
  const summaryRow: (string | number)[] = ['รวมทั้งหมด', '', '', '', ''];
  for (let i = 0; i < rowsPerDrug * 8; i++) {
    summaryRow.push('');
  }
  summaryRow.push('', '', '', parseFloat(totalRecVal.toFixed(2)), parseFloat(totalDispVal.toFixed(2)), parseFloat(totalBalVal.toFixed(2)));
  rows.push(summaryRow);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'บัญชีรับ-จ่ายยา');

  // Month info sheet
  const infoData: (string | number)[][] = [
    ['ระบบบริหารจัดการคลังยา', settings.hospitalName || 'รพ.สต.บ้านห้วยแอ่ง'],
    ['ปีงบประมาณ พ.ศ.', settings.fiscalYear],
    ['วงเงินงบประมาณ (บาท)', settings.budgetTotal],
    ['ประจำเดือน', monthName],
    ['ผู้บันทึกข้อมูล', `${settings.pharmacistName || 'นายศักดิ์ดา  กุลโชติ'} (${settings.recorderPosition || 'พยาบาลวิชาชีพ'})`],
    ['ผู้ตรวจสอบคนที่ 1', `${settings.inspector1DefaultName || 'นางสาวนันทิดา  พรมมา'} (${settings.inspector1DefaultPos || 'นักวิชาการสาธารณสุข'})`],
    ['ผู้ตรวจสอบคนที่ 2', `${settings.inspector2DefaultName || 'นางสาวปนัสยา  ปะนัสสุจ่า'} (${settings.inspector2DefaultPos || 'นักวิชาการสาธารณสุข'})`],
    ['วันที่ส่งออกข้อมูล', new Date().toLocaleString('th-TH')],
  ];
  const infoWs = XLSX.utils.aoa_to_sheet(infoData);
  XLSX.utils.book_append_sheet(wb, infoWs, 'ข้อมูลหน่วยงาน');

  XLSX.writeFile(wb, fileName);
}

export function exportExternalPharmacyExcel(
  externalDrugs: ExternalDrugItem[],
  settings: SystemSettings
) {
  const fileName = `คลังยานอก_ตรวจสอบวันหมดอายุ_${settings.fiscalYear}.xlsx`;
  const totalRequisitionValue = externalDrugs.reduce((sum, item) => sum + item.quantity * item.costPrice, 0);

  const headers = [
    'ลำดับ',
    'ชื่อยา (เบิกจากคลังยาใน)',
    'หน่วยนับ',
    'ราคาทุนต่อหน่วย',
    'จำนวนที่เบิก',
    'มูลค่าที่เบิก (บาท)',
    'Lot Number',
    'วันหมดอายุ',
    'ผลการตรวจวันหมดอายุ',
    'วันที่เบิกจ่าย',
    'ผู้ตรวจสอบคนที่ 1',
    'ตำแหน่ง ผู้ตรวจ 1',
    'สถานะลายเซ็น 1',
    'ผู้ตรวจสอบคนที่ 2',
    'ตำแหน่ง ผู้ตรวจ 2',
    'สถานะลายเซ็น 2',
    'วันที่ตรวจสอบ',
    'หมายเหตุ',
  ];

  const rows: (string | number)[][] = [
    ['ใบตรวจสอบคลังยานอก รพ.สต.บ้านห้วยแอ่ง (ชายสดV1)'],
    [`ปีงบประมาณ พ.ศ. ${settings.fiscalYear}`, `มูลค่าที่เบิกยาครั้งนี้: ฿${totalRequisitionValue.toFixed(2)} บาท`],
    [`ผู้บันทึกข้อมูล: ${settings.pharmacistName || 'นายศักดิ์ดา  กุลโชติ'} (${settings.recorderPosition || 'พยาบาลวิชาชีพ'})`],
    [],
    headers
  ];

  externalDrugs.forEach((item, index) => {
    let resolvedStatus = 'ไม่หมดอายุ';
    if (item.expiryStatus === 'expired') {
      resolvedStatus = 'หมดอายุ';
    } else if (item.expiryStatus === 'within_6_months' || item.expiryStatus === 'warning') {
      resolvedStatus = 'หมดอายุภายใน 6 เดือน';
    } else {
      resolvedStatus = 'ไม่หมดอายุ';
    }

    rows.push([
      index + 1,
      item.name,
      item.unit,
      item.costPrice,
      item.quantity,
      parseFloat((item.quantity * item.costPrice).toFixed(2)),
      item.lotNumber || '-',
      item.expiryDate || '-',
      resolvedStatus,
      item.dispensedDate || '-',
      item.inspector1Name || settings.inspector1DefaultName,
      item.inspector1Position || settings.inspector1DefaultPos,
      item.inspector1Signature ? 'ลงลายเซ็นดิจิทัลแล้ว' : 'ยังไม่ลงนาม',
      item.inspector2Name || settings.inspector2DefaultName,
      item.inspector2Position || settings.inspector2DefaultPos,
      item.inspector2Signature ? 'ลงลายเซ็นดิจิทัลแล้ว' : 'ยังไม่ลงนาม',
      item.inspectionDate || '-',
      item.notes || '',
    ]);
  });

  // Summary row
  rows.push([
    'รวมมูลค่าที่เบิกยาครั้งนี้',
    '',
    '',
    '',
    '',
    parseFloat(totalRequisitionValue.toFixed(2)),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'คลังยานอก_ตรวจวันหมดอายุ');
  XLSX.writeFile(wb, fileName);
}

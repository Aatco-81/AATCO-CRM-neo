// ============================================================
// AATCO CRM — Google Apps Script
// انسخ هذا الكود كاملاً في Google Apps Script
// ============================================================

const SHEET_NAME = 'فرص_المبيعات';

const HEADERS = [
  'ID', 'اسم العميل', 'رقم الهاتف', 'المنطقة', 'نوع المبنى',
  'عدد الأدوار', 'الخدمة', 'القيمة (SR)', 'المندوب',
  'الأولوية', 'إجراء المندوب', 'نتيجة الزيارة', 'ملاحظات',
  'المرحلة', 'تاريخ آخر تحديث'
];

function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) { sheet = ss.insertSheet(SHEET_NAME); setupSheet(sheet); }
    const data = JSON.parse(e.postData.contents);
    upsertRow(sheet, data);
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok' })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', msg: err.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
  const headers = rows[0];
  const data = rows.slice(1).map(row => { const obj = {}; headers.forEach((h,i) => obj[h]=row[i]); return obj; });
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function upsertRow(sheet, data) {
  const allData = sheet.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][0] == data.id) { rowIndex = i + 1; break; }
  }
  const now = new Date().toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' });
  const rowData = [
    data.id, data.client, data.phone, data.region, data.btype,
    data.floors, data.service, data.value, data.rep,
    data.priority, data.action, data.result, data.notes, data.stage, now
  ];
  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
    rowIndex = sheet.getLastRow();
  }
  applyPriorityColor(sheet, rowIndex, data.priority);
}

function applyPriorityColor(sheet, rowIndex, priority) {
  const colors = {
    'P1': { bg: '#fef2f2', text: '#991b1b' },
    'P2': { bg: '#fff7ed', text: '#9a3412' },
    'P3': { bg: '#fefce8', text: '#854d0e' },
    'P4': { bg: '#eff6ff', text: '#1e3a8a' },
  };
  const p = priority ? priority.slice(0,2) : 'P4';
  const color = colors[p] || { bg: '#ffffff', text: '#000000' };
  const range = sheet.getRange(rowIndex, 1, 1, HEADERS.length);
  range.setBackground(color.bg);
  range.setFontColor(color.text);
  const priCol = HEADERS.indexOf('الأولوية') + 1;
  if (priCol > 0) sheet.getRange(rowIndex, priCol).setFontWeight('bold');
}

function setupSheet(sheet) {
  sheet.appendRow(HEADERS);
  const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  headerRange.setBackground('#1a3f6f');
  headerRange.setFontColor('#ffffff');
  headerRange.setFontWeight('bold');
  headerRange.setFontSize(11);
  headerRange.setHorizontalAlignment('right');
  sheet.setFrozenRows(1);
  const widths = [60,160,120,100,100,80,150,100,100,150,150,100,200,120,140];
  widths.forEach((w,i) => sheet.setColumnWidth(i+1, w));
  setupSummarySheet(SpreadsheetApp.getActiveSpreadsheet());
}

function setupSummarySheet(ss) {
  let summary = ss.getSheetByName('الإحصائيات');
  if (!summary) summary = ss.insertSheet('الإحصائيات');
  summary.clearContents();
  summary.getRange('A1').setValue('إحصائيات AATCO CRM').setFontSize(14).setFontWeight('bold').setFontColor('#1a3f6f');
  const rows = [
    ['',''],
    ['إجمالي الفرص', `=COUNTA(${SHEET_NAME}!B2:B)`],
    ['القيمة الإجمالية (SR)', `=SUM(${SHEET_NAME}!H2:H)`],
    ['الفرص المكتملة', `=COUNTIF(${SHEET_NAME}!N2:N,"مكتمل ✓")`],
    ['خسرنا', `=COUNTIF(${SHEET_NAME}!N2:N,"خسرنا")`],
    ['P1 عاجل', `=COUNTIF(${SHEET_NAME}!J2:J,"P1*")`],
    ['P2', `=COUNTIF(${SHEET_NAME}!J2:J,"P2*")`],
    ['P3', `=COUNTIF(${SHEET_NAME}!J2:J,"P3*")`],
    ['P4 مستقبلي', `=COUNTIF(${SHEET_NAME}!J2:J,"P4*")`],
    ['',''],
    ['تركيب مصعد جديد', `=COUNTIF(${SHEET_NAME}!G2:G,"تركيب مصعد جديد")`],
    ['صيانة مصاعد', `=COUNTIF(${SHEET_NAME}!G2:G,"صيانة مصاعد")`],
    ['تجديد مصعد قديم', `=COUNTIF(${SHEET_NAME}!G2:G,"تجديد مصعد قديم")`],
  ];
  rows.forEach((row,i) => { summary.getRange(i+2,1).setValue(row[0]); summary.getRange(i+2,2).setValue(row[1]); });
  summary.getRange('A2:A15').setFontWeight('bold').setFontColor('#1a3f6f');
  summary.setColumnWidth(1,180); summary.setColumnWidth(2,150);
}

function runSetup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    setupSheet(sheet);
    SpreadsheetApp.getUi().alert('✅ تم إعداد الشيت بنجاح!');
  } else {
    SpreadsheetApp.getUi().alert('الشيت موجود بالفعل.');
  }
}

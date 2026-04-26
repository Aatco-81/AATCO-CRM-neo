// ═══════════════════════════════════════════════════════════
// AATCO Elevators — Apps Script v3
// يدعم: الفرص + المواعيد + سجل النشاط + الأهداف
// ═══════════════════════════════════════════════════════════

var COLS = {
  "new":"جديد","visit":"زيارة ميدانية","offer":"عرض سعر",
  "approve":"موافقة","install":"تركيب","done":"مكتمل","lost":"خسرنا"
};
var RESULTS = {"pos":"إيجابية","pend":"معلقة","neg":"سلبية"};

// ── POST: استقبال البيانات من النظام ─────────────────────────
function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    var type = data.type || "card";

    if (type === "card") {
      handleCard(ss, data);
    } else if (type === "appointment") {
      handleAppointment(ss, data);
    } else if (type === "activity") {
      handleActivity(ss, data);
    } else if (type === "target") {
      handleTarget(ss, data);
    }

    return jsonResponse({status: "ok", action: action, type: type});
  } catch(err) {
    return jsonResponse({status: "error", message: err.toString()});
  }
}

// ── GET: إرسال البيانات للنظام ───────────────────────────────
function doGet(e) {
  try {
    var action = e.parameter.action;
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === "getUsers") {
      return getUsers(ss);
    } else if (action === "getCards") {
      return getData(ss, "الفرص");
    } else if (action === "getAppointments") {
      return getData(ss, "المواعيد");
    } else if (action === "getActivity") {
      return getData(ss, "سجل_النشاط");
    } else if (action === "getTargets") {
      return getData(ss, "الأهداف");
    }

    return jsonResponse({status: "ready", message: "AATCO CRM API v3"});
  } catch(err) {
    return jsonResponse({status: "error", message: err.toString()});
  }
}

// ── الفرص ────────────────────────────────────────────────────
function handleCard(ss, data) {
  var sheet = getOrCreateSheet(ss, "الفرص", [
    "رقم الفرصة","اسم العميل","رقم الهاتف","الشخص المسؤول",
    "المسمى الوظيفي","المدينة","عنوان المبنى","نوع المبنى",
    "عدد الأدوار","نوع الخدمة","المرحلة","الأولوية",
    "إجراء المندوب","نتيجة الزيارة","الملاحظات","المندوب",
    "القيمة (SR)","تاريخ الإضافة","وقت الإضافة"
  ]);

  var c = data.card;
  var ts = c.timestamp ? new Date(c.timestamp) : new Date();

  var row = [
    c.id, c.name||"", c.phone||"",
    c.cname||"", c.ctitle||"",
    c.region||"", c.address||"",
    c.btype||"", c.floors||"",
    c.service||"",
    COLS[c.col] || c.col || "",
    c.priority ? c.priority.toUpperCase() : "",
    c.action||"",
    RESULTS[c.result] || c.result || "",
    c.notes||"", c.rep||"",
    parseFloat(c.value)||0,
    ts.toLocaleDateString("ar-SA"),
    ts.toLocaleTimeString("ar-SA", {hour:"2-digit", minute:"2-digit"})
  ];

  upsertRow(sheet, String(c.id), row, data.action);
}

// ── المواعيد ─────────────────────────────────────────────────
function handleAppointment(ss, data) {
  var sheet = getOrCreateSheet(ss, "المواعيد", [
    "رقم الموعد","العميل","رقم الفرصة","التاريخ","الوقت",
    "نوع الموعد","المندوب","الملاحظات","الحالة","تاريخ الإنشاء"
  ]);

  var a = data.appointment;
  var row = [
    String(a.id), a.clientName||"", String(a.cardId||""),
    a.date||"", a.time||"",
    a.type||"", a.rep||"",
    a.notes||"",
    a.status==="done"?"منتهي":a.status==="cancelled"?"ملغي":"قادم",
    a.createdAt ? new Date(a.createdAt).toLocaleDateString("ar-SA") : ""
  ];

  upsertRow(sheet, String(a.id), row, data.action);
}

// ── سجل النشاط ───────────────────────────────────────────────
function handleActivity(ss, data) {
  var sheet = getOrCreateSheet(ss, "سجل_النشاط", [
    "رقم السجل","رقم الفرصة","اسم العميل",
    "الإجراء","المندوب","الملاحظات","التاريخ","الوقت"
  ]);

  var a = data.activity;
  var ts = new Date(a.timestamp);
  var row = [
    String(a.id), String(a.cardId||""), a.cardName||"",
    a.action||"", a.user||"", a.notes||"",
    ts.toLocaleDateString("ar-SA"),
    ts.toLocaleTimeString("ar-SA", {hour:"2-digit", minute:"2-digit"})
  ];

  // النشاط يُضاف فقط ولا يُعدّل
  sheet.appendRow(row);
}

// ── الأهداف ──────────────────────────────────────────────────
function handleTarget(ss, data) {
  var sheet = getOrCreateSheet(ss, "الأهداف", [
    "الشهر","المندوب","هدف الصفقات","هدف الإيرادات (SR)",
    "هدف الزيارات","آخر تحديث"
  ]);

  var t = data.target;
  var key = t.monthKey + "_" + t.rep;
  var row = [
    t.monthKey||"", t.rep||"",
    t.deals||0, t.revenue||0, t.visits||0,
    new Date().toLocaleDateString("ar-SA")
  ];

  // Find by monthKey + rep (column A + B)
  var allData = sheet.getDataRange().getValues();
  for (var i = 1; i < allData.length; i++) {
    if (allData[i][0]+"|"+allData[i][1] === t.monthKey+"|"+t.rep) {
      for (var j = 0; j < row.length; j++) {
        sheet.getRange(i+1, j+1).setValue(row[j]);
      }
      return;
    }
  }
  sheet.appendRow(row);
}

// ── المستخدمون ───────────────────────────────────────────────
function getUsers(ss) {
  var sheet = ss.getSheetByName("إدارة المستخدمين");
  if (!sheet) return jsonResponse({status:"error", message:"لم يتم العثور على ورقة المستخدمين"});

  var data = sheet.getDataRange().getValues();
  var users = [];
  var startRow = -1;

  for (var i = 0; i < data.length; i++) {
    if (String(data[i][1]).includes("اسم المستخدم")) {
      startRow = i + 1; break;
    }
  }
  if (startRow === -1) return jsonResponse({status:"error", message:"لم يتم العثور على الجدول"});

  for (var r = startRow; r < data.length; r++) {
    var row = data[r];
    var name = String(row[1]).trim();
    if (!name || name === "undefined" || name === "") continue;
    users.push({
      name:     name,
      password: String(row[2]).trim(),
      role:     String(row[3]).trim() || "مندوب",
      region:   String(row[4]).trim() || "الكل",
      status:   String(row[5]).trim() || "نشط ✅"
    });
  }
  return jsonResponse({status:"ok", users:users});
}

// ── Helper: get or create sheet with headers ─────────────────
function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    // Style header row
    var hRange = sheet.getRange(1, 1, 1, headers.length);
    hRange.setBackground("#1a4a8a");
    hRange.setFontColor("#ffffff");
    hRange.setFontWeight("bold");
  }
  return sheet;
}

// ── Helper: upsert by first column ───────────────────────────
function upsertRow(sheet, key, row, action) {
  if (action === "delete") {
    var allData = sheet.getDataRange().getValues();
    for (var i = 1; i < allData.length; i++) {
      if (String(allData[i][0]) === key) {
        sheet.deleteRow(i + 1); return;
      }
    }
    return;
  }
  var allData = sheet.getDataRange().getValues();
  for (var i = 1; i < allData.length; i++) {
    if (String(allData[i][0]) === key) {
      for (var j = 0; j < row.length; j++) {
        sheet.getRange(i+1, j+1).setValue(row[j]);
      }
      return;
    }
  }
  sheet.appendRow(row);
}

// ── Helper: get sheet data as JSON ───────────────────────────
function getData(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return jsonResponse({status:"ok", data:[]});
  var values = sheet.getDataRange().getValues();
  var headers = values[0];
  var result = [];
  for (var i = 1; i < values.length; i++) {
    var obj = {};
    headers.forEach(function(h, j) { obj[h] = values[i][j]; });
    result.push(obj);
  }
  return jsonResponse({status:"ok", data:result});
}

// ── Helper: JSON response ─────────────────────────────────────
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

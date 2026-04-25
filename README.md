# دليل إعداد AATCO CRM
## الملفات المرفقة
- `index.html` — النظام الكامل (افتح في أي متصفح)
- `google-apps-script.js` — كود ربط Google Sheets
- `README.md` — هذا الدليل

---

## الخطوة 1 — إعداد Google Sheets

1. افتح [Google Sheets](https://sheets.google.com) وأنشئ شيت جديد
2. من القائمة العلوية: **Extensions → Apps Script**
3. احذف الكود الموجود والصق محتوى ملف `google-apps-script.js`
4. اضغط **Save** (Ctrl+S)
5. من القائمة اختر دالة **runSetup** ثم اضغط **Run**
6. وافق على الصلاحيات عند الطلب
7. ✅ سيتم إنشاء شيت "فرص_المبيعات" تلقائياً

---

## الخطوة 2 — نشر Apps Script كـ Web App

1. في Apps Script اضغط **Deploy → New deployment**
2. اختر النوع: **Web app**
3. الإعدادات:
   - Execute as: **Me**
   - Who has access: **Anyone**
4. اضغط **Deploy** وانسخ الرابط (Web App URL)

---

## الخطوة 3 — ربط النظام بالشيت

1. افتح ملف `index.html` بأي محرر نصوص (Notepad, VS Code)
2. ابحث عن هذا السطر:
   ```
   const WEB_APP_URL = 'YOUR_APPS_SCRIPT_WEB_APP_URL';
   ```
3. استبدل `YOUR_APPS_SCRIPT_WEB_APP_URL` برابط الـ Web App
4. احفظ الملف

---

## الخطوة 4 — النشر على Netlify (مجاني)

1. اذهب إلى [netlify.com](https://netlify.com) وسجّل حساب مجاني
2. من الصفحة الرئيسية اسحب مجلد `aatco` كاملاً وأفلته
3. انتظر 30 ثانية ✅
4. ستحصل على رابط مثل: `https://aatco-crm.netlify.app`

---

## بيانات الدخول

| المندوب | كلمة المرور |
|---------|------------|
| أحمد    | 1234       |
| محمد    | 1234       |
| خالد    | 1234       |
| سارة    | 1234       |
| مدير    | admin      |

> لتغيير كلمات المرور: افتح `index.html` وابحث عن `const USERS`

---

## الميزات

- ✅ لوحة Kanban بالسحب والإفلات
- ✅ تسجيل دخول لكل مندوب
- ✅ تصنيف P1/P2/P3/P4 بألوان
- ✅ مراحل: جديد ← زيارة ← عرض سعر ← موافقة ← تركيب ← مكتمل
- ✅ خدمات: تركيب جديد | صيانة | تجديد
- ✅ تقرير يومي للمندوبين
- ✅ إحصائيات المدير مع رسوم بيانية
- ✅ مزامنة تلقائية مع Google Sheets
- ✅ ألوان P1/P2/P3/P4 في الشيت تلقائياً
- ✅ شيت إحصائيات منفصل في Google Sheets

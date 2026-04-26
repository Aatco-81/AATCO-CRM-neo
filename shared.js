// ═══════════════════════════════════════════════════════════
// AATCO CRM — shared.js
// ملف البيانات المشترك بين جميع الصفحات
// ═══════════════════════════════════════════════════════════

const COLS = {
  new:'جديد', visit:'زيارة ميدانية', offer:'عرض سعر',
  approve:'موافقة', install:'تركيب', done:'مكتمل', lost:'خسرنا'
};

const PL = {
  p1:'P1 — 3 أيام', p2:'P2 — 10 أيام',
  p3:'P3 — 14 يوم', p4:'P4 — متابعة'
};

// أيام الإغلاق لكل أولوية
const P_DAYS = { p1:3, p2:10, p3:14, p4:30 };

const RESULTS = { pos:'إيجابية', pend:'معلقة', neg:'سلبية' };

// ── Storage ─────────────────────────────────────────────────
function getCards() {
  return JSON.parse(localStorage.getItem('aatco_cards') || '[]');
}
function saveCards(cards) {
  localStorage.setItem('aatco_cards', JSON.stringify(cards));
}
function getIdCtr() {
  return parseInt(localStorage.getItem('aatco_id') || '0');
}
function saveIdCtr(n) {
  localStorage.setItem('aatco_id', String(n));
}
function getSheetsUrl() {
  return localStorage.getItem('aatco_sheets') || '';
}
function getUsers() {
  const stored = localStorage.getItem('aatco_users');
  if (stored) return JSON.parse(stored);
  return {
    'مدير النظام': { pass:'admin', role:'مدير',   region:'الكل',         status:'نشط ✅' },
    'أحمد السعيد': { pass:'1234',  role:'مندوب',  region:'جدة',          status:'نشط ✅' },
    'محمد العمري': { pass:'1234',  role:'مندوب',  region:'الرياض',       status:'نشط ✅' },
    'خالد الزهراني':{ pass:'1234', role:'مندوب',  region:'مكة المكرمة',  status:'نشط ✅' },
    'سارة المالكي': { pass:'1234', role:'مندوب',  region:'جدة',          status:'نشط ✅' },
  };
}
function saveUsers(users) {
  localStorage.setItem('aatco_users', JSON.stringify(users));
}
function getSession() {
  const s = localStorage.getItem('aatco_session');
  return s ? JSON.parse(s) : null;
}
function setSession(user, role) {
  localStorage.setItem('aatco_session', JSON.stringify({ user, role, time: Date.now() }));
}
function clearSession() {
  localStorage.removeItem('aatco_session');
}

// ── Activity Log ─────────────────────────────────────────────
function getActivity() {
  return JSON.parse(localStorage.getItem('aatco_activity') || '[]');
}
function addActivity(cardId, cardName, action, user, notes) {
  const entry = {
    id: Date.now(), cardId, cardName, action, user,
    notes: notes || '', timestamp: new Date().toISOString()
  };
  const log = getActivity();
  log.unshift(entry);
  if (log.length > 500) log.pop();
  localStorage.setItem('aatco_activity', JSON.stringify(log));
  // sync to Sheets async (defined later in sync section)
  if (typeof syncActivity === 'function') syncActivity(entry);
}

// ── Targets ──────────────────────────────────────────────────
function getTargets() {
  return JSON.parse(localStorage.getItem('aatco_targets') || '{}');
}
function saveTargets(t) {
  localStorage.setItem('aatco_targets', JSON.stringify(t));
}

// ── Deadline helpers ─────────────────────────────────────────
function getDeadline(card) {
  if (!card.timestamp) return null;
  const days = P_DAYS[card.priority] || 30;
  const d = new Date(card.timestamp);
  d.setDate(d.getDate() + days);
  return d;
}
function getDaysLeft(card) {
  const dl = getDeadline(card);
  if (!dl) return null;
  const diff = dl - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
// Returns: 'overdue' | 'urgent' | 'warning' | 'ok' | 'p4'
function getUrgencyStatus(card) {
  if (card.col === 'done' || card.col === 'lost') return 'closed';
  if (card.priority === 'p4') return 'p4';
  const days = getDaysLeft(card);
  if (days === null) return 'ok';
  if (days < 0)  return 'overdue';
  if (days === 0) return 'urgent';
  if (days <= 1) return 'urgent';
  if (days <= 3) return 'warning';
  return 'ok';
}

// ── Urgency colors ───────────────────────────────────────────
const URGENCY_STYLES = {
  overdue: { border:'#6b7280', bg:'#f1f5f9', label:'⚫ فات الموعد',     pulse:false },
  urgent:  { border:'#dc2626', bg:'#fff0f0', label:'🔴 عاجل جداً',      pulse:true  },
  warning: { border:'#ea7c1a', bg:'#fff7ed', label:'🟠 يقترب الموعد',   pulse:false },
  ok:      { border:null,      bg:null,      label:'',                  pulse:false },
  p4:      { border:'#2563c7', bg:null,      label:'',                  pulse:false },
  closed:  { border:null,      bg:null,      label:'',                  pulse:false },
};

// ── Format timestamp ─────────────────────────────────────────
function fmtTimestamp(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('ar-SA') + ' ' + d.toLocaleTimeString('ar-SA', {hour:'2-digit', minute:'2-digit'});
}
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ar-SA');
}
function timeAgo(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return 'الآن';
  if (mins < 60)  return `منذ ${mins} دقيقة`;
  if (hours < 24) return `منذ ${hours} ساعة`;
  if (days < 7)   return `منذ ${days} يوم`;
  return fmtDate(iso);
}

// ── Google Sheets sync ───────────────────────────────────────
async function syncToSheets(card, action) {
  const url = getSheetsUrl();
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type:'card', action, card })
    });
  } catch(e) { console.log('Sheets sync card:', e); }
}

async function syncAppointment(appt, action) {
  const url = getSheetsUrl();
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type:'appointment', action, appointment: appt })
    });
  } catch(e) { console.log('Sheets sync appt:', e); }
}

async function syncActivity(entry) {
  const url = getSheetsUrl();
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type:'activity', action:'add', activity: entry })
    });
  } catch(e) { console.log('Sheets sync activity:', e); }
}

async function syncTarget(monthKey, rep, deals, revenue, visits) {
  const url = getSheetsUrl();
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type:'target', action:'upsert',
        target: { monthKey, rep, deals, revenue, visits }
      })
    });
  } catch(e) { console.log('Sheets sync target:', e); }
}

// ── Enhanced addActivity with Sheets sync ────────────────────
function addActivityAndSync(cardId, cardName, action, user, notes) {
  const entry = {
    id: Date.now(), cardId, cardName, action, user,
    notes: notes || '', timestamp: new Date().toISOString()
  };
  const log = getActivity();
  log.unshift(entry);
  if (log.length > 500) log.pop();
  localStorage.setItem('aatco_activity', JSON.stringify(log));
  syncActivity(entry); // send to Sheets
}

// ── Auth guard ───────────────────────────────────────────────
function requireAuth(allowedRoles) {
  const session = getSession();
  if (!session) {
    window.location.href = 'index.html';
    return null;
  }
  if (allowedRoles && !allowedRoles.includes(session.role)) {
    window.location.href = 'index.html';
    return null;
  }
  return session;
}

// ── Topbar builder ───────────────────────────────────────────
function buildTopbar(activePage) {
  const session = getSession();
  if (!session) return;
  const isManager = session.role === 'مدير' || session.role === 'مشرف';
  const pages = [
    { id:'kanban',   label:'لوحة المبيعات', file:'index.html' },
    { id:'schedule', label:'المواعيد',       file:'schedule.html' },
    { id:'activity', label:'سجل النشاط',    file:'activity.html' },
    { id:'targets',  label:'الأهداف',        file:'targets.html', managerOnly: false },
  ];
  const nav = pages.map(p => {
    if (p.managerOnly && !isManager) return '';
    const active = p.id === activePage ? 'active' : '';
    return `<a href="${p.file}" class="nb ${active}">${p.label}</a>`;
  }).join('');

  document.getElementById('topbar').innerHTML = `
    <div class="tb-brand">🏢 <span>AATCO Elevators</span> إدارة العملاء</div>
    <div class="tb-nav">${nav}</div>
    <div class="tb-user">
      <div class="uav">${session.user[0]}</div>
      <span>${session.user} | ${session.role}</span>
      <button class="btn-out" onclick="logout()">خروج</button>
    </div>
  `;
}
function logout() {
  clearSession();
  window.location.href = 'index.html';
}

// ── Shared CSS vars (injected once) ─────────────────────────
const SHARED_CSS = `
  :root {
    --primary:#1a4a8a;--primary-dark:#123570;--primary-light:#e8f0fb;
    --accent:#2563c7;--bg:#f0f4fa;--surface:#fff;
    --border:#dde4f0;--text:#1a2340;--text-muted:#6b7a9a;
    --p1:#dc2626;--p1-bg:#fef2f2;--p1-border:#fca5a5;
    --p2:#ea7c1a;--p2-bg:#fff7ed;--p2-border:#fdba74;
    --p3:#ca9e00;--p3-bg:#fefce8;--p3-border:#fde047;
    --p4:#2563c7;--p4-bg:#eff6ff;--p4-border:#93c5fd;
    --won:#16a34a;--won-bg:#f0fdf4;
    --radius:10px;--shadow:0 2px 12px rgba(26,74,138,0.08);
  }
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Tajawal',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;direction:rtl}
  .topbar{background:var(--primary);color:white;padding:0 20px;height:54px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:50;box-shadow:0 2px 8px rgba(0,0,0,.15)}
  .tb-brand{display:flex;align-items:center;gap:8px;font-size:17px;font-weight:700}
  .tb-brand span{font-size:12px;opacity:.7;border-right:1px solid rgba(255,255,255,.3);padding-right:10px;margin-right:4px;font-weight:400}
  .tb-nav{display:flex;gap:4px}
  .nb{padding:6px 14px;border-radius:6px;font-size:13px;font-family:'Tajawal',sans-serif;font-weight:500;cursor:pointer;border:none;color:rgba(255,255,255,.8);background:transparent;transition:all .15s;text-decoration:none;display:inline-block}
  .nb:hover,.nb.active{background:rgba(255,255,255,.15);color:white}
  .tb-user{display:flex;align-items:center;gap:8px;font-size:13px}
  .uav{width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px}
  .btn-out{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:white;padding:4px 10px;border-radius:6px;font-size:12px;cursor:pointer;font-family:'Tajawal',sans-serif}
  .page-body{padding:24px;max-width:1100px;margin:0 auto}
  .page-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}
  .page-title{font-size:20px;font-weight:700;color:var(--primary)}
  .btn-primary{background:var(--primary);color:white;border:none;padding:9px 20px;border-radius:8px;font-size:13px;font-weight:700;font-family:'Tajawal',sans-serif;cursor:pointer;transition:background .2s}
  .btn-primary:hover{background:var(--primary-dark)}
  .card-box{background:white;border-radius:var(--radius);border:1px solid var(--border);box-shadow:var(--shadow);padding:18px 20px;margin-bottom:16px}
  .toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(20px);background:var(--primary);color:white;padding:10px 24px;border-radius:8px;font-size:13px;font-weight:500;opacity:0;transition:all .3s;z-index:999;pointer-events:none}
  .toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
  @keyframes pulse-border{0%,100%{box-shadow:0 0 0 0 rgba(220,38,38,.4)}50%{box-shadow:0 0 0 6px rgba(220,38,38,0)}}
  .pulse{animation:pulse-border 1.5s infinite}
`;

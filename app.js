(function() {
  window.addEventListener("error", function(ev) {
    try {
      document.body.innerHTML = "<div style='color:#fff;background:#0a0f1a;min-height:100vh;padding:20px;font-family:monospace;direction:ltr;text-align:left;font-size:13px;white-space:pre-wrap;'>"
        + "⚠️ حصل خطأ في التطبيق:\n\n"
        + (ev.message || "unknown error") + "\n\n"
        + "الملف: " + (ev.filename || "?") + "\n"
        + "السطر: " + (ev.lineno || "?") + ":" + (ev.colno || "?") + "\n\n"
        + (ev.error && ev.error.stack ? ev.error.stack : "")
        + "</div>";
    } catch (e2) {}
  });
  window.addEventListener("unhandledrejection", function(ev) {
    try {
      document.body.innerHTML = "<div style='color:#fff;background:#0a0f1a;min-height:100vh;padding:20px;font-family:monospace;direction:ltr;text-align:left;font-size:13px;white-space:pre-wrap;'>"
        + "⚠️ حصل خطأ (Promise):\n\n"
        + (ev.reason && ev.reason.message ? ev.reason.message : String(ev.reason)) + "\n\n"
        + (ev.reason && ev.reason.stack ? ev.reason.stack : "")
        + "</div>";
    } catch (e2) {}
  });
  function waitForDeps(callback, tries) {
    tries = tries || 0;
    if (typeof React !== "undefined" && typeof ReactDOM !== "undefined") {
      callback();
    } else if (tries > 100) {
      document.body.innerHTML = "<div style='color:#ef4444;padding:20px;font-family:Cairo,sans-serif;direction:rtl'>⚠️ فشل تحميل React. تأكد من اتصالك بالإنترنت وأعد تحميل الصفحة.</div>";
    } else {
      setTimeout(function() { waitForDeps(callback, tries+1); }, 50);
    }
  }
  waitForDeps(function() {
"use strict";
const {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef
} = React;

// ══════════════════════════════════════════════════════════════
// SUPABASE CONFIG — ضع بياناتك هنا بعد إنشاء المشروع
// ══════════════════════════════════════════════════════════════
const SUPABASE_URL = "https://nkcfosifswvaoqlfliww.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rY2Zvc2lmc3d2YW9xbGZsaXd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2NjY3ODksImV4cCI6MjA5NzI0Mjc4OX0.mKg8mXOrfDayAKuGGm9GzU-F2jnONp8hb0tJ9XmsMCI";
const USER_ID = "mohy_hassan"; // اسم ثابت عشان تعرف البيانات بتاعتك

// ── Supabase client
let sb = null;
try {
  if (SUPABASE_URL !== "YOUR_SUPABASE_URL") {
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  }
} catch (e) {
  console.log("Supabase not configured");
}

// ── Cloud sync helpers
async function cloudLoad(key) {
  if (!sb) return null;
  try {
    const {
      data
    } = await sb.from("budget_data").select("value").eq("user_id", USER_ID).eq("key", key).single();
    return data ? JSON.parse(data.value) : null;
  } catch {
    return null;
  }
}
function isEmptySyncValue(value) {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
}

async function cloudSave(key, value) {
  if (!sb) return;
  try {
    // حماية: لا تسمح لقيمة فاضية [] أو {} إنها تمسح نسخة فيها بيانات على السحابة.
    if (isEmptySyncValue(value)) {
      const { data: current } = await sb.from("budget_data")
        .select("value").eq("user_id", USER_ID).eq("key", key).single();
      if (current) {
        try {
          const cloudValue = JSON.parse(current.value);
          if (!isEmptySyncValue(cloudValue)) {
            console.log("Sync guard: skipped empty cloud overwrite for", key);
            return;
          }
        } catch {}
      }
    }
    await sb.from("budget_data").upsert({
      user_id: USER_ID,
      key,
      value: JSON.stringify(value),
      updated_at: new Date().toISOString()
    }, {
      onConflict: "user_id,key"
    });
  } catch (e) {
    console.log("Cloud save failed:", e);
  }
}

// ── Local + Cloud storage
// بيحفظ في localStorage عشان البيانات متمسحش لما تقفل المتصفح
// وبيرفع نفس القيمة للسحابة (Supabase) تلقائيًا بعد نص ثانية من آخر تعديل،
// عشان أي حاجة تتسجل في التطبيق تتزامن من غير ما تحتاج تعمل حاجة يدويًا
const ld = (k, d) => {
  try {
    const v = localStorage.getItem(k);
    return v !== null ? JSON.parse(v) : d;
  } catch {
    return d;
  }
};
const _pendingPush = {};
const sv = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
  if (_pendingPush[k]) clearTimeout(_pendingPush[k]);
  _pendingPush[k] = setTimeout(() => {
    delete _pendingPush[k];
    cloudSave(k, v);
  }, 600);
};
// حفظ محلي بس من غير مزامنة سحابية — لبيانات شخصية للجهاز نفسه (زي تقدّم قراءة الأذكار)
// عشان كل جهاز/شخص يفضل له تقدّمه لوحده من غير ما يتشارك مع باقي الأجهزة المتصلة بنفس الحساب
const svLocal = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
};
// بيجيب كل المفاتيح المتزامنة على السحابة لليوزر ده، وبيحطها في الـ localStorage
// قبل ما التطبيق يفتح، عشان أي جهاز/متصفح تفتحه بيه يبقى فيه آخر نسخة من بياناتك
async function cloudPullAll() {
  if (!sb) return;
  try {
    const { data } = await sb.from("budget_data").select("key,value").eq("user_id", USER_ID);
    if (!data) return;
    data.forEach(row => {
      try {
        if (row.key.startsWith("daily_backup_")) return; // مفاتيح الباك أب مالهاش لازمة في localStorage
        if (row.key.startsWith("athkar_")) return; // تقدّم الأذكار محلي للجهاز بس، مش بيتزامن مع باقي الأجهزة
        // حماية: لا تستبدل نسخة محلية فيها بيانات بقيمة سحابية فاضية.
        const localRaw = localStorage.getItem(row.key);
        let cloudValue = null;
        try { cloudValue = JSON.parse(row.value); } catch {}
        if (isEmptySyncValue(cloudValue) && localRaw !== null) {
          try {
            const localValue = JSON.parse(localRaw);
            if (!isEmptySyncValue(localValue)) {
              console.log("Sync guard: kept local data for", row.key);
              return;
            }
          } catch {}
        }
        localStorage.setItem(row.key, row.value);
      } catch {}
    });
  } catch (e) {
    console.log("Cloud pull failed:", e);
  }
}

// ══════════════════════════════════════════════════════════════
// نظام النسخ الاحتياطي (Backup)
// ══════════════════════════════════════════════════════════════

// بيرجع dump لكل بيانات التطبيق المحفوظة في localStorage
// (باستثناء مفاتيح الباك أب نفسها والعلامات الداخلية)
function collectLocalDump() {
  const dump = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || k.startsWith("daily_backup_") || k === "__lastAutoBackupDate") continue;
    dump[k] = localStorage.getItem(k);
  }
  return dump;
}

// تصدير يدوي: تنزيل ملف JSON فيه كل بيانات التطبيق
function exportBackup() {
  try {
    const payload = { app: "budget-mohy", exportedAt: new Date().toISOString(), data: collectLocalDump() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `budget-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch (e) {
    console.log("Export backup failed:", e);
    return false;
  }
}

// استيراد من ملف: بيرجع كل المفاتيح للـ localStorage
function importBackupFile(file, onDone) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const dump = parsed && parsed.data ? parsed.data : parsed;
      if (!dump || typeof dump !== "object") throw new Error("ملف غير صالح");
      Object.keys(dump).forEach(k => { try { localStorage.setItem(k, dump[k]); } catch {} });
      onDone(true);
    } catch (e) {
      console.log("Import backup failed:", e);
      onDone(false);
    }
  };
  reader.onerror = () => onDone(false);
  reader.readAsText(file);
}

// باك أب سحابي تلقائي: مرة كل يوم (أول فتح للتطبيق في اليوم) بيرفع نسخة كاملة
// من بياناتك لـ Supabase تحت مفتاح daily_backup_YYYY-MM-DD، ومحتفظ بآخر 14 يوم بس
async function dailyAutoBackup() {
  if (!sb) return;
  try {
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem("__lastAutoBackupDate") === today) return;
    const dump = collectLocalDump();
    if (Object.keys(dump).length === 0) return;
    await sb.from("budget_data").upsert({
      user_id: USER_ID,
      key: "daily_backup_" + today,
      value: JSON.stringify(dump),
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id,key" });
    localStorage.setItem("__lastAutoBackupDate", today);
    // نظافة: امسح أي نسخ أقدم من آخر 14 يوم
    const { data: rows } = await sb.from("budget_data").select("key").eq("user_id", USER_ID).like("key", "daily_backup_%");
    if (rows && rows.length > 14) {
      const toDelete = rows.map(r => r.key).sort().slice(0, rows.length - 14);
      if (toDelete.length) await sb.from("budget_data").delete().eq("user_id", USER_ID).in("key", toDelete);
    }
  } catch (e) {
    console.log("Daily auto backup failed:", e);
  }
}

// بيرجع قايمة تواريخ آخر النسخ السحابية التلقائية المتاحة (الأحدث الأول)
async function listCloudBackups() {
  if (!sb) return [];
  try {
    const { data } = await sb.from("budget_data").select("key,updated_at").eq("user_id", USER_ID).like("key", "daily_backup_%");
    if (!data) return [];
    return data.map(r => ({ date: r.key.replace("daily_backup_", ""), updated_at: r.updated_at })).sort((a, b) => b.date.localeCompare(a.date));
  } catch (e) {
    console.log("List cloud backups failed:", e);
    return [];
  }
}

// بيرجع نسخة سحابية معينة (بتاريخها) ويحطها في localStorage
async function restoreCloudBackup(dateStr, onDone) {
  if (!sb) return onDone(false);
  try {
    const { data } = await sb.from("budget_data").select("value").eq("user_id", USER_ID).eq("key", "daily_backup_" + dateStr).single();
    if (!data) return onDone(false);
    const dump = JSON.parse(data.value);
    Object.keys(dump).forEach(k => { try { localStorage.setItem(k, dump[k]); } catch {} });
    onDone(true);
  } catch (e) {
    console.log("Restore cloud backup failed:", e);
    onDone(false);
  }
}

// ══════════════════════════════════════════════════════════════
// EXACT DATA FROM MINE1.xlsx
// ══════════════════════════════════════════════════════════════

// ── بيانات المرتب من شيت "تحقيق الأهداف ومصاريف الشهور"
const MONTHLY_PRESET = {
  "2026-01": {
    salary: 17300, salary_date: "2026-01-01",
    transport: 1000, waste: 4550, old: 1775.5, deals: 0, eid: 0, dohaa: 0, magdy: 0,
    charity: 1301.5, mom: 1500, internet: 785, car_fixed: 6000, rent: 1030.5, home_given: 5000, ajz: 0, tahwish: 0,
    expense_total_xl: 29293 // اجمالي المصاريف الصحيح من الإكسيل (شيت تحقيق الأهداف)
  },
  "2026-02": {
    salary: 22808, salary_date: "2026-02-02",
    transport: 1000, waste: 4125, old: 82, deals: 0, eid: 0, dohaa: 0, magdy: 0,
    charity: 200, mom: 1500, internet: 750, car_fixed: 7000, rent: 1061.06, home_given: 10000, ajz: 0, tahwish: 0,
    expense_total_xl: 35910.41
  },
  "2026-03": {
    salary: 21840, salary_date: "2026-03-01",
    transport: 1000, waste: 4125, old: 1730, deals: 10300, eid: 2600, dohaa: 0, magdy: 0,
    charity: 200, mom: 1500, internet: 750, car_fixed: 7000, rent: 1031.03, home_given: 15177, ajz: 0, tahwish: 0,
    expense_total_xl: 48593.63
  },
  "2026-04": {
    salary: 20440, salary_date: "2026-04-01",
    transport: 2000, waste: 4125, old: 230.5, deals: 595, eid: 5296, dohaa: 0, magdy: 0,
    charity: 200, mom: 1500, internet: 750, car_fixed: 7000, rent: 1030, home_given: 10000, ajz: 103.5, tahwish: 0,
    expense_total_xl: 32745
  },
  "2026-05": {
    salary: 25000, salary_date: "2026-05-01",
    transport: 2000, waste: 430, old: 241.5, deals: 850, eid: 4050, dohaa: 258, magdy: 0,
    charity: 200, mom: 1500, internet: 743, car_fixed: 7000, rent: 1032, home_given: 10000, ajz: 1000, tahwish: 0,
    expense_total_xl: 29216.5
  },
  "2026-06": {
    salary: 24555, salary_date: "2026-05-23",
    transport: 2000, waste: 450, old: 4233, deals: 550, eid: 0, dohaa: 1200, magdy: 7500,
    charity: 200, mom: 1500, internet: 743, car_fixed: 7000, rent: 1032, home_given: 10000, ajz: 0, tahwish: 0,
    expense_total_xl: 41070.5
  },
  "2026-07": {
    salary: 0, salary_date: "",
    transport: 2000, waste: 0, old: 0, deals: 0, eid: 0, dohaa: 0, magdy: 0,
    charity: 200, mom: 1500, internet: 743, car_fixed: 7000, rent: 1032, home_given: 10000, ajz: 0, tahwish: 0,
    expense_total_xl: undefined
  }
};
// إجماليات السنة (يناير-يونيو) زي ما هي مكتوبة بالظبط في الإكسيل (خلية T2 و U2 في شيت تحقيق الأهداف)
const YEARLY_EXPENSE_XL = 209749.04;
const YEARLY_INCOME_XL = 210458.5;

// قسط العربية (السلفة): ثابت 7,000 لحد آخر 2026، وبعد كده كل يناير بيزيد 1,000 ج تلقائي لحد ما يوصل 10,000 (سقف القسط)
function defaultCarInstallment(mk) {
  const y = +mk.split("-")[0];
  if (y <= 2026) return 7000;
  return Math.min(10000, 7000 + (y - 2026) * 1000);
}

// قسط الشقة: بيبدأ من 1,030 ج، وكل شهر نوفمبر بيزيد 7% تراكمي عن القسط الحالي (أول زيادة نوفمبر 2026)
function defaultRentInstallment(mk) {
  const [y, m] = mk.split("-").map(Number);
  const idx = y * 12 + m; // رقم الشهر المطلق
  const ref = 2026 * 12 + 11; // نوفمبر 2026 = أول زيادة
  const increments = idx < ref ? 0 : Math.floor((idx - ref) / 12) + 1;
  return Math.round(1030 * Math.pow(1.07, increments) * 100) / 100;
}

// ── بيانات إندرايف من شيت INDRIVE (كل عملية بالتاريخ الصح)
// النوع: "order" = إيراد أوردر | "petrol" = بنزين
const IND_RAW = [
// يناير
{date: "2026-01-01", type: "order", amount: 125},
{date: "2026-01-01", type: "petrol", amount: 305},
{date: "2026-01-02", type: "order", amount: 210, count: 2},
{date: "2026-01-05", type: "petrol", amount: 305},
{date: "2026-01-07", type: "order", amount: 115},
{date: "2026-01-07", type: "petrol", amount: 205},
{date: "2026-01-08", type: "order", amount: 130, count: 2},
{date: "2026-01-09", type: "petrol", amount: 205},
{date: "2026-01-10", type: "tax", amount: 100},
{date: "2026-01-11", type: "order", amount: 270, count: 2},
{date: "2026-01-12", type: "order", amount: 120},
{date: "2026-01-12", type: "petrol", amount: 405},
{date: "2026-01-12", type: "tire", amount: 10},
{date: "2026-01-13", type: "order", amount: 240, count: 2},
{date: "2026-01-14", type: "order", amount: 215, count: 2},
{date: "2026-01-14", type: "tax", amount: 103.5},
{date: "2026-01-15", type: "order", amount: 140, count: 2},
{date: "2026-01-15", type: "petrol", amount: 305},
{date: "2026-01-16", type: "order", amount: 80},
{date: "2026-01-17", type: "order", amount: 110},
{date: "2026-01-18", type: "order", amount: 100},
{date: "2026-01-18", type: "petrol", amount: 405},
{date: "2026-01-19", type: "order", amount: 228, count: 2},
{date: "2026-01-20", type: "order", amount: 110},
{date: "2026-01-20", type: "tax", amount: 100},
{date: "2026-01-21", type: "order", amount: 160, count: 2},
{date: "2026-01-21", type: "petrol", amount: 205},
{date: "2026-01-22", type: "order", amount: 120},
{date: "2026-01-23", type: "order", amount: 130, count: 2},
{date: "2026-01-24", type: "petrol", amount: 305},
{date: "2026-01-24", type: "tire", amount: 10},
{date: "2026-01-26", type: "petrol", amount: 305},
{date: "2026-01-27", type: "order", amount: 210, count: 2},
{date: "2026-01-28", type: "order", amount: 160, count: 2},
{date: "2026-01-28", type: "tax", amount: 103.5},
{date: "2026-01-29", type: "order", amount: 220, count: 2},
{date: "2026-01-29", type: "petrol", amount: 205},
{date: "2026-01-30", type: "order", amount: 130, count: 2},
{date: "2026-01-31", type: "order", amount: 255, count: 2},
{date: "2026-01-31", type: "petrol", amount: 205},
// فبراير
{date: "2026-02-01", type: "order", amount: 305, count: 2},
{date: "2026-02-02", type: "order", amount: 380, count: 3},
{date: "2026-02-02", type: "petrol", amount: 405},
{date: "2026-02-02", type: "tire", amount: 10},
{date: "2026-02-03", type: "order", amount: 371, count: 3},
{date: "2026-02-04", type: "order", amount: 455, count: 3},
{date: "2026-02-04", type: "petrol", amount: 505},
{date: "2026-02-05", type: "order", amount: 240, count: 3},
{date: "2026-02-06", type: "order", amount: 180, count: 2},
{date: "2026-02-06", type: "tax", amount: 90},
{date: "2026-02-08", type: "order", amount: 307, count: 3},
{date: "2026-02-09", type: "order", amount: 203, count: 3},
{date: "2026-02-10", type: "order", amount: 230, count: 3},
{date: "2026-02-10", type: "petrol", amount: 535},
{date: "2026-02-11", type: "order", amount: 275, count: 3},
{date: "2026-02-12", type: "order", amount: 210, count: 2},
{date: "2026-02-12", type: "tire", amount: 10},
{date: "2026-02-13", type: "order", amount: 200, count: 3},
{date: "2026-02-14", type: "order", amount: 250, count: 3},
{date: "2026-02-14", type: "petrol", amount: 505},
{date: "2026-02-15", type: "order", amount: 120},
{date: "2026-02-16", type: "order", amount: 120},
{date: "2026-02-17", type: "order", amount: 355, count: 3},
{date: "2026-02-17", type: "petrol", amount: 505},
{date: "2026-02-18", type: "order", amount: 250, count: 3},
{date: "2026-02-18", type: "tax", amount: 100},
{date: "2026-02-19", type: "order", amount: 280, count: 3},
{date: "2026-02-23", type: "order", amount: 130},
{date: "2026-02-23", type: "petrol", amount: 505},
{date: "2026-02-23", type: "tire", amount: 10},
{date: "2026-02-24", type: "order", amount: 300, count: 3},
{date: "2026-02-24", type: "tax", amount: 100},
{date: "2026-02-25", type: "order", amount: 115},
{date: "2026-02-27", type: "order", amount: 100},
{date: "2026-02-27", type: "petrol", amount: 505},
// مارس
{date: "2026-03-04", type: "order", amount: 100},
{date: "2026-03-05", type: "petrol", amount: 605},
{date: "2026-03-09", type: "petrol", amount: 355},
{date: "2026-03-17", type: "petrol", amount: 650},
{date: "2026-03-18", type: "tire", amount: 20},
{date: "2026-03-19", type: "petrol", amount: 430},
{date: "2026-03-30", type: "petrol", amount: 660},
// أبريل
{date: "2026-04-06", type: "petrol", amount: 620},
{date: "2026-04-06", type: "tire", amount: 10},
{date: "2026-04-14", type: "petrol", amount: 750},
{date: "2026-04-14", type: "tire", amount: 10},
{date: "2026-04-16", type: "petrol", amount: 200},
{date: "2026-04-23", type: "petrol", amount: 615},
{date: "2026-04-23", type: "tire", amount: 10},
{date: "2026-04-30", type: "petrol", amount: 610},
// مايو
{date: "2026-05-03", type: "petrol", amount: 235},
{date: "2026-05-11", type: "petrol", amount: 515},
{date: "2026-05-11", type: "tire", amount: 10},
{date: "2026-05-17", type: "order", amount: 150},
{date: "2026-05-18", type: "petrol", amount: 755},
{date: "2026-05-18", type: "tire", amount: 10},
{date: "2026-05-19", type: "order", amount: 120},
{date: "2026-05-20", type: "order", amount: 110},
{date: "2026-05-20", type: "tax", amount: 100},
{date: "2026-05-21", type: "order", amount: 240, count: 2},
{date: "2026-05-24", type: "petrol", amount: 455},
{date: "2026-05-30", type: "petrol", amount: 670},
// يونيو
{date: "2026-06-01", type: "order", amount: 135},
{date: "2026-06-08", type: "order", amount: 110},
{date: "2026-06-09", type: "petrol", amount: 670},
{date: "2026-06-09", type: "tire", amount: 10},
{date: "2026-06-11", type: "petrol", amount: 420},
{date: "2026-06-17", type: "order", amount: 150}];

// ── مصاريف البيت من شيت "ضحي" + "تحقيق الأهداف"
const HOME_DATA = [
  {id:"xl1",date:"2026-01-01",cat:"breakfast",name:"فينو  وعيش شامي",amount:40},
  {id:"xl2",date:"2026-01-01",cat:"meat",name:"ك بانيه",amount:190},
  {id:"xl3",date:"2026-01-01",cat:"outing",name:"سوداني ومقرمشات وشيبسي",amount:80},
  {id:"xl4",date:"2026-01-01",cat:"dairy",name:"طبق بيض",amount:138},
  {id:"xl5",date:"2026-01-01",cat:"house",name:"5 ك صابون سائل  وسلك مواعين",amount:53},
  {id:"xl6",date:"2026-01-01",cat:"basics",name:"الصدقات",amount:1301.5},
  {id:"xl7",date:"2026-01-01",cat:"breakfast",name:"فول وطعميه وبتنجان",amount:50},
  {id:"xl8",date:"2026-01-01",cat:"outing",name:"3 اندومي",amount:30},
  {id:"xl9",date:"2026-01-01",cat:"mohy",name:"قرص من الفرن للعيال وليا",amount:25},
  {id:"xl10",date:"2026-01-01",cat:"dairy",name:"ك جبنه",amount:195},
  {id:"xl11",date:"2026-01-01",cat:"house",name:"طحينه",amount:20},
  {id:"xl12",date:"2026-01-01",cat:"basics",name:"الجمعيه",amount:5005},
  {id:"xl13",date:"2026-01-01",cat:"breakfast",name:"لانشون ورومي وشيبسي",amount:100},
  {id:"xl14",date:"2026-01-01",cat:"mohy",name:"فطار",amount:17},
  {id:"xl15",date:"2026-01-01",cat:"dairy",name:"ك لبن",amount:40},
  {id:"xl16",date:"2026-01-02",cat:"dairy",name:"ك لبن",amount:40},
  {id:"xl17",date:"2026-01-02",cat:"house",name:"بطاطس وخيار وبطاطا و فلفل الوان",amount:74},
  {id:"xl18",date:"2026-01-03",cat:"breakfast",name:"فول وطعميه وبتنجان وبطاطس",amount:60},
  {id:"xl19",date:"2026-01-03",cat:"breakfast",name:"طحينه ومش ولانشون وعيش",amount:40},
  {id:"xl20",date:"2026-01-04",cat:"breakfast",name:"اندومي وشيبسي ورومي ولانشون وايس كريم  وكيكه",amount:175},
  {id:"xl21",date:"2026-01-04",cat:"meat",name:"ك بانيه",amount:195.5},
  {id:"xl22",date:"2026-01-04",cat:"dairy",name:"ك لبن",amount:40},
  {id:"xl23",date:"2026-01-05",cat:"meat",name:"ك رنجه ونص كيلو مخليه",amount:315},
  {id:"xl24",date:"2026-01-05",cat:"kids",name:"تصوير",amount:15},
  {id:"xl25",date:"2026-01-05",cat:"dairy",name:"ك لبن",amount:40},
  {id:"xl26",date:"2026-01-05",cat:"house",name:"دونتس وقرص وزلابيا",amount:68},
  {id:"xl27",date:"2026-01-05",cat:"kids",name:"كشف مستشفي",amount:65},
  {id:"xl28",date:"2026-01-05",cat:"house",name:"طحينه",amount:20},
  {id:"xl29",date:"2026-01-05",cat:"kids",name:"فايل للمستشفي",amount:20},
  {id:"xl30",date:"2026-01-05",cat:"house",name:"بصل اخضر وفلفل الوان",amount:30},
  {id:"xl31",date:"2026-01-05",cat:"kids",name:"فلوس للعيال",amount:35},
  {id:"xl32",date:"2026-01-05",cat:"house",name:"عيش",amount:20},
  {id:"xl33",date:"2026-01-05",cat:"kids",name:"مياه",amount:10},
  {id:"xl34",date:"2026-01-05",cat:"house",name:"لانشون وشيبسي وكيكه",amount:80},
  {id:"xl35",date:"2026-01-05",cat:"kids",name:"عصائر واكل",amount:90},
  {id:"xl36",date:"2026-01-05",cat:"kids",name:"الممرضه",amount:40},
  {id:"xl37",date:"2026-01-05",cat:"kids",name:"قهوه وباتيه",amount:65},
  {id:"xl38",date:"2026-01-05",cat:"kids",name:"علاج مسكن وكوادريدرم",amount:80},
  {id:"xl39",date:"2026-01-07",cat:"outing",name:"سوداني وشيبسي",amount:50},
  {id:"xl40",date:"2026-01-07",cat:"kids",name:"علاج برد وفوار راني",amount:90},
  {id:"xl41",date:"2026-01-07",cat:"dairy",name:"ك لبن",amount:40},
  {id:"xl42",date:"2026-01-07",cat:"house",name:"توابل لحمه وشيبسي وسوداني وشيبسي",amount:60},
  {id:"xl43",date:"2026-01-08",cat:"breakfast",name:"فول وطعميه وبتنجان وبطاطس",amount:70},
  {id:"xl44",date:"2026-01-08",cat:"meat",name:"2 ك وراك و 2 ك بانيه و ك كبده صافيه",amount:720},
  {id:"xl45",date:"2026-01-08",cat:"outing",name:"مقرمشات وسوداني وشيبسي",amount:90},
  {id:"xl46",date:"2026-01-08",cat:"mohy",name:"بسكويت",amount:17},
  {id:"xl47",date:"2026-01-08",cat:"dairy",name:"ك لبن",amount:40},
  {id:"xl48",date:"2026-01-08",cat:"house",name:"ك رز وتوابل فراخ  واندومي وشيبسي",amount:77},
  {id:"xl49",date:"2026-01-08",cat:"dairy",name:"طبق بيض نباتي",amount:160},
  {id:"xl50",date:"2026-01-08",cat:"house",name:"عيش",amount:20},
  {id:"xl51",date:"2026-01-08",cat:"house",name:"طحينه وفنكوش",amount:20},
  {id:"xl52",date:"2026-01-08",cat:"house",name:"لانشون ورومي وشيبسي وجبنه براميلي",amount:90},
  {id:"xl53",date:"2026-01-08",cat:"house",name:"كاكاو",amount:20},
  {id:"xl54",date:"2026-01-08",cat:"house",name:"بطاطس و بطاطا وبرتقال ويوسفي",amount:134},
  {id:"xl55",date:"2026-01-08",cat:"house",name:"مساعدين الغساله",amount:375},
  {id:"xl56",date:"2026-01-08",cat:"house",name:"رومي",amount:35},
  {id:"xl57",date:"2026-01-09",cat:"kids",name:"علاج سخونيه  وترجيع وإسهال",amount:85},
  {id:"xl58",date:"2026-01-09",cat:"mohy",name:"كيس فول",amount:7},
  {id:"xl59",date:"2026-01-10",cat:"kids",name:"حقن ترجيع للعيال",amount:25},
  {id:"xl60",date:"2026-01-11",cat:"mohy",name:"فطار",amount:40},
  {id:"xl61",date:"2026-01-13",cat:"mohy",name:"فطار",amount:50},
  {id:"xl62",date:"2026-01-13",cat:"house",name:"شيبسي",amount:14},
  {id:"xl63",date:"2026-01-13",cat:"mohy",name:"ضريبه انستا",amount:3},
  {id:"xl64",date:"2026-01-14",cat:"outing",name:"مقرمشات وسوداني وشيبسي",amount:85},
  {id:"xl65",date:"2026-01-14",cat:"mohy",name:"فطار",amount:40},
  {id:"xl66",date:"2026-01-14",cat:"mohy",name:"ضريبه انستا",amount:2},
  {id:"xl67",date:"2026-01-17",cat:"mohy",name:"فول",amount:7},
  {id:"xl68",date:"2026-01-18",cat:"kids",name:"اقلام وبلالين",amount:50},
  {id:"xl69",date:"2026-01-18",cat:"mohy",name:"ساندوتشات فول نور",amount:65},
  {id:"xl70",date:"2026-01-19",cat:"mohy",name:"فطار",amount:80},
  {id:"xl71",date:"2026-01-19",cat:"mohy",name:"بيبسي وشيبسي واندومي",amount:90},
  {id:"xl72",date:"2026-01-20",cat:"mohy",name:"فطار",amount:45},
  {id:"xl73",date:"2026-01-20",cat:"mohy",name:"نص لحمه مفرومه وتوابل حواوشي وكيس كريب",amount:135},
  {id:"xl74",date:"2026-01-20",cat:"mohy",name:"عيش",amount:20},
  {id:"xl75",date:"2026-01-21",cat:"mohy",name:"فطار ( فول وبيضه وعيش )",amount:20},
  {id:"xl76",date:"2026-01-22",cat:"mohy",name:"بسكويت وكيكه",amount:15},
  {id:"xl77",date:"2026-01-22",cat:"mohy",name:"فنكوش وطحينه",amount:40},
  {id:"xl78",date:"2026-01-22",cat:"mohy",name:"بطاطس",amount:27},
  {id:"xl79",date:"2026-01-22",cat:"mohy",name:"عيش",amount:10},
  {id:"xl80",date:"2026-01-22",cat:"mohy",name:"رومي ولانشون وبسكويت",amount:50},
  {id:"xl81",date:"2026-01-22",cat:"mohy",name:"فول وطعميه وبتنجان وسلطه",amount:50},
  {id:"xl82",date:"2026-01-23",cat:"mohy",name:"فول وبيضه وعيش",amount:17},
  {id:"xl83",date:"2026-01-23",cat:"mohy",name:"بسكويت وكيكه",amount:10},
  {id:"xl84",date:"2026-01-23",cat:"mohy",name:"ك لبن ومرقة فراخ",amount:50},
  {id:"xl85",date:"2026-01-23",cat:"mohy",name:"بتنجان وطماطم وثوم",amount:41},
  {id:"xl86",date:"2026-01-23",cat:"mohy",name:"مقرمشات وسوداني  وحلويات",amount:70},
  {id:"xl87",date:"2026-01-24",cat:"mohy",name:"عربيه ل طنطا",amount:15},
  {id:"xl88",date:"2026-01-26",cat:"mohy",name:"كيكه وبسكويت",amount:25},
  {id:"xl89",date:"2026-01-26",cat:"mohy",name:"ك لبن و 2 شيبسي",amount:60},
  {id:"xl90",date:"2026-01-27",cat:"mohy",name:"تصوير",amount:20},
  {id:"xl91",date:"2026-01-27",cat:"mohy",name:"فطار",amount:31},
  {id:"xl92",date:"2026-01-27",cat:"mohy",name:"2 علبة تونه و زبادي",amount:95},
  {id:"xl93",date:"2026-01-27",cat:"mohy",name:"لبن و ك مكرونه",amount:65},
  {id:"xl94",date:"2026-01-27",cat:"mohy",name:"صابون سائل",amount:10},
  {id:"xl95",date:"2026-01-27",cat:"mohy",name:"زيتون مخلي",amount:10},
  {id:"xl96",date:"2026-01-28",cat:"mohy",name:"فطار ساندوتشات",amount:25},
  {id:"xl97",date:"2026-01-28",cat:"mohy",name:"فراوله وموز",amount:60},
  {id:"xl98",date:"2026-01-28",cat:"mohy",name:"ك لبن وشيبسي وفلامنكو وبوزو",amount:70},
  {id:"xl99",date:"2026-01-29",cat:"mohy",name:"2 كيكه",amount:20},
  {id:"xl100",date:"2026-01-29",cat:"mohy",name:"طبقين سوسيس وطبق كبده",amount:165},
  {id:"xl101",date:"2026-01-29",cat:"mohy",name:"عيش ابيض",amount:20},
  {id:"xl102",date:"2026-01-29",cat:"mohy",name:"عيش",amount:10},
  {id:"xl103",date:"2026-01-29",cat:"mohy",name:"رومي ولانشون",amount:40},
  {id:"xl104",date:"2026-01-29",cat:"mohy",name:"فول وطعميه وبتنجان وسلطه",amount:50},
  {id:"xl105",date:"2026-01-29",cat:"mohy",name:"طحينه",amount:20},
  {id:"xl106",date:"2026-01-29",cat:"mohy",name:"بطاطس",amount:28},
  {id:"xl107",date:"2026-01-30",cat:"mohy",name:"فطار",amount:27},
  {id:"xl108",date:"2026-01-30",cat:"mohy",name:"عيش و2 سوداني وشيبسي",amount:30},
  {id:"xl109",date:"2026-01-31",cat:"mohy",name:"كارت شحن",amount:28},
  {id:"xl110",date:"2026-01-31",cat:"mohy",name:"فطار",amount:36},
  {id:"xl111",date:"2026-01-31",cat:"mohy",name:"بانيه",amount:100},
  {id:"xl112",date:"2026-01-31",cat:"mohy",name:"بطاطس وطماطم",amount:29},
  {id:"xl113",date:"2026-01-31",cat:"mohy",name:"ك مكرونه",amount:35},
  {id:"xl114",date:"2026-01-31",cat:"mohy",name:"ك لبن",amount:40},
  {id:"xl115",date:"2026-02-01",cat:"basics",name:"فلوس ضحي",amount:8000},
  {id:"xl116",date:"2026-02-01",cat:"breakfast",name:"ساندوتشات فول من نور",amount:40},
  {id:"xl117",date:"2026-02-01",cat:"house",name:"عيش",amount:20},
  {id:"xl118",date:"2026-02-01",cat:"basics",name:"الجمعيه",amount:5005},
  {id:"xl119",date:"2026-02-01",cat:"house",name:"2 شيبسي و 3 بيضات",amount:35},
  {id:"xl120",date:"2026-02-01",cat:"basics",name:"الصدقات",amount:200},
  {id:"xl121",date:"2026-02-01",cat:"house",name:"ك بطاطس",amount:24},
  {id:"xl122",date:"2026-02-01",cat:"basics",name:"صدقه",amount:10},
  {id:"xl123",date:"2026-02-01",cat:"house",name:"ك لبن وبيبسي و كيس بيكنج بودر وفانيليا و 2 فلامنكو",amount:89},
  {id:"xl125",date:"2026-02-02",cat:"breakfast",name:"ساندوتشات",amount:20},
  {id:"xl126",date:"2026-02-02",cat:"mohy",name:"باقي تحليل الجلوتين الشهر الي فات",amount:20},
  {id:"xl127",date:"2026-02-02",cat:"house",name:"2 ك لحمه مفرومه",amount:190},
  {id:"xl128",date:"2026-02-02",cat:"basics",name:"صدقه",amount:10},
  {id:"xl129",date:"2026-02-02",cat:"house",name:"عيش",amount:20},
  {id:"xl131",date:"2026-02-02",cat:"house",name:"خضار",amount:20},
  {id:"xl132",date:"2026-02-03",cat:"basics",name:"اطعام",amount:101.1},
  {id:"xl133",date:"2026-02-03",cat:"house",name:"ك طماطم ك برتقال ك فراوله ك موز",amount:100},
  {id:"xl134",date:"2026-02-03",cat:"basics",name:"صدقه",amount:10},
  {id:"xl135",date:"2026-02-03",cat:"mohy",name:"ضريبة انستا",amount:4.4},
  {id:"xl136",date:"2026-02-03",cat:"house",name:"2 فلامنكو 10 مرقه شيبسي 2 كيكه شيكولاته 2 سوداني  3جيلي كولا",amount:90},
  {id:"xl137",date:"2026-02-04",cat:"basics",name:"صدقه",amount:5},
  {id:"xl138",date:"2026-02-04",cat:"breakfast",name:"فطار من الكانتين",amount:34},
  {id:"xl139",date:"2026-02-04",cat:"house",name:"نص ك مكرونه 2 فلامنكو 4 ايس كريم  و لبان",amount:75},
  {id:"xl140",date:"2026-02-05",cat:"basics",name:"صدقه",amount:20},
  {id:"xl141",date:"2026-02-05",cat:"breakfast",name:"كيكه وبسكويت",amount:15},
  {id:"xl142",date:"2026-02-06",cat:"breakfast",name:"كيكه وبسكويت",amount:20},
  {id:"xl143",date:"2026-02-06",cat:"mohy",name:"خصم من فيزا CIB",amount:500},
  {id:"xl144",date:"2026-02-06",cat:"house",name:"2 اندومي و 2 شيبس",amount:40},
  {id:"xl145",date:"2026-02-06",cat:"mohy",name:"حلاقه",amount:100},
  {id:"xl146",date:"2026-02-07",cat:"mohy",name:"ضريبة انستا",amount:0.5},
  {id:"xl147",date:"2026-02-08",cat:"house",name:"ك لبن",amount:40},
  {id:"xl148",date:"2026-02-08",cat:"house",name:"بانيه",amount:80},
  {id:"xl149",date:"2026-02-08",cat:"house",name:"بقيت مصاريف الخروجه",amount:100},
  {id:"xl150",date:"2026-02-09",cat:"breakfast",name:"فطار",amount:34},
  {id:"xl151",date:"2026-02-09",cat:"mohy",name:"تصوير",amount:50},
  {id:"xl152",date:"2026-02-10",cat:"breakfast",name:"فطار",amount:41},
  {id:"xl153",date:"2026-02-10",cat:"mohy",name:"تحويل انستا لفيزة التأمينات",amount:2.5},
  {id:"xl154",date:"2026-02-10",cat:"mohy",name:"زينة  رمضان",amount:50},
  {id:"xl155",date:"2026-02-11",cat:"breakfast",name:"فطار",amount:39},
  {id:"xl156",date:"2026-02-12",cat:"breakfast",name:"كيكه وبسكويت",amount:20},
  {id:"xl157",date:"2026-02-13",cat:"breakfast",name:"فطار فول وطعميه ساندويتشات",amount:28},
  {id:"xl158",date:"2026-02-13",cat:"outing",name:"شيبسي وبيبسي وايس كريم ولبان",amount:185},
  {id:"xl159",date:"2026-02-13",cat:"house",name:"زبادي وعيش",amount:20},
  {id:"xl160",date:"2026-02-14",cat:"breakfast",name:"فطار  عيش و جبنه  و شيبسي",amount:45},
  {id:"xl161",date:"2026-02-14",cat:"mohy",name:"جركن زيت و جوان غطا  وفلتر زيت وطبة زيت",amount:1950},
  {id:"xl163",date:"2026-02-14",cat:"mohy",name:"فلتر شكمان",amount:650},
  {id:"xl164",date:"2026-02-15",cat:"breakfast",name:"فطار",amount:25},
  {id:"xl165",date:"2026-02-16",cat:"breakfast",name:"عيش",amount:12},
  {id:"xl166",date:"2026-02-16",cat:"house",name:"طماطم وليمون",amount:20},
  {id:"xl167",date:"2026-02-16",cat:"breakfast",name:"عيش",amount:10},
  {id:"xl168",date:"2026-02-16",cat:"breakfast",name:"فينو",amount:20},
  {id:"xl169",date:"2026-02-17",cat:"house",name:"فرع زينه وعربيه العيال",amount:220},
  {id:"xl170",date:"2026-02-17",cat:"house",name:"خل وشيبسي و كيكه وبوزو",amount:100},
  {id:"xl171",date:"2026-02-18",cat:"breakfast",name:"فطار فول وطعميه",amount:30},
  {id:"xl172",date:"2026-02-18",cat:"house",name:"كيذر",amount:20},
  {id:"xl173",date:"2026-02-18",cat:"house",name:"كلور الوان",amount:10},
  {id:"xl174",date:"2026-02-18",cat:"house",name:"2 شيبسي",amount:20},
  {id:"xl175",date:"2026-02-18",cat:"house",name:"بلالين و غزل البنات",amount:20},
  {id:"xl176",date:"2026-02-19",cat:"house",name:"ك وربع موز و ك ونص طماطم",amount:67},
  {id:"xl177",date:"2026-02-19",cat:"house",name:"عيش",amount:20},
  {id:"xl178",date:"2026-02-19",cat:"house",name:"نص قطايف ونص كنافه",amount:45},
  {id:"xl179",date:"2026-02-23",cat:"outing",name:"بيبسي ومقرمشات وك لبن وسوداني وعصير وشيبسي",amount:160},
  {id:"xl180",date:"2026-02-23",cat:"mohy",name:"تصوير",amount:10},
  {id:"xl181",date:"2026-02-23",cat:"house",name:"ك موز و ك برتقال و طماطم و بصل",amount:100},
  {id:"xl182",date:"2026-02-23",cat:"mohy",name:"فيش",amount:70},
  {id:"xl184",date:"2026-02-24",cat:"mohy",name:"نموذج 111",amount:50},
  {id:"xl185",date:"2026-02-24",cat:"mohy",name:"سايس",amount:20},
  {id:"xl186",date:"2026-02-26",cat:"mohy",name:"علبة شحم وقفزان",amount:190},
  {id:"xl187",date:"2026-02-26",cat:"house",name:"2 ك زبادي 2 كيس ملوخيه ك لبن",amount:155},
  {id:"xl189",date:"2026-02-26",cat:"house",name:"فراوله و موز",amount:50},
  {id:"xl191",date:"2026-02-26",cat:"house",name:"كلور ابيض و ليف نواعين",amount:30},
  {id:"xl192",date:"2026-02-27",cat:"outing",name:"حلويات للعيال",amount:30},
  {id:"xl193",date:"2026-02-27",cat:"house",name:"عيش",amount:20},
  {id:"xl194",date:"2026-02-28",cat:"outing",name:"سوداني ومقرمشات وبيبسي وشيبسي وكيكه",amount:140},
  {id:"xl195",date:"2026-02-28",cat:"mohy",name:"شحن باقة اورانج",amount:110},
  {id:"xl196",date:"2026-02-28",cat:"house",name:"عيش",amount:20},
  {id:"xl197",date:"2026-02-28",cat:"house",name:"خضروات (بتنجان و طماطم وخيار وبقدونس وبطاطس)",amount:120},
  {id:"xl198",date:"2026-02-28",cat:"house",name:"ك لبن وبيكنج بودر وفانيليا و ٦ بيضات",amount:80},
  {id:"xl199",date:"2026-02-28",cat:"house",name:"2 ك برتقال",amount:38},
  {id:"xl200",date:"2026-03-01",cat:"house",name:"صابون سائل",amount:20},
  {id:"xl201",date:"2026-03-02",cat:"basics",name:"جمعيه",amount:5005},
  {id:"xl202",date:"2026-03-02",cat:"house",name:"فراوله وموز وبرتقال",amount:90},
  {id:"xl204",date:"2026-03-02",cat:"house",name:"ك لبن و 2 فلامنكو ولعب العيال و ضحي",amount:95},
  {id:"xl206",date:"2026-03-02",cat:"house",name:"تصليح غساله",amount:200},
  {id:"xl208",date:"2026-03-03",cat:"kids",name:"شريط مسكن بانادول",amount:23},
  {id:"xl209",date:"2026-03-03",cat:"mohy",name:"طابع شهيد",amount:10},
  {id:"xl210",date:"2026-03-03",cat:"house",name:"طبق لحمة مفرومة من الجيش و ك لبن",amount:125},
  {id:"xl211",date:"2026-03-03",cat:"mohy",name:"كشف 111",amount:400},
  {id:"xl212",date:"2026-03-03",cat:"house",name:"بطاطس وفلفل اخضر",amount:47},
  {id:"xl213",date:"2026-03-03",cat:"house",name:"عدس بجبه",amount:20},
  {id:"xl214",date:"2026-03-04",cat:"house",name:"نص قطايف ونص كنافه",amount:45},
  {id:"xl215",date:"2026-03-04",cat:"house",name:"سوداني وك لبن و اندومي وشيبسي",amount:120},
  {id:"xl216",date:"2026-03-04",cat:"house",name:"موز",amount:35},
  {id:"xl217",date:"2026-03-05",cat:"outing",name:"حلويات للعيال عند حماتي",amount:100},
  {id:"xl218",date:"2026-03-05",cat:"kids",name:"مبرد",amount:25},
  {id:"xl219",date:"2026-03-06",cat:"house",name:"8 باكت مناديل للبيت",amount:115},
  {id:"xl220",date:"2026-03-08",cat:"kids",name:"كونجستال",amount:25},
  {id:"xl221",date:"2026-03-08",cat:"house",name:"فاكهه (فراوله وكنتالوب وبرتقال وجوافه )",amount:160},
  {id:"xl222",date:"2026-03-08",cat:"house",name:"اوكسي",amount:25},
  {id:"xl223",date:"2026-03-08",cat:"house",name:"سوداني",amount:20},
  {id:"xl225",date:"2026-03-12",cat:"mohy",name:"جنط حديد  وترصيص العجل كله",amount:1001},
  {id:"xl226",date:"2026-03-12",cat:"mohy",name:"تصليح شابوره وكهرباء",amount:200},
  {id:"xl227",date:"2026-03-12",cat:"mohy",name:"تركيب 3 قواعد",amount:800},
  {id:"xl228",date:"2026-03-16",cat:"mohy",name:"ضريبة انستا",amount:5.5},
  {id:"xl229",date:"2026-03-16",cat:"mohy",name:"لعبة الاتاري",amount:1001},
  {id:"xl230",date:"2026-03-16",cat:"house",name:"3 ك وراك مخليه و ك كبد وقوانص  و فرختين",amount:935},
  {id:"xl231",date:"2026-03-16",cat:"mohy",name:"توصيل اللعبه",amount:120},
  {id:"xl232",date:"2026-03-16",cat:"house",name:"توابل كفته و حواوشي",amount:30},
  {id:"xl233",date:"2026-03-16",cat:"house",name:"انبوبه",amount:320},
  {id:"xl234",date:"2026-03-16",cat:"house",name:"حجاير وفلامنكو",amount:85},
  {id:"xl235",date:"2026-03-16",cat:"house",name:"فينو واندومي وبيض",amount:65},
  {id:"xl236",date:"2026-03-17",cat:"kids",name:"كشف ضحي",amount:80},
  {id:"xl237",date:"2026-03-17",cat:"kids",name:"سايس",amount:20},
  {id:"xl238",date:"2026-03-17",cat:"kids",name:"علاج",amount:130},
  {id:"xl239",date:"2026-03-17",cat:"kids",name:"فينو",amount:30},
  {id:"xl240",date:"2026-03-18",cat:"kids",name:"2 طبق كبده وكيس بانيه و ك رنجه وطبق شوربة سي فود وك سمك فيليه و دبس الرمان",amount:695},
  {id:"xl241",date:"2026-03-18",cat:"kids",name:"2 ك بصل وفلفل اخضر",amount:45},
  {id:"xl242",date:"2026-03-18",cat:"kids",name:"طبق بيض وشاي كرك  وبيكنج بودر وفانيليا",amount:200},
  {id:"xl243",date:"2026-03-18",cat:"kids",name:"هدوم العيد للعيال",amount:2110},
  {id:"xl244",date:"2026-03-18",cat:"kids",name:"فلوس للبت",amount:20},
  {id:"xl245",date:"2026-03-18",cat:"kids",name:"شنطيتين  العيال",amount:200},
  {id:"xl246",date:"2026-03-18",cat:"kids",name:"سوداني وبيبسي وتسالي العيال  ولب",amount:540},
  {id:"xl247",date:"2026-03-18",cat:"kids",name:"سايس",amount:20},
  {id:"xl248",date:"2026-03-18",cat:"kids",name:"لعب وتوكل للعيال",amount:700},
  {id:"xl249",date:"2026-03-18",cat:"kids",name:"سايس",amount:10},
  {id:"xl250",date:"2026-03-19",cat:"kids",name:"سايس",amount:20},
  {id:"xl251",date:"2026-03-19",cat:"kids",name:"تاتوه ل ضحي",amount:30},
  {id:"xl252",date:"2026-03-19",cat:"kids",name:"2 اندر وبرا ل ضحي",amount:300},
  {id:"xl253",date:"2026-03-19",cat:"basics",name:"زكاة عيد الفطر",amount:500},
  {id:"xl254",date:"2026-03-19",cat:"kids",name:"لعبه للعيال",amount:130},
  {id:"xl256",date:"2026-03-20",cat:"kids",name:"مياه ولبان وبسكويت",amount:20},
  {id:"xl257",date:"2026-03-22",cat:"house",name:"عيش",amount:20},
  {id:"xl258",date:"2026-03-22",cat:"house",name:"طماطم وتوم",amount:30},
  {id:"xl259",date:"2026-03-22",cat:"house",name:"لانشون ورومي وفلفل اسود وبيبسي وشيبسي ولبان وكيكه",amount:130},
  {id:"xl260",date:"2026-03-22",cat:"house",name:"كريم شانتيه و2 ايس كريم و5 بسكويت و صابون سائل ولبان",amount:85},
  {id:"xl261",date:"2026-03-24",cat:"kids",name:"كشاكيل للعيال",amount:40},
  {id:"xl262",date:"2026-03-25",cat:"breakfast",name:"علبة جبنه وشيبسي",amount:25},
  {id:"xl263",date:"2026-03-25",cat:"breakfast",name:"عيش",amount:20},
  {id:"xl264",date:"2026-03-26",cat:"breakfast",name:"عيش وشيبسي",amount:25},
  {id:"xl265",date:"2026-03-26",cat:"breakfast",name:"عيش",amount:10},
  {id:"xl266",date:"2026-03-26",cat:"breakfast",name:"شيبسي",amount:30},
  {id:"xl267",date:"2026-03-27",cat:"house",name:"فول وطعميه وبتنجان وبابا غنوج",amount:60},
  {id:"xl268",date:"2026-03-27",cat:"house",name:"لانشون ورومي",amount:40},
  {id:"xl269",date:"2026-03-27",cat:"house",name:"عيش",amount:10},
  {id:"xl270",date:"2026-03-27",cat:"house",name:"سوداني واندومي وايس كريم ولبان",amount:90},
  {id:"xl271",date:"2026-03-30",cat:"kids",name:"مرهم مضاد حيوي",amount:48},
  {id:"xl272",date:"2026-03-30",cat:"mohy",name:"تصوير للمصنع",amount:42},
  {id:"xl273",date:"2026-03-30",cat:"house",name:"قديمه عليا لاستاذ طارق",amount:100},
  {id:"xl275",date:"2026-03-30",cat:"mohy",name:"بلح قديم من الصبا",amount:180},
  {id:"xl276",date:"2026-03-30",cat:"house",name:"2 بوزو و 2 شيبسي و كيس صابون سائل",amount:50},
  {id:"xl277",date:"2026-03-31",cat:"basics",name:"جمعيه",amount:5000},
  {id:"xl278",date:"2026-03-31",cat:"breakfast",name:"جبنه وشيبسي وعيش",amount:35},
  {id:"xl279",date:"2026-03-31",cat:"house",name:"صلصه وشيبسي وايس كريم وبسكويت وبوزو",amount:150},
  {id:"xl281",date:"2026-04-01",cat:"breakfast",name:"جبنه وشيبسي وعيش وحلاوه ولانشون",amount:55},
  {id:"xl282",date:"2026-04-01",cat:"house",name:"فينو وكيذر",amount:35},
  {id:"xl284",date:"2026-04-01",cat:"house",name:"كلور ابيض وسلك خشن وشامبو",amount:35},
  {id:"xl286",date:"2026-04-01",cat:"house",name:"شيبسي",amount:20},
  {id:"xl287",date:"2026-04-02",cat:"mohy",name:"سايس",amount:20},
  {id:"xl288",date:"2026-04-02",cat:"house",name:"فول وطعميه وبتنجان ومخلل",amount:70},
  {id:"xl289",date:"2026-04-02",cat:"house",name:"لانشون ورومي وشيبسي و 4 بيضات",amount:92},
  {id:"xl290",date:"2026-04-02",cat:"house",name:"عيش",amount:10},
  {id:"xl291",date:"2026-04-02",cat:"house",name:"كاكاو وطحينه ولبن بودره",amount:60},
  {id:"xl292",date:"2026-04-02",cat:"house",name:"عيش شامي وعلبة زبادي و 3 بوزو وشيبسي وجبنه وبسكويت وكيس طحينه",amount:88},
  {id:"xl293",date:"2026-04-03",cat:"house",name:"سوداني ولب وشيبسي واندومي ولبان وبيبسي",amount:125},
  {id:"xl294",date:"2026-04-03",cat:"house",name:"عيش",amount:10},
  {id:"xl295",date:"2026-04-03",cat:"house",name:"عيش و 2 كيس شيبسي",amount:32},
  {id:"xl296",date:"2026-04-05",cat:"breakfast",name:"جبنه وعيش ولانشون وشيبسي",amount:38},
  {id:"xl297",date:"2026-04-05",cat:"house",name:"ايس كريم و 2 اندومي  وسوداني وشيبسي",amount:90},
  {id:"xl298",date:"2026-04-06",cat:"breakfast",name:"عيش وجبنه وشيبسي",amount:39},
  {id:"xl299",date:"2026-04-09",cat:"breakfast",name:"فطار",amount:35},
  {id:"xl300",date:"2026-04-10",cat:"basics",name:"صدقه",amount:20},
  {id:"xl301",date:"2026-04-12",cat:"breakfast",name:"فطار",amount:35},
  {id:"xl302",date:"2026-04-15",cat:"breakfast",name:"فطار ( عيش وشيبسي و حلاوه )",amount:39},
  {id:"xl303",date:"2026-04-16",cat:"breakfast",name:"فطار ( عيش وشيبسي و حلاوه )",amount:37},
  {id:"xl304",date:"2026-04-19",cat:"breakfast",name:"فطار",amount:37},
  {id:"xl305",date:"2026-04-20",cat:"breakfast",name:"فطار",amount:32},
  {id:"xl306",date:"2026-04-21",cat:"breakfast",name:"فطار",amount:70},
  {id:"xl307",date:"2026-04-21",cat:"kids",name:"كشف اسنان",amount:100},
  {id:"xl308",date:"2026-04-21",cat:"kids",name:"أشعة بانوراما اسنان",amount:297},
  {id:"xl309",date:"2026-04-22",cat:"breakfast",name:"فطار",amount:60},
  {id:"xl310",date:"2026-04-22",cat:"kids",name:"علاج مسكن",amount:40},
  {id:"xl311",date:"2026-04-22",cat:"house",name:"كشري كبير حواوشي و طاجن سجق",amount:155},
  {id:"xl312",date:"2026-04-22",cat:"house",name:"ك لبن",amount:40},
  {id:"xl313",date:"2026-04-23",cat:"breakfast",name:"فطار",amount:60},
  {id:"xl314",date:"2026-04-23",cat:"house",name:"حلويات للعيال",amount:16},
  {id:"xl315",date:"2026-04-23",cat:"kids",name:"خلع ضرس",amount:700},
  {id:"xl316",date:"2026-04-23",cat:"house",name:"شيبسي و4 عصير و زبادي و ك لبن",amount:114},
  {id:"xl317",date:"2026-04-23",cat:"kids",name:"علاج ل خلع الضرس",amount:295},
  {id:"xl318",date:"2026-04-23",cat:"house",name:"كشري كبير وعيش توست وطماطم بالدقه",amount:85},
  {id:"xl319",date:"2026-04-24",cat:"house",name:"فطار ( فول و طعميه وبتنجان وبطاطس)",amount:60},
  {id:"xl320",date:"2026-04-24",cat:"house",name:"عيش",amount:20},
  {id:"xl321",date:"2026-04-24",cat:"house",name:"لانشون ورومي و زبادي وشيبسي وحلاوه",amount:90},
  {id:"xl322",date:"2026-04-24",cat:"house",name:"بقسماط",amount:40},
  {id:"xl323",date:"2026-04-25",cat:"house",name:"نص بانيه",amount:115},
  {id:"xl324",date:"2026-04-25",cat:"house",name:"بطيخه وبطاطس",amount:150},
  {id:"xl325",date:"2026-04-25",cat:"house",name:"عيش",amount:20},
  {id:"xl326",date:"2026-04-25",cat:"house",name:"صلصه ورز",amount:125},
  {id:"xl327",date:"2026-04-25",cat:"house",name:"سوداني وك لبن واندومي وبوزو وشيبسي",amount:140},
  {id:"xl328",date:"2026-04-25",cat:"house",name:"زبادي وشيبسي وطوفي",amount:25},
  {id:"xl329",date:"2026-04-26",cat:"house",name:"ك بانيه",amount:215},
  {id:"xl330",date:"2026-04-26",cat:"house",name:"عصير وبسكويت",amount:35},
  {id:"xl331",date:"2026-04-26",cat:"house",name:"اجره ل حماتي",amount:39},
  {id:"xl332",date:"2026-04-26",cat:"house",name:"ايس كريم وبيبسي",amount:75},
  {id:"xl333",date:"2026-04-27",cat:"outing",name:"عصير جهينه لتر",amount:35},
  {id:"xl334",date:"2026-04-27",cat:"house",name:"وجبتين  من روستو",amount:400},
  {id:"xl336",date:"2026-04-27",cat:"house",name:"كشري و طماطم وعيش",amount:85},
  {id:"xl338",date:"2026-04-27",cat:"house",name:"صابون سايل",amount:30},
  {id:"xl340",date:"2026-04-28",cat:"house",name:"خوخ وفراوله وجوافه",amount:110},
  {id:"xl342",date:"2026-04-28",cat:"house",name:"شاورما سوري وكسري وعيش وطماطم",amount:160},
  {id:"xl343",date:"2026-04-28",cat:"house",name:"شيبسي وكيكه وك لبن وعصير",amount:150},
  {id:"xl344",date:"2026-04-28",cat:"house",name:"4 نسكافيه و 2 شيبسي",amount:44},
  {id:"xl345",date:"2026-04-29",cat:"breakfast",name:"فطار ( جبنه وعيش وشيبسي)",amount:47},
  {id:"xl346",date:"2026-04-29",cat:"kids",name:"فوط صحية",amount:85},
  {id:"xl347",date:"2026-04-29",cat:"house",name:"ك موز و 2 بطاطس وشوية ليمون",amount:80},
  {id:"xl348",date:"2026-04-29",cat:"house",name:"فول",amount:20},
  {id:"xl349",date:"2026-04-30",cat:"mohy",name:"تصليح مياه",amount:100},
  {id:"xl350",date:"2026-04-30",cat:"house",name:"نسكافيه وشيبسي وبسكويت",amount:55},
  {id:"xl351",date:"2026-04-30",cat:"house",name:"طله لقفل المياه",amount:10},
  {id:"xl352",date:"2026-04-30",cat:"house",name:"بيبسي وبسكويت",amount:55},
  {id:"xl353",date:"2026-04-30",cat:"house",name:"فطيريتين",amount:40},
  {id:"xl354",date:"2026-04-30",cat:"house",name:"سوداني وايس كريم وبيبسي وشيبسي",amount:170},
  {id:"xl355",date:"2026-04-30",cat:"house",name:"عسل اسود ومرقه وجبنه",amount:65},
  {id:"xl356",date:"2026-04-30",cat:"house",name:"رومي ولانشون وجبنه",amount:50},
  {id:"xl357",date:"2026-05-03",cat:"mohy",name:"ضبط زوايا",amount:250},
  {id:"xl358",date:"2026-05-03",cat:"house",name:"عيش",amount:20},
  {id:"xl359",date:"2026-05-03",cat:"house",name:"2 شيبسي و 5 نسكافيه و عصير",amount:57},
  {id:"xl360",date:"2026-05-04",cat:"house",name:"5 نسكافيه و 2 سوداني",amount:45},
  {id:"xl361",date:"2026-05-05",cat:"outing",name:"سوداني و 2 بوزو و 2 شيبسي و 2 اندومي و 6 نسكافيه و 5 بسكويت",amount:182},
  {id:"xl362",date:"2026-05-05",cat:"mohy",name:"شريط لحام ومتر سلك  و قنطرة حنفيه",amount:90},
  {id:"xl363",date:"2026-05-05",cat:"house",name:"فينو وكيذر وفطير",amount:50},
  {id:"xl364",date:"2026-05-06",cat:"mohy",name:"دفع اشتراك iptv",amount:500.5},
  {id:"xl365",date:"2026-05-07",cat:"breakfast",name:"كيسين عيش لبناني  و لانشون وعلبة قشطه و شيبسي وبوزو",amount:79},
  {id:"xl366",date:"2026-05-07",cat:"house",name:"ك بطاطس",amount:21},
  {id:"xl367",date:"2026-05-07",cat:"house",name:"علبة حمام كريم",amount:95},
  {id:"xl368",date:"2026-05-08",cat:"outing",name:"بلونتين",amount:20},
  {id:"xl369",date:"2026-05-08",cat:"house",name:"عيش",amount:20},
  {id:"xl370",date:"2026-05-08",cat:"house",name:"شيبسي وبوزو وعصير ونسكافيه وكيكه",amount:110},
  {id:"xl371",date:"2026-05-09",cat:"breakfast",name:"بيبسي 2 لتر و سوداني  ومقرمشات و 6 نسكافيه 2 كيكه وشيبسي وبوزو",amount:220},
  {id:"xl372",date:"2026-05-09",cat:"house",name:"عيش",amount:19},
  {id:"xl373",date:"2026-05-09",cat:"house",name:"عسل وطحينه",amount:40},
  {id:"xl374",date:"2026-05-09",cat:"house",name:"بطاطس",amount:39},
  {id:"xl375",date:"2026-05-09",cat:"house",name:"عصير و لانشون وشيكولاته",amount:65},
  {id:"xl376",date:"2026-05-10",cat:"house",name:"نسكافيه و و بوزو وشيبسي وبسكويت",amount:95},
  {id:"xl377",date:"2026-05-11",cat:"house",name:"ساندوتشين كبده وساندوتش جمبري",amount:140},
  {id:"xl378",date:"2026-05-12",cat:"breakfast",name:"طعميه وبتنجان وبابا غنوج",amount:40},
  {id:"xl379",date:"2026-05-12",cat:"house",name:"فينو وفطيره وطحينه",amount:45},
  {id:"xl380",date:"2026-05-12",cat:"breakfast",name:"عيش",amount:50},
  {id:"xl381",date:"2026-05-12",cat:"house",name:"لانشون ورومي ومخلل واندومي وشيبسي",amount:125},
  {id:"xl382",date:"2026-05-12",cat:"house",name:"ايس كريم وحلاوه وبيبسي",amount:80},
  {id:"xl383",date:"2026-05-13",cat:"mohy",name:"شراب",amount:40},
  {id:"xl384",date:"2026-05-13",cat:"house",name:"بسكويت",amount:20},
  {id:"xl385",date:"2026-05-13",cat:"house",name:"نسكافيه وبوزو وشيبسي",amount:82},
  {id:"xl386",date:"2026-05-14",cat:"house",name:"ايس كريم و نسكافيه و اندومي",amount:74},
  {id:"xl387",date:"2026-05-14",cat:"house",name:"بطاطس",amount:34},
  {id:"xl388",date:"2026-05-15",cat:"breakfast",name:"فطيريتين",amount:40},
  {id:"xl389",date:"2026-05-15",cat:"outing",name:"2 بيبسي  ومقرمشات  و مصاصات و بسكويت وايس كريم",amount:185},
  {id:"xl390",date:"2026-05-15",cat:"house",name:"طحينه وعسل اسود ومش ومصاصه",amount:70},
  {id:"xl391",date:"2026-05-17",cat:"house",name:"نسكافيه وخل",amount:39},
  {id:"xl392",date:"2026-05-17",cat:"house",name:"ك خوخ",amount:55},
  {id:"xl393",date:"2026-05-17",cat:"house",name:"صابون سائل",amount:15},
  {id:"xl394",date:"2026-05-18",cat:"house",name:"عيش",amount:20},
  {id:"xl395",date:"2026-05-18",cat:"house",name:"عصير ونسكافيه واندومي",amount:83},
  {id:"xl396",date:"2026-05-19",cat:"house",name:"6 نسكافيه",amount:35},
  {id:"xl397",date:"2026-05-19",cat:"house",name:"عصير و بسكويت",amount:55},
  {id:"xl398",date:"2026-05-20",cat:"house",name:"عصير وبسكويت  ومصاصه ولبان",amount:70},
  {id:"xl399",date:"2026-05-20",cat:"house",name:"بطاطس",amount:33},
  {id:"xl400",date:"2026-05-20",cat:"mohy",name:"قهوة ل علي",amount:970.5},
  {id:"xl401",date:"2026-05-20",cat:"house",name:"ملح وبسكويت",amount:25},
  {id:"xl402",date:"2026-05-21",cat:"breakfast",name:"فطار",amount:35},
  {id:"xl403",date:"2026-05-21",cat:"house",name:"زبادي  وعيش وطحينه ومرقة",amount:65},
  {id:"xl404",date:"2026-05-21",cat:"house",name:"بطاطس",amount:40},
  {id:"xl405",date:"2026-05-22",cat:"outing",name:"بيبسي وايس كريم وشيبسي وبوزو وسوداني ومقرمشات ولبان",amount:130},
  {id:"xl406",date:"2026-05-22",cat:"house",name:"عيش سن",amount:30},
  {id:"xl407",date:"2026-05-22",cat:"house",name:"طعميه",amount:31},
  {id:"xl408",date:"2026-05-22",cat:"house",name:"لانشون ورومي",amount:50},
  {id:"xl409",date:"2026-05-22",cat:"house",name:"صابون سائل",amount:10},
  {id:"xl411",date:"2026-05-23",cat:"outing",name:"بيبسي  و بوزو وشيبسي و سوداني",amount:85},
  {id:"xl412",date:"2026-05-23",cat:"house",name:"2 بالونه",amount:20},
  {id:"xl413",date:"2026-05-23",cat:"house",name:"بيتزا وكريب نوتيلا  وشاورما سوري",amount:290},
  {id:"xl415",date:"2026-05-23",cat:"house",name:"كشري كبير و طماطم",amount:75},
  {id:"xl417",date:"2026-05-24",cat:"breakfast",name:"فطار ليا",amount:50},
  {id:"xl418",date:"2026-05-24",cat:"mohy",name:"انستا",amount:2.5},
  {id:"xl419",date:"2026-05-24",cat:"house",name:"وجبه ليا ووجبه للبيت من روستو",amount:520},
  {id:"xl421",date:"2026-05-24",cat:"house",name:"قهوة فرنساوي وعسل من رجب العطار",amount:75},
  {id:"xl423",date:"2026-05-24",cat:"house",name:"2 فوار",amount:15},
  {id:"xl425",date:"2026-05-25",cat:"breakfast",name:"فطار نور",amount:30},
  {id:"xl426",date:"2026-05-25",cat:"house",name:"مشتريات علوش",amount:1745},
  {id:"xl428",date:"2026-05-25",cat:"house",name:"الراجل في علوش",amount:15},
  {id:"xl429",date:"2026-05-25",cat:"house",name:"مشتريات مومينتو",amount:685},
  {id:"xl430",date:"2026-05-25",cat:"house",name:"سايس",amount:30},
  {id:"xl431",date:"2026-06-01",cat:"house",name:"3 بطيخة",amount:100},
  {id:"xl432",date:"2026-06-01",cat:"house",name:"قلم سبوره وحجاره للميزان",amount:35},
  {id:"xl433",date:"2026-06-01",cat:"house",name:"رش للدبان",amount:55},
  {id:"xl434",date:"2026-06-01",cat:"house",name:"ايس كريم",amount:30},
  {id:"xl435",date:"2026-06-02",cat:"house",name:"كيذر و عيش سن",amount:30},
  {id:"xl436",date:"2026-06-02",cat:"house",name:"عيش وايس كريم",amount:32},
  {id:"xl437",date:"2026-06-03",cat:"house",name:"ايس كريم و4 شيبسي و 8 بسكويت",amount:115},
  {id:"xl438",date:"2026-06-03",cat:"house",name:"امير",amount:10},
  {id:"xl439",date:"2026-06-04",cat:"kids",name:"دفتر كبير وصلصال",amount:175},
  {id:"xl441",date:"2026-06-04",cat:"house",name:"كيذر وعيش شامي وعيش سن",amount:40},
  {id:"xl443",date:"2026-06-04",cat:"house",name:"2 كيكه وبسكويت",amount:25},
  {id:"xl444",date:"2026-06-05",cat:"house",name:"شيكولاته دريم",amount:60},
  {id:"xl445",date:"2026-06-05",cat:"house",name:"بطاطس",amount:60},
  {id:"xl446",date:"2026-06-05",cat:"house",name:"سوداني وشيبسي وبوزو  وبسكويت ساده و",amount:125},
  {id:"xl447",date:"2026-06-05",cat:"house",name:"2 كريم كراميل و 3 ايس كريم",amount:55},
  {id:"xl448",date:"2026-06-07",cat:"breakfast",name:"عيش",amount:50},
  {id:"xl449",date:"2026-06-07",cat:"breakfast",name:"طعميه وبتنجان وسلطه",amount:40},
  {id:"xl450",date:"2026-06-08",cat:"house",name:"ايس كريم وعيش وشيبسي وبوزو",amount:85},
  {id:"xl451",date:"2026-06-09",cat:"breakfast",name:"زبادي",amount:8},
  {id:"xl452",date:"2026-06-09",cat:"house",name:"بتنجان وسلطه وعيش",amount:40},
  {id:"xl453",date:"2026-06-09",cat:"house",name:"بطاطس",amount:40},
  {id:"xl454",date:"2026-06-09",cat:"house",name:"شيبسي وبوزو وبسكويت",amount:60},
  {id:"xl455",date:"2026-06-10",cat:"house",name:"شيبسي وبوزو وبسكويت",amount:70},
  {id:"xl456",date:"2026-06-10",cat:"house",name:"حمام كريم  و شامبو",amount:100},
  {id:"xl457",date:"2026-06-11",cat:"mohy",name:"قسط مجدي",amount:20},
  {id:"xl458",date:"2026-06-11",cat:"house",name:"ايس كريم  وبوزو وشيبسي وبسكويت وسوداني",amount:120},
  {id:"xl459",date:"2026-06-11",cat:"mohy",name:"3 تيشرتات ليا وطقم بيت واندرين وتشيرتين ل صحي و 3 تيشرتات للعيال",amount:1050},
  {id:"xl460",date:"2026-06-11",cat:"house",name:"صابون سائل",amount:30},
  {id:"xl461",date:"2026-06-12",cat:"breakfast",name:"فول و طعميه وبتنجان",amount:50},
  {id:"xl462",date:"2026-06-12",cat:"house",name:"سلك ومسحوق غسيل",amount:35},
  {id:"xl463",date:"2026-06-12",cat:"breakfast",name:"عيش",amount:20},
  {id:"xl464",date:"2026-06-12",cat:"house",name:"عسل اسود ومش",amount:30},
  {id:"xl465",date:"2026-06-12",cat:"house",name:"بطاطس",amount:47},
  {id:"xl466",date:"2026-06-12",cat:"house",name:"شيبسي وايس كريم ولانشون ورومي",amount:95},
  {id:"xl467",date:"2026-06-13",cat:"breakfast",name:"كيسين فول",amount:20},
  {id:"xl468",date:"2026-06-13",cat:"outing",name:"سوداني وبيبسي رمان وايس كريم وبوزو وشيبسي",amount:110},
  {id:"xl469",date:"2026-06-13",cat:"house",name:"لانشون وزيتون مخلل وبسكويت",amount:33},
  {id:"xl470",date:"2026-06-13",cat:"breakfast",name:"عيش",amount:20},
  {id:"xl471",date:"2026-06-13",cat:"outing",name:"حلويات",amount:60},
  {id:"xl472",date:"2026-06-13",cat:"house",name:"باذنجان",amount:32},
  {id:"xl473",date:"2026-06-13",cat:"house",name:"طحينه و 4 بيضات",amount:36},
  {id:"xl474",date:"2026-06-14",cat:"house",name:"ايس كريم وشيبسي وبسكويت",amount:125},
  {id:"xl475",date:"2026-06-14",cat:"house",name:"ليمون",amount:10},
  {id:"xl476",date:"2026-06-15",cat:"house",name:"بطاطس",amount:50},
  {id:"xl477",date:"2026-06-16",cat:"breakfast",name:"عيش",amount:20},
  {id:"xl478",date:"2026-06-17",cat:"outing",name:"بيبسي وسوداني ومقرمشات وعصير بست وايس كريم وبسكويت وكيكه  وشيبسي وبوزو",amount:210},
  {id:"xl479",date:"2026-06-17",cat:"house",name:"عيش سن وكيذر",amount:40},
  {id:"xl480",date:"2026-06-17",cat:"house",name:"شيبسي وبوزو و لا نشون ورومي",amount:85},
  {id:"xl481",date:"2026-06-18",cat:"breakfast",name:"فول و طعميه وبتنجان وسلطه",amount:60},
  {id:"xl482",date:"2026-06-18",cat:"house",name:"3 بيضات و عسل وطحينه ومش وكريم شانتيه وبسكويت ومولتو وصابونه وش",amount:135},
  {id:"xl483",date:"2026-06-18",cat:"breakfast",name:"عيش",amount:20},
  {id:"xl484",date:"2026-06-19",cat:"breakfast",name:"عيش",amount:20},
  {id:"xl485",date:"2026-06-19",cat:"outing",name:"ايس كريم و بيبسي وشيبسي وسوداني وبسكويت",amount:178},
  {id:"xl486",date:"2026-06-20",cat:"house",name:"رومي ولانشون وبوزو وشيبسي وزبادي وبيض",amount:125},
  {id:"xl487",date:"2026-06-20",cat:"house",name:"بطاطس",amount:35},
  {id:"xl488",date:"2026-06-21",cat:"breakfast",name:"2 بيضه",amount:10},
  {id:"xl489",date:"2026-06-21",cat:"kids",name:"قلم رصاص و  سنون",amount:30},
  {id:"xl490",date:"2026-06-21",cat:"house",name:"2 كشري كبير وعيش توست وعلبة طماطم متبله",amount:150},
  {id:"xl491",date:"2026-06-21",cat:"house",name:"شيبسي ونص شعريه وبسكويت",amount:60},
  {id:"xl492",date:"2026-06-22",cat:"breakfast",name:"بيضه",amount:10},
  {id:"xl493",date:"2026-06-22",cat:"mohy",name:"هدوم لينا والعيال",amount:895},
  {id:"xl494",date:"2026-06-22",cat:"house",name:"فاكهه ( مانجا ومشمش وموز وكتتالوب وتفاح )",amount:250},
  {id:"xl495",date:"2026-06-22",cat:"mohy",name:"اوردر تخسيسس سيزار بلس",amount:1520},
  {id:"xl496",date:"2026-06-22",cat:"house",name:"بطاطس",amount:44},
  {id:"xl498",date:"2026-06-23",cat:"kids",name:"وصلة شاحن",amount:100},
  {id:"xl499",date:"2026-06-23",cat:"mohy",name:"حلاقه",amount:100},
  {id:"xl500",date:"2026-06-23",cat:"house",name:"غدا حواوشي معفن وبيتزا وفطير بالسكر",amount:115},
];

// ── بيانات شيت "ضحي" (دخل ومصاريف ضحي المنفصلة)
const DUHA_DATA = [
  {id:"dh1",date:"2026-02-01",cat:"basics",name:"جمعيه",amount:2000},
  {id:"dh2",date:"2026-02-05",cat:"breakfast",name:"عيش",amount:10},
  {id:"dh3",date:"2026-02-05",cat:"meat",name:"2كيلو وراك مخلين",amount:200},
  {id:"dh4",date:"2026-02-05",cat:"dairy",name:"طبق بيض",amount:130},
  {id:"dh5",date:"2026-02-05",cat:"pantry",name:"ك رز",amount:27},
  {id:"dh6",date:"2026-02-05",cat:"house",name:"ديتول وداوني وشنط زباله ومعطر",amount:95},
  {id:"dh7",date:"2026-02-05",cat:"breakfast",name:"رومي ولانشون",amount:40},
  {id:"dh8",date:"2026-02-05",cat:"dairy",name:"ك لبن",amount:38},
  {id:"dh9",date:"2026-02-05",cat:"pantry",name:"طحينه",amount:20},
  {id:"dh10",date:"2026-02-05",cat:"breakfast",name:"فول وطعميه وبتنجان",amount:60},
  {id:"dh11",date:"2026-02-07",cat:"basics",name:"علاج",amount:300},
  {id:"dh12",date:"2026-02-07",cat:"breakfast",name:"شيبسي",amount:30},
  {id:"dh13",date:"2026-02-07",cat:"dairy",name:"ك لبن",amount:40},
  {id:"dh14",date:"2026-02-07",cat:"house",name:"تصليح خلاط",amount:175},
  {id:"dh15",date:"2026-02-07",cat:"breakfast",name:"رومي ولانشون",amount:40},
  {id:"dh16",date:"2026-02-07",cat:"breakfast",name:"عيش ابيض وعيش اسمر وعلبة جبنه ولبان",amount:50},
  {id:"dh17",date:"2026-02-08",cat:"breakfast",name:"2 كيكه",amount:10},
  {id:"dh18",date:"2026-02-08",cat:"outing",name:"ملاهي العيال و قصب وتسالي",amount:300},
  {id:"dh19",date:"2026-02-09",cat:"meat",name:"نص ك بانيه",amount:95},
  {id:"dh20",date:"2026-02-09",cat:"dairy",name:"زبادي",amount:10},
  {id:"dh21",date:"2026-02-09",cat:"pantry",name:"مرقة فراخ سايبه",amount:10},
  {id:"dh22",date:"2026-02-09",cat:"house",name:"4 نسكافيه و 2 كيكه",amount:30},
  {id:"dh23",date:"2026-02-10",cat:"meat",name:"3ك وراك مخليه +فرختين",amount:635},
  {id:"dh24",date:"2026-02-10",cat:"dairy",name:"2 سمبوسه و 4 جلاش و علبة صلصله و ك طحينه",amount:290},
  {id:"dh25",date:"2026-02-10",cat:"dairy",name:"فلفل اللوان",amount:35},
  {id:"dh26",date:"2026-02-10",cat:"house",name:"نص ك اكياس تلاجه وصابونه و مزيل عرق",amount:110},
  {id:"dh27",date:"2026-02-10",cat:"dairy",name:"ك لبن",amount:40},
  {id:"dh28",date:"2026-02-11",cat:"dairy",name:"زبادي وبطاطس",amount:30},
  {id:"dh29",date:"2026-02-11",cat:"house",name:"نسكافيه وكيكه",amount:30},
  {id:"dh30",date:"2026-02-12",cat:"basics",name:"قهوة",amount:500},
  {id:"dh31",date:"2026-02-13",cat:"dairy",name:"ك لبن و 3 ايس كريم",amount:60},
  {id:"dh32",date:"2026-02-14",cat:"mohy_d",name:"العربيه",amount:2400},
  {id:"dh33",date:"2026-02-15",cat:"dairy",name:"ك لبن",amount:40},
  {id:"dh34",date:"2026-03-01",cat:"basics",name:"جمعيه",amount:6400},
  {id:"dh35",date:"2026-03-10",cat:"dairy",name:"ك لبن و 2 اندومي وكيس فلامنكو",amount:70},
  {id:"dh36",date:"2026-03-11",cat:"basics",name:"قهوة",amount:660},
  {id:"dh37",date:"2026-03-11",cat:"dairy",name:"ك لبن وجبنه وزيتون",amount:60},
  {id:"dh38",date:"2026-03-11",cat:"house",name:"2 كيلو يوستفندي و 2 موز",amount:80},
  {id:"dh39",date:"2026-03-11",cat:"outing",name:"تسالي ( 2 بيبسي وسوداني وايس كريم و 3 شيبسي)",amount:140},
  {id:"dh40",date:"2026-03-12",cat:"meat",name:"فرختين صغيرين",amount:310},
  {id:"dh41",date:"2026-03-12",cat:"pantry",name:"توابل شوي",amount:20},
  {id:"dh42",date:"2026-03-12",cat:"house",name:"عيش",amount:20},
  {id:"dh43",date:"2026-03-12",cat:"basics",name:"صدقه",amount:200},
  {id:"dh44",date:"2026-03-12",cat:"dairy",name:"ك لبن ومخلل",amount:60},
  {id:"dh45",date:"2026-03-12",cat:"pantry",name:"كيسين اندومي وكيسين شيبسي",amount:40},
  {id:"dh46",date:"2026-03-13",cat:"meat",name:"3 ك لحمه مفرومه 2 ك سجق شرقي و برجر وك هوت دوج",amount:1285},
  {id:"dh47",date:"2026-03-13",cat:"dairy",name:"12 ك لبن عبور لاند و 24 كيس نص كيلو بشاير",amount:918},
  {id:"dh48",date:"2026-03-13",cat:"pantry",name:"(سمنه روابي ك ونص و 2 ازازة زيت سلايت 2 لتر  علبة فاصوليا و 8 علب تونه )",amount:815},
  {id:"dh49",date:"2026-03-13",cat:"house",name:"ماكينة حلاقه لورد و 3 مجات بلاستيك",amount:77},
  {id:"dh50",date:"2026-03-13",cat:"outing",name:"شباسي وبوزو جديد",amount:87.55},
  {id:"dh51",date:"2026-03-13",cat:"meat",name:"بطاطس فارم 2 ونص ك",amount:160.55},
  {id:"dh52",date:"2026-03-13",cat:"dairy",name:"(50جبنه كريمي و ك ملح خفيف و50 جبنه رومي و ك براميلي و نص براميلي بالفلفل وحلاوه سادخ وحلاوه شيكولاته  و50 لانشون و  ك موتزاريلا و كيس بسله )",amount:794.75},
  {id:"dh53",date:"2026-03-13",cat:"pantry",name:"(مسطرده ومايونيز و 2 ك مربي فراوله وتين و نص عسل اسود وباربكيو )",amount:340.15},
  {id:"dh54",date:"2026-03-13",cat:"house",name:"( معطر ملابس 3 لتر و معطر جو و معطر ملابس 400 جم و شاور جل 2 لتر و فلاش منظف ارضيات و ملمع زجاج و صابون ايدي و مسحوق غسيل 2 ونص ك )",amount:785.2},
  {id:"dh55",date:"2026-03-13",cat:"outing",name:"مصاصات",amount:12.3},
  {id:"dh56",date:"2026-03-13",cat:"dairy",name:"زبادي دانجو 12 قطعه",amount:85.9},
  {id:"dh57",date:"2026-03-13",cat:"house",name:"عيش و ايس كريم ولبان",amount:70},
  {id:"dh58",date:"2026-03-13",cat:"house",name:"حمام كريم",amount:85},
  {id:"dh59",date:"2026-03-14",cat:"house",name:"عيش و ايس كريم",amount:37},
  {id:"dh60",date:"2026-03-17",cat:"house",name:"فينو واندومي وايس كريم",amount:65},
  {id:"dh61",date:"2026-03-31",cat:"basics",name:"جمعيه",amount:2000},
  {id:"dh62",date:"2026-04-01",cat:"basics",name:"محمد",amount:1000},
  {id:"dh63",date:"2026-04-04",cat:"house",name:"عيش",amount:10},
  {id:"dh64",date:"2026-04-04",cat:"outing",name:"ايس كريم وبيبسي وبوزو وشيبسي ولبان",amount:160},
  {id:"dh65",date:"2026-04-06",cat:"duha_self",name:"علاج",amount:70},
  {id:"dh66",date:"2026-04-06",cat:"pantry",name:"طبق بيض و مرقة فراخ  وبيكنج بودر وفانيليا",amount:162},
  {id:"dh67",date:"2026-04-06",cat:"house",name:"بطاطس وليمون",amount:55},
  {id:"dh68",date:"2026-04-06",cat:"house",name:"عيش",amount:10},
  {id:"dh69",date:"2026-04-06",cat:"house",name:"فول",amount:30},
  {id:"dh70",date:"2026-04-07",cat:"dairy",name:"طحينه وعلبة زبادي",amount:34},
  {id:"dh71",date:"2026-04-08",cat:"duha_self",name:"مضاد حيوي وفوط صحيه",amount:145},
  {id:"dh72",date:"2026-04-08",cat:"mohy_d",name:"دراع نور و مصنعيه",amount:1100},
  {id:"dh73",date:"2026-04-08",cat:"house",name:"علبة صلصه وبسكويت ليا",amount:50},
  {id:"dh74",date:"2026-04-09",cat:"mohy_d",name:"مصنعية كهرباء وميكانيكا",amount:200},
  {id:"dh75",date:"2026-04-09",cat:"house",name:"ك طحينه و لفتين جلاش و لفة سمبوسه",amount:235},
  {id:"dh76",date:"2026-04-09",cat:"outing",name:"بيبسي وايس كريم وسوداني ولب وبسكويت وكيكه",amount:165},
  {id:"dh77",date:"2026-04-09",cat:"house",name:"نص ك حلاوه ساده و  300 حرام حلاوة شيكولاته و فستق",amount:280},
  {id:"dh78",date:"2026-04-09",cat:"house",name:"لمبه",amount:25},
  {id:"dh79",date:"2026-04-09",cat:"house",name:"دونتس وزلاليا",amount:65},
  {id:"dh80",date:"2026-04-09",cat:"house",name:"فينو",amount:20},
  {id:"dh81",date:"2026-04-09",cat:"house",name:"عيش",amount:10},
  {id:"dh82",date:"2026-04-10",cat:"house",name:"خل و 2 ك دقيق و ك جبنه و ك سوسيس و ك سجق و ك جبنه سايبه وتوابل ( سوبيكو)",amount:865},
  {id:"dh83",date:"2026-04-10",cat:"outing",name:"ملاهي العيال",amount:120},
  {id:"dh84",date:"2026-04-10",cat:"house",name:"دونتس",amount:60},
  {id:"dh85",date:"2026-04-10",cat:"outing",name:"بيبسي ولب وكيكه واندومي",amount:165},
  {id:"dh86",date:"2026-04-10",cat:"house",name:"فاكهه (جوافه  ويوستفندي وخوخ وكنتالوب)",amount:135},
  {id:"dh87",date:"2026-04-10",cat:"house",name:"فينو",amount:20},
  {id:"dh88",date:"2026-04-10",cat:"house",name:"صابون سائل",amount:30},
  {id:"dh89",date:"2026-04-14",cat:"mohy_d",name:"حلاقه",amount:100},
  {id:"dh90",date:"2026-04-14",cat:"house",name:"عصير قصب لتر ونص",amount:60},
  {id:"dh91",date:"2026-04-14",cat:"mohy_d",name:"بنزين و كوتش",amount:760},
  {id:"dh92",date:"2026-04-14",cat:"house",name:"بيبسي وبوزو ولبان",amount:60},
  {id:"dh93",date:"2026-04-14",cat:"house",name:"عيش",amount:20},
  {id:"dh94",date:"2026-04-14",cat:"house",name:"بيض وبكنج بودر وفانيليا و كيكه",amount:35},
  {id:"dh95",date:"2026-04-16",cat:"mohy_d",name:"بنزين",amount:200},
  {id:"dh96",date:"2026-04-16",cat:"house",name:"بطاطس وليمون وبصل",amount:79},
  {id:"dh97",date:"2026-04-16",cat:"outing",name:"بيبسي وايس كريم وسوداني وشيبسي واندومي ولبان وكيكه",amount:250},
  {id:"dh98",date:"2026-04-16",cat:"house",name:"عيش",amount:20},
  {id:"dh99",date:"2026-04-17",cat:"house",name:"فول وطعميه وبتنجان وعجينه",amount:50},
  {id:"dh100",date:"2026-04-17",cat:"outing",name:"ايس كريم ولبان",amount:40},
  {id:"dh101",date:"2026-04-17",cat:"house",name:"عيش",amount:20},
  {id:"dh102",date:"2026-04-17",cat:"outing",name:"ايس كريم وشيبسي ولانشون",amount:60},
  {id:"dh103",date:"2026-04-19",cat:"mohy_d",name:"تصليح الكاوتش",amount:50},
  {id:"dh104",date:"2026-04-19",cat:"house",name:"4 بيضات وشيبسي وايس كريم و ك لبن",amount:120},
  {id:"dh105",date:"2026-04-20",cat:"meat",name:"بانيه",amount:100},
  {id:"dh106",date:"2026-04-20",cat:"house",name:"بطاطس",amount:34},
  {id:"dh107",date:"2026-04-20",cat:"house",name:"عيش",amount:20},
  {id:"dh108",date:"2026-04-20",cat:"house",name:"شيبسي وبوزو وكيكه",amount:50},
  {id:"dh109",date:"2026-04-21",cat:"house",name:"حواوشي وفطير بالسكر والجبنه",amount:110},
  {id:"dh110",date:"2026-04-21",cat:"outing",name:"بيبسي وشيبسي وكيكه وبسكويت",amount:100},
  {id:"dh111",date:"2026-04-21",cat:"house",name:"بطيخه",amount:50},
  {id:"dh112",date:"2026-04-21",cat:"house",name:"كشري وطاجن",amount:105},
  {id:"dh113",date:"2026-04-26",cat:"mohy_d",name:"مصاريف بيت",amount:286},
  {id:"dh114",date:"2026-04-27",cat:"basics",name:"جمعيه",amount:2000},
  {id:"dh115",date:"2026-05-01",cat:"meat",name:"ك لحمه مفرومه 279- ك ونص وراك 170.9 - نص بانيه 160.13 - نص سجق  150.5 - كفته الرز 102.6 - نص استربس 129.77 - كفته لحم 122.36 - خلطة حواوشي 134.5 - لحم مكعبات 280.86 - كبده شرائح 120 - ك ناجتس 145",amount:1796},
  {id:"dh116",date:"2026-05-01",cat:"mohy_d",name:"شمع فلتر 5 مراحل",amount:319},
  {id:"dh117",date:"2026-05-01",cat:"dairy",name:"نص كيلو جبنه رومي سبريد",amount:96.1},
  {id:"dh118",date:"2026-05-01",cat:"pantry",name:"علبه مربي ك  ٧٩ - ازازة زيت حلوه ١٨١.٥-  مرقه ١٥- خلطة مفروم ١٩- علبة صلصه ١٧٥",amount:469.5},
  {id:"dh119",date:"2026-05-01",cat:"house",name:"٤ اكياس ملوخيه مجمده - ٢ كيس باميه - ١ كيس بسله",amount:180},
  {id:"dh120",date:"2026-05-01",cat:"outing",name:"سايس",amount:20},
  {id:"dh121",date:"2026-05-01",cat:"meat",name:"بطاطس فارم فريتس",amount:135},
  {id:"dh122",date:"2026-05-01",cat:"dairy",name:"١٢ ك لبن اريا -  12 ك لبن بشاير",amount:850.2},
  {id:"dh123",date:"2026-05-01",cat:"pantry",name:"٥ اكياس مكرونه 72.5 - علبة مشروم 109 - اربع علب تونه 97 -  صوص باربكيو 86.5 - دقيق  ك 29.5 - مرقه لحمه 15.5 - كنور بهار وتتبيله 14 - جيلي بطيخ 12.5",amount:436.5},
  {id:"dh124",date:"2026-05-01",cat:"house",name:"عرض كلور ابيض والوان",amount:48.95},
  {id:"dh125",date:"2026-05-01",cat:"outing",name:"لبان",amount:3},
  {id:"dh126",date:"2026-05-01",cat:"meat",name:"ك برجر شكيتيتا154- شهد بانيه 294",amount:448},
  {id:"dh127",date:"2026-05-01",cat:"dairy",name:"لانشون الوطنيه ربع كيلو",amount:70},
  {id:"dh128",date:"2026-05-01",cat:"house",name:"كيذر وفينو",amount:40},
  {id:"dh129",date:"2026-05-01",cat:"outing",name:"عصير دانون للعيال",amount:53.7},
  {id:"dh130",date:"2026-05-01",cat:"dairy",name:"ك جبنه ملح خفيف ١١٧ - ك براميلي 99",amount:216},
  {id:"dh131",date:"2026-05-02",cat:"breakfast",name:"4 اكياس فول و 2 عجينه و 20 طعميه و بتنجان",amount:90},
  {id:"dh132",date:"2026-05-02",cat:"dairy",name:"طبق بيض",amount:110},
  {id:"dh133",date:"2026-05-02",cat:"pantry",name:"بتنجان وبطاطس",amount:50},
  {id:"dh134",date:"2026-05-02",cat:"house",name:"عيش",amount:20},
  {id:"dh135",date:"2026-05-02",cat:"house",name:"اكياس زباله",amount:35},
  {id:"dh136",date:"2026-05-02",cat:"house",name:"فينو و فطيرتين و 10 مش",amount:50},
  {id:"dh137",date:"2026-05-02",cat:"house",name:"5 نسكافيه و طبق لانشون و مخلل خيار",amount:45},
  {id:"dh138",date:"2026-05-06",cat:"pantry",name:"طحينه وكريم شانتيه و بيكنج بودر وفانيليا و نسكافيه",amount:90},
  {id:"dh139",date:"2026-05-06",cat:"outing",name:"تورته 100 - نص حلويات 90 - فطيرتين 20",amount:210},
  {id:"dh140",date:"2026-05-09",cat:"house",name:"مناديل وفرش",amount:300},
  {id:"dh141",date:"2026-05-13",cat:"basics",name:"صدقه",amount:100},
  {id:"dh142",date:"2026-05-13",cat:"outing",name:"ايس كريم و بيبسي",amount:50},
  {id:"dh143",date:"2026-05-18",cat:"basics",name:"قهوه",amount:500},
  {id:"dh144",date:"2026-05-18",cat:"mohy_d",name:"بنزين",amount:700},
  {id:"dh145",date:"2026-05-21",cat:"house",name:"6 جلاش",amount:75},
  {id:"dh146",date:"2026-05-21",cat:"outing",name:"ك حلويات",amount:135},
  {id:"dh147",date:"2026-05-22",cat:"mohy_d",name:"مصاريف محمد",amount:258},
  {id:"dh148",date:"2026-05-23",cat:"basics",name:"جمعيه",amount:2000},
  {id:"dh149",date:"2026-05-24",cat:"basics",name:"تحويش",amount:1005},
  {id:"dh150",date:"2026-05-25",cat:"basics",name:"سما",amount:220},
  {id:"dh151",date:"2026-05-26",cat:"basics",name:"عجز",amount:8},
  {id:"dh152",date:"2026-05-26",cat:"house",name:"مشتريات بيت الجمله",amount:3715},
  {id:"dh153",date:"2026-05-26",cat:"house",name:"الراجل الي بيعبي",amount:15},
  {id:"dh154",date:"2026-05-26",cat:"house",name:"مشتريات سوبيكو",amount:1330},
  {id:"dh155",date:"2026-05-26",cat:"house",name:"زبادي وشيبسي",amount:70},
  {id:"dh156",date:"2026-05-28",cat:"house",name:"انبوبه",amount:330},
  {id:"dh157",date:"2026-05-28",cat:"outing",name:"سوداني ولب وبوزو وشيبسي",amount:160},
  {id:"dh158",date:"2026-05-28",cat:"outing",name:"فينو",amount:20},
  {id:"dh159",date:"2026-05-28",cat:"outing",name:"عيش",amount:20},
  {id:"dh160",date:"2026-05-28",cat:"outing",name:"ايس كريم وشيبسي  وبسكويت",amount:82},
  {id:"dh161",date:"2026-05-30",cat:"outing",name:"بانيه وفينو بيتي بان",amount:65},
  {id:"dh162",date:"2026-05-30",cat:"outing",name:"قرص وباتيه",amount:45},
  {id:"dh163",date:"2026-05-30",cat:"outing",name:"لانشون ورومي ومخلل",amount:90},
  {id:"dh164",date:"2026-05-30",cat:"outing",name:"صابون سايل",amount:15},
  {id:"dh165",date:"2026-05-30",cat:"outing",name:"ايس كريم وعيش وبسكويت",amount:75},
  {id:"dh166",date:"2026-05-30",cat:"outing",name:"فحم",amount:90},
];

// ── صيانة العربية من شيت "العربية"
const CAR_DATA = [
{id:"c1",date:"2025-09-02",name:"طقم اصلاح ماستر ملي فرامل خلفي",amount:1501,km:"",cat:"brakes"},
{id:"c2",date:"2025-09-07",name:"تغير زيت ليكومولي 10 الالف",amount:1900,km:"218850",note:"✓ تم",cat:"oil"},
{id:"c3",date:"2025-09-07",name:"تغير فلتر هواء",amount:350,km:"229850",cat:"oil"},
{id:"c4",date:"2025-09-07",name:"فلتر زيت",amount:250,km:"218850",note:"✓ تم",cat:"oil"},
{id:"c5",date:"2025-09-07",name:"سير كاتينه",amount:1700,km:"289850",cat:"engine"},
{id:"c6",date:"2025-09-07",name:"بلية كاتينه",amount:700,km:"289850",cat:"engine"},
{id:"c7",date:"2025-09-07",name:"اويل سيل كوبلن",amount:250,km:"150k",cat:"engine"},
{id:"c8",date:"2025-09-07",name:"اويل سيل كامه",amount:650,km:"150k",cat:"engine"},
{id:"c9",date:"2025-09-07",name:"اويل سيل كرنك",amount:0,km:"150k",cat:"engine"},
{id:"c10",date:"2025-09-07",name:"اورنج طلمبة زيت",amount:125,km:"150k",cat:"oil"},
{id:"c11",date:"2025-09-07",name:"منظف دورة وقود ليكومولي",amount:350,km:"259850",cat:"oil"},
{id:"c12",date:"2025-09-07",name:"منظف زيت ليكومولي",amount:350,km:"259850",cat:"oil"},
{id:"c13",date:"2025-10-02",name:"فتح العربيه",amount:250,km:"",cat:"other"},
{id:"c14",date:"2025-10-04",name:"تصليح كاوتش",amount:35,km:"",cat:"tires"},
{id:"c15",date:"2025-10-14",name:"مياه خضراء",amount:700,km:"262200",cat:"suspension"},
{id:"c16",date:"2025-10-14",name:"ثرموستات كوعه",amount:700,km:"262200",cat:"suspension"},
{id:"c17",date:"2025-10-14",name:"شراء تيل فرامل",amount:700,km:"",cat:"brakes"},
{id:"c18",date:"2025-10-14",name:"منظف ريداتير",amount:290,km:"",cat:"suspension"},
{id:"c19",date:"2025-10-18",name:"كبس ريداتير",amount:50,km:"",cat:"suspension"},
{id:"c20",date:"2025-10-27",name:"حجر مفتاح",amount:50,km:"",cat:"other"},
{id:"c21",date:"2025-11-05",name:"مصنعية تركيب تيل فرامل",amount:100,km:"233235",cat:"brakes"},
{id:"c22",date:"2025-11-06",name:"تصليح كاوتش",amount:125,km:"",cat:"tires"},
{id:"c23",date:"2025-11-24",name:"شراء 4 فرد كاوتش + زرجينه",amount:7150,km:"224220",note:"صيانة كل 10 الاف",cat:"tires"},
{id:"c24",date:"2025-11-25",name:"سرة عجله جديده خلفيه",amount:800,km:"",cat:"tires"},
{id:"c25",date:"2025-11-25",name:"مسامير عجل",amount:125,km:"",cat:"tires"},
{id:"c26",date:"2025-11-25",name:"مصنعيه تركيب سرة خلفيه",amount:350,km:"",cat:"tires"},
{id:"c27",date:"2025-12-06",name:"2 جركن زيت فتيس",amount:3500,km:"264900",cat:"oil"},
{id:"c28",date:"2025-12-06",name:"ماستر فرامل عمومي",amount:2500,km:"",cat:"brakes"},
{id:"c29",date:"2025-12-06",name:"زيت باكم",amount:250,km:"",cat:"oil"},
{id:"c30",date:"2025-12-06",name:"سلك بنزين",amount:350,km:"",cat:"engine"},
{id:"c31",date:"2025-12-06",name:"فلتر فتيس",amount:750,km:"",cat:"oil"},
{id:"c32",date:"2025-12-06",name:"اويل سيل كرنك خلفي",amount:900,km:"",cat:"engine"},
{id:"c33",date:"2025-12-06",name:"اويل سيل قربة فتيس",amount:500,km:"",cat:"engine"},
{id:"c34",date:"2025-12-06",name:"زيت باور",amount:280,km:"264900",cat:"oil"},
{id:"c35",date:"2025-12-06",name:"اضافة زيت باور",amount:220,km:"",cat:"oil"},
{id:"c36",date:"2025-12-06",name:"فلاش نضافة زيت باور",amount:400,km:"",cat:"oil"},
{id:"c37",date:"2025-12-06",name:"مصنعيه تغير زيت باور",amount:225,km:"",cat:"oil"},
{id:"c38",date:"2025-12-06",name:"شراء مساحات بوش + مياه هدية",amount:180,km:"",cat:"other"},
{id:"c39",date:"2025-12-15",name:"مساعدين امامي",amount:8000,km:"",cat:"suspension"},
{id:"c40",date:"2025-12-15",name:"ماستر خلفي",amount:0,km:"",cat:"brakes"},
{id:"c41",date:"2025-12-15",name:"قاعدة فتيس",amount:0,km:"",cat:"engine"},
{id:"c42",date:"2025-12-15",name:"تصليح فتيس مصنعية",amount:0,km:"",cat:"engine"},
{id:"c43",date:"2025-12-15",name:"تصليح كهرباء",amount:300,km:"",cat:"elec"},
{id:"c44",date:"2026-02-14",name:"جركن زيت ميتسوبيشي الاصلي",amount:1350,km:"226850",cat:"oil"},
{id:"c45",date:"2026-02-14",name:"فلتر زيت اصلي",amount:250,km:"226850",cat:"oil"},
{id:"c46",date:"2026-02-14",name:"طبة زيت + ورده",amount:200,km:"",cat:"oil"},
{id:"c47",date:"2026-02-14",name:"جوان غطا التاكيهات",amount:150,km:"",cat:"engine"},
{id:"c48",date:"2026-02-14",name:"بلية عجل أمامي",amount:600,km:"",cat:"tires"},
{id:"c49",date:"2026-02-14",name:"مصنعي تغير بلية وزيت وكيس البليه",amount:500,km:"",cat:"tires"},
{id:"c50",date:"2026-02-14",name:"تغير فلتر شكمان",amount:650,km:"",cat:"other"},
{id:"c51",date:"2026-02-26",name:"علبة شحم وقفزان",amount:190,km:"",cat:"other"},
{id:"c52",date:"2026-02-26",name:"مصنعية تغير مسامير الميزان وتشحيم الكوبلن",amount:500,km:"",cat:"suspension"},
{id:"c53",date:"2026-02-26",name:"مسامير ميزان جديده",amount:750,km:"",cat:"suspension"},
{id:"c54",date:"2026-03-22",name:"3 قواعد ماتور (خلفي وتنامي ويمين)",amount:2803,km:"",cat:"engine"},
{id:"c55",date:"2026-03-22",name:"جنط حديد وترصيص العجل كله",amount:1001,km:"",cat:"tires"},
{id:"c56",date:"2026-03-22",name:"تصليح شابوره وكهرباء",amount:200,km:"",cat:"elec"},
{id:"c57",date:"2026-03-22",name:"تركيب 3 قواعد",amount:800,km:"",cat:"engine"},
{id:"c58",date:"2026-04-22",name:"دراع نور ومصنعية تركيبه",amount:1100,km:"",cat:"elec"},
{id:"c59",date:"2026-04-22",name:"مصنعية تركيب دراع نور وتنضيف بوابه",amount:200,km:"",cat:"elec"},
{id:"c60",date:"2026-04-22",name:"تصليح كاوتش فيه مسمار",amount:50,km:"",cat:"tires"},
{id:"c61",date:"2026-05-15",name:"ضبط زوايا",amount:250,km:"",cat:"suspension"},
{id:"c62",date:"2026-05-25",name:"مصنعيه",amount:150,km:"",cat:"other"},
{id:"c63",date:"2026-06-04",name:"بوابه كامله بالحساسات",amount:3500,km:"",cat:"elec"},
{id:"c64",date:"2026-06-04",name:"مصنعيه واوبر توصيل",amount:550,km:"",cat:"other"}
];

// ── بيانات القروض الصحيحة من شيت "اهدافي 2026"
// السلفة:   باقي في يناير = 393,000 ج | أصل = 434,000 ج
// قسط الشقة: باقي في يناير = 349,815.91 ج
// الأقساط المدفوعة فبراير→مايو من الإكسيل:
//   عربية: 7000×4 = 28,000
//   شقة:   1061.06+1031.03+1030+1032 = 4,154.09
// ── أرقام من شيت "اهدافي 2026" بالضبط ──
// الأرقام دي من الإكسيل مباشرة — ملناش دعوة بالحسابات القديمة
// من يونيو 2026 فصاعداً: كل شهر يدخله المستخدم يخصم من المتبقي
const SALFA_ORIGINAL = 434000; // أصل السلفة
const SALFA_START = 393000; // المتبقي الحالي (من الإكسيل)
const APT_ORIGINAL = 356029.5; // أصل قسط الشقة (من الإكسيل)
const APT_START = 349815.91; // المتبقي الحالي (من الإكسيل)

const GOALS_DEF = ["شراء 2 ترنج ليا", "شراء هدوم العيال", "شراء هدوم ل ضحي", "اخس لحد 95 كجم", "شراء شرابات لينا", "شراء كوتشي ليا", "تخليص الشقه وتوضيبها"];
const CHECK_DEF = ["اذكار الصباح", "قراءة سورة البقرة", "قراءة سورة الواقعه", "قراءة سورة الحجرات", "اول ربع من سورة يس", "تمرين", "تظبيط اكل الفطار", "تظبيط اكل الغدا", "اسناك", "تظبيط اكل العشا", "اذكار المساء", "الصلاه في ميعادها", "الفجر في ميعاده", "الضحي"];

// ══════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════
const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const HC = [{
  id: "basics",
  l: "الأساسيات",
  ic: "🛒",
  c: "#3b82f6"
}, {
  id: "cleaning",
  l: "المنظفات",
  ic: "🧴",
  c: "#06b6d4"
}, {
  id: "breakfast",
  l: "الفطار",
  ic: "🍳",
  c: "#f59e0b"
}, {
  id: "meat",
  l: "لحوم وفراخ",
  ic: "🥩",
  c: "#ef4444"
}, {
  id: "kids",
  l: "ضحي / العيال",
  ic: "👶",
  c: "#8b5cf6"
}, {
  id: "mohy",
  l: "محمد",
  ic: "👨",
  c: "#10b981"
}, {
  id: "dairy",
  l: "بيض وألبان",
  ic: "🥚",
  c: "#fbbf24"
}, {
  id: "pantry",
  l: "العطارة",
  ic: "🌿",
  c: "#34d399"
}, {
  id: "house",
  l: "مستلزمات البيت",
  ic: "🏡",
  c: "#60a5fa"
}, {
  id: "outing",
  l: "خروجات وتسالي",
  ic: "🎡",
  c: "#f472b6"
}, {
  id: "health",
  l: "صحة وعلاج",
  ic: "💊",
  c: "#fb923c"
}, {
  id: "vegetables",
  l: "خضار",
  ic: "🥦",
  c: "#22c55e"
}, {
  id: "fruits",
  l: "فاكهة",
  ic: "🍎",
  c: "#f43f5e"
}, {
  id: "saving",
  l: "تحويش",
  ic: "💰",
  c: "#a78bfa"
}];
// ── تصنيفات شيت "ضحي" (مطابقة لأعمدة الشيت بالظبط)
const DC = [{
  id: "basics",
  l: "الأساسيات",
  ic: "🛒",
  c: "#3b82f6"
}, {
  id: "cleaning",
  l: "المنظفات",
  ic: "🧴",
  c: "#06b6d4"
}, {
  id: "breakfast",
  l: "الفطار",
  ic: "🍳",
  c: "#f59e0b"
}, {
  id: "meat",
  l: "اللحوم والفراخ",
  ic: "🥩",
  c: "#ef4444"
}, {
  id: "duha_self",
  l: "ضحي",
  ic: "👩",
  c: "#8b5cf6"
}, {
  id: "mohy_d",
  l: "محمد",
  ic: "👨",
  c: "#10b981"
}, {
  id: "dairy",
  l: "البيض والألبان",
  ic: "🥚",
  c: "#fbbf24"
}, {
  id: "pantry",
  l: "العطارة",
  ic: "🌿",
  c: "#34d399"
}, {
  id: "house",
  l: "مستلزمات البيت",
  ic: "🏡",
  c: "#60a5fa"
}, {
  id: "outing",
  l: "الخروجات",
  ic: "🎡",
  c: "#f472b6"
}, {
  id: "vegetables",
  l: "خضار",
  ic: "🥦",
  c: "#22c55e"
}, {
  id: "fruits",
  l: "فاكهة",
  ic: "🍎",
  c: "#f43f5e"
}, {
  id: "saving",
  l: "تحويش",
  ic: "💰",
  c: "#a78bfa"
}];
const CC = [{
  id: "oil",
  l: "زيت وفلاتر",
  ic: "🛢️",
  c: "#fbbf24"
}, {
  id: "brakes",
  l: "فرامل",
  ic: "⚙️",
  c: "#ef4444"
}, {
  id: "engine",
  l: "موتور وميكانيكا",
  ic: "🔩",
  c: "#8b5cf6"
}, {
  id: "elec",
  l: "كهرباء",
  ic: "⚡",
  c: "#60a5fa"
}, {
  id: "tires",
  l: "كاوتش وعجل",
  ic: "🔘",
  c: "#94a3b8"
}, {
  id: "suspension",
  l: "تعليق وميزان",
  ic: "🔧",
  c: "#34d399"
}, {
  id: "other",
  l: "تاني",
  ic: "🔨",
  c: "#6b7280"
}, {
  id: "saving",
  l: "تحويش",
  ic: "💰",
  c: "#a78bfa"
}];

// ══════════════════════════════════════════════════════════════
// UTILS
// ══════════════════════════════════════════════════════════════
// ld و sv معرفين فوق في Cloud Sync section
const fmt = n => Number(n || 0).toLocaleString("ar-EG");
const MK = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const DK = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const SUM = a => a.reduce((s, e) => s + (Number(e.amount) || 0), 0);
const PCT = (a, b) => b ? Math.min(100, Math.round(a / b * 100)) : 0;
const UNKNOWN_CAT = { id: "_unknown", l: "غير مصنف", ic: "❓", c: "#64748b" };
// ── فئة "تحويش" ثابتة بتترجع كحل احتياطي لو "saving" معملهاش catF لأي سبب (زي قايمة فئات ناقصة)
// عشان بنود التحويش/السحب منه محتفضش تظهر "❓ غير مصنف" أبداً
const SAVING_CAT = { id: "saving", l: "تحويش", ic: "💰", c: "#a78bfa" };
// ── رسالة تحفيز/تقدير يومية حسب نسبة إنجاز مهام اليوم
function dailyMotivationMsg(pct) {
  if (pct >= 100) return "🌟 ما شاء الله، خلّصت كل مهامك النهاردة! ربنا يبارك في وقتك ويجزيك خير.";
  if (pct >= 70) return "👏 يوم كويس جدًا! خلّصت أغلب مهامك، كمّل بنفس الحماس.";
  if (pct >= 40) return "💪 بداية طيبة، لسه قدامك شوية مهام النهاردة، يلا كمّل.";
  return "🌱 لسه في وقت تلحق تكمل مهامك النهاردة، ابدأ بأسهل حاجة وكمّل من هناك.";
}
const catF = (list, id) => list.find(c => c.id === id) || (id === "saving" ? SAVING_CAT : UNKNOWN_CAT);
// ── فئات الأكل والشرب (نفس الـ ids مشتركة بين تصنيفات محمد وضحي) — لعمل إجمالي مجمّع في شاشة التحليل
const FOOD_CAT_IDS = ["basics", "breakfast", "meat", "dairy", "pantry", "vegetables", "fruits"];

// ══════════════════════════════════════════════════════════════
// ATHKAR DATA — أذكار الصباح والمساء (نص، عدد التكرار)
// ══════════════════════════════════════════════════════════════
const MORNING_ATHKAR = [
  [`اللَّهُ لاَ إِلَهَ إِلاَّ هُوَ الْحَيُّ الْقَيُّومُ لاَ تَأْخُذُهُ سِنَةٌ وَلاَ نَوْمٌ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الأَرْضِ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلاَّ بِإِذْنِهِ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ وَلاَ يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلاَّ بِمَا شَاء وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالأَرْضَ وَلاَ يَؤُودُهُ حِفْظُهُمَا وَهُوَ الْعَلِيُّ الْعَظِيمُ. (آية الكرسي)`, 1],
  [`قُلْ هُوَ اللَّهُ أَحَدٌ * اللَّهُ الصَّمَدُ * لَمْ يَلِدْ وَلَمْ يُولَدْ * وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ. (سورة الإخلاص)`, 3],
  [`قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ * مِنْ شَرِّ مَا خَلَقَ * وَمِنْ شَرِّ غَاسِقٍ إِذَا وَقَبَ * وَمِنْ شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ * وَمِنْ شَرِّ حَاسِدٍ إِذَا حَسَدَ. (سورة الفلق)`, 3],
  [`قُلْ أَعُوذُ بِرَبِّ النَّاسِ * مَلِكِ النَّاسِ * إِلَهِ النَّاسِ * مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ * الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ * مِنَ الْجِنَّةِ وَالنَّاسِ. (سورة الناس)`, 3],
  [`بسم الله الرحمن الرحيم\n\nالم (1) ذَٰلِكَ الْكِتَابُ لَا رَيْبَ ۛ فِيهِ ۛ هُدًى لِّلْمُتَّقِينَ (2) الَّذِينَ يُؤْمِنُونَ بِالْغَيْبِ وَيُقِيمُونَ الصَّلَاةَ وَمِمَّا رَزَقْنَاهُمْ يُنفِقُونَ (3) وَالَّذِينَ يُؤْمِنُونَ بِمَا أُنزِلَ إِلَيْكَ وَمَا أُنزِلَ مِن قَبْلِكَ وَبِالْآخِرَةِ هُمْ يُوقِنُونَ (4) أُولَٰئِكَ عَلَىٰ هُدًى مِّن رَّبِّهِمْ ۖ وَأُولَٰئِكَ هُمُ الْمُفْلِحُونَ (5) (فواتح سورة البقرة)`, 1],
  [`أصبحنا وأصبح الملك لله، والحمد لله، لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شئ قدير، رب أسألك خير ما في هذا اليوم وخير ما بعدها، وأعوذ بك من شر ما في هذا اليوم وشر ما بعدها، رب أعوذ بك من الكسل، وسوء الكبر، رب أعوذ بك من عذاب في النار وعذاب في القبر.`, 1],
  [`اللهم بك أصبحنا، وبك أمسينا، وبك نحيا، وبك نموت، وإليك النشور.`, 1],
  [`اللهم اني أصبحت منك في نعمةٍ وعافيةٍ وسترٍ فأتم علي نعمتك وعافيتك وسترك في الدنيا والاخره.`, 1],
  [`اللهم ما أصبح بي من نعمة او بأحد من خلقك فمنك وحدك لا شريك لك فلك الحمد ولك الشكر.`, 1],
  [`أصبحنا وأصبح الملك لله رب العالمين، اللهم إني أسألك خير هذا اليوم: فتحه ونصره ونوره وبركته وهداه وأعوذ بك من شر ما فيه وشر ما بعده.`, 1],
  [`أصبحنا على فطرة الإسلام وعلى كلمة الإخلاص، وعلى دين نبينا محمد صلى الله عليه وسلم، وعلى ملة أبينا إبراهيم، حنيفاً مسلماً وما كان من المشركين.`, 1],
  [`حسبي الله لا إله إلا هو عليه توكلت وهو رب العرش العظيم.`, 7],
  [`اللهم إني أصبحت أشهدك و أشهد حملة عرشك، وملائكتك وجميع خلقك، أنك أنت الله لا إله إلا أنت وحدك لا شريك لك، وأن محمداً عبدك ورسولك.`, 4],
  [`اللهم أنت ربي لا إله إلا أنت، خلقتني و أنا عبدك، وأنا على عهدك ووعدك ما استطعت، أعوذ بك من شر ما صنعت، أبوء لك بنعمتك علي، وأبوء بذنبي فاغفر لي فإنه لا يغفر الذنوب إلا أنت. (سيد الاستغفار)`, 1],
  [`اللهم أنت ربي لا إله إلا أنت عليك توكلت وأنت رب العرش الكريم، ما شاء الله كان، وما لم يشأ لم يكن، ولا حول ولا قوة إلا بالله العلي العظيم، أعلم أن الله على كل شيء قدير، وأن الله أحاط بكل شيء علماً، اللهم إني أعوذ بك من شر نفسي ومن شر كل دابة أنت آخذ بناصيتها إن ربي على صراط مستقيم.`, 1],
  [`اللهم فاطر السموات والأرض عالم الغيب والشهادة رب كل شئ ومليكه اعوذ بك من شر نفسي وشر الشيطان وشركه وان اقترف علي نفسي سوءا أو أجره الي مسلم.`, 1],
  [`اللهم اني أسألك العفو والعافيه في الدنيا والاخره، اللهم اني أسألك العفو والعافيه في ديني و دنياي واهلي ومالي، اللهم استر عوراتي وآمن روعاتي، اللهم احفظني من بيدي ومن خلفي وعن يميني وعن شمالي ومن فوقي، اعوذ بعظمتك ان اغتال من تحتي.`, 1],
  [`اللهم اني عبدك (امتك) ابن عبدك ابن امتك ناصيتي بيدك ماضٍ في حكمك عدل في قضائك أسألك بكل اسم هو لك سميت به نفسك او انزلته في كتابك او علمته احداً من خلقك او استأثرت به في علم الغيب عندك أن تجعل القرءان العظيم ربيع قلبي ونور صدري وجلاء حزني وذهاب همي.`, 1],
  [`اللهم اني اعوذ بك من الهم والحزن واعوذ بك من العجز والكسل واعوذ بك من الجبن والبخل واعوذ بك من غلبة الدين وقهر الرجال.`, 3],
  [`اللهم عافني في بدني، اللهم عافني في سمعي، اللهم عافني في بصري، لا إله إلا أنت، اللهم إني أعوذ بك من الكفر، والفقر، وأعوذ بك من عذاب القبر، لا إله إلا أنت.`, 3],
  [`اللهم اني اسألُك علماً نافعا ورزقا طيبا وعملا متقبلا.`, 3],
  [`اللهم لا إله إلا أنت سبحانك إني كنت من الظالمين.`, 1],
  [`يا رب لك الحمد كما ينبغي لجلال وجهك وعظيم سلطانك.`, 3],
  [`بسم الله الذي لا يضر مع اسمه شئ في الأرض ولا في السماء وهو السميع العليم.`, 3],
  [`اعوذ بكلمات الله التامات من شر ما خلق.`, 3],
  [`رضيت بالله رباً، وبالإسلام ديناً، وبمحمد صلى الله عليه وسلم نبياً.`, 3],
  [`اللهم إني أعوذ بك من الفقر والقلة والذلة، وأعوذ بك من أن أظلم وأظلم.`, 1],
  [`اللهم إني أعوذ بك أن أشرك بك شئ وأنا أعلمه وأستغفرك لما لا أعلمه.`, 3],
  [`اللهم أنت خلقتني وأنت تهديني وأنت تطعمني وأنت تسقيني وأنت تميتني وأنت تحييني.`, 1],
  [`يا حي يا قيوم برحمتك أستغيث أصلح لي شأني كله ولا تكلني إلى نفسي طرفة عين.`, 3],
  [`سبحان الله وبحمده: عدد خلقه، ورضا نفسه، وزنة عرشه، ومداد كلماته.`, 3],
  [`ياودود ياودود ياذا العرش المجيد يافعالاً لما تريد اسألك بنور وجهك الذي اشرقت لهو الظلمات اسألك بعزك الذي لا يظام وفضلك الذي لا يرام ان تكفيني من كل شر وان ترزقني وان تاتني من خير الدنيا والآخرة يارب.`, 1],
  [`أستغفر الله وأتوب إليه.`, 100],
  [`لا حول ولاقوة الابالله، توكلت على الحي الذي لا يموت، الحمدلله الذي لم يتخد ولدا ولم يكن له شريك في الملك ولم يكن له ولي من الذل وكبره تكبيرا.`, 10],
  [`أعوذ بكلمات الله التامات التي لا يجاوزهن بر ولا فاجر من شر ما خلق وذرأ وبرأ، ومن شر ما ينزل من السماء، ومن شر ما يعرج فيها، ومن شر ما ذرأ في الأرض، ومن شر ما يخرج منها، ومن شر فتن الليل والنهار ومن شر طوارق الليل والنهار الا طارقا يطرق يخير يا رحمن.`, 1],
  [`سبحان الله عدد ما خلق، سبحان الله مليء ما خلق، سبحان الله عدد ما في الأرض والسماء، سبحان الله مليء ما في الأرض والسماء، سبحان الله عدد كل شيء، سبحان الله مليء كل شيء، الحمد الله عدد ما خلق، الحمد الله مليء ما خلق، الحمد الله عدد ما في الأرض والسماء، والحمد الله مليء ما في الأرض والسماء، الحمد الله عدد ما أحصي كتابه، الحمد لله مليء ما أحصي كتابه، الحمد لله عدد كل شيء، الحمد الله مليء كل شيء.`, 1],
  [`لا اله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شئ قدير.`, 1],
  [`اللهم اني اسالك ناني اشهد و بانك انت الله الذي لا اله الا انت الا حد الصمد الذي لم يلد ولم يولد ولم يكن له كفؤن أحد، اسال الله يحقق لنا كل مانتمناه يا رب العالمين.`, 1],
  [`اللهم صل وسلم على نبينا محمد.\n\nأفضل صيغ الصلاة على النبي:\nاللهم صل على محمد وعلى آل محمد كما صليت على ابراهيم وعلى آل إبراهيم إنك حميد مجيد وبارك على محمد وعلى آل محمد كما باركت على ابراهيم وعلى آل إبراهيم في العالمين إنك حميد مجيد.`, 500],
  [`سبحان الله و بحمده.`, 100]
];

const EVENING_ATHKAR = [
  [`اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ وَلَا يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ. (آية الكرسي)`, 1],
  [`قُلْ هُوَ اللَّهُ أَحَدٌ * اللَّهُ الصَّمَدُ * لَمْ يَلِدْ وَلَمْ يُولَدْ * وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ. (سورة الإخلاص)`, 3],
  [`قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ * مِن شَرِّ مَا خَلَقَ * وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ * وَمِن شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ * وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ. (سورة الفلق)`, 3],
  [`قُلْ أَعُوذُ بِرَبِّ النَّاسِ * مَلِكِ النَّاسِ * إِلَٰهِ النَّاسِ * مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ * الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ * مِنَ الْجِنَّةِ وَالنَّاسِ. (سورة الناس)`, 3],
  [`آمَنَ الرَّسُولُ بِمَا أُنزِلَ إِلَيْهِ مِن رَّبِّهِ وَالْمُؤْمِنُونَ ۚ كُلٌّ آمَنَ بِاللَّهِ وَمَلَائِكَتِهِ وَكُتُبِهِ وَرُسُلِهِ لَا نُفَرِّقُ بَيْنَ أَحَدٍ مِّن رُّسُلِهِ ۚ وَقَالُوا سَمِعْنَا وَأَطَعْنَا ۖ غُفْرَانَكَ رَبَّنَا وَإِلَيْكَ الْمَصِيرُ (285)\nلَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا ۚ لَهَا مَا كَسَبَتْ وَعَلَيْهَا مَا اكْتَسَبَتْ ۗ رَبَّنَا لَا تُؤَاخِذْنَا إِن نَّسِينَا أَوْ أَخْطَأْنَا ۚ رَبَّنَا وَلَا تَحْمِلْ عَلَيْنَا إِصْرًا كَمَا حَمَلْتَهُ عَلَى الَّذِينَ مِن قَبْلِنَا ۚ رَبَّنَا وَلَا تُحَمِّلْنَا مَا لَا طَاقَةَ لَنَا بِهِ ۖ وَاعْفُ عَنَّا وَاغْفِرْ لَنَا وَارْحَمْنَا ۚ أَنتَ مَوْلَانَا فَانصُرْنَا عَلَى الْقَوْمِ الْكَافِرِينَ (286). (خواتيم سورة البقرة)`, 1],
  [`أمسينا وأمسى الملك لله، والحمد لله، لا إله إلا الله وحده لا شريك له، له الملك وله الحمد، وهو على كل شيء قدير، رب أسألك خير ما في هذه الليلة وخير ما بعدها، وأعوذ بك من شر ما في هذه الليلة وشر ما بعدها، رب أعوذ بك من الكسل وسوء الكِبَر، رب أعوذ بك من عذاب في النار وعذاب في القبر.`, 1],
  [`اللهم بك أمسينا، وبك أصبحنا، وبك نحيا، وبك نموت، وإليك المصير.`, 1],
  [`اللهم إني أمسيت منك في نعمةٍ وعافيةٍ وسترٍ، فأتمم عليّ نعمتك وعافيتك وسترك في الدنيا والآخرة.`, 1],
  [`اللهم ما أمسى بي من نعمةٍ أو بأحدٍ من خلقك، فمنك وحدك لا شريك لك، فلك الحمد ولك الشكر.`, 1],
  [`اللهم إني أسألك خير هذه الليلة: فتحها، ونصرها، ونورها، وبركتها، وهداها، وأعوذ بك من شر ما فيها وشر ما بعدها.`, 1],
  [`أمسينا على فطرة الإسلام، وعلى كلمة الإخلاص، وعلى دين نبينا محمد ﷺ، وعلى ملة أبينا إبراهيم، حنيفًا مسلمًا وما كان من المشركين.`, 1],
  [`حسبي الله لا إله إلا هو عليه توكلت وهو رب العرش العظيم.`, 7],
  [`اللهم إني أمسيت أشهدك، وأشهد حملة عرشك، وملائكتك، وجميع خلقك، أنك أنت الله لا إله إلا أنت، وحدك لا شريك لك، وأن محمدًا عبدك ورسولك.`, 4],
  [`اللهم أنت ربي لا إله إلا أنت، خلقتني وأنا عبدك، وأنا على عهدك ووعدك ما استطعت، أعوذ بك من شر ما صنعت، أبوء لك بنعمتك علي، وأبوء بذنبي، فاغفر لي فإنه لا يغفر الذنوب إلا أنت. (سيد الاستغفار)`, 1],
  [`اللهم أنت ربي لا إله إلا أنت، عليك توكلت، وأنت رب العرش الكريم، ما شاء الله كان وما لم يشأ لم يكن، ولا حول ولا قوة إلا بالله العلي العظيم، أعلم أن الله على كل شيء قدير، وأن الله قد أحاط بكل شيء علماً، اللهم إني أعوذ بك من شر نفسي، ومن شر كل دابة أنت آخذ بناصيتها، إن ربي على صراط مستقيم.`, 1],
  [`اللهم فاطر السماوات والأرض، عالم الغيب والشهادة، رب كل شيءٍ ومليكه، أعوذ بك من شر نفسي، وشر الشيطان وشِركه، وأن أقترف على نفسي سوءًا، أو أجرّه إلى مسلم.`, 1],
  [`اللهم إني أسألك العفو والعافية في الدنيا والآخرة، اللهم إني أسألك العفو والعافية في ديني ودنياي وأهلي ومالي، اللهم استر عوراتي وآمن روعاتي، اللهم احفظني من بين يدي، ومن خلفي، وعن يميني، وعن شمالي، ومن فوقي، وأعوذ بعظمتك أن أُغتال من تحتي.`, 1],
  [`اللهم إني عبدك (أمتك)، ابن عبدك، ابن أمتك، ناصيتي بيدك، ماضٍ في حكمك، عدل في قضاؤك، أسألك بكل اسم هو لك، سميت به نفسك، أو أنزلته في كتابك، أو علمته أحدًا من خلقك، أو استأثرت به في علم الغيب عندك، أن تجعل القرآن العظيم ربيع قلبي، ونور صدري، وجلاء حزني، وذهاب همي.`, 1],
  [`اللهم إني أعوذ بك من الهم والحزن، وأعوذ بك من العجز والكسل، وأعوذ بك من الجبن والبخل، وأعوذ بك من غلبة الدين وقهر الرجال.`, 3],
  [`اللهم عافني في بدني، اللهم عافني في سمعي، اللهم عافني في بصري، لا إله إلا أنت. اللهم إني أعوذ بك من الكفر والفقر، وأعوذ بك من عذاب القبر، لا إله إلا أنت.`, 3],
  [`اللهم إني أسألك علمًا نافعًا، ورزقًا طيبًا، وعملاً متقبلاً.`, 3],
  [`اللهم لا إله إلا أنت سبحانك إني كنت من الظالمين.`, 1],
  [`يا رب لك الحمد كما ينبغي لجلال وجهك وعظيم سلطانك.`, 3],
  [`بسم الله الذي لا يضر مع اسمه شيء في الأرض ولا في السماء وهو السميع العليم.`, 3],
  [`أعوذ بكلمات الله التامات من شر ما خلق.`, 3],
  [`رضيت بالله ربًا، وبالإسلام دينًا، وبمحمد ﷺ نبيًا.`, 3],
  [`اللهم إني أعوذ بك من الفقر، والقلة، والذلة، وأعوذ بك من أن أظلم أو أُظلم.`, 1],
  [`اللهم إني أعوذ بك أن أُشرك بك شيئًا وأنا أعلمه، وأستغفرك لما لا أعلمه.`, 1],
  [`اللهم أنت خلقتني، وأنت تهديني، وأنت تطعمني وتسقيني، وأنت تميتني وتحييني، يا حي يا قيوم برحمتك أستغيث، أصلح لي شأني كله، ولا تكلني إلى نفسي طرفة عين.`, 3],
  [`سبحان الله وبحمده، عدد خلقه، ورضا نفسه، وزنة عرشه، ومداد كلماته.`, 3],
  [`يا ودود يا ودود، يا ذا العرش المجيد، يا فعّالًا لما يريد، أسألك بنور وجهك الذي أشرقت له الظلمات، وبعزك الذي لا يُرام، وبملكك الذي لا يُضام، أن تكفيني من كل شر، وأن ترزقني من خير الدنيا والآخرة، يا رب العالمين.`, 1],
  [`أستغفر الله وأتوب إليه.`, 100],
  [`لا حول ولا قوة إلا بالله، توكلت على الحي الذي لا يموت، الحمد لله الذي لم يتخذ ولدًا، ولم يكن له شريك في الملك، ولم يكن له وليٌّ من الذل، وكبّره تكبيرًا.`, 10],
  [`أعوذ بكلمات الله التامات التي لا يجاوزهن برٌّ ولا فاجر، من شر ما خلق وذرأ وبرأ، ومن شر ما ينزل من السماء، ومن شر ما يعرج فيها، ومن شر ما ذرأ في الأرض، ومن شر ما يخرج منها، ومن شر فتن الليل والنهار، ومن شر طوارق الليل والنهار، إلا طارقًا يطرق بخير يا رحمن.`, 1],
  [`سبحان الله عدد ما خلق، سبحان الله ملء ما خلق، سبحان الله عدد ما في الأرض والسماء، سبحان الله ملء ما في الأرض والسماء، سبحان الله عدد كل شيء، سبحان الله ملء كل شيء. الحمد لله عدد ما خلق، الحمد لله ملء ما خلق، الحمد لله عدد ما في الأرض والسماء، الحمد لله ملء ما في الأرض والسماء، الحمد لله عدد ما أحصى كتابه، الحمد لله ملء ما أحصى كتابه، الحمد لله عدد كل شيء، الحمد لله ملء كل شيء.`, 1],
  [`لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير.`, 1],
  [`اللهم إني أسألك بأني أشهد أنك أنت الله، لا إله إلا أنت، الأحد الصمد، الذي لم يلد ولم يولد، ولم يكن له كفوًا أحد، أن تحقق لنا ما نتمنى يا رب العالمين.`, 1],
  [`اللهم صل وسلم على نبينا محمد.\n\nأفضل الصيغ:\nاللهم صلِّ على محمدٍ وعلى آل محمدٍ كما صليت على إبراهيم وعلى آل إبراهيم إنك حميدٌ مجيد، وبارك على محمدٍ وعلى آل محمدٍ كما باركت على إبراهيم وعلى آل إبراهيم في العالمين إنك حميدٌ مجيد.`, 500],
  [`سبحان الله وبحمده.`, 100]
];

// ── ضم الأذكار اللي بتتقال مرة واحدة بس مع بعضها في صفحة واحدة، عشان نقلل عدد الصفحات اللي بتتنقل بينها
// (الأذكار اللي عددها أكتر من 1 بتفضل صفحة لوحدها زي ما هي عشان العداد يبقى مظبوط)
function groupSingleAthkar(list) {
  const result = [];
  let buffer = [];
  const flush = () => {
    if (buffer.length) {
      result.push([buffer.join("\n\n· · ·\n\n"), 1]);
      buffer = [];
    }
  };
  list.forEach(([text, count]) => {
    if (count === 1) {
      buffer.push(text);
    } else {
      flush();
      result.push([text, count]);
    }
  });
  flush();
  return result;
}
// ── ضم المعوذتين والإخلاص (الإخلاص + الفلق + الناس) في صفحة واحدة بعددها التلاتة سوا (٣ مرات للمجموعة)
function mergeQulSurahs(list) {
  const isQul = t => t.includes("(سورة الإخلاص)") || t.includes("(سورة الفلق)") || t.includes("(سورة الناس)");
  const result = [];
  let buffer = [];
  list.forEach(([text, count]) => {
    if (isQul(text)) {
      buffer.push(text);
    } else {
      if (buffer.length) { result.push([buffer.join("\n\n· · ·\n\n"), 3]); buffer = []; }
      result.push([text, count]);
    }
  });
  if (buffer.length) result.push([buffer.join("\n\n· · ·\n\n"), 3]);
  return result;
}
const MORNING_ATHKAR_GROUPED = groupSingleAthkar(mergeQulSurahs(MORNING_ATHKAR));
const EVENING_ATHKAR_GROUPED = groupSingleAthkar(mergeQulSurahs(EVENING_ATHKAR));

// ── أذكار النوم
const SLEEP_ATHKAR = [
  [`بِاسْمِكَ رَبِّي وَضَعْتُ جَنْبِي، وَبِكَ أَرْفَعُهُ، فَإِنْ أَمْسَكْتَ نَفْسِي فَارْحَمْهَا، وَإِنْ أَرْسَلْتَهَا فَاحْفَظْهَا بِمَا تَحْفَظُ بِهِ عِبَادَكَ الصَّالِحِينَ.`, 1],
  [`اللَّهُمَّ إِنَّكَ خَلَقْتَ نَفْسِي وَأَنْتَ تَوَفَّاهَا، لَكَ مَمَاتُهَا وَمَحْيَاهَا، إِنْ أَحْيَيْتَهَا فَاحْفَظْهَا، وَإِنْ أَمَتَّهَا فَاغْفِرْ لَهَا، اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَافِيَةَ.`, 1],
  [`اللَّهُمَّ عَالِمَ الْغَيْبِ وَالشَّهَادَةِ فَاطِرَ السَّمَاوَاتِ وَالْأَرْضِ رَبَّ كُلِّ شَيْءٍ وَمَلِيكَهُ، أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا أَنْتَ، أَعُوذُ بِكَ مِنْ شَرِّ نَفْسِي وَمِنْ شَرِّ الشَّيْطَانِ وَشِرْكِهِ.`, 1],
  [`اللَّهُمَّ رَبَّ النَّبِيِّ مُحَمَّدٍ اغْفِرْ لِي ذَنْبِي، وَأَذْهِبْ غَيْظَ قَلْبِي، وَأَجِرْنِي مِنْ مُضِلَّاتِ الْفِتَنِ مَا أَحْيَيْتَنِي.`, 1],
  [`اللَّهُ لاَ إِلَهَ إِلاَّ هُوَ الْحَيُّ الْقَيُّومُ لاَ تَأْخُذُهُ سِنَةٌ وَلاَ نَوْمٌ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الأَرْضِ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلاَّ بِإِذْنِهِ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ وَلاَ يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلاَّ بِمَا شَاء وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالأَرْضَ وَلاَ يَؤُودُهُ حِفْظُهُمَا وَهُوَ الْعَلِيُّ الْعَظِيمُ. (آية الكرسي، من قرأها عند نومه لم يزل عليه من الله حافظ ولا يقربه شيطان حتى يصبح)`, 1],
  [`آمَنَ الرَّسُولُ بِمَا أُنزِلَ إِلَيْهِ مِن رَّبِّهِ وَالْمُؤْمِنُونَ ۚ كُلٌّ آمَنَ بِاللَّهِ وَمَلَائِكَتِهِ وَكُتُبِهِ وَرُسُلِهِ ... إلى آخر السورة. (آخر آيتين من سورة البقرة، من قرأهما في ليلة كفتاه)`, 1],
  [`قُلْ هُوَ اللَّهُ أَحَدٌ * اللَّهُ الصَّمَدُ * لَمْ يَلِدْ وَلَمْ يُولَدْ * وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ.\n\n· · ·\n\nقُلْ أَعُوذُ بِرَبِّ الْفَلَقِ * مِنْ شَرِّ مَا خَلَقَ * وَمِنْ شَرِّ غَاسِقٍ إِذَا وَقَبَ * وَمِنْ شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ * وَمِنْ شَرِّ حَاسِدٍ إِذَا حَسَدَ.\n\n· · ·\n\nقُلْ أَعُوذُ بِرَبِّ النَّاسِ * مَلِكِ النَّاسِ * إِلَهِ النَّاسِ * مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ * الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ * مِنَ الْجِنَّةِ وَالنَّاسِ.\n\n(تُقرأ ثلاث مرات، ثم يُنفث في الكفين ويُمسح بهما ما استطاع من الجسد، بدءاً بالرأس والوجه)`, 3],
  [`سبحان الله (٣٣ مرة)، الحمد لله (٣٣ مرة)، الله أكبر (٣٤ مرة). (تسبيح فاطمة رضي الله عنها عند النوم)`, 1],
  [`باسمك اللهم أموت وأحيا.`, 1],
  [`اللهم قني عذابك يوم تبعث عبادك.`, 3],
  [`اللهم أسلمت نفسي إليك، وفوضت أمري إليك، وألجأت ظهري إليك، رغبة ورهبة إليك، لا ملجأ ولا منجى منك إلا إليك، آمنت بكتابك الذي أنزلت، وبنبيك الذي أرسلت.`, 1],
  [`الحمد لله الذي أطعمنا وسقانا، وكفانا وآوانا، فكم ممن لا كافي له ولا مؤوي.`, 1],
  [`اللهم رب السماوات السبع وما أظللن، ورب الأرضين وما أقللن، ورب الشياطين وما أضللن، كن لي جاراً من شرهم جميعاً، أن يفرط علي أحد منهم أو يطغى، عز جارك، وجل ثناؤك، ولا إله غيرك.`, 1]
];
// ── أذكار بعد الصلاة (تُقال عقب كل صلاة مكتوبة، قبل الانصراف)
const AFTER_PRAYER_ATHKAR = [
  [`أَسْتَغْفِرُ اللَّهَ (ثلاث مرات)، اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ، تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ.`, 1],
  [`لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، اللَّهُمَّ لَا مَانِعَ لِمَا أَعْطَيْتَ، وَلَا مُعْطِيَ لِمَا مَنَعْتَ، وَلَا يَنْفَعُ ذَا الْجَدِّ مِنْكَ الْجَدُّ.`, 1],
  [`لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ، لَا إِلَهَ إِلَّا اللَّهُ، وَلَا نَعْبُدُ إِلَّا إِيَّاهُ، لَهُ النِّعْمَةُ وَلَهُ الْفَضْلُ وَلَهُ الثَّنَاءُ الْحَسَنُ، لَا إِلَهَ إِلَّا اللَّهُ مُخْلِصِينَ لَهُ الدِّينَ وَلَوْ كَرِهَ الْكَافِرُونَ.`, 1],
  [`اللَّهُ لاَ إِلَهَ إِلاَّ هُوَ الْحَيُّ الْقَيُّومُ لاَ تَأْخُذُهُ سِنَةٌ وَلاَ نَوْمٌ ۚ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الأَرْضِ ۗ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلاَّ بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلاَ يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلاَّ بِمَا شَاء ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالأَرْضَ ۖ وَلاَ يَؤُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ. (آية الكرسي)`, 1],
  [`قُلْ هُوَ اللَّهُ أَحَدٌ * اللَّهُ الصَّمَدُ * لَمْ يَلِدْ وَلَمْ يُولَدْ * وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ.\n\n· · ·\n\nقُلْ أَعُوذُ بِرَبِّ الْفَلَقِ * مِنْ شَرِّ مَا خَلَقَ * وَمِنْ شَرِّ غَاسِقٍ إِذَا وَقَبَ * وَمِنْ شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ * وَمِنْ شَرِّ حَاسِدٍ إِذَا حَسَدَ.\n\n· · ·\n\nقُلْ أَعُوذُ بِرَبِّ النَّاسِ * مَلِكِ النَّاسِ * إِلَهِ النَّاسِ * مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ * الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ * مِنَ الْجِنَّةِ وَالنَّاسِ. (تُقرأ بعد صلاتي الفجر والمغرب ثلاث مرات، وباقي الصلوات مرة واحدة)`, 1],
  [`سُبْحَانَ اللَّهِ (٣٣ مرة)، وَالْحَمْدُ لِلَّهِ (٣٣ مرة)، وَاللَّهُ أَكْبَرُ (٣٣ مرة)، ثم تمام المائة: لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ.`, 1],
  [`اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ.`, 1],
  [`رَبِّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ. (تُقال بعد صلاة المغرب والفجر ثلاث مرات)`, 3]
];
// ── أذكار الأحوال اليومية (اللباس، الطعام، السفر، دخول المنزل وخروجه، الخلاء)
const DAILY_LIFE_ATHKAR = {
  dressing: {
    title: "أذكار اللباس", ic: "👕",
    list: [
      [`بِسْمِ اللَّهِ. (تُقال عند بداية اللبس، ويُبدأ باليمين)`, 1],
      [`الْحَمْدُ لِلَّهِ الَّذِي كَسَانِي هَذَا (الثَّوْبَ) وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ.`, 1],
      [`اللَّهُمَّ لَكَ الْحَمْدُ أَنْتَ كَسَوْتَنِيهِ، أَسْأَلُكَ مِنْ خَيْرِهِ وَخَيْرِ مَا صُنِعَ لَهُ، وَأَعُوذُ بِكَ مِنْ شَرِّهِ وَشَرِّ مَا صُنِعَ لَهُ. (عند لبس ثوب جديد)`, 1]
    ]
  },
  food: {
    title: "أذكار الطعام", ic: "🍽️",
    list: [
      [`بِسْمِ اللَّهِ. (قبل الأكل، ولو نسيتها في الأول قل: بِسْمِ اللَّهِ أَوَّلَهُ وَآخِرَهُ)`, 1],
      [`الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنِي هَذَا، وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ. (بعد الأكل)`, 1],
      [`الْحَمْدُ لِلَّهِ حَمْدًا كَثِيرًا طَيِّبًا مُبَارَكًا فِيهِ غَيْرَ مَكْفِيٍّ وَلَا مُوَدَّعٍ وَلَا مُسْتَغْنًى عَنْهُ رَبَّنَا. (بعد الأكل)`, 1]
    ]
  },
  travel: {
    title: "أذكار السفر", ic: "🧳",
    list: [
      [`اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ، وَإِنَّا إِلَى رَبِّنَا لَمُنقَلِبُونَ، اللَّهُمَّ إِنَّا نَسْأَلُكَ فِي سَفَرِنَا هَذَا الْبِرَّ وَالتَّقْوَى، وَمِنَ الْعَمَلِ مَا تَرْضَى، اللَّهُمَّ هَوِّنْ عَلَيْنَا سَفَرَنَا هَذَا وَاطْوِ عَنَّا بُعْدَهُ، اللَّهُمَّ أَنْتَ الصَّاحِبُ فِي السَّفَرِ، وَالْخَلِيفَةُ فِي الْأَهْلِ، اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ وَعْثَاءِ السَّفَرِ، وَكَآبَةِ الْمَنْظَرِ، وَسُوءِ الْمُنْقَلَبِ فِي الْمَالِ وَالْأَهْلِ. (دعاء السفر)`, 1],
      [`آيِبُونَ تَائِبُونَ عَابِدُونَ لِرَبِّنَا حَامِدُونَ. (عند الرجوع من السفر، تُضاف لدعاء السفر)`, 1]
    ]
  },
  enterHome: {
    title: "دخول المنزل", ic: "🏠",
    list: [[`بِسْمِ اللَّهِ وَلَجْنَا، وَبِسْمِ اللَّهِ خَرَجْنَا، وَعَلَى رَبِّنَا تَوَكَّلْنَا، ثُمَّ يُسَلِّمُ عَلَى أَهْلِهِ.`, 1]]
  },
  leaveHome: {
    title: "الخروج من المنزل", ic: "🚪",
    list: [[`بِسْمِ اللَّهِ، تَوَكَّلْتُ عَلَى اللَّهِ، وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ، اللَّهُمَّ إِنِّي أَعُوذُ بِكَ أَنْ أَضِلَّ أَوْ أُضَلَّ، أَوْ أَزِلَّ أَوْ أُزَلَّ، أَوْ أَظْلِمَ أَوْ أُظْلَمَ، أَوْ أَجْهَلَ أَوْ يُجْهَلَ عَلَيَّ.`, 1]]
  },
  toilet: {
    title: "دخول الخلاء والخروج منه", ic: "🚽",
    list: [
      [`بِسْمِ اللَّهِ، اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْخُبُثِ وَالْخَبَائِثِ. (عند الدخول)`, 1],
      [`غُفْرَانَكَ. (عند الخروج)`, 1]
    ]
  },
  wakeUp: {
    title: "الاستيقاظ من النوم", ic: "⏰",
    list: [
      [`الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ.`, 1]
    ]
  },
  wudu: {
    title: "الوضوء", ic: "💧",
    list: [
      [`بِسْمِ اللَّهِ. (قبل الوضوء)`, 1],
      [`أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ. اللَّهُمَّ اجْعَلْنِي مِنَ التَّوَّابِينَ وَاجْعَلْنِي مِنَ الْمُتَطَهِّرِينَ. (بعد الوضوء)`, 1]
    ]
  },
  mosque: {
    title: "المسجد", ic: "🕌",
    list: [
      [`بِسْمِ اللَّهِ وَالصَّلَاةُ وَالسَّلَامُ عَلَى رَسُولِ اللَّهِ، اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ. (عند دخول المسجد)`, 1],
      [`بِسْمِ اللَّهِ وَالصَّلَاةُ وَالسَّلَامُ عَلَى رَسُولِ اللَّهِ، اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ. (عند الخروج من المسجد)`, 1]
    ]
  },
  adhan: {
    title: "سماع الأذان", ic: "📢",
    list: [
      [`يُقال مثل ما يقول المؤذن، إلا عند «حيّ على الصلاة» و«حيّ على الفلاح» فتقول: لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ.`, 1],
      [`وَأَنَا أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، وَأَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ، رَضِيتُ بِاللَّهِ رَبًّا، وَبِمُحَمَّدٍ رَسُولًا، وَبِالْإِسْلَامِ دِينًا. (بعد الشهادتين)`, 1],
      [`اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ ﷺ، ثم قُل: اللَّهُمَّ رَبَّ هَذِهِ الدَّعْوَةِ التَّامَّةِ وَالصَّلَاةِ الْقَائِمَةِ، آتِ مُحَمَّدًا الْوَسِيلَةَ وَالْفَضِيلَةَ، وَابْعَثْهُ مَقَامًا مَحْمُودًا الَّذِي وَعَدْتَهُ. (بعد انتهاء الأذان)`, 1]
    ]
  },
  distress: {
    title: "الهم والحزن والكرب", ic: "🤍",
    list: [
      [`اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَالْعَجْزِ وَالْكَسَلِ، وَالْبُخْلِ وَالْجُبْنِ، وَضَلَعِ الدَّيْنِ وَغَلَبَةِ الرِّجَالِ.`, 1],
      [`لَا إِلَهَ إِلَّا اللَّهُ الْعَظِيمُ الْحَلِيمُ، لَا إِلَهَ إِلَّا اللَّهُ رَبُّ الْعَرْشِ الْعَظِيمِ، لَا إِلَهَ إِلَّا اللَّهُ رَبُّ السَّمَاوَاتِ وَرَبُّ الْأَرْضِ وَرَبُّ الْعَرْشِ الْكَرِيمِ. (دعاء الكرب)`, 1],
      [`اللَّهُمَّ رَحْمَتَكَ أَرْجُو فَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ، وَأَصْلِحْ لِي شَأْنِي كُلَّهُ، لَا إِلَهَ إِلَّا أَنْتَ.`, 3],
      [`لَا إِلَهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ. (دعاء ذي النون)`, 1]
    ]
  },
  sickVisit: {
    title: "المرض وعيادة المريض", ic: "🩺",
    list: [
      [`أَذْهِبِ الْبَاسَ رَبَّ النَّاسِ، اشْفِ أَنْتَ الشَّافِي، لَا شِفَاءَ إِلَّا شِفَاؤُكَ، شِفَاءً لَا يُغَادِرُ سَقَمًا. (للمريض)`, 1],
      [`لَا بَأْسَ طَهُورٌ إِنْ شَاءَ اللَّهُ. (عند زيارة المريض)`, 1],
      [`أَسْأَلُ اللَّهَ الْعَظِيمَ رَبَّ الْعَرْشِ الْعَظِيمِ أَنْ يَشْفِيَكَ. (سبع مرات عند زيارة مريض لم يحضر أجله)`, 7]
    ]
  },
  rain: {
    title: "المطر", ic: "🌧️",
    list: [
      [`اللَّهُمَّ صَيِّبًا نَافِعًا. (عند نزول المطر)`, 3],
      [`مُطِرْنَا بِفَضْلِ اللَّهِ وَرَحْمَتِهِ. (بعد نزول المطر)`, 1]
    ]
  }
};
const AFTER_PRAYER_ATHKAR_GROUPED = groupSingleAthkar(AFTER_PRAYER_ATHKAR);
const DAILY_LIFE_ATHKAR_GROUPED = Object.fromEntries(
  Object.entries(DAILY_LIFE_ATHKAR).map(([k, v]) => [k, { ...v, list: groupSingleAthkar(v.list) }])
);
// ── أذكار قبل الصلاة (بعد الأذان وبين الأذان والإقامة)
const BEFORE_PRAYER_ATHKAR = [
  [`اللهم رب هذه الدعوة التامة والصلاة القائمة، آت محمداً الوسيلة والفضيلة، وابعثه مقاماً محموداً الذي وعدته. (دعاء بعد سماع الأذان)`, 1],
  [`من قال حين يسمع المؤذن: أشهد أن لا إله إلا الله وحده لا شريك له، وأن محمداً عبده ورسوله، رضيت بالله رباً، وبمحمد رسولاً، وبالإسلام ديناً — غفر له ذنبه.`, 1],
  [`الدعاء بين الأذان والإقامة لا يُرد، فأكثروا فيه من الدعاء بما شئتم من خيري الدنيا والآخرة.`, 1],
  [`اللهم اجعل في قلبي نوراً، وفي بصري نوراً، وفي سمعي نوراً، وعن يميني نوراً، وعن يساري نوراً، وفوقي نوراً، وتحتي نوراً، وأمامي نوراً، وخلفي نوراً، واجعل لي نوراً. (دعاء الذهاب إلى المسجد)`, 1],
  [`أعوذ بالله العظيم، وبوجهه الكريم، وسلطانه القديم، من الشيطان الرجيم.\n\nبسم الله، والصلاة والسلام على رسول الله، اللهم افتح لي أبواب رحمتك. (دعاء دخول المسجد)`, 1],
  [`اللهم أقمها وأدمها، واجعلني من صالحي أهلها. (عند سماع الإقامة، بعد ترديد ألفاظها كما يقولها المقيم، إلا في «قد قامت الصلاة»)`, 1]
];
const SLEEP_ATHKAR_GROUPED = groupSingleAthkar(SLEEP_ATHKAR);
const BEFORE_PRAYER_ATHKAR_GROUPED = groupSingleAthkar(BEFORE_PRAYER_ATHKAR);


// ══════════════════════════════════════════════════════════════
// ATHKAR READER — عرض الذكر الحالي مع عداد تفاعلي
// ══════════════════════════════════════════════════════════════
// ── لما الأذكار تخلص، بيتسجل تلقائي في "محاسبة النفس اليومية" عند محمد وضحي (لو البند موجود ولسه مش متعلّم)
function markAthkarInDailyGoals(itemText) {
  const today = DK();
  [
    { dailyPrefix: "mh_daily_", defsKey: "mh_check_defs", fallbackDefs: CHECK_DEF },
    { dailyPrefix: "dh_daily_", defsKey: "dh_check_defs", fallbackDefs: DUHA_CHECK_DEF_DEFAULT }
  ].forEach(({ dailyPrefix, defsKey, fallbackDefs }) => {
    const dailyKey = dailyPrefix + today;
    let list = ld(dailyKey, null);
    if (!list) {
      const defs = ld(defsKey, fallbackDefs);
      list = defs.map((t, i) => ({ id: i, t, done: false }));
    }
    const idx = list.findIndex(x => x.t === itemText);
    if (idx === -1 || list[idx].done) return;
    const updated = list.map((x, i) => i === idx ? { ...x, done: true } : x);
    sv(dailyKey, updated);
  });
}

function AthkarReader({ list, storageKey }) {
  // ── الحفظ يومي: كل يوم بيبدأ من صفر، لكن لو قفلت التطبيق في نفس اليوم بيرجعلك من نفس المكان
  // العدّ بقى محفوظ لكل ذكر لوحده (counts) عشان التنقل يمين/شمال ميصفرش العدّ اللي وصلتله
  const dayKey = storageKey + "_" + DK();
  const loadState = () => ld(dayKey, { idx: 0, counts: {}, done: false });
  const [idx, setIdx] = useState(() => loadState().idx);
  const [counts, setCounts] = useState(() => loadState().counts || {});
  const [done, setDone] = useState(() => loadState().done || false);
  useEffect(() => { svLocal(dayKey, { idx, counts, done }); }, [idx, counts, done, dayKey]);

  const restart = () => { idxRef.current = 0; doneRef.current = false; setIdx(0); setCounts({}); setDone(false); };

  const item = list[idx];
  const target = item ? item[1] : 1;
  const text = item ? item[0] : "";
  const count = counts[idx] || 0;

  // ── doTap بيقرا الـ idx دايمًا من الـ ref (مش من الـ closure) عشان أي استدعاء متأخر
  // ميفضلش شغال على رقم قديم بعد ما ننقل للذكر اللي بعده
  const idxRef = useRef(idx);
  useEffect(() => { idxRef.current = idx; }, [idx]);
  const doneRef = useRef(done);
  useEffect(() => { doneRef.current = done; }, [done]);

  const doTap = () => {
    if (doneRef.current) return;
    const curIdx = idxRef.current;
    const curItem = list[curIdx];
    const curTarget = curItem ? curItem[1] : 1;
    setCounts(prev => {
      const cur = prev[curIdx] || 0;
      // لو رجعت بالسحب لذكر خلصان بالفعل ودست عليه، منزودش العدّ تاني، بس ننقلك للذكر الناقص اللي بعده على طول
      if (cur >= curTarget) {
        const allDone = list.every((it, i) => (prev[i] || 0) >= it[1]);
        if (allDone) {
          doneRef.current = true;
          setDone(true);
        } else {
          let nextMissing = -1;
          for (let i = curIdx + 1; i < list.length; i++) { if ((prev[i] || 0) < list[i][1]) { nextMissing = i; break; } }
          if (nextMissing === -1) { for (let i = 0; i < list.length; i++) { if ((prev[i] || 0) < list[i][1]) { nextMissing = i; break; } } }
          if (nextMissing !== -1) { idxRef.current = nextMissing; setIdx(nextMissing); }
        }
        return prev;
      }
      const next = cur + 1;
      const updated = { ...prev, [curIdx]: next };
      if (next >= curTarget) {
        // "خلصت الأذكار" لازم تبقى معناها كل ذكر وصل لعدده فعلاً — مش بس إن آخر واحد في الترتيب خلص
        // (عشان لو حد اتصفح بالسحب لآخر ذكر ودوس عليه لوحده، متتسجلش كأنه خلص كل حاجة)
        const allDone = list.every((it, i) => (updated[i] || 0) >= it[1]);
        if (allDone) {
          doneRef.current = true;
          setDone(true);
        } else {
          // نلاقي أقرب ذكر لسه ناقص وننقل له (يبدأ من اللي بعد الحالي، ولو معلقاش يدور من الأول)
          let nextMissing = -1;
          for (let i = curIdx + 1; i < list.length; i++) { if ((updated[i] || 0) < list[i][1]) { nextMissing = i; break; } }
          if (nextMissing === -1) { for (let i = 0; i < list.length; i++) { if ((updated[i] || 0) < list[i][1]) { nextMissing = i; break; } } }
          if (nextMissing !== -1) { idxRef.current = nextMissing; setIdx(nextMissing); }
        }
      }
      return updated;
    });
  };

  // ── لما الأذكار تخلص، بيتسجل تلقائي في "محاسبة النفس اليومية" عند محمد وضحي (بند اذكار الصباح/المساء)
  useEffect(() => {
    if (done) markAthkarInDailyGoals(storageKey.includes("evening") ? "اذكار المساء" : "اذكار الصباح");
  }, [done, storageKey]);

  // ── التنقل اليدوي (أسهم قديمة/سحب) ما بيصفرش العدّ، كل ذكر فاكر عدّه لوحده
  const goPrev = () => {
    if (idx === 0) return;
    setIdx(idx - 1);
    setDone(false);
  };
  const goNext = () => {
    if (idx >= list.length - 1) return;
    setIdx(idx + 1);
    setDone(false);
  };

  // ── السحب يمين/شمال للتنقل بين الأذكار
  const touchRef = useRef({ x: 0, y: 0 });
  const onTouchStart = e => { touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const onTouchEnd = e => {
    const dx = e.changedTouches[0].clientX - touchRef.current.x;
    const dy = e.changedTouches[0].clientY - touchRef.current.y;
    if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy)) return; // مش سحبة أفقية واضحة
    if (dx < 0) goPrev(); else goNext();
  };

  if (done) {
    return /*#__PURE__*/React.createElement("div", {
      style: { textAlign: "center", padding: "50px 20px" }
    },
      /*#__PURE__*/React.createElement("div", { style: { fontSize: 46, marginBottom: 14 } }, "✅"),
      /*#__PURE__*/React.createElement("div", { style: { fontSize: 16, fontWeight: 900, color: T.green, marginBottom: 8 } }, "تقبل الله منك"),
      /*#__PURE__*/React.createElement("div", { style: { fontSize: 12, color: "#4a6080", marginBottom: 20 } }, "خلصت كل الأذكار"),
      /*#__PURE__*/React.createElement("button", {
        onClick: restart,
        style: { ...S.btn(T.blue), width: "auto", padding: "10px 22px" }
      }, "🔁 ابدأ تاني")
    );
  }

  return /*#__PURE__*/React.createElement("div", {
    style: { padding: "14px 4px" },
    onTouchStart: onTouchStart,
    onTouchEnd: onTouchEnd
  },
    /*#__PURE__*/React.createElement("div", {
      style: { fontSize: 11, color: "#4a6080", textAlign: "center", marginBottom: 10, fontWeight: 700 }
    }, (idx + 1) + " / " + list.length),
    /*#__PURE__*/React.createElement("div", {
      style: {
        background: T.card, border: `1px solid ${T.bdr}`, borderRadius: 14,
        padding: "20px 16px", minHeight: 160, display: "flex", alignItems: "center",
        justifyContent: "center", marginBottom: 22
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: { fontSize: 15, lineHeight: 2.1, color: "#e2e8f0", whiteSpace: "pre-wrap", textAlign: "center" }
    }, text)),
    /*#__PURE__*/React.createElement("div", {
      style: { display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }
    },
      /*#__PURE__*/React.createElement("button", {
        onClick: doTap,
        style: {
          width: 132, height: 132, borderRadius: "50%",
          background: `conic-gradient(${T.blue} ${Math.min(100, Math.round(count/target*100))}%, ${T.card} 0)`,
          border: `3px solid ${T.bdr}`, display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", flexShrink: 0, userSelect: "none", WebkitUserSelect: "none", touchAction: "manipulation"
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: { width: 110, height: 110, borderRadius: "50%", background: T.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }
      },
        /*#__PURE__*/React.createElement("div", { style: { fontSize: 30, fontWeight: 900, color: "#fff" } }, count),
        /*#__PURE__*/React.createElement("div", { style: { fontSize: 11, color: "#4a6080" } }, "من " + target)
      ))
    )
  );
}

// ══════════════════════════════════════════════════════════════
// ثواب/فضل مختصر لبعض الأذكار المعروفة — بيتضاف بس لو النص متطابق مع
// ذكر معروف فضله ثابت وموثّق، تحرزًا من اختراع فضل غير صحيح
// ══════════════════════════════════════════════════════════════
const ATHKAR_THAWAB = [
  [/آية الكرسي/, "من قالها حين يصبح أو يمسي أجير من الجن حتى يمسي أو يصبح، ومن قالها دبر كل صلاة لم يمنعه من دخول الجنة إلا أن يموت"],
  [/سورة الإخلاص/, "من قرأ قل هو الله أحد والمعوذتين حين يصبح وحين يمسي ثلاث مرات كفتاه من كل شيء"],
  [/حسبي الله لا إله إلا هو/, "من قالها سبع مرات حين يصبح وحين يمسي كفاه الله ما أهمه من أمر الدنيا والآخرة"],
  [/سيد الاستغفار/, "من قالها موقنًا بها حين يمسي فمات في ليلته دخل الجنة، وكذلك حين يصبح"],
  [/أستغفر الله وأتوب إليه/, "من لزم الاستغفار جعل الله له من كل همٍّ فرجًا، ومن كل ضيق مخرجًا، ورزقه من حيث لا يحتسب"],
  [/زنة عرشه، ومداد كلماته/, "من أحب الكلام إلى الله: سبحان الله وبحمده، وهي كلمة خفيفة على اللسان ثقيلة في الميزان"],
  [/لا إله إلا الله وحده لا شريك له، له الملك وله الحمد/, "من قالها عشر مرات كان كمن أعتق أربعة أنفس من ولد إسماعيل"],
  [/رضيت بالله رب/, "من قالها حين يصبح وحين يمسي كان حقًا على الله أن يُرضيه يوم القيامة"],
  [/بسم الله الذي لا يضر مع اسمه شي/, "من قالها ثلاث مرات حين يصبح وحين يمسي لم يضره شيء"],
  [/اللهم صل.{0,5}على محمد.{0,20}كما صليت على ابراهيم|اللهم صلِّ على محمدٍ وعلى آل محمدٍ كما صليت على إبراهيم/, "من صلى على النبي ﷺ صلاة واحدة صلى الله عليه بها عشرًا"],
  [/اللهم إني أسألك العفو والعافية/, "العفو والعافية من أجمع ما يُسأل الله إياه، كما أوصى النبي ﷺ عمه العباس أن يسألهما لدنياه وآخرته"],
  [/اللَّهُمَّ اهْدِنِي فِيمَنْ هَدَيْتَ/, "علّمه النبي ﷺ للحسن بن علي رضي الله عنهما ليدعو به في قنوت الوتر"],
  [/أعوذ بكلمات الله التامات من شر ما خلق/, "من قالها حين يمسي لم تضره حُمَة (لدغة) تلك الليلة"],
  [/اللهم عافني في بدني/, "من المداومة على سؤال الله العافية في البدن والسمع والبصر"]
];
function thawabFor(text) {
  for (const [re, t] of ATHKAR_THAWAB) { if (re.test(text)) return t; }
  return null;
}

// ══════════════════════════════════════════════════════════════
// AthkarListPlayer — عرض كل الأذكار في صفحة طولية ورا بعض؛ كل ذكر بيختفي
// لما تخلّص تكراره المطلوب، والي بعده يطلع مكانه تلقائيًا
// ══════════════════════════════════════════════════════════════
function AthkarListPlayer({ list, storageKey }) {
  const dayKey = storageKey + "_" + DK();
  const loadState = () => ld(dayKey, { counts: {}, done: false });
  const [counts, setCounts] = useState(() => loadState().counts || {});
  const [done, setDone] = useState(() => loadState().done || false);
  useEffect(() => { svLocal(dayKey, { counts, done }); }, [counts, done, dayKey]);

  const restart = () => { setCounts({}); setDone(false); };

  const bump = i => {
    setCounts(prev => {
      const cur = prev[i] || 0;
      const target = list[i][1];
      if (cur >= target) return prev;
      const next = { ...prev, [i]: cur + 1 };
      const allDone = list.every((it, idx) => (next[idx] || 0) >= it[1]);
      if (allDone) setDone(true);
      return next;
    });
  };

  useEffect(() => {
    if (done) markAthkarInDailyGoals(storageKey.includes("evening") ? "اذكار المساء" : "اذكار الصباح");
  }, [done, storageKey]);

  if (done) {
    return E("div", { style: { textAlign: "center", padding: "50px 20px" } },
      E("div", { style: { fontSize: 46, marginBottom: 14 } }, "✅"),
      E("div", { style: { fontSize: 16, fontWeight: 900, color: T.green, marginBottom: 8 } }, "تقبل الله منك"),
      E("div", { style: { fontSize: 12, color: "#4a6080", marginBottom: 20 } }, "خلصت كل الأذكار"),
      E("button", { onClick: restart, style: { ...S.btn(T.blue), width: "auto", padding: "10px 22px" } }, "🔁 ابدأ تاني")
    );
  }

  const remaining = list.map((item, i) => ({ item, i })).filter(({ item, i }) => (counts[i] || 0) < item[1]);
  const doneCount = list.length - remaining.length;

  return E("div", { style: { padding: "10px 4px 30px" } },
    E("div", { style: { fontSize: 11, color: "#4a6080", textAlign: "center", marginBottom: 12, fontWeight: 700 } },
      "تم " + toArabicDigits(doneCount) + " من " + toArabicDigits(list.length)),
    remaining.map(({ item, i }) => {
      const [text, target] = item;
      const count = counts[i] || 0;
      const thawab = thawabFor(text);
      const pct = Math.min(100, Math.round(count / target * 100));
      return E("div", {
        key: i,
        style: { background: T.card, border: `1px solid ${T.bdr}`, borderRadius: 14, padding: "16px 14px", marginBottom: 12 }
      },
        E("div", { style: { fontSize: 14.5, lineHeight: 2, color: "#e2e8f0", whiteSpace: "pre-wrap", textAlign: "center", marginBottom: thawab ? 10 : 14 } }, text),
        thawab && E("div", {
          style: { fontSize: 10.5, color: "#7aa3d4", background: "#1a2840", borderRadius: 9, padding: "7px 10px", marginBottom: 14, lineHeight: 1.7, textAlign: "center" }
        }, "✨ ", thawab),
        E("button", {
          onClick: () => bump(i),
          style: {
            width: "100%", border: "none", borderRadius: 11, padding: "12px", cursor: "pointer",
            fontFamily: "'Cairo',sans-serif", fontSize: 14, fontWeight: 900, color: "#f1f5f9",
            background: `linear-gradient(90deg, ${T.blue} ${pct}%, #16233a ${pct}%)`,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8
          }
        }, "تكرار", E("span", { style: { background: "rgba(255,255,255,.18)", borderRadius: 999, padding: "2px 10px", fontSize: 12 } }, toArabicDigits(count) + " / " + toArabicDigits(target)))
      );
    })
  );
}

// ══════════════════════════════════════════════════════════════
// ATHKAR SCREEN — تبويب الصباح/المساء
// ══════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════
// QURAN INDEX DATA — فهرس السور (رقم، اسم، عدد الآيات، مكية/مدنية)
// ══════════════════════════════════════════════════════════════
const QURAN_SURAHS = [
  [1,"الفاتحة",7,"مكية",1],[2,"البقرة",286,"مدنية",2],[3,"آل عمران",200,"مدنية",50],[4,"النساء",176,"مدنية",77],
  [5,"المائدة",120,"مدنية",106],[6,"الأنعام",165,"مكية",128],[7,"الأعراف",206,"مكية",151],[8,"الأنفال",75,"مدنية",177],
  [9,"التوبة",129,"مدنية",187],[10,"يونس",109,"مكية",208],[11,"هود",123,"مكية",221],[12,"يوسف",111,"مكية",235],
  [13,"الرعد",43,"مدنية",249],[14,"إبراهيم",52,"مكية",255],[15,"الحجر",99,"مكية",262],[16,"النحل",128,"مكية",267],
  [17,"الإسراء",111,"مكية",282],[18,"الكهف",110,"مكية",293],[19,"مريم",98,"مكية",305],[20,"طه",135,"مكية",312],
  [21,"الأنبياء",112,"مكية",322],[22,"الحج",78,"مدنية",332],[23,"المؤمنون",118,"مكية",342],[24,"النور",64,"مدنية",350],
  [25,"الفرقان",77,"مكية",359],[26,"الشعراء",227,"مكية",367],[27,"النمل",93,"مكية",377],[28,"القصص",88,"مكية",385],
  [29,"العنكبوت",69,"مكية",396],[30,"الروم",60,"مكية",404],[31,"لقمان",34,"مكية",411],[32,"السجدة",30,"مكية",415],
  [33,"الأحزاب",73,"مدنية",418],[34,"سبأ",54,"مكية",428],[35,"فاطر",45,"مكية",434],[36,"يس",83,"مكية",440],
  [37,"الصافات",182,"مكية",446],[38,"ص",88,"مكية",453],[39,"الزمر",75,"مكية",458],[40,"غافر",85,"مكية",467],
  [41,"فصلت",54,"مكية",477],[42,"الشورى",53,"مكية",483],[43,"الزخرف",89,"مكية",489],[44,"الدخان",59,"مكية",496],
  [45,"الجاثية",37,"مكية",499],[46,"الأحقاف",35,"مكية",502],[47,"محمد",38,"مدنية",507],[48,"الفتح",29,"مدنية",511],
  [49,"الحجرات",18,"مدنية",515],[50,"ق",45,"مكية",518],[51,"الذاريات",60,"مكية",520],[52,"الطور",49,"مكية",523],
  [53,"النجم",62,"مكية",526],[54,"القمر",55,"مكية",528],[55,"الرحمن",78,"مدنية",531],[56,"الواقعة",96,"مكية",534],
  [57,"الحديد",29,"مدنية",537],[58,"المجادلة",22,"مدنية",542],[59,"الحشر",24,"مدنية",545],[60,"الممتحنة",13,"مدنية",549],
  [61,"الصف",14,"مدنية",551],[62,"الجمعة",11,"مدنية",553],[63,"المنافقون",11,"مدنية",554],[64,"التغابن",18,"مدنية",556],
  [65,"الطلاق",12,"مدنية",558],[66,"التحريم",12,"مدنية",560],[67,"الملك",30,"مكية",562],[68,"القلم",52,"مكية",564],
  [69,"الحاقة",52,"مكية",566],[70,"المعارج",44,"مكية",568],[71,"نوح",28,"مكية",570],[72,"الجن",28,"مكية",572],
  [73,"المزمل",20,"مكية",574],[74,"المدثر",56,"مكية",575],[75,"القيامة",40,"مكية",577],[76,"الإنسان",31,"مدنية",578],
  [77,"المرسلات",50,"مكية",580],[78,"النبأ",40,"مكية",582],[79,"النازعات",46,"مكية",583],[80,"عبس",42,"مكية",585],
  [81,"التكوير",29,"مكية",586],[82,"الإنفطار",19,"مكية",587],[83,"المطففين",36,"مكية",587],[84,"الإنشقاق",25,"مكية",589],
  [85,"البروج",22,"مكية",590],[86,"الطارق",17,"مكية",591],[87,"الأعلى",19,"مكية",591],[88,"الغاشية",26,"مكية",592],
  [89,"الفجر",30,"مكية",593],[90,"البلد",20,"مكية",594],[91,"الشمس",15,"مكية",595],[92,"الليل",21,"مكية",595],
  [93,"الضحى",11,"مكية",596],[94,"الشرح",8,"مكية",596],[95,"التين",8,"مكية",597],[96,"العلق",19,"مكية",597],
  [97,"القدر",5,"مكية",598],[98,"البينة",8,"مدنية",598],[99,"الزلزلة",8,"مدنية",599],[100,"العاديات",11,"مكية",599],
  [101,"القارعة",11,"مكية",600],[102,"التكاثر",8,"مكية",600],[103,"العصر",3,"مكية",601],[104,"الهمزة",9,"مكية",601],
  [105,"الفيل",5,"مكية",601],[106,"قريش",4,"مكية",602],[107,"الماعون",7,"مكية",602],[108,"الكوثر",3,"مكية",602],
  [109,"الكافرون",6,"مكية",603],[110,"النصر",3,"مدنية",603],[111,"المسد",5,"مكية",603],[112,"الإخلاص",4,"مكية",604],
  [113,"الفلق",5,"مكية",604],[114,"الناس",6,"مكية",604]
];

// ── قايمة القراء (بتتحمل مرة واحدة وقت ما تفتح شاشة المصحف، من مكتبة mp3quran.net الصوتية)
const RECITER_TARGETS = [
  { key: "باسط", label: "عبد الباسط عبد الصمد" },
  { key: "المنشاوي", label: "المنشاوي" },
  { key: "الحصري", label: "الحصري" },
  { key: "السديس", label: "السديس" },
  { key: "العفاسي", label: "مشاري العفاسي" },
  { key: "الشريم", label: "الشريم" },
  { key: "البنا", label: "محمود علي البنا" }
];
// ── لصوت الآية الواحدة (مش السورة كاملة) — مكتبة everyayah.com، بتغطي أغلب القراء اللي فوق
// لو القارئ مش موجود هنا (زي محمود البنا حاليًا) هيفضل صوت السورة كاملة شغال بس مفيش صوت لكل آية لوحدها
const EVERYAYAH_FOLDERS = {
  "عبد الباسط عبد الصمد": "Abdul_Basit_Murattal_64kbps",
  "المنشاوي": "Minshawy_Murattal_128kbps",
  "الحصري": "Husary_64kbps",
  "السديس": "Abdurrahmaan_As-Sudais_192kbps",
  "مشاري العفاسي": "Alafasy_128kbps",
  "الشريم": "Saood_ash-Shuraym_128kbps"
};
// ── إشعارات: على موبايلات الأندرويد `new Notification()` بيفشل بصمت، فالطريقة الصح هي عن طريق الـ Service Worker
async function notify(title, opts) {
  const o = Object.assign({ icon: "icon-192.png", badge: "icon-192.png", dir: "rtl", lang: "ar" }, opts || {});
  try {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return false;
    if ("serviceWorker" in navigator) {
      let reg = await navigator.serviceWorker.getRegistration();
      if (!reg) { try { reg = await navigator.serviceWorker.register("./sw.js"); await navigator.serviceWorker.ready; } catch (e) {} }
      if (reg && reg.showNotification) { await reg.showNotification(title, o); return true; }
    }
    new Notification(title, o);
    return true;
  } catch (e) {
    try { new Notification(title, o); return true; } catch (e2) { return false; }
  }
}

// ── كاش البيانات للاستخدام من غير نت (صفحات المصحف، التفسير، قايمة القراء..) عن طريق Cache API
const OFFLINE_CACHE = "rafiqi-data-v1";
const TAFSIR_ALL_URL = "https://api.alquran.cloud/v1/quran/ar.muyassar";
async function cachedJson(url, opts) {
  const o = opts || {};
  let cache = null;
  try { cache = await caches.open(OFFLINE_CACHE); } catch (e) {}
  const fromCache = async () => { if (!cache) return null; const m = await cache.match(url); return m ? m.json() : null; };
  if (!o.fresh) { try { const c = await fromCache(); if (c) return c; } catch (e) {} }
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("bad status " + res.status);
    const copy = res.clone();
    const json = await res.json();
    if (cache && (!o.valid || o.valid(json))) { try { await cache.put(url, copy); } catch (e) {} }
    return json;
  } catch (e) {
    try { const c = await fromCache(); if (c) return c; } catch (e2) {}
    throw e;
  }
}
const quranPageUrl = p => `https://api.alquran.cloud/v1/page/${p}/quran-uthmani-quran-academy`;
const validQuranPage = j => !!(j && j.data && j.data.ayahs && j.data.ayahs.length);
// تفسير كامل مخزّن (لو اتحمّل من إعدادات المصحف) — بنقراه من الكاش بدون نت
let _tafsirMap = null;
async function tafsirOffline(surah, ayah) {
  if (_tafsirMap === null) {
    _tafsirMap = false;
    try {
      const cache = await caches.open(OFFLINE_CACHE);
      const m = await cache.match(TAFSIR_ALL_URL);
      if (m) {
        const j = await m.json();
        const map = {};
        ((j.data && j.data.surahs) || []).forEach(sr => (sr.ayahs || []).forEach(a => { map[sr.number + ":" + a.numberInSurah] = a.text; }));
        if (Object.keys(map).length > 6000) _tafsirMap = map;
      }
    } catch (e) {}
  }
  return _tafsirMap ? (_tafsirMap[surah + ":" + ayah] || null) : null;
}

function useReciters() {
  const [reciters, setReciters] = useState(null); // null = لسه بيحمّل، [] = مفيش/فشل
  const [err, setErr] = useState("");
  useEffect(() => {
    let cancelled = false;
    cachedJson("https://www.mp3quran.net/api/v3/reciters?language=ar", { fresh: true, valid: d => !!(d && d.reciters && d.reciters.length) })
      .then(data => {
        if (cancelled) return;
        const list = data.reciters || [];
        const found = RECITER_TARGETS.map(t => {
          const r = list.find(r => (r.name || "").includes(t.key));
          if (!r) return null;
          const m = (r.moshaf || []).find(mm => mm.rewaya_id === 1) || (r.moshaf || [])[0];
          if (!m || !m.server) return null;
          return { label: t.label, server: m.server, ayahFolder: EVERYAYAH_FOLDERS[t.label] || null };
        }).filter(Boolean);
        setReciters(found);
      })
      .catch(() => { if (!cancelled) { setErr("معرفتش أجيب قايمة القراء دلوقتي، جرب تاني بعدين."); setReciters([]); } });
    return () => { cancelled = true; };
  }, []);
  return { reciters, err };
}

// ══════════════════════════════════════════════════════════════
// المصحف — قراءة صفحة بصفحة زي المصحف الشريف (604 صفحة) + كل طرق التنقل
// (بالآية / بالصفحة / بالسورة / بالربع / بالنصف / بالحزب) + قائمة أدوات جانبية
// ══════════════════════════════════════════════════════════════
const E = React.createElement;

// ── أنماط مشتركة (كدوال عشان T لسه هتتعرّف تحت في الملف — تتنفذ وقت الاستدعاء بس)
const backBtnStyle = () => ({ background: T.card, border: `1px solid ${T.bdr}`, borderRadius: 8, color: T.orange, fontSize: 13, fontWeight: 700, cursor: "pointer", padding: "6px 12px", fontFamily: "'Cairo',sans-serif" });
const iconBtnStyle = () => ({ background: T.card, border: `1px solid ${T.bdr}`, borderRadius: 7, minWidth: 32, height: 32, padding: "0 8px", color: "#e2e8f0", fontSize: 14, cursor: "pointer" });
const navBtnStyle = () => ({ flex: 1, background: T.card, border: `1px solid ${T.bdr}`, borderRadius: 8, color: "#e2e8f0", fontSize: 12, fontWeight: 700, padding: "9px 4px", cursor: "pointer", fontFamily: "'Cairo',sans-serif" });
const overlayStyle = () => ({ position: "fixed", inset: 0, background: "rgba(0,0,0,.65)", zIndex: 50, display: "flex", justifyContent: "center" });
const drawerPanelStyle = () => ({ width: "100%", maxWidth: 480, height: "100%", background: T.bg, padding: 16, overflowY: "auto", direction: "rtl" });

// ── بعض نسخ نص المصحف (زي نسخة مجمع الملك فهد) بتحط "بسم الله الرحمن الرحيم" جوه نص الآية
// الأولى نفسها بعلامات تشكيل مختلفة شوية عن اللي كنا بنقارن بيها، فكانت بتفضل ظاهرة مرتين
// (مرة في اللافتة اللي بنحطها إحنا، ومرة تانية من نص الآية نفسه). الدالة دي بتشيلها بغض النظر
// عن اختلاف علامات التشكيل، عشان متتكررش.
function stripLeadingBismillah(text) {
  // بنشيل أي رمز تشكيل قرآني (مش بس الحركات العادية) + نوحّد أشكال الألف المختلفة (وصل/مدة/همزة)
  // ولفظ الجلالة كليجاتشر، عشان المقارنة متفشلش مهما كان شكل التشكيل الراجع من الـ API، ومتفضلش
  // البسملة مكررة (مرة من اللافتة الثابتة، ومرة من نص الآية نفسه).
  const norm = s => s
    .replace(/\p{Mn}/gu, "")
    .replace(/[\u0622\u0623\u0625\u0671]/g, "\u0627")
    .replace(/\u0640/g, "")
    .replace(/\uFDF2/g, "الله");
  const words = text.split(/\s+/);
  const target = ["بسم", "الله", "الرحمن", "الرحيم"];
  if (words.length >= 4 && target.every((t, i) => norm(words[i]) === t)) {
    return words.slice(4).join(" ");
  }
  return text;
}
// ── اسم السورة الراجع من الـ API أحيانًا بيكون شايل كلمة "سورة" جواه خالص (زي "سورة البقرة")،
// فلو ضفنا "سورة " تاني قدامه بتتكرر الكلمة. الدالة دي بتتأكد إنها متتكررش مهما كان شكل الاسم الراجع
// أو تشكيله (بتستخدم نفس التطبيع القوي بتاع stripLeadingBismillah).
function surahBannerName(name) {
  const raw = (name || "").trim();
  if (!raw) return "سورة";
  const norm = s => s
    .replace(/\p{Mn}/gu, "")
    .replace(/[\u0622\u0623\u0625\u0671]/g, "\u0627")
    .replace(/\u0640/g, "");
  const words = raw.split(/\s+/);
  const first = norm(words[0]);
  const cleaned = (first === "سورة" || first === "سوره") ? words.slice(1).join(" ") : raw;
  return "سورة " + (cleaned || raw);
}

function toArabicDigits(n) {
  const d = ["٠","١","٢","٣","٤","٥","٦","٧","٨","٩"];
  return String(n).split("").map(c => d[c] || c).join("");
}

// ── تحويل جزء/حزب/نصف/ربع لرقم أقرب صفحة (بجلب أول آية في الوحدة من alquran.cloud)
function quranUnitToPage(kind, n) {
  if (kind === "juz") {
    return cachedJson(`https://api.alquran.cloud/v1/juz/${n}`)
      .then(d => (d && d.data && d.data.ayahs && d.data.ayahs[0]) ? d.data.ayahs[0].page : null)
      .catch(() => null);
  }
  const quarter = kind === "hizb" ? (n - 1) * 4 + 1 : kind === "half" ? (n - 1) * 2 + 1 : n;
  return cachedJson(`https://api.alquran.cloud/v1/hizbQuarter/${quarter}`)
    .then(d => (d && d.data && d.data.ayahs && d.data.ayahs[0]) ? d.data.ayahs[0].page : null)
    .catch(() => null);
}
function quranAyahToPage(surahNum, ayahNum) {
  return cachedJson(`https://api.alquran.cloud/v1/ayah/${surahNum}:${ayahNum}/quran-uthmani-quran-academy`)
    .then(d => (d && d.data) ? d.data.page : null)
    .catch(() => null);
}

// ── آيات الرقية الشرعية المعروفة
const RUQYAH_VERSES = [
  ["الفاتحة", "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ * الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ * الرَّحْمَٰنِ الرَّحِيمِ * مَالِكِ يَوْمِ الدِّينِ * إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ * اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ * صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ"],
  ["آية الكرسي", "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ وَلَا يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ"],
  ["خواتيم البقرة", "آمَنَ الرَّسُولُ بِمَا أُنزِلَ إِلَيْهِ مِن رَّبِّهِ وَالْمُؤْمِنُونَ ۚ كُلٌّ آمَنَ بِاللَّهِ وَمَلَائِكَتِهِ وَكُتُبِهِ وَرُسُلِهِ لَا نُفَرِّقُ بَيْنَ أَحَدٍ مِّن رُّسُلِهِ ۚ وَقَالُوا سَمِعْنَا وَأَطَعْنَا ۖ غُفْرَانَكَ رَبَّنَا وَإِلَيْكَ الْمَصِيرُ. لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا ۚ لَهَا مَا كَسَبَتْ وَعَلَيْهَا مَا اكْتَسَبَتْ ۗ رَبَّنَا لَا تُؤَاخِذْنَا إِن نَّسِينَا أَوْ أَخْطَأْنَا ۚ رَبَّنَا وَلَا تَحْمِلْ عَلَيْنَا إِصْرًا كَمَا حَمَلْتَهُ عَلَى الَّذِينَ مِن قَبْلِنَا ۚ رَبَّنَا وَلَا تُحَمِّلْنَا مَا لَا طَاقَةَ لَنَا بِهِ ۖ وَاعْفُ عَنَّا وَاغْفِرْ لَنَا وَارْحَمْنَا ۚ أَنتَ مَوْلَانَا فَانصُرْنَا عَلَى الْقَوْمِ الْكَافِرِينَ"],
  ["الإخلاص", "قُلْ هُوَ اللَّهُ أَحَدٌ * اللَّهُ الصَّمَدُ * لَمْ يَلِدْ وَلَمْ يُولَدْ * وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ"],
  ["الفلق", "قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ * مِنْ شَرِّ مَا خَلَقَ * وَمِنْ شَرِّ غَاسِقٍ إِذَا وَقَبَ * وَمِنْ شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ * وَمِنْ شَرِّ حَاسِدٍ إِذَا حَسَدَ"],
  ["الناس", "قُلْ أَعُوذُ بِرَبِّ النَّاسِ * مَلِكِ النَّاسِ * إِلَٰهِ النَّاسِ * مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ * الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ * مِنَ الْجِنَّةِ وَالنَّاسِ"]
];
const KHATM_DUA = `اللَّهُمَّ ارْحَمْنِي بِالْقُرْآنِ، وَاجْعَلْهُ لِي إِمَامًا وَنُورًا وَهُدًى وَرَحْمَةً، اللَّهُمَّ ذَكِّرْنِي مِنْهُ مَا نَسِيتُ، وَعَلِّمْنِي مِنْهُ مَا جَهِلْتُ، وَارْزُقْنِي تِلَاوَتَهُ آنَاءَ اللَّيْلِ وَأَطْرَافَ النَّهَارِ، وَاجْعَلْهُ لِي حُجَّةً يَا رَبَّ الْعَالَمِينَ. اللَّهُمَّ اجْعَلِ الْقُرْآنَ الْعَظِيمَ رَبِيعَ قَلْبِي، وَنُورَ صَدْرِي، وَجَلَاءَ حُزْنِي، وَذَهَابَ هَمِّي.`;

// ── شاشة اختيار طريقة التصفح
function QuranNavPicker({ onPick, onBack }) {
  const opts = [["ayah", "بالآية"], ["page", "بالصفحة"], ["surah", "بالسورة"], ["quarter", "بالربع"], ["half", "بالنصف"], ["hizb", "بالحزب"]];
  return E("div", { style: { padding: "14px 4px" } },
    E("button", { onClick: onBack, style: backBtnStyle() }, "‹ رجوع"),
    E("div", { style: { fontSize: 15, fontWeight: 900, textAlign: "center", margin: "14px 0 16px", color: "#e2e8f0" } }, "اختار طريقة التصفح"),
    E("div", { style: { display: "flex", flexDirection: "column", gap: 8 } },
      opts.map(([k, l]) => E("button", {
        key: k, onClick: () => onPick(k),
        style: { background: T.card, border: `1px solid ${T.bdr}`, borderRadius: 10, padding: "14px 16px", color: "#e2e8f0", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "'Cairo',sans-serif", textAlign: "center" }
      }, l))
    )
  );
}

// ── شبكة أرقام (جزء / حزب / نصف / ربع / صفحة)
function QuranUnitGrid({ kind, onPick, onBack, loading }) {
  const meta = {
    juz: { total: 30, label: "جزء" }, hizb: { total: 60, label: "حزب" },
    half: { total: 120, label: "نصف حزب" }, quarter: { total: 240, label: "ربع" }, page: { total: 604, label: "صفحة" }
  }[kind];
  return E("div", { style: { padding: "14px 4px" } },
    E("button", { onClick: onBack, style: backBtnStyle() }, "‹ رجوع"),
    E("div", { style: { fontSize: 14, fontWeight: 900, textAlign: "center", margin: "12px 0", color: "#e2e8f0" } }, "اختار رقم ال" + meta.label),
    loading && E("div", { style: { textAlign: "center", color: T.orange, fontSize: 12, padding: 10 } }, "بيحمّل..."),
    E("div", { style: { display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8, marginTop: 6, maxHeight: "68vh", overflowY: "auto" } },
      Array.from({ length: meta.total }, (_, i) => i + 1).map(n => E("button", {
        key: n, onClick: () => onPick(n), disabled: loading,
        style: { background: T.card, border: `1px solid ${T.bdr}`, borderRadius: 8, padding: "10px 4px", color: "#e2e8f0", fontSize: 13, fontWeight: 700, cursor: loading ? "default" : "pointer", fontFamily: "'Cairo',sans-serif" }
      }, n))
    )
  );
}

// ── اختيار آية: سورة الأول بعدين رقم الآية
function QuranAyahPicker({ onResolve, onBack }) {
  const [surah, setSurah] = useState(null);
  const [ayahNum, setAyahNum] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  if (!surah) {
    const query = q.trim();
    const filtered = QURAN_SURAHS.filter(s => !query || s[1].includes(query) || String(s[0]) === query);
    return E("div", { style: { padding: "14px 4px" } },
      E("button", { onClick: onBack, style: backBtnStyle() }, "‹ رجوع"),
      E("input", { type: "text", placeholder: "🔍 اختار السورة الأول...", value: q, onChange: e => setQ(e.target.value), style: { ...S.inp, marginTop: 10, marginBottom: 10 } }),
      E("div", { style: { maxHeight: "62vh", overflowY: "auto" } },
        filtered.map(s => E("button", {
          key: s[0], onClick: () => setSurah({ number: s[0], name: s[1], ayat: s[2] }),
          style: { display: "block", width: "100%", textAlign: "right", background: T.card, border: `1px solid ${T.bdr}`, borderRadius: 8, padding: "9px 12px", marginBottom: 6, color: "#e2e8f0", fontSize: 13, cursor: "pointer", fontFamily: "'Cairo',sans-serif" }
        }, "سورة " + s[1]))
      )
    );
  }
  return E("div", { style: { padding: "14px 4px" } },
    E("button", { onClick: () => setSurah(null), style: backBtnStyle() }, "‹ رجوع لاختيار السورة"),
    E("div", { style: { fontSize: 14, fontWeight: 900, textAlign: "center", margin: "14px 0", color: "#e2e8f0" } }, "سورة " + surah.name + " — رقم الآية (١ - " + toArabicDigits(surah.ayat) + ")"),
    E("input", { type: "number", min: 1, max: surah.ayat, value: ayahNum, onChange: e => setAyahNum(e.target.value), style: { ...S.inp, textAlign: "center", fontSize: 20 } }),
    E("button", {
      onClick: () => {
        const n = parseInt(ayahNum, 10);
        if (!n || n < 1 || n > surah.ayat) return;
        setLoading(true);
        quranAyahToPage(surah.number, n).then(p => { setLoading(false); if (p) onResolve(p); });
      },
      disabled: loading, style: { ...S.btn(T.orange, "#000"), marginTop: 10 }
    }, loading ? "بيحمّل..." : "روح للآية")
  );
}

// ── شاشة سماع سورة كاملة بصوت قارئ (بتدعم التكرار زي مشغل الآية)
function SurahListenScreen({ surah, reciters, recitersErr, selectedReciter, setSelectedReciter, onBack }) {
  const rec = reciters && reciters[selectedReciter];
  const src = rec && rec.server ? rec.server + String(surah[0]).padStart(3, "0") + ".mp3" : null;
  return E("div", { style: { padding: "14px 4px" } },
    E("button", { onClick: onBack, style: backBtnStyle() }, "‹ رجوع للفهرس"),
    E("div", { style: { fontSize: 17, fontWeight: 900, textAlign: "center", margin: "10px 0", color: "#e2e8f0" } }, "🔊 سورة " + surah[1]),
    E("div", { style: { display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", marginBottom: 12 } },
      reciters === null ? E("span", { style: { fontSize: 12, color: "#4a6080" } }, "بيحمّل قايمة القراء...")
      : reciters.length === 0 ? E("span", { style: { fontSize: 12, color: T.red } }, recitersErr || "مفيش قراء متاحين دلوقتي")
      : reciters.map((r, i) => E("button", {
          key: i, onClick: () => setSelectedReciter(i),
          style: { background: selectedReciter === i ? T.orange : T.card, color: selectedReciter === i ? "#000" : "#e2e8f0", border: `1px solid ${T.bdr}`, borderRadius: 8, padding: "6px 11px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Cairo',sans-serif" }
        }, r.label))
    ),
    src
      ? E("div", { style: { background: T.card, border: `1px solid ${T.bdr}`, borderRadius: 12, padding: 12 } }, E(RepeatableAudio, { key: src, src }))
      : E("div", { style: { textAlign: "center", color: "#4a6080", fontSize: 12, padding: 20 } }, rec ? "صوت السورة مش متاح للقارئ ده، جرب قارئ تاني" : "اختار قارئ عشان تسمع")
  );
}

// ── فهرس السور (الشكل الجديد: أيقونة مكية/مدنية + رقم صفحة + نجمة تثبيت)
function QuranSurahList({ onOpen, onListen, onNav, pinned, togglePin }) {
  const [q, setQ] = useState("");
  const query = q.trim();
  const filtered = QURAN_SURAHS.filter(s => {
    if (!query) return true;
    if (/^\d+$/.test(query)) return String(s[0]) === query || String(s[0]).includes(query);
    return s[1].includes(query);
  });
  return E("div", { style: { padding: "14px 4px" } },
    E("div", { style: { display: "flex", gap: 8, marginBottom: 10 } },
      E("input", { type: "text", placeholder: "🔍 دور بالاسم أو برقم السورة...", value: q, onChange: e => setQ(e.target.value), style: { ...S.inp, marginBottom: 0, flex: 1, fontSize: 13 } }),
      E("button", { onClick: onNav, title: "طريقة تانية للتصفح", style: { background: T.orange, border: "none", borderRadius: 9, padding: "0 14px", color: "#000", fontWeight: 900, cursor: "pointer", fontSize: 14, fontFamily: "'Cairo',sans-serif" } }, "🧭")
    ),
    filtered.length === 0
      ? E("div", { style: { textAlign: "center", color: "#4a6080", fontSize: 12, padding: 20 } }, "مفيش سورة بالاسم أو الرقم ده")
      : filtered.map(s => {
          const isPinned = pinned.includes(s[0]);
          return E("button", {
            key: s[0], onClick: () => onOpen(s),
            style: { display: "flex", alignItems: "center", gap: 9, background: T.card, border: `1px solid ${T.bdr}`, borderRadius: 10, padding: "10px 12px", marginBottom: 7, width: "100%", cursor: "pointer", fontFamily: "'Cairo',sans-serif", textAlign: "right" }
          },
            E("div", { style: { width: 27, height: 27, borderRadius: "50%", border: `1px solid ${T.bdr}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: T.orange, flexShrink: 0, fontWeight: 700 } }, s[0]),
            E("span", {
              onClick: e => { e.stopPropagation(); togglePin(s[0]); },
              style: { fontSize: 15, color: isPinned ? T.orange : "#33456a", cursor: "pointer", flexShrink: 0 }
            }, isPinned ? "★" : "☆"),
            E("span", { style: { fontSize: 16, flexShrink: 0 } }, s[3] === "مكية" ? "🕋" : "🕌"),
            E("div", { style: { flex: 1, minWidth: 0 } },
              E("div", { style: { fontSize: 14, fontWeight: 700, color: "#e2e8f0" } }, "سورة " + s[1]),
              E("div", { style: { fontSize: 10, color: "#4a6080", marginTop: 2 } }, s[2] + " آية · " + s[3])
            ),
            E("span", {
              onClick: e => { e.stopPropagation(); onListen(s); },
              title: "سماع السورة كاملة",
              style: { fontSize: 17, color: T.orange, cursor: "pointer", flexShrink: 0, padding: "2px 4px" }
            }, "🔊"),
            E("div", { style: { fontSize: 11, color: T.orange, fontWeight: 700, flexShrink: 0 } }, "ص " + toArabicDigits(s[4]))
          );
        })
  );
}

// ── مشغل صوت بيدعم "التكرار": تختار عدد المرات (أو تكرار بلا نهاية) وهو بيعيد التشغيل
// لوحده لما الصوت يخلص، من غير ما يوقف بعد أول مرة زي مشغل الصوت العادي
const REPEAT_PRESETS = [1, 3, 5, 10, 20, "∞"];
function RepeatableAudio({ src, label }) {
  const audioRef = useRef(null);
  const [repeatTarget, setRepeatTarget] = useState(1);
  const [playedCount, setPlayedCount] = useState(1);
  const [customOpen, setCustomOpen] = useState(false);
  const [customVal, setCustomVal] = useState("");
  // ── لما مصدر الصوت يتغيّر (آية/سورة تانية) أو المستخدم يغيّر عدد التكرار، نصفر العداد ونبدأ من جديد
  useEffect(() => { setPlayedCount(1); }, [src, repeatTarget]);
  const onEnded = () => {
    const isInfinite = repeatTarget === "∞";
    setPlayedCount(c => {
      const next = c + 1;
      if (isInfinite || next <= repeatTarget) {
        const el = audioRef.current;
        if (el) { el.currentTime = 0; el.play().catch(() => {}); }
      }
      return next;
    });
  };
  const isInfinite = repeatTarget === "∞";
  const doneCount = Math.min(playedCount, isInfinite ? playedCount : repeatTarget);
  return E("div", null,
    label && E("div", { style: { fontSize: 12, fontWeight: 700, color: T.orange, marginBottom: 8, textAlign: "center" } }, label),
    E("audio", { key: src, ref: audioRef, controls: true, autoPlay: true, src, onEnded, style: { width: "100%", marginBottom: 8 } }),
    E("div", { style: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "center" } },
      E("span", { style: { fontSize: 11, color: "#4a6080", marginLeft: 4 } }, "🔁 التكرار:"),
      REPEAT_PRESETS.map(n => E("button", {
        key: n, onClick: () => { setRepeatTarget(n); setCustomOpen(false); },
        style: {
          padding: "5px 10px", borderRadius: 8, border: `1px solid ${repeatTarget === n ? T.orange : T.bdr}`,
          background: repeatTarget === n ? T.orange + "22" : "transparent",
          color: repeatTarget === n ? T.orange : "#7aa3d4", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Cairo',sans-serif"
        }
      }, n === "∞" ? "∞" : toArabicDigits(n))),
      E("button", {
        onClick: () => setCustomOpen(o => !o),
        style: {
          padding: "5px 10px", borderRadius: 8, border: `1px solid ${!REPEAT_PRESETS.includes(repeatTarget) ? T.orange : T.bdr}`,
          background: !REPEAT_PRESETS.includes(repeatTarget) ? T.orange + "22" : "transparent",
          color: !REPEAT_PRESETS.includes(repeatTarget) ? T.orange : "#7aa3d4", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Cairo',sans-serif"
        }
      }, !REPEAT_PRESETS.includes(repeatTarget) ? toArabicDigits(repeatTarget) + " ✎" : "عدد تاني ✎")
    ),
    customOpen && E("div", { style: { display: "flex", gap: 6, marginTop: 8, justifyContent: "center" } },
      E("input", {
        type: "number", min: 1, value: customVal, placeholder: "اكتب عدد المرات",
        onChange: e => setCustomVal(e.target.value),
        style: { ...S.inp, marginBottom: 0, width: 120, textAlign: "center" }
      }),
      E("button", {
        onClick: () => { const n = parseInt(customVal, 10); if (n > 0) { setRepeatTarget(n); setCustomOpen(false); } },
        style: { background: T.orange, border: "none", borderRadius: 9, padding: "0 14px", color: "#000", fontWeight: 900, cursor: "pointer", fontFamily: "'Cairo',sans-serif" }
      }, "✓")
    ),
    E("div", { style: { textAlign: "center", fontSize: 10, color: "#4a6080", marginTop: 6 } },
      isInfinite ? "بيتكرر من غير ما يوقف — دورة " + toArabicDigits(playedCount) : "دورة " + toArabicDigits(doneCount) + " من " + toArabicDigits(repeatTarget))
  );
}

// ── شريط أدوات المصحف: ثابت فوق وانت بتقرا (sticky)، ويختفي لوحده لما توقف على الصفحة أو تنزل،
// ويظهر تاني بمجرد ما تسحب لفوق (من غير ما ترجع لأول السورة) أو تدوس على المقبض الصغير
function MushafBar({ children }) {
  const [show, setShow] = useState(true);
  const [topPx, setTopPx] = useState(0);
  const armRef = useRef(() => {});
  useEffect(() => {
    let last = window.scrollY, timer = null;
    const measure = () => { const h = document.getElementById("app-top-header"); setTopPx(h ? h.offsetHeight : 0); };
    const arm = () => { clearTimeout(timer); timer = setTimeout(() => { if (window.scrollY > 60) setShow(false); }, 2500); };
    armRef.current = arm;
    measure(); arm();
    const onScroll = () => {
      const y = window.scrollY, d = y - last;
      if (Math.abs(d) < 6) return;
      last = y;
      if (d < 0 || y < 60) { setShow(true); arm(); }
      else { setShow(false); clearTimeout(timer); }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", measure); clearTimeout(timer); };
  }, []);
  return E(React.Fragment, null,
    E("div", {
      onTouchStart: () => armRef.current(),
      style: { position: "sticky", top: topPx, zIndex: 9, background: T.bg, paddingBottom: 6, marginBottom: 8, transform: show ? "translateY(0)" : "translateY(-140%)", opacity: show ? 1 : 0, transition: "transform .25s ease, opacity .25s ease", pointerEvents: show ? "auto" : "none" }
    },
      E("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, flexWrap: "wrap" } }, children)
    ),
    !show && E("button", {
      onClick: () => { setShow(true); armRef.current(); },
      "aria-label": "إظهار الأدوات",
      style: { position: "fixed", top: topPx + 4, left: "50%", transform: "translateX(-50%)", zIndex: 9, background: T.card, color: "#7aa3d4", border: `1px solid ${T.bdr}`, borderRadius: 99, padding: "0 16px", height: 18, lineHeight: "14px", fontSize: 12, cursor: "pointer", opacity: 0.85 }
    }, "⌄")
  );
}

// ── شاشة قراءة المصحف صفحة بصفحة
function MushafReader({ page, setPage, onBack, reciters, recitersErr, selectedReciter, setSelectedReciter, fontSize, setFontSize, onMenu, bookmarks, onBookmark }) {
  // ── وضع القراءة: تقليب (سحب يمين/شمال) أو تمرير متصل (سحب لتحت) — يتحفظ كاختيار المستخدم
  const [readMode, setReadMode] = useState(() => ld("quran_read_mode", "swipe"));
  useEffect(() => svLocal("quran_read_mode", readMode), [readMode]);
  // ── حساسية التقليب: لازم السحبة تبقى أفقية بوضوح وطويلة كفاية (مش مجرد تحريك الشاشة وانت بتقرا)
  const touchStartRef = useRef(null);
  const onTouchStart = e => {
    if (e.touches.length !== 1) { touchStartRef.current = null; return; }
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
  };
  const onTouchEnd = e => {
    const st = touchStartRef.current;
    touchStartRef.current = null;
    if (!st) return;
    const dx = e.changedTouches[0].clientX - st.x;
    const dy = e.changedTouches[0].clientY - st.y;
    const minDx = Math.max(110, window.innerWidth * 0.3);
    if (window.visualViewport && window.visualViewport.scale > 1.05) return; // الصفحة مكبّرة بالزوم = السحب للتحريك مش للتقليب
    if (Math.abs(dx) < minDx) return;            // سحبة قصيرة = تجاهل
    if (Math.abs(dx) < Math.abs(dy) * 2.2) return; // سحبة مايلة/رأسية = تمرير مش تقليب
    if (Date.now() - st.t > 700) return;          // سحبة بطيئة = غالبًا قراءة/تحديد نص
    const sel = window.getSelection && window.getSelection();
    if (sel && String(sel).length > 0) return;
    // في المصحف (اتجاه القراءة من اليمين للشمال): سحب الشاشة يمين = الصفحة التالية، سحب شمال = السابقة
    if (dx > 0) goto(page + 1); else goto(page - 1);
  };
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [activeAyah, setActiveAyah] = useState(null);
  const [tafsirText, setTafsirText] = useState("");
  const [tafsirLoading, setTafsirLoading] = useState(false);

  useEffect(() => {
    if (readMode === "scroll") { svLocal("quran_last_page", page); return; } // وضع التمرير المتصل بيجيب صفحاته بنفسه
    let cancelled = false;
    setData(null); setErr(""); setActiveAyah(null);
    cachedJson(quranPageUrl(page), { valid: validQuranPage })
      .then(d => { if (!cancelled) setData(d && d.data ? d.data : null); })
      .catch(() => { if (!cancelled) setErr("معرفتش أجيب الصفحة دلوقتي، جرب تاني."); });
    svLocal("quran_last_page", page);
    return () => { cancelled = true; };
  }, [page, readMode]);

  useEffect(() => {
    if (!activeAyah) return;
    let cancelled = false;
    setTafsirText(""); setTafsirLoading(true);
    tafsirOffline(activeAyah.surah, activeAyah.numberInSurah)
      .then(t => t !== null ? t : cachedJson(`https://api.alquran.cloud/v1/ayah/${activeAyah.surah}:${activeAyah.numberInSurah}/ar.muyassar`, { valid: d => !!(d && d.data && d.data.text) }).then(d => d && d.data ? d.data.text : ""))
      .then(t => { if (!cancelled) setTafsirText(t || ""); })
      .catch(() => {}).finally(() => { if (!cancelled) setTafsirLoading(false); });
    return () => { cancelled = true; };
  }, [activeAyah]);

  const rec = reciters && reciters[selectedReciter];
  const ayahAudioSrc = rec && rec.ayahFolder && activeAyah
    ? `https://everyayah.com/data/${rec.ayahFolder}/${String(activeAyah.surah).padStart(3, "0")}${String(activeAyah.numberInSurah).padStart(3, "0")}.mp3`
    : null;

  const goto = p => { if (p >= 1 && p <= 604) setPage(p); };
  const isBookmarked = bookmarks.some(b => b.page === page);
  let lastSurah = null;

  if (readMode === "scroll") {
    return E(ContinuousMushaf, { startPage: page, setPage, onBack, onMenu, fontSize, setFontSize, bookmarks, onBookmark, isBookmarked, readMode, setReadMode });
  }

  return E("div", { style: { padding: "10px 4px 14px" } },
    E(MushafBar, null,
      E("button", { onClick: onBack, style: backBtnStyle() }, "‹ الفهرس"),
      E("div", { style: { display: "flex", gap: 6 } },
        E("button", { onClick: () => setReadMode("scroll"), title: "التبديل لوضع التمرير المتصل (سحب لتحت)", style: iconBtnStyle() }, "🧾"),
        E("button", { onClick: onMenu, style: iconBtnStyle() }, "☰"),
        E("button", { onClick: onBookmark, style: { ...iconBtnStyle(), color: isBookmarked ? T.orange : "#e2e8f0" } }, isBookmarked ? "🔖" : "📑"),
        E("button", { onClick: () => setFontSize(f => Math.max(14, f - 2)), style: iconBtnStyle() }, "A-"),
        E("button", { onClick: () => setFontSize(f => Math.min(34, f + 2)), style: iconBtnStyle() }, "A+")
      )
    ),
    err && E("div", { style: { textAlign: "center", color: T.red, fontSize: 12, padding: 20 } }, err),
    !data && !err && E("div", { style: { textAlign: "center", color: "#4a6080", fontSize: 12, padding: 30 } }, "بيحمّل الصفحة..."),
    data && E("div", { className: "mushaf-frame", onTouchStart, onTouchEnd },
      E("span", { className: "mushaf-corner tl" }), E("span", { className: "mushaf-corner tr" }),
      E("span", { className: "mushaf-corner bl" }), E("span", { className: "mushaf-corner br" }),
      E("div", { style: { fontSize: fontSize, lineHeight: 2.5, textAlign: "center", color: "#e2e8f0", fontFamily: "'Amiri Quran', 'Cairo', serif", wordSpacing: 2 } },
        data.ayahs.map(a => {
          const showBanner = a.numberInSurah === 1 && a.surah.number !== lastSurah;
          if (a.numberInSurah === 1) lastSurah = a.surah.number;
          let text = a.text;
          if (a.numberInSurah === 1 && a.surah.number !== 1) {
            text = stripLeadingBismillah(text);
          }
          return E(React.Fragment, { key: a.number },
            showBanner && E("div", { className: "mushaf-surah-banner" }, surahBannerName(a.surah.name)),
            showBanner && a.surah.number !== 1 && a.surah.number !== 9 && E("div", { style: { fontFamily: "'Amiri Quran',serif", fontSize: fontSize * 0.85, color: "#f5d98a", margin: "0 0 10px" } }, "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ"),
            E("span", {
              onClick: () => setActiveAyah({ surah: a.surah.number, numberInSurah: a.numberInSurah }),
              style: { cursor: "pointer", background: activeAyah && activeAyah.surah === a.surah.number && activeAyah.numberInSurah === a.numberInSurah ? "#f59e0b33" : "transparent", borderRadius: 4 }
            }, text, E("span", { className: "mushaf-ayah-end" }, toArabicDigits(a.numberInSurah)))
          );
        })
      ),
      E("div", { style: { display: "flex", justifyContent: "space-between", marginTop: 16, fontSize: 10, color: "#6b7fa0", fontFamily: "'Cairo',sans-serif" } },
        E("span", null, data.ayahs[0] ? "الجزء " + toArabicDigits(data.ayahs[0].juz) : ""),
        E("span", { style: { fontWeight: 900, color: T.orange } }, "صفحة " + toArabicDigits(page)),
        E("span", null, data.ayahs[0] ? "الحزب " + toArabicDigits(Math.ceil(data.ayahs[0].hizbQuarter / 4)) : "")
      )
    ),
    data && E("div", { style: { display: "flex", justifyContent: "space-between", gap: 8, marginTop: 14, alignItems: "center" } },
      E("button", { onClick: () => goto(page + 1), disabled: page >= 604, style: navBtnStyle() }, "الصفحة التالية ›"),
      E("input", { type: "number", value: page, onChange: e => { const n = parseInt(e.target.value, 10); if (n) goto(n); }, style: { ...S.inp, width: 66, textAlign: "center", marginBottom: 0 } }),
      E("button", { onClick: () => goto(page - 1), disabled: page <= 1, style: navBtnStyle() }, "‹ الصفحة السابقة")
    ),
    activeAyah && E("div", {
      style: { position: "sticky", bottom: 8, background: T.card, border: `1px solid ${T.orange}`, borderRadius: 10, padding: 12, marginTop: 14, boxShadow: "0 -4px 18px rgba(0,0,0,.45)" }
    },
      E("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 } },
        E("span", { style: { fontSize: 12, fontWeight: 700, color: T.orange } }, "آية " + toArabicDigits(activeAyah.numberInSurah)),
        E("button", { onClick: () => setActiveAyah(null), style: { background: "transparent", border: "none", color: "#4a6080", fontSize: 16, cursor: "pointer" } }, "×")
      ),
      ayahAudioSrc
        ? E(RepeatableAudio, { key: ayahAudioSrc, src: ayahAudioSrc })
        : E("div", { style: { fontSize: 11, color: "#4a6080", marginBottom: 10 } }, rec ? "صوت الآية لوحدها مش متاح للقارئ ده، جرب قارئ تاني من ☰ الإعدادات" : "اختار قارئ من ☰ الإعدادات عشان تسمع"),
      E("div", { style: { fontSize: 11, color: "#4a6080", marginBottom: 6, fontWeight: 700 } }, "📖 التفسير الميسّر:"),
      tafsirLoading && E("div", { style: { fontSize: 12, color: "#4a6080" } }, "بيحمّل..."),
      tafsirText && E("div", { style: { fontSize: 13, lineHeight: 1.9, color: "#e2e8f0", maxHeight: 110, overflowY: "auto" } }, tafsirText)
    )
  );
}

// ── وضع التمرير المتصل: بيحمّل صفحة بعد صفحة وانت نازل، من غير أزرار
function ContinuousMushafBlock({ pageNum, fontSize }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setData(null); setErr(false);
    cachedJson(quranPageUrl(pageNum), { valid: validQuranPage })
      .then(d => {
        if (cancelled) return;
        if (d && d.data) setData(d.data); else setErr(true);
      })
      .catch(() => { if (!cancelled) setErr(true); });
    return () => { cancelled = true; };
  }, [pageNum, retryTick]);
  // ── لو الجلب فشل (مشكلة شبكة عابرة غالبًا)، بنعيد المحاولة تلقائيًا مرة واحدة بعد شوية
  // عشان القارئ المتصل متتوقفش عند نفس الصفحة للأبد ومتفضلش "قافلة" من غير ما تكمل تسحب لتحت
  useEffect(() => {
    if (!err || retryTick > 0) return;
    const t = setTimeout(() => setRetryTick(x => x + 1), 2500);
    return () => clearTimeout(t);
  }, [err, retryTick]);
  if (err) {
    return E("div", { style: { textAlign: "center", color: T.red, fontSize: 12, padding: 24 } },
      "معرفتش أجيب صفحة " + toArabicDigits(pageNum) + " دلوقتي.",
      E("button", {
        onClick: () => setRetryTick(x => x + 1),
        style: { display: "block", margin: "10px auto 0", background: T.card, border: `1px solid ${T.bdr}`, borderRadius: 8, padding: "7px 16px", color: T.orange, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Cairo',sans-serif" }
      }, "🔄 إعادة المحاولة")
    );
  }
  let lastSurah = null;
  if (!data) return E("div", { style: { textAlign: "center", color: "#4a6080", fontSize: 12, padding: 24 } }, "بيحمّل صفحة " + toArabicDigits(pageNum) + "...");
  return E("div", { className: "mushaf-frame", style: { marginBottom: 20 } },
    E("span", { className: "mushaf-corner tl" }), E("span", { className: "mushaf-corner tr" }),
    E("span", { className: "mushaf-corner bl" }), E("span", { className: "mushaf-corner br" }),
    E("div", { style: { fontSize: fontSize, lineHeight: 2.5, textAlign: "center", color: "#e2e8f0", fontFamily: "'Amiri Quran', 'Cairo', serif", wordSpacing: 2 } },
      data.ayahs.map(a => {
        const showBanner = a.numberInSurah === 1 && a.surah.number !== lastSurah;
        if (a.numberInSurah === 1) lastSurah = a.surah.number;
        let text = a.text;
        if (a.numberInSurah === 1 && a.surah.number !== 1) {
          text = stripLeadingBismillah(text);
        }
        return E(React.Fragment, { key: a.number },
          showBanner && E("div", { className: "mushaf-surah-banner" }, surahBannerName(a.surah.name)),
          showBanner && a.surah.number !== 1 && a.surah.number !== 9 && E("div", { style: { fontFamily: "'Amiri Quran',serif", fontSize: fontSize * 0.85, color: "#f5d98a", margin: "0 0 10px" } }, "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ"),
          E("span", null, text, E("span", { className: "mushaf-ayah-end" }, toArabicDigits(a.numberInSurah)))
        );
      })
    ),
    E("div", { style: { textAlign: "center", marginTop: 10, fontSize: 10, fontWeight: 900, color: T.orange } }, "صفحة " + toArabicDigits(pageNum))
  );
}

function ContinuousMushaf({ startPage, setPage, onBack, onMenu, fontSize, setFontSize, isBookmarked, onBookmark, readMode, setReadMode }) {
  const [pages, setPages] = useState(() => [startPage]);
  const pendingRef = useRef(false);
  // آخر صفحة إحنا نفسنا حدّثناها (وإحنا بنسحب) — عشان نفرّق بينها وبين قفزة من برّه (علامة/فهرس/رقم صفحة)
  const ownPageRef = useRef(startPage);
  useEffect(() => {
    if (startPage === ownPageRef.current) return;
    ownPageRef.current = startPage;
    setPages([startPage]); pendingRef.current = false;
    window.scrollTo(0, 0);
  }, [startPage]);
  // ── ملحوظة: كان النداء بتاع setPage جوه loadNext بيغيّر startPage فبيتم مسح كل الصفحات المحمّلة
  // ويرجع للصفحة الجديدة بس — ده كان سبب إن السحب لتحت "مش شغال". دلوقتي بنحدّد الصفحة الظاهرة
  // من مكان السكرول، ومش بنمسح حاجة طول ما التغيير جاي مننا.
  const loadNext = () => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPages(p => {
      const last = p[p.length - 1];
      if (last >= 604) { pendingRef.current = false; return p; }
      return [...p, last + 1];
    });
  };
  useEffect(() => { pendingRef.current = false; }, [pages]);
  useEffect(() => {
    const trackVisible = () => {
      const blocks = document.querySelectorAll("[data-mpage]");
      const line = window.innerHeight * 0.35;
      let cur = null;
      blocks.forEach(b => { const r = b.getBoundingClientRect(); if (r.top <= line && r.bottom > line) cur = +b.getAttribute("data-mpage"); });
      if (cur && cur !== ownPageRef.current) { ownPageRef.current = cur; setPage(cur); }
    };
    const checkFill = () => {
      if (document.documentElement.scrollHeight <= window.innerHeight + 60) loadNext();
    };
    const onScroll = () => {
      const nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 800;
      if (nearBottom) loadNext();
      trackVisible();
    };
    checkFill();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages]);
  return E("div", { style: { padding: "10px 4px 14px" } },
    E(MushafBar, null,
      E("button", { onClick: onBack, style: backBtnStyle() }, "‹ الفهرس"),
      E("div", { style: { display: "flex", gap: 6 } },
        E("button", { onClick: () => setReadMode("swipe"), title: "التبديل لوضع تقليب الصفحات (سحب يمين/شمال)", style: iconBtnStyle() }, "📃"),
        E("button", { onClick: onMenu, style: iconBtnStyle() }, "☰"),
        E("button", { onClick: onBookmark, style: { ...iconBtnStyle(), color: isBookmarked ? T.orange : "#e2e8f0" } }, isBookmarked ? "🔖" : "📑"),
        E("button", { onClick: () => setFontSize(f => Math.max(14, f - 2)), style: iconBtnStyle() }, "A-"),
        E("button", { onClick: () => setFontSize(f => Math.min(34, f + 2)), style: iconBtnStyle() }, "A+")
      )
    ),
    pages.map(p => E("div", { key: p, "data-mpage": p }, E(ContinuousMushafBlock, { pageNum: p, fontSize })))
  );
}


const QURAN_MENU_SECTIONS = [
  { title: "أدوات القراءة", items: [["bookmarks", "🔖", "علاماتي المحفوظة"], ["settings", "⚙️", "حجم الخط والقارئ"]] }
];

function QuranBookmarksPanel({ bookmarks, onJump, onRemove }) {
  if (!bookmarks.length) return E("div", { style: { textAlign: "center", color: "#4a6080", fontSize: 13, padding: 20 } }, "مفيش علامات محفوظة لسه. من شاشة القراءة دوس على 📑 عشان تحفظ الصفحة الحالية.");
  return E("div", null, bookmarks.slice().reverse().map(b => E("div", {
    key: b.ts, style: { display: "flex", alignItems: "center", gap: 8, background: T.card, border: `1px solid ${T.bdr}`, borderRadius: 9, padding: "10px 12px", marginBottom: 7 }
  },
    E("button", { onClick: () => onJump(b.page), style: { flex: 1, background: "transparent", border: "none", color: "#e2e8f0", fontSize: 13, fontWeight: 700, textAlign: "right", cursor: "pointer", fontFamily: "'Cairo',sans-serif" } }, "📍 صفحة " + toArabicDigits(b.page)),
    E("button", { onClick: () => onRemove(b.ts), style: { background: "transparent", border: "none", color: T.red, fontSize: 15, cursor: "pointer" } }, "🗑️")
  )));
}

// ── تحميل المصحف كامل (604 صفحة) + التفسير للاستخدام من غير نت
function QuranOfflineDownload() {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [cached, setCached] = useState(null);
  const [msg, setMsg] = useState("");
  const countCached = async () => {
    try { const c = await caches.open(OFFLINE_CACHE); const keys = await c.keys(); setCached(keys.filter(r => r.url.includes("/v1/page/")).length); }
    catch (e) { setCached(0); }
  };
  useEffect(() => { countCached(); }, []);
  const run = async () => {
    if (running) return;
    setRunning(true); setMsg(""); setDone(0);
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
    let next = 1, finished = 0, failed = 0;
    const worker = async () => {
      while (next <= 604) {
        const p = next++;
        let ok = false;
        for (let t = 0; t < 3 && !ok; t++) {
          try { await cachedJson(quranPageUrl(p), { valid: validQuranPage }); ok = true; } catch (e) { await new Promise(r => setTimeout(r, 600)); }
        }
        if (!ok) failed++;
        finished++; setDone(finished);
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    let tafsirOk = true;
    try { await cachedJson(TAFSIR_ALL_URL, { valid: j => !!(j && j.data && j.data.surahs) }); _tafsirMap = null; } catch (e) { tafsirOk = false; }
    await countCached();
    setRunning(false);
    setMsg(failed === 0 ? "✅ المصحف اتحمّل كامل" + (tafsirOk ? " مع التفسير" : " (التفسير ماتحمّلش، هيشتغل بنت بس)") + " — دلوقتي بيشتغل من غير نت." : "⚠️ " + failed + " صفحة ماتحمّلتش (النت ضعيف)، دوس تاني وهيكمّل الناقص.");
  };
  return E("div", { style: { marginTop: 20, background: T.card, border: `1px solid ${T.bdr}`, borderRadius: 12, padding: 12 } },
    E("div", { style: { fontSize: 12, color: "#4a6080", marginBottom: 6, fontWeight: 700 } }, "📥 المصحف من غير نت"),
    E("div", { style: { fontSize: 12, color: "#c7d3e6", lineHeight: 1.8, marginBottom: 8 } },
      "الصفحات اللي بتفتحها بتتحفظ تلقائي. ولو عاوز المصحف كله يشتغل من غير نت، دوس تحميل (محتاج نت مرة واحدة)."),
    E("div", { style: { fontSize: 11, color: "#7aa3d4", marginBottom: 8 } }, "المتحمّل: " + (cached === null ? "..." : cached) + " / 604 صفحة"),
    running && E("div", { style: { height: 7, background: "#070c16", borderRadius: 99, marginBottom: 8, overflow: "hidden" } },
      E("div", { style: { width: Math.round(done / 604 * 100) + "%", height: "100%", background: T.orange } })),
    E("button", { onClick: run, disabled: running, style: { width: "100%", background: running ? T.card : T.orange, color: running ? "#4a6080" : "#000", border: `1px solid ${T.bdr}`, borderRadius: 9, padding: "9px 0", fontWeight: 900, fontSize: 13, cursor: running ? "default" : "pointer", fontFamily: "'Cairo',sans-serif" } },
      running ? "بيحمّل... " + done + " / 604" : "📥 تحميل المصحف كامل للاستخدام بدون نت"),
    msg && E("div", { style: { fontSize: 11, color: "#c7d3e6", marginTop: 8, lineHeight: 1.7 } }, msg)
  );
}

function QuranSettingsPanel({ fontSize, setFontSize, reciters, recitersErr, selectedReciter, setSelectedReciter }) {
  return E("div", null,
    E("div", { style: { fontSize: 12, color: "#4a6080", marginBottom: 8, fontWeight: 700 } }, "حجم خط القراءة"),
    E("div", { style: { display: "flex", gap: 8, marginBottom: 18, alignItems: "center" } },
      E("button", { onClick: () => setFontSize(f => Math.max(14, f - 2)), style: { ...iconBtnStyle(), flex: 1 } }, "A-"),
      E("div", { style: { flex: 1, textAlign: "center", color: "#e2e8f0", fontWeight: 700, fontSize: 14 } }, fontSize),
      E("button", { onClick: () => setFontSize(f => Math.min(34, f + 2)), style: { ...iconBtnStyle(), flex: 1 } }, "A+")
    ),
    E("div", { style: { fontSize: 12, color: "#4a6080", marginBottom: 8, fontWeight: 700 } }, "القارئ (لصوت الآية)"),
    E("div", { style: { display: "flex", gap: 6, flexWrap: "wrap" } },
      reciters === null ? E("span", { style: { fontSize: 12, color: "#4a6080" } }, "بيحمّل قايمة القراء...")
      : reciters.length === 0 ? E("span", { style: { fontSize: 12, color: T.red } }, recitersErr || "مفيش قراء متاحين دلوقتي")
      : reciters.map((r, i) => E("button", {
          key: i, onClick: () => setSelectedReciter(i),
          style: { background: selectedReciter === i ? T.orange : T.card, color: selectedReciter === i ? "#000" : "#e2e8f0", border: `1px solid ${T.bdr}`, borderRadius: 8, padding: "6px 11px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Cairo',sans-serif" }
        }, r.label))
    ),
    E(QuranOfflineDownload, null)
  );
}

// ── الأربعون النووية (42 حديثًا بزيادة ابن رجب) — النص الكامل بالتشكيل من قاعدة بيانات مفتوحة المصدر (AhmedBaset/hadith-json، مأخوذة من sunnah.com)
const NAWAWI40 = ["عَنْ أَمِيرِ الْمُؤْمِنِينَ أَبِي حَفْصٍ عُمَرَ بْنِ الْخَطَّابِ رَضِيَ اللهُ عَنْهُ قَالَ: سَمِعْتُ رَسُولَ اللَّهِ صلى الله عليه وسلم يَقُولُ: \" إنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى، فَمَنْ كَانَتْ هِجْرَتُهُ إلَى اللَّهِ وَرَسُولِهِ فَهِجْرَتُهُ إلَى اللَّهِ وَرَسُولِهِ، وَمَنْ كَانَتْ هِجْرَتُهُ لِدُنْيَا يُصِيبُهَا أَوْ امْرَأَةٍ يَنْكِحُهَا فَهِجْرَتُهُ إلَى مَا هَاجَرَ إلَيْهِ\".\nرَوَاهُ إِمَامَا الْمُحَدِّثِينَ أَبُو عَبْدِ اللهِ مُحَمَّدُ بنُ إِسْمَاعِيل بن إِبْرَاهِيم بن الْمُغِيرَة بن بَرْدِزبَه الْبُخَارِيُّ الْجُعْفِيُّ  رَضِيَ اللهُ عَنْهُمَا فِي \"صَحِيحَيْهِمَا\" اللذَينِ هُمَا أَصَحُّ الْكُتُبِ الْمُصَنَّفَةِ.", "عَنْ عُمَرَ رَضِيَ اللهُ عَنْهُ أَيْضًا قَالَ: \" بَيْنَمَا نَحْنُ جُلُوسٌ عِنْدَ رَسُولِ اللَّهِ صلى الله عليه و سلم ذَاتَ يَوْمٍ، إذْ طَلَعَ عَلَيْنَا رَجُلٌ شَدِيدُ بَيَاضِ الثِّيَابِ، شَدِيدُ سَوَادِ الشَّعْرِ، لَا يُرَى عَلَيْهِ أَثَرُ السَّفَرِ، وَلَا يَعْرِفُهُ مِنَّا أَحَدٌ. حَتَّى جَلَسَ إلَى النَّبِيِّ صلى الله عليه و سلم . فَأَسْنَدَ رُكْبَتَيْهِ إلَى رُكْبَتَيْهِ، وَوَضَعَ كَفَّيْهِ عَلَى فَخِذَيْهِ،\nوَقَالَ: يَا مُحَمَّدُ أَخْبِرْنِي عَنْ الْإِسْلَامِ.\nفَقَالَ رَسُولُ اللَّهِ صلى الله عليه و سلم الْإِسْلَامُ أَنْ تَشْهَدَ أَنْ لَا إلَهَ إلَّا اللَّهُ وَأَنَّ مُحَمَّدًا رَسُولُ اللَّهِ، وَتُقِيمَ الصَّلَاةَ، وَتُؤْتِيَ الزَّكَاةَ، وَتَصُومَ رَمَضَانَ، وَتَحُجَّ الْبَيْتَ إنْ اسْتَطَعْت إلَيْهِ سَبِيلًا.\nقَالَ: صَدَقْت . فَعَجِبْنَا لَهُ يَسْأَلُهُ وَيُصَدِّقُهُ!\nقَالَ: فَأَخْبِرْنِي عَنْ الْإِيمَانِ.\nقَالَ: أَنْ تُؤْمِنَ بِاَللَّهِ وَمَلَائِكَتِهِ وَكُتُبِهِ وَرُسُلِهِ وَالْيَوْمِ الْآخِرِ، وَتُؤْمِنَ بِالْقَدَرِ خَيْرِهِ وَشَرِّهِ.\nقَالَ: صَدَقْت. قَالَ: فَأَخْبِرْنِي عَنْ الْإِحْسَانِ.\nقَالَ: أَنْ تَعْبُدَ اللَّهَ كَأَنَّك تَرَاهُ، فَإِنْ لَمْ تَكُنْ تَرَاهُ فَإِنَّهُ يَرَاك.\nقَالَ: فَأَخْبِرْنِي عَنْ السَّاعَةِ. قَالَ: مَا الْمَسْئُولُ عَنْهَا بِأَعْلَمَ مِنْ السَّائِلِ.\nقَالَ: فَأَخْبِرْنِي عَنْ أَمَارَاتِهَا؟ قَالَ: أَنْ تَلِدَ الْأَمَةُ رَبَّتَهَا، وَأَنْ تَرَى الْحُفَاةَ الْعُرَاةَ الْعَالَةَ رِعَاءَ الشَّاءِ يَتَطَاوَلُونَ فِي الْبُنْيَانِ. ثُمَّ انْطَلَقَ، فَلَبِثْتُ مَلِيًّا،\nثُمَّ قَالَ: يَا عُمَرُ أَتَدْرِي مَنْ السَّائِلُ؟.\nقُلْتُ: اللَّهُ وَرَسُولُهُ أَعْلَمُ.\nقَالَ: فَإِنَّهُ جِبْرِيلُ أَتَاكُمْ يُعَلِّمُكُمْ دِينَكُمْ \".", "عَنْ أَبِي عَبْدِ الرَّحْمَنِ عَبْدِ اللَّهِ بْنِ عُمَرَ بْنِ الْخَطَّابِ رَضِيَ اللَّهُ عَنْهُمَا قَالَ: سَمِعْت رَسُولَ اللَّهِ صلى الله عليه و سلم يَقُولُ: \" بُنِيَ الْإِسْلَامُ عَلَى خَمْسٍ: شَهَادَةِ أَنْ لَا إلَهَ إلَّا اللَّهُ وَأَنَّ مُحَمَّدًا رَسُولُ اللَّهِ، وَإِقَامِ الصَّلَاةِ، وَإِيتَاءِ الزَّكَاةِ، وَحَجِّ الْبَيْتِ، وَصَوْمِ رَمَضَانَ\".", "عَنْ أَبِي عَبْدِ الرَّحْمَنِ عَبْدِ اللَّهِ بْنِ مَسْعُودٍ رَضِيَ اللهُ عَنْهُ قَالَ: حَدَّثَنَا رَسُولُ اللَّهِ صلى الله عليه و سلم -وَهُوَ الصَّادِقُ الْمَصْدُوقُ-: \"إنَّ أَحَدَكُمْ يُجْمَعُ خَلْقُهُ فِي بَطْنِ أُمِّهِ أَرْبَعِينَ يَوْمًا نُطْفَةً، ثُمَّ يَكُونُ عَلَقَةً مِثْلَ ذَلِكَ، ثُمَّ يَكُونُ مُضْغَةً مِثْلَ ذَلِكَ، ثُمَّ يُرْسَلُ إلَيْهِ الْمَلَكُ فَيَنْفُخُ فِيهِ الرُّوحَ، وَيُؤْمَرُ بِأَرْبَعِ كَلِمَاتٍ: بِكَتْبِ رِزْقِهِ، وَأَجَلِهِ، وَعَمَلِهِ، وَشَقِيٍّ أَمْ سَعِيدٍ؛ فَوَاَللَّهِ الَّذِي لَا إلَهَ غَيْرُهُ إنَّ أَحَدَكُمْ لَيَعْمَلُ بِعَمَلِ أَهْلِ الْجَنَّةِ حَتَّى مَا يَكُونُ بَيْنَهُ وَبَيْنَهَا إلَّا ذِرَاعٌ فَيَسْبِقُ عَلَيْهِ الْكِتَابُ فَيَعْمَلُ بِعَمَلِ أَهْلِ النَّارِ فَيَدْخُلُهَا. وَإِنَّ أَحَدَكُمْ لَيَعْمَلُ بِعَمَلِ أَهْلِ النَّارِ حَتَّى مَا يَكُونُ بَيْنَهُ وَبَيْنَهَا إلَّا ذِرَاعٌ فَيَسْبِقُ عَلَيْهِ الْكِتَابُ فَيَعْمَلُ بِعَمَلِ أَهْلِ الْجَنَّةِ فَيَدْخُلُهَا\".", "عَنْ أُمِّ الْمُؤْمِنِينَ أُمِّ عَبْدِ اللَّهِ عَائِشَةَ رَضِيَ اللَّهُ عَنْهَا، قَالَتْ: قَالَ: رَسُولُ اللَّهِ صلى الله عليه و سلم \"مَنْ أَحْدَثَ فِي أَمْرِنَا هَذَا مَا لَيْسَ مِنْهُ فَهُوَ رَدٌّ\nوَفِي رِوَايَةٍ لِمُسْلِمٍ: مَنْ عَمِلَ عَمَلًا لَيْسَ عَلَيْهِ أَمْرُنَا فَهُوَ رَدٌّ\".", "عَنْ أَبِي عَبْدِ اللَّهِ النُّعْمَانِ بْنِ بَشِيرٍ رَضِيَ اللَّهُ عَنْهُمَا، قَالَ: سَمِعْت رَسُولَ اللَّهِ صلى الله عليه و سلم يَقُولُ: \"إنَّ الْحَلَالَ بَيِّنٌ، وَإِنَّ الْحَرَامَ بَيِّنٌ، وَبَيْنَهُمَا أُمُورٌ مُشْتَبِهَاتٌ لَا يَعْلَمُهُنَّ كَثِيرٌ مِنْ النَّاسِ، فَمَنْ اتَّقَى الشُّبُهَاتِ فَقْد اسْتَبْرَأَ لِدِينِهِ وَعِرْضِهِ، وَمَنْ وَقَعَ فِي الشُّبُهَاتِ وَقَعَ فِي الْحَرَامِ، كَالرَّاعِي يَرْعَى حَوْلَ الْحِمَى يُوشِكُ أَنْ يَرْتَعَ فِيهِ، أَلَا وَإِنَّ لِكُلِّ مَلِكٍ حِمًى، أَلَا وَإِنَّ حِمَى اللَّهِ مَحَارِمُهُ، أَلَا وَإِنَّ فِي الْجَسَدِ مُضْغَةً إذَا صَلَحَتْ صَلَحَ الْجَسَدُ كُلُّهُ، وَإذَا فَسَدَتْ فَسَدَ الْجَسَدُ كُلُّهُ، أَلَا وَهِيَ الْقَلْبُ\".", "عَنْ أَبِي رُقَيَّةَ تَمِيمِ بْنِ أَوْسٍ الدَّارِيِّ رَضِيَ اللهُ عَنْهُ أَنَّ النَّبِيَّ صلى الله عليه وسلم قَالَ: \"الدِّينُ النَّصِيحَةُ.\" قُلْنَا: لِمَنْ؟ قَالَ: \"لِلَّهِ، وَلِكِتَابِهِ، وَلِرَسُولِهِ، وَلِأَئِمَّةِ الْمُسْلِمِينَ وَعَامَّتِهِمْ.\"", "عَنْ ابْنِ عُمَرَ رَضِيَ اللَّهُ عَنْهُمَا، أَنَّ رَسُولَ اللَّهِ صلى الله عليه و سلم قَالَ: \"أُمِرْتُ أَنْ أُقَاتِلَ النَّاسَ حَتَّى يَشْهَدُوا أَنْ لَا إلَهَ إلَّا اللَّهُ وَأَنَّ مُحَمَّدًا رَسُولُ اللَّهِ، وَيُقِيمُوا الصَّلَاةَ، وَيُؤْتُوا الزَّكَاةَ؛ فَإِذَا فَعَلُوا ذَلِكَ عَصَمُوا مِنِّي دِمَاءَهُمْ وَأَمْوَالَهُمْ إلَّا بِحَقِّ الْإِسْلَامِ، وَحِسَابُهُمْ عَلَى اللَّهِ تَعَالَى\" .", "عَنْ أَبِي هُرَيْرَةَ عَبْدِ الرَّحْمَنِ بْنِ صَخْرٍ رَضِيَ اللهُ عَنْهُ قَالَ: سَمِعْت رَسُولَ اللَّهِ صلى الله عليه و سلم يَقُولُ: \"مَا نَهَيْتُكُمْ عَنْهُ فَاجْتَنِبُوهُ، وَمَا أَمَرْتُكُمْ بِهِ فَأْتُوا مِنْهُ مَا اسْتَطَعْتُمْ، فَإِنَّمَا أَهْلَكَ الَّذِينَ مِنْ قَبْلِكُمْ كَثْرَةُ مَسَائِلِهِمْ وَاخْتِلَافُهُمْ عَلَى أَنْبِيَائِهِمْ \".", "عَنْ أَبِي هُرَيْرَةَ رَضِيَ اللهُ عَنْهُ قَالَ: قَالَ رَسُولُ اللَّهِ صلى الله عليه و سلم \"إنَّ اللَّهَ طَيِّبٌ لَا يَقْبَلُ إلَّا طَيِّبًا، وَإِنَّ اللَّهَ أَمَرَ الْمُؤْمِنِينَ بِمَا أَمَرَ بِهِ الْمُرْسَلِينَ فَقَالَ تَعَالَى: \"يَا أَيُّهَا الرُّسُلُ كُلُوا مِنْ الطَّيِّبَاتِ وَاعْمَلُوا صَالِحًا\"، وَقَالَ تَعَالَى: \"يَا أَيُّهَا الَّذِينَ آمَنُوا كُلُوا مِنْ طَيِّبَاتِ مَا رَزَقْنَاكُمْ\" ثُمَّ ذَكَرَ الرَّجُلَ يُطِيلُ السَّفَرَ أَشْعَثَ أَغْبَرَ يَمُدُّ يَدَيْهِ إلَى السَّمَاءِ: يَا رَبِّ! يَا رَبِّ! وَمَطْعَمُهُ حَرَامٌ، وَمَشْرَبُهُ حَرَامٌ، وَمَلْبَسُهُ حَرَامٌ، وَغُذِّيَ بِالْحَرَامِ، فَأَنَّى يُسْتَجَابُ لَهُ؟\".", "عَنْ أَبِي مُحَمَّدٍ الْحَسَنِ بْنِ عَلِيِّ بْنِ أَبِي طَالِبٍ سِبْطِ رَسُولِ اللَّهِ صلى الله عليه و سلم وَرَيْحَانَتِهِ رَضِيَ اللَّهُ عَنْهُمَا، قَالَ: حَفِظْت مِنْ رَسُولِ اللَّهِ صلى الله عليه و سلم \"دَعْ مَا يُرِيبُك إلَى مَا لَا يُرِيبُك\".\nرَوَاهُ التِّرْمِذِيُّ ،\n وَقَالَ التِّرْمِذِيُّ: حَدِيثٌ حَسَنٌ صَحِيحٌ.", "عَنْ أَبِي هُرَيْرَةَ رَضِيَ اللهُ عَنْهُ قَالَ: قَالَ رَسُولُ اللَّهِ صلى الله عليه و سلم \"مِنْ حُسْنِ إسْلَامِ الْمَرْءِ تَرْكُهُ مَا لَا يَعْنِيهِ\".\nحَدِيثٌ حَسَنٌ، رَوَاهُ التِّرْمِذِيُّ .", "عَنْ أَبِي حَمْزَةَ أَنَسِ بْنِ مَالِكٍ رَضِيَ اللهُ عَنْهُ خَادِمِ رَسُولِ اللَّهِ صلى الله عليه و سلم عَنْ النَّبِيِّ صلى الله عليه و سلم قَالَ: \"لَا يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ\".\nرَوَاهُ الْبُخَارِيُّ .\n،", "عَنْ ابْنِ مَسْعُودٍ رَضِيَ اللهُ عَنْهُ قَالَ: قَالَ رَسُولُ اللَّهِ صلى الله عليه و سلم \"لَا يَحِلُّ دَمُ امْرِئٍ مُسْلِمٍ  إلَّا بِإِحْدَى ثَلَاثٍ: الثَّيِّبُ الزَّانِي، وَالنَّفْسُ بِالنَّفْسِ، وَالتَّارِكُ لِدِينِهِ الْمُفَارِقُ لِلْجَمَاعَةِ\".\n،", "عَنْ أَبِي هُرَيْرَةَ رَضِيَ اللهُ عَنْهُ أَنَّ رَسُولَ اللَّهِ صلى الله عليه و سلم قَالَ: \"مَنْ كَانَ يُؤْمِنُ بِاَللَّهِ وَالْيَوْمِ الْآخِرِ فَلْيَقُلْ خَيْرًا أَوْ لِيَصْمُتْ، وَمَنْ كَانَ يُؤْمِنُ بِاَللَّهِ وَالْيَوْمِ الْآخِرِ فَلْيُكْرِمْ جَارَهُ، وَمَنْ كَانَ يُؤْمِنُ بِاَللَّهِ وَالْيَوْمِ الْآخِرِ فَلْيُكْرِمْ ضَيْفَهُ\".\n،", "عَنْ أَبِي هُرَيْرَةَ رَضِيَ اللهُ عَنْهُ أَنَّ رَجُلًا قَالَ لِلنَّبِيِّ صلى الله عليه و سلم أَوْصِنِي. قَالَ: لَا تَغْضَبْ، فَرَدَّدَ مِرَارًا، قَالَ: لَا تَغْضَبْ\" .", "عَنْ أَبِي يَعْلَى شَدَّادِ بْنِ أَوْسٍ رَضِيَ اللهُ عَنْهُ عَنْ رَسُولِ اللَّهِ صلى الله عليه و سلم قَالَ: \"إنَّ اللَّهَ كَتَبَ الْإِحْسَانَ عَلَى كُلِّ شَيْءٍ، فَإِذَا قَتَلْتُمْ فَأَحْسِنُوا الْقِتْلَةَ، وَإِذَا ذَبَحْتُمْ فَأَحْسِنُوا الذِّبْحَةَ، وَلْيُحِدَّ أَحَدُكُمْ شَفْرَتَهُ، وَلْيُرِحْ ذَبِيحَتَهُ\".", "عَنْ أَبِي ذَرٍّ جُنْدَبِ بْنِ جُنَادَةَ، وَأَبِي عَبْدِ الرَّحْمَنِ مُعَاذِ بْنِ جَبَلٍ رَضِيَ اللَّهُ عَنْهُمَا، عَنْ رَسُولِ اللَّهِ صلى الله عليه و سلم قَالَ: \"اتَّقِ اللَّهَ حَيْثُمَا كُنْت، وَأَتْبِعْ السَّيِّئَةَ الْحَسَنَةَ تَمْحُهَا، وَخَالِقْ النَّاسَ بِخُلُقٍ حَسَنٍ\" .\nرَوَاهُ التِّرْمِذِيُّ  وَقَالَ: حَدِيثٌ حَسَنٌ، وَفِي بَعْضِ النُّسَخِ: حَسَنٌ صَحِيحٌ.", "عَنْ عَبْدِ اللَّهِ بْنِ عَبَّاسٍ رَضِيَ اللَّهُ عَنْهُمَا قَالَ: \"كُنْت خَلْفَ رَسُولِ اللَّهِ صلى الله عليه و سلم يَوْمًا، فَقَالَ: يَا غُلَامِ! إنِّي أُعَلِّمُك كَلِمَاتٍ: احْفَظْ اللَّهَ يَحْفَظْك، احْفَظْ اللَّهَ تَجِدْهُ تُجَاهَك، إذَا سَأَلْت فَاسْأَلْ اللَّهَ، وَإِذَا اسْتَعَنْت فَاسْتَعِنْ بِاَللَّهِ، وَاعْلَمْ أَنَّ الْأُمَّةَ لَوْ اجْتَمَعَتْ عَلَى أَنْ يَنْفَعُوك بِشَيْءٍ لَمْ يَنْفَعُوك إلَّا بِشَيْءٍ قَدْ كَتَبَهُ اللَّهُ لَك، وَإِنْ اجْتَمَعُوا عَلَى أَنْ يَضُرُّوك بِشَيْءٍ لَمْ يَضُرُّوك إلَّا بِشَيْءٍ قَدْ كَتَبَهُ اللَّهُ عَلَيْك؛ رُفِعَتْ الْأَقْلَامُ، وَجَفَّتْ الصُّحُفُ\" . رَوَاهُ التِّرْمِذِيُّ  وَقَالَ: حَدِيثٌ حَسَنٌ صَحِيحٌ.\nوَفِي رِوَايَةِ غَيْرِ التِّرْمِذِيِّ: \"احْفَظْ اللَّهَ تَجِدْهُ أمامك، تَعَرَّفْ إلَى اللَّهِ فِي الرَّخَاءِ يَعْرِفُك فِي الشِّدَّةِ، وَاعْلَمْ أَنَّ مَا أَخْطَأَك لَمْ يَكُنْ لِيُصِيبَك، وَمَا أَصَابَك لَمْ يَكُنْ لِيُخْطِئَك، وَاعْلَمْ أَنَّ النَّصْرَ مَعَ الصَّبْرِ، وَأَنْ الْفَرَجَ مَعَ الْكَرْبِ، وَأَنَّ مَعَ الْعُسْرِ يُسْرًا\".", "عَنْ أَبِي مَسْعُودٍ عُقْبَةَ بْنِ عَمْرٍو الْأَنْصَارِيِّ الْبَدْرِيِّ رَضِيَ اللهُ عَنْهُ قَالَ: قَالَ رَسُولُ اللَّهِ صلى الله عليه و سلم \"إنَّ مِمَّا أَدْرَكَ النَّاسُ مِنْ كَلَامِ النُّبُوَّةِ الْأُولَى: إذَا لَمْ تَسْتَحِ فَاصْنَعْ مَا شِئْت\" .", "عَنْ أَبِي عَمْرٍو وَقِيلَ: أَبِي عَمْرَةَ سُفْيَانَ بْنِ عَبْدِ اللَّهِ رَضِيَ اللهُ عَنْهُ قَالَ: \"قُلْت: يَا رَسُولَ اللَّهِ! قُلْ لِي فِي الْإِسْلَامِ قَوْلًا لَا أَسْأَلُ عَنْهُ أَحَدًا غَيْرَك؛ قَالَ: قُلْ: آمَنْت بِاَللَّهِ ثُمَّ اسْتَقِمْ\" .", "عَنْ أَبِي عَبْدِ اللَّهِ جَابِرِ بْنِ عَبْدِ اللَّهِ الْأَنْصَارِيِّ رَضِيَ اللَّهُ عَنْهُمَا: \"أَنَّ رَجُلًا سَأَلَ رَسُولَ اللَّهِ صلى الله عليه و سلم فَقَالَ: أَرَأَيْت إذَا صَلَّيْت الْمَكْتُوبَاتِ، وَصُمْت رَمَضَانَ، وَأَحْلَلْت الْحَلَالَ، وَحَرَّمْت الْحَرَامَ، وَلَمْ أَزِدْ عَلَى ذَلِكَ شَيْئًا؛ أَأَدْخُلُ الْجَنَّةَ؟ قَالَ: نَعَمْ\".", "عَنْ أَبِي مَالِكٍ الْحَارِثِ بْنِ عَاصِمٍ الْأَشْعَرِيِّ رَضِيَ اللهُ عَنْهُ قَالَ: قَالَ رَسُولُ اللَّهِ صلى الله عليه و سلم \"الطَّهُورُ شَطْرُ الْإِيمَانِ، وَالْحَمْدُ لِلَّهِ تَمْلَأُ الْمِيزَانَ، وَسُبْحَانَ اللَّهِ وَالْحَمْدُ لِلَّهِ تَمْلَآنِ -أَوْ: تَمْلَأُ- مَا بَيْنَ السَّمَاءِ وَالْأَرْضِ، وَالصَّلَاةُ نُورٌ، وَالصَّدَقَةُ بُرْهَانٌ، وَالصَّبْرُ ضِيَاءٌ، وَالْقُرْآنُ حُجَّةٌ لَك أَوْ عَلَيْك، كُلُّ النَّاسِ يَغْدُو، فَبَائِعٌ نَفْسَهُ فَمُعْتِقُهَا أَوْ مُوبِقُهَا\".", "عَنْ أَبِي ذَرٍّ الْغِفَارِيِّ رَضِيَ اللهُ عَنْهُ عَنْ النَّبِيِّ صلى الله عليه و سلم فِيمَا يَرْوِيهِ عَنْ رَبِّهِ تَبَارَكَ وَتَعَالَى، أَنَّهُ قَالَ: \"يَا عِبَادِي: إنِّي حَرَّمْت الظُّلْمَ عَلَى نَفْسِي، وَجَعَلْته بَيْنَكُمْ مُحَرَّمًا؛ فَلَا تَظَالَمُوا. يَا عِبَادِي! كُلُّكُمْ ضَالٌّ إلَّا مَنْ هَدَيْته، فَاسْتَهْدُونِي أَهْدِكُمْ. يَا عِبَادِي! كُلُّكُمْ جَائِعٌ إلَّا مَنْ أَطْعَمْته، فَاسْتَطْعِمُونِي أُطْعِمْكُمْ. يَا عِبَادِي! كُلُّكُمْ عَارٍ إلَّا مَنْ كَسَوْته، فَاسْتَكْسُونِي أَكْسُكُمْ. يَا عِبَادِي! إنَّكُمْ تُخْطِئُونَ بِاللَّيْلِ وَالنَّهَارِ، وَأَنَا أَغْفِرُ الذُّنُوبَ جَمِيعًا؛ فَاسْتَغْفِرُونِي أَغْفِرْ لَكُمْ. يَا عِبَادِي! إنَّكُمْ لَنْ تَبْلُغُوا ضُرِّي فَتَضُرُّونِي، وَلَنْ تَبْلُغُوا نَفْعِي فَتَنْفَعُونِي. يَا عِبَادِي! لَوْ أَنَّ أَوَّلَكُمْ وَآخِرَكُمْ وَإِنْسَكُمْ وَجِنَّكُمْ كَانُوا عَلَى أَتْقَى قَلْبِ رَجُلٍ وَاحِدٍ مِنْكُمْ، مَا زَادَ ذَلِكَ فِي مُلْكِي شَيْئًا. يَا عِبَادِي! لَوْ أَنَّ أَوَّلَكُمْ وَآخِرَكُمْ وَإِنْسَكُمْ وَجِنَّكُمْ كَانُوا عَلَى أَفْجَرِ قَلْبِ رَجُلٍ وَاحِدٍ مِنْكُمْ، مَا نَقَصَ ذَلِكَ مِنْ مُلْكِي شَيْئًا. يَا عِبَادِي! لَوْ أَنَّ أَوَّلَكُمْ وَآخِرَكُمْ وَإِنْسَكُمْ وَجِنَّكُمْ قَامُوا فِي صَعِيدٍ وَاحِدٍ، فَسَأَلُونِي، فَأَعْطَيْت كُلَّ وَاحِدٍ مَسْأَلَته، مَا نَقَصَ ذَلِكَ مِمَّا عِنْدِي إلَّا كَمَا يَنْقُصُ الْمِخْيَطُ إذَا أُدْخِلَ الْبَحْرَ. يَا عِبَادِي! إنَّمَا هِيَ أَعْمَالُكُمْ أُحْصِيهَا لَكُمْ، ثُمَّ أُوَفِّيكُمْ إيَّاهَا؛ فَمَنْ وَجَدَ خَيْرًا فَلْيَحْمَدْ اللَّهَ، وَمَنْ وَجَدَ غَيْرَ ذَلِكَ فَلَا يَلُومَن إلَّا نَفْسَهُ\".", "عَنْ أَبِي ذَرٍّ رَضِيَ اللهُ عَنْهُ أَيْضًا، \"أَنَّ نَاسًا مِنْ أَصْحَابِ رَسُولِ اللَّهِ صلى الله عليه و سلم قَالُوا لِلنَّبِيِّ صلى الله عليه و سلم يَا رَسُولَ اللَّهِ ذَهَبَ أَهْلُ الدُّثُورِ بِالْأُجُورِ؛ يُصَلُّونَ كَمَا نُصَلِّي، وَيَصُومُونَ كَمَا نَصُومُ، وَيَتَصَدَّقُونَ بِفُضُولِ أَمْوَالِهِمْ. قَالَ: أَوَلَيْسَ قَدْ جَعَلَ اللَّهُ لَكُمْ مَا تَصَّدَّقُونَ؟ إنَّ بِكُلِّ تَسْبِيحَةٍ صَدَقَةً، وَكُلِّ تَكْبِيرَةٍ صَدَقَةً، وَكُلِّ تَحْمِيدَةٍ صَدَقَةً، وَكُلِّ تَهْلِيلَةٍ صَدَقَةً، وَأَمْرٌ بِمَعْرُوفٍ صَدَقَةٌ، وَنَهْيٌ عَنْ مُنْكَرٍ صَدَقَةٌ، وَفِي بُضْعِ أَحَدِكُمْ صَدَقَةٌ. قَالُوا: يَا رَسُولَ اللَّهِ أَيَأْتِي أَحَدُنَا شَهْوَتَهُ وَيَكُونُ لَهُ فِيهَا أَجْرٌ؟ قَالَ: أَرَأَيْتُمْ لَوْ وَضَعَهَا فِي حَرَامٍ أَكَانَ عَلَيْهِ وِزْرٌ؟ فَكَذَلِكَ إذَا وَضَعَهَا فِي الْحَلَالِ، كَانَ لَهُ أَجْرٌ\".", "عَنْ أَبِي هُرَيْرَةَ رَضِيَ اللهُ عَنْهُ قَالَ: قَالَ رَسُولُ اللَّهِ صلى الله عليه و سلم \"كُلُّ سُلَامَى مِنْ النَّاسِ عَلَيْهِ صَدَقَةٌ، كُلَّ يَوْمٍ تَطْلُعُ فِيهِ الشَّمْسُ تَعْدِلُ بَيْنَ اثْنَيْنِ صَدَقَةٌ، وَتُعِينُ الرَّجُلَ فِي دَابَّتِهِ فَتَحْمِلُهُ عَلَيْهَا أَوْ تَرْفَعُ لَهُ عَلَيْهَا مَتَاعَهُ صَدَقَةٌ، وَالْكَلِمَةُ الطَّيِّبَةُ صَدَقَةٌ، وَبِكُلِّ خُطْوَةٍ تَمْشِيهَا إلَى الصَّلَاةِ صَدَقَةٌ، وَتُمِيطُ الْأَذَى عَنْ الطَّرِيقِ صَدَقَةٌ\".\n، .", "عَنْ النَّوَّاسِ بْنِ سَمْعَانَ رَضِيَ اللهُ عَنْهُ عَنْ النَّبِيِّ صلى الله عليه و سلم قَالَ: \"الْبِرُّ حُسْنُ الْخُلُقِ، وَالْإِثْمُ مَا حَاكَ فِي صَدْرِك، وَكَرِهْت أَنْ يَطَّلِعَ عَلَيْهِ النَّاسُ\" رَوَاهُ مُسْلِمٌ . وَعَنْ وَابِصَةَ بْنِ مَعْبَدٍ رَضِيَ اللهُ عَنْهُ قَالَ: أَتَيْت رَسُولَ اللَّهِ صلى الله عليه و سلم فَقَالَ: \"جِئْتَ تَسْأَلُ عَنْ الْبِرِّ؟ قُلْت: نَعَمْ. فقَالَ: استفت قلبك، الْبِرُّ مَا اطْمَأَنَّتْ إلَيْهِ النَّفْسُ، وَاطْمَأَنَّ إلَيْهِ الْقَلْبُ، وَالْإِثْمُ مَا حَاكَ فِي النَّفْسِ وَتَرَدَّدَ فِي الصَّدْرِ، وَإِنْ أَفْتَاك النَّاسُ وَأَفْتَوْك\" .\nحَدِيثٌ حَسَنٌ، رَوَيْنَاهُ في مُسْنَدَي الْإِمَامَيْنِ أَحْمَدَ بْنِ حَنْبَلٍ  بِإِسْنَادٍ حَسَنٍ.", "عَنْ أَبِي نَجِيحٍ الْعِرْبَاضِ بْنِ سَارِيَةَ رَضِيَ اللهُ عَنْهُ قَالَ: \"وَعَظَنَا رَسُولُ اللَّهِ صلى الله عليه و سلم مَوْعِظَةً وَجِلَتْ مِنْهَا الْقُلُوبُ، وَذَرَفَتْ مِنْهَا الْعُيُونُ، فَقُلْنَا: يَا رَسُولَ اللَّهِ! كَأَنَّهَا مَوْعِظَةُ مُوَدِّعٍ فَأَوْصِنَا، قَالَ: أُوصِيكُمْ بِتَقْوَى اللَّهِ، وَالسَّمْعِ وَالطَّاعَةِ وَإِنْ تَأَمَّرَ عَلَيْكُمْ عَبْدٌ، فَإِنَّهُ مَنْ يَعِشْ مِنْكُمْ فَسَيَرَى اخْتِلَافًا كَثِيرًا، فَعَلَيْكُمْ بِسُنَّتِي وَسُنَّةِ الْخُلَفَاءِ الرَّاشِدِينَ الْمَهْدِيينَ، عَضُّوا عَلَيْهَا بِالنَّوَاجِذِ، وَإِيَّاكُمْ وَمُحْدَثَاتِ الْأُمُورِ؛ فَإِنَّ كُلَّ بِدْعَةٍ ضَلَالَةٌ\".\n  وَقَالَ: حَدِيثٌ حَسَنٌ صَحِيحٌ.", "عَنْ مُعَاذِ بْنِ جَبَلٍ رَضِيَ اللهُ عَنْهُ قَالَ: قُلْت يَا رَسُولَ اللَّهِ! أَخْبِرْنِي بِعَمَلٍ يُدْخِلُنِي الْجَنَّةَ وَيُبَاعِدْنِي مِنْ النَّارِ، قَالَ: \"لَقَدْ سَأَلْت عَنْ عَظِيمٍ، وَإِنَّهُ لَيَسِيرٌ عَلَى مَنْ يَسَّرَهُ اللَّهُ عَلَيْهِ: تَعْبُدُ اللَّهَ لَا تُشْرِكْ بِهِ شَيْئًا، وَتُقِيمُ الصَّلَاةَ، وَتُؤْتِي الزَّكَاةَ، وَتَصُومُ رَمَضَانَ، وَتَحُجُّ الْبَيْتَ، ثُمَّ قَالَ: أَلَا أَدُلُّك عَلَى أَبْوَابِ الْخَيْرِ؟ الصَّوْمُ جُنَّةٌ، وَالصَّدَقَةُ تُطْفِئُ الْخَطِيئَةَ كَمَا يُطْفِئُ الْمَاءُ النَّارَ، وَصَلَاةُ الرَّجُلِ فِي جَوْفِ اللَّيْلِ، ثُمَّ تَلَا: \" تَتَجَافَى جُنُوبُهُمْ عَنِ الْمَضَاجِعِ \" حَتَّى بَلَغَ \"يَعْمَلُونَ\"، ثُمَّ قَالَ: أَلَا أُخْبِرُك بِرَأْسِ الْأَمْرِ وَعَمُودِهِ وَذُرْوَةِ سَنَامِهِ؟ قُلْت: بَلَى يَا رَسُولَ اللَّهِ. قَالَ: رَأْسُ الْأَمْرِ الْإِسْلَامُ، وَعَمُودُهُ الصَّلَاةُ، وَذُرْوَةُ سَنَامِهِ الْجِهَادُ، ثُمَّ قَالَ: أَلَا أُخْبِرُك بِمَلَاكِ ذَلِكَ كُلِّهِ؟ فقُلْت: بَلَى يَا رَسُولَ اللَّهِ ! فَأَخَذَ بِلِسَانِهِ وَقَالَ: كُفَّ عَلَيْك هَذَا. قُلْت: يَا نَبِيَّ اللَّهِ وَإِنَّا لَمُؤَاخَذُونَ بِمَا نَتَكَلَّمُ بِهِ؟ فَقَالَ: ثَكِلَتْك أُمُّك وَهَلْ يَكُبُّ النَّاسَ عَلَى وُجُوهِهِمْ -أَوْ قَالَ عَلَى مَنَاخِرِهِمْ- إلَّا حَصَائِدُ أَلْسِنَتِهِمْ؟!\" .\nرَوَاهُ التِّرْمِذِيُّ  وَقَالَ: حَدِيثٌ حَسَنٌ صَحِيحٌ.", "عَنْ أَبِي ثَعْلَبَةَ الْخُشَنِيِّ جُرْثُومِ بن نَاشِر رَضِيَ اللهُ عَنْهُ عَنْ رَسُولِ اللَّهِ صلى الله عليه و سلم قَال: \"إنَّ اللَّهَ تَعَالَى فَرَضَ فَرَائِضَ فَلَا تُضَيِّعُوهَا، وَحَدَّ حُدُودًا فَلَا تَعْتَدُوهَا، وَحَرَّمَ أَشْيَاءَ فَلَا تَنْتَهِكُوهَا، وَسَكَتَ عَنْ أَشْيَاءَ رَحْمَةً لَكُمْ غَيْرَ نِسْيَانٍ فَلَا تَبْحَثُوا عَنْهَا\".\nحَدِيثٌ حَسَنٌ، رَوَاهُ الدَّارَقُطْنِيّ ْ\"في سننه\" ، وَغَيْرُهُ.", "عَنْ أَبِي الْعَبَّاسِ سَهْلِ بْنِ سَعْدٍ السَّاعِدِيّ رَضِيَ اللهُ عَنْهُ قَالَ: جَاءَ رَجُلٌ إلَى النَّبِيِّ صلى الله عليه و سلم فَقَالَ: يَا رَسُولَ اللهِ! دُلَّنِي عَلَى عَمَلٍ إذَا عَمِلْتُهُ أَحَبَّنِي اللهُ وَأَحَبَّنِي النَّاسُ؛ فَقَالَ: \"ازْهَدْ فِي الدُّنْيَا يُحِبَّك اللهُ، وَازْهَدْ فِيمَا عِنْدَ النَّاسِ يُحِبَّك النَّاسُ\" .\nحديث حسن، رَوَاهُ ابْنُ مَاجَهْ ، وَغَيْرُهُ بِأَسَانِيدَ حَسَنَةٍ.", "عَنْ أَبِي سَعِيدٍ سَعْدِ بْنِ مَالِكِ بْنِ سِنَانٍ الْخُدْرِيّ رَضِيَ اللهُ عَنْهُ أَنَّ رَسُولَ اللَّهِ صلى الله عليه و سلم قَالَ: \" لَا ضَرَرَ وَلَا ضِرَارَ\" .\nحَدِيثٌ حَسَنٌ، رَوَاهُ ابْنُ مَاجَهْ  فِي \"الْمُوَطَّإِ\" عَنْ عَمْرِو بْنِ يَحْيَى عَنْ أَبِيهِ عَنْ النَّبِيِّ صلى الله عليه و سلم مُرْسَلًا، فَأَسْقَطَ أَبَا سَعِيدٍ، وَلَهُ طُرُقٌ يُقَوِّي بَعْضُهَا بَعْضًا.", "عَنْ ابْنِ عَبَّاسٍ رَضِيَ اللَّهُ عَنْهُمَا أَنَّ رَسُولَ اللَّهِ صلى الله عليه و سلم قَالَ: \"لَوْ يُعْطَى النَّاسُ بِدَعْوَاهُمْ لَادَّعَى رِجَالٌ أَمْوَالَ قَوْمٍ وَدِمَاءَهُمْ، لَكِنَّ الْبَيِّنَةَ عَلَى الْمُدَّعِي، وَالْيَمِينَ عَلَى مَنْ أَنْكَرَ\" .\nحَدِيثٌ حَسَنٌ، رَوَاهُ الْبَيْهَقِيّ ، وَغَيْرُهُ هَكَذَا، وَبَعْضُهُ فِي \"الصَّحِيحَيْنِ\".", "عَنْ أَبِي سَعِيدٍ الْخُدْرِيّ رَضِيَ اللهُ عَنْهُ قَالَ سَمِعْت رَسُولَ اللَّهِ صلى الله عليه و سلم يَقُولُ: \"مَنْ رَأَى مِنْكُمْ مُنْكَرًا فَلْيُغَيِّرْهُ بِيَدِهِ، فَإِنْ لَمْ يَسْتَطِعْ فَبِلِسَانِهِ، فَإِنْ لَمْ يَسْتَطِعْ فَبِقَلْبِهِ، وَذَلِكَ أَضْعَفُ الْإِيمَانِ\" .", "عَنْ أَبِي هُرَيْرَةَ رَضِيَ اللهُ عَنْهُ قَالَ: قَالَ رَسُولُ اللَّهِ صلى الله عليه و سلم \" لَا تَحَاسَدُوا، وَلَا تَنَاجَشُوا، وَلَا تَبَاغَضُوا، وَلَا تَدَابَرُوا، وَلَا يَبِعْ بَعْضُكُمْ عَلَى بَيْعِ بَعْضٍ، وَكُونُوا عِبَادَ اللَّهِ إخْوَانًا، الْمُسْلِمُ أَخُو الْمُسْلِمِ، لَا يَظْلِمُهُ، وَلَا يَخْذُلُهُ، وَلَا يَكْذِبُهُ، وَلَا يَحْقِرُهُ، التَّقْوَى هَاهُنَا، وَيُشِيرُ إلَى صَدْرِهِ ثَلَاثَ مَرَّاتٍ، بِحَسْبِ امْرِئٍ مِنْ الشَّرِّ أَنْ يَحْقِرَ أَخَاهُ الْمُسْلِمَ، كُلُّ الْمُسْلِمِ عَلَى الْمُسْلِمِ حَرَامٌ: دَمُهُ وَمَالُهُ وَعِرْضُهُ\" .", "عَنْ أَبِي هُرَيْرَةَ رَضِيَ اللهُ عَنْهُ عَنْ النَّبِيِّ صلى الله عليه و سلم قَالَ: \"مَنْ نَفَّسَ عَنْ مُؤْمِنٍ كُرْبَةً مِنْ كُرَبِ الدُّنْيَا نَفَّسَ اللَّهُ عَنْهُ كُرْبَةً مِنْ كُرَبِ يَوْمِ الْقِيَامَةِ، وَمَنْ يَسَّرَ عَلَى مُعْسِرٍ، يَسَّرَ اللَّهُ عَلَيْهِ فِي الدُّنْيَا وَالْآخِرَةِ، وَمَنْ سَتَرَ مُسْلِما سَتَرَهُ اللهُ فِي الدُّنْيَا وَالْآخِرَةِ ، وَاَللَّهُ فِي عَوْنِ الْعَبْدِ مَا كَانَ الْعَبْدُ فِي عَوْنِ أَخِيهِ، وَمَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللَّهُ لَهُ بِهِ طَرِيقًا إلَى الْجَنَّةِ، وَمَا اجْتَمَعَ قَوْمٌ فِي بَيْتٍ مِنْ بُيُوتِ اللَّهِ يَتْلُونَ كِتَابَ اللَّهِ، وَيَتَدَارَسُونَهُ فِيمَا بَيْنَهُمْ؛ إلَّا نَزَلَتْ عَلَيْهِمْ السَّكِينَةُ، وَغَشِيَتْهُمْ الرَّحْمَةُ، وَ حَفَّتهُمُ المَلاَئِكَة، وَذَكَرَهُمْ اللَّهُ فِيمَنْ عِنْدَهُ، وَمَنْ أَبَطْأَ بِهِ عَمَلُهُ لَمْ يُسْرِعْ بِهِ نَسَبُهُ\".\n بهذا اللفظ.", "عَنْ ابْنِ عَبَّاسٍ رَضِيَ اللَّهُ عَنْهُمَا عَنْ رَسُولِ اللَّهِ صلى الله عليه و سلم فِيمَا يَرْوِيهِ عَنْ رَبِّهِ تَبَارَكَ وَتَعَالَى، قَالَ: \"إنَّ اللَّهَ كَتَبَ الْحَسَنَاتِ وَالسَّيِّئَاتِ، ثُمَّ بَيَّنَ ذَلِكَ، فَمَنْ هَمَّ بِحَسَنَةٍ فَلَمْ يَعْمَلْهَا كَتَبَهَا اللَّهُ عِنْدَهُ حَسَنَةً كَامِلَةً، وَإِنْ هَمَّ بِهَا فَعَمِلَهَا كَتَبَهَا اللَّهُ عِنْدَهُ عَشْرَ حَسَنَاتٍ إلَى سَبْعِمِائَةِ ضِعْفٍ إلَى أَضْعَافٍ كَثِيرَةٍ، وَإِنْ هَمَّ بِسَيِّئَةٍ فَلَمْ يَعْمَلْهَا كَتَبَهَا اللَّهُ عِنْدَهُ حَسَنَةً كَامِلَةً، وَإِنْ هَمَّ بِهَا فَعَمِلَهَا كَتَبَهَا اللَّهُ سَيِّئَةً وَاحِدَةً\".\n، ، في \"صحيحيهما\" بهذه الحروف.", "عَنْ أَبِي هُرَيْرَة رَضِيَ اللهُ عَنْهُ قَالَ: قَالَ رَسُول اللَّهِ صلى الله عليه و سلم إنَّ اللَّهَ تَعَالَى قَالَ: \"مَنْ عَادَى لِي وَلِيًّا فَقْد آذَنْتهُ بِالْحَرْبِ، وَمَا تَقَرَّبَ إلَيَّ عَبْدِي بِشَيْءٍ أَحَبَّ إلَيَّ مِمَّا افْتَرَضْتُهُ عَلَيْهِ، وَلَا يَزَالُ عَبْدِي يَتَقَرَّبُ إلَيَّ بِالنَّوَافِلِ حَتَّى أُحِبَّهُ، فَإِذَا أَحْبَبْتُهُ كُنْت سَمْعَهُ الَّذِي يَسْمَعُ بِهِ، وَبَصَرَهُ الَّذِي يُبْصِرُ بِهِ، وَيَدَهُ الَّتِي يَبْطِشُ بِهَا، وَرِجْلَهُ الَّتِي يَمْشِي بِهَا، وَلَئِنْ سَأَلَنِي لَأُعْطِيَنَّهُ، وَلَئِنْ اسْتَعَاذَنِي لَأُعِيذَنَّهُ\".", "عَنْ ابْنِ عَبَّاسٍ رَضِيَ اللَّهُ عَنْهُمَا أَنَّ رَسُولَ اللَّهِ صلى الله عليه و سلم قَالَ: \"إنَّ اللَّهَ تَجَاوَزَ لِي عَنْ أُمَّتِي الْخَطَأَ وَالنِّسْيَانَ وَمَا اسْتُكْرِهُوا عَلَيْهِ\" .\nحَدِيثٌ حَسَنٌ، رَوَاهُ ابْنُ مَاجَهْ .", "عَنْ ابْن عُمَرَ رَضِيَ اللَّهُ عَنْهُمَا قَالَ: أَخَذَ رَسُولُ اللَّهِ صلى الله عليه و سلم بِمَنْكِبِي، وَقَالَ: \"كُنْ فِي الدُّنْيَا كَأَنَّك غَرِيبٌ أَوْ عَابِرُ سَبِيلٍ\". وَكَانَ ابْنُ عُمَرَ رَضِيَ اللَّهُ عَنْهُمَا يَقُولُ: إذَا أَمْسَيْتَ فَلَا تَنْتَظِرْ الصَّبَاحَ، وَإِذَا أَصْبَحْتَ فَلَا تَنْتَظِرْ الْمَسَاءَ، وَخُذْ مِنْ صِحَّتِك لِمَرَضِك، وَمِنْ حَيَاتِك لِمَوْتِك.", "عَنْ أَبِي مُحَمَّدٍ عَبْدِ اللَّهِ بْنِ عَمْرِو بْنِ الْعَاصِ رَضِيَ اللَّهُ عَنْهُمَا، قَالَ: قَالَ رَسُولُ اللَّهِ صلى الله عليه و سلم \"لَا يُؤْمِنُ أَحَدُكُمْ حَتَّى يَكُونَ هَوَاهُ تَبَعًا لِمَا جِئْتُ بِهِ\".\nحَدِيثٌ حَسَنٌ صَحِيحٌ، رَوَيْنَاهُ فِي كِتَابِ \"الْحُجَّةِ\" بِإِسْنَادٍ صَحِيحٍ.", "عَنْ أَنَسِ بْنِ مَالِكٍ رَضِيَ اللهُ عَنْهُ قَالَ: سَمِعْت رَسُولَ اللَّهِ صلى الله عليه و سلم يَقُولُ: قَالَ اللَّهُ تَعَالَى: \"يَا ابْنَ آدَمَ! إِنَّكَ مَا دَعَوْتنِي وَرَجَوْتنِي غَفَرْتُ لَك عَلَى مَا كَانَ مِنْك وَلَا أُبَالِي، يَا ابْنَ آدَمَ! لَوْ بَلَغَتْ ذُنُوبُك عَنَانَ السَّمَاءِ ثُمَّ اسْتَغْفَرْتنِي غَفَرْتُ لَك، يَا ابْنَ آدَمَ! إنَّك لَوْ أتَيْتنِي بِقُرَابِ الْأَرْضِ خَطَايَا ثُمَّ لَقِيتنِي لَا تُشْرِكُ بِي شَيْئًا لَأَتَيْتُك بِقُرَابِهَا مَغْفِرَةً\" .\nرَوَاهُ التِّرْمِذِيُّ ، وَقَالَ: حَدِيثٌ حَسَنٌ صَحِيحٌ."];
// ── أسباب نزول مختارة (ثابتة بأسانيد صحيحة أو حسنة) — الصياغة مختصرة والمصدر مذكور مع كل سبب
const ASBAB_NUZUL = [{"s": 93, "sn": "الضحى", "v": "1-3", "t": "﴿مَا وَدَّعَكَ رَبُّكَ وَمَا قَلَىٰ﴾", "r": "تأخر الوحي عن النبي ﷺ أيامًا، فقالت امرأة: ما أرى شيطانك إلا قد تركك. فنزلت سورة الضحى تُطمئنه أن ربه لم يتركه ولم يبغضه.", "src": "البخاري ومسلم عن جندب رضي الله عنه"}, {"s": 111, "sn": "المسد", "v": "1-5", "t": "﴿تَبَّتْ يَدَا أَبِي لَهَبٍ وَتَبَّ﴾", "r": "لما أُمر النبي ﷺ بإنذار عشيرته صعد الصفا ونادى قريشًا، فقال أبو لهب: تبًّا لك، ألهذا جمعتنا؟ فنزلت السورة.", "src": "البخاري ومسلم عن ابن عباس رضي الله عنهما"}, {"s": 28, "sn": "القصص", "v": "56", "t": "﴿إِنَّكَ لَا تَهْدِي مَنْ أَحْبَبْتَ﴾", "r": "حين حضرت أبا طالب الوفاةُ عرض عليه النبي ﷺ كلمة التوحيد فأبى أن يقولها، فنزلت الآية تبيّن أن الهداية بيد الله.", "src": "البخاري ومسلم عن المسيّب بن حزن رضي الله عنه"}, {"s": 9, "sn": "التوبة", "v": "113", "t": "﴿مَا كَانَ لِلنَّبِيِّ وَالَّذِينَ آمَنُوا أَنْ يَسْتَغْفِرُوا لِلْمُشْرِكِينَ﴾", "r": "في القصة نفسها: قال النبي ﷺ لعمّه «لأستغفرنّ لك ما لم أُنْهَ عنك» فنزلت الآية تنهى عن الاستغفار للمشركين.", "src": "البخاري ومسلم عن المسيّب بن حزن رضي الله عنه"}, {"s": 17, "sn": "الإسراء", "v": "85", "t": "﴿وَيَسْأَلُونَكَ عَنِ الرُّوحِ﴾", "r": "سأل نفر من اليهود النبي ﷺ عن الروح، فسكت ثم نزل الوحي بالآية: الروح من أمر ربي وما أوتيتم من العلم إلا قليلًا.", "src": "البخاري ومسلم عن ابن مسعود رضي الله عنه"}, {"s": 80, "sn": "عبس", "v": "1-10", "t": "﴿عَبَسَ وَتَوَلَّىٰ﴾", "r": "جاء ابن أم مكتوم رضي الله عنه (وكان أعمى) يسأل النبي ﷺ وهو مشغول بدعوة كبار قريش، فأعرض عنه، فنزلت السورة تعاتبه برفق.", "src": "الترمذي عن عائشة رضي الله عنها"}, {"s": 24, "sn": "النور", "v": "11-20", "t": "﴿إِنَّ الَّذِينَ جَاءُوا بِالْإِفْكِ عُصْبَةٌ مِنْكُمْ﴾", "r": "في حادثة الإفك: اتُّهمت أم المؤمنين عائشة رضي الله عنها زورًا، فنزلت الآيات ببراءتها من فوق سبع سماوات.", "src": "البخاري ومسلم عن عائشة رضي الله عنها"}, {"s": 5, "sn": "المائدة", "v": "6", "t": "﴿فَلَمْ تَجِدُوا مَاءً فَتَيَمَّمُوا صَعِيدًا طَيِّبًا﴾", "r": "ضاع عقد لعائشة رضي الله عنها في سفر، فأقام الناس يلتمسونه وليس معهم ماء، فنزلت آية التيمم رخصةً.", "src": "البخاري ومسلم عن عائشة رضي الله عنها"}, {"s": 2, "sn": "البقرة", "v": "144", "t": "﴿فَوَلِّ وَجْهَكَ شَطْرَ الْمَسْجِدِ الْحَرَامِ﴾", "r": "صلّى النبي ﷺ وأصحابه إلى بيت المقدس نحو ستة عشر أو سبعة عشر شهرًا، وكان يحب أن يتوجه إلى الكعبة، فنزلت الآية بتحويل القبلة.", "src": "البخاري عن البراء بن عازب رضي الله عنه"}, {"s": 2, "sn": "البقرة", "v": "189", "t": "﴿وَلَيْسَ الْبِرُّ بِأَنْ تَأْتُوا الْبُيُوتَ مِنْ ظُهُورِهَا﴾", "r": "كان بعض العرب في الجاهلية إذا أحرموا لا يدخلون البيوت من أبوابها بل من ظهورها ويرونه برًّا، فنزلت الآية تُبطل ذلك.", "src": "البخاري عن البراء بن عازب رضي الله عنه"}, {"s": 2, "sn": "البقرة", "v": "158", "t": "﴿إِنَّ الصَّفَا وَالْمَرْوَةَ مِنْ شَعَائِرِ اللَّهِ﴾", "r": "تحرّج بعض الأنصار من الطواف بين الصفا والمروة لأنه كان من أمر الجاهلية، فنزلت الآية تبيّن أنه من شعائر الله.", "src": "البخاري ومسلم عن عائشة رضي الله عنها"}, {"s": 2, "sn": "البقرة", "v": "223", "t": "﴿نِسَاؤُكُمْ حَرْثٌ لَكُمْ فَأْتُوا حَرْثَكُمْ أَنَّىٰ شِئْتُمْ﴾", "r": "قالت اليهود إن من أتى امرأته من الخلف في موضع الحرث جاء الولد أحول، فنزلت الآية تردّ ذلك وتبيح الإتيان في موضع الحرث على أي هيئة.", "src": "البخاري ومسلم عن جابر رضي الله عنه"}, {"s": 4, "sn": "النساء", "v": "43", "t": "﴿لَا تَقْرَبُوا الصَّلَاةَ وَأَنْتُمْ سُكَارَىٰ﴾", "r": "من مراحل تحريم الخمر: صنع بعض الصحابة طعامًا ودعا آخرين فشربوا، فصلّى بهم أحدهم فخلط في القراءة، فنزلت الآية.", "src": "أبو داود والترمذي عن علي رضي الله عنه"}, {"s": 5, "sn": "المائدة", "v": "90-91", "t": "﴿إِنَّمَا الْخَمْرُ وَالْمَيْسِرُ وَالْأَنْصَابُ وَالْأَزْلَامُ رِجْسٌ﴾", "r": "كان عمر رضي الله عنه يدعو: «اللهم بيّن لنا في الخمر بيانًا شافيًا» حتى نزلت آية المائدة بالتحريم القاطع، فقال: انتهينا انتهينا.", "src": "أبو داود والترمذي والنسائي عن عمر رضي الله عنه"}, {"s": 3, "sn": "آل عمران", "v": "169", "t": "﴿وَلَا تَحْسَبَنَّ الَّذِينَ قُتِلُوا فِي سَبِيلِ اللَّهِ أَمْوَاتًا﴾", "r": "نزلت في شهداء أُحد، وأن الله جعل أرواحهم في حواصل طير خضر تأكل من ثمار الجنة.", "src": "أبو داود عن ابن عباس رضي الله عنهما"}, {"s": 48, "sn": "الفتح", "v": "1", "t": "﴿إِنَّا فَتَحْنَا لَكَ فَتْحًا مُبِينًا﴾", "r": "نزلت سورة الفتح في رجوع النبي ﷺ من الحديبية، وسُمّي صلح الحديبية فتحًا مبينًا لما ترتب عليه من الخير.", "src": "البخاري ومسلم عن أنس رضي الله عنه"}, {"s": 49, "sn": "الحجرات", "v": "2", "t": "﴿لَا تَرْفَعُوا أَصْوَاتَكُمْ فَوْقَ صَوْتِ النَّبِيِّ﴾", "r": "قدم وفد بني تميم على النبي ﷺ، فاختلف أبو بكر وعمر رضي الله عنهما في تأمير رجل عليهم حتى ارتفعت أصواتهما، فنزلت الآية.", "src": "البخاري عن عبد الله بن الزبير رضي الله عنهما"}, {"s": 33, "sn": "الأحزاب", "v": "53", "t": "﴿يَا أَيُّهَا الَّذِينَ آمَنُوا لَا تَدْخُلُوا بُيُوتَ النَّبِيِّ إِلَّا أَنْ يُؤْذَنَ لَكُمْ﴾", "r": "في وليمة زواج النبي ﷺ من زينب رضي الله عنها: أطال بعض الضيوف الجلوس في البيت، فنزلت آية الحجاب وآداب دخول بيوت النبي ﷺ.", "src": "البخاري ومسلم عن أنس رضي الله عنه"}, {"s": 58, "sn": "المجادلة", "v": "1-4", "t": "﴿قَدْ سَمِعَ اللَّهُ قَوْلَ الَّتِي تُجَادِلُكَ فِي زَوْجِهَا﴾", "r": "شكت خولة بنت ثعلبة رضي الله عنها إلى النبي ﷺ أن زوجها أوس بن الصامت ظاهر منها، فنزلت آيات الظهار وكفارته.", "src": "أبو داود عن خولة بنت ثعلبة رضي الله عنها"}, {"s": 72, "sn": "الجن", "v": "1", "t": "﴿قُلْ أُوحِيَ إِلَيَّ أَنَّهُ اسْتَمَعَ نَفَرٌ مِنَ الْجِنِّ﴾", "r": "خرج النبي ﷺ مع أصحابه إلى سوق عكاظ، وكانت الشياطين قد مُنعت من استراق السمع، فاستمع نفر من الجن لقراءته وآمنوا، فنزلت السورة.", "src": "البخاري ومسلم عن ابن عباس رضي الله عنهما"}];
// ── شاشة الأربعون النووية
function NawawiPanel() {
  const [open, setOpen] = useState(null);
  const [fs, setFs] = useState(() => ld("nawawi_font", 18));
  useEffect(() => svLocal("nawawi_font", fs), [fs]);
  const toAr = typeof toArabicDigits === "function" ? toArabicDigits : x => x;
  const preview = t => { const m = t.replace(/\s+/g, " "); const q = m.indexOf("يَقُولُ"); const body = q > -1 ? m.slice(q + 8) : m; return body.replace(/^[\s":«»]+/, "").slice(0, 55) + "…"; };
  return E("div", null,
    E("div", { style: { fontSize: 11, color: "#4a6080", marginBottom: 8, lineHeight: 1.7 } }, "الأربعون النووية للإمام النووي (٤٢ حديثًا بزيادة ابن رجب). النص بالتشكيل من قاعدة بيانات مفتوحة المصدر مأخوذة من موقع sunnah.com."),
    E("div", { style: { display: "flex", gap: 8, marginBottom: 12 } },
      E("button", { onClick: () => setFs(f => Math.max(14, f - 2)), style: { ...iconBtnStyle(), flex: 1 } }, "A-"),
      E("button", { onClick: () => setFs(f => Math.min(32, f + 2)), style: { ...iconBtnStyle(), flex: 1 } }, "A+")
    ),
    NAWAWI40.map((t, i) => E("div", { key: i, style: { background: T.card, border: `1px solid ${open === i ? T.orange : T.bdr}`, borderRadius: 10, marginBottom: 8, overflow: "hidden" } },
      E("button", { onClick: () => setOpen(open === i ? null : i), style: { display: "flex", alignItems: "center", gap: 10, width: "100%", background: "transparent", border: "none", padding: "11px 12px", cursor: "pointer", fontFamily: "'Cairo',sans-serif", textAlign: "right" } },
        E("span", { style: { minWidth: 30, height: 30, borderRadius: "50%", background: T.orange + "22", color: T.orange, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 12 } }, toAr(i + 1)),
        E("span", { style: { flex: 1, fontSize: 12, color: "#c7d3e6", lineHeight: 1.6 } }, open === i ? "الحديث " + toAr(i + 1) : preview(t)),
        E("span", { style: { color: "#4a6080" } }, open === i ? "▲" : "▼")
      ),
      open === i && E("div", { style: { padding: "4px 14px 14px", fontSize: fs, lineHeight: 2.2, color: "#e2e8f0", fontFamily: "'Amiri Quran','Cairo',serif", whiteSpace: "pre-line", textAlign: "right" } }, t,
        E("div", { style: { textAlign: "left", marginTop: 8 } },
          E("button", { onClick: () => { try { navigator.clipboard.writeText(t); } catch (e) {} }, style: { background: "transparent", border: `1px solid ${T.bdr}`, color: "#7aa3d4", borderRadius: 8, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontFamily: "'Cairo',sans-serif" } }, "📋 نسخ")
        )
      )
    ))
  );
}

// ── شاشة أسباب النزول (مختارة)
function AsbabNuzulPanel() {
  const [open, setOpen] = useState(null);
  return E("div", null,
    E("div", { style: { fontSize: 11, color: "#4a6080", marginBottom: 10, lineHeight: 1.7 } }, "أسباب نزول مختارة ثابتة بروايات صحيحة أو حسنة، بصياغة مختصرة والمصدر مذكور مع كل واحد. للتوسع راجع «أسباب النزول» للواحدي و«لباب النقول» للسيوطي."),
    ASBAB_NUZUL.map((a, i) => E("div", { key: i, style: { background: T.card, border: `1px solid ${open === i ? T.orange : T.bdr}`, borderRadius: 10, marginBottom: 8, overflow: "hidden" } },
      E("button", { onClick: () => setOpen(open === i ? null : i), style: { display: "block", width: "100%", background: "transparent", border: "none", padding: "11px 12px", cursor: "pointer", fontFamily: "'Cairo',sans-serif", textAlign: "right" } },
        E("div", { style: { fontSize: 11, color: T.orange, fontWeight: 700, marginBottom: 4 } }, "سورة " + a.sn + " — آية " + a.v),
        E("div", { style: { fontSize: 15, color: "#e2e8f0", fontFamily: "'Amiri Quran','Cairo',serif", lineHeight: 1.9 } }, a.t)
      ),
      open === i && E("div", { style: { padding: "2px 14px 14px" } },
        E("div", { style: { fontSize: 13, lineHeight: 2, color: "#c7d3e6" } }, a.r),
        E("div", { style: { fontSize: 10, color: "#4a6080", marginTop: 8 } }, "المصدر: " + a.src)
      )
    ))
  );
}

function QuranRuqyahPanel() {
  return E("div", null, RUQYAH_VERSES.map(([label, text], i) => E("div", { key: i, style: { ...S.card(), marginBottom: 10 } },
    E("div", { style: { fontSize: 12, color: T.orange, fontWeight: 700, marginBottom: 6 } }, label),
    E("div", { style: { fontSize: 15, lineHeight: 2.1, color: "#e2e8f0", fontFamily: "'Amiri Quran',serif", textAlign: "center" } }, text)
  )));
}

function QuranTasbeehPanel() {
  const [count, setCount] = useState(() => ld("quran_tasbeeh_count", 0));
  const [target, setTarget] = useState(() => ld("quran_tasbeeh_target", 33));
  useEffect(() => svLocal("quran_tasbeeh_count", count), [count]);
  useEffect(() => svLocal("quran_tasbeeh_target", target), [target]);
  return E("div", { style: { textAlign: "center" } },
    E("div", { style: { display: "flex", justifyContent: "center", gap: 8, marginBottom: 16 } },
      [33, 99, 100].map(t => E("button", {
        key: t, onClick: () => setTarget(t),
        style: { background: target === t ? T.orange : T.card, color: target === t ? "#000" : "#e2e8f0", border: `1px solid ${T.bdr}`, borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Cairo',sans-serif" }
      }, t))
    ),
    E("button", {
      onClick: () => setCount(c => c + 1),
      style: { width: 160, height: 160, borderRadius: "50%", background: `radial-gradient(circle at 35% 30%, ${T.orange}, #b8860b)`, border: "none", color: "#1a1200", fontSize: 42, fontWeight: 900, cursor: "pointer", boxShadow: "0 8px 20px rgba(0,0,0,.4)", margin: "0 auto" }
    }, toArabicDigits(count)),
    E("div", { style: { fontSize: 12, color: "#4a6080", margin: "12px 0" } }, "الهدف: " + toArabicDigits(target) + (count >= target ? " — وصلت! 🎉" : "")),
    E("button", { onClick: () => setCount(0), style: { ...S.btn(T.card, "#e2e8f0"), maxWidth: 150, margin: "0 auto" } }, "🔄 صفّر العداد")
  );
}

// ── وجهات التذكير: لما تدوس على الإشعار يفتحلك الشاشة المربوطة بالتذكير (تلقائي من اسمه أو باختيارك)
const REMINDER_TARGETS = [
  ["auto", "🪄 تلقائي (حسب اسم التذكير)"],
  ["quran", "📖 المصحف (آخر صفحة)"],
  ["athkar_morning", "🌅 أذكار الصباح"],
  ["athkar_evening", "🌙 أذكار المساء"],
  ["athkar_sleep", "🌜 أذكار النوم"],
  ["athkar_beforePrayer", "🕌 أذكار قبل الصلاة"],
  ["athkar_afterPrayer", "🤲 أذكار بعد الصلاة"],
  ["athkar", "📿 قايمة الأذكار"],
  ["tasbih", "📳 السبحة"],
  ["tahwish", "💰 التحويش"],
  ["finance_add", "➕ إضافة مصروف"],
  ["car", "🚗 العربية"],
  ["goals", "🎯 الأهداف"],
  ["meals", "🍽️ الوجبات"],
  ["summary", "📊 الملخص"],
  ["none", "🚪 افتح التطبيق بس"]
];
const normAr = t => String(t || "").replace(/[\u064B-\u0652\u0640]/g, "").replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").toLowerCase();
function guessReminderTarget(title) {
  const t = normAr(title);
  if (/بعد.{0,3}الصل/.test(t)) return "athkar_afterPrayer";
  if (/قبل.{0,3}الصل/.test(t)) return "athkar_beforePrayer";
  if (/صباح/.test(t)) return "athkar_morning";
  if (/مساء|المسا/.test(t)) return "athkar_evening";
  if (/نوم|النوم/.test(t)) return "athkar_sleep";
  if (/سبحه|تسبيح|استغفار/.test(t)) return "tasbih";
  if (/ورد|قران|مصحف|كهف|سوره|ختم|تلاو|قراءه|حفظ/.test(t)) return "quran";
  if (/اذكار|ذكر/.test(t)) return "athkar";
  if (/تحويش|حوش|ادخار|ادخر|توفير|وفر/.test(t)) return "tahwish";
  if (/مصروف|فلوس|دفع|سجل|اضاف|قسط|فاتور/.test(t)) return "finance_add";
  if (/عربي|زيت|صيان|بنزين|كاوتش|عداد/.test(t)) return "car";
  if (/وجب|اكل|فطار|غدا|عشا|وزن/.test(t)) return "meals";
  if (/هدف|اهداف/.test(t)) return "goals";
  return "none";
}
const resolveReminderTarget = r => (r && r.target && r.target !== "auto") ? r.target : guessReminderTarget(r && r.title);

// ── تذكير أذكار الصباح/المساء/النوم + تذكيراتك المخصصة وإنت مقفل التطبيق (عن طريق الـ Worker):
// الإعدادات بتتبعت لعمود settings في جدول push_subscriptions، والـ Worker هو اللي بيبعت الإشعار في ميعاده
const ATHKAR_PUSH_PRESETS = {
  morning: [["Fajr:30", "بعد الفجر بنص ساعة"], ["Sunrise:0", "وقت الشروق"], ["Sunrise:20", "بعد الشروق بـ20 دقيقة"], ["fixed", "وقت ثابت"]],
  evening: [["Asr:20", "بعد العصر بـ20 دقيقة"], ["Asr:60", "بعد العصر بساعة"], ["Maghrib:-30", "قبل المغرب بنص ساعة"], ["fixed", "وقت ثابت"]],
  sleep: [["Isha:60", "بعد العشاء بساعة"], ["Isha:90", "بعد العشاء بساعة ونص"], ["Isha:150", "بعد العشاء بساعتين ونص"], ["fixed", "وقت ثابت"]]
};
const ATHKAR_PUSH_DEFAULT = {
  morning: { on: true, preset: "Fajr:30", time: "06:00" },
  evening: { on: true, preset: "Asr:20", time: "17:00" },
  sleep: { on: true, preset: "Isha:90", time: "22:30" }
};
const ATHKAR_PUSH_LABELS = { morning: "🌅 أذكار الصباح", evening: "🌙 أذكار المساء", sleep: "🌜 أذكار النوم" };
function loadAthkarPush() {
  const saved = ld("athkar_push_settings", {});
  const out = {};
  Object.keys(ATHKAR_PUSH_DEFAULT).forEach(k => { out[k] = Object.assign({}, ATHKAR_PUSH_DEFAULT[k], saved[k] || {}); });
  return out;
}
function buildPushSettings() {
  const ak = loadAthkarPush();
  const athkar = {};
  Object.keys(ak).forEach(k => {
    const c = ak[k];
    if (c.preset === "fixed") athkar[k] = { on: !!c.on, base: "fixed", time: c.time };
    else { const [base, off] = String(c.preset).split(":"); athkar[k] = { on: !!c.on, base, offset: Number(off) || 0 }; }
  });
  const customs = ld("quran_custom_reminders", []).map(r => ({ id: r.id, title: r.title, time: r.time, on: !!r.on, go: resolveReminderTarget(r) }));
  return { athkar, customs };
}
// بيحدّث الإعدادات في السحابة (ولو مفيش اشتراك Push لسه بيحاول يعمله لو الإذن والموقع موجودين)
async function syncPushSettings() {
  try {
    if (!sb || !("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return "noperm";
    let reg = await navigator.serviceWorker.getRegistration();
    if (!reg) { reg = await navigator.serviceWorker.register("./sw.js"); await navigator.serviceWorker.ready; }
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const c = ld("last_known_location", null);
      if (!c) return "nosub";
      const r = await subscribeToPush(c.lat, c.lon);
      if (!r.ok) return "nosub";
      sub = await reg.pushManager.getSubscription();
      if (!sub) return "nosub";
    }
    const json = sub.toJSON();
    const loc = ld("last_known_location", null);
    const row = { endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth, settings: buildPushSettings(), updated_at: new Date().toISOString() };
    if (loc && loc.lat != null && loc.lon != null) { row.latitude = loc.lat; row.longitude = loc.lon; }
    // upsert (بدل update العادي اللي ممكن يعدّي من غير ما يغيّر أي صف) + تأكيد إن صف اتكتب فعلًا
    let res = await sb.from("push_subscriptions").upsert(row, { onConflict: "endpoint" }).select("endpoint");
    if (res.error && /latitude|null value/i.test(res.error.message || "") && !row.latitude) res = await sb.from("push_subscriptions").update({ settings: row.settings, updated_at: row.updated_at }).eq("endpoint", json.endpoint).select("endpoint");
    window.__pushSyncErr = res.error ? res.error.message : "";
    if (res.error) return "dberror";
    return (res.data && res.data.length) ? "ok" : "norows";
  } catch (e) { return "error"; }
}

// ── تشغيل تذكيراتي على مستوى التطبيق كله (مش بس والشاشة بتاعتها مفتوحة)، وبإشعار حقيقي عن طريق الـ Service Worker
function useCustomReminders() {
  useEffect(() => {
    const check = () => {
      try {
        const list = ld("quran_custom_reminders", []);
        if (!list.length) return;
        const now = new Date();
        const fired = ld("custom_reminders_fired", {});
        const dayKey = DK();
        let changed = false;
        list.forEach(r => {
          if (!r.on || !r.time) return;
          const [h, m] = String(r.time).split(":").map(Number);
          const sched = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
          const late = now.getTime() - sched.getTime();
          // بنطلق التذكير لو فات ميعاده بأقل من 10 دقايق (الموبايل أحيانًا بيبطّأ المؤقتات والتطبيق في الخلفية)
          if (late >= 0 && late <= 10 * 60000 && fired[r.id] !== dayKey) {
            fired[r.id] = dayKey; changed = true;
            notify("📖 تذكير: " + r.title, { body: "حان وقت: " + r.title + " — دوس عشان تفتحه", tag: "custom-" + r.id, data: { go: resolveReminderTarget(r) } });
          }
        });
        if (changed) svLocal("custom_reminders_fired", fired);
      } catch (e) {}
    };
    check();
    const iv = setInterval(check, 15000);
    const onVis = () => { if (!document.hidden) check(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(iv); document.removeEventListener("visibilitychange", onVis); };
  }, []);
}

function QuranRemindersPanel() {
  const [list, setList] = useState(() => ld("quran_custom_reminders", []));
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("06:00");
  const [target, setTarget] = useState("auto");
  const [perm, setPerm] = useState(() => (typeof Notification !== "undefined" ? Notification.permission : "unsupported"));
  const [testMsg, setTestMsg] = useState("");
  const [ak, setAk] = useState(() => loadAthkarPush());
  const [syncMsg, setSyncMsg] = useState("");
  useEffect(() => svLocal("quran_custom_reminders", list), [list]);
  useEffect(() => svLocal("athkar_push_settings", ak), [ak]);
  // ── مزامنة الإعدادات للسحابة (عشان الإشعار يوصل والتطبيق مقفول)
  useEffect(() => {
    const t = setTimeout(async () => {
      const r = await syncPushSettings();
      setSyncMsg(r === "ok" ? "✅ التنبيهات هتوصلك حتى لو التطبيق مقفول" :
        r === "noperm" ? "فعّل إذن الإشعارات الأول" :
        r === "nosub" ? "لازم تفعّل زرار 🕌 (تذكير الصلاة) فوق مرة واحدة عشان الإشعارات تشتغل والتطبيق مقفول" :
        r === "dberror" ? "السحابة رفضت حفظ الإعدادات: " + (window.__pushSyncErr || "") :
        r === "norows" ? "مفيش اشتراك متسجل لموبايلك في السحابة — فعّل زرار 🕌 فوق مرة وارجع هنا" :
        r === "unsupported" ? "الموبايل ده مش بيدعم الإشعارات والتطبيق مقفول" : "");
    }, 900);
    return () => clearTimeout(t);
  }, [list, ak, perm]);

  const askPerm = async () => {
    if (typeof Notification === "undefined") return "unsupported";
    const p = await Notification.requestPermission();
    setPerm(p);
    return p;
  };
  const addReminder = async () => {
    const t = title.trim();
    if (!t) return;
    setList(l => [...l, { id: Date.now(), title: t, time, on: true, target }]);
    setTitle("");
    if (perm !== "granted") await askPerm();
  };
  const toggle = id => setList(l => l.map(r => r.id === id ? { ...r, on: !r.on } : r));
  const remove = id => setList(l => l.filter(r => r.id !== id));
  const sendTest = async () => {
    let p = perm;
    if (p !== "granted") p = await askPerm();
    if (p !== "granted") { setTestMsg("الإذن مش مفعّل — فعّل الإشعارات للتطبيق من إعدادات الموبايل."); return; }
    const ok = await notify("🔔 تجربة التذكيرات", { body: "لو شايف الإشعار ده يبقى التذكيرات شغالة تمام ✅", tag: "reminder-test" });
    setTestMsg(ok ? "اتبعت إشعار تجريبي — لو ماظهرش، راجع إعدادات الإشعارات للتطبيق في الموبايل." : "ماقدرتش أبعت الإشعار على الجهاز ده.");
  };
  const notifSupported = typeof Notification !== "undefined";

  return E("div", null,
    notifSupported && perm !== "granted" &&
      E("button", { onClick: askPerm, style: { ...S.btn(T.orange, "#000"), marginBottom: 14 } }, perm === "denied" ? "🔕 الإشعارات متقفلة — فعّلها من إعدادات الموبايل للتطبيق" : "🔔 فعّل إذن التنبيهات الأول"),
    E("div", { style: { ...S.card(), marginBottom: 14 } },
      E("div", { style: { fontSize: 12, color: "#4a6080", marginBottom: 8, fontWeight: 700 } }, "🔔 تنبيه الأذكار (يوصل حتى لو التطبيق مقفول)"),
      Object.keys(ATHKAR_PUSH_PRESETS).map(k => E("div", { key: k, style: { padding: "8px 0", borderBottom: `1px solid ${T.bdr}` } },
        E("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 6 } },
          E("button", {
            onClick: () => setAk(a => ({ ...a, [k]: { ...a[k], on: !a[k].on } })),
            style: { width: 40, height: 22, borderRadius: 99, border: "none", cursor: "pointer", background: ak[k].on ? T.orange : T.bdr, position: "relative", flexShrink: 0 }
          }, E("span", { style: { position: "absolute", top: 2, right: ak[k].on ? 2 : 20, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "right .2s" } })),
          E("span", { style: { fontSize: 13, fontWeight: 700, color: "#e2e8f0" } }, ATHKAR_PUSH_LABELS[k])
        ),
        ak[k].on && E("div", { style: { display: "flex", gap: 8 } },
          E("select", { value: ak[k].preset, onChange: e => setAk(a => ({ ...a, [k]: { ...a[k], preset: e.target.value } })), style: { ...S.inp, flex: 1, marginBottom: 0 } },
            ATHKAR_PUSH_PRESETS[k].map(([v, l]) => E("option", { key: v, value: v }, l))),
          ak[k].preset === "fixed" && E("input", { type: "time", value: ak[k].time, onChange: e => setAk(a => ({ ...a, [k]: { ...a[k], time: e.target.value } })), style: { ...S.inp, width: 110, marginBottom: 0 } })
        )
      )),
      syncMsg && E("div", { style: { fontSize: 11, color: "#c7d3e6", marginTop: 8, lineHeight: 1.7 } }, syncMsg)
    ),
    E("div", { style: { ...S.card(), marginBottom: 14 } },
      E("div", { style: { fontSize: 12, color: "#4a6080", marginBottom: 8, fontWeight: 700 } }, "ضيف تذكير جديد"),
      E("input", { type: "text", placeholder: "اسم التذكير (مثلاً: ورد الكهف)", value: title, onChange: e => setTitle(e.target.value), style: S.inp }),
      E("div", { style: { fontSize: 11, color: "#4a6080", marginBottom: 4 } }, "لما تدوس على الإشعار يفتحلك:"),
      E("select", { value: target, onChange: e => setTarget(e.target.value), style: { ...S.inp, marginBottom: 8 } },
        REMINDER_TARGETS.map(([v, l]) => E("option", { key: v, value: v }, l))),
      E("div", { style: { display: "flex", gap: 8 } },
        E("input", { type: "time", value: time, onChange: e => setTime(e.target.value), style: { ...S.inp, flex: 1, marginBottom: 0 } }),
        E("button", { onClick: addReminder, style: { ...S.btn(T.blue), width: "auto", padding: "0 18px", marginTop: 0 } }, "إضافة")
      )
    ),
    E("button", { onClick: sendTest, style: { ...S.btn(T.card, "#e2e8f0"), border: `1px solid ${T.bdr}`, marginBottom: 6 } }, "🔔 جرّب إشعار دلوقتي"),
    testMsg && E("div", { style: { fontSize: 11, color: "#c7d3e6", marginBottom: 10, lineHeight: 1.7 } }, testMsg),
    E("div", { style: { fontSize: 11, color: "#4a6080", marginBottom: 12, lineHeight: 1.7 } }, "التذكيرات المخصصة بتوصلك وإنت فاتح التطبيق، ومعاها بتتبعت للسحابة عشان توصلك كمان لو التطبيق مقفول (بعد تفعيل زرار 🕌 مرة)."),
    list.length === 0
      ? E("div", { style: { textAlign: "center", color: "#4a6080", fontSize: 12, padding: 10 } }, "لسه مفيش تذكيرات مضافة")
      : list.map(r => E("div", { key: r.id, style: { display: "flex", alignItems: "center", gap: 8, background: T.card, border: `1px solid ${T.bdr}`, borderRadius: 9, padding: "9px 12px", marginBottom: 7 } },
          E("button", {
            onClick: () => toggle(r.id),
            style: { width: 40, height: 22, borderRadius: 99, border: "none", cursor: "pointer", background: r.on ? T.orange : T.bdr, position: "relative", flexShrink: 0 }
          }, E("span", { style: { position: "absolute", top: 2, right: r.on ? 2 : 20, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "right .2s" } })),
          E("div", { style: { flex: 1 } },
            E("div", { style: { fontSize: 13, fontWeight: 700, color: "#e2e8f0" } }, r.title),
            E("div", { style: { fontSize: 10, color: "#4a6080" } }, r.time + " · يفتح: " + ((REMINDER_TARGETS.find(x => x[0] === resolveReminderTarget(r)) || [0, "التطبيق"])[1]))
          ),
          E("button", { onClick: () => remove(r.id), style: { background: "transparent", border: "none", color: T.red, fontSize: 15, cursor: "pointer" } }, "🗑️")
        ))
  );
}

function QuranDrawer(props) {
  const { screen, setScreen, onClose } = props;
  if (screen === "menu") {
    return E("div", { style: overlayStyle() },
      E("div", { style: drawerPanelStyle() },
        E("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 } },
          E("div", { style: { fontSize: 15, fontWeight: 900, color: "#e2e8f0" } }, "أدوات المصحف"),
          E("button", { onClick: onClose, style: { background: "transparent", border: "none", color: "#4a6080", fontSize: 22, cursor: "pointer" } }, "×")
        ),
        QURAN_MENU_SECTIONS.map((sec, i) => E("div", { key: i, style: { marginBottom: 14 } },
          sec.title && E("div", { style: { fontSize: 10, color: "#4a6080", fontWeight: 700, marginBottom: 6, textTransform: "uppercase" } }, sec.title),
          sec.items.map(([k, ic, label], j) => E("button", {
            key: j, onClick: () => setScreen(k),
            style: { display: "flex", alignItems: "center", gap: 10, width: "100%", background: T.bg, border: `1px solid ${T.bdr}`, borderRadius: 9, padding: "11px 12px", marginBottom: 6, color: "#e2e8f0", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Cairo',sans-serif", textAlign: "right" }
          }, E("span", { style: { fontSize: 16 } }, ic), E("span", { style: { flex: 1 } }, label)))
        ))
      )
    );
  }
  const wrap = (title, content) => E("div", { style: overlayStyle() },
    E("div", { style: drawerPanelStyle() },
      E("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 } },
        E("button", { onClick: () => (props.onBackToMenu ? props.onBackToMenu() : setScreen("menu")), style: backBtnStyle() }, "‹ رجوع"),
        E("div", { style: { fontSize: 14, fontWeight: 900, color: "#e2e8f0" } }, title),
        E("button", { onClick: onClose, style: { background: "transparent", border: "none", color: "#4a6080", fontSize: 22, cursor: "pointer" } }, "×")
      ),
      content
    )
  );
  if (screen === "bookmarks") return wrap("علاماتي المحفوظة", E(QuranBookmarksPanel, props));
  if (screen === "settings") return wrap("حجم الخط والقارئ", E(QuranSettingsPanel, props));
  if (screen === "ruqyah") return wrap("الرقية الشرعية", E(QuranRuqyahPanel, null));
  if (screen === "khatmdua") return wrap("دعاء ختم القرآن", E("div", { style: { fontSize: 15, lineHeight: 2.1, color: "#e2e8f0", fontFamily: "'Amiri Quran',serif", textAlign: "center" } }, KHATM_DUA));
  if (screen === "tasbeeh") return wrap("سبحة", E(QuranTasbeehPanel, null));
  if (screen === "reminders") return wrap("التذكيرات بتاعتي", E(QuranRemindersPanel, null));
  if (screen === "about") return wrap("عن تاب المصحف", E("div", { style: { fontSize: 13, lineHeight: 2, color: "#c7d3e6" } }, "التاب ده بيقرأ من مصحف عثماني رقمي صفحة بصفحة زي المصحف الحقيقي، وبيدّيك تفسير ميسّر وصوت لكل آية، وفيه أدوات زي السبحة والتذكيرات والرقية الشرعية. الأقسام المكتوب جنبها \"قريبًا\" لسه بتتجهّز."));
  if (screen === "nawawi") return wrap("الأربعون النووية", E(NawawiPanel, null));
  if (screen === "asbab") return wrap("أسباب النزول", E(AsbabNuzulPanel, null));
  if (screen === "stub") return wrap("قريبًا إن شاء الله", E("div", { style: { textAlign: "center", color: "#4a6080", fontSize: 13, padding: "30px 10px" } }, "الميزة دي لسه هتتضاف في تحديث جاي. 🚧"));
  return null;
}

// ── الشاشة الرئيسية لتاب المصحف
function QuranIndexScreen() {
  const initQ = (() => { const st = window.history.state; return st && st.qNav ? { d: st.qDepth || 0, nav: st.qNav } : null; })();
  const wantReader = (() => { const w = !!window.__openReader && !!ld("quran_last_page", null); window.__openReader = false; return w; })();
  const [screen, setScreen] = useState(initQ && initQ.nav.screen === "reader" ? "reader" : (wantReader ? "reader" : "home"));
  const [unitKind, setUnitKind] = useState(null);
  const [listenSurah, setListenSurah] = useState(null);
  const [page, setPage] = useState(() => ld("quran_last_page", 1));
  const [resolving, setResolving] = useState(false);
  const [drawerScreen, setDrawerScreen] = useState(null);
  const [fontSize, setFontSize] = useState(() => ld("quran_font_size", 20));
  useEffect(() => svLocal("quran_font_size", fontSize), [fontSize]);
  const [pinned, setPinned] = useState(() => ld("quran_pinned_surahs", []));
  useEffect(() => svLocal("quran_pinned_surahs", pinned), [pinned]);
  const [bookmarks, setBookmarks] = useState(() => ld("quran_bookmarks", []));
  useEffect(() => svLocal("quran_bookmarks", bookmarks), [bookmarks]);
  const { reciters, err: recitersErr } = useReciters();
  const [selectedReciter, setSelectedReciter] = useState(() => ld("quran_reciter", 0));
  useEffect(() => svLocal("quran_reciter", selectedReciter), [selectedReciter]);

  // ── زرار/إيماءة الرجوع في الموبايل جوه تاب المصحف: كانت بترجع للصفحة الرئيسية للتطبيق على طول
  // (بتخطى فهرس المصحف)، لأن التنقل الداخلي هنا (فهرس/قراءة/اختيار سورة..) ملوش تسجيل في الـ history.
  // بنسجل كل خطوة هنا بنفس أسلوب تنقل التابات الرئيسية، عشان الرجوع يودّي للفهرس الأول ثم للتاب اللي قبله.
  // ── مكدّس تنقل جوه المصحف: كل خطوة "للأمام" بتسجّل مدخل في الـ history، وأي زر "رجوع" جوه التطبيق
  // بيرجع فعلًا في الـ history (بدل ما يسجّل مدخل جديد) — ده كان سبب إن الرجوع يوديك للفهرس
  // وبعدين الرجوع التاني يرجّعك للسورة. وزرار الرجوع بتاع الموبايل بيرجع خطوة خطوة لحد الفهرس.
  const qStackRef = useRef(Array.from({ length: initQ ? initQ.d : 0 }, () => ({ screen: "home", drawer: null })).concat([{ screen: initQ && initQ.nav.screen === "reader" ? "reader" : "home", drawer: null }]));
  const qDepthRef = useRef(initQ ? initQ.d : 0);
  window.__qDepth = qDepthRef.current;
  useEffect(() => () => { window.__qDepth = 0; }, []);
  useEffect(() => {
    const top = qStackRef.current[qDepthRef.current] || { screen: "home", drawer: null };
    if (screen !== top.screen || drawerScreen !== top.drawer) {
      qStackRef.current = qStackRef.current.slice(0, qDepthRef.current + 1);
      qStackRef.current.push({ screen, drawer: drawerScreen });
      qDepthRef.current = qStackRef.current.length - 1;
      window.__qDepth = qDepthRef.current;
      // ── تسجيل الخطوة تحت نفس تاب "athkar" الحقيقي عشان الـ popstate العام في الأب (App) ميرجّعش للرئيسية بالغلط
      window.history.pushState({ tab: "athkar", qNav: { screen, drawer: drawerScreen }, qDepth: qDepthRef.current }, "", "");
    }
  }, [screen, drawerScreen]);
  useEffect(() => {
    const onPop = e => {
      const st = e.state || {};
      const qn = st.qNav || { screen: "home", drawer: null };
      qDepthRef.current = st.qDepth || 0;
      window.__qDepth = qDepthRef.current;
      setScreen(qn.screen);
      setDrawerScreen(qn.drawer || null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  // ── رجوع جوه التطبيق: لو الشاشة المطلوبة موجودة في المكدّس تحت، نرجع لها بالـ history، وإلا نعرضها عادي
  const goBackTo = (scr, drw = null) => {
    const d = qDepthRef.current;
    for (let i = d - 1; i >= 0; i--) {
      const en = qStackRef.current[i];
      if (en && en.screen === scr && en.drawer === drw) { window.history.go(i - d); return; }
    }
    setScreen(scr); setDrawerScreen(drw);
  };

  // ── لو جيت من إشعار "ورد/قرآن" والمصحف مفتوح أصلًا: افتح آخر صفحة
  useEffect(() => {
    const h = () => { if (window.__openReader) { window.__openReader = false; const lp = ld("quran_last_page", null); if (lp) { setPage(lp); setScreen("reader"); setDrawerScreen(null); } } };
    window.addEventListener("rafiqi-open-reader", h);
    return () => window.removeEventListener("rafiqi-open-reader", h);
  }, []);
  const togglePin = n => setPinned(p => p.includes(n) ? p.filter(x => x !== n) : [...p, n]);
  const openReader = p => { setPage(p); setScreen("reader"); setResolving(false); };
  const addBookmark = () => setBookmarks(b => b.some(x => x.page === page) ? b : [...b, { page, label: "", ts: Date.now() }]);
  const removeBookmark = ts => setBookmarks(b => b.filter(x => x.ts !== ts));
  const jumpAndClose = p => { setPage(p); setScreen("reader"); setDrawerScreen(null); };
  const handleUnitPick = n => {
    setResolving(true);
    quranUnitToPage(unitKind, n).then(p => { if (p) openReader(p); else setResolving(false); });
  };

  if (screen === "reader") {
    return E(React.Fragment, null,
      E(MushafReader, {
        page, setPage, onBack: () => goBackTo("home"),
        reciters, recitersErr, selectedReciter, setSelectedReciter,
        fontSize, setFontSize, onMenu: () => setDrawerScreen("menu"),
        bookmarks, onBookmark: addBookmark
      }),
      drawerScreen && E(QuranDrawer, {
        screen: drawerScreen, setScreen: setDrawerScreen, onClose: () => goBackTo("reader", null), onBackToMenu: () => goBackTo("reader", "menu"),
        bookmarks, onJump: jumpAndClose, onRemove: removeBookmark,
        fontSize, setFontSize, reciters, recitersErr, selectedReciter, setSelectedReciter
      })
    );
  }
  if (screen === "navpicker") {
    return E(QuranNavPicker, {
      onBack: () => goBackTo("home"),
      onPick: k => {
        if (k === "surah") { setScreen("home"); return; }
        if (k === "page") { setUnitKind("page"); setScreen("unitgrid"); return; }
        if (k === "ayah") { setScreen("ayahpicker"); return; }
        setUnitKind(k); setScreen("unitgrid");
      }
    });
  }
  if (screen === "unitgrid") {
    return E(QuranUnitGrid, {
      kind: unitKind, loading: resolving, onBack: () => goBackTo("navpicker"),
      onPick: unitKind === "page" ? openReader : handleUnitPick
    });
  }
  if (screen === "ayahpicker") {
    return E(QuranAyahPicker, { onBack: () => goBackTo("navpicker"), onResolve: openReader });
  }
  if (screen === "listen") {
    return E(SurahListenScreen, {
      surah: listenSurah, reciters, recitersErr, selectedReciter, setSelectedReciter,
      onBack: () => goBackTo("home")
    });
  }
  const lastPage = ld("quran_last_page", null);
  return E("div", { style: { padding: "14px 4px" } },
    lastPage && E("button", {
      onClick: () => openReader(lastPage),
      style: { display: "block", width: "100%", background: `linear-gradient(90deg,${T.orange},#b8860b)`, border: "none", borderRadius: 10, padding: "11px 14px", color: "#1a1200", fontWeight: 900, fontSize: 13, cursor: "pointer", fontFamily: "'Cairo',sans-serif", marginBottom: 10 }
    }, "📖 كمّل من آخر قراءة — صفحة " + toArabicDigits(lastPage)),
    E(QuranSurahList, { onOpen: s => openReader(s[4]), onListen: s => { setListenSurah(s); setScreen("listen"); }, onNav: () => setScreen("navpicker"), pinned, togglePin })
  );
}

// ── قايمة أشهر المبتهلين — تدوس على اسم، هتفتحلك ابتهالاته جوه التطبيق (embed من يوتيوب، من غير ما تطلع بره)
// ── قايمة أشهر المبتهلين + بلاي ليست حقيقية ومتحقق منها لكل واحد فيهم (قنوات يوتيوب متخصصة في الإبتهالات)
const MONSHID_PLAYLISTS = {
  "نصر الدين طوبار": "PL7Jc_hvQetljdzsI7ZzJdE1qBAPl5Q25v",
  "سيد النقشبندي": "PL7Jc_hvQetlgqu6607OAatZPLUkmFR1sr",
  "طه الفشني": "PLoBJ_rRiG24RFoabFkPrxhIRn_PGAro6r",
  "علي محمود": "PLERpk0gpIBKV_Qz2_qDnId93m1y901QO7",
  "محمد الفيومي": "PLdG7zq6iuZZ2sJu59Ulo16_MGkcHY8_P1",
  "كامل يوسف البهتيمي": "PLwngOvsmJ6hDh1XFi5ubVl-XuJVfSljsY",
  "أحمد التوني": "PLKYOfX91g_Hiyb02FJlWi4OpdoenWV3D7",
  "محمد عمران": "PLoBJ_rRiG24Qdi8YI0qBIwp1QLSw5UW9M"
};
// ── مصدر بديل عن يوتيوب: مقاطع صوتية حقيقية من أرشيف Internet Archive، بتشتغل بمشغل صوت عادي جوه التطبيق (أخف وأسرع من فيديو)
// لو مبتهل مش موجود هنا، بيفضل شغال بقايمة يوتيوب زي الأول
const MONSHID_ARCHIVE = {
  "نصر الدين طوبار": "20230916_20230916_0316",
  "سيد النقشبندي": "20240309_20240309_1714",
  "طه الفشني": "20230916_20230916_1609",
  "علي محمود": "3baqera_a-mahmoud",
  "كامل يوسف البهتيمي": "20240303_20240303_2247",
  "محمد عمران": "20230916_20230916_0318",
  "محمد الفيومي": { id: "54696850", filter: "الفيومي" }
};
const MONSHIDEEN = Object.keys(MONSHID_PLAYLISTS);

function useArchiveTracks(archiveEntry) {
  const [tracks, setTracks] = useState(null); // null = بيحمّل، [] = فشل/فاضي
  const [err, setErr] = useState("");
  const identifier = archiveEntry && (typeof archiveEntry === "string" ? archiveEntry : archiveEntry.id);
  const filterWord = archiveEntry && typeof archiveEntry === "object" ? archiveEntry.filter : null;
  useEffect(() => {
    if (!identifier) { setTracks([]); return; }
    let cancelled = false;
    setTracks(null);
    setErr("");
    fetch("https://archive.org/metadata/" + identifier)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        let files = (d.files || []).filter(f => /\.(mp3|ogg)$/i.test(f.name || ""));
        if (filterWord) files = files.filter(f => (f.title || f.name || "").includes(filterWord));
        const list = files.map(f => ({
          name: (f.title || f.name || "").replace(/\.(mp3|ogg)$/i, ""),
          url: "https://archive.org/download/" + identifier + "/" + encodeURIComponent(f.name)
        }));
        setTracks(list);
      })
      .catch(() => { if (!cancelled) { setErr("معرفتش أجيب المقاطع دلوقتي"); setTracks([]); } });
    return () => { cancelled = true; };
  }, [identifier, filterWord]);
  return { tracks, err };
}

function MonshidPlayerScreen({ name, onBack }) {
  const archiveEntry = MONSHID_ARCHIVE[name];
  const { tracks, err: tracksErr } = useArchiveTracks(archiveEntry);
  const [activeTrack, setActiveTrack] = useState(0);

  // ── مفيش مصدر صوت مباشر للمبتهل ده لسه؟ يفضل شغال بقايمة يوتيوب
  if (!archiveEntry) {
    const playlistId = MONSHID_PLAYLISTS[name];
    const embedSrc = "https://www.youtube.com/embed/videoseries?list=" + playlistId;
    return /*#__PURE__*/React.createElement("div", { style: { padding: "14px 4px" } },
      /*#__PURE__*/React.createElement("button", {
        onClick: onBack,
        style: { background: "transparent", border: "none", color: T.orange, fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 10, padding: 0, fontFamily: "'Cairo',sans-serif" }
      }, "‹ رجوع لقايمة المبتهلين"),
      /*#__PURE__*/React.createElement("div", { style: { fontSize: 17, fontWeight: 900, textAlign: "center", marginBottom: 10, color: "#e2e8f0" } }, "🎙️ ابتهالات " + name),
      /*#__PURE__*/React.createElement("div", {
        style: { background: T.card, border: `1px solid ${T.bdr}`, borderRadius: 12, overflow: "hidden" }
      }, /*#__PURE__*/React.createElement("iframe", {
        key: embedSrc,
        src: embedSrc,
        style: { width: "100%", aspectRatio: "16/9", border: "none", display: "block" },
        allow: "autoplay; encrypted-media",
        allowFullScreen: true
      })),
      /*#__PURE__*/React.createElement("div", { style: { fontSize: 10, color: "#4a6080", marginTop: 8, textAlign: "center" } }, "قايمة تشغيل من يوتيوب، بتتعرض جوه التطبيق من غير ما تطلع بره")
    );
  }

  const cur = tracks && tracks.length ? tracks[Math.min(activeTrack, tracks.length - 1)] : null;

  return /*#__PURE__*/React.createElement("div", { style: { padding: "14px 4px" } },
    /*#__PURE__*/React.createElement("button", {
      onClick: onBack,
      style: { background: "transparent", border: "none", color: T.orange, fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 10, padding: 0, fontFamily: "'Cairo',sans-serif" }
    }, "‹ رجوع لقايمة المبتهلين"),
    /*#__PURE__*/React.createElement("div", { style: { fontSize: 17, fontWeight: 900, textAlign: "center", marginBottom: 10, color: "#e2e8f0" } }, "🎙️ ابتهالات " + name),
    tracks === null && /*#__PURE__*/React.createElement("div", { style: { textAlign: "center", color: "#4a6080", fontSize: 12, padding: 20 } }, "بيحمّل المقاطع..."),
    tracks && tracks.length === 0 && /*#__PURE__*/React.createElement("div", { style: { textAlign: "center", color: T.red, fontSize: 12, padding: 20 } }, tracksErr || "مفيش مقاطع متاحة دلوقتي"),
    cur && /*#__PURE__*/React.createElement(React.Fragment, null,
      /*#__PURE__*/React.createElement("div", { style: { background: T.card, border: `1px solid ${T.bdr}`, borderRadius: 10, padding: 10, marginBottom: 12 } },
        /*#__PURE__*/React.createElement("div", { style: { fontSize: 12, fontWeight: 700, color: T.orange, marginBottom: 8, textAlign: "center" } }, cur.name),
        /*#__PURE__*/React.createElement("audio", { key: cur.url, controls: true, autoPlay: true, src: cur.url, style: { width: "100%" } })
      ),
      /*#__PURE__*/React.createElement("div", { style: { fontSize: 11, color: "#4a6080", marginBottom: 8, fontWeight: 700 } }, "كل المقاطع (" + tracks.length + ")"),
      tracks.map((t, i) => /*#__PURE__*/React.createElement("button", {
        key: i,
        onClick: () => setActiveTrack(i),
        style: {
          display: "block", width: "100%", textAlign: "right", cursor: "pointer",
          background: i === activeTrack ? "#f59e0b22" : T.card,
          border: `1px solid ${i === activeTrack ? T.orange : T.bdr}`,
          borderRadius: 8, padding: "9px 12px", marginBottom: 6, fontSize: 12,
          color: "#e2e8f0", fontFamily: "'Cairo',sans-serif"
        }
      }, t.name))
    ),
    /*#__PURE__*/React.createElement("div", { style: { fontSize: 10, color: "#4a6080", marginTop: 8, textAlign: "center" } }, "مقاطع من أرشيف Internet Archive، بتتشغل جوه التطبيق مباشرة")
  );
}

function IbtihalatScreen() {
  const [q, setQ] = useState("");
  const [openMonshid, setOpenMonshid] = useState(null);
  if (openMonshid) {
    return /*#__PURE__*/React.createElement(MonshidPlayerScreen, { name: openMonshid, onBack: () => setOpenMonshid(null) });
  }
  const query = q.trim();
  const filtered = MONSHIDEEN.filter(n => !query || n.includes(query));
  return /*#__PURE__*/React.createElement("div", { style: { padding: "14px 4px" } },
    /*#__PURE__*/React.createElement("input", {
      type: "text",
      placeholder: "🔍 دور باسم المبتهل...",
      value: q,
      onChange: e => setQ(e.target.value),
      style: { ...S.inp, marginBottom: 12, fontSize: 13 }
    }),
    filtered.length === 0
      ? /*#__PURE__*/React.createElement("div", { style: { textAlign: "center", color: "#4a6080", fontSize: 12, padding: 20 } }, "مفيش مبتهل بالاسم ده")
      : filtered.map(n => /*#__PURE__*/React.createElement("button", {
          key: n,
          onClick: () => setOpenMonshid(n),
          style: {
            display: "flex", alignItems: "center", gap: 12,
            background: T.card, border: `1px solid ${T.bdr}`, borderRadius: 10,
            padding: "12px 14px", marginBottom: 8, width: "100%", cursor: "pointer",
            fontFamily: "'Cairo',sans-serif", textAlign: "right"
          }
        },
          /*#__PURE__*/React.createElement("span", { style: { fontSize: 18 } }, "🎙️"),
          /*#__PURE__*/React.createElement("span", { style: { flex: 1, fontSize: 14, fontWeight: 700, color: "#e2e8f0" } }, n),
          /*#__PURE__*/React.createElement("span", { style: { color: "#4a6080", fontSize: 16 } }, "‹")
        ))
  );
}

// ══════════════════════════════════════════════════════════════
// مواعيد الصلاة الحالية (بتاعة صفحة الأذكار/المصحف) — بتجيب الموقع
// مرة وتتحفظ عشان الفتحات اللي بعد كده تكون فورية
// ══════════════════════════════════════════════════════════════
const PRAYER_ORDER = [["Fajr", "الفجر", "🌅"], ["Sunrise", "الشروق", "🌄"], ["Dhuhr", "الظهر", "☀️"], ["Asr", "العصر", "🌤️"], ["Maghrib", "المغرب", "🌇"], ["Isha", "العشاء", "🌙"]];

function useTodayPrayerTimes() {
  const [timings, setTimings] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let coords = ld("last_known_location", null);
        if (!coords && navigator.geolocation) {
          coords = await new Promise((res, rej) => {
            navigator.geolocation.getCurrentPosition(
              p => res({ lat: p.coords.latitude, lon: p.coords.longitude }),
              () => rej(new Error("محتاجين إذن الموقع عشان نحسب مواعيد صلاتك")),
              { timeout: 10000 }
            );
          });
        }
        if (!coords) { if (!cancelled) setErr("محتاجين إذن الموقع عشان نحسب مواعيد صلاتك"); return; }
        sv("last_known_location", coords);
        const now = new Date();
        const dateStr = `${String(now.getDate()).padStart(2, "0")}-${String(now.getMonth() + 1).padStart(2, "0")}-${now.getFullYear()}`;
        const res = await fetch(`https://api.aladhan.com/v1/timings/${dateStr}?latitude=${coords.lat}&longitude=${coords.lon}&method=5`);
        const json = await res.json();
        if (!cancelled && json && json.data && json.data.timings) { setTimings(json.data.timings); svLocal("prayer_timings_last", { date: dateStr, timings: json.data.timings }); }
        else throw new Error("no timings");
      } catch (e) {
        // ── من غير نت: بنعرض آخر مواعيد اتحفظت (الفرق من يوم للتاني دقيقة تقريبًا)
        const last = ld("prayer_timings_last", null);
        if (!cancelled) {
          if (last && last.timings) setTimings(last.timings);
          else setErr(e.message && e.message !== "no timings" && e.message !== "Failed to fetch" ? e.message : "معرفناش نجيب مواعيد الصلاة دلوقتي");
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return { timings, err };
}

function PrayerTimesHeader() {
  const { timings, err } = useTodayPrayerTimes();
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);

  if (err) return E("div", { style: { ...S.card("#ef444422"), textAlign: "center", marginBottom: 12 } }, E("div", { style: { fontSize: 12, color: T.red } }, err));
  if (!timings) return E("div", { style: { ...S.card(), textAlign: "center", marginBottom: 12 } }, E("div", { style: { fontSize: 12, color: "#4a6080" } }, "بيحمّل مواعيد الصلاة..."));

  const toMin = t => { const [h, m] = String(t).slice(0, 5).split(":").map(Number); return h * 60 + m; };
  const nowMin = now.getHours() * 60 + now.getMinutes();
  let nextIdx = PRAYER_ORDER.findIndex(([key]) => toMin(timings[key]) > nowMin);
  if (nextIdx === -1) nextIdx = 0;
  const next = PRAYER_ORDER[nextIdx];
  const after = PRAYER_ORDER[(nextIdx + 1) % PRAYER_ORDER.length];
  let diff = toMin(timings[next[0]]) - nowMin; if (diff < 0) diff += 24 * 60;
  const hh = Math.floor(diff / 60), mm = diff % 60;

  return E("div", { style: { ...S.card("#1a2840"), border: `1px solid ${T.orange}55`, textAlign: "center", marginBottom: 14, padding: "16px 10px" } },
    E("div", { style: { fontSize: 11, color: "#7aa3d4", marginBottom: 4 } }, "الصلاة الجاية"),
    E("div", { style: { fontSize: 21, fontWeight: 900, color: T.orange } }, next[2] + " " + next[1] + " — " + timings[next[0]].slice(0, 5)),
    E("div", { style: { fontSize: 13, color: "#c7d3e6", marginTop: 6 } }, "متبقي " + (hh > 0 ? hh + " س " : "") + mm + " د"),
    E("div", { style: { fontSize: 10, color: "#4a6080", marginTop: 4 } }, "وبعدها " + after[2] + " " + after[1] + " — " + timings[after[0]].slice(0, 5)),
    E("div", { style: { display: "flex", justifyContent: "space-between", marginTop: 14, gap: 3 } },
      PRAYER_ORDER.map(([key, label, ic]) => E("div", {
        key,
        style: { flex: 1, padding: "6px 2px", borderRadius: 8, background: key === next[0] ? T.orange + "22" : "transparent", border: key === next[0] ? `1px solid ${T.orange}55` : "1px solid transparent" }
      },
        E("div", { style: { fontSize: 13 } }, ic),
        E("div", { style: { fontSize: 9, color: "#7aa3d4", marginTop: 2 } }, label),
        E("div", { style: { fontSize: 10, fontWeight: 700, color: "#e2e8f0", marginTop: 1 } }, timings[key].slice(0, 5))
      ))
    )
  );
}

// ── مربعات قابلة للطي (زي شكل تطبيق "المصلي") — تاب رئيسي بيفتح تحته مربعات فرعية
// ══════════════════════════════════════════════════════════════
// أدوات تاب "أذكار ومصحف" — بقت مربعات مستقلة بره شاشة المصحف
// ══════════════════════════════════════════════════════════════
const copyBtnStyle = () => ({ background: "transparent", border: `1px solid ${T.bdr}`, color: "#7aa3d4", borderRadius: 8, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontFamily: "'Cairo',sans-serif" });
const copyText = t => { try { navigator.clipboard.writeText(t); } catch (e) {} };

// ── أدعية مأثورة من القرآن والسنة (النص بالتشكيل، والمصدر مكتوب تحت كل دعاء)
const DUAS_LIST = [
  { t: "دعاء ختم القرآن", text: KHATM_DUA, src: "دعاء متداول عند ختم القرآن، وآخره مقتبس من دعاء الهم والحزن الثابت في مسند أحمد. وليس لدعاء الختم صيغة محددة ثابتة عن النبي ﷺ." },
  { t: "سيد الاستغفار", text: "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ لَكَ بِذَنْبِي فَاغْفِرْ لِي، فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ.", src: "رواه البخاري" },
  { t: "دعاء الكرب", text: "لَا إِلَهَ إِلَّا اللَّهُ الْعَظِيمُ الْحَلِيمُ، لَا إِلَهَ إِلَّا اللَّهُ رَبُّ الْعَرْشِ الْعَظِيمِ، لَا إِلَهَ إِلَّا اللَّهُ رَبُّ السَّمَاوَاتِ وَرَبُّ الْأَرْضِ وَرَبُّ الْعَرْشِ الْكَرِيمِ.", src: "متفق عليه (البخاري ومسلم)" },
  { t: "دعاء الهم والحزن", text: "اللَّهُمَّ إِنِّي عَبْدُكَ، ابْنُ عَبْدِكَ، ابْنُ أَمَتِكَ، نَاصِيَتِي بِيَدِكَ، مَاضٍ فِيَّ حُكْمُكَ، عَدْلٌ فِيَّ قَضَاؤُكَ، أَسْأَلُكَ بِكُلِّ اسْمٍ هُوَ لَكَ سَمَّيْتَ بِهِ نَفْسَكَ، أَوْ أَنْزَلْتَهُ فِي كِتَابِكَ، أَوْ عَلَّمْتَهُ أَحَدًا مِنْ خَلْقِكَ، أَوِ اسْتَأْثَرْتَ بِهِ فِي عِلْمِ الْغَيْبِ عِنْدَكَ، أَنْ تَجْعَلَ الْقُرْآنَ رَبِيعَ قَلْبِي، وَنُورَ صَدْرِي، وَجَلَاءَ حُزْنِي، وَذَهَابَ هَمِّي.", src: "رواه أحمد وصححه الألباني" },
  { t: "الاستعاذة من الهم والدَّين", text: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَالْعَجْزِ وَالْكَسَلِ، وَالْبُخْلِ وَالْجُبْنِ، وَضَلَعِ الدَّيْنِ وَغَلَبَةِ الرِّجَالِ.", src: "رواه البخاري" },
  { t: "دعاء قضاء الدَّين", text: "اللَّهُمَّ اكْفِنِي بِحَلَالِكَ عَنْ حَرَامِكَ، وَأَغْنِنِي بِفَضْلِكَ عَمَّنْ سِوَاكَ.", src: "رواه الترمذي وحسّنه الألباني" },
  { t: "دعاء الاستخارة", text: "اللَّهُمَّ إِنِّي أَسْتَخِيرُكَ بِعِلْمِكَ، وَأَسْتَقْدِرُكَ بِقُدْرَتِكَ، وَأَسْأَلُكَ مِنْ فَضْلِكَ الْعَظِيمِ، فَإِنَّكَ تَقْدِرُ وَلَا أَقْدِرُ، وَتَعْلَمُ وَلَا أَعْلَمُ، وَأَنْتَ عَلَّامُ الْغُيُوبِ. اللَّهُمَّ إِنْ كُنْتَ تَعْلَمُ أَنَّ هَذَا الْأَمْرَ (وتسمّي حاجتك) خَيْرٌ لِي فِي دِينِي وَمَعَاشِي وَعَاقِبَةِ أَمْرِي، فَاقْدُرْهُ لِي وَيَسِّرْهُ لِي ثُمَّ بَارِكْ لِي فِيهِ، وَإِنْ كُنْتَ تَعْلَمُ أَنَّ هَذَا الْأَمْرَ شَرٌّ لِي فِي دِينِي وَمَعَاشِي وَعَاقِبَةِ أَمْرِي، فَاصْرِفْهُ عَنِّي وَاصْرِفْنِي عَنْهُ، وَاقْدُرْ لِيَ الْخَيْرَ حَيْثُ كَانَ ثُمَّ أَرْضِنِي بِهِ.", src: "رواه البخاري — بعد ركعتين من غير الفريضة" },
  { t: "الثبات على الدين", text: "يَا مُقَلِّبَ الْقُلُوبِ ثَبِّتْ قَلْبِي عَلَى دِينِكَ.", src: "رواه الترمذي وصححه الألباني" },
  { t: "العفو والعافية", text: "اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي دِينِي وَدُنْيَايَ وَأَهْلِي وَمَالِي.", src: "رواه أبو داود وابن ماجه وصححه الألباني" },
  { t: "دعاء ليلة القدر", text: "اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي.", src: "رواه الترمذي وصححه الألباني" },
  { t: "علمًا نافعًا ورزقًا طيبًا", text: "اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا، وَرِزْقًا طَيِّبًا، وَعَمَلًا مُتَقَبَّلًا.", src: "رواه ابن ماجه وحسّنه الألباني — يُقال بعد سلام الفجر" },
  { t: "دعاء زيادة العلم", text: "رَبِّ زِدْنِي عِلْمًا.", src: "سورة طه، آية ١١٤" },
  { t: "جامع خير الدنيا والآخرة", text: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ.", src: "سورة البقرة، آية ٢٠١ — وكان أكثر دعاء النبي ﷺ (متفق عليه)" },
  { t: "الدعاء للوالدين", text: "رَبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا.", src: "سورة الإسراء، آية ٢٤" },
  { t: "الدعاء للأهل والذرية", text: "رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ وَاجْعَلْنَا لِلْمُتَّقِينَ إِمَامًا.", src: "سورة الفرقان، آية ٧٤" },
  { t: "دعاء زيارة المريض", text: "أَسْأَلُ اللَّهَ الْعَظِيمَ رَبَّ الْعَرْشِ الْعَظِيمِ أَنْ يَشْفِيَكَ.", src: "رواه أبو داود والترمذي وصححه الألباني — سبع مرات" }
];
function DuasPanel() {
  const [open, setOpen] = useState(0);
  return E("div", null,
    E("div", { style: { fontSize: 11, color: "#4a6080", marginBottom: 10, lineHeight: 1.7 } }, "أدعية من القرآن والصحيح من السنة، والمصدر مكتوب تحت كل دعاء. اضغط على الدعاء لفتحه."),
    DUAS_LIST.map((d, i) => E("div", { key: i, style: { background: T.card, border: `1px solid ${open === i ? T.orange : T.bdr}`, borderRadius: 10, marginBottom: 8, overflow: "hidden" } },
      E("button", { onClick: () => setOpen(open === i ? null : i), style: { display: "flex", alignItems: "center", width: "100%", background: "transparent", border: "none", padding: "12px", cursor: "pointer", fontFamily: "'Cairo',sans-serif", textAlign: "right", color: "#e2e8f0", fontSize: 13, fontWeight: 700 } },
        E("span", { style: { flex: 1 } }, d.t), E("span", { style: { color: "#4a6080" } }, open === i ? "▲" : "▼")),
      open === i && E("div", { style: { padding: "2px 14px 14px" } },
        E("div", { style: { fontSize: 17, lineHeight: 2.2, color: "#e2e8f0", fontFamily: "'Amiri Quran',serif", textAlign: "center" } }, d.text),
        E("div", { style: { fontSize: 10, color: "#4a6080", marginTop: 8, lineHeight: 1.7 } }, "المصدر: " + d.src),
        E("div", { style: { textAlign: "left", marginTop: 6 } }, E("button", { onClick: () => copyText(d.text), style: copyBtnStyle() }, "📋 نسخ"))
      )
    ))
  );
}

// ── تفسير / غريب / إعراب: بيتحمّل سورة سورة من مجموعة tafsir_api المفتوحة (مأخوذة من quran.com) وبيتخزّن للأوفلاين
const TAFSIR_BASE = "https://raw.githubusercontent.com/spa5k/tafsir_api/main/tafsir/";
const TAFSIR_EDITIONS = [["ar-tafsir-ibn-kathir", "ابن كثير"], ["ar-tafsir-as-saadi", "السعدي"], ["ar-tafsir-muyassar", "الميسّر"], ["ar-tafsir-al-jalalayn", "الجلالين"], ["ar-tafseer-al-qurtubi", "القرطبي"], ["ar-tafsir-al-tabari", "الطبري"]];
const MEANINGS_EDITIONS = [["al-muyassar-fi-al-gharib", "غريب القرآن (الميسّر)"], ["al-i-rab-al-muyassar", "الإعراب الميسّر"], ["i-rab-al-quran-li-al-darwish", "إعراب القرآن للدرويش"]];
function TafsirPanel({ editions, intro }) {
  const [ed, setEd] = useState(editions[0][0]);
  const [surah, setSurah] = useState(null);
  const [q, setQ] = useState("");
  const [data, setData] = useState(null);
  const [shown, setShown] = useState(6);
  const [fs, setFs] = useState(() => ld("tafsir_font", 16));
  useEffect(() => svLocal("tafsir_font", fs), [fs]);
  useEffect(() => {
    if (!surah) return;
    let dead = false;
    setData(null); setShown(6);
    cachedJson(TAFSIR_BASE + ed + "/" + surah + ".json", { valid: j => Array.isArray(j) && j.length > 0 })
      .then(j => {
        if (dead) return;
        const groups = [];
        j.forEach(x => {
          const t = String(x.text || "").replace(/\[\[[^\]]*\]\]/g, "").trim();
          if (!t) return;
          const last = groups[groups.length - 1];
          if (last && last.t === t) last.to = x.ayah; else groups.push({ t, from: x.ayah, to: x.ayah });
        });
        setData(groups);
      })
      .catch(() => { if (!dead) setData("err"); });
    return () => { dead = true; };
  }, [ed, surah]);
  const edName = (editions.find(e => e[0] === ed) || [])[1];
  const sName = surah ? QURAN_SURAHS[surah - 1][1] : "";
  const head = E("div", null,
    E("div", { style: { fontSize: 11, color: "#4a6080", marginBottom: 10, lineHeight: 1.7 } }, intro),
    E("div", { style: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 } }, editions.map(([k, l]) => E("button", {
      key: k, onClick: () => setEd(k),
      style: { background: ed === k ? T.orange : T.card, color: ed === k ? "#000" : "#e2e8f0", border: `1px solid ${T.bdr}`, borderRadius: 8, padding: "6px 11px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Cairo',sans-serif" }
    }, l)))
  );
  if (!surah) {
    const list = QURAN_SURAHS.filter(s => !q.trim() || s[1].indexOf(q.trim()) > -1 || String(s[0]) === q.trim());
    return E("div", null, head,
      E("input", { value: q, onChange: e => setQ(e.target.value), placeholder: "ابحث باسم السورة أو رقمها", style: { width: "100%", background: T.card, border: `1px solid ${T.bdr}`, borderRadius: 9, padding: "10px 12px", color: "#e2e8f0", fontSize: 13, marginBottom: 10, fontFamily: "'Cairo',sans-serif", direction: "rtl" } }),
      E("div", { style: { display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 7 } }, list.map(s => E("button", {
        key: s[0], onClick: () => setSurah(s[0]),
        style: { background: T.card, border: `1px solid ${T.bdr}`, borderRadius: 9, padding: "10px 8px", color: "#e2e8f0", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Cairo',sans-serif", textAlign: "right" }
      }, E("span", { style: { color: T.orange, marginLeft: 6 } }, toArabicDigits(s[0])), s[1])))
    );
  }
  return E("div", null, head,
    E("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 12 } },
      E("button", { onClick: () => setSurah(null), style: backBtnStyle() }, "‹ السور"),
      E("div", { style: { flex: 1, fontSize: 14, fontWeight: 900, color: "#e2e8f0", textAlign: "center" } }, "سورة " + sName + " — " + edName),
      E("button", { onClick: () => setFs(f => Math.max(13, f - 2)), style: iconBtnStyle() }, "A-"),
      E("button", { onClick: () => setFs(f => Math.min(30, f + 2)), style: iconBtnStyle() }, "A+")
    ),
    data === null && E("div", { style: { textAlign: "center", color: "#7aa3d4", fontSize: 13, padding: 24 } }, "⏳ جاري التحميل… (أول مرة بس، بعدها بيشتغل من غير نت)"),
    data === "err" && E("div", { style: { textAlign: "center", color: T.red, fontSize: 13, padding: 24, lineHeight: 1.8 } }, "تعذّر التحميل. اتأكد من النت وجرّب تاني — أول فتحة لكل سورة محتاجة نت."),
    Array.isArray(data) && data.length === 0 && E("div", { style: { textAlign: "center", color: "#4a6080", fontSize: 13, padding: 24 } }, "مفيش نص لهذه السورة في المصدر ده."),
    Array.isArray(data) && data.slice(0, shown).map((g, i) => E("div", { key: i, style: { background: T.card, border: `1px solid ${T.bdr}`, borderRadius: 10, padding: "12px 14px", marginBottom: 9 } },
      E("div", { style: { fontSize: 11, color: T.orange, fontWeight: 700, marginBottom: 6 } }, g.from === g.to ? "آية " + toArabicDigits(g.from) : "الآيات " + toArabicDigits(g.from) + " – " + toArabicDigits(g.to)),
      E("div", { style: { fontSize: fs, lineHeight: 2.1, color: "#e2e8f0", whiteSpace: "pre-wrap", textAlign: "right", fontFamily: "'Amiri Quran','Cairo',serif" } }, g.t),
      E("div", { style: { textAlign: "left", marginTop: 6 } }, E("button", { onClick: () => copyText(g.t), style: copyBtnStyle() }, "📋 نسخ"))
    )),
    Array.isArray(data) && shown < data.length && E("button", { onClick: () => setShown(n => n + 8), style: { display: "block", width: "100%", background: T.card, border: `1px solid ${T.bdr}`, borderRadius: 10, padding: 12, color: T.orange, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Cairo',sans-serif" } }, "عرض المزيد (" + toArabicDigits(data.length - shown) + " متبقي)"),
    E("div", { style: { fontSize: 10, color: "#4a6080", marginTop: 14, lineHeight: 1.7, textAlign: "center" } }, "المصدر: مجموعة tafsir_api مفتوحة المصدر (نصوص مأخوذة من quran.com). النصوص مأخوذة كما هي من المصدر.")
  );
}

function BookmarksTool({ onJump }) {
  const [bookmarks, setBookmarks] = useState(() => ld("quran_bookmarks", []));
  useEffect(() => svLocal("quran_bookmarks", bookmarks), [bookmarks]);
  return E(QuranBookmarksPanel, { bookmarks, onJump, onRemove: ts => setBookmarks(b => b.filter(x => x.ts !== ts)) });
}
function ReaderSettingsTool() {
  const [fontSize, setFontSize] = useState(() => ld("quran_font_size", 20));
  useEffect(() => svLocal("quran_font_size", fontSize), [fontSize]);
  const { reciters, err } = useReciters();
  const [sel, setSel] = useState(() => ld("quran_reciter", 0));
  useEffect(() => svLocal("quran_reciter", sel), [sel]);
  return E(QuranSettingsPanel, { fontSize, setFontSize, reciters, recitersErr: err, selectedReciter: sel, setSelectedReciter: setSel });
}
function AboutTabPanel() {
  const items = [
    ["📿", "الأذكار", "أذكار الصباح والمساء والنوم وقبل/بعد الصلاة وأحوال الحياة اليومية، والرقية الشرعية، بعدّاد لكل ذكر."],
    ["📖", "المصحف", "مصحف رقمي صفحة بصفحة، بقراءة بالصوت وتفسير ميسّر لكل آية، وبيشتغل أوفلاين بعد تحميله."],
    ["🎙️", "الابتهالات والمنشدين", "ابتهالات لأشهر المنشدين تسمعها جوه التطبيق."],
    ["🤲", "أدعية", "دعاء ختم القرآن وأدعية مأثورة من القرآن والسنة بمصدر كل دعاء."],
    ["🔖", "علاماتي المحفوظة", "الصفحات اللي حفظتها من المصحف، وتفتحها بضغطة."],
    ["⚙️", "حجم الخط والقارئ", "ضبط حجم خط المصحف واختيار القارئ وتحميل المصحف للأوفلاين."],
    ["⏰", "التذكيرات بتاعتي", "تذكيرات للورد والأذكار وأي حاجة، والإشعار بيفتحلك الشاشة المناسبة."],
    ["📚", "الأربعون النووية", "الأحاديث الأربعين (٤٢ بزيادة ابن رجب) بالتشكيل."],
    ["📜", "التفسير وأسباب النزول", "تفسير ابن كثير والسعدي والميسّر والجلالين والقرطبي والطبري، وأسباب نزول مختارة بمصادرها."],
    ["🔤", "معاني الكلمات والإعراب", "غريب القرآن وإعرابه سورة سورة."],
    ["📘", "المتون القرآنية", "قريبًا إن شاء الله."]
  ];
  return E("div", null,
    E("div", { style: { fontSize: 13, lineHeight: 2, color: "#c7d3e6", marginBottom: 12 } }, "التاب ده مجمّع فيه كل الأدوات الدينية في مكان واحد، وكل مربع بيفتح قسمه بس. دليل سريع لمحتواه:"),
    items.map(([ic, t, d], i) => E("div", { key: i, style: { display: "flex", gap: 10, background: T.card, border: `1px solid ${T.bdr}`, borderRadius: 10, padding: "10px 12px", marginBottom: 8 } },
      E("span", { style: { fontSize: 20 } }, ic),
      E("div", { style: { flex: 1 } }, E("div", { style: { fontSize: 13, fontWeight: 800, color: "#e2e8f0" } }, t), E("div", { style: { fontSize: 12, color: "#9fb2cc", lineHeight: 1.8, marginTop: 2 } }, d))
    )),
    E("div", { style: { fontSize: 11, color: "#4a6080", lineHeight: 1.8, marginTop: 8 } }, "ملحوظة: نصوص التفسير والإعراب من مصادر مفتوحة، وأسباب النزول بصياغة مختصرة، ويُرجع للكتب الأصلية وأهل العلم للتوسع.")
  );
}
function TafsirHub() {
  const [which, setWhich] = useState("tafsir");
  return E("div", null,
    E("div", { style: { display: "flex", gap: 8, marginBottom: 14 } }, [["tafsir", "📖 التفسير"], ["asbab", "📜 أسباب النزول"]].map(([k, l]) => E("button", {
      key: k, onClick: () => setWhich(k),
      style: { flex: 1, background: which === k ? T.orange : T.card, color: which === k ? "#000" : "#e2e8f0", border: `1px solid ${T.bdr}`, borderRadius: 9, padding: "9px 6px", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "'Cairo',sans-serif" }
    }, l))),
    which === "tafsir" ? E(TafsirPanel, { editions: TAFSIR_EDITIONS, intro: "اختار التفسير ثم السورة. التحميل أول مرة بيحتاج نت (سورة البقرة كبيرة)، وبعدها السورة بتفضل متخزنة وتشتغل أوفلاين." }) : E(AsbabNuzulPanel, null)
  );
}

function TileGrid({ tiles, cols }) {
  return E("div", { style: { display: "grid", gridTemplateColumns: `repeat(${cols || 2}, 1fr)`, gap: 10, marginBottom: 14 } },
    tiles.map(t => E("button", {
      key: t.k, onClick: t.onClick,
      style: { background: T.card, border: `1px solid ${T.bdr}`, borderRadius: 14, padding: "18px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 7, cursor: "pointer", fontFamily: "'Cairo',sans-serif" }
    },
      E("span", { style: { fontSize: 24 } }, t.ic),
      E("span", { style: { fontSize: 12, fontWeight: 700, color: "#e2e8f0" } }, t.l)
    ))
  );
}

// ── السبحة الرقمية — عداد تسبيح بسيط
const TASBIH_PHRASES = ["سبحان الله", "الحمد لله", "الله أكبر", "لا إله إلا الله", "أستغفر الله"];
function TasbihScreen({ onBack }) {
  // ── أذكار إضافية بيضيفها المستخدم بنفسه، بتتحفظ دايمًا وميتمسحوش لوحدهم
  const [customPhrases, setCustomPhrases] = useState(() => ld("tasbih_custom_phrases", []));
  useEffect(() => sv("tasbih_custom_phrases", customPhrases), [customPhrases]);
  const allPhrases = [...TASBIH_PHRASES, ...customPhrases];
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [count, setCount] = useState(0);
  const [target, setTarget] = useState(33);
  const [adding, setAdding] = useState(false);
  const [newPhrase, setNewPhrase] = useState("");
  const bump = () => setCount(c => {
    const n = c + 1;
    if (n >= target && "vibrate" in navigator) { try { navigator.vibrate([40, 30, 40]); } catch (e) {} }
    return n;
  });
  const addPhrase = () => {
    const t = newPhrase.trim();
    if (!t) return;
    setPhraseIdx(TASBIH_PHRASES.length + customPhrases.length);
    setCustomPhrases(p => [...p, t]);
    setNewPhrase("");
    setAdding(false);
    setCount(0);
  };
  const removeCustom = customIdx => {
    setCustomPhrases(p => p.filter((_, i) => i !== customIdx));
    setPhraseIdx(0);
    setCount(0);
  };
  return E("div", { style: { padding: "13px" } },
    E("button", { onClick: onBack, style: backBtnStyle() }, "‹ رجوع"),
    E("div", { style: { textAlign: "center", marginTop: 20 } },
      E("div", { style: { display: "flex", justifyContent: "center", gap: 6, flexWrap: "wrap", marginBottom: 10 } },
        allPhrases.map((p, i) => {
          const isCustom = i >= TASBIH_PHRASES.length;
          return E("span", {
            key: i,
            style: { position: "relative", display: "inline-flex" }
          },
            E("button", {
              onClick: () => { setPhraseIdx(i); setCount(0); },
              style: { padding: isCustom ? "7px 22px 7px 12px" : "7px 12px", borderRadius: 20, border: `1px solid ${i === phraseIdx ? T.orange : T.bdr}`, background: i === phraseIdx ? T.orange + "22" : "transparent", color: i === phraseIdx ? T.orange : "#7aa3d4", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Cairo',sans-serif" }
            }, p),
            isCustom && E("span", {
              onClick: e => { e.stopPropagation(); removeCustom(i - TASBIH_PHRASES.length); },
              title: "حذف الذكر ده",
              style: { position: "absolute", left: 3, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: T.red, cursor: "pointer" }
            }, "×")
          );
        }),
        E("button", {
          onClick: () => setAdding(a => !a),
          title: "إضافة ذكر جديد",
          style: { padding: "7px 14px", borderRadius: 20, border: `1px dashed ${T.orange}`, background: "transparent", color: T.orange, fontSize: 13, fontWeight: 900, cursor: "pointer", fontFamily: "'Cairo',sans-serif" }
        }, "+ إضافة ذكر")
      ),
      adding && E("div", { style: { display: "flex", gap: 6, marginBottom: 16, justifyContent: "center" } },
        E("input", {
          type: "text", value: newPhrase, autoFocus: true, placeholder: "اكتب الذكر الجديد",
          onChange: e => setNewPhrase(e.target.value),
          onKeyDown: e => { if (e.key === "Enter") addPhrase(); },
          style: { ...S.inp, marginBottom: 0, width: 200, textAlign: "center" }
        }),
        E("button", {
          onClick: addPhrase,
          style: { background: T.orange, border: "none", borderRadius: 9, padding: "0 14px", color: "#000", fontWeight: 900, cursor: "pointer", fontFamily: "'Cairo',sans-serif" }
        }, "✓")
      ),
      E("button", {
        onClick: bump,
        style: { width: 220, height: 220, borderRadius: "50%", background: `radial-gradient(circle,${T.orange}33,${T.card})`, border: `3px solid ${T.orange}`, color: T.orange, fontSize: 20, fontWeight: 900, cursor: "pointer", fontFamily: "'Cairo',sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, margin: "0 auto" }
      },
        E("span", { style: { fontSize: 46 } }, toArabicDigits(count)),
        E("span", { style: { fontSize: 13, color: "#e2e8f0" } }, allPhrases[phraseIdx])
      ),
      E("div", { style: { fontSize: 11, color: "#4a6080", marginTop: 14 } }, "الهدف: " + toArabicDigits(target)),
      E("div", { style: { display: "flex", justifyContent: "center", gap: 8, marginTop: 10 } },
        [33, 99, 100].map(n => E("button", {
          key: n, onClick: () => setTarget(n),
          style: { padding: "5px 12px", borderRadius: 8, border: `1px solid ${target === n ? T.blue : T.bdr}`, background: target === n ? T.blue + "22" : "transparent", color: target === n ? T.blue : "#7aa3d4", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Cairo',sans-serif" }
        }, toArabicDigits(n)))),
      E("button", {
        onClick: () => setCount(0),
        style: { marginTop: 18, padding: "9px 20px", borderRadius: 10, border: `1px solid ${T.red}55`, background: "transparent", color: T.red, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Cairo',sans-serif" }
      }, "↺ تصفير العداد")
    )
  );
}

// ── تنقل داخلي مع زرار الرجوع: أي شاشة فرعية (زي أذكار الصباح جوه الأذكار) بتتسجّل في الـ history،
// فزرار الرجوع بتاع الموبايل يرجّعك خطوة خطوة بدل ما يقفز للشاشة الرئيسية.
// cur: حالة بسيطة (JSON) بتوصف الشاشة الحالية — apply: بتطبّق حالة قديمة لما المستخدم يرجع
function useNavHistory(cur, apply, base) {
  const key = JSON.stringify(cur);
  const stackRef = useRef(null);
  const depthRef = useRef(0);
  if (stackRef.current === null) {
    const st = window.history.state;
    const d = st && st.aNav ? (st.aDepth || 0) : 0;
    stackRef.current = Array.from({ length: d }, () => base).concat([cur]);
    depthRef.current = d;
  }
  useEffect(() => {
    const top = stackRef.current[depthRef.current];
    if (JSON.stringify(top) !== key) {
      stackRef.current = stackRef.current.slice(0, depthRef.current + 1);
      stackRef.current.push(cur);
      depthRef.current = stackRef.current.length - 1;
      window.history.pushState({ tab: "athkar", aNav: cur, aDepth: depthRef.current }, "", "");
    }
  }, [key]);
  useEffect(() => {
    const onPop = e => {
      const st = e.state || {};
      if (st.qNav && !st.aNav) return; // خطوة جوه المصحف — المصحف بيتعامل معاها بنفسه
      depthRef.current = st.aNav ? (st.aDepth || 0) : 0;
      apply(st.aNav || base);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  // رجوع جوه التطبيق: لو فيه خطوة قديمة بتطابق pred نرجع لها بالـ history، وإلا نطبّق fallback مباشرة
  const goBackTo = (pred, fallback, extra) => {
    const d = depthRef.current;
    for (let i = d - 1; i >= 0; i--) {
      if (pred(stackRef.current[i])) { window.history.go(i - d - (extra || 0)); return; }
    }
    apply(fallback);
  };
  return { goBackTo };
}

function AthkarScreen() {
  const initNav = (() => { const st = window.history.state; return st && st.aNav ? st.aNav : { s: null, c: null }; })();
  const [section, setSection] = useState(initNav.s); // الشاشة المفتوحة فعليًا جوه المجموعة
  const [dailyLifeCat, setDailyLifeCat] = useState(initNav.c); // فئة "أحوال يومية" المفتوحة
  // ── استلام وجهة من إشعار تذكير (window.__pendingGo): افتح القسم المطلوب على طول
  useEffect(() => {
    const consume = () => {
      const g = window.__pendingGo;
      if (!g) return;
      window.__pendingGo = null;
      setDailyLifeCat(null);
      if (g === "quran") { window.__openReader = true; setSection("quran"); window.dispatchEvent(new Event("rafiqi-open-reader")); }
      else if (g === "tasbih") setSection("tasbih");
      else if (g === "athkar") setSection("athkarMenu");
      else if (g.indexOf("athkar_") === 0) setSection(g.slice(7));
    };
    consume();
    window.addEventListener("rafiqi-go", consume);
    return () => window.removeEventListener("rafiqi-go", consume);
  }, []);
  const navBase = { s: null, c: null };
  const nav = useNavHistory({ s: section, c: dailyLifeCat }, v => { setSection(v.s); setDailyLifeCat(v.c); }, navBase);

  // لو إحنا جوه المصحف، فيه خطوات إضافية سجّلها المصحف نفسه فوق خطوة الأذكار، فبنرجعها معاها (window.__qDepth)
  const backToMenu = () => nav.goBackTo(v => v.s === "athkarMenu" && v.c === null, { s: "athkarMenu", c: null });
  const backToTiles = () => nav.goBackTo(v => v.s === null, navBase, section === "quran" ? (window.__qDepth || 0) : 0);

  if (section === "morning") return E(React.Fragment, null, E("div", { style: { padding: "0 14px" } }, E("button", { onClick: backToMenu, style: backBtnStyle() }, "‹ رجوع")), E(AthkarListPlayer, { key: "morning", list: MORNING_ATHKAR_GROUPED, storageKey: "athkar_morning" }));
  if (section === "evening") return E(React.Fragment, null, E("div", { style: { padding: "0 14px" } }, E("button", { onClick: backToMenu, style: backBtnStyle() }, "‹ رجوع")), E(AthkarListPlayer, { key: "evening", list: EVENING_ATHKAR_GROUPED, storageKey: "athkar_evening" }));
  if (section === "sleep") return E(React.Fragment, null, E("div", { style: { padding: "0 14px" } }, E("button", { onClick: backToMenu, style: backBtnStyle() }, "‹ رجوع")), E(AthkarListPlayer, { key: "sleep", list: SLEEP_ATHKAR_GROUPED, storageKey: "athkar_sleep" }));
  if (section === "beforePrayer") return E(React.Fragment, null, E("div", { style: { padding: "0 14px" } }, E("button", { onClick: backToMenu, style: backBtnStyle() }, "‹ رجوع")), E(AthkarListPlayer, { key: "beforePrayer", list: BEFORE_PRAYER_ATHKAR_GROUPED, storageKey: "athkar_before_prayer" }));
  if (section === "afterPrayer") return E(React.Fragment, null, E("div", { style: { padding: "0 14px" } }, E("button", { onClick: backToMenu, style: backBtnStyle() }, "‹ رجوع")), E(AthkarListPlayer, { key: "afterPrayer", list: AFTER_PRAYER_ATHKAR_GROUPED, storageKey: "athkar_after_prayer" }));
  if (section === "dailyLife") {
    if (dailyLifeCat) {
      const cat = DAILY_LIFE_ATHKAR_GROUPED[dailyLifeCat];
      return E(React.Fragment, null, E("div", { style: { padding: "0 14px" } }, E("button", { onClick: () => nav.goBackTo(v => v.s === "dailyLife" && v.c === null, { s: "dailyLife", c: null }), style: backBtnStyle() }, "‹ رجوع لأحوال يومية")), E(AthkarListPlayer, { key: dailyLifeCat, list: cat.list, storageKey: "athkar_daily_" + dailyLifeCat }));
    }
    return E(React.Fragment, null,
      E("div", { style: { padding: "0 14px" } }, E("button", { onClick: backToMenu, style: backBtnStyle() }, "‹ رجوع")),
      E("div", { style: { padding: "10px 14px 0" } },
        E("div", { style: { ...S.sub, color: T.orange } }, "أذكار الأحوال اليومية"),
        E(TileGrid, {
          cols: 2,
          tiles: Object.entries(DAILY_LIFE_ATHKAR_GROUPED).map(([k, v]) => ({ k, ic: v.ic, l: v.title, onClick: () => setDailyLifeCat(k) }))
        })
      )
    );
  }
  if (section === "quran") return E(React.Fragment, null, E("div", { style: { padding: "0 14px" } }, E("button", { onClick: backToTiles, style: backBtnStyle() }, "‹ رجوع")), E(QuranIndexScreen, null));
  if (section === "ibtihalat") return E(React.Fragment, null, E("div", { style: { padding: "0 14px" } }, E("button", { onClick: backToTiles, style: backBtnStyle() }, "‹ رجوع")), E(IbtihalatScreen, null));
  if (section === "tasbih") return E(TasbihScreen, { onBack: backToTiles });
  if (section === "athkarMenu") return E("div", { style: { padding: "0 14px" } },
    E("button", { onClick: backToTiles, style: backBtnStyle() }, "‹ رجوع"),
    E("div", { style: { ...S.sub, color: T.orange, marginTop: 10 } }, "اختار وقت الذكر"),
    E(TileGrid, {
      cols: 2,
      tiles: [
        { k: "morning", ic: "🌅", l: "أذكار الصباح", onClick: () => setSection("morning") },
        { k: "evening", ic: "🌙", l: "أذكار المساء", onClick: () => setSection("evening") },
        { k: "sleep", ic: "🌜", l: "أذكار النوم", onClick: () => setSection("sleep") },
        { k: "beforePrayer", ic: "🕌", l: "أذكار قبل الصلاة", onClick: () => setSection("beforePrayer") },
        { k: "afterPrayer", ic: "🤲", l: "أذكار بعد الصلاة", onClick: () => setSection("afterPrayer") },
        { k: "dailyLife", ic: "🗓️", l: "أحوال يومية", onClick: () => setSection("dailyLife") },
        { k: "ruqyah", ic: "🩹", l: "الرقية الشرعية", onClick: () => setSection("ruqyah") }
      ]
    })
  );
  const TOOLS = {
    ruqyah: ["🩹 الرقية الشرعية", () => E(QuranRuqyahPanel, null), backToMenu],
    duas: ["🤲 أدعية", () => E(DuasPanel, null)],
    bookmarks: ["🔖 علاماتي المحفوظة", () => E(BookmarksTool, { onJump: p => { svLocal("quran_last_page", p); window.__openReader = true; setSection("quran"); } })],
    settings: ["⚙️ حجم الخط والقارئ", () => E(ReaderSettingsTool, null)],
    reminders: ["⏰ التذكيرات بتاعتي", () => E(QuranRemindersPanel, null)],
    nawawi: ["📚 الأربعون النووية", () => E(NawawiPanel, null)],
    tafsir: ["📖 التفسير وأسباب النزول", () => E(TafsirHub, null)],
    meanings: ["🔤 معاني الكلمات والإعراب", () => E(TafsirPanel, { editions: MEANINGS_EDITIONS, intro: "غريب القرآن وإعرابه سورة سورة. اختار الكتاب ثم السورة. أول تحميل لكل سورة بيحتاج نت وبعدها بيشتغل أوفلاين." })],
    mutun: ["📘 المتون القرآنية", () => E("div", { style: { textAlign: "center", color: "#4a6080", fontSize: 13, padding: "30px 10px" } }, "قريبًا إن شاء الله 🚧")],
    about: ["ℹ️ عن تاب المصحف", () => E(AboutTabPanel, null)]
  };
  if (TOOLS[section]) {
    const [title, render, back] = TOOLS[section];
    return E("div", { style: { padding: "0 14px 12px" } },
      E("button", { onClick: back || backToTiles, style: backBtnStyle() }, "‹ رجوع"),
      E("div", { style: { ...S.sub, color: T.orange, margin: "10px 0" } }, title),
      render()
    );
  }

  return E("div", { style: { padding: "14px 14px 0" } },
    E("div", { style: S.sub }, "📿 العبادات اليومية"),
    E(TileGrid, {
      cols: 3,
      tiles: [
        { k: "athkar", ic: "📿", l: "الأذكار", onClick: () => setSection("athkarMenu") },
        { k: "quran", ic: "📖", l: "المصحف", onClick: () => setSection("quran") },
        { k: "ibtihalat", ic: "🎙️", l: "الابتهالات والمنشدين", onClick: () => setSection("ibtihalat") },
        { k: "tasbih", ic: "📳", l: "السبحة", onClick: () => setSection("tasbih") },
        { k: "duas", ic: "🤲", l: "أدعية", onClick: () => setSection("duas") },
        { k: "bookmarks", ic: "🔖", l: "علاماتي المحفوظة", onClick: () => setSection("bookmarks") },
        { k: "settings", ic: "⚙️", l: "حجم الخط والقارئ", onClick: () => setSection("settings") },
        { k: "reminders", ic: "⏰", l: "التذكيرات بتاعتي", onClick: () => setSection("reminders") },
        { k: "nawawi", ic: "📚", l: "الأربعون النووية", onClick: () => setSection("nawawi") },
        { k: "tafsir", ic: "📖", l: "تفسير", onClick: () => setSection("tafsir") },
        { k: "meanings", ic: "🔤", l: "معاني الكلمات والإعراب", onClick: () => setSection("meanings") },
        { k: "mutun", ic: "📘", l: "المتون القرآنية (قريبًا)", onClick: () => setSection("mutun") },
        { k: "about", ic: "ℹ️", l: "عن التاب", onClick: () => setSection("about") }
      ]
    })
  );
}


// ══════════════════════════════════════════════════════════════
// HOME LAUNCHER — الصفحة الأولى بمربعات بدل الملخص المالي مباشرة
// (عشان لو حد فتح الموبايل بالغلط ميشوفش الأرقام على طول)
// ══════════════════════════════════════════════════════════════
// ── نسخة مصغّرة من مواعيد الصلاة، تتحط أعلى الشاشة الرئيسية (مش شاشة كاملة زي اللي في تاب المصحف)
const HOME_MOTIVATION = [
  "خطوة صغيرة النهارده، فرق كبير بعد شهر.",
  "ربنا يعينك على يومك ويبارك في وقتك.",
  "لسه قدامك وقت تنظّم بيه يومك كله.",
  "كل يوم تحاول فيه، إنجاز يتحسبلك.",
  "ابدأ بسم الله، والباقي هييجي بإذن الله.",
  "الاستمرار أهم من الكمال.",
  "يومك الجاي أحسن من اللي فات بإذن الله.",
  "توكل على الله وامشي في طريقك بثقة.",
  "شوية شوية، والحمل التقيل بيخف بإذن الله.",
  "اللي بيبدأ بنية صافية، ربنا بيفتحله الأبواب.",
  "قرش النهارده بيبني أمان بكرة.",
  "نظّم فلوسك النهارده، وارتاح بالك بكرة.",
  "التعب اللي بتتعبه دلوقتي، هتشوف تمرته قريب.",
  "ماتستهونش بخطوة، كل الطرق الطويلة بتبدأ بخطوة.",
  "استعن بالله ولا تعجز، وكمّل يومك بهمّة.",
  "اللي يحافظ على القليل، ربنا يبارك له في الكتير.",
  "ركّز في اللي في إيدك النهارده، وسيب الباقي على الله.",
  "كل حاجة بتتظبط لما نصبر ونكمّل.",
  "يوم جديد، فرصة جديدة، وبداية أحسن بإذن الله.",
  "الالتزام الصغير كل يوم أقوى من الحماس المؤقت.",
  "اشكر ربنا على اللي عندك، وابني عليه خطوة خطوة.",
  "ربنا ما بيضيّع تعب حد، كمّل وانت مطمّن.",
  "رتّب أولوياتك، والبركة هتيجي في وقتك وفلوسك.",
  "كل ما تحاسب نفسك، بتبقى أقرب لهدفك."
];
// ── كلمة تحفيزية مختلفة كل مرة تفتح الصفحة الرئيسية (ومنها بتتغير لو دوست عليها) — بتتفادى تكرار آخر كلمة ظهرت
function pickMotivation(avoid) {
  let idx = Math.floor(Math.random() * HOME_MOTIVATION.length);
  if (HOME_MOTIVATION.length > 1 && idx === avoid) idx = (idx + 1) % HOME_MOTIVATION.length;
  sv("home_motivation_last", idx);
  return idx;
}
function HomeMotivation() {
  const [idx, setIdx] = useState(() => pickMotivation(ld("home_motivation_last", -1)));
  return E("div", {
    onClick: () => setIdx(i => pickMotivation(i)),
    style: { textAlign: "center", fontSize: 11, color: "#7aa3d4", marginBottom: 18, lineHeight: 1.6, padding: "0 10px", cursor: "pointer", userSelect: "none" }
  }, HOME_MOTIVATION[idx]);
}
function PrayerTimesCompact() {
  const { timings, err } = useTodayPrayerTimes();
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);
  if (err || !timings) return null;
  const toMin = t => { const [h, m] = String(t).slice(0, 5).split(":").map(Number); return h * 60 + m; };
  const nowMin = now.getHours() * 60 + now.getMinutes();
  let nextIdx = PRAYER_ORDER.findIndex(([key]) => toMin(timings[key]) > nowMin);
  if (nextIdx === -1) nextIdx = 0;
  const next = PRAYER_ORDER[nextIdx];
  let diff = toMin(timings[next[0]]) - nowMin; if (diff < 0) diff += 24 * 60;
  const hh = Math.floor(diff / 60), mm = diff % 60;
  return E("div", {
    style: { ...S.card("#1a2840"), border: `1px solid ${T.orange}44`, padding: "8px 8px 7px", marginBottom: 8 }
  },
    E("div", { style: { display: "flex", justifyContent: "space-between", gap: 2 } },
      PRAYER_ORDER.map(([key, label, ic]) => {
        const isNext = key === next[0];
        return E("div", {
          key,
          style: { flex: 1, textAlign: "center", padding: "4px 0", borderRadius: 8, background: isNext ? T.orange + "22" : "transparent", border: isNext ? `1px solid ${T.orange}55` : "1px solid transparent" }
        },
          E("div", { style: { fontSize: 13, lineHeight: 1.2 } }, ic),
          E("div", { style: { fontSize: 9, color: isNext ? T.orange : "#7aa3d4", fontWeight: 700, marginTop: 1 } }, label),
          E("div", { style: { fontSize: 10, fontWeight: 800, color: isNext ? "#fff" : "#e2e8f0", marginTop: 1 } }, timings[key].slice(0, 5))
        );
      })
    ),
    E("div", { style: { textAlign: "center", fontSize: 10, color: "#4a6080", marginTop: 5 } }, "الجاي: " + next[1] + " (باقي " + (hh > 0 ? hh + " س " : "") + mm + " د)")
  );
}
function HomeLauncher({ nav, setTab }) {
  return /*#__PURE__*/React.createElement("div", {
    style: { padding: "16px 16px 20px" }
  },
    E(PrayerTimesCompact, null),
    E(HomeMotivation, null),
    /*#__PURE__*/React.createElement("div", {
      style: { display: "flex", flexDirection: "column", gap: 9, width: "100%", maxWidth: 420, margin: "0 auto" }
    }, nav.map(n => /*#__PURE__*/React.createElement("button", {
      key: n.k,
      onClick: () => setTab(n.k),
      style: {
        background: T.card, border: `1px solid ${T.bdr}`, borderRadius: 14,
        padding: "13px 16px", display: "flex", alignItems: "center", gap: 14,
        cursor: "pointer", fontFamily: "'Cairo',sans-serif", textAlign: "right", width: "100%"
      }
    }, /*#__PURE__*/React.createElement("span", { style: { fontSize: 22, width: 30, textAlign: "center", flexShrink: 0 } }, n.ic),
       /*#__PURE__*/React.createElement("span", { style: { fontSize: 14, fontWeight: 700, color: "#e2e8f0", flex: 1 } }, n.l),
       /*#__PURE__*/React.createElement("span", { style: { fontSize: 15, color: "#2a3a55" } }, "‹")
    ))));
}

// ── تخمين أيقونة مناسبة لاسم بند/فئة جديدة بيضيفها المستخدم (بدل العلامة 🏷️ الثابتة)
const CAT_ICON_HINTS = [
  [/سوبر ?ماركت|بقال[هة]|هايبر/, "🛒"],
  [/تحويش|توفير|مدخرات/, "💰"],
  [/رصيد|شحن|فوده|فودافون|اورنج|اتصالات/, "💳"],
  [/لب|سوداني|مكسرات/, "🌰"],
  [/كشري/, "🍚"],
  [/مكتب[ةه]?|قرطاسي[ةه]|كتب/, "📚"],
  [/قصب|عصير/, "🥤"],
  [/حلاق|صالون|كوافير/, "✂️"],
  [/عربية فول|فول/, "🫘"],
  [/كبد[ةه]|جمبري|مأكولات بحري[ةه]|سمك/, "🍤"],
  [/طعمي[ةه]|فلافل/, "🧆"],
  [/فرن|عيش|خبز/, "🍞"],
  [/كشك/, "🏪"],
  [/جيم|حديد|عضلات|رياض[ةه]|كارديو/, "🏋️"],
  [/دوا|دواء|صيدلي[ةه]/, "💊"],
  [/جزار[ةه]|لحم[ةه]?/, "🥩"],
  [/مطعم|أكل بر[ةه]|اوردر/, "🍽️"],
  [/كافيه|قهو[ةه]|كافي/, "☕"],
  [/بنزين|وقود|محط[ةه]/, "⛽"],
  [/مواصلات|تاكسي|اندرايف|إندرايف|اوبر/, "🚕"],
  [/ملابس|شنط[ةه]|احذي[ةه]|جزم[ةه]/, "👕"],
  [/^نت$|انترنت|إنترنت|واي فاي/, "📶"],
  [/كهرب[اه]ء?/, "💡"],
  [/غاز/, "🔥"],
  [/ميا[هة]/, "🚰"],
  [/موبايل|تليفون|محمول/, "📱"],
  [/صيان[ةه]/, "🔧"],
  [/هداي[اه]/, "🎁"],
  [/مدرس[ةه]|تعليم|كورس/, "📖"],
  [/ايجار|إيجار/, "🏠"],
  [/بنك/, "🏦"]
];
function guessIcon(name) {
  const t = (name || "").trim();
  if (!t) return null;
  for (const [re, ic] of CAT_ICON_HINTS) {
    if (re.test(t)) return ic;
  }
  return null;
}

function loadOdoLog() {
  const legacyOdo = ld("car_odo_v1", 0);
  const def = legacyOdo ? { [finKey(DK())]: legacyOdo } : {};
  return ld("car_odo_log_v1", def);
}
function currentKnownOdo(odoLog) {
  const vals = Object.values(odoLog || {}).map(Number).filter(v => v > 0);
  return vals.length ? Math.max(...vals) : 0;
}
// بيرجع كل بند عربية اتسجله المستخدم وحدد له "ميعاد جاي" بالكيلومتر + هل محتاجين نفكّره يسجل عداد الشهر
function computeMaintAlerts(entries) {
  const overrideIds = new Set((entries || []).filter(e => e.type === "car").map(e => e.id));
  const all = [...CAR_DATA.filter(e => !overrideIds.has(e.id)), ...(entries || []).filter(e => e.type === "car")];
  const odoLog = loadOdoLog();
  const curOdo = currentKnownOdo(odoLog);
  const mk = finKey(DK());
  const needsOdoLog = !odoLog[mk];
  const items = all.filter(e => e.dueKm && +e.dueKm > 0).map(e => ({
    id: e.id,
    label: e.note || e.name || "صيانة",
    ic: catF(CC, e.cat).ic,
    dueKm: +e.dueKm,
    left: curOdo ? +e.dueKm - curOdo : null
  })).sort((a, b) => (a.left ?? 1e9) - (b.left ?? 1e9));
  return { curOdo, mk, needsOdoLog, items };
}

const addM = (mk, n) => {
  const [y, m] = mk.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return MK(d);
};
// مفتاح "الشهر المالي" المستخدم في كل التطبيق (إندرايف، البيت/ضحي، العربية، الملخص):
// - يونيو 2026: شهر استثنائي، من 23/5/2026 لحد 25/6/2026 (شهر القبض الأول)
// - من يوليو 2026 فصاعداً: الشهر المالي يبدأ يوم 25 من كل شهر (يوم القبض)
// - يناير → مايو 2026: بالتقويم العادي كما هي (قبل تطبيق نظام يوم القبض)
const FIN_CUTOVER = "2026-05-23"; // أول تاريخ يتطبق عليه منطق الشهر المالي
const FIN_CUTOVER2 = "2026-06-25"; // من هنا فصاعداً يوم القبض بقى 25
const finKey = dateStr => {
  if (dateStr < FIN_CUTOVER) return dateStr.slice(0, 7);
  if (dateStr < FIN_CUTOVER2) return "2026-06"; // كل ما بين 23/5 و25/6 = شهر يونيو
  const [y, m, day] = dateStr.split("-").map(Number);
  const base = MK(new Date(y, m - 1, 1));
  return day >= 25 ? addM(base, 1) : base;
};
// "الشهر المالي الحالي" - بيستخدم نفس منطق finKey بالظبط (يوم القبض 25)
// ده اللي المفروض يحدد الشهر اللي يفتح بيه التطبيق تلقائي، مش MK() العادي
const currentFinMonth = () => finKey(DK());
function calcLoans(monthly) {
  // نبدأ من الأرقام الموجودة في الإكسيل مباشرة (دي بالفعل المتبقي بعد سداد يونيو)
  // ونخصم منها فقط الأشهر الجديدة اللي المستخدم بيدخلها (يوليو فصاعداً)
  let salfaRem = SALFA_START; // 393,000 (متبقي بعد يونيو)
  let aptRem = APT_START; // 349,815.91 (متبقي بعد يونيو)
  
  // نجمع كل الأشهر من يوليو لحد الشهر الحالي
  const curMk = currentFinMonth();
  let checkMk = "2026-07";
  while (checkMk <= curMk) {
    const d = monthly[checkMk] || MONTHLY_PRESET[checkMk] || {};
    salfaRem -= +(d.car_fixed || defaultCarInstallment(checkMk));
    aptRem -= +(d.rent || defaultRentInstallment(checkMk));
    // الشهر الجديد
    const [y, m] = checkMk.split("-").map(Number);
    const next = new Date(y, m, 1);
    checkMk = MK(next);
  }
  
  return {
    salfaRem: Math.max(0, salfaRem),
    aptRem: Math.max(0, aptRem)
  };
}

// ── حساب المتبقي من الشهر السابق (محمد + ضحي) عشان يترحل للشهر الجاي
// ده بيتحسب حي كل مرة، مش قيمة متجمدة، فبيتحدث لو عدلت أي بيانات في الشهر السابق
function calcCarryover(mk, monthly, entries, indExtra, deletedXl) {
  const dxl = deletedXl || [];
  const prevMk = addM(mk, -1);
  const prevPreset = MONTHLY_PRESET[prevMk] || {};
  const prevMonthly = monthly[prevMk] || {};
  const prevSaved = { ...prevPreset, ...prevMonthly };
  const lastSalary = (() => {
    const mks = Object.keys(monthly).filter(k => k < mk).sort().reverse();
    for (const k of mks) { if (monthly[k]?.salary > 0) return monthly[k].salary; }
    const presetMks = Object.keys(MONTHLY_PRESET).filter(k => k < mk).sort().reverse();
    for (const k of presetMks) { if (MONTHLY_PRESET[k]?.salary > 0) return MONTHLY_PRESET[k].salary; }
    return 0;
  })();
  if (!prevSaved.salary && lastSalary) prevSaved.salary = lastSalary;
  const pn = k => +(prevSaved[k] || 0);
  const prevInc = pn("salary") + pn("transport") + pn("waste") + pn("old") + pn("deals") + pn("eid") + pn("dohaa") + pn("magdy");
  const prevFix = pn("car_fixed") + pn("rent") + pn("internet") + pn("charity") + pn("mom") + pn("ajz") + pn("tahwish");
  const prevDuha = pn("home_given") || 0;
  const prevAllH = [...HOME_DATA.filter(e => !dxl.includes(e.id)), ...(entries || []).filter(e => e.type === "home")].filter(e => finKey(e.date) === prevMk && !(e.cat === "saving" && e.id && e.id.startsWith("hn")));
  const prevAllD = [...DUHA_DATA, ...(entries || []).filter(e => e.type === "duha")].filter(e => finKey(e.date) === prevMk);
  const prevAllC = [...CAR_DATA, ...(entries || []).filter(e => e.type === "car")].filter(e => finKey(e.date) === prevMk);
  const prevCarDoha = SUM(prevAllC.filter(e => e.paidBy === "doha"));
  const prevCarMohy = SUM(prevAllC.filter(e => e.paidBy !== "doha" && e.paidBy !== "tahwish"));
  const prevHomeDoha = SUM(prevAllH.filter(e => e.paidBy === "doha"));
  const prevHomeMohy = SUM(prevAllH.filter(e => e.paidBy !== "doha" && e.paidBy !== "tahwish"));
  const prevDuhaMohamed = SUM(prevAllD.filter(e => e.paidBy === "mohamed"));
  const prevDuhaOwn = SUM(prevAllD.filter(e => e.paidBy !== "mohamed" && e.paidBy !== "tahwish"));
  const prevIndSum = indriveSummary(indExtra || []);
  const prevInd = prevIndSum[prevMk];
  const prevIndRev = prevInd ? prevInd.rev : 0;
  const prevIndExp = prevInd ? (prevInd.petrol||0)+(prevInd.tax||0)+(prevInd.tire||0) : 0;
  const prevTahwish = SUM((entries||[]).filter(e=>e.type==="home"&&e.cat==="saving"&&e.id&&e.id.startsWith("hn")&&finKey(e.date)===prevMk));
  const prevTotalOut = prevFix + prevDuha + prevHomeMohy + prevCarMohy + prevDuhaMohamed + prevIndExp + prevTahwish;
  const prevBalance = Math.max(0, (prevInc + prevIndRev) - prevTotalOut);
  const prevDuhaSpent = prevDuhaOwn + prevHomeDoha + prevCarDoha;
  const prevDuhaBalance = Math.max(0, prevDuha - prevDuhaSpent);
  return {
    prevBalance,
    prevDuhaBalance,
    combined: prevBalance + prevDuhaBalance
  };
}

// ── إندرايف: ملخص شهري من الداتا الخام
function indriveSummary(extra = []) {
  const all = [...IND_RAW, ...extra];
  const by = {};
  all.forEach(e => {
    const m = finKey(e.date);
    if (!by[m]) by[m] = {
      orders: 0,
      rev: 0,
      petrol: 0,
      petrol_fills: 0,
      petrol_liters: 0,
      petrol_km: 0,
      tax: 0,
      tire: 0,
      entries: []
    };
    by[m].entries.push(e);
    if (e.type === "order") {
      by[m].orders += (e.count || 1);
      by[m].rev += e.amount;
    } else if (e.type === "tax") {
      by[m].tax += e.amount;
    } else if (e.type === "tire") {
      by[m].tire += e.amount;
    } else {
      by[m].petrol += e.amount;
      by[m].petrol_fills++;
      by[m].petrol_liters += (e.liters || 0);
      by[m].petrol_km += (e.km || 0);
    }
  });
  return by;
}

// ══════════════════════════════════════════════════════════════
// THEME
// ══════════════════════════════════════════════════════════════
const T = {
  bg: "#070c16",
  card: "#0f1a2a",
  bdr: "#1a2840",
  blue: "#3b82f6",
  green: "#10b981",
  red: "#ef4444",
  orange: "#f59e0b",
  purple: "#8b5cf6"
};
const S = {
  root: {
    fontFamily: "'Cairo',sans-serif",
    background: T.bg,
    minHeight: "100vh",
    color: "#e2e8f0",
    maxWidth: 480,
    margin: "0 auto",
    paddingBottom: 12,
    direction: "rtl"
  },
  card: (b = T.bdr) => ({
    background: T.card,
    borderRadius: 13,
    padding: "13px 15px",
    marginBottom: 9,
    border: `1px solid ${b}`
  }),
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  lbl: {
    fontSize: 12,
    color: "#4a6080"
  },
  inp: {
    background: T.bg,
    border: `1px solid ${T.bdr}`,
    borderRadius: 9,
    padding: "9px 12px",
    fontSize: 14,
    color: "#e2e8f0",
    width: "100%",
    fontFamily: "'Cairo',sans-serif",
    outline: "none",
    direction: "rtl",
    marginBottom: 9
  },
  btn: (bg = T.blue, c = "#fff") => ({
    background: bg,
    color: c,
    border: "none",
    borderRadius: 10,
    padding: "11px 0",
    fontSize: 14,
    fontWeight: 700,
    fontFamily: "'Cairo',sans-serif",
    cursor: "pointer",
    width: "100%",
    marginTop: 4
  }),
  div: {
    height: 1,
    background: T.bdr,
    margin: "8px 0"
  },
  sub: {
    fontSize: 10,
    color: "#2a3a55",
    textTransform: "uppercase",
    letterSpacing: "1px",
    marginBottom: 7,
    fontWeight: 700
  }
};
function Bar({
  v,
  max,
  c = T.blue,
  h = 7
}) {
  const p = PCT(v, max),
    bg = p >= 100 ? "#ef4444" : p >= 80 ? "#f59e0b" : c;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: T.bdr,
      borderRadius: 99,
      height: h,
      overflow: "hidden",
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: `${p}%`,
      height: "100%",
      background: bg,
      borderRadius: 99,
      transition: "width .4s"
    }
  }));
}
function Tabs({
  tabs,
  cur,
  set,
  ac = T.blue
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 4,
      padding: "9px 13px 0"
    }
  }, tabs.map(([k, l]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    onClick: () => set(k),
    style: {
      flex: 1,
      padding: "7px 0",
      borderRadius: 8,
      border: "none",
      cursor: "pointer",
      fontFamily: "'Cairo',sans-serif",
      fontWeight: 700,
      fontSize: 12,
      background: cur === k ? ac : T.card,
      color: cur === k ? "#fff" : "#4a6080"
    }
  }, l)));
}
function Toast({
  msg
}) {
  return msg ? /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      bottom: 90,
      left: "50%",
      transform: "translateX(-50%)",
      background: "#1a2840",
      color: "#fff",
      borderRadius: 99,
      padding: "7px 16px",
      fontSize: 13,
      fontWeight: 700,
      zIndex: 200,
      whiteSpace: "nowrap"
    }
  }, msg) : null;
}
function Confirm({
  msg,
  onOk,
  onNo
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "#000c",
      zIndex: 100,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: T.card,
      borderRadius: 14,
      padding: 22,
      width: 265,
      textAlign: "center",
      border: `1px solid ${T.bdr}`
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      marginBottom: 14
    }
  }, msg), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 7
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onOk,
    style: {
      ...S.btn("#ef4444"),
      flex: 1
    }
  }, "تأكيد"), /*#__PURE__*/React.createElement("button", {
    onClick: onNo,
    style: {
      ...S.btn("#1a2840", "#94a3b8"),
      flex: 1
    }
  }, "إلغاء"))));
}
function useToast() {
  const [t, s] = useState(null);
  useEffect(() => {
    if (!t) return;
    const x = setTimeout(() => s(null), 2200);
    return () => clearTimeout(x);
  }, [t]);
  return [t, s];
}

// ══════════════════════════════════════════════════════════════
// SALARY MODAL
// ══════════════════════════════════════════════════════════════
function SalaryModal({
  mk,
  monthly,
  entries,
  indExtra,
  deletedXl,
  onSave,
  onClose
}) {
  const def = MONTHLY_PRESET[mk] || {},
    saved = monthly[mk] || {};
  const g = k => saved[k] ?? def[k] ?? 0;
  const carry = calcCarryover(mk, monthly, entries, indExtra, deletedXl);
  const oldDefault = saved.old !== undefined ? saved.old : (def.old !== undefined ? def.old : carry.prevBalance);
  const [f, sf] = useState({
    salary: g("salary"),
    transport: g("transport"),
    waste: g("waste"),
    old: oldDefault,
    deals: g("deals"),
    eid: g("eid"),
    dohaa: g("dohaa"),
    duha_w_sal: g("duha_w_sal"),
    duha_w_sav: g("duha_w_sav"),
    magdy: g("magdy"),
    charity: g("charity") || 200,
    mom: g("mom") || 1500,
    internet: g("internet") || 750,
    car_fixed: g("car_fixed") || defaultCarInstallment(mk),
    rent: g("rent") || defaultRentInstallment(mk),
    home_given: g("home_given") || 10000,
    ajz: g("ajz") || 0,
    tahwish: g("tahwish") || 0
  });
  const [y, m] = mk.split("-").map(Number);
  const n = k => +(f[k] || 0);
  const inc = n("salary") + n("transport") + n("waste") + n("old") + n("deals") + n("eid") + n("dohaa") + n("magdy");
  const fix = n("car_fixed") + n("rent") + n("internet") + n("charity") + n("mom") + n("ajz") + n("tahwish");
  const rem = inc - fix - n("home_given");
  const Fld = ({
    k,
    lbl,
    note
  }) => /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#4a6080",
      marginBottom: 3
    }
  }, lbl, note && /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#2a3a55",
      fontSize: 10,
      marginRight: 4
    }
  }, "(", note, ")")), /*#__PURE__*/React.createElement("input", {
    style: {
      ...S.inp,
      marginBottom: 0,
      border: `1px solid ${n(k) > 0 ? T.blue : T.bdr}`
    },
    type: "number",
    inputMode: "decimal",
    placeholder: "0",
    value: f[k] || "",
    onChange: e => sf(p => ({
      ...p,
      [k]: e.target.value
    }))
  }));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "#000e",
      zIndex: 150,
      overflowY: "auto",
      direction: "rtl"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: T.card,
      minHeight: "100vh",
      maxWidth: 480,
      margin: "0 auto",
      padding: "16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 900,
      color: "#fff"
    }
  }, "📥 بيانات ", MONTHS[m - 1], " ", y), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "#f59e0b",
      marginTop: 3
    }
  }, "⏰ من 25 ", MONTHS[m - 2 >= 0 ? m - 2 : 11], " لـ 25 ", MONTHS[m - 1])), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      background: "none",
      border: "none",
      color: "#4a6080",
      fontSize: 20,
      cursor: "pointer"
    }
  }, "✕")), /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.card("#3b82f622"),
      border: "1px solid #3b82f644",
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: S.sub
  }, "💰 الدخل"), /*#__PURE__*/React.createElement(Fld, {
    k: "salary",
    lbl: "💰 المرتب الأساسي"
  }), /*#__PURE__*/React.createElement(Fld, {
    k: "transport",
    lbl: "🚌 بدل المواصلات"
  }), /*#__PURE__*/React.createElement(Fld, {
    k: "waste",
    lbl: "🗑️ بدل المخلفات"
  }), /*#__PURE__*/React.createElement(Fld, {
    k: "old",
    lbl: "📦 فلوس قديمة / جمعية"
  }), /*#__PURE__*/React.createElement("div", {
    style: { fontSize: 10, color: "#4a6080", marginTop: -4, marginBottom: 9, display: "flex", justifyContent: "space-between", alignItems: "center" }
  }, /*#__PURE__*/React.createElement("span", null, "متبقي محمد ", fmt(carry.prevBalance), " ج"), /*#__PURE__*/React.createElement("button", {
    onClick: () => sf(p => ({ ...p, old: Math.round(carry.prevBalance * 100) / 100 })),
    style: { background: "none", border: "none", color: T.blue, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "'Cairo',sans-serif" }
  }, "🔄 تحديث")), /*#__PURE__*/React.createElement(Fld, {
    k: "deals",
    lbl: "🤝 صفقات"
  }), /*#__PURE__*/React.createElement(Fld, {
    k: "eid",
    lbl: "🎁 عيدية / مكافأة"
  }), /*#__PURE__*/React.createElement(Fld, {
    k: "dohaa",
    lbl: "👩 من ضحي"
  }), /*#__PURE__*/React.createElement(Fld, {
    k: "magdy",
    lbl: "👤 من مجدي"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "#4a6080",
      fontWeight: 700,
      margin: "8px 0 4px"
    }
  }, "💸 سحب من ضحي"), /*#__PURE__*/React.createElement(Fld, {
    k: "duha_w_sal",
    lbl: "💳 سحب من مرتب ضحي"
  }), /*#__PURE__*/React.createElement(Fld, {
    k: "duha_w_sav",
    lbl: "📦 سحب من تحويش ضحي"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.row,
      borderTop: `1px solid ${T.bdr}`,
      paddingTop: 8,
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 700
    }
  }, "إجمالي الدخل"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 16,
      fontWeight: 900,
      color: T.green
    }
  }, fmt(inc), " ج"))), /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.card("#ef444422"),
      border: "1px solid #ef444433",
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: S.sub
  }, "🔒 الثوابت"), /*#__PURE__*/React.createElement(Fld, {
    k: "car_fixed",
    lbl: "🚗 قسط العربية",
    note: "يخصم من السلفة"
  }), /*#__PURE__*/React.createElement(Fld, {
    k: "rent",
    lbl: "🏠 قسط الشقة / الإيجار",
    note: "يخصم من قسط الشقة"
  }), /*#__PURE__*/React.createElement(Fld, {
    k: "internet",
    lbl: "📡 الإنترنت"
  }), /*#__PURE__*/React.createElement(Fld, {
    k: "charity",
    lbl: "🤲 الصدقات والحصري"
  }), /*#__PURE__*/React.createElement(Fld, {
    k: "mom",
    lbl: "👩 أمي"
  }), /*#__PURE__*/React.createElement(Fld, {
    k: "ajz",
    lbl: "📉 عجز"
  }), /*#__PURE__*/React.createElement(Fld, {
    k: "tahwish",
    lbl: "💰 تحويش"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.row,
      borderTop: `1px solid ${T.bdr}`,
      paddingTop: 8,
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 700
    }
  }, "إجمالي الثوابت"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 15,
      fontWeight: 900,
      color: T.red
    }
  }, fmt(fix), " ج"))), /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.card("#8b5cf622"),
      border: "1px solid #8b5cf644",
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: S.sub
  }, "👩 مرتب ضحي (الفلوس اللي بتدّيها لضحي)"), /*#__PURE__*/React.createElement("input", {
    style: {
      ...S.inp,
      fontSize: 17,
      fontWeight: 700,
      textAlign: "center",
      border: "1px solid #8b5cf6"
    },
    type: "number",
    inputMode: "decimal",
    value: f.home_given || "",
    onChange: e => sf(p => ({
      ...p,
      home_given: e.target.value
    }))
  }), carry.prevDuhaBalance > 0 && /*#__PURE__*/React.createElement("div", {
    style: { fontSize: 10, color: "#4a6080", marginTop: 6 }
  }, "+ متبقيها من الشهر اللي فات ", fmt(carry.prevDuhaBalance), " ج بيتضاف تلقائي على مرتبها في شاشتها")), /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.card(rem >= 0 ? "#10b98133" : "#ef444433"),
      border: `2px solid ${rem >= 0 ? T.green : T.red}`,
      textAlign: "center",
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: rem >= 0 ? T.green : T.red,
      marginBottom: 3
    }
  }, rem >= 0 ? "✅ ميزانية الأكل والبيت" : "⚠️ عجز"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 26,
      fontWeight: 900,
      color: rem >= 0 ? T.green : T.red
    }
  }, fmt(Math.abs(rem)), " ج"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "#4a6080",
      marginTop: 3
    }
  }, "دخل ", fmt(inc), " − ثوابت ", fmt(fix), " − ضحي ", fmt(n("home_given")))), /*#__PURE__*/React.createElement("button", {
    style: S.btn(T.green),
    onClick: () => onSave(mk, {
      ...f
    })
  }, "💾 حفظ بيانات الشهر")));
}

// ══════════════════════════════════════════════════════════════
// HOME SCREEN
// ══════════════════════════════════════════════════════════════
// ── تقسيم مرتب ضحي: نصف للبيت (العيال + احتياجات البيت) ونصف للأكل — خاص بضحي بس
const DUHA_SPLIT_DEFAULT_HOUSE = 5000;
function DuhaSplitView({ salary, extra, monthOwn, categories }) {
  const [cfg, setCfg] = useState(() => ld("duha_split_cfg", { house: DUHA_SPLIT_DEFAULT_HOUSE }));
  const [map, setMap] = useState(() => ld("duha_split_map", {}));
  useEffect(() => sv("duha_split_cfg", cfg), [cfg]);
  useEffect(() => sv("duha_split_map", map), [map]);
  const groupOf = id => map[id] || (FOOD_CAT_IDS.includes(id) ? "food" : "house");
  const houseLimit = Math.min(Math.max(0, +cfg.house || 0), salary);
  const foodLimit = Math.max(0, salary - houseLimit);
  const rows = categories.map(c => ({ ...c, total: SUM(monthOwn.filter(e => e.cat === c.id)), g: groupOf(c.id) })).filter(c => c.total > 0);
  const unknownTot = SUM(monthOwn) - rows.reduce((s, c) => s + c.total, 0);
  const houseSpent = rows.filter(c => c.g === "house").reduce((s, c) => s + c.total, 0) + (unknownTot > 0 ? unknownTot : 0);
  const foodSpent = rows.filter(c => c.g === "food").reduce((s, c) => s + c.total, 0);
  const box = (title, ic, color, limit, spent) => {
    const left = limit - spent, pct = limit > 0 ? Math.min(100, Math.round(spent / limit * 100)) : 0;
    return E("div", { style: { ...S.card(), border: `1px solid ${color}44`, marginBottom: 10 } },
      E("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
        E("span", { style: { fontSize: 14, fontWeight: 800, color } }, ic + " " + title),
        E("span", { style: { fontSize: 12, color: "#7aa3d4" } }, "المخصص " + fmt(limit) + " ج")),
      E("div", { style: { height: 7, background: "#070c16", borderRadius: 99, margin: "9px 0 7px", overflow: "hidden" } },
        E("div", { style: { width: pct + "%", height: "100%", background: left < 0 ? T.red : color, borderRadius: 99 } })),
      E("div", { style: { display: "flex", justifyContent: "space-between" } },
        E("span", { style: { fontSize: 11, color: "#4a6080" } }, "صُرف " + fmt(spent) + " ج"),
        E("span", { style: { fontSize: 12, fontWeight: 800, color: left < 0 ? T.red : T.green } }, left < 0 ? "زيادة " + fmt(-left) + " ج" : "متبقي " + fmt(left) + " ج")));
  };
  const chip = (g, label) => ({ k: g, label });
  return E(React.Fragment, null,
    E("div", { style: { ...S.card(), marginBottom: 10 } },
      E("div", { style: { fontSize: 12, color: "#7aa3d4", marginBottom: 6 } }, "مرتب ضحي " + fmt(salary) + " ج" + (extra > 0 ? " (+ متبقي الشهر اللي فات " + fmt(extra) + " ج بره التقسيم)" : "")),
      E("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
        E("span", { style: { fontSize: 12, color: "#c7d3e6" } }, "🏡 للبيت (العيال + احتياجات البيت):"),
        E("input", { type: "number", inputMode: "numeric", value: cfg.house, onChange: e => setCfg({ house: e.target.value }),
          style: { width: 90, background: "#070c16", border: "1px solid #1a2840", borderRadius: 8, padding: "6px 8px", color: "#e2e8f0", fontFamily: "'Cairo',sans-serif", fontSize: 13, textAlign: "center" } }),
        E("span", { style: { fontSize: 12, color: "#4a6080" } }, "ج")),
      E("div", { style: { fontSize: 11, color: "#4a6080", marginTop: 6 } }, "🍽️ الأكل: " + fmt(foodLimit) + " ج (الباقي من المرتب)")),
    box("مصاريف البيت", "🏡", "#60a5fa", houseLimit, houseSpent),
    box("مصاريف الأكل", "🍽️", "#f59e0b", foodLimit, foodSpent),
    E("div", { style: { fontSize: 10, color: "#2a3a55", fontWeight: 700, margin: "4px 0 7px" } }, "كل تصنيف تابع لأنهي جزء (دوس عشان تغيّره)"),
    E("div", { style: S.card() },
      rows.length === 0 ? E("div", { style: { fontSize: 12, color: "#4a6080", textAlign: "center" } }, "مفيش مصاريف الشهر ده لسه") :
      rows.map(c => E("div", { key: c.id, style: { display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: "1px solid #1a2840" } },
        E("span", { style: { fontSize: 12, flex: 1, color: "#e2e8f0" } }, c.ic + " " + c.l),
        E("span", { style: { fontSize: 12, fontWeight: 700, color: c.c } }, fmt(c.total) + " ج"),
        E("button", { onClick: () => setMap(m => ({ ...m, [c.id]: c.g === "food" ? "house" : "food" })),
          style: { border: "none", borderRadius: 7, padding: "4px 9px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Cairo',sans-serif", background: c.g === "food" ? "#f59e0b22" : "#60a5fa22", color: c.g === "food" ? "#f59e0b" : "#60a5fa" } },
          c.g === "food" ? "🍽️ أكل" : "🏡 بيت")))));
}

function CategoryScreen({
  entries,
  onAdd,
  onDel,
  mk,
  monthly,
  initialView,
  onConsumeInitialView,
  dataSource,
  categories: baseCategories,
  entryType,
  idPrefix,
  headerLabel,
  budgetKey,
  budgetLabel,
  defaultBudget,
  budgetExtra,
  addTitle,
  noBudget,
  extraEntries
}) {
  const [expandedCat, setExpandedCat] = useState(null);
  const [customCats, setCustomCats] = useState(() => ld("custom_cats_" + entryType, []));
  useEffect(() => sv("custom_cats_" + entryType, customCats), [customCats]);
  // ترقية لمرة واحدة: أي فئة كانت اتضافت قبل كده بعلامة 🏷️ الثابتة، بنحاول نلاقيها أيقونة مناسبة لاسمها
  useEffect(() => {
    setCustomCats(prev => {
      let changed = false;
      const upd = prev.map(c => {
        if (c.ic === "🏷️") {
          const g = guessIcon(c.l);
          if (g) { changed = true; return { ...c, ic: g }; }
        }
        return c;
      });
      return changed ? upd : prev;
    });
  }, []);
  const categories = useMemo(() => [...baseCategories, ...customCats], [baseCategories, customCats]);
  // ── لبنود جايه من تاب تاني (زي مصروف اتضاف من تاب محمد بس مصروف على ضحي) بتفصيلها الأصلي حتى لو مش من فئات التاب ده
  const crossCats = useMemo(() => ({
    home: [...HC, ...ld("custom_cats_home", [])],
    duha: [...DC, ...ld("custom_cats_duha", [])],
    car: [...CC, ...ld("custom_cats_car", [])]
  }), [customCats]);
  const catFor = e => {
    const t = e.type || entryType;
    if (t === "car") return catF(crossCats.car, e.cat);
    if (t === "home") return catF(crossCats.home, e.cat);
    if (t === "duha") return catF(crossCats.duha, e.cat);
    return catF(categories, e.cat);
  };
  const [addingCat, setAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const addCustomCat = () => {
    const name = newCatName.trim();
    if (!name) return;
    const newCat = { id: "custom_" + Date.now(), l: name, ic: guessIcon(name) || "🏷️", c: "#94a3b8" };
    setCustomCats(p => [...p, newCat]);
    sf(f => ({ ...f, cat: newCat.id }));
    setNewCatName("");
    setAddingCat(false);
  };
  const [form, sf] = useState({
    amount: "",
    cat: baseCategories[0].id,
    note: "",
    date: DK(),
    tahwishAmt: "",
    paidBy: entryType === "duha" ? "doha" : "mohamed"
  });
  const [toast, setT] = useToast();
  const [del, setD] = useState(null);
  const [view, sv2] = useState(initialView || "today");
  const [period, setPeriod] = useState("month");
  const [periodAnchor, setPeriodAnchor] = useState(() => new Date());
  useEffect(() => { setPeriodAnchor(new Date()); }, [period]); // نرجع للنهاردة كل ما نغير نوع الفترة
  useEffect(() => {
    if (initialView) {
      sv2(initialView);
      if (onConsumeInitialView) onConsumeInitialView();
    }
  }, [initialView]);
  const all = [...dataSource, ...entries.filter(e => e.type === entryType), ...(extraEntries || [])].sort((a, b) => b.date.localeCompare(a.date));
  const month = all.filter(e => finKey(e.date) === mk);
  const today = all.filter(e => e.date === DK());
  const saved = monthly[mk] || MONTHLY_PRESET[mk] || {};
  const budget = +(saved[budgetKey] || defaultBudget) + (budgetExtra || 0);
  const ownPayer = entryType === "duha" ? "doha" : "mohamed";
  // كل إجماليات المبالغ (الهيدر، التصنيفات، التحليل) بتتحسب بس من اللي اتدفع فعلاً من مرتب صاحب التاب ده —
  // أي حاجة متسجلة "من مرتب التاني" أو "من التحويش" بتفضل ظاهرة في قايمة المصاريف (بعلامتها) لكن مش بتدخل في أي إجمالي هنا
  const monthOwn = month.filter(e => !e.paidBy || e.paidBy === ownPayer);
  const mTotOwn = SUM(monthOwn);
  const mTot = mTotOwn,
    tTot = SUM(today),
    rem = budget - mTotOwn;
  const bycat = useMemo(() => categories.map(c => ({
    ...c,
    total: SUM(monthOwn.filter(e => e.cat === c.id))
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total), [monthOwn, categories]);
  // ── فترة العرض في تاب "الشهر" (يوم / أسبوع / شهر / سنة) — للتصفح بس، مش بتلمس حسابات الميزانية فوق
  const ymd = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const fmtDMY = d => `${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}/${d.getFullYear()}`;
  const weekBounds = anchor => {
    const diffToSat = (anchor.getDay() + 1) % 7; // آخر يوم سبت (بداية الأسبوع المصري)
    const start = new Date(anchor); start.setHours(0,0,0,0); start.setDate(anchor.getDate() - diffToSat);
    const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23,59,59,999);
    return { start, end };
  };
  const shiftAnchor = dir => {
    setPeriodAnchor(prev => {
      const d = new Date(prev);
      if (period === "day") d.setDate(d.getDate() + dir);
      else if (period === "week") d.setDate(d.getDate() + dir * 7);
      else if (period === "year") d.setFullYear(d.getFullYear() + dir);
      return d;
    });
  };
  const inPeriodRange = dateStr => {
    if (!dateStr) return false;
    if (period === "day") return dateStr === ymd(periodAnchor);
    if (period === "week") {
      const { start, end } = weekBounds(periodAnchor);
      const d = new Date(dateStr + "T12:00:00");
      return d >= start && d <= end;
    }
    if (period === "year") return dateStr.slice(0, 4) === String(periodAnchor.getFullYear());
    return finKey(dateStr) === mk; // month (الافتراضي، زي ما كان قبل كده — قابل للتنقل من الأسهم الموجودة فوق أصلاً)
  };
  const periodEntries = useMemo(() => all.filter(e => inPeriodRange(e.date)), [all, period, mk, periodAnchor]);
  const periodOwn = useMemo(() => periodEntries.filter(e => !e.paidBy || e.paidBy === ownPayer), [periodEntries, ownPayer]);
  const periodTot = SUM(periodOwn);
  const periodBycat = useMemo(() => categories.map(c => ({
    ...c,
    total: SUM(periodOwn.filter(e => e.cat === c.id))
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total), [periodOwn, categories]);
  const [filterDate, setFD] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const allMonthEntries = [...periodEntries];
  const shownEntries = allMonthEntries.filter(e => {
    const dateOk = !filterDate || e.date === filterDate;
    const q = searchQ.trim().toLowerCase();
    const searchOk = !q || (e.note||"").toLowerCase().includes(q) || (e.name||"").toLowerCase().includes(q);
    return dateOk && searchOk;
  });
  const shownTot = SUM(shownEntries);
  const doAdd = () => {
    const a = parseFloat(form.amount);
    const ta = parseFloat(form.tahwishAmt);
    const hasA = a && a > 0;
    const hasTa = ta && ta > 0;
    if (!hasA && !hasTa) {
      setT("ادخل مبلغ");
      return;
    }
    if (hasA) {
      onAdd({
        id: `${idPrefix}${Date.now()}`,
        type: entryType,
        amount: a,
        cat: form.cat,
        note: form.note.trim(),
        date: form.date,
        paidBy: form.paidBy
      });
    }

    sf(f => ({
      ...f,
      amount: "",
      note: "",
      tahwishAmt: "",
      paidBy: entryType === "duha" ? "doha" : "mohamed"
    }));
    setT("✅ اتضاف");
    sv2("month");
  };
  const isNew = id => {
    const sid = String(id);
    if (sid.startsWith(idPrefix)) return true;
    // Allow deleting xl entries after June 21 (may duplicate phone entries)
    if (sid.startsWith("xl")) {
      const entry = [...dataSource].find(e => e.id === sid);
      if (entry && entry.date > "2026-06-21") return true;
    }
    return false;
  };
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Tabs, {
    tabs: entryType === "duha" ? [["today", "النهارده"], ["add", "➕ أضف"], ["split", "⚖️ تقسيم"], ["month", "الشهر"], ["stats", "📊 تحليل"]] : [["today", "النهارده"], ["add", "➕ أضف"], ["month", "الشهر"], ["stats", "📊 تحليل"]],
    cur: view,
    set: sv2
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "13px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: S.card()
  }, noBudget ? /*#__PURE__*/React.createElement("div", {
    style: S.row
  }, /*#__PURE__*/React.createElement("span", {
    style: S.lbl
  }, headerLabel, " — ", MONTHS[+mk.split("-")[1] - 1]), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 15,
      fontWeight: 900,
      color: T.orange
    }
  }, fmt(mTot), " ج")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.row,
      marginBottom: 5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: S.lbl
  }, headerLabel, " — ", MONTHS[+mk.split("-")[1] - 1]), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: mTot > budget ? T.red : T.orange
    }
  }, fmt(mTot), " ج")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement(Bar, {
    v: mTot,
    max: budget
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: rem < 0 ? T.red : T.green,
      whiteSpace: "nowrap"
    }
  }, rem < 0 ? "زيادة " + fmt(-rem) : fmt(rem) + " متبقي", " ج")), /*#__PURE__*/React.createElement("div", {
    style: S.row
  }, /*#__PURE__*/React.createElement("span", {
    style: S.lbl
  }, budgetLabel), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: T.blue
    }
  }, fmt(budget), " ج")))), view === "today" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: S.sub
  }, "النهارده — ", fmt(tTot), " ج (", today.length, ")"), today.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#2a3a55",
      fontSize: 12,
      textAlign: "center",
      padding: "20px 0"
    }
  }, "مفيش مصاريف النهارده"), today.map(e => {
    const c = catFor(e);
    return /*#__PURE__*/React.createElement("div", {
      key: e.id,
      style: {
        display: "flex",
        justifyContent: "space-between",
        padding: "9px 0",
        borderBottom: `1px solid ${T.bdr}`
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 18
      }
    }, c.ic), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 700
      }
    }, e.note || e.name || c.l), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: "#4a6080"
      }
    }, c.l, e.paidBy && e.paidBy !== (entryType === "duha" ? "doha" : "mohamed") ? (e.paidBy === "tahwish" ? " · 💰 من التحويش" : e.paidBy === "doha" ? " · 👩 من مرتب ضحي" : " · 👨 من مرتب محمد") : ""))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8,
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: c.c
      }
    }, fmt(e.amount), " ج"), isNew(e.id) && /*#__PURE__*/React.createElement("button", {
      onClick: () => setD(e.id),
      style: {
        background: "none",
        border: "none",
        cursor: "pointer",
        color: "#4a6080",
        fontSize: 13
      }
    }, "🗑️")));
  })), view === "split" && entryType === "duha" && E(DuhaSplitView, { salary: budget - (budgetExtra || 0), extra: budgetExtra || 0, monthOwn: monthOwn, categories: categories }), view === "add" && /*#__PURE__*/React.createElement("div", {
    style: S.card()
  }, /*#__PURE__*/React.createElement("div", {
    style: S.sub
  }, addTitle), /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    type: "number",
    placeholder: "المبلغ",
    inputMode: "decimal",
    value: form.amount,
    onChange: e => sf(f => ({
      ...f,
      amount: e.target.value
    }))
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3,1fr)",
      gap: 4,
      marginBottom: 9
    }
  }, categories.map(c => /*#__PURE__*/React.createElement("button", {
    key: c.id,
    onClick: () => sf(f => ({
      ...f,
      cat: c.id
    })),
    style: {
      background: form.cat === c.id ? c.c + "33" : T.bg,
      border: `1.5px solid ${form.cat === c.id ? c.c : T.bdr}`,
      borderRadius: 8,
      padding: "7px 2px",
      cursor: "pointer",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 17
    }
  }, c.ic), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 9,
      color: form.cat === c.id ? c.c : "#4a6080",
      fontFamily: "'Cairo',sans-serif",
      fontWeight: 700,
      textAlign: "center"
    }
  }, c.l))), /*#__PURE__*/React.createElement("button", {
    key: "add-cat",
    onClick: () => setAddingCat(true),
    style: {
      background: T.bg,
      border: `1.5px dashed ${T.bdr}`,
      borderRadius: 8,
      padding: "7px 2px",
      cursor: "pointer",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: { fontSize: 17, color: "#4a6080" }
  }, "➕"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 9,
      color: "#4a6080",
      fontFamily: "'Cairo',sans-serif",
      fontWeight: 700,
      textAlign: "center"
    }
  }, "إضافة"))), addingCat && /*#__PURE__*/React.createElement("div", {
    style: { display: "flex", gap: 6, marginBottom: 9 }
  }, /*#__PURE__*/React.createElement("input", {
    style: { ...S.inp, marginBottom: 0, flex: 1 },
    type: "text",
    placeholder: "اسم البند الجديد",
    value: newCatName,
    autoFocus: true,
    onChange: e => setNewCatName(e.target.value),
    onKeyDown: e => { if (e.key === "Enter") addCustomCat(); }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: addCustomCat,
    style: { background: "#8b5cf6", color: "#fff", border: "none", borderRadius: 9, padding: "0 14px", fontFamily: "'Cairo',sans-serif", fontWeight: 700, fontSize: 12, cursor: "pointer" }
  }, "✓"), /*#__PURE__*/React.createElement("button", {
    onClick: () => { setAddingCat(false); setNewCatName(""); },
    style: { background: "none", color: "#4a6080", border: "none", borderRadius: 9, padding: "0 10px", fontFamily: "'Cairo',sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }
  }, "✕")), /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    type: "date",
    value: form.date,
    onChange: e => sf(f => ({
      ...f,
      date: e.target.value
    }))
  }), /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    type: "text",
    placeholder: "ملاحظة (اختياري)",
    value: form.note,
    onChange: e => {
      const v = e.target.value;
      const autoCat = (() => {
        const t = v.toLowerCase();
        if (/بيض|بيضه|بيضتين|ألبان|لبن|جبنه|جبن|زبادي|زبده/.test(t)) return "dairy";
        if (/فراخ|دجاج|لحم|لحمه|لحوم|كباب|كفته|سمك/.test(t)) return "meat";
        if (/عيش|فول|فلافل|طعميه|بليلة|فطار|كيك|بسكويت|شيبسي|بسكويته|باتيه|سندوتش/.test(t)) return "breakfast";
        if (/منظف|صابون|جلاية|ملابس|غسيل|مكنسه|مسحوق/.test(t)) return "cleaning";
        if (/خضار|طماطم|بطاطس|موز|فاكهه|فاكهة|برتقال|تفاح/.test(t)) return "pantry";
        if (/دوا|دواء|علاج|صيدليه|كشف|مستشفي/.test(t)) return "health";
        if (/خروج|كافيه|مطعم|تسالي|لعبه/.test(t)) return "outing";
        if (/مياه|زيت|عدس|أرز|ارز|سكر|ملح|معكرونه|عجينه/.test(t)) return "basics";
        return null;
      })();
      sf(f => ({ ...f, note: v, ...(autoCat ? {cat: autoCat} : {}) }));
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: { fontSize: 11, color: "#4a6080", marginBottom: 6, fontWeight: 700 }
  }, "هتتخصم من مرتب مين؟"), /*#__PURE__*/React.createElement("div", {
    style: { display: "flex", gap: 7, marginBottom: 9 }
  }, (entryType === "duha" ? [
    { v: "doha", l: "👩 مرتب ضحي", clr: "#ec4899" },
    { v: "mohamed", l: "👨 مرتب محمد", clr: "#3b82f6" },
    { v: "tahwish", l: "💰 من التحويش", clr: "#8b5cf6" }
  ] : [
    { v: "mohamed", l: "👨 مرتب محمد", clr: "#3b82f6" },
    { v: "doha", l: "👩 مرتب ضحي", clr: "#ec4899" },
    { v: "tahwish", l: "💰 من التحويش", clr: "#8b5cf6" }
  ]).map(o => /*#__PURE__*/React.createElement("button", {
    key: o.v,
    onClick: () => sf(f => ({ ...f, paidBy: o.v })),
    style: {
      flex: 1,
      background: form.paidBy === o.v ? o.clr + "33" : T.bg,
      border: `1.5px solid ${form.paidBy === o.v ? o.clr : T.bdr}`,
      borderRadius: 9,
      padding: "9px 4px",
      cursor: "pointer",
      color: form.paidBy === o.v ? o.clr : "#4a6080",
      fontFamily: "'Cairo',sans-serif",
      fontSize: 12,
      fontWeight: 700
    }
  }, o.l))), /*#__PURE__*/React.createElement("button", {
    style: S.btn(),
    onClick: doAdd
  }, "إضافة ✓")), view === "month" && /*#__PURE__*/React.createElement(React.Fragment, null,
  // ── Period switch (يوم / أسبوع / شهر / سنة)
  /*#__PURE__*/React.createElement(Tabs, {
    tabs: [["day","يوم"],["week","أسبوع"],["month","شهر"],["year","سنة"]],
    cur: period, set: setPeriod, ac: T.purple
  }),
  // ── التنقل الحر جوه الفترة المختارة (يوم/أسبوع/سنة) — الشهر بيتنقل بالأسهم فوق أصلاً
  period !== "month" && /*#__PURE__*/React.createElement("div", {style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,margin:"8px 0"}},
    /*#__PURE__*/React.createElement("button", {
      onClick: () => shiftAnchor(-1),
      style: {background:T.card, border:`1px solid ${T.bdr}`, color:"#e2e8f0", borderRadius:10, width:36, height:36, fontSize:18}
    }, "‹"),
    period === "day" ? /*#__PURE__*/React.createElement("input", {
      type: "date",
      value: ymd(periodAnchor),
      onChange: e => { if (e.target.value) setPeriodAnchor(new Date(e.target.value + "T12:00:00")); },
      style: {background:T.card, border:`1px solid ${T.bdr}`, color:"#e2e8f0", borderRadius:10, padding:"7px 10px", fontSize:13, fontFamily:"inherit", flex:1, textAlign:"center"}
    }) : period === "week" ? (() => {
      const { start, end } = weekBounds(periodAnchor);
      return /*#__PURE__*/React.createElement("div", {style:{flex:1,textAlign:"center",fontSize:13,fontWeight:700}}, fmtDMY(start), " ← ", fmtDMY(end));
    })() : /*#__PURE__*/React.createElement("select", {
      value: periodAnchor.getFullYear(),
      onChange: e => setPeriodAnchor(d => { const nd = new Date(d); nd.setFullYear(+e.target.value); return nd; }),
      style: {background:T.card, border:`1px solid ${T.bdr}`, color:"#e2e8f0", borderRadius:10, padding:"7px 10px", fontSize:14, fontWeight:700, fontFamily:"inherit", flex:1, textAlign:"center"}
    }, Array.from({length:8}, (_, i) => new Date().getFullYear() - 5 + i).map(y => /*#__PURE__*/React.createElement("option", {key:y, value:y}, y))),
    /*#__PURE__*/React.createElement("button", {
      onClick: () => shiftAnchor(1),
      style: {background:T.card, border:`1px solid ${T.bdr}`, color:"#e2e8f0", borderRadius:10, width:36, height:36, fontSize:18}
    }, "›")
  ),
  /*#__PURE__*/React.createElement("div", {style:{...S.card(), textAlign:"center", margin:"10px 0"}},
    /*#__PURE__*/React.createElement("div", {style:{fontSize:10,color:"#4a6080",marginBottom:3}},
      period==="day" ? (ymd(periodAnchor)===DK() ? "مصاريف النهارده" : "مصاريف يوم "+fmtDMY(periodAnchor))
      : period==="week" ? "مصاريف الأسبوع ده"
      : period==="year" ? "مصاريف سنة "+periodAnchor.getFullYear()
      : "مصاريف الشهر ده"
    ),
    /*#__PURE__*/React.createElement("div", {style:{fontSize:22,fontWeight:900,color:T.purple}}, fmt(periodTot), " ج"),
    /*#__PURE__*/React.createElement("div", {style:{fontSize:10,color:"#4a6080",marginTop:2}}, periodOwn.length, " عملية")
  ),
  // ── Category bars summary
  /*#__PURE__*/React.createElement("div", {style:S.sub}, "حسب التصنيف"),
  periodBycat.map(c => /*#__PURE__*/React.createElement("div", {key:c.id, style:{marginBottom:9}},
    /*#__PURE__*/React.createElement("div", {style:{display:"flex",justifyContent:"space-between",marginBottom:3}},
      /*#__PURE__*/React.createElement("span", {style:{fontSize:12}}, c.ic, " ", c.l),
      /*#__PURE__*/React.createElement("div", {style:{display:"flex",gap:5,alignItems:"center"}},
        /*#__PURE__*/React.createElement(Bar, {v:c.total, max:periodTot, c:c.c, h:5}),
        /*#__PURE__*/React.createElement("span", {style:{fontSize:11,fontWeight:700,color:c.c,whiteSpace:"nowrap"}}, fmt(c.total), " ج")
      )
    )
  )),
  /*#__PURE__*/React.createElement("div", {style:S.div}),
  // ── Search + date filter bar
  /*#__PURE__*/React.createElement("div", {style:{display:"flex",alignItems:"center",gap:5,marginBottom:8}},
    /*#__PURE__*/React.createElement("span", {style:{fontSize:12,fontWeight:700,color:"#4a6080",whiteSpace:"nowrap"}},
      filterDate || searchQ ? fmt(shownTot)+" ج ("+shownEntries.length+")" : "كل المصاريف ("+periodEntries.length+")"
    ),
    /*#__PURE__*/React.createElement("input", {
      type:"text", placeholder:"🔍 ابحث...", value:searchQ,
      onChange: e => setSearchQ(e.target.value),
      style:{flex:1,background:T.card,border:`1px solid ${searchQ?"#60a5fa":T.bdr}`,borderRadius:7,color:searchQ?"#60a5fa":"#e2e8f0",fontSize:11,padding:"4px 7px",fontFamily:"'Cairo',sans-serif",outline:"none",direction:"rtl"}
    }),
    /*#__PURE__*/React.createElement("input", {
      type:"date", value:filterDate, onChange:e=>setFD(e.target.value),
      style:{background:T.card,border:`1px solid ${filterDate?T.blue:T.bdr}`,borderRadius:6,color:filterDate?T.blue:"#4a6080",fontSize:10,padding:"3px 5px",fontFamily:"'Cairo',sans-serif"}
    }),
    (filterDate||searchQ) && /*#__PURE__*/React.createElement("button", {
      onClick:()=>{setFD("");setSearchQ("");},
      style:{background:"none",border:"none",cursor:"pointer",color:"#4a6080",fontSize:13,padding:0}
    }, "✕")
  ),
  // ── Entries list (same style as today tab)
  shownEntries.map(e => {
    const c = catFor(e);
    return /*#__PURE__*/React.createElement("div", {
      key:e.id,
      style:{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:`1px solid ${T.bdr}`}
    },
      /*#__PURE__*/React.createElement("div", {style:{display:"flex",gap:8}},
        /*#__PURE__*/React.createElement("span", {style:{fontSize:18}}, c.ic),
        /*#__PURE__*/React.createElement("div", null,
          /*#__PURE__*/React.createElement("div", {style:{fontSize:12,fontWeight:700}}, e.note||e.name||c.l),
          /*#__PURE__*/React.createElement("div", {style:{fontSize:10,color:"#4a6080"}}, c.l, e.paidBy && e.paidBy !== (entryType === "duha" ? "doha" : "mohamed") ? (e.paidBy === "tahwish" ? " · 💰 من التحويش" : e.paidBy === "doha" ? " · 👩 من مرتب ضحي" : " · 👨 من مرتب محمد") : "")
        )
      ),
      /*#__PURE__*/React.createElement("div", {style:{display:"flex",gap:8,alignItems:"center"}},
        /*#__PURE__*/React.createElement("div", {style:{textAlign:"left"}},
          /*#__PURE__*/React.createElement("div", {style:{fontSize:12,fontWeight:700,color:c.c}}, fmt(e.amount), " ج"),
          /*#__PURE__*/React.createElement("div", {style:{fontSize:9,color:"#4a6080"}}, e.date)
        ),
        isNew(e.id) && /*#__PURE__*/React.createElement("button", {
          onClick:()=>setD(e.id),
          style:{background:"none",border:"none",cursor:"pointer",color:"#4a6080",fontSize:13}
        }, "🗑️")
      )
    );
  })), view === "stats" && /*#__PURE__*/React.createElement(React.Fragment, null,
  /*#__PURE__*/React.createElement("div", {style:S.sub}, "📊 تحليل الأصناف — ", MONTHS[+mk.split("-")[1]-1]),
  // ── Category breakdown for this month
  (() => {
    const catStats = categories.map(c => {
      const items = monthOwn.filter(e => e.cat === c.id);
      return { ...c, total: SUM(items), count: items.length, items };
    }).filter(c => c.total > 0).sort((a,b) => b.total - a.total);
    if (catStats.length === 0) return /*#__PURE__*/React.createElement("div", {style:{color:"#4a6080",textAlign:"center",padding:20}}, "مفيش مصاريف الشهر ده");
    const maxT = catStats[0].total;
    return /*#__PURE__*/React.createElement(React.Fragment, null,
      // Summary header
      /*#__PURE__*/React.createElement("div", {style:{display:"flex",justifyContent:"space-between",background:"#0f1a2a",borderRadius:10,padding:"10px 14px",marginBottom:10,border:"1px solid #1a2840"}},
        /*#__PURE__*/React.createElement("div", null,
          /*#__PURE__*/React.createElement("div", {style:{fontSize:10,color:"#4a6080"}}, "إجمالي الشهر"),
          /*#__PURE__*/React.createElement("div", {style:{fontSize:18,fontWeight:900,color:"#60a5fa"}}, fmt(mTot), " ج")
        ),
        /*#__PURE__*/React.createElement("div", {style:{textAlign:"left"}},
          /*#__PURE__*/React.createElement("div", {style:{fontSize:10,color:"#4a6080"}}, "عدد العمليات"),
          /*#__PURE__*/React.createElement("div", {style:{fontSize:18,fontWeight:900,color:"#a78bfa"}}, month.length)
        )
      ),
      // Category cards
      catStats.map(c =>
        /*#__PURE__*/React.createElement("div", {key:c.id, style:{background:"#0f1a2a",borderRadius:10,padding:"11px 13px",marginBottom:7,border:`1px solid ${c.c}33`}},
          /*#__PURE__*/React.createElement("div", {style:{display:"flex",justifyContent:"space-between",marginBottom:6}},
            /*#__PURE__*/React.createElement("div", {style:{display:"flex",alignItems:"center",gap:6}},
              /*#__PURE__*/React.createElement("span", {style:{fontSize:18}}, c.ic),
              /*#__PURE__*/React.createElement("span", {style:{fontSize:13,fontWeight:700,color:"#e2e8f0"}}, c.l)
            ),
            /*#__PURE__*/React.createElement("div", {style:{textAlign:"left"}},
              /*#__PURE__*/React.createElement("div", {style:{fontSize:14,fontWeight:900,color:c.c}}, fmt(c.total), " ج"),
              /*#__PURE__*/React.createElement("div", {style:{fontSize:9,color:"#4a6080"}}, c.count, " عملية — متوسط ", fmt(Math.round(c.total/c.count)), " ج")
            )
          ),
          // Progress bar
          /*#__PURE__*/React.createElement("div", {style:{height:5,background:"#1a2840",borderRadius:99,marginBottom:6}},
            /*#__PURE__*/React.createElement("div", {style:{height:5,borderRadius:99,background:c.c,width:Math.round(c.total/maxT*100)+"%",transition:"width 0.3s"}})
          ),
          // Individual entries for this category this month
          /*#__PURE__*/React.createElement("div", {style:{marginTop:4}},
            c.items.sort((a,b)=>b.date.localeCompare(a.date)).slice(0, expandedCat===c.id ? c.items.length : 5).map((e,i) =>
              /*#__PURE__*/React.createElement("div", {key:e.id, style:{display:"flex",justifyContent:"space-between",padding:"3px 0",borderTop:i===0?"none":`1px solid #1a2840`}},
                /*#__PURE__*/React.createElement("span", {style:{fontSize:10,color:"#94a3b8"}}, e.note||e.name||c.l, " ", /*#__PURE__*/React.createElement("span",{style:{color:"#2a3a55"}}, e.date.slice(5))),
                /*#__PURE__*/React.createElement("span", {style:{fontSize:10,fontWeight:700,color:c.c}}, fmt(e.amount), " ج")
              )
            ),
            c.items.length > 5 && /*#__PURE__*/React.createElement("div", {
              onClick: () => setExpandedCat(expandedCat===c.id ? null : c.id),
              style:{fontSize:9,color:"#60a5fa",textAlign:"center",paddingTop:4,cursor:"pointer",fontWeight:700}
            }, expandedCat===c.id ? "▲ عرض أقل" : `+ ${c.items.length-5} عملية أخرى`)
          )
        )
      ),
      // ── تحليل حسب الصنف: كل صنف اتكرر، اتشرى كام مرة وبكام
      (() => {
        const byName = {};
        month.forEach(e => {
          const key = (e.note || e.name || "").trim();
          if (!key) return;
          if (!byName[key]) byName[key] = { name: key, count: 0, total: 0 };
          byName[key].count++;
          byName[key].total += e.amount;
        });
        const items = Object.values(byName).filter(x => x.count > 1).sort((a,b) => b.total - a.total);
        if (!items.length) return null;
        return /*#__PURE__*/React.createElement(React.Fragment, null,
          /*#__PURE__*/React.createElement("div", {style:{...S.sub, marginTop:14}}, "🔍 اشتريت إيه أكتر من مرة"),
          /*#__PURE__*/React.createElement("div", {style:{background:"#0f1a2a",borderRadius:10,padding:"11px 13px",border:"1px solid #1a2840"}},
            items.map((it, i) =>
              /*#__PURE__*/React.createElement("div", {key:it.name, style:{display:"flex",justifyContent:"space-between",padding:"6px 0",borderTop:i===0?"none":"1px solid #1a2840"}},
                /*#__PURE__*/React.createElement("span", {style:{fontSize:12,color:"#e2e8f0"}}, it.name, " ", /*#__PURE__*/React.createElement("span",{style:{fontSize:10,color:"#60a5fa",fontWeight:700}}, "× ", it.count)),
                /*#__PURE__*/React.createElement("span", {style:{fontSize:12,fontWeight:700,color:"#a78bfa"}}, fmt(it.total), " ج")
              )
            )
          )
        );
      })()
      ,
      // ── إجمالي مجمّع للأكل والشرب (كل فئات الأكل مع بعض في رقم واحد)
      (() => {
        const foodTotal = SUM(monthOwn.filter(e => FOOD_CAT_IDS.includes(e.cat)));
        if (!foodTotal) return null;
        const foodPct = mTot ? Math.round(foodTotal / mTot * 100) : 0;
        return /*#__PURE__*/React.createElement(React.Fragment, null,
          /*#__PURE__*/React.createElement("div", {style:{...S.sub, marginTop:14}}, "🍽️ إجمالي الأكل والشرب"),
          /*#__PURE__*/React.createElement("div", {style:{background:"#0f1a2a",borderRadius:10,padding:"11px 13px",border:"1px solid #1a2840",marginBottom:4}},
            /*#__PURE__*/React.createElement("div", {style:{display:"flex",justifyContent:"space-between",marginBottom:6}},
              /*#__PURE__*/React.createElement("span", {style:{fontSize:13,fontWeight:700}}, "من كل مصاريف الشهر"),
              /*#__PURE__*/React.createElement("span", {style:{fontSize:15,fontWeight:900,color:T.orange}}, fmt(foodTotal), " ج (", foodPct, "%)")
            ),
            /*#__PURE__*/React.createElement(Bar, {v:foodTotal, max:mTot, c:T.orange})
          )
        );
      })(),
      // ── تحليل بالذكاء الاصطناعي + اسأل عن مصاريفك
      /*#__PURE__*/React.createElement(AIAnalysisSection, {
        storageKey: idPrefix + "_ai_" + mk,
        periodLabel: "شهر " + MONTHS[+mk.split("-")[1]-1],
        contextText: (() => {
          const lines = catStats.map(c => `${c.l}: ${c.total} ج (${c.count} عملية)`);
          const topItems = (() => {
            const byName = {};
            month.forEach(e => {
              const key = (e.note || e.name || "").trim();
              if (!key) return;
              if (!byName[key]) byName[key] = { name: key, count: 0, total: 0 };
              byName[key].count++;
              byName[key].total += e.amount;
            });
            return Object.values(byName).sort((a,b)=>b.total-a.total).slice(0,10)
              .map(x => `${x.name}: ${x.total} ج (${x.count} مرة)`);
          })();
          return `إجمالي مصاريف الشهر: ${mTot} ج، عدد العمليات: ${month.length}\nحسب الفئة:\n${lines.join("\n")}\nأكتر حاجات اتكررت:\n${topItems.join("\n")}`;
        })()
      })
    );
  })()
), del && /*#__PURE__*/React.createElement(Confirm, {
    msg: "تحذف المصروف ده؟",
    onOk: () => {
      onDel(del);
      setD(null);
      setT("🗑️ اتحذف");
    },
    onNo: () => setD(null)
  }), /*#__PURE__*/React.createElement(Toast, {
    msg: toast
  })));
}

// ══════════════════════════════════════════════════════════════
// CAR SCREEN
// ══════════════════════════════════════════════════════════════
function CarScreen({
  entries,
  onAdd,
  onDel,
  onUpdate,
  mk,
  indExtra,
  onAddInd,
  onDelInd
}) {
  const [form, sf] = useState({
    amount: "",
    cat: "oil",
    note: "",
    date: DK(),
    paidBy: "mohamed",
    dueKm: ""
  });
  const [toast, setT] = useToast();
  const [del, setD] = useState(null);
  const [view, sv2] = useState("list");
  const [flt, setF] = useState("all");
  const [scope, setScope] = useState("month");
  const CAR_NEEDS_DEFAULT = [
    {name:"دراع نور",done:true},
    {name:"قربة مساحات ورشاش",done:false},
    {name:"بوابه كامله بالحساسات",done:true},
    {name:"شكمان كامل بالككه",done:false},
    {name:"طرمبة باور",done:false},
    {name:"عزل العربيه",done:false},
    {name:"عمل فيلم حماية للزجاج",done:false},
    {name:"تظبيط صالون العربيه",done:false},
    {name:"ال 3 قواعد الماتور",done:true},
    {name:"تعديل الاكصدام الخلفي ورشه",done:false},
    {name:"شراء شاحن للعربيه",done:false},
    {name:"بلف تبخير",done:false},
    {name:"توريبدو",done:false},
    {name:"كرتيره عجل",done:false},
    {name:"بادة طابلوه",done:false},
    {name:"فرش الشنطه",done:false},
    {name:"طقم طنابير مع تغير التيل",done:false},
    {name:"جنط حديد وترصيص العربيه كلها",done:true},
    {name:"دراع مساحات",done:false},
    {name:"زرار كهرباء مرايات",done:false},
    {name:"زرار انتظار وهوايات تكييف",done:false},
    {name:"سماعات للعربيه",done:false},
    {name:"وحدة رفع زجاج",done:false},
  ];
  const [carNeeds,setCarNeeds] = useState(()=>ld("car_needs_v2", CAR_NEEDS_DEFAULT));
  const [newNeed,setNewNeed] = useState("");
  useEffect(()=>sv("car_needs_v2",carNeeds),[carNeeds]);
  const all = useMemo(() => {
    const overrideIds = new Set(entries.filter(e => e.type === "car").map(e => e.id));
    return [...CAR_DATA.filter(e => !overrideIds.has(e.id)), ...entries.filter(e => e.type === "car")].sort((a, b) => b.date.localeCompare(a.date));
  }, [entries]);
  const [odoLog, setOdoLog] = useState(() => loadOdoLog());
  useEffect(() => sv("car_odo_log_v1", odoLog), [odoLog]);
  const [odoInput, setOdoInput] = useState("");
  const [editDue, setEditDue] = useState(null); // id of entry being edited for due-km
  const [editDueVal, setEditDueVal] = useState("");
  const [notifPermission, setNotifPermission] = useState(() => (typeof Notification !== "undefined" ? Notification.permission : "unsupported"));
  const curOdo = currentKnownOdo(odoLog);
  const dueList = useMemo(() => all.filter(e => e.dueKm && +e.dueKm > 0).map(e => ({
    id: e.id,
    label: e.note || e.name || "صيانة",
    ic: catF(CC, e.cat).ic,
    dueKm: +e.dueKm,
    left: curOdo ? +e.dueKm - curOdo : null
  })).sort((a, b) => (a.left ?? 1e9) - (b.left ?? 1e9)), [all, curOdo]);
  const thisMk = finKey(DK());
  const needsOdoLog = !odoLog[thisMk];
  const saveOdo = () => {
    const v = parseFloat(odoInput);
    if (!v) return;
    setOdoLog(p => ({ ...p, [thisMk]: v }));
    setOdoInput("");
  };
  const saveDue = id => {
    const v = parseFloat(editDueVal);
    onUpdate(id, { dueKm: v || null });
    setEditDue(null);
    setEditDueVal("");
  };
  const mCar = all.filter(e => finKey(e.date) === mk);
  const mShown = flt === "all" ? mCar : mCar.filter(e => e.cat === flt);
  const shown = flt === "all" ? all : all.filter(e => e.cat === flt);
  const tAll = SUM(all), tMon = SUM(mCar);
  const byY = {};
  all.forEach(e => { const y = e.date.slice(0, 4); byY[y] = (byY[y]||0) + e.amount; });
  const byMon = {};
  all.forEach(e => { const m2=finKey(e.date); if(!byMon[m2]){byMon[m2]={total:0,cnt:0};} byMon[m2].total+=e.amount; byMon[m2].cnt++; });
  const MN = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
  const doAdd = () => {
    const a = parseFloat(form.amount);
    if (!a || a <= 0) {
      setT("ادخل مبلغ");
      return;
    }
    onAdd({
      id: `cn${Date.now()}`,
      type: "car",
      amount: a,
      cat: form.cat,
      note: form.note.trim(),
      date: form.date,
      paidBy: form.paidBy,
      dueKm: parseFloat(form.dueKm) || null
    });
    sf(f => ({
      ...f,
      amount: "",
      note: "",
      paidBy: "mohamed",
      dueKm: ""
    }));
    setT("✅ اتضاف");
    sv2("list");
  };
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Tabs, {
    tabs: [["list", "السجل"], ["add", "➕"], ["needs", "احتياجات"], ["indrive", "🛺 إندرايف"], ["stats", "تقرير"]],
    cur: view,
    set: sv2,
    ac: "#8b5cf6"
  }), view === "indrive" && /*#__PURE__*/React.createElement(IndriveScreen, {
    indExtra: indExtra,
    onAddInd: onAddInd,
    onDelInd: onDelInd,
    mk: mk
  }), view !== "indrive" && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "13px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 7,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.card("#8b5cf622"),
      flex: 1,
      textAlign: "center",
      border: "1px solid #8b5cf644"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "#8b5cf6",
      marginBottom: 1
    }
  }, "هذا الشهر"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 17,
      fontWeight: 900,
      color: "#a78bfa"
    }
  }, fmt(tMon), " ج")), /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.card(),
      flex: 1,
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "#4a6080",
      marginBottom: 1
    }
  }, "كل الفترة (سبتمبر 2025→)"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 17,
      fontWeight: 900,
      color: "#64748b"
    }
  }, fmt(tAll), " ج"))), view === "list" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      background: needsOdoLog ? "#f59e0b22" : "#0f1a2a",
      border: `1.5px solid ${needsOdoLog ? "#f59e0b88" : "#1a2840"}`,
      borderRadius: 13,
      padding: "11px 13px",
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: { fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 5 }
  }, needsOdoLog ? "🔔 دخلنا شهر جديد! سجّل عداد العربية" : "📟 عداد العربية"), /*#__PURE__*/React.createElement("div", {
    style: { fontSize: 10, color: "#4a6080", marginBottom: 8 }
  }, curOdo > 0 ? `آخر قراءة معروفة: ${fmt(curOdo)} كم` : "لسه معندناش أي قراءة"), /*#__PURE__*/React.createElement("div", {
    style: { display: "flex", gap: 7 }
  }, /*#__PURE__*/React.createElement("input", {
    type: "number",
    inputMode: "numeric",
    placeholder: needsOdoLog ? "اكتب عداد الشهر ده..." : "تحديث العداد",
    value: odoInput,
    onChange: e => setOdoInput(e.target.value),
    style: { ...S.inp, marginBottom: 0, flex: 1 }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: saveOdo,
    style: { background: "#8b5cf6", color: "#fff", border: "none", borderRadius: 9, padding: "0 16px", fontFamily: "'Cairo',sans-serif", fontWeight: 700, fontSize: 12, cursor: "pointer" }
  }, "حفظ")), notifPermission !== "granted" && /*#__PURE__*/React.createElement("button", {
    onClick: () => Notification.requestPermission().then(setNotifPermission),
    style: { background: "none", border: "none", color: "#60a5fa", fontSize: 10, fontWeight: 700, cursor: "pointer", marginTop: 8, fontFamily: "'Cairo',sans-serif", padding: 0 }
  }, "🔔 فعّل تنبيهات المتصفح عشان تيجيلك رسالة")), /*#__PURE__*/React.createElement("div", {
    style: { fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 8 }
  }, "🔔 المواعيد الجاية"), dueList.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: { fontSize: 11, color: "#4a6080", marginBottom: 10, background: "#0f1a2a", border: "1px solid #1a2840", borderRadius: 13, padding: "12px 13px" }
  }, "مفيش أي بند محدد له ميعاد جاي. لما تضيف صيانة، املا خانة \"🎯 الميعاد الجاي عند (كم)\" وهيتحط عليه تنبيه هنا أوتوماتيك.") : /*#__PURE__*/React.createElement("div", {
    style: { background: "#0f1a2a", border: "1px solid #1a2840", borderRadius: 13, padding: "11px 13px", marginBottom: 10 }
  }, dueList.map((it, i) => {
    const color = it.left === null ? "#4a6080" : it.left <= 0 ? "#ef4444" : it.left <= 1000 ? "#f59e0b" : "#10b981";
    const isEditing = editDue === it.id;
    return /*#__PURE__*/React.createElement("div", {
      key: it.id,
      style: { paddingBottom: 10, marginBottom: 10, borderBottom: i < dueList.length - 1 ? "1px solid #1a2840" : "none" }
    }, /*#__PURE__*/React.createElement("div", {
      style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }
    }, /*#__PURE__*/React.createElement("span", { style: { fontSize: 12, fontWeight: 700, flex: 1 } }, it.ic, " ", it.label), it.left !== null && /*#__PURE__*/React.createElement("span", {
      style: { fontSize: 11, fontWeight: 700, color, whiteSpace: "nowrap" }
    }, it.left <= 0 ? `⚠️ متأخر ${fmt(Math.abs(it.left))} كم` : `باقي ${fmt(it.left)} كم`), /*#__PURE__*/React.createElement("button", {
      onClick: () => { setEditDue(isEditing ? null : it.id); setEditDueVal(isEditing ? "" : String(it.dueKm)); },
      style: { background: "none", border: "none", cursor: "pointer", color: "#4a6080", fontSize: 13, padding: "0 2px" }
    }, "✏️")), isEditing && /*#__PURE__*/React.createElement("div", {
      style: { display: "flex", gap: 6, marginTop: 6 }
    }, /*#__PURE__*/React.createElement("input", {
      type: "number",
      inputMode: "numeric",
      value: editDueVal,
      onChange: e => setEditDueVal(e.target.value),
      style: { ...S.inp, marginBottom: 0, flex: 1, fontSize: 12 }
    }), /*#__PURE__*/React.createElement("button", {
      onClick: () => saveDue(it.id),
      style: { background: "#8b5cf6", color: "#fff", border: "none", borderRadius: 8, padding: "0 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Cairo',sans-serif" }
    }, "حفظ")), it.left !== null && !isEditing && /*#__PURE__*/React.createElement(Bar, {
      v: curOdo ? Math.max(0, curOdo - (it.dueKm - 7000)) : 0,
      max: 7000,
      c: color,
      h: 5
    }));
  })), scope === "all" && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      background: "#8b5cf622",
      border: "1px solid #8b5cf644",
      borderRadius: 10,
      padding: "7px 11px",
      marginBottom: 9
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: { fontSize: 11, color: "#a78bfa", fontWeight: 700 }
  }, "🕐 عرض كل الفترة"), /*#__PURE__*/React.createElement("button", {
    onClick: () => { setScope("month"); setF("all"); },
    style: {
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "#a78bfa",
      fontSize: 11,
      fontWeight: 700,
      textDecoration: "underline"
    }
  }, "رجوع لهذا الشهر")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 3,
      marginBottom: 9,
      overflowX: "auto",
      paddingBottom: 2
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => { setF("all"); setScope("month"); },
    style: {
      borderRadius: 99,
      border: "none",
      padding: "4px 9px",
      fontFamily: "'Cairo',sans-serif",
      fontSize: 10,
      fontWeight: 700,
      cursor: "pointer",
      background: flt === "all" && scope === "month" ? "#8b5cf6" : T.card,
      color: flt === "all" && scope === "month" ? "#fff" : "#4a6080",
      whiteSpace: "nowrap"
    }
  }, "هذا الشهر (", mCar.length, ")"), /*#__PURE__*/React.createElement("button", {
    onClick: () => { setF("all"); setScope("all"); },
    style: {
      borderRadius: 99,
      border: "none",
      padding: "4px 9px",
      fontFamily: "'Cairo',sans-serif",
      fontSize: 10,
      fontWeight: 700,
      cursor: "pointer",
      background: flt === "all" && scope === "all" ? "#8b5cf6" : T.card,
      color: flt === "all" && scope === "all" ? "#fff" : "#4a6080",
      whiteSpace: "nowrap"
    }
  }, "كل الفترة (", all.length, ")"), CC.map(c => {
    const n = (scope === "all" ? all : mCar).filter(e => e.cat === c.id).length;
    if (!n) return null;
    return /*#__PURE__*/React.createElement("button", {
      key: c.id,
      onClick: () => setF(c.id),
      style: {
        borderRadius: 99,
        border: "none",
        padding: "4px 9px",
        fontFamily: "'Cairo',sans-serif",
        fontSize: 10,
        fontWeight: 700,
        cursor: "pointer",
        background: flt === c.id ? c.c : T.card,
        color: flt === c.id ? "#fff" : "#4a6080",
        whiteSpace: "nowrap"
      }
    }, c.ic, " ", c.l, " (", n, ")");
  })), (scope === "all" ? shown : mShown).length===0&&/*#__PURE__*/React.createElement("div",{style:{color:"#2a3a55",fontSize:12,textAlign:"center",padding:"20px 0"}}, scope === "all" ? "مفيش عمليات في التصنيف ده" : "مفيش صيانة هذا الشهر"), (scope === "all" ? shown : mShown).map(e => {
    const c = catF(CC, e.cat);
    const isEditingRow = editDue === e.id;
    const rowDiv = /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        padding: "9px 0",
        borderBottom: isEditingRow ? "none" : `1px solid ${T.bdr}`
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: { display: "flex", gap: 8 }
    }, /*#__PURE__*/React.createElement("span", {
      style: { fontSize: 18 }
    }, c.ic), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: { fontSize: 12, fontWeight: 700 }
    }, e.name || e.note), /*#__PURE__*/React.createElement("div", {
      style: { fontSize: 10, color: "#4a6080" }
    }, e.date, e.km ? ` · ${e.km} كم` : "", e.note ? ` · ${e.note}` : "", e.paidBy === "doha" ? " · 👩 مرتب ضحي" : e.paidBy === "tahwish" ? " · 💰 من التحويش" : "", e.dueKm ? ` · 🎯 الميعاد الجاي ${fmt(e.dueKm)} كم` : ""))), /*#__PURE__*/React.createElement("div", {
      style: { display: "flex", gap: 7, alignItems: "center" }
    }, /*#__PURE__*/React.createElement("span", {
      style: { fontSize: 12, fontWeight: 700, color: c.c }
    }, fmt(e.amount), " ج"), /*#__PURE__*/React.createElement("button", {
      onClick: () => { setEditDue(isEditingRow ? null : e.id); setEditDueVal(isEditingRow ? "" : String(e.dueKm || "")); },
      style: { background: "none", border: "none", cursor: "pointer", color: e.dueKm ? "#a78bfa" : "#4a6080", fontSize: 12 }
    }, "🎯"), String(e.id).startsWith("cn") && /*#__PURE__*/React.createElement("button", {
      onClick: () => setD(e.id),
      style: { background: "none", border: "none", cursor: "pointer", color: "#4a6080", fontSize: 12 }
    }, "🗑️")));
    const editDiv = isEditingRow ? /*#__PURE__*/React.createElement("div", {
      style: { display: "flex", gap: 6, padding: "0 0 9px 0", borderBottom: `1px solid ${T.bdr}` }
    }, /*#__PURE__*/React.createElement("input", {
      type: "number",
      inputMode: "numeric",
      placeholder: "الميعاد الجاي عند (كم)",
      value: editDueVal,
      onChange: ev => setEditDueVal(ev.target.value),
      style: { ...S.inp, marginBottom: 0, flex: 1, fontSize: 12 }
    }), /*#__PURE__*/React.createElement("button", {
      onClick: () => saveDue(e.id),
      style: { background: "#8b5cf6", color: "#fff", border: "none", borderRadius: 8, padding: "0 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Cairo',sans-serif" }
    }, "حفظ")) : null;
    return /*#__PURE__*/React.createElement(React.Fragment, { key: e.id }, rowDiv, editDiv);
  })), view === "add" && /*#__PURE__*/React.createElement("div", {
    style: S.card()
  }, /*#__PURE__*/React.createElement("div", {
    style: S.sub
  }, "إضافة صيانة"), /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    type: "number",
    placeholder: "المبلغ",
    inputMode: "decimal",
    value: form.amount,
    onChange: e => sf(f => ({
      ...f,
      amount: e.target.value
    }))
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3,1fr)",
      gap: 4,
      marginBottom: 9
    }
  }, CC.map(c => /*#__PURE__*/React.createElement("button", {
    key: c.id,
    onClick: () => sf(f => ({
      ...f,
      cat: c.id
    })),
    style: {
      background: form.cat === c.id ? c.c + "33" : T.bg,
      border: `1.5px solid ${form.cat === c.id ? c.c : T.bdr}`,
      borderRadius: 8,
      padding: "7px 2px",
      cursor: "pointer",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 17
    }
  }, c.ic), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 9,
      color: form.cat === c.id ? c.c : "#4a6080",
      fontFamily: "'Cairo',sans-serif",
      fontWeight: 700
    }
  }, c.l)))), /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    type: "date",
    value: form.date,
    onChange: e => sf(f => ({
      ...f,
      date: e.target.value
    }))
  }), /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    type: "text",
    placeholder: "التفاصيل مثلاً: تغير زيت ليكومولي 10 الالف",
    value: form.note,
    onChange: e => {
      const v = e.target.value;
      const autoCat = (() => {
        const t = v.toLowerCase();
        if (/بيض|بيضه|بيضتين|ألبان|لبن|جبنه|جبن|زبادي|زبده/.test(t)) return "dairy";
        if (/فراخ|دجاج|لحم|لحمه|لحوم|كباب|كفته|سمك/.test(t)) return "meat";
        if (/عيش|فول|فلافل|طعميه|بليلة|فطار|كيك|بسكويت|شيبسي|بسكويته|باتيه|سندوتش/.test(t)) return "breakfast";
        if (/منظف|صابون|جلاية|ملابس|غسيل|مكنسه|مسحوق/.test(t)) return "cleaning";
        if (/خضار|طماطم|بطاطس|موز|فاكهه|فاكهة|برتقال|تفاح/.test(t)) return "pantry";
        if (/دوا|دواء|علاج|صيدليه|كشف|مستشفي/.test(t)) return "health";
        if (/خروج|كافيه|مطعم|تسالي|لعبه/.test(t)) return "outing";
        if (/مياه|زيت|عدس|أرز|ارز|سكر|ملح|معكرونه|عجينه/.test(t)) return "basics";
        return null;
      })();
      sf(f => ({ ...f, note: v, ...(autoCat ? {cat: autoCat} : {}) }));
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: { fontSize: 11, color: "#4a6080", marginBottom: 6, fontWeight: 700 }
  }, "🎯 الميعاد الجاي عند (كم) — اختياري"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    inputMode: "numeric",
    placeholder: "مثلاً 233130 — هيتحط عليه تنبيه لوحده",
    value: form.dueKm,
    onChange: e => sf(f => ({ ...f, dueKm: e.target.value })),
    style: S.inp
  }), /*#__PURE__*/React.createElement("div", {
    style: { fontSize: 11, color: "#4a6080", marginBottom: 6, fontWeight: 700 }
  }, "هتتخصم من مرتب مين؟"), /*#__PURE__*/React.createElement("div", {
    style: { display: "flex", gap: 7, marginBottom: 9 }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => sf(f => ({ ...f, paidBy: "mohamed" })),
    style: {
      flex: 1,
      background: form.paidBy === "mohamed" ? "#3b82f633" : T.bg,
      border: `1.5px solid ${form.paidBy === "mohamed" ? "#3b82f6" : T.bdr}`,
      borderRadius: 9,
      padding: "9px 4px",
      cursor: "pointer",
      color: form.paidBy === "mohamed" ? "#60a5fa" : "#4a6080",
      fontFamily: "'Cairo',sans-serif",
      fontSize: 12,
      fontWeight: 700
    }
  }, "👨 مرتب محمد"), /*#__PURE__*/React.createElement("button", {
    onClick: () => sf(f => ({ ...f, paidBy: "doha" })),
    style: {
      flex: 1,
      background: form.paidBy === "doha" ? "#ec489933" : T.bg,
      border: `1.5px solid ${form.paidBy === "doha" ? "#ec4899" : T.bdr}`,
      borderRadius: 9,
      padding: "9px 4px",
      cursor: "pointer",
      color: form.paidBy === "doha" ? "#f472b6" : "#4a6080",
      fontFamily: "'Cairo',sans-serif",
      fontSize: 12,
      fontWeight: 700
    }
  }, "👩 مرتب ضحي"), /*#__PURE__*/React.createElement("button", {
    onClick: () => sf(f => ({ ...f, paidBy: "tahwish" })),
    style: {
      flex: 1,
      background: form.paidBy === "tahwish" ? "#8b5cf633" : T.bg,
      border: `1.5px solid ${form.paidBy === "tahwish" ? "#8b5cf6" : T.bdr}`,
      borderRadius: 9,
      padding: "9px 4px",
      cursor: "pointer",
      color: form.paidBy === "tahwish" ? "#a78bfa" : "#4a6080",
      fontFamily: "'Cairo',sans-serif",
      fontSize: 12,
      fontWeight: 700
    }
  }, "💰 من التحويش")), /*#__PURE__*/React.createElement("button", {
    style: S.btn("#8b5cf6"),
    onClick: doAdd
  }, "إضافة ✓")), view === "needs" && /*#__PURE__*/React.createElement(React.Fragment, null,/*#__PURE__*/React.createElement("div",{style:{background:"#0f1a2a",borderRadius:13,padding:"12px 14px",marginBottom:10,border:"1px solid #1a2840"}},/*#__PURE__*/React.createElement("div",{style:{display:"flex",gap:7,marginBottom:8}},/*#__PURE__*/React.createElement("input",{style:{background:"#070c16",border:"1px solid #1a2840",borderRadius:9,padding:"9px 12px",fontSize:14,color:"#e2e8f0",flex:1,fontFamily:"'Cairo',sans-serif",outline:"none",direction:"rtl"},type:"text",placeholder:"أضف احتياج جديد...",value:newNeed,onChange:function(e){setNewNeed(e.target.value);},onKeyDown:function(e){if(e.key==="Enter"&&newNeed.trim()){setCarNeeds(function(n){return[...n,{name:newNeed.trim(),done:false}];});setNewNeed("");}}}),/*#__PURE__*/React.createElement("button",{onClick:function(){if(newNeed.trim()){setCarNeeds(function(n){return[...n,{name:newNeed.trim(),done:false}];});setNewNeed("");}},style:{background:"#8b5cf6",color:"#fff",border:"none",borderRadius:10,padding:"9px 16px",fontSize:18,fontWeight:900,cursor:"pointer",fontFamily:"'Cairo',sans-serif"}},"+"), /*#__PURE__*/React.createElement("div",{style:{fontSize:11,color:"#4a6080"}},carNeeds.filter(function(x){return x.done;}).length," / ",carNeeds.length," تم")),carNeeds.map(function(item,i){return /*#__PURE__*/React.createElement("div",{key:i,style:{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid #1a2840"}},/*#__PURE__*/React.createElement("div",{onClick:function(){setCarNeeds(function(n){return n.map(function(x,idx){return idx===i?Object.assign({},x,{done:!x.done}):x;});});},style:{width:26,height:26,borderRadius:99,flexShrink:0,cursor:"pointer",background:item.done?"#10b981":"transparent",border:"2.5px solid "+(item.done?"#10b981":"#ef4444"),display:"flex",alignItems:"center",justifyContent:"center"}},item.done&&/*#__PURE__*/React.createElement("span",{style:{color:"#fff",fontSize:13,fontWeight:900}},"✓")),/*#__PURE__*/React.createElement("span",{onClick:function(){setCarNeeds(function(n){return n.map(function(x,idx){return idx===i?Object.assign({},x,{done:!x.done}):x;});});},style:{fontSize:13,flex:1,cursor:"pointer",color:item.done?"#4a6080":"#e2e8f0",textDecoration:item.done?"line-through":"none"}},item.name),/*#__PURE__*/React.createElement("button",{onClick:function(){setCarNeeds(function(n){return n.filter(function(_,idx){return idx!==i;});});},style:{background:"none",border:"none",cursor:"pointer",color:"#334155",fontSize:16,padding:"0 4px"}},"🗑"));}))),view === "stats" && /*#__PURE__*/React.createElement(React.Fragment, null,/*#__PURE__*/React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:7}},/*#__PURE__*/React.createElement("div",{style:{background:"#0f1a2a",borderRadius:13,padding:"12px",border:"1px solid #1a2840"}},/*#__PURE__*/React.createElement("div",{style:{fontSize:10,color:"#8b5cf6",marginBottom:3}},"📅 هذا الشهر"),/*#__PURE__*/React.createElement("div",{style:{fontSize:20,fontWeight:900,color:"#a78bfa"}},fmt(tMon)," ج"),/*#__PURE__*/React.createElement("div",{style:{fontSize:10,color:"#4a6080"}},mCar.length," عملية")),/*#__PURE__*/React.createElement("div",{style:{background:"#0f1a2a",borderRadius:13,padding:"12px",border:"1px solid #1a2840"}},/*#__PURE__*/React.createElement("div",{style:{fontSize:10,color:"#f59e0b",marginBottom:3}},"💰 إجمالي كل الفترة"),/*#__PURE__*/React.createElement("div",{style:{fontSize:20,fontWeight:900,color:"#fbbf24"}},fmt(tAll)," ج"),/*#__PURE__*/React.createElement("div",{style:{fontSize:10,color:"#4a6080"}},all.length," عملية"))),/*#__PURE__*/React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:10}},/*#__PURE__*/React.createElement("div",{style:{background:"#0f1a2a",borderRadius:13,padding:"12px",border:"1px solid #1a2840"}},/*#__PURE__*/React.createElement("div",{style:{fontSize:10,color:"#10b981",marginBottom:3}},"📊 متوسط الشهر"),/*#__PURE__*/React.createElement("div",{style:{fontSize:18,fontWeight:900,color:"#34d399"}},fmt(Math.round(tAll/Math.max(1,Object.keys(byMon).length)))," ج")),(function(){var top=Object.entries(byMon).sort(function(a,b){return b[1].total-a[1].total;})[0];if(!top)return null;var ty=+top[0].split("-")[0],tm=+top[0].split("-")[1];return /*#__PURE__*/React.createElement("div",{style:{background:"#0f1a2a",borderRadius:13,padding:"12px",border:"1px solid #1a2840"}},/*#__PURE__*/React.createElement("div",{style:{fontSize:10,color:"#ef4444",marginBottom:3}},"🔥 أعلى شهر"),/*#__PURE__*/React.createElement("div",{style:{fontSize:18,fontWeight:900,color:"#f87171"}},fmt(top[1].total)," ج"),/*#__PURE__*/React.createElement("div",{style:{fontSize:10,color:"#4a6080"}},MN[tm-1]," ",ty));})()), /*#__PURE__*/React.createElement("div",{style:{fontSize:10,color:"#2a3a55",fontWeight:700,marginBottom:7}},"🔧 حسب التصنيف"),/*#__PURE__*/React.createElement("div",{style:{background:"#0f1a2a",borderRadius:13,padding:"12px 14px",marginBottom:9,border:"1px solid #1a2840"}},CC.map(function(c){var t=SUM(all.filter(function(e){return e.cat===c.id;}));if(!t)return null;var cnt=all.filter(function(e){return e.cat===c.id;}).length;var avg=Math.round(t/cnt);return /*#__PURE__*/React.createElement("div",{key:c.id,onClick:function(){setF(c.id);setScope("all");sv2("list");},style:{marginBottom:10,cursor:"pointer"}},/*#__PURE__*/React.createElement("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:4}},/*#__PURE__*/React.createElement("span",{style:{fontSize:12}},c.ic," ",c.l," (",cnt,")"),/*#__PURE__*/React.createElement("div",{style:{textAlign:"left"}},/*#__PURE__*/React.createElement("div",{style:{fontSize:12,fontWeight:700,color:c.c}},fmt(t)," ج"),/*#__PURE__*/React.createElement("div",{style:{fontSize:9,color:"#4a6080"}},"متوسط ",fmt(avg)," ج"))),/*#__PURE__*/React.createElement(Bar,{v:t,max:tAll,c:c.c}));})),/*#__PURE__*/React.createElement("div",{style:{fontSize:10,color:"#2a3a55",fontWeight:700,marginBottom:7}},"📅 حسب الشهر"),/*#__PURE__*/React.createElement("div",{style:{background:"#0f1a2a",borderRadius:13,padding:"12px 14px",marginBottom:9,border:"1px solid #1a2840"}},Object.entries(byMon).sort(function(a,b){return b[0].localeCompare(a[0]);}).map(function(entry){var mk2=entry[0],d=entry[1];var ty=+mk2.split("-")[0],tm=+mk2.split("-")[1];var isCur=mk2===mk;var maxT=Math.max.apply(null,Object.values(byMon).map(function(x){return x.total;}));return /*#__PURE__*/React.createElement("div",{key:mk2,style:{padding:"8px 0",borderBottom:"1px solid #1a2840"}},/*#__PURE__*/React.createElement("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:4}},/*#__PURE__*/React.createElement("span",{style:{fontSize:12,fontWeight:isCur?900:400,color:isCur?"#60a5fa":"#e2e8f0"}},isCur?"← ":"",MN[tm-1]," ",ty),/*#__PURE__*/React.createElement("div",{style:{textAlign:"left"}},/*#__PURE__*/React.createElement("span",{style:{fontSize:12,fontWeight:700,color:isCur?"#60a5fa":"#a78bfa"}},fmt(d.total)," ج"),/*#__PURE__*/React.createElement("span",{style:{fontSize:9,color:"#4a6080",marginRight:4}}," (",d.cnt," عملية"))),/*#__PURE__*/React.createElement(Bar,{v:d.total,max:maxT,c:isCur?"#3b82f6":"#8b5cf6",h:5}));})),/*#__PURE__*/React.createElement("div",{style:{fontSize:10,color:"#2a3a55",fontWeight:700,marginBottom:7}},"📆 ملخص السنوات"),/*#__PURE__*/React.createElement("div",{style:{background:"#0f1a2a",borderRadius:13,padding:"12px 14px",border:"1px solid #1a2840"}},Object.entries(byY).sort().map(function(e2){return /*#__PURE__*/React.createElement("div",{key:e2[0],style:{display:"flex",justifyContent:"space-between",marginBottom:7,paddingBottom:7,borderBottom:"1px solid #1a2840"}},/*#__PURE__*/React.createElement("span",{style:{fontSize:14,fontWeight:700}},"📅 ",e2[0]),/*#__PURE__*/React.createElement("span",{style:{fontSize:16,fontWeight:900,color:"#a78bfa"}},fmt(e2[1])," ج"));})), /*#__PURE__*/React.createElement(AIAnalysisSection, {
  storageKey: "car_ai_" + mk,
  periodLabel: "مصاريف العربية",
  contextText: (function(){
    var lines = CC.map(function(c){
      var items = all.filter(function(e){ return e.cat === c.id; });
      var t = SUM(items);
      if (!t) return null;
      return c.l + ": " + t + " ج (" + items.length + " عملية)";
    }).filter(Boolean);
    return "إجمالي مصاريف العربية كل الوقت: " + tAll + " ج، الشهر ده: " + tMon + " ج\nحسب البند:\n" + lines.join("\n");
  })()
}))),
del && /*#__PURE__*/React.createElement(Confirm, {
    msg: "تحذف الصيانة دي؟",
    onOk: () => {
      onDel(del);
      setD(null);
      setT("🗑️");
    },
    onNo: () => setD(null)
  }), /*#__PURE__*/React.createElement(Toast, {
    msg: toast
  }));
}

// ══════════════════════════════════════════════════════════════
// SUMMARY SCREEN
// ══════════════════════════════════════════════════════════════
// ── تاب "التحويش شهر بشهر": كل شهر من 1 لـ 12 وقدام كل واحد إجمالي اللي اتحوش فيه
// (نفس معادلة صندوق "إجمالي التحويش" الموجود: المبلغ المجدول + أي بند يدوي فئته "تحويش")
function TahwishMonthsTab({ allMonthKeys, monthly, entries, mk }) {
  const months = (allMonthKeys || []).filter(k => /^\d{4}-\d{2}$/.test(k)).sort();
  let grand = 0;
  const rows = months.map(k => {
    const preset = MONTHLY_PRESET[k] || {};
    const usr = monthly[k] || {};
    const presetT = +((usr.tahwish !== undefined ? usr.tahwish : preset.tahwish) || 0) || 0;
    const manualT = SUM((entries || []).filter(e => e.cat === "saving" && finKey(e.date) === k));
    const total = presetT + manualT;
    grand += total;
    const [yy, mm] = k.split("-").map(Number);
    return { k, mm, yy, total, isCurrent: k === mk };
  });
  return E("div", { style: { padding: "13px" } },
    E("div", { style: S.sub }, "💰 التحويش شهر بشهر"),
    E("div", { style: S.card() },
      rows.length === 0
        ? E("div", { style: { textAlign: "center", color: "#4a6080", fontSize: 12, padding: 16 } }, "مفيش بيانات لسه")
        : rows.map(r => E("div", {
          key: r.k,
          style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${T.bdr}` }
        },
          E("span", { style: { fontSize: 12, fontWeight: r.isCurrent ? 900 : 700, color: r.isCurrent ? T.orange : "#e2e8f0" } },
            (r.isCurrent ? "▶ " : "") + "شهر " + toArabicDigits(r.mm) + " (" + MONTHS[r.mm - 1] + " " + r.yy + ")"),
          E("span", { style: { fontSize: 13, fontWeight: 900, color: T.purple } }, fmt(r.total) + " ج")
        ))
    ),
    E("div", {
      style: { ...S.card(), border: `1px solid ${T.purple}55`, marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }
    },
      E("span", { style: { fontSize: 12, fontWeight: 700, color: "#c7d3e6" } }, "الإجمالي"),
      E("span", { style: { fontSize: 16, fontWeight: 900, color: T.purple } }, fmt(grand) + " ج")
    )
  );
}

// ══════════════════════════════════════════════════════════════
// تاب "التحويش" المستقل في الشاشة الرئيسية
// (بيجمع: التحويش شهر بشهر + المصروف من التحويش + احتياجات التحويش)
// ملحوظة: مش بيغيّر أي حسبة موجودة في SummaryScreen، بس بيعيد عرض نفس
// المنطق هنا كمان عشان يبقى متاح من غير ما تدخل تاب الملخص
// ══════════════════════════════════════════════════════════════
function Fold({ title, defaultOpen, badge, children }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return E("div", { style: { marginBottom: 9 } },
    E("div", {
      onClick: () => setOpen(o => !o),
      style: {
        display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer",
        padding: "12px 14px", background: T.card, border: `1px solid ${T.bdr}`,
        borderRadius: open ? "13px 13px 0 0" : 13
      }
    },
      E("span", { style: { fontSize: 13, fontWeight: 700, color: "#e2e8f0" } }, title),
      E("div", { style: { display: "flex", alignItems: "center", gap: 9 } },
        badge != null && E("span", { style: { fontSize: 12, fontWeight: 900, color: T.purple } }, badge),
        E("span", { style: { fontSize: 11, color: "#4a6080" } }, open ? "▲" : "▼")
      )
    ),
    open && E("div", {
      style: { background: T.card, border: `1px solid ${T.bdr}`, borderTop: "none", borderRadius: "0 0 13px 13px", padding: "10px 14px 14px" }
    }, children)
  );
}

function TahwishNeedsSection({ pool }) {
  const storageKey = "tahwish_needs_v1";
  const [needs, setNeeds] = useState(() => ld(storageKey, []));
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  useEffect(() => sv(storageKey, needs), [needs]);

  // اقتراحات مقسّمة حسب الشخص/الفئة، من غير ما نلمس تخزين أي قايمة موجودة أصلاً:
  // محمد + الشقة من قوائم أهدافه، ضحي من قايمتها، والعربية من "احتياجات" تاب العربية
  const groupedSuggestions = useMemo(() => {
    const mohamed = ld("mh_gl5", []).filter(g => !g.done && g.t).map(g => g.t);
    const home = ld("home_needs_v1", []).filter(g => !g.done && g.t).map(g => g.t);
    const doha = ld("dh_gl", []).filter(g => !g.done && g.t).map(g => g.t);
    const car = ld("car_needs_v2", []).filter(g => !g.done && g.name).map(g => g.name);
    return [
      { label: "👨 محمد", items: [...new Set(mohamed)] },
      { label: "🏠 الشقة", items: [...new Set(home)] },
      { label: "👩 ضحي", items: [...new Set(doha)] },
      { label: "🚗 العربية", items: [...new Set(car)] }
    ].filter(g => g.items.length > 0);
  }, [needs]);

  const manualSum = needs.reduce((s, n) => s + (n.manualAlloc != null ? +n.manualAlloc : 0), 0);
  const autoItems = needs.filter(n => n.manualAlloc == null);
  const autoPool = Math.max(0, pool - manualSum);
  const autoShare = autoItems.length ? autoPool / autoItems.length : 0;
  const allocOf = n => n.manualAlloc != null ? +n.manualAlloc : autoShare;
  const totalAllocated = needs.reduce((s, n) => s + allocOf(n), 0);

  const addNeed = () => {
    const t = +amount;
    if (!name.trim() || !t) return;
    setNeeds(a => [...a, { id: Date.now(), name: name.trim(), target: t, manualAlloc: null }]);
    setName(""); setAmount("");
  };

  return E(Fold, { title: "🎯 التحويش لهدف معين", defaultOpen: false, badge: needs.length ? fmt(Math.round(totalAllocated)) + " ج" : null },
    needs.length === 0
      ? E("div", { style: { textAlign: "center", color: "#4a6080", fontSize: 12, padding: "10px 0" } }, "لسه مفيش احتياجات — ضيف اللي عايز تحوش عشانه من تحت 👇")
      : needs.map(nd => {
        const alloc = allocOf(nd);
        const remain = Math.max(0, nd.target - alloc);
        const pct = PCT(alloc, nd.target);
        const isManual = nd.manualAlloc != null;
        return E("div", { key: nd.id, style: { ...S.card(), marginBottom: 8, padding: "10px 12px" } },
          E("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 6 } },
            E("span", { style: { fontSize: 12, fontWeight: 700, color: "#e2e8f0" } }, nd.name),
            E("span", {
              onClick: () => setNeeds(a => a.filter(x => x.id !== nd.id)),
              style: { fontSize: 14, color: T.red, cursor: "pointer", opacity: 0.7, padding: "0 4px" }
            }, "×")
          ),
          E("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 6 } },
            E(Bar, { v: alloc, max: nd.target, c: T.purple, h: 8 }),
            E("span", { style: { fontSize: 11, fontWeight: 900, color: T.purple, whiteSpace: "nowrap" } }, pct, "%")
          ),
          E("div", { style: { display: "flex", justifyContent: "space-between", fontSize: 10, color: "#4a6080", marginBottom: 8 } },
            E("span", null, "مخصص: ", fmt(Math.round(alloc)), " ج / ", fmt(nd.target), " ج"),
            E("span", null, "متبقي ", fmt(Math.round(remain)), " ج")
          ),
          E("div", { style: { display: "flex", gap: 6, alignItems: "center" } },
            E("input", {
              type: "number", placeholder: "خصّص مبلغ يدوي بدل التلقائي...",
              value: isManual ? nd.manualAlloc : "",
              onChange: e => {
                const v = e.target.value;
                setNeeds(a => a.map(x => x.id === nd.id ? { ...x, manualAlloc: v === "" ? null : +v } : x));
              },
              style: { ...S.inp, marginBottom: 0, flex: 1, padding: "6px 9px", fontSize: 11 }
            }),
            isManual && E("button", {
              onClick: () => setNeeds(a => a.map(x => x.id === nd.id ? { ...x, manualAlloc: null } : x)),
              style: { background: "none", border: `1px solid ${T.bdr}`, borderRadius: 8, color: "#4a6080", fontSize: 10, padding: "6px 8px", cursor: "pointer", whiteSpace: "nowrap" }
            }, "↺ تلقائي")
          )
        );
      }),
    E("div", { style: S.div }),
    groupedSuggestions.length > 0 && E("select", {
      value: "",
      onChange: e => { if (e.target.value) setName(e.target.value); },
      style: { ...S.inp, marginBottom: 7, color: "#7c93b8" }
    },
      E("option", { value: "" }, "اختار من قوائمك... (اختياري)"),
      groupedSuggestions.map(g => E("optgroup", { key: g.label, label: g.label },
        g.items.map(it => E("option", { key: it, value: it }, it))
      ))
    ),
    E("input", {
      type: "text", placeholder: "اسم الاحتياج (مثلاً: تجهيز الشقة)...",
      value: name, onChange: e => setName(e.target.value),
      style: { ...S.inp, marginBottom: 7 }
    }),
    E("div", { style: { display: "flex", gap: 7 } },
      E("input", {
        type: "number", placeholder: "المبلغ المطلوب...", value: amount,
        onChange: e => setAmount(e.target.value),
        onKeyDown: e => { if (e.key === "Enter") addNeed(); },
        style: { ...S.inp, marginBottom: 0, flex: 1 }
      }),
      E("button", { onClick: addNeed, style: { ...S.btn(T.purple), width: "auto", padding: "9px 16px", marginTop: 0 } }, "+")
    ),
    totalAllocated > pool + 1 && E("div", { style: { fontSize: 10, color: T.orange, marginTop: 8, textAlign: "center" } },
      "⚠️ مجموع المخصصات اليدوية أكبر من الباقي المتاح من التحويش")
  );
}

function TahwishScreen({ entries, monthly, mk, deletedXl }) {
  const dxl = deletedXl || [];
  const entryMonthKeys = (entries || []).map(e => finKey(e.date));
  const allMonthKeys = [...new Set([...Object.keys(MONTHLY_PRESET), ...Object.keys(monthly), ...entryMonthKeys])].sort();
  const allH = [...HOME_DATA.filter(e => !dxl.includes(e.id)), ...entries.filter(e => e.type === "home")];
  const allD = [...DUHA_DATA, ...entries.filter(e => e.type === "duha")];
  const allC = [...CAR_DATA, ...entries.filter(e => e.type === "car")];
  const carSpent = allC.filter(e => e.paidBy === "tahwish");
  const homeSpent = allH.filter(e => e.paidBy === "tahwish");
  const duhaSpent = allD.filter(e => e.paidBy === "tahwish");
  const carTahwishTotal = SUM(carSpent);
  const homeTahwishTotal = SUM(homeSpent);
  const duhaTahwishTotal2 = SUM(duhaSpent);
  const spentTotal = carTahwishTotal + homeTahwishTotal + duhaTahwishTotal2;

  const grand = allMonthKeys.reduce((s, k) => {
    const p = MONTHLY_PRESET[k] || {};
    const u = monthly[k] || {};
    const presetT = +((u.tahwish !== undefined ? u.tahwish : p.tahwish) || 0) || 0;
    const manualT = SUM((entries || []).filter(e => e.cat === "saving" && finKey(e.date) === k));
    return s + presetT + manualT;
  }, 0);
  const netRemaining = Math.max(0, grand - spentTotal);

  const monthRows = allMonthKeys.filter(k => /^\d{4}-\d{2}$/.test(k)).sort().map(k => {
    const preset = MONTHLY_PRESET[k] || {};
    const usr = monthly[k] || {};
    const presetT = +((usr.tahwish !== undefined ? usr.tahwish : preset.tahwish) || 0) || 0;
    const manualT = SUM((entries || []).filter(e => e.cat === "saving" && finKey(e.date) === k));
    const total = presetT + manualT;
    const [yy, mm] = k.split("-").map(Number);
    return { k, mm, yy, total, isCurrent: k === mk };
  });

  const txns = [
    ...carSpent.map(e => ({ ...e, _src: "🚗 العربية" })),
    ...homeSpent.map(e => ({ ...e, _src: "👨 محمد" })),
    ...duhaSpent.map(e => ({ ...e, _src: "👩 ضحي" }))
  ].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  return E("div", { style: { padding: "13px" } },
    E("div", {
      style: { ...S.card(`${T.purple}55`), border: `2px solid ${T.purple}`, textAlign: "center", marginBottom: 12 }
    },
      E("div", { style: { fontSize: 11, color: "#a78bfa", marginBottom: 4 } }, "الباقي المتاح من التحويش"),
      E("div", { style: { fontSize: 26, fontWeight: 900, color: T.purple } }, fmt(Math.round(netRemaining)), " ج"),
      E("div", { style: { fontSize: 10, color: "#4a6080", marginTop: 4 } },
        "إجمالي التحويش ", fmt(grand), " ج", spentTotal > 0 ? " − اتصرف " + fmt(spentTotal) + " ج" : "")
    ),

    E(Fold, { title: "📅 التحويش شهر بشهر", defaultOpen: false, badge: fmt(grand) + " ج" },
      monthRows.length === 0
        ? E("div", { style: { textAlign: "center", color: "#4a6080", fontSize: 12, padding: 16 } }, "مفيش بيانات لسه")
        : monthRows.map(r => E("div", {
          key: r.k,
          style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${T.bdr}` }
        },
          E("span", { style: { fontSize: 12, fontWeight: r.isCurrent ? 900 : 700, color: r.isCurrent ? T.orange : "#e2e8f0" } },
            (r.isCurrent ? "▶ " : "") + "شهر " + toArabicDigits(r.mm) + " (" + MONTHS[r.mm - 1] + " " + r.yy + ")"),
          E("span", { style: { fontSize: 13, fontWeight: 900, color: T.purple } }, fmt(r.total) + " ج")
        ))
    ),

    E(Fold, { title: "💸 المصروف من التحويش", defaultOpen: false, badge: spentTotal > 0 ? fmt(spentTotal) + " ج" : null },
      [["🚗 العربية", carTahwishTotal, T.purple], ["👨 محمد", homeTahwishTotal, T.blue], ["👩 ضحي", duhaTahwishTotal2, "#ec4899"]].map(([l, v, c]) =>
        E("div", { key: l, style: { ...S.row, marginBottom: 8 } },
          E("span", { style: { fontSize: 12, color: "#94a3b8" } }, l),
          E("span", { style: { fontSize: 13, fontWeight: 900, color: c } }, fmt(v), " ج")
        )
      ),
      E("div", { style: S.div }),
      E("div", { style: { fontSize: 10, color: "#2a3a55", marginBottom: 6, fontWeight: 700 } }, "تفاصيل العمليات"),
      txns.length === 0
        ? E("div", { style: { textAlign: "center", color: "#4a6080", fontSize: 12, padding: 10 } }, "لسه معتصرفش حاجة من التحويش")
        : txns.map(e => E("div", {
          key: e._src + "_" + e.id,
          style: { display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${T.bdr}` }
        },
          E("div", null,
            E("div", { style: { fontSize: 12, fontWeight: 700 } }, e.note || e.name || e._src),
            E("div", { style: { fontSize: 10, color: "#4a6080" } }, e._src, " · ", e.date)
          ),
          E("span", { style: { fontSize: 12, fontWeight: 700, color: T.red } }, fmt(e.amount), " ج")
        ))
    ),

    E(TahwishNeedsSection, { pool: netRemaining })
  );
}

function SummaryScreen({
  entries,
  mk,
  monthly,
  indExtra,
  setTab,
  deletedXl,
  goAddHome
}) {
  const dxl = deletedXl || [];
  const [sumTab, setSumTab] = useState("summary"); // "summary" | "tahwish_months"
  const [y, m] = mk.split("-").map(Number);
  const saved = monthly[mk] || MONTHLY_PRESET[mk] || {};
  // كل الشهور المعروفة: الشهور الجاهزة + أي شهر جديد المستخدم دخله بياناته (حتى لو لسه مش في MONTHLY_PRESET)
  const entryMonthKeys = (entries || []).map(e => finKey(e.date));
  const allMonthKeys = [...new Set([...Object.keys(MONTHLY_PRESET), ...Object.keys(monthly), ...entryMonthKeys])].sort();
  const n = k => +(saved[k] || 0);

  // حساب المتبقي من الشهر السابق ونقله تلقائياً (محمد + ضحي مجمّعين في "فلوس قديمة")
  const carry = calcCarryover(mk, monthly, entries, indExtra, dxl);
  const prevBalance = carry.prevBalance;
  const prevDuhaBalance = carry.prevDuhaBalance;

  // إضافة المتبقي للشهر الحالي (لو مفيش old مسجل يدوي) — مجموع متبقي محمد + متبقي ضحي مع بعض
  const autoOld = n("old") > 0 ? 0 : carry.prevBalance;

  const baseInc = n("salary") + n("transport") + n("waste") + (n("old") > 0 ? n("old") : autoOld) + n("deals") + n("eid") + n("dohaa") + n("magdy");
  const duhaAllowance = (n("home_given") || 0) + prevDuhaBalance;
  const duhaWSal = n("duha_w_sal") || 0;
  const duhaWSav = n("duha_w_sav") || 0;
  const budget = duhaAllowance; // مرتب ضحي بس — المتبقي بقى بيترحل في "فلوس قديمة" العامة بدل ما يتحسب لوحده هنا
  const fix = n("car_fixed") + n("rent") + n("internet") + n("charity") + n("mom") + n("ajz") + n("tahwish");
  const fixDisplay = fix + duhaAllowance;
  // نشيل "basics" من الأكل والبيت لأنها بتتحسب في الثوابت (charity/mom/internet)
  const allH = [...HOME_DATA.filter(e => !dxl.includes(e.id)), ...entries.filter(e => e.type === "home")];
  const allD = [...DUHA_DATA, ...entries.filter(e => e.type === "duha")];
  const allC = [...CAR_DATA, ...entries.filter(e => e.type === "car")];
  const mHome = allH.filter(e => finKey(e.date) === mk && !(e.cat === "saving" && e.id && e.id.startsWith("hn")));
  const mDuha = allD.filter(e => finKey(e.date) === mk);
  const mCarAll = allC.filter(e => finKey(e.date) === mk);
  const mCarDoha = SUM(mCarAll.filter(e => e.paidBy === "doha"));
  const mCarTahwish = SUM(mCarAll.filter(e => e.paidBy === "tahwish"));
  const carTahwishTotal = SUM(allC.filter(e => e.paidBy === "tahwish"));
  const mCar = SUM(mCarAll.filter(e => e.paidBy !== "doha" && e.paidBy !== "tahwish"));
  const mHomeDoha = SUM(mHome.filter(e => e.paidBy === "doha"));
  const mHomeTahwish = SUM(mHome.filter(e => e.paidBy === "tahwish"));
  const mHomeTot = SUM(mHome.filter(e => e.paidBy !== "doha" && e.paidBy !== "tahwish"));
  const mDuhaMohamed = SUM(mDuha.filter(e => e.paidBy === "mohamed"));
  // للعرض بس (مش لحساب الأمان عشان منكررش mDuhaMohamed اللي بيتضاف أصلاً في totalOut)
  const mHomeTotDisplay = mHomeTot + mDuhaMohamed;
  const mDuhaTahwish = SUM(mDuha.filter(e => e.paidBy === "tahwish"));
  const mDuhaOwn = SUM(mDuha.filter(e => e.paidBy !== "mohamed" && e.paidBy !== "tahwish"));
  const homeTahwishTotal = SUM(allH.filter(e => e.paidBy === "tahwish"));
  const duhaTahwishTotal2 = SUM(allD.filter(e => e.paidBy === "tahwish"));
  const mDuhaTot = mDuhaOwn + mHomeDoha + mCarDoha;
  // إندرايف للشهر: الأوردرات بتزود "إجمالي الدخل" مباشرة،
  // والبنزين/الضريبة/النفخ بتتحسب ضمن إجمالي المصاريف
  const indSum = indriveSummary(indExtra || []);
  const ind = indSum[mk];
  const indRev = ind ? ind.rev : 0;
  const indExpenses = ind ? ind.petrol + (ind.tax || 0) + (ind.tire || 0) : 0;
  // تحويش محمد يخصم من الأمان
  const mTahwishMohy = SUM((entries||[]).filter(e=>e.type==="home"&&e.cat==="saving"&&e.id&&e.id.startsWith("hn")&&finKey(e.date)===mk));
  const totalOut = fix + duhaAllowance + mHomeTot + mCar + mDuhaMohamed + (duhaWSal||0) + (duhaWSav||0) + indExpenses + mTahwishMohy;
  const inc = baseInc + indRev;
  const balance = inc - totalOut;
  const bycat = HC.map(c => ({
    ...c,
    total: SUM(mHome.filter(e => e.cat === c.id))
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);
  const noData = !n("salary");
  const R = ({
    icon,
    lbl,
    val,
    c
  }) => /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.row,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "#94a3b8"
    }
  }, icon, " ", lbl), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: c || "#e2e8f0"
    }
  }, fmt(val), " ج"));
  if (sumTab === "tahwish_months") {
    return /*#__PURE__*/React.createElement(React.Fragment, null,
      /*#__PURE__*/React.createElement(TahwishMonthsTab, { allMonthKeys, monthly, entries, mk })
    );
  }
  return /*#__PURE__*/React.createElement(React.Fragment, null,
  /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "13px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: S.sub
  }, "📥 الدخل — ", MONTHS[m - 1], " ", y), /*#__PURE__*/React.createElement("div", {
    style: S.card()
  }, n("salary") > 0 && /*#__PURE__*/React.createElement(R, {
    icon: "💰",
    lbl: "المرتب",
    val: n("salary"),
    c: T.green
  }), n("transport") > 0 && /*#__PURE__*/React.createElement(R, {
    icon: "🚌",
    lbl: "بدل مواصلات",
    val: n("transport"),
    c: T.green
  }), n("waste") > 0 && /*#__PURE__*/React.createElement(R, {
    icon: "🗑️",
    lbl: "بدل مخلفات",
    val: n("waste"),
    c: T.green
  }), (n("old") > 0 || autoOld > 0) && /*#__PURE__*/React.createElement(R, {
    icon: "📦",
    lbl: "فلوس قديمة/جمعية",
    val: n("old") > 0 ? n("old") : autoOld,
    c: T.green
  }), prevDuhaBalance > 0 && /*#__PURE__*/React.createElement("div", {
    style: { fontSize: 10, color: "#a78bfa", marginTop: -4, marginBottom: 6, textAlign: "left" }
  }, "👩 + متبقي ضحي ", fmt(prevDuhaBalance), " ج (مضاف على مرتبها تلقائي — هتلاقيه تحت في الثوابت وفي شاشتها)"), n("deals") > 0 && /*#__PURE__*/React.createElement(R, {
    icon: "🤝",
    lbl: "صفقات",
    val: n("deals"),
    c: T.green
  }), n("eid") > 0 && /*#__PURE__*/React.createElement(R, {
    icon: "🎁",
    lbl: "عيدية/مكافأة",
    val: n("eid"),
    c: T.green
  }), n("dohaa") > 0 && /*#__PURE__*/React.createElement(R, {
    icon: "👩",
    lbl: "من ضحي",
    val: n("dohaa"),
    c: T.green
  }), n("magdy") > 0 && /*#__PURE__*/React.createElement(R, {
    icon: "👤",
    lbl: "من مجدي",
    val: n("magdy"),
    c: T.green
  }), indRev > 0 && /*#__PURE__*/React.createElement(R, {
    icon: "🛺",
    lbl: "إندرايف",
    val: indRev,
    c: T.green
  }), noData && /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#2a3a55",
      fontSize: 11,
      textAlign: "center",
      padding: "8px 0"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: S.div
  }), /*#__PURE__*/React.createElement("div", {
    style: S.row
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 700
    }
  }, "إجمالي الدخل"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 16,
      fontWeight: 900,
      color: T.green
    }
  }, fmt(inc), " ج"))), ind && (ind.rev > 0 || ind.petrol > 0 || ind.tax > 0 || ind.tire > 0) && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: S.sub
  }, "🛺 إندرايف — ", MONTHS[m - 1]), /*#__PURE__*/React.createElement("div", {
    style: S.card()
  }, ind.rev > 0 && /*#__PURE__*/React.createElement(R, {
    icon: "📦",
    lbl: `أوردرات (${ind.orders})`,
    val: ind.rev,
    c: T.orange
  }), ind.petrol > 0 && /*#__PURE__*/React.createElement(R, {
    icon: "⛽",
    lbl: `بنزين (${ind.petrol_fills} مرة)`,
    val: -ind.petrol,
    c: T.red
  }), ind.tax > 0 && /*#__PURE__*/React.createElement(R, {
    icon: "🧾",
    lbl: "ضريبة اندرايف",
    val: -ind.tax,
    c: "#a78bfa"
  }), ind.tire > 0 && /*#__PURE__*/React.createElement(R, {
    icon: "🛞",
    lbl: "نفخ كاوتش",
    val: -ind.tire,
    c: "#38bdf8"
  }))), /*#__PURE__*/React.createElement("div", {
    style: S.sub
  }, "🔒 الثوابت"), /*#__PURE__*/React.createElement("div", {
    style: S.card()
  }, /*#__PURE__*/React.createElement(R, {
    icon: "🚗",
    lbl: "قسط العربية",
    val: n("car_fixed") || defaultCarInstallment(mk),
    c: T.red
  }), /*#__PURE__*/React.createElement(R, {
    icon: "🏠",
    lbl: "قسط الشقة / الإيجار",
    val: n("rent") || defaultRentInstallment(mk),
    c: T.red
  }), /*#__PURE__*/React.createElement(R, {
    icon: "📡",
    lbl: "الإنترنت",
    val: n("internet") || 750,
    c: T.red
  }), /*#__PURE__*/React.createElement(R, {
    icon: "🤲",
    lbl: "الصدقات والحصري",
    val: n("charity") || 200,
    c: T.red
  }), /*#__PURE__*/React.createElement(R, {
    icon: "👩",
    lbl: "أمي",
    val: n("mom") || 1500,
    c: T.red
  }), n("ajz") > 0 && /*#__PURE__*/React.createElement(R, {
    icon: "📉",
    lbl: "عجز",
    val: n("ajz"),
    c: T.red
  }), n("tahwish") > 0 && /*#__PURE__*/React.createElement(R, {
    icon: "💰",
    lbl: "تحويش",
    val: n("tahwish"),
    c: T.red
  }), duhaWSal > 0 && /*#__PURE__*/React.createElement(R, {
    icon: "💳",
    lbl: "سحب من مرتب ضحي",
    val: -duhaWSal,
    c: T.red
  }), duhaWSav > 0 && /*#__PURE__*/React.createElement(R, {
    icon: "📦",
    lbl: "سحب من تحويش ضحي",
    val: -duhaWSav,
    c: T.red
  }), /*#__PURE__*/React.createElement(R, {
    icon: "🛒",
    lbl: "ضحي",
    val: budget,
    c: T.red
  }), /*#__PURE__*/React.createElement("div", {
    style: S.div
  }), /*#__PURE__*/React.createElement("div", {
    style: S.row
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 700
    }
  }, "إجمالي الثوابت"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 15,
      fontWeight: 900,
      color: T.red
    }
  }, fmt(fixDisplay || 9480), " ج"))), /*#__PURE__*/React.createElement("div", {
    style: S.sub
  }, "🛒 الأكل والبيت — ", fmt(mHomeTotDisplay), " ج"), /*#__PURE__*/React.createElement("div", {
    style: S.card()
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => (goAddHome ? goAddHome() : setTab("food")),
    style: {
      width: "100%",
      padding: "12px 0",
      borderRadius: 10,
      border: "none",
      background: T.orange,
      color: "#000",
      fontFamily: "'Cairo',sans-serif",
      fontWeight: 800,
      fontSize: 14,
      cursor: "pointer"
    }
  }, "➕ أضف مصروف بيت"), /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.row,
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: S.lbl
  }, "إجمالي ما اتصرف فعلياً"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      fontWeight: 900,
      color: mHomeTotDisplay > budget ? T.red : T.blue
    }
  }, fmt(mHomeTotDisplay), " ج"))), duhaAllowance > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: S.sub
  }, "👩 ضحي — مرتب ", fmt(duhaAllowance), " ج"), /*#__PURE__*/React.createElement("div", {
    style: S.card()
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setTab("duha"),
    style: {
      width: "100%",
      padding: "12px 0",
      borderRadius: 10,
      border: "none",
      background: "#8b5cf6",
      color: "#fff",
      fontFamily: "'Cairo',sans-serif",
      fontWeight: 800,
      fontSize: 14,
      cursor: "pointer"
    }
  }, "👩 عرض مصاريف ضحي"), /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.row,
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: S.lbl
  }, "إجمالي ما اتصرف فعلياً"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      fontWeight: 900,
      color: mDuhaTot > duhaAllowance ? T.red : T.blue
    }
  }, fmt(mDuhaTot), " ج")), mHomeDoha > 0 && /*#__PURE__*/React.createElement("div", {
    style: { ...S.row, marginTop: 4 }
  }, /*#__PURE__*/React.createElement("span", {
    style: { fontSize: 10, color: "#4a6080" }
  }, "منها من مصاريف البيت"), /*#__PURE__*/React.createElement("span", {
    style: { fontSize: 11, fontWeight: 700, color: "#10b981" }
  }, fmt(mHomeDoha), " ج"))), (mCar + mCarDoha + mCarTahwish) > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: S.sub
  }, "🔧 صيانة العربية"), /*#__PURE__*/React.createElement("div", {
    style: S.card()
  }, /*#__PURE__*/React.createElement("div", {
    style: S.row
  }, /*#__PURE__*/React.createElement("span", {
    style: S.lbl
  }, "إجمالي الصيانة"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: "#a78bfa"
    }
  }, fmt(mCar + mCarDoha + mCarTahwish), " ج")), mCarDoha > 0 && /*#__PURE__*/React.createElement("div", {
    style: { ...S.row, marginTop: 4 }
  }, /*#__PURE__*/React.createElement("span", {
    style: { fontSize: 10, color: "#4a6080" }
  }, "منها من مرتب ضحي"), /*#__PURE__*/React.createElement("span", {
    style: { fontSize: 11, fontWeight: 700, color: "#f472b6" }
  }, fmt(mCarDoha), " ج")), mCarTahwish > 0 && /*#__PURE__*/React.createElement("div", {
    style: { ...S.row, marginTop: 4 }
  }, /*#__PURE__*/React.createElement("span", {
    style: { fontSize: 10, color: "#4a6080" }
  }, "منها من التحويش"), /*#__PURE__*/React.createElement("span", {
    style: { fontSize: 11, fontWeight: 700, color: "#a78bfa" }
  }, fmt(mCarTahwish), " ج")), mCar > 0 && /*#__PURE__*/React.createElement("div", {
    style: { ...S.row, marginTop: 4 }
  }, /*#__PURE__*/React.createElement("span", {
    style: { fontSize: 10, color: "#4a6080" }
  }, "منها من محمد"), /*#__PURE__*/React.createElement("span", {
    style: { fontSize: 11, fontWeight: 700, color: "#60a5fa" }
  }, fmt(mCar), " ج")))), /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.card(balance >= 0 ? "#10b98133" : "#ef444433"),
      border: `2px solid ${balance >= 0 ? T.green : T.red}`,
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: balance >= 0 ? T.green : T.red,
      marginBottom: 4
    }
  }, balance >= 0 ? "✅ في الأمان" : "⚠️ تعديت الميزانية"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 28,
      fontWeight: 900,
      color: balance >= 0 ? T.green : T.red
    }
  }, fmt(Math.abs(balance)), " ج"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "#4a6080",
      marginTop: 3
    }
  }, "دخل ", fmt(inc), " − مصاريف ", fmt(totalOut)), /*#__PURE__*/React.createElement("div", {
    style: S.div
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-around"
    }
  }, [["الثوابت", fixDisplay || 9480, T.red], ["الأكل والبيت", mHomeTot, T.blue], ["صيانة", mCar, "#a78bfa"], ["💰 تحويش", SUM((entries||[]).filter(e=>e.type==="home"&&e.cat==="saving"&&finKey(e.date)===mk)), "#a78bfa"], ["⛽ بنزين", ind ? (ind.petrol||0) : 0, "#f59e0b"], ["🧾 ضريبة", ind ? (ind.tax||0) : 0, "#f59e0b"], ["🔧 نفخ كاوتش", ind ? (ind.tire||0) : 0, "#f59e0b"]].map(([l, v, c]) => /*#__PURE__*/React.createElement("div", {
    key: l,
    style: {
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "#4a6080"
    }
  }, l), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      color: c
    }
  }, fmt(v)))))), /*#__PURE__*/React.createElement("div", {
    style: S.sub
  }, "📅 ملخص الشهور"), /*#__PURE__*/React.createElement("div", {
    style: S.card()
  }, allMonthKeys.filter(monthKey => monthKey >= "2026-01").map(monthKey => {
    const preset = MONTHLY_PRESET[monthKey] || {};
    const u = monthly[monthKey] || {};
    const mn = k => +(u[k] !== undefined ? u[k] : preset[k] || 0);
    const indS = indriveSummary(indExtra || []);
    const im = indS[monthKey];
    const imRev = im ? im.rev : 0;
    const imExp = im ? (im.petrol || 0) + (im.tax || 0) + (im.tire || 0) : 0;
    const mInc = mn("salary") + mn("transport") + mn("waste") + mn("old") + mn("deals") + mn("eid") + mn("dohaa") + mn("magdy") + imRev;
    const mFix = mn("car_fixed") + mn("rent") + mn("internet") + mn("charity") + mn("mom") + mn("ajz") + mn("tahwish");
    const mFixDisplay = mFix + mn("home_given");
    const mAllH = [...HOME_DATA.filter(e => !dxl.includes(e.id)), ...entries.filter(e => e.type === "home")].filter(e => finKey(e.date) === monthKey && !(e.cat === "saving" && e.id && e.id.startsWith("hn")));
    const mAllD = [...DUHA_DATA, ...entries.filter(e => e.type === "duha")].filter(e => finKey(e.date) === monthKey);
    const mAllC = [...CAR_DATA, ...entries.filter(e => e.type === "car")].filter(e => finKey(e.date) === monthKey);
    // نستبعد اللي اتدفع من مرتب ضحي أو من التحويش، عشان يتطابق مع حساب "في الأمان"
    const mHTotal = SUM(mAllH.filter(e => e.paidBy !== "doha" && e.paidBy !== "tahwish"));
    const mCarTotal = SUM(mAllC.filter(e => e.paidBy !== "doha" && e.paidBy !== "tahwish"));
    const mDuhaMohamedForMonth = SUM(mAllD.filter(e => e.paidBy === "mohamed"));
    const mDuhaWSalForMonth = mn("duha_w_sal") || 0;
    const mDuhaWSavForMonth = mn("duha_w_sav") || 0;
    const mTahwishMohyForMonth = SUM((entries||[]).filter(e => e.type === "home" && e.cat === "saving" && e.id && e.id.startsWith("hn") && finKey(e.date) === monthKey));
    const mCarry = calcCarryover(monthKey, monthly, entries, indExtra, dxl);
    const mDuha = mn("home_given") + mCarry.prevDuhaBalance;
    const mTotalLive = mFix + mDuha + mHTotal + mCarTotal + imExp + mDuhaMohamedForMonth + mDuhaWSalForMonth + mDuhaWSavForMonth + mTahwishMohyForMonth;
    // لو الشهر ده ملوش تعديل من المستخدم وعنده قيمة موثقة من الإكسيل، استخدمها (أدق 100%)
    // لو المستخدم عدل أي حاجة في الشهر ده (أو شهر جديد لسه مش موجود في الإكسيل)، استخدم الحساب اللايف
    const hasUserEdit = Object.keys(u).length > 0;
    const mTotal = (!hasUserEdit && preset.expense_total_xl !== undefined) ? preset.expense_total_xl : mTotalLive;
    const mBal = mInc - mTotal;
    const monthName = MONTHS[+monthKey.split("-")[1] - 1];
    const isCurrent = monthKey === mk;
    return /*#__PURE__*/React.createElement("div", {
      key: monthKey,
      style: {
        padding: "10px 0",
        borderBottom: `1px solid ${T.bdr}`,
        opacity: isCurrent ? 1 : 0.85
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 5
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: isCurrent ? T.orange : "#aaa"
      }
    }, isCurrent ? "▶ " : "", monthName, " ", monthKey.split("-")[0]), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        fontWeight: 900,
        color: mBal >= 0 ? T.green : T.red
      }
    }, mBal >= 0 ? "+" : "", fmt(mBal), " ج")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        fontSize: 10,
        color: "#4a6080"
      }
    }, /*#__PURE__*/React.createElement("span", null, "دخل: ", fmt(mInc), " ج"), /*#__PURE__*/React.createElement("span", null, "مصاريف: ", fmt(mTotal), " ج")), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 5
      }
    }, /*#__PURE__*/React.createElement(Bar, {
      v: mTotal,
      max: mInc,
      c: mBal >= 0 ? T.green : T.red
    })));
  })), /*#__PURE__*/React.createElement("div", {
    style: S.sub
  }, "💵 إجمالي الدخل والمصروفات"), /*#__PURE__*/React.createElement("div", {
    style: S.card()
  }, /*#__PURE__*/React.createElement("div", {style:{background:"#0f1a2a",borderRadius:13,padding:"12px 14px",border:"1px solid #10b98133"}}, /*#__PURE__*/React.createElement("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:6}}, /*#__PURE__*/React.createElement("span",{style:{fontSize:12,color:"#4a6080"}}, "إجمالي الدخل كل الشهور"), /*#__PURE__*/React.createElement("span",{style:{fontSize:14,fontWeight:900,color:T.green}}, fmt(YEARLY_INCOME_XL + allMonthKeys.filter(k=>k>"2026-06").reduce((s,k)=>{ const p=MONTHLY_PRESET[k]||{}; const u=monthly[k]||{}; const mn2=x=>+(u[x]!==undefined?u[x]:p[x]||0); const indS=indriveSummary(indExtra||[]); const im=indS[k]; return s+mn2("salary")+mn2("transport")+mn2("waste")+mn2("old")+mn2("deals")+mn2("eid")+mn2("dohaa")+mn2("magdy")+(im?im.rev:0); },0)), " ج")), /*#__PURE__*/React.createElement("div",{style:{height:1,background:T.bdr,margin:"5px 0"}}), /*#__PURE__*/React.createElement("div",{style:{display:"flex",justifyContent:"space-between"}}, /*#__PURE__*/React.createElement("span",{style:{fontSize:12,color:"#4a6080"}}, "إجمالي المصاريف كل الشهور"), /*#__PURE__*/React.createElement("span",{style:{fontSize:14,fontWeight:900,color:T.red}}, fmt(YEARLY_EXPENSE_XL + allMonthKeys.filter(k=>k>"2026-06").reduce((s,k)=>{ const p=MONTHLY_PRESET[k]||{}; const u=monthly[k]||{}; const mn2=x=>+(u[x]!==undefined?u[x]:p[x]||0); const mFx=mn2("car_fixed")+mn2("rent")+mn2("internet")+mn2("charity")+mn2("mom")+mn2("ajz")+mn2("tahwish"); const mHH=[...HOME_DATA,...(entries||[]).filter(e=>e.type==="home")].filter(e=>finKey(e.date)===k).filter(e=>e.paidBy!=="doha"&&e.paidBy!=="tahwish").filter(e=>!(e.cat==="saving"&&e.id&&e.id.startsWith("hn"))); const mCC=[...CAR_DATA,...(entries||[]).filter(e=>e.type==="car")].filter(e=>finKey(e.date)===k).filter(e=>e.paidBy!=="doha"&&e.paidBy!=="tahwish"); const mDD=[...DUHA_DATA,...(entries||[]).filter(e=>e.type==="duha")].filter(e=>finKey(e.date)===k).filter(e=>e.paidBy==="mohamed"); const mDuhaWSal=mn2("duha_w_sal")||0; const mDuhaWSav=mn2("duha_w_sav")||0; const mTahwishMohy=SUM((entries||[]).filter(e=>e.type==="home"&&e.cat==="saving"&&e.id&&e.id.startsWith("hn")&&finKey(e.date)===k)); const indS=indriveSummary(indExtra||[]); const im=indS[k]; const ic=im?(im.petrol||0)+(im.tax||0)+(im.tire||0):0; const mCarry2=calcCarryover(k, monthly, entries, indExtra, dxl); const liveTotal=mFx+mn2("home_given")+mCarry2.prevDuhaBalance+SUM(mHH)+SUM(mCC)+SUM(mDD)+ic+mDuhaWSal+mDuhaWSav+mTahwishMohy; const hasEdit=Object.keys(u).length>0; const finalTotal=(!hasEdit&&p.expense_total_xl!==undefined)?p.expense_total_xl:liveTotal; return s+finalTotal; },0)), " ج"))), /*#__PURE__*/React.createElement("div", {style:{background:"#0f1a2a",borderRadius:13,padding:"12px 14px",border:"1px solid #8b5cf644",marginTop:8}}, /*#__PURE__*/React.createElement("div",{style:{fontSize:10,color:"#a78bfa",marginBottom:5,fontWeight:700}}, "💰 إجمالي التحويش"), /*#__PURE__*/React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center"}}, /*#__PURE__*/React.createElement("span",{style:{fontSize:11,color:"#4a6080"}}, "مجموع ما تم تحويشه كل الشهور"), /*#__PURE__*/React.createElement("span",{style:{fontSize:20,fontWeight:900,color:"#a78bfa"}}, fmt(Math.max(0, allMonthKeys.reduce((s,k)=>{ const p=MONTHLY_PRESET[k]||{}; const u=monthly[k]||{}; const presetT=+(u.tahwish!==undefined?u.tahwish:p.tahwish||0)||0; const manualT=SUM((entries||[]).filter(e=>e.cat==="saving"&&finKey(e.date)===k)); return s+presetT+manualT; },0) - (carTahwishTotal + homeTahwishTotal + duhaTahwishTotal2))), " ج")), (carTahwishTotal + homeTahwishTotal + duhaTahwishTotal2) > 0 && /*#__PURE__*/React.createElement("div",{style:{display:"flex",justifyContent:"space-between",marginTop:4}}, /*#__PURE__*/React.createElement("span",{style:{fontSize:10,color:"#4a6080"}}, "منها اتصرف على العربية/البيت/ضحي"), /*#__PURE__*/React.createElement("span",{style:{fontSize:11,fontWeight:700,color:"#ef4444"}}, fmt((carTahwishTotal + homeTahwishTotal + duhaTahwishTotal2)), " ج"))))), /*#__PURE__*/React.createElement(FinancialPlanSection, {
  income: inc,
  fixedItems: [
    ["قسط العربية", n("car_fixed")],
    ["قسط الشقة / الإيجار", n("rent")],
    ["إنترنت", n("internet")],
    ["خيرية", n("charity")],
    ["لأمه", n("mom")],
    ["بند ثابت تاني", n("ajz")],
    ["تحويش مجدول", n("tahwish")]
  ],
  homeSpend: mHomeTot,
  carSpend: mCar,
  duhaSpend: mDuhaTot,
  fuelSpend: ind ? (ind.petrol || 0) : 0,
  balance: balance,
  mk: mk,
  monthly: monthly,
  entries: entries,
  indExtra: indExtra,
  deletedXl: deletedXl
})));
}

// ══════════════════════════════════════════════════════════════
// INDRIVE SCREEN — مع إضافة أوردر وبنزين
// ══════════════════════════════════════════════════════════════
function IndriveScreen({
  indExtra,
  onAddInd,
  onDelInd,
  mk
}) {
  const TYPE_META = {
    order: {
      label: "أوردر",
      icon: "📦",
      color: T.orange
    },
    petrol: {
      label: "بنزين",
      icon: "⛽",
      color: T.red
    },
    tax: {
      label: "ضريبة اندرايف",
      icon: "🧾",
      color: "#a78bfa"
    },
    tire: {
      label: "نفخ كاوتش",
      icon: "🛞",
      color: "#38bdf8"
    }
  };
  const [view, sv2] = useState("month");
  const [form, sf] = useState({
    type: "order",
    amount: "",
    date: DK(),
    note: "",
    liters: "",
    km: ""
  });
  const [petrolPrice, setPetrolPrice] = useState(() => ld("petrolPrice", 24));
  useEffect(() => { sv("petrolPrice", petrolPrice); }, [petrolPrice]);
  const [toast, setT] = useToast();
  const [del, setD] = useState(null);
  const summary = useMemo(() => indriveSummary(indExtra), [indExtra]);
  const months = Object.keys(summary).sort().reverse();

  // الشهر الحالي
  const curInd = summary[mk] || {
    orders: 0,
    rev: 0,
    petrol: 0,
    petrol_fills: 0,
    tax: 0,
    tire: 0,
    entries: []
  };
  const net = curInd.rev - curInd.petrol - curInd.tax - curInd.tire;

  // إجمالي كل الفترة
  const grandRev = months.reduce((s, m) => s + (summary[m].rev || 0), 0);
  const grandPet = months.reduce((s, m) => s + (summary[m].petrol || 0), 0);
  const grandTax = months.reduce((s, m) => s + (summary[m].tax || 0), 0);
  const grandTire = months.reduce((s, m) => s + (summary[m].tire || 0), 0);
  const grandOrders = months.reduce((s, m) => s + (summary[m].orders || 0), 0);
  const doAdd = () => {
    const a = parseFloat(form.amount);
    if (!a || a <= 0) {
      setT("ادخل مبلغ");
      return;
    }
    onAddInd({
      id: `ind${Date.now()}`,
      type: form.type,
      amount: a,
      date: form.date,
      note: form.note.trim(),
      ...(form.type === "petrol" ? {
        liters: parseFloat(form.liters) || 0,
        km: parseFloat(form.km) || 0,
        price: petrolPrice
      } : {})
    });
    sf(f => ({
      ...f,
      amount: "",
      note: "",
      liters: "",
      km: ""
    }));
    const labels = {
      order: "✅ أوردر اتضاف",
      petrol: "✅ بنزين اتضاف",
      tax: "✅ ضريبة اندرايف اتضافت",
      tire: "✅ نفخ كاوتش اتضاف"
    };
    setT(labels[form.type] || "✅ تم الإضافة");
    sv2("month");
  };
  const isNew = id => String(id).startsWith("ind");

  // لون الشهر بالنسبة للصافي
  const netColor = n => n > 0 ? T.green : n < 0 ? T.red : "#4a6080";
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Tabs, {
    tabs: [["month", "الشهر الحالي"], ["add", "➕ أضف"], ["all", "كل الشهور"]],
    cur: view,
    set: sv2,
    ac: T.orange
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "13px"
    }
  }, view === "month" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: S.sub
  }, "🛺 إندرايف — ", MONTHS[+mk.split("-")[1] - 1]), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr 1fr",
      gap: 6,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.card("#f59e0b22"),
      textAlign: "center",
      border: "1px solid #f59e0b44"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: T.orange,
      marginBottom: 2
    }
  }, "الأوردرات (", curInd.orders, ")"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 900,
      color: "#fbbf24"
    }
  }, fmt(curInd.rev), " ج")), /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.card("#ef444422"),
      textAlign: "center",
      border: "1px solid #ef444433"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: T.red,
      marginBottom: 2
    }
  }, "البنزين (", curInd.petrol_fills, ")"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 900,
      color: T.red
    }
  }, fmt(curInd.petrol), " ج")), /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.card("#a78bfa22"),
      textAlign: "center",
      border: "1px solid #a78bfa44"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: "#a78bfa",
      marginBottom: 2
    }
  }, "ضريبة اندرايف"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 900,
      color: "#a78bfa"
    }
  }, fmt(curInd.tax), " ج")), /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.card("#38bdf822"),
      textAlign: "center",
      border: "1px solid #38bdf844"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: "#38bdf8",
      marginBottom: 2
    }
  }, "نفخ كاوتش"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 900,
      color: "#38bdf8"
    }
  }, fmt(curInd.tire), " ج"))), (() => {
    const monthPetrol = (curInd.entries || []).filter(e => e.type === "petrol" && e.liters && e.km);
    if (!monthPetrol.length) return null;
    const mLiters = monthPetrol.reduce((s, e) => s + (e.liters || 0), 0);
    const mKm = monthPetrol.reduce((s, e) => s + (e.km || 0), 0);
    const mRate = mLiters > 0 ? mKm / mLiters : 0;
    return /*#__PURE__*/React.createElement("div", {
      style: { ...S.card("#10b98122"), border: "1px solid #10b98144", marginBottom: 10 }
    }, /*#__PURE__*/React.createElement("div", {
      style: { fontSize: 12, fontWeight: 700, color: T.green, marginBottom: 8 }
    }, "⚡ معدل استهلاك البنزين — الشهر ده"), /*#__PURE__*/React.createElement("div", {
      style: { display: "flex", justifyContent: "space-between", marginBottom: 8 }
    }, /*#__PURE__*/React.createElement("span", { style: { fontSize: 11, color: "#8fa3c4" } }, "المتوسط"), /*#__PURE__*/React.createElement("span", {
      style: { fontSize: 14, fontWeight: 900, color: T.green }
    }, mRate.toFixed(1), " كم/لتر")), monthPetrol.slice().reverse().map((e, i) => {
      const rate = e.liters > 0 ? e.km / e.liters : 0;
      return /*#__PURE__*/React.createElement("div", {
        key: e.id || i,
        style: { display: "flex", justifyContent: "space-between", fontSize: 11, padding: "5px 0", borderBottom: i < monthPetrol.length - 1 ? "1px solid #1a2840" : "none" }
      }, /*#__PURE__*/React.createElement("span", { style: { color: "#4a6080" } }, e.date, " · ", e.km, " كم · ", e.liters, " لتر"), /*#__PURE__*/React.createElement("span", {
        style: { fontWeight: 700, color: rate >= mRate ? T.green : T.red }
      }, rate.toFixed(1), " كم/لتر"));
    }));
  })(), /*#__PURE__*/React.createElement("div", {
    style: S.sub
  }, "عمليات الشهر (", curInd.entries?.length || 0, ")"), (!curInd.entries || curInd.entries.length === 0) && /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#2a3a55",
      fontSize: 12,
      textAlign: "center",
      padding: "20px 0"
    }
  }, "مفيش عمليات هذا الشهر"), (curInd.entries || []).sort((a, b) => b.date.localeCompare(a.date)).map((e, i) => /*#__PURE__*/React.createElement("div", {
    key: e.id || i,
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "9px 0",
      borderBottom: `1px solid ${T.bdr}`
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 20
    }
  }, TYPE_META[e.type]?.icon || "💰"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      color: TYPE_META[e.type]?.color || "#4a6080"
    }
  }, TYPE_META[e.type]?.label || e.type), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "#4a6080"
    }
  }, e.date, e.note ? ` · ${e.note}` : ""))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 7,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: TYPE_META[e.type]?.color || "#4a6080"
    }
  }, fmt(e.amount), " ج"), isNew(e.id) && /*#__PURE__*/React.createElement("button", {
    onClick: () => setD(e.id),
    style: {
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "#4a6080",
      fontSize: 13
    }
  }, "🗑️"))))), view === "add" && /*#__PURE__*/React.createElement("div", {
    style: S.card()
  }, /*#__PURE__*/React.createElement("div", {
    style: S.sub
  }, "إضافة عملية جديدة"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 8,
      marginBottom: 12
    }
  }, Object.entries(TYPE_META).map(([key, meta]) => /*#__PURE__*/React.createElement("button", {
    key: key,
    onClick: () => sf(f => ({
      ...f,
      type: key
    })),
    style: {
      padding: "12px 0",
      borderRadius: 10,
      border: `2px solid ${form.type === key ? meta.color : T.bdr}`,
      background: form.type === key ? meta.color + "22" : T.bg,
      cursor: "pointer",
      fontFamily: "'Cairo',sans-serif",
      fontWeight: 700,
      fontSize: 13,
      color: form.type === key ? meta.color : "#4a6080"
    }
  }, meta.icon, " ", meta.label))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#4a6080",
      marginBottom: 4
    }
  }, form.type === "petrol" ? "سعر اللتر (ج)" : "المبلغ (ج)"), form.type === "petrol" && /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    type: "number",
    placeholder: "مثلاً: 24",
    inputMode: "decimal",
    value: petrolPrice,
    onChange: e => setPetrolPrice(e.target.value)
  }), form.type === "petrol" && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#4a6080",
      marginTop: 8,
      marginBottom: 4
    }
  }, "عدد اللترات"), form.type === "petrol" && /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    type: "number",
    placeholder: "مثلاً: 10",
    inputMode: "decimal",
    value: form.liters,
    onChange: e => sf(f => ({
      ...f,
      liters: e.target.value
    }))
  }), form.type === "petrol" && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#4a6080",
      marginTop: 8,
      marginBottom: 4
    }
  }, "كيلومترات التفويلة دي"), form.type === "petrol" && /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    type: "number",
    placeholder: "مثلاً: 100",
    inputMode: "decimal",
    value: form.km,
    onChange: e => sf(f => ({
      ...f,
      km: e.target.value
    }))
  }), form.type === "petrol" && form.liters && form.km && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: T.green,
      marginTop: 6,
      marginBottom: 4,
      fontWeight: 700
    }
  }, "⚡ معدل الاستهلاك: ", (parseFloat(form.km) / parseFloat(form.liters)).toFixed(1), " كم/لتر"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#4a6080",
      marginTop: form.type === "petrol" ? 8 : 0,
      marginBottom: 4
    }
  }, form.type === "petrol" ? "المبلغ الإجمالي (ج)" : "المبلغ (ج)"), /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    type: "number",
    placeholder: form.type === "order" ? "مثلاً: 150" : "مثلاً: 305",
    inputMode: "decimal",
    value: form.amount,
    onChange: e => sf(f => ({
      ...f,
      amount: e.target.value
    }))
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#4a6080",
      marginBottom: 4
    }
  }, "التاريخ"), /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    type: "date",
    value: form.date,
    onChange: e => sf(f => ({
      ...f,
      date: e.target.value
    }))
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#4a6080",
      marginBottom: 4
    }
  }, "ملاحظة (اختياري)"), /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    type: "text",
    placeholder: "مثلاً: رحلة مدينة نصر",
    value: form.note,
    onChange: e => {
      const v = e.target.value;
      const autoCat = (() => {
        const t = v.toLowerCase();
        if (/بيض|بيضه|بيضتين|ألبان|لبن|جبنه|جبن|زبادي|زبده/.test(t)) return "dairy";
        if (/فراخ|دجاج|لحم|لحمه|لحوم|كباب|كفته|سمك/.test(t)) return "meat";
        if (/عيش|فول|فلافل|طعميه|بليلة|فطار|كيك|بسكويت|شيبسي|بسكويته|باتيه|سندوتش/.test(t)) return "breakfast";
        if (/منظف|صابون|جلاية|ملابس|غسيل|مكنسه|مسحوق/.test(t)) return "cleaning";
        if (/خضار|طماطم|بطاطس|موز|فاكهه|فاكهة|برتقال|تفاح/.test(t)) return "pantry";
        if (/دوا|دواء|علاج|صيدليه|كشف|مستشفي/.test(t)) return "health";
        if (/خروج|كافيه|مطعم|تسالي|لعبه/.test(t)) return "outing";
        if (/مياه|زيت|عدس|أرز|ارز|سكر|ملح|معكرونه|عجينه/.test(t)) return "basics";
        return null;
      })();
      sf(f => ({ ...f, note: v, ...(autoCat ? {cat: autoCat} : {}) }));
    }
  }), /*#__PURE__*/React.createElement("button", {
    style: S.btn(TYPE_META[form.type]?.color || T.orange),
    onClick: doAdd
  }, TYPE_META[form.type]?.icon + " إضافة " + (TYPE_META[form.type]?.label || ""))), view === "all" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 7,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.card("#f59e0b22"),
      flex: 1,
      textAlign: "center",
      border: "1px solid #f59e0b44"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: T.orange,
      marginBottom: 1
    }
  }, "إجمالي الإيرادات"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 900,
      color: "#fbbf24"
    }
  }, fmt(grandRev), " ج")), /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.card("#ef444422"),
      flex: 1,
      textAlign: "center",
      border: "1px solid #ef444433"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: T.red,
      marginBottom: 1
    }
  }, "إجمالي البنزين"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 900,
      color: T.red
    }
  }, fmt(grandPet), " ج")), /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.card("#8b5cf622"),
      flex: 1,
      textAlign: "center",
      border: "1px solid #8b5cf644"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "#a78bfa",
      marginBottom: 1
    }
  }, "عدد الأوردرات"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 900,
      color: "#a78bfa"
    }
  }, grandOrders, " أوردر"))), (() => {
    const allPetrolEntries = [...IND_RAW, ...indExtra].filter(e => e.type === "petrol" && e.liters && e.km);
    if (!allPetrolEntries.length) return null;
    const byMonth = {};
    allPetrolEntries.forEach(e => {
      const k = finKey(e.date);
      if (!byMonth[k]) byMonth[k] = { liters: 0, km: 0 };
      byMonth[k].liters += (e.liters || 0);
      byMonth[k].km += (e.km || 0);
    });
    const monthKeys = Object.keys(byMonth).sort((a, b) => b.localeCompare(a));
    return /*#__PURE__*/React.createElement("div", {
      style: { ...S.card("#10b98122"), border: "1px solid #10b98144", marginBottom: 10 }
    }, /*#__PURE__*/React.createElement("div", {
      style: { fontSize: 13, fontWeight: 700, color: T.green, marginBottom: 8 }
    }, "⚡ معدل استهلاك البنزين لكل شهر"), monthKeys.map((k, idx) => {
      const d = byMonth[k];
      const rate = d.liters > 0 ? d.km / d.liters : 0;
      const [yy, mm] = k.split("-").map(Number);
      return /*#__PURE__*/React.createElement("div", {
        key: k,
        style: { display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: idx < monthKeys.length - 1 ? "1px solid #1a2840" : "none" }
      }, /*#__PURE__*/React.createElement("span", { style: { fontSize: 12, color: "#8fa3c4" } }, MONTHS[mm - 1], " ", yy), /*#__PURE__*/React.createElement("span", {
        style: { fontSize: 13, fontWeight: 900, color: T.green }
      }, rate.toFixed(1), " كم/لتر"));
    }));
  })(), months.map(m => {
    const d = summary[m];
    const net = d.rev - d.petrol - (d.tax || 0) - (d.tire || 0);
    const [y, mo] = m.split("-").map(Number);
    return /*#__PURE__*/React.createElement("div", {
      key: m,
      style: S.card()
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        ...S.row,
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        fontWeight: 700
      }
    }, MONTHS[mo - 1], " ", y), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: "#4a6080"
      }
    }, d.orders, " أوردر · ", d.petrol_fills, " بنزين")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: 4
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        color: "#4a6080"
      }
    }, "إيرادات"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: T.orange
      }
    }, fmt(d.rev))), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        color: "#4a6080"
      }
    }, "بنزين"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: T.red
      }
    }, fmt(d.petrol))), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        color: "#4a6080"
      }
    }, "الصافي"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: netColor(net)
      }
    }, fmt(net)))), d.tax > 0 || d.tire > 0 ? /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8,
        marginTop: 6,
        paddingTop: 6,
        borderTop: `1px solid ${T.bdr}`
      }
    }, d.tax > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: "#a78bfa"
      }
    }, "🧾 ضريبة: ", fmt(d.tax), " ج"), d.tire > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: "#38bdf8"
      }
    }, "🛞 نفخ: ", fmt(d.tire), " ج")) : null);
  }))), del && /*#__PURE__*/React.createElement(Confirm, {
    msg: "تحذف العملية دي؟",
    onOk: () => {
      onDelInd(del);
      setD(null);
      setT("🗑️");
    },
    onNo: () => setD(null)
  }), /*#__PURE__*/React.createElement(Toast, {
    msg: toast
  }));
}

// ══════════════════════════════════════════════════════════════
// GOAL LIST SECTION — مكوّن عام لأي قايمة أهداف (شخصية أو عامة)
// بيستخدم لأهدافي 2026 الشخصية بتاعة محمد وكمان لتاب "أهداف عامة"
// ══════════════════════════════════════════════════════════════
function GoalListSection({ storageKey, defaultList, colorAccent, sectionTitle, emptyHint }) {
  const [gl, sGl] = useState(() => ld(storageKey, defaultList || []));
  const [ng, sNg] = useState("");
  const [noteEditId, setNoteEditId] = useState(null);
  const [noteVal, setNoteVal] = useState("");
  useEffect(() => sv(storageKey, gl), [gl]);
  const pendingGoals = gl.filter(g => !g.done);
  const doneGoals = gl.filter(g => g.done);
  const goalsPct = gl.length ? Math.round(doneGoals.length / gl.length * 100) : 0;
  const acc = colorAccent || T.blue;
  const renderGoalItem = g => E(React.Fragment, { key: g.id },
    E("div", {
      onClick: () => sGl(a => a.map(x => x.id === g.id ? { ...x, done: !x.done } : x)),
      style: { display: "flex", gap: 9, alignItems: "center", padding: "7px 0", borderBottom: noteEditId === g.id ? "none" : `1px solid ${T.bdr}`, cursor: "pointer" }
    },
      E("div", { style: { width: 19, height: 19, borderRadius: 99, border: `2px solid ${g.done ? acc : "#2a3a55"}`, background: g.done ? acc : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 } },
        g.done && E("span", { style: { fontSize: 11, color: "#fff", lineHeight: 1 } }, "✓")),
      E("span", { style: { fontSize: 12, color: g.done ? "#4a6080" : "#e2e8f0", textDecoration: g.done ? "line-through" : "none", flex: 1 } },
        g.t, g.note && E("div", { style: { fontSize: 10, color: "#60a5fa", textDecoration: "none", marginTop: 2 } }, "📝 ", g.note)),
      E("span", {
        onClick: e => { e.stopPropagation(); setNoteEditId(noteEditId === g.id ? null : g.id); setNoteVal(g.note || ""); },
        style: { fontSize: 13, color: g.note ? "#60a5fa" : "#4a6080", cursor: "pointer", padding: "0 4px" }
      }, "📝"),
      E("span", {
        onClick: e => { e.stopPropagation(); sGl(a => a.filter(x => x.id !== g.id)); },
        style: { fontSize: 14, color: T.red, cursor: "pointer", padding: "0 4px", opacity: 0.6 }
      }, "×")),
    noteEditId === g.id && E("div", { style: { display: "flex", gap: 6, padding: "0 0 9px 27px", borderBottom: `1px solid ${T.bdr}` } },
      E("input", {
        type: "text", autoFocus: true, placeholder: "ملاحظة... مثلاً حققته بسعر كذا أو في شهر كذا",
        value: noteVal, onChange: e => setNoteVal(e.target.value),
        onKeyDown: e => { if (e.key === "Enter") { sGl(a => a.map(x => x.id === g.id ? { ...x, note: noteVal.trim() } : x)); setNoteEditId(null); } },
        style: { ...S.inp, marginBottom: 0, flex: 1, fontSize: 12 }
      }),
      E("button", {
        onClick: () => { sGl(a => a.map(x => x.id === g.id ? { ...x, note: noteVal.trim() } : x)); setNoteEditId(null); },
        style: { background: T.blue, color: "#fff", border: "none", borderRadius: 8, padding: "0 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Cairo',sans-serif" }
      }, "حفظ")));

  const addGoal = () => {
    if (!ng.trim()) return;
    sGl(g => [...g, { id: Date.now(), t: ng.trim(), done: false }]);
    sNg("");
  };

  return E(React.Fragment, null,
    sectionTitle && E("div", { style: S.sub }, sectionTitle),
    E("div", { style: S.card() },
      gl.length === 0 && emptyHint && E("div", { style: { fontSize: 12, color: "#4a6080", textAlign: "center", padding: "14px 6px" } }, emptyHint),
      pendingGoals.map(renderGoalItem),
      E("div", { style: { marginTop: 10, display: "flex", gap: 7 } },
        E("input", {
          style: { ...S.inp, marginBottom: 0, flex: 1 }, type: "text", placeholder: "أضف هدف جديد...",
          value: ng, onChange: e => sNg(e.target.value),
          onKeyDown: e => { if (e.key === "Enter") addGoal(); }
        }),
        E("button", { onClick: addGoal, style: { ...S.btn(acc), width: "auto", padding: "9px 14px", marginTop: 0 } }, "+"))),
    doneGoals.length > 0 && E(React.Fragment, null,
      E("div", { style: S.sub }, "📊 تقرير الأهداف المُنجزة"),
      E("div", { style: S.card() },
        E("div", { style: { ...S.row, marginBottom: 7 } },
          E("span", { style: { fontSize: 13, fontWeight: 700 } }, "نسبة التحقيق"),
          E("span", { style: { fontSize: 16, fontWeight: 900, color: goalsPct >= 70 ? T.green : goalsPct >= 40 ? T.orange : T.red } },
            doneGoals.length, "/", gl.length, " (", goalsPct, "%)")),
        E(Bar, { v: doneGoals.length, max: gl.length, c: goalsPct >= 70 ? T.green : goalsPct >= 40 ? T.orange : T.red }),
        E("div", { style: { marginTop: 10 } }, doneGoals.map(renderGoalItem)))));
}

// ══════════════════════════════════════════════════════════════
// قروض محمد (السلفة + قسط الشقة) — قسم مستقل تحت تاب محمد
// ══════════════════════════════════════════════════════════════
function MohamedLoansSection({ monthly }) {
  const { salfaRem, aptRem } = useMemo(() => calcLoans(monthly), [monthly]);
  function LoanCard({ icon, lbl, color, original, remaining, qist, note }) {
    const paid = original - remaining, p = PCT(paid, original);
    return E("div", { style: { ...S.card(`${color}33`), border: `1px solid ${color}44`, marginBottom: 10 } },
      E("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 8 } },
        E("div", null,
          E("div", { style: { fontSize: 14, fontWeight: 700, color: "#e2e8f0" } }, icon, " ", lbl),
          E("div", { style: { fontSize: 10, color: "#4a6080", marginTop: 2 } }, note)),
        E("div", { style: { textAlign: "left" } },
          E("div", { style: { fontSize: 9, color: "#4a6080" } }, "تم السداد"),
          E("div", { style: { fontSize: 14, fontWeight: 900, color: T.green } }, fmt(Math.round(paid)), " ج"))),
      E("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 } },
        E(Bar, { v: paid, max: original, c: color, h: 10 }),
        E("span", { style: { fontSize: 12, fontWeight: 900, color, whiteSpace: "nowrap" } }, p, "%")),
      E("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, textAlign: "center" } },
        E("div", { style: { background: T.bg, borderRadius: 8, padding: "7px 4px" } },
          E("div", { style: { fontSize: 9, color: "#4a6080" } }, "الأصل"),
          E("div", { style: { fontSize: 11, fontWeight: 700, color: "#64748b" } }, fmt(original), " ج")),
        E("div", { style: { background: "#ef444411", borderRadius: 8, padding: "7px 4px", border: "1px solid #ef444422" } },
          E("div", { style: { fontSize: 9, color: "#4a6080" } }, "المتبقي"),
          E("div", { style: { fontSize: 13, fontWeight: 900, color: T.red } }, fmt(Math.round(remaining * 100) / 100), " ج")),
        E("div", { style: { background: color + "11", borderRadius: 8, padding: "7px 4px", border: `1px solid ${color}22` } },
          E("div", { style: { fontSize: 9, color: "#4a6080" } }, "القسط"),
          E("div", { style: { fontSize: 11, fontWeight: 700, color } }, qist))));
  }
  return E("div", { style: { padding: "13px" } },
    E("div", { style: S.sub }, "💳 القروض (محدّث تلقائياً)"),
    E(LoanCard, {
      icon: "🏦", lbl: "السلفة", color: T.purple, original: SALFA_ORIGINAL, remaining: salfaRem,
      qist: fmt(defaultCarInstallment(currentFinMonth())) + " ج", note: "كل قسط عربية شهري يخصم من المتبقي تلقائياً"
    }),
    E(LoanCard, {
      icon: "🏠", lbl: "قسط الشقة", color: T.blue, original: APT_ORIGINAL, remaining: aptRem,
      qist: "~" + fmt(defaultRentInstallment(currentFinMonth())) + " ج", note: "كل إيجار/قسط شهري يخصم من المتبقي تلقائياً"
    }));
}

// ══════════════════════════════════════════════════════════════
// محاسبة النفس اليومية بتاعة محمد — قسم مستقل تحت تاب محمد
// ══════════════════════════════════════════════════════════════
function MohamedDailySection() {
  const todayKey = DK();
  const dailyStoreKey = `mh_daily_${todayKey}`;
  const [ch, sCh] = useState(() => {
    const saved = ld(dailyStoreKey, null);
    if (saved) return saved;
    const defs = ld("mh_check_defs", CHECK_DEF);
    return defs.map((t, i) => ({ id: i, t, done: false }));
  });
  const [showMonthReport, setShowMonthReport] = useState(false);
  useEffect(() => sv(dailyStoreKey, ch), [ch]);

  const monthReport = useMemo(() => {
    const year = todayKey.slice(0, 7);
    const report = {};
    CHECK_DEF.forEach((t, i) => { report[i] = { t, days: 0, total: 0 }; });
    let d = 1;
    while (d <= 31) {
      const dk = `${year}-${String(d).padStart(2, "0")}`;
      const dayData = ld(`mh_daily_${dk}`, null);
      if (dayData) {
        dayData.forEach(item => {
          if (report[item.id] !== undefined) {
            report[item.id].total++;
            if (item.done) report[item.id].days++;
          }
        });
      }
      d++;
    }
    return Object.values(report).filter(r => r.total > 0);
  }, [showMonthReport, todayKey]);

  const dp = Math.round(ch.filter(c => c.done).length / ch.length * 100);

  return E("div", { style: { padding: "13px" } },
    E("div", { style: S.sub }, "محاسبة النفس اليومية ✅"),
    E("div", { style: S.card() },
      E("div", { style: { ...S.row, marginBottom: 7 } },
        E("span", { style: { fontSize: 13, fontWeight: 700 } }, "إنجازك اليوم"),
        E("span", { style: { fontSize: 18, fontWeight: 900, color: dp >= 70 ? T.green : T.orange } }, dp, "%")),
      E(Bar, { v: dp, max: 100, c: T.green }),
      E("div", { style: { marginTop: 10 } }, ch.map(c => E("div", {
        key: c.id,
        onClick: () => sCh(a => a.map(x => x.id === c.id ? { ...x, done: !x.done } : x)),
        style: { display: "flex", gap: 9, alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${T.bdr}`, cursor: "pointer" }
      },
        E("div", { style: { width: 19, height: 19, borderRadius: 4, border: `2px solid ${c.done ? T.green : "#2a3a55"}`, background: c.done ? T.green : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 } },
          c.done && E("span", { style: { fontSize: 11, color: "#fff", lineHeight: 1 } }, "✓")),
        E("span", { style: { fontSize: 12, color: c.done ? "#4a6080" : "#e2e8f0", textDecoration: c.done ? "line-through" : "none", flex: 1 } }, c.t),
        E("span", {
          onClick: e => { e.stopPropagation(); sCh(a => { const n = a.filter(x => x.id !== c.id); sv("mh_check_defs", n.map(x => x.t)); return n; }); },
          style: { fontSize: 14, color: T.red, cursor: "pointer", padding: "0 4px", opacity: 0.6 }
        }, "×"))))),
    E("button", {
      onClick: () => setShowMonthReport(v => !v),
      style: { width: "100%", marginTop: 12, padding: "10px", background: showMonthReport ? "#1565ff22" : "#1a2840", border: "1px solid #1565ff44", borderRadius: 10, color: "#7aa3d4", fontSize: 13, fontWeight: 700, cursor: "pointer" }
    }, showMonthReport ? "▲ إخفاء تقرير الشهر" : "📊 تقرير الشهر"),
    showMonthReport && E("div", { style: { ...S.card("#1565ff11"), border: "1px solid #1565ff22", marginTop: 8 } },
      E("div", { style: { fontSize: 13, fontWeight: 700, color: T.blue, marginBottom: 10 } }, "📊 تقرير هذا الشهر"),
      monthReport.length === 0
        ? E("div", { style: { fontSize: 12, color: "#4a6080", textAlign: "center", padding: 10 } }, "مفيش بيانات لهذا الشهر لسه")
        : monthReport.map((r, i) => {
            const pct = r.total > 0 ? Math.round(r.days / r.total * 100) : 0;
            return E("div", { key: i, style: { marginBottom: 8 } },
              E("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 3 } },
                E("span", { style: { fontSize: 11, color: "#e2e8f0" } }, r.t),
                E("span", { style: { fontSize: 11, fontWeight: 700, color: pct >= 70 ? T.green : pct >= 40 ? T.orange : T.red } }, r.days, "/", r.total, " (", pct, "%)")),
              E(Bar, { v: r.days, max: r.total, c: pct >= 70 ? T.green : pct >= 40 ? T.orange : T.red, h: 5 }));
          })),
    E("div", { style: { ...S.card(dp >= 70 ? T.green : dp >= 40 ? T.orange : T.red), textAlign: "center", marginTop: 12 } },
      E("div", { style: { fontSize: 12, color: "#e2e8f0", lineHeight: 1.8 } }, dailyMotivationMsg(dp))));
}

// ══════════════════════════════════════════════════════════════
// WEIGHT TRACKER COMPONENT
// ══════════════════════════════════════════════════════════════
const CLD_CLOUD = "tpzkvsa6";
const CLD_PRESET = "Mohamed";
const WORKER_URL = "https://damp-poetry-c48b.mohamedhossamomara01.workers.dev";
// ملحوظة: مفتاح Gemini بقى مخزّن كـ Secret جوا الـ Worker نفسه، مش هنا —
// عشان كده مبقاش محتاج نبعته من المتصفح خالص.

async function geminiAnalyze(b64, mime, prompt) {
  const body = {
    contents: [{
      parts: [
        { inline_data: { mime_type: mime || "image/jpeg", data: b64 } },
        { text: prompt }
      ]
    }]
  };
  const res = await fetch(WORKER_URL + "/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
}

// ── نص فقط (من غير صورة) — لتحليل المصاريف والإجابة على الأسئلة، بنفس الـ Worker المستخدم بالفعل
async function geminiText(prompt) {
  const body = {
    contents: [{
      parts: [{ text: prompt }]
    }]
  };
  const res = await fetch(WORKER_URL + "/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
}

// ══════════════════════════════════════════════════════════════
// AI ANALYSIS SECTION — تقرير ذكاء اصطناعي + شات "اسأل عن مصاريفك"
// (بيتستخدم جوه شاشات التحليل المختلفة — محمد / ضحي / العربية)
// ══════════════════════════════════════════════════════════════
function AIAnalysisSection({ storageKey, contextText, periodLabel }) {
  const [report, setReport] = useState(() => ld(storageKey + "_report", ""));
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [chatLog, setChatLog] = useState(() => ld(storageKey + "_chat", []));
  const [q, setQ] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const runReport = async () => {
    setLoading(true);
    setErr("");
    try {
      const prompt = "أنت محلل مالي شخصي بترد بالعربية المصرية العامية بأسلوب ودود ومختصر. متخترعش أي رقم مش موجود في البيانات اللي هبعتهالك. اكتب تحليل من 4 لـ 6 جمل عن مصاريف " + (periodLabel || "الفترة دي") + " بناءً على البيانات دي:\n" + contextText;
      const res = await geminiText(prompt);
      const txt = res || "معرفتش أحلل دلوقتي، جرب تاني بعد شوية.";
      setReport(txt);
      sv(storageKey + "_report", txt);
    } catch (e) {
      setErr("حصل خطأ في الاتصال بالذكاء الاصطناعي، جرب تاني.");
    } finally {
      setLoading(false);
    }
  };

  const ask = async () => {
    const question = q.trim();
    if (!question || chatLoading) return;
    const newLog = [...chatLog, { role: "user", text: question }];
    setChatLog(newLog);
    setQ("");
    setChatLoading(true);
    try {
      const prompt = "أنت مساعد مالي شخصي، جاوب بالعربية المصرية باختصار (2-3 جمل) على سؤال المستخدم بالاعتماد على بيانات مصاريفه دي بس، ولو المعلومة مش موجودة في البيانات قول كده بصراحة من غير ما تخترع رقم:\n" + contextText + "\n\nسؤال المستخدم: " + question;
      const res = await geminiText(prompt);
      const finalLog = [...newLog, { role: "ai", text: res || "معرفتش أجاوب دلوقتي، جرب تاني." }];
      setChatLog(finalLog);
      sv(storageKey + "_chat", finalLog.slice(-20));
    } catch (e) {
      setChatLog([...newLog, { role: "ai", text: "حصل خطأ، جرب تاني." }]);
    } finally {
      setChatLoading(false);
    }
  };

  return /*#__PURE__*/React.createElement(React.Fragment, null,
    /*#__PURE__*/React.createElement("div", { style: { ...S.sub, marginTop: 14 } }, "🤖 تحليل بالذكاء الاصطناعي"),
    /*#__PURE__*/React.createElement("div", { style: { background: "#0f1a2a", borderRadius: 10, padding: "12px 13px", border: "1px solid #1a2840", marginBottom: 14 } },
      /*#__PURE__*/React.createElement("button", {
        onClick: runReport,
        disabled: loading,
        style: { ...S.btn(T.purple), opacity: loading ? 0.6 : 1 }
      }, loading ? "⏳ بيحلل..." : "✨ حلل مصاريف " + (periodLabel || "الفترة") + " بالـ AI"),
      err && /*#__PURE__*/React.createElement("div", { style: { color: T.red, fontSize: 11, marginTop: 8 } }, err),
      report && /*#__PURE__*/React.createElement("div", { style: { marginTop: 10, fontSize: 12.5, lineHeight: 1.9, color: "#cbd5e1", whiteSpace: "pre-wrap" } }, report),
      /*#__PURE__*/React.createElement("div", { style: { marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.bdr}` } },
        chatLog.length > 0 && /*#__PURE__*/React.createElement("div", { style: { marginBottom: 10, display: "flex", flexDirection: "column", gap: 8 } },
          chatLog.map((m, i) => /*#__PURE__*/React.createElement("div", {
            key: i,
            style: {
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              background: m.role === "user" ? T.blue : "#1a2840",
              color: "#fff",
              borderRadius: 10,
              padding: "7px 11px",
              fontSize: 12,
              maxWidth: "88%",
              lineHeight: 1.7
            }
          }, m.text))
        ),
        /*#__PURE__*/React.createElement("div", { style: { fontSize: 11, color: "#4a6080", marginBottom: 6, fontWeight: 700 } }, "💬 اسأل عن مصاريفك"),
        /*#__PURE__*/React.createElement("div", { style: { display: "flex", gap: 6 } },
          /*#__PURE__*/React.createElement("input", {
            type: "text",
            placeholder: "مثلاً: صرفت كام على اللحوم؟",
            value: q,
            onChange: e => setQ(e.target.value),
            onKeyDown: e => { if (e.key === "Enter") ask(); },
            style: { ...S.inp, marginBottom: 0, flex: 1, fontSize: 12 }
          }),
          /*#__PURE__*/React.createElement("button", {
            onClick: ask,
            disabled: chatLoading,
            style: { background: T.blue, color: "#fff", border: "none", borderRadius: 8, padding: "0 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Cairo',sans-serif", opacity: chatLoading ? 0.6 : 1 }
          }, chatLoading ? "..." : "ابعت")
        )
      )
    )
  );
}

// ══════════════════════════════════════════════════════════════
// تنظيم الوجبات — جدول أسبوعي (فطار/غداء/عشاء/مشروبات/ملاحظات)
// مع حساب سعرات تقريبي بالذكاء الاصطناعي لكل يوم
// ══════════════════════════════════════════════════════════════
const MEAL_DAYS = ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];
const MEAL_COLS = [["breakfast", "🍳 فطار"], ["lunch", "🍛 غداء"], ["dinner", "🍽️ عشاء"], ["drinks", "🥤 مشروبات"], ["notes", "📝 ملاحظات"]];

// ── تواريخ الأسبوع الحقيقية (يبدأ سبت) بدل أسماء الأيام المجردة، عشان كل أسبوع يتسجل لوحده وميتمسحش
function addDaysStr(dateStr, days) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}
function weekDatesFor(offset) {
  const today = new Date();
  const dow = today.getDay(); // 0=الأحد ... 6=السبت
  const diffToSat = (dow + 1) % 7;
  const sat = new Date(today);
  sat.setDate(today.getDate() - diffToSat + offset * 7);
  const base = `${sat.getFullYear()}-${String(sat.getMonth() + 1).padStart(2, "0")}-${String(sat.getDate()).padStart(2, "0")}`;
  return MEAL_DAYS.map((_, i) => addDaysStr(base, i));
}

// ── الوجبات لكل شخص لوحده من غير زراير: أول مرة بس على كل جهاز بيسأل "مين بيستخدم الموبايل ده؟" ويحفظ الإجابة على الجهاز،
// وبعد كده التاب بيفتح على صاحبه على طول. "محمد" بيفضل على المفاتيح القديمة (بياناته زي ما هي)، و"ضحي" ليها مفاتيح منفصلة
function MealPlannerScreen() {
  const [who, setWho] = useState(() => ld("meals_profile_device", null));
  const pick = k => { svLocal("meals_profile_device", k); setWho(k); };
  if (!who) return E("div", { style: { padding: "40px 20px", textAlign: "center" } },
    E("div", { style: { fontSize: 15, fontWeight: 800, color: "#e2e8f0", marginBottom: 6 } }, "مين بيستخدم الموبايل ده؟"),
    E("div", { style: { fontSize: 12, color: "#7aa3d4", marginBottom: 18, lineHeight: 1.8 } }, "هتتسأل مرة واحدة بس، وبعدها وجباتك بتفضل لوحدها ومش بتظهر عند التاني."),
    E("div", { style: { display: "flex", gap: 10, justifyContent: "center" } }, [["mohamed", "👨 محمد"], ["duha", "👩 ضحي"]].map(([k, l]) => E("button", {
      key: k, onClick: () => pick(k),
      style: { flex: 1, maxWidth: 150, background: T.card, color: "#e2e8f0", border: `1px solid ${T.bdr}`, borderRadius: 14, padding: "20px 8px", fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "'Cairo',sans-serif" }
    }, l)))
  );
  return E(MealPlannerInner, { key: who, sfx: who === "duha" ? "_duha" : "" });
}
function MealPlannerInner({ sfx }) {
  const [plan, setPlan] = useState(() => ld("meals_log_v1" + sfx, {}));
  const [cal, setCal] = useState(() => ld("meals_cal_v1" + sfx, {}));
  const [weekOffset, setWeekOffset] = useState(0);
  const [planLoading, setPlanLoading] = useState(false);
  const [aiMealPlan, setAiMealPlan] = useState(() => ld("meals_ai_plan_v1" + sfx, ""));
  useEffect(() => sv("meals_log_v1" + sfx, plan), [plan]);

  // ترحيل تلقائي لأي بيانات قديمة كانت متسجلة باسم اليوم بس (زي "السبت") لتاريخ الأسبوع الحالي الحقيقي، مرة واحدة، عشان ميضيعش اللي كان مسجل قبل كده
  useEffect(() => {
    if (sfx) return;
    const oldPlan = ld("meal_plan_v1", null);
    const oldCal = ld("meal_plan_cal_v1", null);
    const thisWeek = weekDatesFor(0);
    if (oldPlan && MEAL_DAYS.some(day => oldPlan[day])) {
      setPlan(p => {
        const n = { ...p };
        MEAL_DAYS.forEach((day, i) => { if (oldPlan[day] && !n[thisWeek[i]]) n[thisWeek[i]] = oldPlan[day]; });
        sv("meals_log_v1" + sfx, n);
        return n;
      });
    }
    if (oldCal && MEAL_DAYS.some(day => oldCal[day])) {
      setCal(c => {
        const n = { ...c };
        MEAL_DAYS.forEach((day, i) => { if (oldCal[day] && !n[thisWeek[i]]) n[thisWeek[i]] = oldCal[day]; });
        sv("meals_cal_v1" + sfx, n);
        return n;
      });
    }
  }, []);

  const dates = weekDatesFor(weekOffset);
  const setCell = (date, key, val) => setPlan(p => ({ ...p, [date]: { ...(p[date] || {}), [key]: val } }));

  const calcCalories = async date => {
    const d = plan[date] || {};
    const parts = MEAL_COLS.filter(([k]) => k !== "notes").filter(([k]) => (d[k] || "").trim()).map(([k, l]) => `${l}: ${d[k]}`);
    if (parts.length === 0) return;
    setCal(c => ({ ...c, [date]: { ...(c[date] || {}), loading: true } }));
    try {
      const prompt = "أنت خبير تغذية بترد بالعربية المصرية العامية. هدّيلك وجبات يوم واحد، احسب تقريبًا السعرات الحرارية (كالوري) لكل وجبة وبعدين اكتب إجمالي اليوم كرقم واضح في آخر سطر بالشكل ده بالظبط: \"الإجمالي: XXXX سعر حراري\". خليك مختصر (سطر أو سطرين لكل وجبة بس).\n\n" + parts.join("\n");
      const res = await geminiText(prompt);
      const txt = res || "معرفتش أحسب دلوقتي، جرب تاني.";
      const m = txt.match(/الإجمالي:\s*([\d,]+)/);
      const total = m ? m[1].replace(/,/g, "") : "";
      const next = { text: txt, total, loading: false };
      setCal(c => { const n = { ...c, [date]: next }; sv("meals_cal_v1" + sfx, n); return n; });
    } catch (e) {
      setCal(c => { const n = { ...c, [date]: { text: "حصل خطأ، جرب تاني.", total: "", loading: false } }; sv("meals_cal_v1" + sfx, n); return n; });
    }
  };

  const weekTotal = dates.reduce((s, dt) => s + (+((cal[dt] && cal[dt].total) || 0)), 0);

  // ── ملخص الشهر: كل الأيام اللي ليها سعرات محسوبة ضمن الشهر الحالي، مهما كان أسبوعها
  const monthKeyNow = DK().slice(0, 7);
  const monthDays = Object.keys(cal).filter(dt => dt.startsWith(monthKeyNow) && cal[dt] && cal[dt].total);
  const monthTotal = monthDays.reduce((s, dt) => s + (+cal[dt].total || 0), 0);
  const monthAvg = monthDays.length ? Math.round(monthTotal / monthDays.length) : 0;

  // ── ربط بجدول وزن محمد (نفس تاريخ اليوم) عشان تشوف الأكل والوزن مع بعض
  const weightEntries = sfx ? [] : ld("mh_weight_v1", []);
  const linkedRows = [...weightEntries].sort((a, b) => a.date.localeCompare(b.date)).slice(-10).reverse().map(w => ({
    date: w.date, weight: w.weight, cal: cal[w.date] ? cal[w.date].total : null
  }));

  const generateMealPlan = async () => {
    setPlanLoading(true);
    try {
      const sortedW = [...weightEntries].sort((a, b) => a.date.localeCompare(b.date));
      const lastW = sortedW[sortedW.length - 1];
      const firstW = sortedW[0];
      // ملحوظة: 85 كجم هو نفس الهدف المحدد في تاب الصحة بتاع محمد — لو اتغير هناك يتغير هنا كمان
      const goalW = 85;
      const weightLine = lastW
        ? `وزنه الحالي ${lastW.weight} كجم${firstW && firstW !== lastW ? ` (كان ${firstW.weight} كجم بتاريخ ${firstW.date})` : ""}، وهدفه الوصول لحوالي ${goalW} كجم`
        : "مفيش بيانات وزن مسجلة دلوقتي";
      const monthLine = monthDays.length ? `متوسط سعراته الفعلي في آخر ${monthDays.length} يوم اتسجلوا: حوالي ${monthAvg} سعر حراري في اليوم.` : "";
      const prompt = "أنت أخصائي تغذية مصري. اعمل خطة أكل أسبوعية (فطار وغداء وعشاء) لشخص عايش في مصر، بمنتجات مصرية عادية ومتوفرة في أي سوبر ماركت أو سوق بلدي، وميزانية معقولة. " + weightLine + ". " + monthLine + " لو في أي بديل للحوم أو الفراخ لأنها غالية، اقترح بدايل رخيصة وغنية بالبروتين زي العدس الأسمر، الترمس، الفول، البيض، الزبادي، الجبن القريش. اكتب الخطة بشكل عملي ومختصر يوم بيوم (السبت للجمعة)، وحط تقدير سعرات تقريبي جنب كل وجبة. رد بالعربية المصرية، ونقط واضحة بدون إطالة.";
      const res = await geminiText(prompt);
      const txt = res || "معرفتش أعمل الخطة دلوقتي، جرب تاني.";
      setAiMealPlan(txt);
      sv("meals_ai_plan_v1" + sfx, txt);
    } catch (e) {
      setAiMealPlan("حصل خطأ في الاتصال، جرب تاني.");
    }
    setPlanLoading(false);
  };

  const weekNavBtn = {
    background: "none", border: `1px solid ${T.bdr}`, borderRadius: 8, color: "#94a3b8",
    fontSize: 11, padding: "7px 10px", cursor: "pointer", fontFamily: "'Cairo',sans-serif"
  };

  return E("div", { style: { padding: "13px" } },
    E("div", { style: S.sub }, "🍽️ تنظيم الوجبات"),
    E("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 } },
      E("button", { onClick: () => setWeekOffset(o => o - 1), style: weekNavBtn }, "‹ الأسبوع اللي فات"),
      E("span", { style: { fontSize: 11, fontWeight: 700, color: "#94a3b8" } }, weekOffset === 0 ? "📍 الأسبوع الحالي" : (dates[0] + " → " + dates[6])),
      E("button", { onClick: () => setWeekOffset(o => Math.min(0, o + 1)), disabled: weekOffset >= 0, style: { ...weekNavBtn, opacity: weekOffset >= 0 ? 0.4 : 1 } }, "الأسبوع الجاي ›")
    ),
    MEAL_DAYS.map((day, i) => {
      const date = dates[i];
      const d = plan[date] || {};
      const c = cal[date] || {};
      return E("div", { key: date, style: { ...S.card(), marginBottom: 10 } },
        E("div", { style: { fontSize: 13, fontWeight: 900, color: T.orange, marginBottom: 8 } }, "📅 " + day + "  ·  " + date),
        MEAL_COLS.map(([k, l]) => E("div", { key: k, style: { marginBottom: 7 } },
          E("div", { style: { fontSize: 10, color: "#4a6080", marginBottom: 3 } }, l),
          E("input", {
            type: "text", value: d[k] || "", placeholder: "اكتب هنا...",
            onChange: e => setCell(date, k, e.target.value),
            style: { ...S.inp, marginBottom: 0, fontSize: 12 }
          }))),
        E("button", {
          onClick: () => calcCalories(date), disabled: c.loading,
          style: { width: "100%", marginTop: 4, padding: "9px", background: "#f59e0b22", border: "1px solid #f59e0b55", borderRadius: 9, color: "#f59e0b", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Cairo',sans-serif", opacity: c.loading ? 0.6 : 1 }
        }, c.loading ? "بيحسب..." : "🔥 احسب السعرات بالـ AI"),
        c.text && E("div", { style: { marginTop: 8, background: "#0f1a2a", border: "1px solid #f59e0b33", borderRadius: 9, padding: "9px 10px" } },
          E("div", { style: { fontSize: 11, color: "#c7d3e6", lineHeight: 1.8, whiteSpace: "pre-wrap" } }, c.text)),
        c.total && E("div", { style: { display: "flex", justifyContent: "space-between", marginTop: 8, padding: "8px 10px", background: "#f59e0b11", borderRadius: 9, border: "1px solid #f59e0b33" } },
          E("span", { style: { fontSize: 11, color: "#4a6080" } }, "إجمالي سعرات اليوم"),
          E("span", { style: { fontSize: 14, fontWeight: 900, color: "#f59e0b" } }, c.total, " سعر حراري")));
    }),
    weekTotal > 0 && E("div", { style: { ...S.card("#10b98122"), border: `2px solid ${T.green}`, textAlign: "center", marginTop: 4, marginBottom: 12 } },
      E("div", { style: { fontSize: 11, color: T.green, marginBottom: 4 } }, "إجمالي سعرات الأسبوع (الأيام المحسوبة)"),
      E("div", { style: { fontSize: 24, fontWeight: 900, color: T.green } }, fmt(weekTotal), " سعر حراري")),

    E(Fold, { title: "📊 ملخص الشهر", defaultOpen: false, badge: monthDays.length ? monthAvg + " سعر/يوم" : null },
      monthDays.length === 0
        ? E("div", { style: { textAlign: "center", color: "#4a6080", fontSize: 12, padding: 10 } }, "لسه معندكش أيام محسوبة السعرات فيها الشهر ده")
        : E(React.Fragment, null,
          E("div", { style: { ...S.row, marginBottom: 6 } }, E("span", { style: { fontSize: 12, color: "#94a3b8" } }, "عدد الأيام المسجلة"), E("span", { style: { fontSize: 13, fontWeight: 900, color: "#e2e8f0" } }, monthDays.length, " يوم")),
          E("div", { style: { ...S.row, marginBottom: 6 } }, E("span", { style: { fontSize: 12, color: "#94a3b8" } }, "إجمالي سعرات الشهر"), E("span", { style: { fontSize: 13, fontWeight: 900, color: T.orange } }, fmt(monthTotal), " سعر حراري")),
          E("div", { style: S.row }, E("span", { style: { fontSize: 12, color: "#94a3b8" } }, "متوسط اليوم"), E("span", { style: { fontSize: 13, fontWeight: 900, color: T.orange } }, fmt(monthAvg), " سعر حراري"))
        )
    ),

    weightEntries.length > 0 && E(Fold, { title: "🔗 مربوط بجدول وزنك", defaultOpen: false },
      E("div", { style: { fontSize: 10, color: "#4a6080", marginBottom: 8 } }, "آخر 10 قراءات وزن مع سعرات نفس اليوم (لو متسجلة)"),
      linkedRows.map(r => E("div", { key: r.date, style: { display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${T.bdr}` } },
        E("span", { style: { fontSize: 11, color: "#94a3b8" } }, r.date),
        E("span", { style: { fontSize: 11, color: "#e2e8f0", fontWeight: 700 } }, r.weight, " كجم"),
        E("span", { style: { fontSize: 11, fontWeight: 700, color: r.cal ? T.orange : "#3a4a65" } }, r.cal ? r.cal + " سعر حراري" : "مفيش أكل مسجل")
      ))
    ),

    E(Fold, { title: "🥗 اعملّي خطة أكل مناسبة ليا", defaultOpen: false },
      E("div", { style: { fontSize: 11, color: "#4a6080", marginBottom: 10, lineHeight: 1.7 } }, "خطة أسبوعية بمنتجات مصرية عادية، مبنية على وزنك وهدفك المسجلين في تاب الصحة"),
      E("button", {
        onClick: generateMealPlan, disabled: planLoading,
        style: { ...S.btn(T.green), opacity: planLoading ? 0.6 : 1 }
      }, planLoading ? "⏳ بيجهز الخطة..." : "🥗 اعملّي خطة أكل ليا"),
      aiMealPlan && E("div", { style: { marginTop: 10, fontSize: 12, lineHeight: 1.9, color: "#cbd5e1", whiteSpace: "pre-wrap" } }, aiMealPlan)
    )
  );
}


function FinancialPlanSection({ income, fixedItems, homeSpend, carSpend, duhaSpend, fuelSpend, balance, mk, monthly, entries, indExtra, deletedXl }) {
  const storageKey = "plan_ai_" + mk;
  const [plan, setPlan] = useState(() => ld(storageKey + "_plan", ""));
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [chatLog, setChatLog] = useState(() => ld(storageKey + "_chat", []));
  const [q, setQ] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // متوسط فعلي من أول السنة لحد الشهر الحالي (مش بس الشهر ده) — عشان الخطة تبقى مبنية على نمط حقيقي
  const ytd = useMemo(() => {
    const dxl = deletedXl || [];
    const ent = entries || [];
    const year = mk.slice(0, 4);
    const monthKeysAll = [...new Set([...Object.keys(MONTHLY_PRESET), ...Object.keys(monthly || {}), ...ent.map(e => finKey(e.date))])];
    const months = monthKeysAll.filter(k => /^\d{4}-\d{2}$/.test(k) && k.slice(0, 4) === year && k <= mk).sort();
    if (!months.length) return null;
    const indS = indriveSummary(indExtra || []);
    let incomeSum = 0, homeSum = 0, carSum = 0, duhaSum = 0, fuelSum = 0;
    months.forEach(k => {
      const p = MONTHLY_PRESET[k] || {};
      const u = (monthly || {})[k] || {};
      const mn = x => +((u[x] !== undefined ? u[x] : p[x]) || 0) || 0;
      const im = indS[k];
      incomeSum += mn("salary") + mn("transport") + mn("waste") + mn("old") + mn("deals") + mn("eid") + mn("dohaa") + mn("magdy") + (im ? im.rev : 0);
      const mHH = [...HOME_DATA.filter(e => !dxl.includes(e.id)), ...ent.filter(e => e.type === "home")].filter(e => finKey(e.date) === k).filter(e => e.paidBy !== "doha" && e.paidBy !== "tahwish");
      const mCC = [...CAR_DATA, ...ent.filter(e => e.type === "car")].filter(e => finKey(e.date) === k).filter(e => e.paidBy !== "doha" && e.paidBy !== "tahwish");
      const mDD = [...DUHA_DATA, ...ent.filter(e => e.type === "duha")].filter(e => finKey(e.date) === k).filter(e => e.paidBy === "mohamed");
      homeSum += SUM(mHH);
      carSum += SUM(mCC);
      duhaSum += SUM(mDD);
      fuelSum += im ? (im.petrol || 0) : 0;
    });
    const n = months.length;
    return { months: n, avgIncome: Math.round(incomeSum / n), avgHome: Math.round(homeSum / n), avgCar: Math.round(carSum / n), avgDuha: Math.round(duhaSum / n), avgFuel: Math.round(fuelSum / n) };
  }, [entries, monthly, indExtra, deletedXl, mk]);

  const buildContext = () => {
    const fixedLines = fixedItems.filter(([, v]) => v > 0).map(([l, v]) => `${l}: ${v} ج`).join("\n");
    const fixedTotal = fixedItems.reduce((s, [, v]) => s + v, 0);

    // أرصدة القروض المتبقية فعليًا (مش بس القسط الشهري)
    const { salfaRem, aptRem } = calcLoans(monthly || {});
    const loansLine = `متبقي من السلفة: ${Math.round(salfaRem)} ج\nمتبقي من قسط الشقة: ${Math.round(aptRem)} ج`;

    // حالة التحويش: الباقي المتاح + الاحتياجات المسجلة له
    const dxl = deletedXl || [];
    const ent = entries || [];
    const monthKeysAll = [...new Set([...Object.keys(MONTHLY_PRESET), ...Object.keys(monthly || {}), ...ent.map(e => finKey(e.date))])];
    const allH = [...HOME_DATA.filter(e => !dxl.includes(e.id)), ...ent.filter(e => e.type === "home")];
    const allD = [...DUHA_DATA, ...ent.filter(e => e.type === "duha")];
    const allC = [...CAR_DATA, ...ent.filter(e => e.type === "car")];
    const spentTahwish = SUM(allH.filter(e => e.paidBy === "tahwish")) + SUM(allD.filter(e => e.paidBy === "tahwish")) + SUM(allC.filter(e => e.paidBy === "tahwish"));
    const grandTahwish = monthKeysAll.filter(k => /^\d{4}-\d{2}$/.test(k)).reduce((s, k) => {
      const p = MONTHLY_PRESET[k] || {}; const u = (monthly || {})[k] || {};
      const presetT = +((u.tahwish !== undefined ? u.tahwish : p.tahwish) || 0) || 0;
      const manualT = SUM(ent.filter(e => e.cat === "saving" && finKey(e.date) === k));
      return s + presetT + manualT;
    }, 0);
    const netTahwish = Math.max(0, grandTahwish - spentTahwish);
    const tahwishNeeds = ld("tahwish_needs_v1", []);
    const tahwishNeedsLine = tahwishNeeds.length ? tahwishNeeds.map(n => `${n.name} (مطلوب ${n.target} ج)`).join("، ") : "مفيش احتياجات مسجلة";

    // احتياجات ومهام مفتوحة (لسه معمولتش) من العربية/الشقة/أهدافه/أهداف ضحي
    const openCar = ld("car_needs_v2", []).filter(g => !g.done && g.name).map(g => g.name);
    const openHome = ld("home_needs_v1", []).filter(g => !g.done && g.t).map(g => g.t);
    const openMohamed = ld("mh_gl5", []).filter(g => !g.done && g.t).map(g => g.t);
    const openDoha = ld("dh_gl", []).filter(g => !g.done && g.t).map(g => g.t);
    const openLine = [
      openCar.length ? "العربية: " + openCar.join("، ") : null,
      openHome.length ? "الشقة: " + openHome.join("، ") : null,
      openMohamed.length ? "أهدافه: " + openMohamed.join("، ") : null,
      openDoha.length ? "أهداف ضحي: " + openDoha.join("، ") : null
    ].filter(Boolean).join("\n") || "مفيش احتياجات/أهداف مفتوحة مسجلة";

    const ytdLine = ytd ? `متوسط شهري فعلي من أول السنة لحد دلوقتي (${ytd.months} شهر): الدخل ${ytd.avgIncome} ج، البيت والأكل ${ytd.avgHome} ج، العربية ${ytd.avgCar} ج، ضحي ${ytd.avgDuha} ج، البنزين ${ytd.avgFuel} ج` : "";

    return `الدخل الكلي الشهر ده: ${income} ج
الالتزامات الثابتة الشهرية (لازم تتدفع مهما حصل):
${fixedLines || "مفيش التزامات ثابتة مسجلة"}
إجمالي الثوابت: ${fixedTotal} ج
${loansLine}
مصاريف البيت والأكل الفعلية الشهر ده لحد دلوقتي: ${homeSpend} ج
مصاريف صيانة العربية الشهر ده لحد دلوقتي: ${carSpend} ج
بنزين (تقدير من نشاط السواقة المسجل، ممكن يكون جزء بس من إجمالي البنزين الشخصي): ${fuelSpend} ج
مصاريف مرتبطة بضحي الشهر ده لحد دلوقتي: ${duhaSpend} ج
${ytdLine}
الرصيد المتوقع يفضل آخر الشهر لو الوضع فضل زي ما هو: ${balance} ج
الباقي المتاح من التحويش دلوقتي: ${Math.round(netTahwish)} ج
الاحتياجات اللي بيحوش لها من التحويش: ${tahwishNeedsLine}
احتياجات ومهام مفتوحة لسه معمولتش:
${openLine}`;
  };

  const runPlan = async () => {
    setLoading(true);
    setErr("");
    try {
      const prompt = "أنت مستشار مالي شخصي بترد بالعربية المصرية بأسلوب عملي ومباشر. عندك بيانات مالية حقيقية لشخص، اعملّه خطة يعيش بيها الشهر ده: قسّم دخله على الالتزامات الثابتة الأول (وخد بالك من رصيد القروض المتبقي)، بعدين اقترح حدود معقولة للمصاريف المتغيرة (أكل، عربية، بنزين) بناءً على اللي بيصرفه فعلاً ومتوسطه من أول السنة، وراعي الاحتياجات المفتوحة والتحويش المخصص لاحتياجات معينة، واقترح مبلغ واقعي يقدر يوفره/يحوّشه من غير ما يضغط نفسه. اكتب الخطة كنقط مرقمة قصيرة وواضحة، ومتخترعش أي رقم مش موجود في البيانات دي:\n" + buildContext();
      const res = await geminiText(prompt);
      const txt = res || "معرفتش أعمل الخطة دلوقتي، جرب تاني بعد شوية.";
      setPlan(txt);
      sv(storageKey + "_plan", txt);
    } catch (e) {
      setErr("حصل خطأ في الاتصال بالذكاء الاصطناعي، جرب تاني.");
    }
    setLoading(false);
  };

  const ask = async () => {
    const question = q.trim();
    if (!question || chatLoading) return;
    const newLog = [...chatLog, { role: "user", text: question }];
    setChatLog(newLog);
    setQ("");
    setChatLoading(true);
    try {
      const prompt = "أنت مستشار مالي شخصي، جاوب بالعربية المصرية باختصار وبشكل عملي على سؤال المستخدم عن خطته المالية دي، بالاعتماد على بياناته دي بس:\n" + buildContext() + (plan ? ("\n\nالخطة اللي عملتهالها قبل كده:\n" + plan) : "") + "\n\nسؤال المستخدم: " + question;
      const res = await geminiText(prompt);
      const finalLog = [...newLog, { role: "ai", text: res || "معرفتش أجاوب دلوقتي، جرب تاني." }];
      setChatLog(finalLog);
      sv(storageKey + "_chat", finalLog.slice(-20));
    } catch (e) {
      setChatLog([...newLog, { role: "ai", text: "حصل خطأ، جرب تاني." }]);
    }
    setChatLoading(false);
  };

  return /*#__PURE__*/React.createElement(React.Fragment, null,
    /*#__PURE__*/React.createElement("div", { style: { ...S.sub, marginTop: 14 } }, "🧠 خطة الشهر بالذكاء الاصطناعي"),
    /*#__PURE__*/React.createElement("div", { style: { background: "#0f1a2a", borderRadius: 10, padding: "12px 13px", border: "1px solid #1a2840", marginBottom: 14 } },
      /*#__PURE__*/React.createElement("button", {
        onClick: runPlan,
        disabled: loading,
        style: { ...S.btn(T.purple), opacity: loading ? 0.6 : 1 }
      }, loading ? "⏳ بيحسب..." : "🧠 اعملّي خطة موفّرة للشهر ده"),
      err && /*#__PURE__*/React.createElement("div", { style: { color: T.red, fontSize: 11, marginTop: 8 } }, err),
      plan && /*#__PURE__*/React.createElement("div", { style: { marginTop: 10, fontSize: 12.5, lineHeight: 1.9, color: "#cbd5e1", whiteSpace: "pre-wrap" } }, plan),
      /*#__PURE__*/React.createElement("div", { style: { marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.bdr}` } },
        E(Fold, { title: "💬 اسأل عن خطتك", defaultOpen: false, badge: chatLog.length ? chatLog.length + " رسالة" : null },
          chatLog.length > 0 && /*#__PURE__*/React.createElement("div", { style: { marginBottom: 10, display: "flex", flexDirection: "column", gap: 8 } },
            chatLog.map((m, i) => /*#__PURE__*/React.createElement("div", {
              key: i,
              style: {
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                background: m.role === "user" ? T.blue : "#1a2840",
                color: "#fff", borderRadius: 10, padding: "7px 11px", fontSize: 12, maxWidth: "88%", lineHeight: 1.7
              }
            }, m.text))
          ),
          /*#__PURE__*/React.createElement("div", { style: { display: "flex", gap: 6 } },
            /*#__PURE__*/React.createElement("input", {
              type: "text",
              placeholder: "مثلاً: أقدر أوفر أكتر إزاي؟",
              value: q,
              onChange: e => setQ(e.target.value),
              onKeyDown: e => { if (e.key === "Enter") ask(); },
              style: { ...S.inp, marginBottom: 0, flex: 1, fontSize: 12 }
            }),
            /*#__PURE__*/React.createElement("button", {
              onClick: ask,
              disabled: chatLoading,
              style: { background: T.blue, color: "#fff", border: "none", borderRadius: 8, padding: "0 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Cairo',sans-serif", opacity: chatLoading ? 0.6 : 1 }
            }, chatLoading ? "..." : "ابعت")
          )
        )
      )
    )
  );
}

async function openRouterAnalyze(b64, mime, prompt) {
  const body = {
    contents: [{
      parts: [
        { inline_data: { mime_type: mime || "image/jpeg", data: b64 } },
        { text: prompt }
      ]
    }]
  };
  const res = await fetch(WORKER_URL + "/gemini", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "مش قادر أحلل دلوقتي";
}

async function analyzeBodyPhoto(base64Data, mimeType) {
  return openRouterAnalyze(
    base64Data,
    mimeType,
    "أنت مساعد لياقة بدنية. انظر للصورة أمامك فقط. اكتب 3 جمل قصيرة بالعربية فقط عن شكل الجسم المرئي في الصورة (الوجه، البطن، الجسم). ممنوع الكتابة بأي لغة أخرى غير العربية. ممنوع اختراع معلومات غير موجودة في الصورة."
  );
}

async function compareBodyPhotos(b64A, b64B, weightA, weightB, mimeA, mimeB) {
  const diff = Math.abs(weightA - weightB).toFixed(1);
  const body = {
    contents: [{
      parts: [
        { inline_data: { mime_type: mimeA || "image/jpeg", data: b64A } },
        { inline_data: { mime_type: mimeB || "image/jpeg", data: b64B } },
        { text: `قارن بين الصورتين. الصورة الأولى وزنها ${weightA} كجم والثانية ${weightB} كجم، الفرق ${diff} كجم. وضح الفروق المرئية بشكل إيجابي ومشجع. الرد بالعربية في 4-5 جمل.` }
      ]
    }]
  };
  const res = await fetch(WORKER_URL + "/gemini", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "مش قادر أقارن دلوقتي";
}

async function uploadToCloudinary(file) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", CLD_PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLD_CLOUD}/image/upload`, { method: "POST", body: fd });
  const data = await res.json();
  return data.secure_url;
}

// ══════════════════════════════════════════════════════════════
// PERIOD TRACKER — متابعة البريود (خاص بضحي)
// ══════════════════════════════════════════════════════════════
function PeriodTracker() {
  const [log, setLog] = useState(() => ld("dh_period_log", []));
  useEffect(() => sv("dh_period_log", log), [log]);
  const today = DK();
  const openCycle = log.length > 0 && !log[log.length - 1].end ? log[log.length - 1] : null;
  const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);

  const [backdate, setBackdate] = useState(today);
  const startOn = dateStr => { if (!openCycle && dateStr) setLog(l => [...l, { id: Date.now(), start: dateStr, end: null }].sort((a, b) => a.start.localeCompare(b.start))); };
  const endCurrent = () => { if (openCycle) setLog(l => l.map((c, i) => i === l.length - 1 ? { ...c, end: today } : c)); };
  const delCycle = id => setLog(l => l.filter(c => c.id !== id));

  return /*#__PURE__*/React.createElement(React.Fragment, null,
    /*#__PURE__*/React.createElement("div", { style: S.sub }, "🩸 متابعة البريود"),
    /*#__PURE__*/React.createElement("div", { style: S.card() },
      openCycle
        ? /*#__PURE__*/React.createElement(React.Fragment, null,
            /*#__PURE__*/React.createElement("div", { style: { fontSize: 12, color: "#e2e8f0", marginBottom: 10 } }, "بدأت يوم ", /*#__PURE__*/React.createElement("b", null, openCycle.start), " — لسه مستمرة"),
            /*#__PURE__*/React.createElement("button", {
              onClick: endCurrent,
              style: { ...S.btn(T.green), width: "auto", padding: "9px 16px" }
            }, "✅ خلصت النهاردة")
          )
        : /*#__PURE__*/React.createElement(React.Fragment, null,
            /*#__PURE__*/React.createElement("button", {
              onClick: () => startOn(today),
              style: { ...S.btn("#ec4899"), width: "auto", padding: "9px 16px" }
            }, "🔴 بدأت النهاردة"),
            /*#__PURE__*/React.createElement("div", { style: { display: "flex", gap: 6, alignItems: "center", marginTop: 10 } },
              /*#__PURE__*/React.createElement("span", { style: { fontSize: 11, color: "#4a6080" } }, "أو نسيتي تسجليها؟ اختاري اليوم اللي بدأت فيه:"),
            ),
            /*#__PURE__*/React.createElement("div", { style: { display: "flex", gap: 6, marginTop: 6 } },
              /*#__PURE__*/React.createElement("input", {
                type: "date",
                value: backdate,
                max: today,
                onChange: e => setBackdate(e.target.value),
                style: { ...S.inp, marginBottom: 0, flex: 1, fontSize: 12 }
              }),
              /*#__PURE__*/React.createElement("button", {
                onClick: () => startOn(backdate),
                style: { background: T.blue, color: "#fff", border: "none", borderRadius: 8, padding: "0 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Cairo',sans-serif" }
              }, "تسجيل")
            )
          ),
      log.length > 0 && /*#__PURE__*/React.createElement("div", { style: { marginTop: 14, paddingTop: 12, borderTop: `1px solid ${T.bdr}` } },
        /*#__PURE__*/React.createElement("div", { style: { fontSize: 11, color: "#4a6080", marginBottom: 8, fontWeight: 700 } }, "السجل"),
        log.slice().reverse().map((c, i) => {
          const originalIndex = log.length - 1 - i;
          const prevCycle = originalIndex > 0 ? log[originalIndex - 1] : null;
          const cycleLength = prevCycle ? daysBetween(prevCycle.start, c.start) : null;
          const duration = c.end ? daysBetween(c.start, c.end) + 1 : null;
          return /*#__PURE__*/React.createElement("div", {
            key: c.id,
            style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "7px 0", borderBottom: `1px solid ${T.bdr}` }
          },
            /*#__PURE__*/React.createElement("div", { style: { fontSize: 11, color: "#e2e8f0", lineHeight: 1.8 } },
              "بدأت " + c.start + (c.end ? " — انتهت " + c.end + " (" + duration + " يوم)" : " (مستمرة)"),
              cycleLength != null && /*#__PURE__*/React.createElement("div", { style: { color: "#4a6080", fontSize: 10 } }, "المسافة من الدورة اللي فاتت: " + cycleLength + " يوم")
            ),
            /*#__PURE__*/React.createElement("span", {
              onClick: () => delCycle(c.id),
              style: { fontSize: 13, color: T.red, cursor: "pointer", padding: "0 4px", opacity: 0.6 }
            }, "×")
          );
        })
      )
    )
  );
}

function WeightTracker({ storeKey, startWeight, goalWeight, name, color }) {
  const [entries, setEntries] = useState(() => ld(storeKey, [
    { date: "2026-06-01", weight: startWeight }
  ]));
  const [newWeight, setNewWeight] = useState("");
  const [newDate, setNewDate] = useState(DK());
  const [uploading, setUploading] = useState(false);
  const [cmpA, setCmpA] = useState(null);
  const [cmpB, setCmpB] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisText, setAnalysisText] = useState("");
  const [compareText, setCompareText] = useState("");
  // ── تحليل سعرات طبق أكل بالـ AI (مستقل عن صور الوزن، مع إمكانية إضافة وصف زي "بيض مقلي")
  const [foodPhoto, setFoodPhoto] = useState(null);
  const [foodFile, setFoodFile] = useState(null);
  const [foodNote, setFoodNote] = useState("");
  const [foodAnalyzing, setFoodAnalyzing] = useState(false);
  const [foodResult, setFoodResult] = useState("");
  function pickFoodPhoto(file) {
    setFoodFile(file);
    setFoodPhoto(URL.createObjectURL(file));
    setFoodResult("");
  }
  async function analyzeFoodPhoto() {
    if (!foodFile) return;
    setFoodAnalyzing(true);
    setFoodResult("");
    try {
      const b64 = await new Promise(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(",")[1]);
        reader.readAsDataURL(foodFile);
      });
      const noteLine = foodNote.trim() ? `\nملحوظة من المستخدم عن مكونات الطبق: ${foodNote.trim()}\nاعتمد على الملحوظة دي في حساب المكونات والسعرات، متجاهلش أي حاجة قالها.` : "";
      const prompt = "انت خبير تغذية. حلل الصورة دي اللي فيها طبق أكل، وقولي بالعربية المصرية باختصار ووضوح:\n1) ايه المكونات اللي شايفها في الطبق\n2) تقدير تقريبي لعدد السعرات الحرارية الكلي (كالوري) للطبق كله\n3) هل الطبق ده صحي ولا لأ، ولو مش صحي اديني نصيحة أو بديل أخف. اديني أفضل تقدير ممكن حتى لو مش هيبقى دقيق 100%، ومتقولش إنك مش قادر تقيّم." + noteLine;
      const txt = await geminiAnalyze(b64, foodFile.type, prompt);
      setFoodResult(txt || "معرفتش أحلل الصورة، جرب تاني.");
    } catch (err) {
      setFoodResult("حصل خطأ: " + err.message);
    }
    setFoodAnalyzing(false);
  }
  const b64Cache = useRef({});

  const isLoadingFromCloud = useRef(false);

  // تحميل من Supabase أول فتح
  useEffect(() => {
    isLoadingFromCloud.current = true;
    cloudLoad(storeKey).then(cloud => {
      if (cloud && cloud.length > 0) {
        setEntries(cloud);
        sv(storeKey, cloud);
      }
      isLoadingFromCloud.current = false;
    });
  }, []);

  // حفظ في localStorage وSupabase — بس مش لما بنحمل من السحابة
  useEffect(() => {
    if (isLoadingFromCloud.current) return;
    sv(storeKey, entries);
    cloudSave(storeKey, entries);
  }, [entries]);

  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const totalLost = first && last ? +(first.weight - last.weight).toFixed(1) : 0;
  const remaining = last ? +(last.weight - goalWeight).toFixed(1) : 0;
  const weeksBetween = first && last ? Math.max(1, (new Date(last.date) - new Date(first.date)) / (7*24*3600*1000)) : 1;
  const ratePerWeek = +(totalLost / weeksBetween).toFixed(2);
  const weeksToGoal = ratePerWeek > 0 ? Math.ceil(remaining / ratePerWeek) : null;
  const goalDate = weeksToGoal ? new Date(Date.now() + weeksToGoal*7*24*3600*1000) : null;
  const goalDateStr = goalDate ? `${goalDate.getDate()}/${goalDate.getMonth()+1}/${goalDate.getFullYear()}` : null;

  // SVG chart
  const W=320, H=120, PAD=30;
  const weights = sorted.map(e => e.weight);
  const minW = Math.min(...weights, goalWeight) - 1;
  const maxW = Math.max(...weights) + 1;
  const toX = i => PAD + (i / Math.max(sorted.length-1,1)) * (W-PAD*2);
  const toY = w => PAD + (1 - (w-minW)/(maxW-minW)) * (H-PAD*2);
  const points = sorted.map((e,i) => `${toX(i)},${toY(e.weight)}`).join(" ");
  const goalY = toY(goalWeight);

  async function handlePhotoUpload(e, entryDate) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      // قراءة base64 محلياً للـ Gemini
      const b64 = await new Promise(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(",")[1]);
        reader.readAsDataURL(file);
      });
      b64Cache.current[entryDate] = { data: b64, mime: file.type };
      // رفع على Cloudinary للحفظ الدائم
      const url = await uploadToCloudinary(file);
      setEntries(prev => prev.map(en => en.date === entryDate ? { ...en, photo: url, photoMime: file.type } : en));
    } catch(err) { alert("فشل رفع الصورة، جرب تاني"); }
    setUploading(false);
  }

  // جلب base64 للتحليل (من الكاش أو fetch من Cloudinary)
  async function getBase64(entry) {
    if (b64Cache.current[entry.date]) return b64Cache.current[entry.date];
    const res = await fetch(entry.photo);
    const blob = await res.blob();
    const data = await new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(",")[1]);
      reader.readAsDataURL(blob);
    });
    const result = { data, mime: entry.photoMime || "image/jpeg" };
    b64Cache.current[entry.date] = result;
    return result;
  }

  // photos with entries
  const photosEntries = [...sorted].reverse().filter(e => e.photo);

  return /*#__PURE__*/React.createElement(React.Fragment, null,
    /*#__PURE__*/React.createElement("div", { style: S.sub }, "⚖️ متابعة الوزن — " + name),

    // كروت ملخص
    /*#__PURE__*/React.createElement("div", { style: { display: "flex", gap: 8, marginBottom: 10 } },
      [["الحالي", last ? last.weight+" كجم" : "-", color],
       ["خسرت", totalLost+" كجم", "#10b981"],
       ["الهدف", goalWeight+" كجم", "#f59e0b"],
       ["متبقي", remaining+" كجم", remaining > 0 ? "#ef4444" : "#10b981"]
      ].map(([lbl,val,c]) => /*#__PURE__*/React.createElement("div", {
        key: lbl, style: { flex:1, background:c+"22", border:"1px solid "+c+"44", borderRadius:10, padding:"8px 4px", textAlign:"center" }
      }, /*#__PURE__*/React.createElement("div", { style:{ fontSize:9, color:c, marginBottom:2 } }, lbl),
         /*#__PURE__*/React.createElement("div", { style:{ fontSize:13, fontWeight:900, color:c } }, val)))
    ),

    // توقع الوصول
    goalDateStr && ratePerWeek > 0 && /*#__PURE__*/React.createElement("div", {
      style: { ...S.card("#10b98111"), border:"1px solid #10b98133", marginBottom:10, textAlign:"center" }
    }, /*#__PURE__*/React.createElement("div", { style:{ fontSize:11, color:"#4a6080" } }, "بالمعدل الحالي ("+ratePerWeek+" كجم/أسبوع)"),
       /*#__PURE__*/React.createElement("div", { style:{ fontSize:13, fontWeight:700, color:T.green, marginTop:4 } }, "هتوصل للهدف تقريباً ", goalDateStr, " 🎯")),

    // منحنى
    sorted.length > 1 && /*#__PURE__*/React.createElement("div", { style:{ ...S.card(), marginBottom:10 } },
      /*#__PURE__*/React.createElement("svg", { width:W, height:H, style:{ display:"block", margin:"0 auto" } },
        /*#__PURE__*/React.createElement("line", { x1:PAD, y1:goalY, x2:W-PAD, y2:goalY, stroke:"#f59e0b44", strokeWidth:1, strokeDasharray:"4" }),
        /*#__PURE__*/React.createElement("text", { x:W-PAD-2, y:goalY-3, fill:"#f59e0b", fontSize:8, textAnchor:"end" }, goalWeight+" هدف"),
        /*#__PURE__*/React.createElement("polyline", { points, fill:"none", stroke:color, strokeWidth:2, strokeLinejoin:"round" }),
        sorted.map((e,i) => /*#__PURE__*/React.createElement(React.Fragment, { key:i },
          /*#__PURE__*/React.createElement("circle", { cx:toX(i), cy:toY(e.weight), r:4, fill:color }),
          /*#__PURE__*/React.createElement("text", { x:toX(i), y:toY(e.weight)-6, fill:"#e2e8f0", fontSize:8, textAnchor:"middle" }, e.weight)
        ))
      )
    ),

    // إضافة قراءة
    /*#__PURE__*/React.createElement("div", { style:{ ...S.card(), marginBottom:10 } },
      /*#__PURE__*/React.createElement("div", { style:{ fontSize:12, color:"#4a6080", marginBottom:6 } }, "أضف قراءة أسبوعية"),
      /*#__PURE__*/React.createElement("div", { style:{ display:"flex", gap:7 } },
        /*#__PURE__*/React.createElement("input", {
          style:{ ...S.inp, marginBottom:0, flex:1 }, type:"number", placeholder:"الوزن (كجم)", inputMode:"decimal",
          value:newWeight, onChange:e => setNewWeight(e.target.value)
        }),
        /*#__PURE__*/React.createElement("input", {
          style:{ ...S.inp, marginBottom:0, flex:1 }, type:"date", value:newDate, onChange:e => setNewDate(e.target.value)
        }),
        /*#__PURE__*/React.createElement("button", {
          onClick:() => {
            const w = parseFloat(newWeight);
            if (!w || !newDate) return;
            setEntries(prev => { const f = prev.filter(e => e.date !== newDate); return [...f, { date:newDate, weight:w }]; });
            setNewWeight("");
          },
          style:{ ...S.btn(color), width:"auto", padding:"9px 14px", marginTop:0 }
        }, "+")
      )
    ),

    // سجل القراءات + رفع صورة لكل قراءة
    /*#__PURE__*/React.createElement("div", { style:{ ...S.card(), marginBottom:10 } },
      /*#__PURE__*/React.createElement("div", { style:{ fontSize:12, color:"#4a6080", marginBottom:6 } }, "سجل القراءات"),
      uploading && /*#__PURE__*/React.createElement("div", { style:{ fontSize:11, color:T.orange, marginBottom:6 } }, "⏳ جاري رفع الصورة..."),
      [...sorted].reverse().map((e,i) => /*#__PURE__*/React.createElement("div", {
        key:i, style:{ padding:"8px 0", borderBottom:"1px solid "+T.bdr }
      },
        /*#__PURE__*/React.createElement("div", { style:{ display:"flex", justifyContent:"space-between", alignItems:"center" } },
          /*#__PURE__*/React.createElement("span", { style:{ fontSize:12, color:"#8fa3c4" } }, e.date),
          /*#__PURE__*/React.createElement("span", { style:{ fontSize:13, fontWeight:700, color } }, e.weight, " كجم"),
          /*#__PURE__*/React.createElement("div", { style:{ display:"flex", gap:6, alignItems:"center" } },
            /*#__PURE__*/React.createElement("label", { style:{ fontSize:11, color:"#4a6080", cursor:"pointer" } },
              e.photo ? "📷 تغيير" : "📷 صورة",
              /*#__PURE__*/React.createElement("input", { type:"file", accept:"image/*", style:{ display:"none" }, onChange:ev => handlePhotoUpload(ev, e.date) })
            ),
            /*#__PURE__*/React.createElement("span", {
              onClick:() => setEntries(prev => prev.filter(x => x.date !== e.date)),
              style:{ fontSize:14, color:T.red, cursor:"pointer", opacity:0.6 }
            }, "×")
          )
        ),
        e.photo && /*#__PURE__*/React.createElement(React.Fragment, null,
          /*#__PURE__*/React.createElement("img", { src:e.photo, style:{ width:"100%", borderRadius:8, marginTop:6, maxHeight:200, objectFit:"cover" } }),
          /*#__PURE__*/React.createElement("button", {
            onClick: async () => {
              setAnalyzing(true); setAnalysisText("");
              try {
                const {data, mime} = await getBase64(e);
                const txt = await analyzeBodyPhoto(data, mime);
                setAnalysisText(txt);
              } catch(err) { setAnalysisText("حصل خطأ: " + err.message); }
              setAnalyzing(false);
            },
            style: { ...S.btn("#8b5cf6"), marginTop:6, fontSize:11, padding:"7px 12px" }
          }, analyzing ? "⏳ جاري التحليل..." : "🤖 حلل الصورة بـ AI"),
          analysisText && /*#__PURE__*/React.createElement("div", {
            style: { background:"#8b5cf622", border:"1px solid #8b5cf644", borderRadius:8, padding:10, marginTop:6, fontSize:12, color:"#e2e8f0", lineHeight:1.6 }
          }, analysisText)
        )
      ))
    ),

    // مقارنة صورتين
    photosEntries.length >= 2 && /*#__PURE__*/React.createElement("div", { style:{ ...S.card(), marginBottom:10 } },
      /*#__PURE__*/React.createElement("div", { style:{ fontSize:13, fontWeight:700, marginBottom:8 } }, "📸 قارن بين صورتين"),
      /*#__PURE__*/React.createElement("div", { style:{ display:"flex", gap:7, marginBottom:8 } },
        [["صورة أولى", cmpA, setCmpA], ["صورة تانية", cmpB, setCmpB]].map(([lbl, val, setter]) =>
          /*#__PURE__*/React.createElement("div", { key:lbl, style:{ flex:1 } },
            /*#__PURE__*/React.createElement("div", { style:{ fontSize:10, color:"#4a6080", marginBottom:4 } }, lbl),
            /*#__PURE__*/React.createElement("select", {
              style:{ ...S.inp, marginBottom:0, fontSize:11 },
              value: val || "",
              onChange: e => setter(e.target.value)
            },
              /*#__PURE__*/React.createElement("option", { value:"" }, "اختار تاريخ"),
              photosEntries.map(e => /*#__PURE__*/React.createElement("option", { key:e.date, value:e.date }, e.date+" ("+e.weight+" كجم)"))
            )
          )
        )
      ),
      cmpA && cmpB && cmpA !== cmpB && /*#__PURE__*/React.createElement(React.Fragment, null,
        /*#__PURE__*/React.createElement("div", { style:{ display:"flex", gap:8 } },
          [cmpA, cmpB].map(d => {
            const en = photosEntries.find(e => e.date === d);
            return en ? /*#__PURE__*/React.createElement("div", { key:d, style:{ flex:1, textAlign:"center" } },
              /*#__PURE__*/React.createElement("img", { src:en.photo, style:{ width:"100%", borderRadius:8, objectFit:"cover", maxHeight:250 } }),
              /*#__PURE__*/React.createElement("div", { style:{ fontSize:11, color:"#8fa3c4", marginTop:4 } }, d),
              /*#__PURE__*/React.createElement("div", { style:{ fontSize:13, fontWeight:700, color } }, en.weight, " كجم")
            ) : null;
          })
        ),
        /*#__PURE__*/React.createElement("div", { style:{ textAlign:"center", marginTop:8 } },
          (() => {
            const eA = photosEntries.find(e => e.date === cmpA);
            const eB = photosEntries.find(e => e.date === cmpB);
            if (!eA || !eB) return null;
            const diff = Math.abs(eA.weight - eB.weight).toFixed(1);
            return /*#__PURE__*/React.createElement(React.Fragment, null,
              /*#__PURE__*/React.createElement("div", { style:{ fontSize:12, fontWeight:700, color:T.green, marginBottom:8 } }, "✅ الفرق: ", diff, " كجم"),
              /*#__PURE__*/React.createElement("button", {
                onClick: async () => {
                  setAnalyzing(true); setCompareText("");
                  try {
                    const [rA, rB] = await Promise.all([getBase64(eA), getBase64(eB)]);
                    const txt = await compareBodyPhotos(rA.data, rB.data, eA.weight, eB.weight, rA.mime, rB.mime);
                    setCompareText(txt);
                  } catch(err) { setCompareText("حصل خطأ: " + err.message); }
                  setAnalyzing(false);
                },
                style: { ...S.btn("#8b5cf6"), fontSize:11, padding:"7px 12px" }
              }, analyzing ? "⏳ جاري المقارنة..." : "🤖 قارن بـ AI"),
              compareText && /*#__PURE__*/React.createElement("div", {
                style: { background:"#8b5cf622", border:"1px solid #8b5cf644", borderRadius:8, padding:10, marginTop:8, fontSize:12, color:"#e2e8f0", lineHeight:1.6, textAlign:"right" }
              }, compareText)
            );
          })()
        )
      )
    ),

    // تحليل سعرات طبق أكل بالـ AI
    /*#__PURE__*/React.createElement("div", { style: { ...S.card(), marginBottom: 10 } },
      /*#__PURE__*/React.createElement("div", { style: { fontSize: 13, fontWeight: 700, marginBottom: 8 } }, "🍽️ حلل سعرات طبق أكل بالـ AI"),
      /*#__PURE__*/React.createElement("label", {
        style: { ...S.btn(T.orange), display: "inline-block", cursor: "pointer", width: "auto", padding: "8px 14px" }
      }, foodPhoto ? "📷 غيّر الصورة" : "📷 ارفع صورة الطبق",
        /*#__PURE__*/React.createElement("input", {
          type: "file", accept: "image/*", style: { display: "none" },
          onChange: e => { const f = e.target.files[0]; if (f) pickFoodPhoto(f); }
        })
      ),
      foodPhoto && /*#__PURE__*/React.createElement(React.Fragment, null,
        /*#__PURE__*/React.createElement("img", { src: foodPhoto, style: { width: "100%", borderRadius: 8, marginTop: 8, maxHeight: 220, objectFit: "cover" } }),
        /*#__PURE__*/React.createElement("input", {
          type: "text",
          placeholder: "وصف اختياري للمكونات... مثلاً: بيض مقلي وجبنة",
          value: foodNote,
          onChange: e => setFoodNote(e.target.value),
          style: { ...S.inp, marginTop: 8, marginBottom: 0, fontSize: 12 }
        }),
        /*#__PURE__*/React.createElement("button", {
          onClick: analyzeFoodPhoto,
          disabled: foodAnalyzing,
          style: { ...S.btn("#8b5cf6"), marginTop: 8, fontSize: 12, padding: "8px 14px", opacity: foodAnalyzing ? 0.6 : 1 }
        }, foodAnalyzing ? "⏳ بيحلل..." : "🤖 حلل الطبق بالـ AI")
      ),
      foodResult && /*#__PURE__*/React.createElement("div", {
        style: { background: "#f59e0b22", border: "1px solid #f59e0b44", borderRadius: 8, padding: 10, marginTop: 8, fontSize: 12, color: "#e2e8f0", lineHeight: 1.7, whiteSpace: "pre-wrap" }
      }, foodResult)
    )
  );
}

// ══════════════════════════════════════════════════════════════
// DUHA GOALS SCREEN
// ══════════════════════════════════════════════════════════════
const DUHA_CHECK_DEF_DEFAULT = ["اذكار الصباح", "تمرين", "تظبيط اكل الفطار", "تظبيط اكل الغدا", "تظبيط اكل العشا", "اذكار المساء", "الصلاه في ميعادها", "الفجر في ميعاده"];
const DUHA_GOALS_DEF_DEFAULT = ["اخسي لحد وزن معين", "تمرين منتظم", "قراءة يومية"];

function DuhaGoalsSection({ section }) {
  const todayKey = DK();
  const dailyKey = `dh_daily_${todayKey}`;

  const [ch, sCh] = useState(() => {
    const saved = ld(dailyKey, null);
    if (saved) return saved;
    const defs = ld("dh_check_defs", DUHA_CHECK_DEF_DEFAULT);
    return defs.map((t, i) => ({ id: i, t, done: false }));
  });

  const [gl, sGl] = useState(() => ld("dh_gl", ld("dh_goals_defs", DUHA_GOALS_DEF_DEFAULT).map((t, i) => ({ id: i, t, done: false }))));
  const [newCheck, setNewCheck] = useState("");
  const [newGoal, setNewGoal] = useState("");
  const [showReport, setShowReport] = useState(false);
  const [noteEditId, setNoteEditId] = useState(null);
  const [noteVal, setNoteVal] = useState("");
  // ── تقسيم أهداف ضحي: لسه مش متحققة (بتظهر في القايمة الأساسية) / متحققة (بتنزل تحت في تقرير منفصل)
  const pendingGoals = gl.filter(g => !g.done);
  const doneGoals = gl.filter(g => g.done);
  const goalsPct = gl.length ? Math.round(doneGoals.length / gl.length * 100) : 0;
  const renderGoalItem = g => /*#__PURE__*/React.createElement(React.Fragment, { key: g.id },
    /*#__PURE__*/React.createElement("div", {
      style: { display: "flex", gap: 9, alignItems: "center", padding: "7px 0", borderBottom: noteEditId === g.id ? "none" : `1px solid ${T.bdr}` }
    },
      /*#__PURE__*/React.createElement("div", {
        onClick: () => sGl(a => a.map(x => x.id === g.id ? { ...x, done: !x.done } : x)),
        style: { width: 19, height: 19, borderRadius: 99, border: `2px solid ${g.done ? T.blue : "#2a3a55"}`, background: g.done ? T.blue : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }
      }, g.done && /*#__PURE__*/React.createElement("span", { style: { fontSize: 11, color: "#fff", lineHeight: 1 } }, "✓")),
      /*#__PURE__*/React.createElement("span", {
        onClick: () => sGl(a => a.map(x => x.id === g.id ? { ...x, done: !x.done } : x)),
        style: { fontSize: 12, color: g.done ? "#4a6080" : "#e2e8f0", textDecoration: g.done ? "line-through" : "none", flex: 1, cursor: "pointer" }
      }, g.t, g.note && /*#__PURE__*/React.createElement("div", { style: { fontSize: 10, color: "#60a5fa", textDecoration: "none", marginTop: 2 } }, "📝 ", g.note)),
      /*#__PURE__*/React.createElement("span", {
        onClick: () => { setNoteEditId(noteEditId === g.id ? null : g.id); setNoteVal(g.note || ""); },
        style: { fontSize: 13, color: g.note ? "#60a5fa" : "#4a6080", cursor: "pointer", padding: "0 4px" }
      }, "📝"),
      /*#__PURE__*/React.createElement("span", {
        onClick: () => sGl(a => a.filter(x => x.id !== g.id)),
        style: { fontSize: 14, color: T.red, cursor: "pointer", padding: "0 4px", opacity: 0.6 }
      }, "×")
    ),
    noteEditId === g.id && /*#__PURE__*/React.createElement("div", {
      style: { display: "flex", gap: 6, padding: "0 0 9px 27px", borderBottom: `1px solid ${T.bdr}` }
    }, /*#__PURE__*/React.createElement("input", {
      type: "text",
      autoFocus: true,
      placeholder: "ملاحظة... مثلاً حققته بسعر كذا أو في شهر كذا",
      value: noteVal,
      onChange: e => setNoteVal(e.target.value),
      onKeyDown: e => { if (e.key === "Enter") { sGl(a => a.map(x => x.id === g.id ? { ...x, note: noteVal.trim() } : x)); setNoteEditId(null); } },
      style: { ...S.inp, marginBottom: 0, flex: 1, fontSize: 12 }
    }), /*#__PURE__*/React.createElement("button", {
      onClick: () => { sGl(a => a.map(x => x.id === g.id ? { ...x, note: noteVal.trim() } : x)); setNoteEditId(null); },
      style: { background: T.blue, color: "#fff", border: "none", borderRadius: 8, padding: "0 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Cairo',sans-serif" }
    }, "حفظ"))
  );

  useEffect(() => sv(dailyKey, ch), [ch]);
  useEffect(() => {
    sv("dh_gl", gl);
    sv("dh_goals_defs", gl.map(g => g.t));
  }, [gl]);
  useEffect(() => {
    sv("dh_check_defs", ch.map(c => c.t));
  }, []);

  const dp = ch.length > 0 ? Math.round(ch.filter(c => c.done).length / ch.length * 100) : 0;

  const monthReport = useMemo(() => {
    const year = todayKey.slice(0, 7);
    const report = {};
    ch.forEach(c => { report[c.id] = { t: c.t, days: 0, total: 0 }; });
    for (let d = 1; d <= 31; d++) {
      const dk = `${year}-${String(d).padStart(2, "0")}`;
      const dayData = ld(`dh_daily_${dk}`, null);
      if (dayData) {
        dayData.forEach(item => {
          if (!report[item.id]) report[item.id] = { t: item.t, days: 0, total: 0 };
          report[item.id].total++;
          if (item.done) report[item.id].days++;
        });
      }
    }
    return Object.values(report).filter(r => r.total > 0);
  }, [showReport, todayKey]);

  return /*#__PURE__*/React.createElement(React.Fragment, null,
    section === "daily" && /*#__PURE__*/React.createElement(React.Fragment, null,
    /*#__PURE__*/React.createElement("div", { style: S.sub }, "محاسبة النفس اليومية ✅"),
    /*#__PURE__*/React.createElement("div", { style: S.card() },
      /*#__PURE__*/React.createElement("div", { style: { ...S.row, marginBottom: 7 } },
        /*#__PURE__*/React.createElement("span", { style: { fontSize: 13, fontWeight: 700 } }, "إنجازها اليوم"),
        /*#__PURE__*/React.createElement("span", { style: { fontSize: 18, fontWeight: 900, color: dp >= 70 ? T.green : T.orange } }, dp, "%")
      ),
      /*#__PURE__*/React.createElement(Bar, { v: dp, max: 100, c: T.green }),
      /*#__PURE__*/React.createElement("div", { style: { marginTop: 10 } },
        ch.map(c => /*#__PURE__*/React.createElement("div", {
          key: c.id,
          style: { display: "flex", gap: 9, alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${T.bdr}` }
        },
          /*#__PURE__*/React.createElement("div", {
            onClick: () => sCh(a => a.map(x => x.id === c.id ? { ...x, done: !x.done } : x)),
            style: { width: 19, height: 19, borderRadius: 4, border: `2px solid ${c.done ? T.green : "#2a3a55"}`, background: c.done ? T.green : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }
          }, c.done && /*#__PURE__*/React.createElement("span", { style: { fontSize: 11, color: "#fff", lineHeight: 1 } }, "✓")),
          /*#__PURE__*/React.createElement("span", {
            onClick: () => sCh(a => a.map(x => x.id === c.id ? { ...x, done: !x.done } : x)),
            style: { fontSize: 12, color: c.done ? "#4a6080" : "#e2e8f0", textDecoration: c.done ? "line-through" : "none", flex: 1, cursor: "pointer" }
          }, c.t),
          /*#__PURE__*/React.createElement("span", {
            onClick: () => { sCh(a => { const n = a.filter(x => x.id !== c.id); sv("dh_check_defs", n.map(x => x.t)); return n; }); },
            style: { fontSize: 14, color: T.red, cursor: "pointer", padding: "0 4px", opacity: 0.6 }
          }, "×")
        ))
      ),
      /*#__PURE__*/React.createElement("div", { style: { marginTop: 10, display: "flex", gap: 7 } },
        /*#__PURE__*/React.createElement("input", {
          style: { ...S.inp, marginBottom: 0, flex: 1 },
          type: "text",
          placeholder: "أضف إنجاز جديد...",
          value: newCheck,
          onChange: e => setNewCheck(e.target.value),
          onKeyDown: e => {
            if (e.key === "Enter" && newCheck.trim()) {
              const t = newCheck.trim();
              sCh(a => { const n = [...a, { id: Date.now(), t, done: false }]; sv("dh_check_defs", n.map(x => x.t)); return n; });
              setNewCheck("");
            }
          }
        }),
        /*#__PURE__*/React.createElement("button", {
          onClick: () => {
            if (newCheck.trim()) {
              const t = newCheck.trim();
              sCh(a => { const n = [...a, { id: Date.now(), t, done: false }]; sv("dh_check_defs", n.map(x => x.t)); return n; });
              setNewCheck("");
            }
          },
          style: { ...S.btn(T.green), width: "auto", padding: "9px 14px", marginTop: 0 }
        }, "+")
      ),
      /*#__PURE__*/React.createElement("button", {
        onClick: () => setShowReport(v => !v),
        style: { width: "100%", marginTop: 12, padding: "10px", background: showReport ? "#1565ff22" : "#1a2840", border: "1px solid #1565ff44", borderRadius: 10, color: "#7aa3d4", fontSize: 13, fontWeight: 700, cursor: "pointer" }
      }, showReport ? "▲ إخفاء تقرير الشهر" : "📊 تقرير الشهر"),
      showReport && /*#__PURE__*/React.createElement("div", { style: { ...S.card("#1565ff11"), border: "1px solid #1565ff22", marginTop: 8 } },
        /*#__PURE__*/React.createElement("div", { style: { fontSize: 13, fontWeight: 700, color: T.blue, marginBottom: 10 } }, "📊 تقرير هذا الشهر"),
        monthReport.length === 0
          ? /*#__PURE__*/React.createElement("div", { style: { fontSize: 12, color: "#4a6080", textAlign: "center", padding: 10 } }, "مفيش بيانات لهذا الشهر لسه")
          : monthReport.map((r, i) => {
              const pct = r.total > 0 ? Math.round(r.days / r.total * 100) : 0;
              return /*#__PURE__*/React.createElement("div", { key: i, style: { marginBottom: 8 } },
                /*#__PURE__*/React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 3 } },
                  /*#__PURE__*/React.createElement("span", { style: { fontSize: 11, color: "#e2e8f0" } }, r.t),
                  /*#__PURE__*/React.createElement("span", { style: { fontSize: 11, fontWeight: 700, color: pct >= 70 ? T.green : pct >= 40 ? T.orange : T.red } }, r.days, "/", r.total, " (", pct, "%)")
                ),
                /*#__PURE__*/React.createElement(Bar, { v: r.days, max: r.total, c: pct >= 70 ? T.green : pct >= 40 ? T.orange : T.red, h: 5 })
              );
            })
      )
    ),
    /*#__PURE__*/React.createElement("div", {
      style: { ...S.card(dp >= 70 ? T.green : dp >= 40 ? T.orange : T.red), textAlign: "center", marginTop: 4, marginBottom: 12 }
    }, /*#__PURE__*/React.createElement("div", { style: { fontSize: 12, color: "#e2e8f0", lineHeight: 1.8 } }, dailyMotivationMsg(dp)))
    ),
    section === "yearly" && /*#__PURE__*/React.createElement(React.Fragment, null,
    /*#__PURE__*/React.createElement("div", { style: S.sub }, "أهدافها 🎯"),
    /*#__PURE__*/React.createElement("div", { style: S.card() },
      pendingGoals.map(renderGoalItem),
      /*#__PURE__*/React.createElement("div", { style: { marginTop: 10, display: "flex", gap: 7 } },
        /*#__PURE__*/React.createElement("input", {
          style: { ...S.inp, marginBottom: 0, flex: 1 },
          type: "text",
          placeholder: "أضف هدف جديد...",
          value: newGoal,
          onChange: e => setNewGoal(e.target.value),
          onKeyDown: e => {
            if (e.key === "Enter" && newGoal.trim()) {
              sGl(g => [...g, { id: Date.now(), t: newGoal.trim(), done: false }]);
              setNewGoal("");
            }
          }
        }),
        /*#__PURE__*/React.createElement("button", {
          onClick: () => {
            if (newGoal.trim()) {
              sGl(g => [...g, { id: Date.now(), t: newGoal.trim(), done: false }]);
              setNewGoal("");
            }
          },
          style: { ...S.btn(T.blue), width: "auto", padding: "9px 14px", marginTop: 0 }
        }, "+")
      )
    ),
    doneGoals.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null,
      /*#__PURE__*/React.createElement("div", { style: S.sub }, "📊 تقرير أهدافها المُنجزة"),
      /*#__PURE__*/React.createElement("div", { style: S.card() },
        /*#__PURE__*/React.createElement("div", { style: { ...S.row, marginBottom: 7 } },
          /*#__PURE__*/React.createElement("span", { style: { fontSize: 13, fontWeight: 700 } }, "نسبة تحقيق أهدافها"),
          /*#__PURE__*/React.createElement("span", { style: { fontSize: 16, fontWeight: 900, color: goalsPct >= 70 ? T.green : goalsPct >= 40 ? T.orange : T.red } }, doneGoals.length, "/", gl.length, " (", goalsPct, "%)")
        ),
        /*#__PURE__*/React.createElement(Bar, { v: doneGoals.length, max: gl.length, c: goalsPct >= 70 ? T.green : goalsPct >= 40 ? T.orange : T.red }),
        /*#__PURE__*/React.createElement("div", { style: { marginTop: 10 } }, doneGoals.map(renderGoalItem))
      )
    )
    )
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════
// ── بانل إدارة النسخ الاحتياطية (تصدير/استيراد يدوي + استرجاع من نسخة سحابية يومية)
function BackupPanel({ onClose, cloudBackups, refreshCloudBackups, busy, setBusy }) {
  const fileRef = useRef(null);
  return /*#__PURE__*/React.createElement("div", {
    style: { position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 50, display: "flex", alignItems: "flex-end" },
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    style: { background: "#0f1626", width: "100%", maxWidth: 480, margin: "0 auto", borderRadius: "16px 16px 0 0", padding: 18, direction: "rtl", maxHeight: "80vh", overflowY: "auto" },
    onClick: (e) => e.stopPropagation()
  },
    /*#__PURE__*/React.createElement("div", { style: { fontSize: 16, fontWeight: 900, color: "#fff", marginBottom: 12 } }, "💾 النسخ الاحتياطية"),

    /*#__PURE__*/React.createElement("button", {
      disabled: busy,
      onClick: () => { const ok = exportBackup(); alert(ok ? "✅ اتنزلت نسخة احتياطية" : "⚠️ حصل خطأ"); },
      style: { width: "100%", padding: 12, borderRadius: 10, border: "none", background: "#2563eb", color: "#fff", fontWeight: 700, marginBottom: 8, cursor: "pointer" }
    }, "⬇️ تنزيل نسخة احتياطية دلوقتي"),

    /*#__PURE__*/React.createElement("button", {
      disabled: busy,
      onClick: () => fileRef.current && fileRef.current.click(),
      style: { width: "100%", padding: 12, borderRadius: 10, border: "1px solid #2a3a55", background: "transparent", color: "#7fa8ff", fontWeight: 700, marginBottom: 4, cursor: "pointer" }
    }, "⬆️ استعادة من ملف"),
    /*#__PURE__*/React.createElement("input", {
      ref: fileRef, type: "file", accept: "application/json", style: { display: "none" },
      onChange: (ev) => {
        const file = ev.target.files && ev.target.files[0];
        if (!file) return;
        if (!confirm("هيتم استبدال كل بيانات التطبيق الحالية بالنسخة اللي في الملف ده. متأكد؟")) { ev.target.value = ""; return; }
        setBusy(true);
        importBackupFile(file, (ok) => {
          setBusy(false);
          if (ok) { alert("✅ اتستعادت البيانات، هيتم تحديث الصفحة"); location.reload(); }
          else alert("⚠️ الملف مش صالح أو حصل خطأ");
          ev.target.value = "";
        });
      }
    }),

    /*#__PURE__*/React.createElement("div", { style: { fontSize: 11, color: "#5a6a85", margin: "14px 0 8px" } }, "نسخ تلقائية يومية (سحابة) — آخر 14 يوم:"),

    cloudBackups === null
      ? /*#__PURE__*/React.createElement("div", { style: { color: "#5a6a85", fontSize: 12 } }, "بتحمّل...")
      : cloudBackups.length === 0
        ? /*#__PURE__*/React.createElement("div", { style: { color: "#5a6a85", fontSize: 12 } }, "لسه مفيش نسخ تلقائية اتاخدت (هتتاخد أول نسخة أول ما تفتح التطبيق تاني بعد التحديث ده).")
        : cloudBackups.map(b => /*#__PURE__*/React.createElement("div", {
            key: b.date,
            style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #1a2438" }
          },
            /*#__PURE__*/React.createElement("span", { style: { color: "#cbd5e1", fontSize: 13 } }, b.date),
            /*#__PURE__*/React.createElement("button", {
              disabled: busy,
              onClick: () => {
                if (!confirm(`هيتم استبدال البيانات الحالية بنسخة يوم ${b.date}. متأكد؟`)) return;
                setBusy(true);
                restoreCloudBackup(b.date, (ok) => {
                  setBusy(false);
                  if (ok) { alert("✅ اتستعادت النسخة، هيتم تحديث الصفحة"); location.reload(); }
                  else alert("⚠️ حصل خطأ في الاستعادة");
                });
              },
              style: { padding: "6px 12px", borderRadius: 8, border: "none", background: "#1e293b", color: "#7fa8ff", fontSize: 12, cursor: "pointer" }
            }, "استرجاع")
          )),

    /*#__PURE__*/React.createElement("button", {
      onClick: onClose,
      style: { width: "100%", padding: 10, marginTop: 14, borderRadius: 10, border: "none", background: "transparent", color: "#5a6a85", cursor: "pointer" }
    }, "قفل")
  ));
}

// ══════════════════════════════════════════════════════════════
// PRAYER REMINDERS — تنبيه قبل كل صلاة بـ10 دقايق
// بيشتغل بطريقتين مع بعض: تنبيه فوري وقت ما التطبيق فاتح (setTimeout)،
// + اشتراك Push حقيقي (لو الموبايل بيدعمه) عشان يوصلك حتى لو التطبيق مقفول خالص
// ══════════════════════════════════════════════════════════════
const PRAYER_NAMES = { Fajr: "الفجر", Dhuhr: "الظهر", Asr: "العصر", Maghrib: "المغرب", Isha: "العشاء" };
// ── جلب رابط صوت الأذان بصوت الشيخ محمد رفعت (من أرشيف Internet Archive) — دالة مشتركة
// تُستخدم وقت التذكير الفوري (لو التطبيق فاتح) وكمان لما نفتح التطبيق من إشعار الأذان
let _cachedAdhanUrl = null;
async function getAdhanAudioUrl() {
  if (_cachedAdhanUrl) return _cachedAdhanUrl;
  try {
    const ar = await fetch("https://archive.org/metadata/Records-of-Sheikh-Mohammed-Refaat");
    const ad = await ar.json();
    const adhanFile = (ad.files || []).find(f => /\.(mp3|ogg)$/i.test(f.name || "") && (f.title || f.name || "").includes("أذان"));
    if (adhanFile) _cachedAdhanUrl = "https://archive.org/download/Records-of-Sheikh-Mohammed-Refaat/" + encodeURIComponent(adhanFile.name);
  } catch (e) {}
  return _cachedAdhanUrl;
}
// مفتاح VAPID العام — لازم يتغير هنا لو غيّرت مفاتيح الـ Push في السيرفر
const VAPID_PUBLIC_KEY = "BKNEkbQpChTjFNE1iGLE5Cj0ZCp8LmainE1U0eQD4lXwDPiUQFNZfZmk93DIZv30EDVBbCwtq8o5Zaz5YBEa74A";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

async function subscribeToPush(latitude, longitude) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return { ok: false, reason: "الموبايل ده مش بيدعم Push Notifications" };
  const reg = await navigator.serviceWorker.register("./sw.js");
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });
  }
  const json = sub.toJSON();
  if (sb) {
    await sb.from("push_subscriptions").upsert({
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      latitude, longitude,
      updated_at: new Date().toISOString()
    }, { onConflict: "endpoint" });
  }
  return { ok: true };
}

function usePrayerReminders(enabled) {
  const timersRef = useRef([]);
  const adhanUrlRef = useRef(null);
  const [status, setStatus] = useState("");
  useEffect(() => {
    timersRef.current.forEach(t => clearTimeout(t));
    timersRef.current = [];
    if (!enabled) { setStatus(""); return; }
    if (!("Notification" in window)) { setStatus("متصفحك مش بيدعم التنبيهات"); return; }
    let cancelled = false;
    const schedule = async () => {
      try {
        if (Notification.permission !== "granted") {
          const perm = await Notification.requestPermission();
          if (cancelled) return;
          if (perm !== "granted") { setStatus("محتاج إذن الإشعارات عشان يقدر يفكرك"); return; }
        }
        const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 10000 }));
        if (cancelled) return;
        const { latitude, longitude } = pos.coords;

        // اشتراك Push حقيقي (يشتغل حتى لو التطبيق مقفول) — لو فشل، التذكير هيفضل شغال بس وقت ما التطبيق فاتح
        try { await subscribeToPush(latitude, longitude); } catch (e) {}

        // رابط أذان الشيخ محمد رفعت (من أرشيف Internet Archive) — بيتجاب مرة واحدة ويستخدم لكل الصلوات
        // ملحوظة: ده بيتشغل بس وقت ما التطبيق فاتح (حتى في الخلفية)؛ لو مقفول خالص، الموبايل بيطلع نغمة الإشعار العادية بتاعته، وبمجرد ما تدوس على الإشعار هيفتح التطبيق ويشغّل صوت الأذان تلقائي
        adhanUrlRef.current = await getAdhanAudioUrl();

        const now = new Date();
        const dd = String(now.getDate()).padStart(2, "0");
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        const yyyy = now.getFullYear();
        const r = await fetch(`https://api.aladhan.com/v1/timings/${dd}-${mm}-${yyyy}?latitude=${latitude}&longitude=${longitude}&method=5`);
        const data = await r.json();
        if (cancelled) return;
        const timings = data && data.data && data.data.timings;
        if (!timings) { setStatus("معرفتش أجيب مواقيت الصلاة دلوقتي"); return; }
        let scheduledAny = false;
        Object.keys(PRAYER_NAMES).forEach(key => {
          const timeStr = (timings[key] || "").split(" ")[0];
          const parts = timeStr.split(":").map(Number);
          if (parts.length < 2) return;
          const prayerDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parts[0], parts[1], 0);
          const delay = prayerDate.getTime() - 10 * 60000 - Date.now();
          if (delay > 0) {
            scheduledAny = true;
            const t = setTimeout(() => {
              notify("🕌 قرب معاد صلاة " + PRAYER_NAMES[key], {
                body: "باقي 10 دقايق على أذان " + PRAYER_NAMES[key] + " (" + timeStr + ")",
                tag: "prayer-" + key
              });
              if (adhanUrlRef.current) {
                try { new Audio(adhanUrlRef.current).play().catch(() => {}); } catch (e) {}
              }
            }, delay);
            timersRef.current.push(t);
          }
        });
        setStatus(scheduledAny ? "التذكيرات شغالة لباقي صلوات النهاردة" : "خلصت صلوات النهاردة، هتتجدد بكرة");
      } catch (e) {
        if (!cancelled) setStatus("معرفتش أجيب الموقع أو مواقيت الصلاة — تأكد من إذن الموقع");
      }
    };
    schedule();
    return () => { cancelled = true; timersRef.current.forEach(t => clearTimeout(t)); };
  }, [enabled]);
  return status;
}

function App() {
  const [entries, setEn] = useState(() => ld("mhapp_v8", []));
  const [deletedXl, setDelXl] = useState(() => ld("mhdelxl_v1", []));
  const [monthly, setMo] = useState(() => ld("mhmonth_v8", {}));
  const [indExtra, setIE] = useState(() => ld("mhind_v8", []));
  const [tab, setTab] = useState("home");
  // ── تنظيم تاب ضحي في أقسام واضحة: مصاريف / بريود / أهداف سنوية / أهداف يومية / صحة
  const [duhaSection, setDuhaSection] = useState("expenses");
  const [foodSection, setFoodSection] = useState("expenses");
  // ── إضاءة ليلية/نهارية: قلب ألوان الشاشة كلها بفلتر، من غير ما نغيّر نظام الألوان الأساسي في التطبيق
  const [lightMode, setLightMode] = useState(() => ld("light_mode", false));
  useEffect(() => svLocal("light_mode", lightMode), [lightMode]);
  // ── تذكير الصلاة: تنبيه قبل كل صلاة بـ10 دقايق (وقت ما التطبيق فاتح/في الخلفية)
  const [prayerRemindersOn, setPrayerRemindersOn] = useState(() => ld("prayer_reminders_on", false));
  useEffect(() => svLocal("prayer_reminders_on", prayerRemindersOn), [prayerRemindersOn]);
  const prayerStatus = usePrayerReminders(prayerRemindersOn);
  useCustomReminders();
  useEffect(() => { const t = setTimeout(() => { syncPushSettings(); }, 6000); return () => clearTimeout(t); }, []);
  // ── لو التطبيق اتفتح من دوسة على إشعار الأذان (?adhan=1)، شغّل صوت الأذان فورًا
  // ملحوظة: بعض الموبايلات (حسب إعدادات الموبايل نفسه) بتمنع تشغيل صوت تلقائي بدون
  // ضغطة مباشرة من المستخدم، فلو حصل كده منظهرش زرار عائم "🔊 اضغط لسماع الأذان"
  // يشغّل الصوت بضغطة واحدة أكيدة تشتغل مهما كانت إعدادات الموبايل
  const [adhanTapUrl, setAdhanTapUrl] = useState(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("adhan") === "1") {
      window.history.replaceState({}, "", window.location.pathname);
      getAdhanAudioUrl().then(url => {
        if (!url) return;
        try {
          const p = new Audio(url).play();
          if (p && p.catch) p.catch(() => setAdhanTapUrl(url));
        } catch (e) { setAdhanTapUrl(url); }
      });
    }
  }, []);
  // ── زرار/إيماءة الرجوع في الموبايل: يرجّع خطوة خطوة بالترتيب اللي المستخدم دخل بيه
  // (مثلاً الرئيسية → المصحف → الأذكار: الرجوع يودّي للمصحف الأول وبعدين للرئيسية) بدل ما يقفل التطبيق أو يقفز للرئيسية على طول
  const prevTabRef = useRef("home");
  const isPoppingRef = useRef(false);
  useEffect(() => {
    // أول تحميل: نسجّل الرئيسية كأول محطة في الـ history عشان الرجوع منها يبان طبيعي
    window.history.replaceState({ tab: "home" }, "", "");
  }, []);
  useEffect(() => {
    if (isPoppingRef.current) { isPoppingRef.current = false; prevTabRef.current = tab; return; }
    if (tab !== prevTabRef.current) {
      window.history.pushState({ tab }, "", "");
    }
    prevTabRef.current = tab;
  }, [tab]);
  useEffect(() => {
    const onPop = e => {
      isPoppingRef.current = true;
      setTab((e.state && e.state.tab) || "home");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const [homeInitialView, setHomeInitialView] = useState(null);
  // ── فتح شاشة معيّنة لما تدوس على إشعار تذكير (من الـ Service Worker أو من رابط ?go=)
  useEffect(() => {
    const applyGo = g => {
      if (!g || g === "none") return;
      if (g === "quran" || g === "athkar" || g === "tasbih" || g.indexOf("athkar_") === 0) {
        window.__pendingGo = g; setTab("athkar"); window.dispatchEvent(new Event("rafiqi-go"));
      } else if (g === "finance_add") { setHomeInitialView("add"); setTab("food"); }
      else if (["tahwish", "car", "goals", "meals", "summary", "duha", "food", "home"].includes(g)) setTab(g);
    };
    const onMsg = e => { if (e.data && e.data.type === "go") applyGo(e.data.go); };
    if ("serviceWorker" in navigator) navigator.serviceWorker.addEventListener("message", onMsg);
    try {
      const u = new URL(window.location.href); const g = u.searchParams.get("go");
      if (g) { u.searchParams.delete("go"); window.history.replaceState(window.history.state, "", u.pathname + u.search + u.hash); applyGo(g); }
    } catch (e) {}
    return () => { if ("serviceWorker" in navigator) navigator.serviceWorker.removeEventListener("message", onMsg); };
  }, []);
  const [mk, setMk] = useState(currentFinMonth());
  const [modal, setMod] = useState(false);
  const [syncing, setSync] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [backupPanel, setBackupPanel] = useState(false);
  const [cloudBackups, setCloudBackups] = useState(null);
  const [backupBusy, setBackupBusy] = useState(false);
  const syncTimer = useRef(null);

  // باك أب سحابي تلقائي (مرة واحدة في اليوم) — نسخة كاملة من بياناتك في Supabase
  useEffect(() => { dailyAutoBackup(); }, []);

  // تسجيل الـ Service Worker بشكل دائم (مش بس لما تذكير الصلاة يتفعّل) —
  // ده اللي بيخلي صوتيات المصحف تتخزن تلقائي وتشتغل من غير نت بعد أول استماع
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    }
  }, []);

  // حفظ محلي فوري
  useEffect(() => sv("mhapp_v8", entries), [entries]);
  useEffect(() => sv("mhdelxl_v1", deletedXl), [deletedXl]);
  useEffect(() => sv("mhmonth_v8", monthly), [monthly]);
  useEffect(() => sv("mhind_v8", indExtra), [indExtra]);

  // تنبيهات صيانة العربية والعداد الشهري — بتتفحص كل ما تفتح التطبيق
  useEffect(() => {
    try {
      if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
      const today = DK();
      const alerts = computeMaintAlerts(entries);
      // تنبيه العداد الشهري (مرة واحدة في اليوم بحد أقصى)
      if (alerts.needsOdoLog && ld("car_notif_odo_date_v1", "") !== today) {
        notify("🚗 دخلنا شهر جديد", { body: "سجّل عداد العربية عشان نقدر نتابعلك مواعيد الصيانة صح", tag: "car-odo" });
        sv("car_notif_odo_date_v1", today);
      }
      // تنبيه البنود القريبة من الميعاد أو المتأخرة (مرة واحدة في اليوم)
      const dueItems = alerts.items.filter(it => it.left !== null && it.left <= 1000);
      if (dueItems.length && ld("car_notif_due_date_v1", "") !== today) {
        const body = dueItems.map(it => it.left <= 0 ? `${it.label}: متأخر ${fmt(Math.abs(it.left))} كم` : `${it.label}: باقي ${fmt(it.left)} كم`).join(" — ");
        notify("🔧 ميعاد صيانة العربية قرّب", { body, tag: "car-due" });
        sv("car_notif_due_date_v1", today);
      }
    } catch (e) {
      console.log("Notification failed (not supported on this browser):", e.message);
    }
  }, []);

  // تحميل من السحابة عند أول فتح
  useEffect(() => {
    if (!sb) return;
    (async () => {
      setSync(true);
      const [e, m, i] = await Promise.all([cloudLoad("entries"), cloudLoad("monthly"), cloudLoad("indExtra")]);
      // Merge: السحابة تغطي على المحلي بس لو في بيانات أحدث
      const localE = ld("mhapp_v8", []);
      const localM = ld("mhmonth_v8", {});
      const localI = ld("mhind_v8", []);
      // نستخدم السحابة كمصدر أساسي ونضيف أي entries محلية مش موجودة فيها
      if (e) {
        const cloudIds = new Set(e.map(x => x.id));
        const merged = [...e, ...localE.filter(x => !cloudIds.has(x.id))];
        setEn(merged);
        sv("mhapp_v8", merged);
      }
      if (m) {
        // السحابة هي المصدر الأساسي (آخر حفظ من أي جهاز)، والمحلي يكمّل بس الشهور غير الموجودة فيها
        const mergedM = { ...localM, ...m };
        setMo(mergedM);
        sv("mhmonth_v8", mergedM);
      }
      if (i) {
        const cloudIdsI = new Set(i.map(x => x.id));
        const mergedI = [...i, ...localI.filter(x => !cloudIdsI.has(x.id))];
        setIE(mergedI);
        sv("mhind_v8", mergedI);
      }
      setSync(false);
      setLastSync(new Date());
    })();
  }, []);

  // حفظ على السحابة بعد كل تغيير (debounced 2 ثانية)
  const debouncedCloudSync = useCallback((e, m, i) => {
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(async () => {
      if (!sb) return;
      setSync(true);
      await Promise.all([cloudSave("entries", e), cloudSave("monthly", m), cloudSave("indExtra", i)]);
      setSync(false);
      setLastSync(new Date());
    }, 2000);
  }, []);
  useEffect(() => {
    debouncedCloudSync(entries, monthly, indExtra);
  }, [entries, monthly, indExtra]);
  const addE = useCallback(e => setEn(p => [e, ...p]), []);
  const updateE = useCallback((id, patch) => {
    setEn(p => {
      const exists = p.some(e => e.id === id);
      if (exists) return p.map(e => e.id === id ? { ...e, ...patch } : e);
      // مش موجود في entries (يبقى من الداتا القديمة الثابتة CAR_DATA) — نضيفه كـ override
      const seedEntry = CAR_DATA.find(e => e.id === id);
      if (seedEntry) return [{ ...seedEntry, ...patch, type: "car" }, ...p];
      return p;
    });
  }, []);
  const delE = useCallback(id => {
    if (String(id).startsWith("xl") || String(id).startsWith("dh")) {
      setDelXl(p => [...new Set([...p, id])]);
    } else {
      setEn(p => p.filter(e => e.id !== id));
    }
  }, []);
  const saveM = useCallback((k, d) => {
    setMo(p => ({
      ...p,
      [k]: d
    }));
    setMod(false);
  }, []);
  const addInd = useCallback(e => setIE(p => [e, ...p]), []);
  const delInd = useCallback(id => setIE(p => p.filter(e => e.id !== id)), []);
  const [, m] = mk.split("-").map(Number);
  const hasSal = !!(monthly[mk]?.salary || MONTHLY_PRESET[mk]?.salary);
  const NAV = [{
    k: "summary",
    ic: "📊",
    l: "ملخص"
  }, {
    k: "duha",
    ic: "👩",
    l: "ضحي"
  }, {
    k: "food",
    ic: "🛒",
    l: "محمد"
  }, {
    k: "car",
    ic: "🚗",
    l: "العربية"
  }, {
    k: "goals",
    ic: "🎯",
    l: `أهداف ${new Date().getFullYear()}`
  }, {
    k: "athkar",
    ic: "📿",
    l: "أذكار ومصحف"
  }, {
    k: "meals",
    ic: "🍽️",
    l: "الوجبات"
  }, {
    k: "tahwish",
    ic: "💰",
    l: "التحويش"
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: { ...S.root, filter: lightMode ? "invert(0.92) hue-rotate(180deg)" : "none" }
  }, /*#__PURE__*/React.createElement("style", null, `@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&family=Amiri+Quran&display=swap');
    *{box-sizing:border-box;}input::-webkit-outer-spin-button,input::-webkit-inner-spin-button{-webkit-appearance:none;}
    ::-webkit-scrollbar{width:4px;height:4px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:#1a2840;border-radius:99px;}
    .mushaf-frame{position:relative;border:2px solid #d4af37;border-radius:8px;padding:12px;background:radial-gradient(ellipse at top,#132038,#0c1524 70%);}
    .mushaf-frame::before{content:"";position:absolute;inset:5px;border:1px solid #8a6d28;border-radius:5px;pointer-events:none;}
    .mushaf-corner{position:absolute;width:16px;height:16px;border:2px solid #d4af37;transform:rotate(45deg);pointer-events:none;}
    .mushaf-corner.tl{top:-9px;right:-9px;}.mushaf-corner.tr{top:-9px;left:-9px;}.mushaf-corner.bl{bottom:-9px;right:-9px;}.mushaf-corner.br{bottom:-9px;left:-9px;}
    .mushaf-surah-banner{background:linear-gradient(90deg,#1a2840,#22345a,#1a2840);border:1px solid #d4af37;border-radius:6px;padding:8px 10px;text-align:center;color:#f5d98a;font-family:'Cairo',sans-serif;font-weight:900;font-size:15px;margin:14px 0 10px;}
    .mushaf-ayah-end{display:inline-flex;align-items:center;justify-content:center;width:1.7em;height:1.7em;border:1.4px solid #d4af37;border-radius:50%;font-size:.5em;color:#f5d98a;font-family:'Cairo',sans-serif;margin:0 2px;vertical-align:middle;}`), /*#__PURE__*/React.createElement("div", {
    id: "app-top-header",
    style: {
      background: T.bg,
      padding: "12px 14px 0",
      borderBottom: `1px solid ${T.bdr}`,
      position: "sticky",
      top: 0,
      zIndex: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 900,
      color: "#fff"
    }
  }, tab === "summary" ? "📊 الملخص" : tab === "duha" ? "👩 ضحي" : tab === "food" ? "👨 محمد" : tab === "car" ? "🚗 العربية" : tab === "indrive" ? "🛺 إندرايف" : tab === "goals" ? `🎯 أهداف عامة ${new Date().getFullYear()}` : tab === "athkar" ? "📿 أذكار ومصحف" : tab === "meals" ? "🍽️ تنظيم الوجبات" : tab === "tahwish" ? "💰 التحويش" : "🏠 الرئيسية"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 5
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "#2a3a55"
    }
  }, "محمد حسام"), /*#__PURE__*/React.createElement("button", {
    onClick: () => { setBackupPanel(true); setCloudBackups(null); listCloudBackups().then(setCloudBackups); },
    style: {
      background: "transparent", border: "none", color: "#7fa8ff",
      fontSize: 10, cursor: "pointer", padding: "2px 4px"
    }
  }, "💾 باك أب"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 5,
      alignItems: "center"
    }
  }, tab !== "home" && /*#__PURE__*/React.createElement("button", {
    onClick: () => setTab("home"),
    style: {
      background: T.card,
      border: `1px solid ${T.bdr}`,
      borderRadius: 7,
      padding: "4px 9px",
      color: "#4a6080",
      cursor: "pointer",
      fontSize: 14,
      lineHeight: 1
    }
  }, "🏠"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setLightMode(v => !v),
    style: {
      background: T.card,
      border: `1px solid ${T.bdr}`,
      borderRadius: 7,
      padding: "4px 9px",
      color: "#4a6080",
      cursor: "pointer",
      fontSize: 14,
      lineHeight: 1
    }
  }, lightMode ? "🌙" : "☀️"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setPrayerRemindersOn(v => !v),
    title: prayerStatus || "تذكير قبل كل صلاة بـ10 دقايق",
    style: {
      background: prayerRemindersOn ? "#f59e0b22" : T.card,
      border: `1px solid ${prayerRemindersOn ? T.orange : T.bdr}`,
      borderRadius: 7,
      padding: "4px 9px",
      color: prayerRemindersOn ? T.orange : "#4a6080",
      cursor: "pointer",
      fontSize: 14,
      lineHeight: 1
    }
  }, "🕌"), tab !== "goals" && tab !== "home" && tab !== "athkar" && tab !== "tahwish" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    onClick: () => setMk(addM(mk, -1)),
    style: {
      background: T.card,
      border: `1px solid ${T.bdr}`,
      borderRadius: 7,
      padding: "4px 9px",
      color: "#4a6080",
      cursor: "pointer",
      fontSize: 14,
      lineHeight: 1
    }
  }, "‹"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: "#64748b",
      minWidth: 48,
      textAlign: "center"
    }
  }, MONTHS[m - 1]), /*#__PURE__*/React.createElement("button", {
    onClick: () => setMk(addM(mk, 1)),
    style: {
      background: T.card,
      border: `1px solid ${T.bdr}`,
      borderRadius: 7,
      padding: "4px 9px",
      color: "#4a6080",
      cursor: "pointer",
      fontSize: 14,
      lineHeight: 1
    }
  }, "›")), tab !== "home" && tab !== "athkar" && tab !== "tahwish" && /*#__PURE__*/React.createElement("button", {
    onClick: () => setMod(true),
    style: {
      background: hasSal ? "#10b98122" : "#f59e0b22",
      border: `1px solid ${hasSal ? "#10b98144" : "#f59e0b44"}`,
      borderRadius: 8,
      padding: "5px 10px",
      color: hasSal ? T.green : T.orange,
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 700,
      fontFamily: "'Cairo',sans-serif"
    }
  }, "✏️")))), tab === "home" && /*#__PURE__*/React.createElement(HomeLauncher, {
    nav: NAV,
    setTab: setTab
  }), tab === "athkar" && /*#__PURE__*/React.createElement(AthkarScreen, null), tab === "summary" && /*#__PURE__*/React.createElement(SummaryScreen, {
    entries: entries,
    mk: mk,
    monthly: monthly,
    indExtra: indExtra,
    setTab: setTab,
    deletedXl: deletedXl,
    goAddHome: () => {
      setHomeInitialView("add");
      setTab("food");
    }
  }), tab === "duha" && /*#__PURE__*/React.createElement(React.Fragment, null,
    /*#__PURE__*/React.createElement("div", { style: { padding: "0 13px" } }, /*#__PURE__*/React.createElement(Tabs, {
      tabs: [["expenses", "📋 المصاريف"], ["period", "🩸 البريود"], ["yearly", "🎯 سنوية"], ["daily", "✅ يومية"], ["health", "💪 الصحة"]],
      cur: duhaSection, set: setDuhaSection, ac: "#ec4899"
    })),
    duhaSection === "expenses" && /*#__PURE__*/React.createElement(CategoryScreen, {
    entries: entries,
    onAdd: addE,
    onDel: delE,
    mk: mk,
    monthly: monthly,
    dataSource: DUHA_DATA.filter(e => !deletedXl.includes(e.id)),
    categories: DC,
    entryType: "duha",
    idPrefix: "dn",
    headerLabel: "ضحي",
    budgetKey: "home_given",
    budgetLabel: "مرتب ضحي",
    defaultBudget: 10000,
    budgetExtra: calcCarryover(mk, monthly, entries, indExtra, deletedXl).prevDuhaBalance,
    addTitle: "إضافة مصروف ضحي",
    extraEntries: entries.filter(e => (e.type === "car" || e.type === "home") && e.paidBy === "doha")
  }), duhaSection === "period" && /*#__PURE__*/React.createElement("div", { style: { padding: "13px" } }, /*#__PURE__*/React.createElement(PeriodTracker, null)),
  (duhaSection === "yearly" || duhaSection === "daily") && /*#__PURE__*/React.createElement("div", { style: { padding: "13px" } }, /*#__PURE__*/React.createElement(DuhaGoalsSection, { section: duhaSection })),
  duhaSection === "health" && /*#__PURE__*/React.createElement("div", { style: { padding: "13px" } }, /*#__PURE__*/React.createElement(WeightTracker, {
    storeKey: "dh_weight_v1",
    startWeight: 110,
    goalWeight: 80,
    name: "ضحي",
    color: "#ec4899"
  }))
  ), tab === "food" && /*#__PURE__*/React.createElement(React.Fragment, null,
    /*#__PURE__*/React.createElement("div", { style: { padding: "0 13px" } }, /*#__PURE__*/React.createElement(Tabs, {
      tabs: [["expenses", "📋 المصاريف"], ["loans", "💳 القروض"], ["needs", "🧰 احتياجات الشقة"], ["yearly", "🎯 أهداف 2026"], ["daily", "✅ يومية"], ["health", "💪 الصحة"]],
      cur: foodSection, set: setFoodSection, ac: T.blue
    })),
    foodSection === "expenses" && /*#__PURE__*/React.createElement(CategoryScreen, {
    entries: entries,
    onAdd: addE,
    onDel: delE,
    mk: mk,
    monthly: monthly,
    initialView: homeInitialView,
    onConsumeInitialView: () => setHomeInitialView(null),
    dataSource: HOME_DATA.filter(e => !deletedXl.includes(e.id)),
    categories: HC,
    entryType: "home",
    idPrefix: "hn",
    headerLabel: "محمد",
    noBudget: true,
    addTitle: "إضافة مصروف بيت",
    extraEntries: entries.filter(e => e.type === "duha" && e.paidBy === "mohamed")
  }),
    foodSection === "loans" && /*#__PURE__*/React.createElement(MohamedLoansSection, { monthly: monthly }),
    foodSection === "needs" && /*#__PURE__*/React.createElement("div", { style: { padding: "13px" } }, /*#__PURE__*/React.createElement(GoalListSection, {
      storageKey: "home_needs_v1",
      defaultList: [],
      colorAccent: T.orange,
      sectionTitle: "🧰 احتياجات الشقة",
      emptyHint: "لسه مفيش احتياجات للشقة — ضيفوا أول حاجة من تحت 👇"
    })),
    foodSection === "yearly" && /*#__PURE__*/React.createElement("div", { style: { padding: "13px" } }, /*#__PURE__*/React.createElement(GoalListSection, {
      storageKey: "mh_gl5",
      defaultList: GOALS_DEF.map((t, i) => ({ id: i, t, done: false })),
      colorAccent: T.blue,
      sectionTitle: "أهدافي 2026 🎯"
    })),
    foodSection === "daily" && /*#__PURE__*/React.createElement(MohamedDailySection, null),
    foodSection === "health" && /*#__PURE__*/React.createElement("div", { style: { padding: "13px" } }, /*#__PURE__*/React.createElement(WeightTracker, {
      storeKey: "mh_weight_v1",
      startWeight: 110,
      goalWeight: 85,
      name: "محمد",
      color: "#1565ff"
    }))
  ), tab === "car" && /*#__PURE__*/React.createElement(CarScreen, {
    entries: entries,
    onAdd: addE,
    onDel: delE,
    onUpdate: updateE,
    mk: mk,
    indExtra: indExtra,
    onAddInd: addInd,
    onDelInd: delInd
  }), tab === "indrive" && /*#__PURE__*/React.createElement(IndriveScreen, {
    indExtra: indExtra,
    onAddInd: addInd,
    onDelInd: delInd,
    mk: mk
  }), tab === "goals" && /*#__PURE__*/React.createElement("div", { style: { padding: "13px" } }, /*#__PURE__*/React.createElement(GoalListSection, {
    storageKey: `general_goals_${new Date().getFullYear()}`,
    defaultList: [],
    colorAccent: T.orange,
    sectionTitle: `🎯 أهداف عامة ${new Date().getFullYear()}`,
    emptyHint: "لسه مفيش أهداف عامة للسنة دي — ضيفوا أول هدف من تحت 👇"
  })), tab === "meals" && /*#__PURE__*/React.createElement(MealPlannerScreen, null), tab === "tahwish" && /*#__PURE__*/React.createElement(TahwishScreen, {
    entries: entries,
    monthly: monthly,
    mk: mk,
    deletedXl: deletedXl
  }), modal && /*#__PURE__*/React.createElement(SalaryModal, {
    mk: mk,
    monthly: monthly,
    entries: entries,
    indExtra: indExtra,
    deletedXl: deletedXl,
    onSave: saveM,
    onClose: () => setMod(false)
  }), backupPanel && /*#__PURE__*/React.createElement(BackupPanel, {
    onClose: () => setBackupPanel(false),
    cloudBackups: cloudBackups,
    busy: backupBusy,
    setBusy: setBackupBusy
  }));
}
const root = ReactDOM.createRoot(document.getElementById('root'));
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.log("React render crash:", error, info);
  }
  render() {
    if (this.state.error) {
      return /*#__PURE__*/React.createElement("div", {
        style: { color: "#fff", background: "#0a0f1a", minHeight: "100vh", padding: 20, fontFamily: "monospace", direction: "ltr", textAlign: "left", fontSize: 13, whiteSpace: "pre-wrap" }
      }, "⚠️ حصل خطأ في التطبيق:\n\n" + (this.state.error.message || String(this.state.error)) + "\n\n" + (this.state.error.stack || ""));
    }
    return this.props.children;
  }
}
function Root() {
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    cloudPullAll().finally(() => setNonce(n => n + 1));
  }, []);
  return /*#__PURE__*/React.createElement(App, { key: nonce });
}
root.render(/*#__PURE__*/React.createElement(ErrorBoundary, null, React.createElement(Root)));
  });
})();
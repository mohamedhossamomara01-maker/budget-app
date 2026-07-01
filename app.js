(function() {
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
async function cloudSave(key, value) {
  if (!sb) return;
  try {
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
const ld = (k, d) => {
  try {
    const v = localStorage.getItem(k);
    return v !== null ? JSON.parse(v) : d;
  } catch {
    return d;
  }
};
const sv = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
};

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
const catF = (list, id) => list.find(c => c.id === id) || list[list.length - 1];
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
  Object.entries(monthly).forEach(([mk, d]) => {
    if (mk >= "2026-07") {
      salfaRem -= +(d.car_fixed || 7000);
      aptRem -= +(d.rent || 1030);
    }
  });
  return {
    salfaRem: Math.max(0, salfaRem),
    aptRem: Math.max(0, aptRem)
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
    paddingBottom: 78,
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
  onSave,
  onClose
}) {
  const def = MONTHLY_PRESET[mk] || {},
    saved = monthly[mk] || {};
  const g = k => saved[k] ?? def[k] ?? 0;
  const [f, sf] = useState({
    salary: g("salary"),
    transport: g("transport"),
    waste: g("waste"),
    old: g("old"),
    deals: g("deals"),
    eid: g("eid"),
    dohaa: g("dohaa"),
    duha_w_sal: g("duha_w_sal"),
    duha_w_sav: g("duha_w_sav"),
    magdy: g("magdy"),
    charity: g("charity") || 200,
    mom: g("mom") || 1500,
    internet: g("internet") || 750,
    car_fixed: g("car_fixed") || 7000,
    rent: g("rent") || 1030,
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
  }), /*#__PURE__*/React.createElement(Fld, {
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
  })), /*#__PURE__*/React.createElement("div", {
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
function CategoryScreen({
  entries,
  onAdd,
  onDel,
  mk,
  monthly,
  initialView,
  onConsumeInitialView,
  dataSource,
  categories,
  entryType,
  idPrefix,
  headerLabel,
  budgetKey,
  budgetLabel,
  defaultBudget,
  addTitle,
  noBudget
}) {
  const [form, sf] = useState({
    amount: "",
    cat: categories[0].id,
    note: "",
    date: DK(),
    tahwishAmt: ""
  });
  const [toast, setT] = useToast();
  const [del, setD] = useState(null);
  const [view, sv2] = useState(initialView || "today");
  useEffect(() => {
    if (initialView) {
      sv2(initialView);
      if (onConsumeInitialView) onConsumeInitialView();
    }
  }, [initialView]);
  const all = useMemo(() => [...dataSource, ...entries.filter(e => e.type === entryType)].sort((a, b) => b.date.localeCompare(a.date)), [entries, dataSource, entryType]);
  const month = useMemo(() => all.filter(e => finKey(e.date) === mk), [all, mk]);
  const today = useMemo(() => all.filter(e => e.date === DK()), [all]);
  const saved = monthly[mk] || MONTHLY_PRESET[mk] || {};
  const budget = +(saved[budgetKey] || defaultBudget);
  const mTot = SUM(month),
    tTot = SUM(today),
    rem = budget - mTot;
  const bycat = useMemo(() => categories.map(c => ({
    ...c,
    total: SUM(month.filter(e => e.cat === c.id))
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total), [month, categories]);
  const [filterDate, setFD] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const shownEntries = month.filter(e => {
    const dateOk = !filterDate || e.date === filterDate;
    const q = searchQ.trim().toLowerCase();
    const searchOk = !q || (e.note||"").toLowerCase().includes(q) || (e.name||"").toLowerCase().includes(q) || catF(categories,e.cat).l.includes(q);
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
        date: form.date
      });
    }
    if (hasTa) {
      onAdd({
        id: `${idPrefix}tahwish${Date.now()}`,
        type: "tahwish",
        amount: ta,
        cat: "tahwish",
        note: form.note.trim(),
        date: form.date
      });
    }
    sf(f => ({
      ...f,
      amount: "",
      note: "",
      tahwishAmt: ""
    }));
    setT("✅ اتضاف");
    sv2("today");
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
    tabs: [["today", "النهارده"], ["add", "➕ أضف"], ["month", "الشهر"], ["stats", "📊 تحليل"]],
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
    const c = catF(categories, e.cat);
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
    }, c.l))), /*#__PURE__*/React.createElement("div", {
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
  })), view === "add" && /*#__PURE__*/React.createElement("div", {
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
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      background: "#0f1a2a",
      border: "1.5px solid #a78bfa55",
      borderRadius: 10,
      padding: "6px 10px",
      marginBottom: 9
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: "#a78bfa",
      fontWeight: 700,
      whiteSpace: "nowrap"
    }
  }, "💰 تحويش"), /*#__PURE__*/React.createElement("input", {
    style: {
      ...S.inp,
      margin: 0,
      border: "none",
      background: "transparent"
    },
    type: "number",
    placeholder: "المبلغ المحوش (اختياري)",
    inputMode: "decimal",
    value: form.tahwishAmt,
    onChange: e => sf(f => ({
      ...f,
      tahwishAmt: e.target.value
    }))
  })), /*#__PURE__*/React.createElement("button", {
    style: S.btn(),
    onClick: doAdd
  }, "إضافة ✓")), view === "month" && /*#__PURE__*/React.createElement(React.Fragment, null,
  // ── Category bars summary
  /*#__PURE__*/React.createElement("div", {style:S.sub}, "حسب التصنيف"),
  bycat.map(c => /*#__PURE__*/React.createElement("div", {key:c.id, style:{marginBottom:9}},
    /*#__PURE__*/React.createElement("div", {style:{display:"flex",justifyContent:"space-between",marginBottom:3}},
      /*#__PURE__*/React.createElement("span", {style:{fontSize:12}}, c.ic, " ", c.l),
      /*#__PURE__*/React.createElement("div", {style:{display:"flex",gap:5,alignItems:"center"}},
        /*#__PURE__*/React.createElement(Bar, {v:c.total, max:mTot, c:c.c, h:5}),
        /*#__PURE__*/React.createElement("span", {style:{fontSize:11,fontWeight:700,color:c.c,whiteSpace:"nowrap"}}, fmt(c.total), " ج")
      )
    )
  )),
  /*#__PURE__*/React.createElement("div", {style:S.div}),
  // ── Search + date filter bar
  /*#__PURE__*/React.createElement("div", {style:{display:"flex",alignItems:"center",gap:5,marginBottom:8}},
    /*#__PURE__*/React.createElement("span", {style:{fontSize:12,fontWeight:700,color:"#4a6080",whiteSpace:"nowrap"}},
      filterDate || searchQ ? fmt(shownTot)+" ج ("+shownEntries.length+")" : "كل المصاريف ("+month.length+")"
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
    const c = catF(categories, e.cat);
    return /*#__PURE__*/React.createElement("div", {
      key:e.id,
      style:{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:`1px solid ${T.bdr}`}
    },
      /*#__PURE__*/React.createElement("div", {style:{display:"flex",gap:8}},
        /*#__PURE__*/React.createElement("span", {style:{fontSize:18}}, c.ic),
        /*#__PURE__*/React.createElement("div", null,
          /*#__PURE__*/React.createElement("div", {style:{fontSize:12,fontWeight:700}}, e.note||e.name||c.l),
          /*#__PURE__*/React.createElement("div", {style:{fontSize:10,color:"#4a6080"}}, c.l)
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
      const items = month.filter(e => e.cat === c.id);
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
            c.items.sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5).map((e,i) =>
              /*#__PURE__*/React.createElement("div", {key:e.id, style:{display:"flex",justifyContent:"space-between",padding:"3px 0",borderTop:i===0?"none":`1px solid #1a2840`}},
                /*#__PURE__*/React.createElement("span", {style:{fontSize:10,color:"#94a3b8"}}, e.note||e.name||c.l, " ", /*#__PURE__*/React.createElement("span",{style:{color:"#2a3a55"}}, e.date.slice(5))),
                /*#__PURE__*/React.createElement("span", {style:{fontSize:10,fontWeight:700,color:c.c}}, fmt(e.amount), " ج")
              )
            ),
            c.items.length > 5 && /*#__PURE__*/React.createElement("div", {style:{fontSize:9,color:"#4a6080",textAlign:"center",paddingTop:3}}, "+ ", c.items.length-5, " عملية أخرى")
          )
        )
      )
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
  mk
}) {
  const [form, sf] = useState({
    amount: "",
    cat: "oil",
    note: "",
    date: DK()
  });
  const [toast, setT] = useToast();
  const [del, setD] = useState(null);
  const [view, sv2] = useState("list");
  const [flt, setF] = useState("all");
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
  const all = useMemo(() => [...CAR_DATA, ...entries.filter(e => e.type === "car")].sort((a, b) => b.date.localeCompare(a.date)), [entries]);
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
      date: form.date
    });
    sf(f => ({
      ...f,
      amount: "",
      note: ""
    }));
    setT("✅ اتضاف");
    sv2("list");
  };
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Tabs, {
    tabs: [["list", "السجل"], ["add", "➕"], ["needs", "احتياجات"], ["stats", "تقرير"]],
    cur: view,
    set: sv2,
    ac: "#8b5cf6"
  }), /*#__PURE__*/React.createElement("div", {
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
      display: "flex",
      gap: 3,
      marginBottom: 9,
      overflowX: "auto",
      paddingBottom: 2
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setF("all"),
    style: {
      borderRadius: 99,
      border: "none",
      padding: "4px 9px",
      fontFamily: "'Cairo',sans-serif",
      fontSize: 10,
      fontWeight: 700,
      cursor: "pointer",
      background: flt === "all" ? "#8b5cf6" : T.card,
      color: flt === "all" ? "#fff" : "#4a6080",
      whiteSpace: "nowrap"
    }
  }, "هذا الشهر (", mCar.length, ")"), CC.map(c => {
    const n = mCar.filter(e => e.cat === c.id).length;
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
    }, c.ic, " ", c.l);
  })), mCar.length===0&&/*#__PURE__*/React.createElement("div",{style:{color:"#2a3a55",fontSize:12,textAlign:"center",padding:"20px 0"}},"مفيش صيانة هذا الشهر"), mShown.map(e => {
    const c = catF(CC, e.cat);
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
    }, e.name || e.note), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: "#4a6080"
      }
    }, e.date, e.km ? ` · ${e.km} كم` : "", e.note ? ` · ${e.note}` : ""))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 7,
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: c.c
      }
    }, fmt(e.amount), " ج"), String(e.id).startsWith("cn") && /*#__PURE__*/React.createElement("button", {
      onClick: () => setD(e.id),
      style: {
        background: "none",
        border: "none",
        cursor: "pointer",
        color: "#4a6080",
        fontSize: 12
      }
    }, "🗑️")));
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
  }), /*#__PURE__*/React.createElement("button", {
    style: S.btn("#8b5cf6"),
    onClick: doAdd
  }, "إضافة ✓")), view === "needs" && /*#__PURE__*/React.createElement(React.Fragment, null,/*#__PURE__*/React.createElement("div",{style:{background:"#0f1a2a",borderRadius:13,padding:"12px 14px",marginBottom:10,border:"1px solid #1a2840"}},/*#__PURE__*/React.createElement("div",{style:{display:"flex",gap:7,marginBottom:8}},/*#__PURE__*/React.createElement("input",{style:{background:"#070c16",border:"1px solid #1a2840",borderRadius:9,padding:"9px 12px",fontSize:14,color:"#e2e8f0",flex:1,fontFamily:"'Cairo',sans-serif",outline:"none",direction:"rtl"},type:"text",placeholder:"أضف احتياج جديد...",value:newNeed,onChange:function(e){setNewNeed(e.target.value);},onKeyDown:function(e){if(e.key==="Enter"&&newNeed.trim()){setCarNeeds(function(n){return[...n,{name:newNeed.trim(),done:false}];});setNewNeed("");}}}),/*#__PURE__*/React.createElement("button",{onClick:function(){if(newNeed.trim()){setCarNeeds(function(n){return[...n,{name:newNeed.trim(),done:false}];});setNewNeed("");}},style:{background:"#8b5cf6",color:"#fff",border:"none",borderRadius:10,padding:"9px 16px",fontSize:18,fontWeight:900,cursor:"pointer",fontFamily:"'Cairo',sans-serif"}},"+"), /*#__PURE__*/React.createElement("div",{style:{fontSize:11,color:"#4a6080"}},carNeeds.filter(function(x){return x.done;}).length," / ",carNeeds.length," تم")),carNeeds.map(function(item,i){return /*#__PURE__*/React.createElement("div",{key:i,style:{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid #1a2840"}},/*#__PURE__*/React.createElement("div",{onClick:function(){setCarNeeds(function(n){return n.map(function(x,idx){return idx===i?Object.assign({},x,{done:!x.done}):x;});});},style:{width:26,height:26,borderRadius:99,flexShrink:0,cursor:"pointer",background:item.done?"#10b981":"transparent",border:"2.5px solid "+(item.done?"#10b981":"#ef4444"),display:"flex",alignItems:"center",justifyContent:"center"}},item.done&&/*#__PURE__*/React.createElement("span",{style:{color:"#fff",fontSize:13,fontWeight:900}},"✓")),/*#__PURE__*/React.createElement("span",{onClick:function(){setCarNeeds(function(n){return n.map(function(x,idx){return idx===i?Object.assign({},x,{done:!x.done}):x;});});},style:{fontSize:13,flex:1,cursor:"pointer",color:item.done?"#4a6080":"#e2e8f0",textDecoration:item.done?"line-through":"none"}},item.name),/*#__PURE__*/React.createElement("button",{onClick:function(){setCarNeeds(function(n){return n.filter(function(_,idx){return idx!==i;});});},style:{background:"none",border:"none",cursor:"pointer",color:"#334155",fontSize:16,padding:"0 4px"}},"🗑"));}))),view === "stats" && /*#__PURE__*/React.createElement(React.Fragment, null,/*#__PURE__*/React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:7}},/*#__PURE__*/React.createElement("div",{style:{background:"#0f1a2a",borderRadius:13,padding:"12px",border:"1px solid #1a2840"}},/*#__PURE__*/React.createElement("div",{style:{fontSize:10,color:"#8b5cf6",marginBottom:3}},"📅 هذا الشهر"),/*#__PURE__*/React.createElement("div",{style:{fontSize:20,fontWeight:900,color:"#a78bfa"}},fmt(tMon)," ج"),/*#__PURE__*/React.createElement("div",{style:{fontSize:10,color:"#4a6080"}},mCar.length," عملية")),/*#__PURE__*/React.createElement("div",{style:{background:"#0f1a2a",borderRadius:13,padding:"12px",border:"1px solid #1a2840"}},/*#__PURE__*/React.createElement("div",{style:{fontSize:10,color:"#f59e0b",marginBottom:3}},"💰 إجمالي كل الفترة"),/*#__PURE__*/React.createElement("div",{style:{fontSize:20,fontWeight:900,color:"#fbbf24"}},fmt(tAll)," ج"),/*#__PURE__*/React.createElement("div",{style:{fontSize:10,color:"#4a6080"}},all.length," عملية"))),/*#__PURE__*/React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:10}},/*#__PURE__*/React.createElement("div",{style:{background:"#0f1a2a",borderRadius:13,padding:"12px",border:"1px solid #1a2840"}},/*#__PURE__*/React.createElement("div",{style:{fontSize:10,color:"#10b981",marginBottom:3}},"📊 متوسط الشهر"),/*#__PURE__*/React.createElement("div",{style:{fontSize:18,fontWeight:900,color:"#34d399"}},fmt(Math.round(tAll/Math.max(1,Object.keys(byMon).length)))," ج")),(function(){var top=Object.entries(byMon).sort(function(a,b){return b[1].total-a[1].total;})[0];if(!top)return null;var ty=+top[0].split("-")[0],tm=+top[0].split("-")[1];return /*#__PURE__*/React.createElement("div",{style:{background:"#0f1a2a",borderRadius:13,padding:"12px",border:"1px solid #1a2840"}},/*#__PURE__*/React.createElement("div",{style:{fontSize:10,color:"#ef4444",marginBottom:3}},"🔥 أعلى شهر"),/*#__PURE__*/React.createElement("div",{style:{fontSize:18,fontWeight:900,color:"#f87171"}},fmt(top[1].total)," ج"),/*#__PURE__*/React.createElement("div",{style:{fontSize:10,color:"#4a6080"}},MN[tm-1]," ",ty));})()), /*#__PURE__*/React.createElement("div",{style:{fontSize:10,color:"#2a3a55",fontWeight:700,marginBottom:7}},"🔧 حسب التصنيف"),/*#__PURE__*/React.createElement("div",{style:{background:"#0f1a2a",borderRadius:13,padding:"12px 14px",marginBottom:9,border:"1px solid #1a2840"}},CC.map(function(c){var t=SUM(all.filter(function(e){return e.cat===c.id;}));if(!t)return null;var cnt=all.filter(function(e){return e.cat===c.id;}).length;var avg=Math.round(t/cnt);return /*#__PURE__*/React.createElement("div",{key:c.id,style:{marginBottom:10}},/*#__PURE__*/React.createElement("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:4}},/*#__PURE__*/React.createElement("span",{style:{fontSize:12}},c.ic," ",c.l," (",cnt,")"),/*#__PURE__*/React.createElement("div",{style:{textAlign:"left"}},/*#__PURE__*/React.createElement("div",{style:{fontSize:12,fontWeight:700,color:c.c}},fmt(t)," ج"),/*#__PURE__*/React.createElement("div",{style:{fontSize:9,color:"#4a6080"}},"متوسط ",fmt(avg)," ج"))),/*#__PURE__*/React.createElement(Bar,{v:t,max:tAll,c:c.c}));})),/*#__PURE__*/React.createElement("div",{style:{fontSize:10,color:"#2a3a55",fontWeight:700,marginBottom:7}},"📅 حسب الشهر"),/*#__PURE__*/React.createElement("div",{style:{background:"#0f1a2a",borderRadius:13,padding:"12px 14px",marginBottom:9,border:"1px solid #1a2840"}},Object.entries(byMon).sort(function(a,b){return b[0].localeCompare(a[0]);}).map(function(entry){var mk2=entry[0],d=entry[1];var ty=+mk2.split("-")[0],tm=+mk2.split("-")[1];var isCur=mk2===mk;var maxT=Math.max.apply(null,Object.values(byMon).map(function(x){return x.total;}));return /*#__PURE__*/React.createElement("div",{key:mk2,style:{padding:"8px 0",borderBottom:"1px solid #1a2840"}},/*#__PURE__*/React.createElement("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:4}},/*#__PURE__*/React.createElement("span",{style:{fontSize:12,fontWeight:isCur?900:400,color:isCur?"#60a5fa":"#e2e8f0"}},isCur?"← ":"",MN[tm-1]," ",ty),/*#__PURE__*/React.createElement("div",{style:{textAlign:"left"}},/*#__PURE__*/React.createElement("span",{style:{fontSize:12,fontWeight:700,color:isCur?"#60a5fa":"#a78bfa"}},fmt(d.total)," ج"),/*#__PURE__*/React.createElement("span",{style:{fontSize:9,color:"#4a6080",marginRight:4}}," (",d.cnt," عملية"))),/*#__PURE__*/React.createElement(Bar,{v:d.total,max:maxT,c:isCur?"#3b82f6":"#8b5cf6",h:5}));})),/*#__PURE__*/React.createElement("div",{style:{fontSize:10,color:"#2a3a55",fontWeight:700,marginBottom:7}},"📆 ملخص السنوات"),/*#__PURE__*/React.createElement("div",{style:{background:"#0f1a2a",borderRadius:13,padding:"12px 14px",border:"1px solid #1a2840"}},Object.entries(byY).sort().map(function(e2){return /*#__PURE__*/React.createElement("div",{key:e2[0],style:{display:"flex",justifyContent:"space-between",marginBottom:7,paddingBottom:7,borderBottom:"1px solid #1a2840"}},/*#__PURE__*/React.createElement("span",{style:{fontSize:14,fontWeight:700}},"📅 ",e2[0]),/*#__PURE__*/React.createElement("span",{style:{fontSize:16,fontWeight:900,color:"#a78bfa"}},fmt(e2[1])," ج"));})))),
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
  const [y, m] = mk.split("-").map(Number);
  const saved = monthly[mk] || MONTHLY_PRESET[mk] || {};
  // كل الشهور المعروفة: الشهور الجاهزة + أي شهر جديد المستخدم دخله بياناته (حتى لو لسه مش في MONTHLY_PRESET)
  const entryMonthKeys = (entries || []).map(e => finKey(e.date));
  const allMonthKeys = [...new Set([...Object.keys(MONTHLY_PRESET), ...Object.keys(monthly), ...entryMonthKeys])].sort();
  const n = k => +(saved[k] || 0);
  const baseInc = n("salary") + n("transport") + n("waste") + n("old") + n("deals") + n("eid") + n("dohaa") + n("magdy");
  const duhaAllowance = n("home_given") || 0;
  const duhaWSal = n("duha_w_sal") || 0;
  const duhaWSav = n("duha_w_sav") || 0;
  const budget = duhaAllowance;
  const fix = n("car_fixed") + n("rent") + n("internet") + n("charity") + n("mom") + n("ajz") + n("tahwish");
  const fixDisplay = fix + duhaAllowance;
  // نشيل "basics" من الأكل والبيت لأنها بتتحسب في الثوابت (charity/mom/internet)
  const allH = [...HOME_DATA.filter(e => !dxl.includes(e.id)), ...entries.filter(e => e.type === "home")].filter(e => e.cat !== "basics");
  const allD = [...DUHA_DATA, ...entries.filter(e => e.type === "duha")];
  const allC = [...CAR_DATA, ...entries.filter(e => e.type === "car")];
  const mHome = allH.filter(e => finKey(e.date) === mk);
  const mDuha = allD.filter(e => finKey(e.date) === mk);
  const mCar = SUM(allC.filter(e => finKey(e.date) === mk));
  const mHomeTot = SUM(mHome);
  const mDuhaTot = SUM(mDuha);
  // إندرايف للشهر: الأوردرات بتزود "إجمالي الدخل" مباشرة،
  // والبنزين/الضريبة/النفخ بتتحسب ضمن إجمالي المصاريف
  const indSum = indriveSummary(indExtra || []);
  const ind = indSum[mk];
  const indRev = ind ? ind.rev : 0;
  const indExpenses = ind ? ind.petrol + (ind.tax || 0) + (ind.tire || 0) : 0;
  const totalOut = fix + duhaAllowance + mHomeTot + mCar + (duhaWSal||0) + (duhaWSav||0) + indExpenses;
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
  return /*#__PURE__*/React.createElement("div", {
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
  }), n("old") > 0 && /*#__PURE__*/React.createElement(R, {
    icon: "📦",
    lbl: "فلوس قديمة/جمعية",
    val: n("old"),
    c: T.green
  }), n("deals") > 0 && /*#__PURE__*/React.createElement(R, {
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
    val: n("car_fixed") || 7000,
    c: T.red
  }), /*#__PURE__*/React.createElement(R, {
    icon: "🏠",
    lbl: "قسط الشقة / الإيجار",
    val: n("rent") || 1030,
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
    lbl: "الأكل والبيت",
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
  }, "🛒 الأكل والبيت — ", fmt(mHomeTot), " ج"), /*#__PURE__*/React.createElement("div", {
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
      color: mHomeTot > budget ? T.red : T.blue
    }
  }, fmt(mHomeTot), " ج"))), duhaAllowance > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
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
  }, fmt(mDuhaTot), " ج")))), mCar > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
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
  }, [["الثوابت", fixDisplay || 9480, T.red], ["أكل وبيت", mHomeTot, T.blue], ["صيانة", mCar, "#a78bfa"], ["⛽ بنزين", ind ? (ind.petrol||0) : 0, "#f59e0b"], ["🧾 ضريبة", ind ? (ind.tax||0) : 0, "#f59e0b"], ["🔧 نفخ كاوتش", ind ? (ind.tire||0) : 0, "#f59e0b"]].map(([l, v, c]) => /*#__PURE__*/React.createElement("div", {
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
  }, allMonthKeys.map(monthKey => {
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
    const mAllH = [...HOME_DATA.filter(e => !dxl.includes(e.id)), ...entries.filter(e => e.type === "home")].filter(e => finKey(e.date) === monthKey && e.cat !== "basics");
    const mAllD = [...DUHA_DATA, ...entries.filter(e => e.type === "duha")].filter(e => finKey(e.date) === monthKey);
    const mAllC = [...CAR_DATA, ...entries.filter(e => e.type === "car")].filter(e => finKey(e.date) === monthKey);
    const mHTotal = SUM(mAllH);
    const mDuha = mn("home_given");
    const mCarTotal = SUM(mAllC);
    const mTotalLive = mFix + mDuha + mHTotal + mCarTotal + imExp;
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
  }, /*#__PURE__*/React.createElement("div", {style:{background:"#0f1a2a",borderRadius:13,padding:"12px 14px",border:"1px solid #10b98133"}}, /*#__PURE__*/React.createElement("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:6}}, /*#__PURE__*/React.createElement("span",{style:{fontSize:12,color:"#4a6080"}}, "إجمالي الدخل كل الشهور"), /*#__PURE__*/React.createElement("span",{style:{fontSize:14,fontWeight:900,color:T.green}}, fmt(YEARLY_INCOME_XL + allMonthKeys.filter(k=>k>"2026-06").reduce((s,k)=>{ const p=MONTHLY_PRESET[k]||{}; const u=monthly[k]||{}; const mn2=x=>+(u[x]!==undefined?u[x]:p[x]||0); const indS=indriveSummary(indExtra||[]); const im=indS[k]; return s+mn2("salary")+mn2("transport")+mn2("waste")+mn2("old")+mn2("deals")+mn2("eid")+mn2("dohaa")+mn2("magdy")+(im?im.rev:0); },0)), " ج")), /*#__PURE__*/React.createElement("div",{style:{height:1,background:T.bdr,margin:"5px 0"}}), /*#__PURE__*/React.createElement("div",{style:{display:"flex",justifyContent:"space-between"}}, /*#__PURE__*/React.createElement("span",{style:{fontSize:12,color:"#4a6080"}}, "إجمالي المصاريف كل الشهور"), /*#__PURE__*/React.createElement("span",{style:{fontSize:14,fontWeight:900,color:T.red}}, fmt(YEARLY_EXPENSE_XL + allMonthKeys.filter(k=>k>"2026-06").reduce((s,k)=>{ const p=MONTHLY_PRESET[k]||{}; const u=monthly[k]||{}; const mn2=x=>+(u[x]!==undefined?u[x]:p[x]||0); const mFx=mn2("car_fixed")+mn2("rent")+mn2("internet")+mn2("charity")+mn2("mom")+mn2("ajz")+mn2("tahwish"); const mHH=[...HOME_DATA,...(entries||[]).filter(e=>e.type==="home")].filter(e=>finKey(e.date)===k&&e.cat!=="basics"); const mCC=[...CAR_DATA,...(entries||[]).filter(e=>e.type==="car")].filter(e=>finKey(e.date)===k); const mDD=[...DUHA_DATA,...(entries||[]).filter(e=>e.type==="duha")].filter(e=>finKey(e.date)===k); const indS=indriveSummary(indExtra||[]); const im=indS[k]; const ic=im?(im.petrol||0)+(im.tax||0)+(im.tire||0):0; const liveTotal=mFx+mn2("home_given")+SUM(mHH)+SUM(mCC)+SUM(mDD)+ic; const hasEdit=Object.keys(u).length>0; const finalTotal=(!hasEdit&&p.expense_total_xl!==undefined)?p.expense_total_xl:liveTotal; return s+finalTotal; },0)), " ج"))), /*#__PURE__*/React.createElement("div", {style:{background:"#0f1a2a",borderRadius:13,padding:"12px 14px",border:"1px solid #8b5cf644",marginTop:8}}, /*#__PURE__*/React.createElement("div",{style:{fontSize:10,color:"#a78bfa",marginBottom:5,fontWeight:700}}, "💰 إجمالي التحويش"), /*#__PURE__*/React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center"}}, /*#__PURE__*/React.createElement("span",{style:{fontSize:11,color:"#4a6080"}}, "مجموع ما تم تحويشه كل الشهور"), /*#__PURE__*/React.createElement("span",{style:{fontSize:20,fontWeight:900,color:"#a78bfa"}}, fmt(allMonthKeys.reduce((s,k)=>{ const p=MONTHLY_PRESET[k]||{}; const u=monthly[k]||{}; const presetT=+(u.tahwish!==undefined?u.tahwish:p.tahwish||0)||0; const manualT=SUM((entries||[]).filter(e=>e.type==="tahwish"&&finKey(e.date)===k)); return s+presetT+manualT; },0)), " ج")))));
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
  }, fmt(curInd.tire), " ج"))), /*#__PURE__*/React.createElement("div", {
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
    const totalLiters = allPetrolEntries.reduce((s, e) => s + (e.liters || 0), 0);
    const totalKm = allPetrolEntries.reduce((s, e) => s + (e.km || 0), 0);
    const avgRate = totalLiters > 0 ? (totalKm / totalLiters) : 0;
    return /*#__PURE__*/React.createElement("div", {
      style: { ...S.card("#10b98122"), border: "1px solid #10b98144", marginBottom: 10 }
    }, /*#__PURE__*/React.createElement("div", {
      style: { fontSize: 13, fontWeight: 700, color: T.green, marginBottom: 8 }
    }, "⚡ معدل استهلاك البنزين"), /*#__PURE__*/React.createElement("div", {
      style: { display: "flex", justifyContent: "space-between", marginBottom: 10, paddingBottom: 8, borderBottom: "1px solid #1a2840" }
    }, /*#__PURE__*/React.createElement("span", { style: { fontSize: 12, color: "#8fa3c4" } }, "المتوسط العام"), /*#__PURE__*/React.createElement("span", {
      style: { fontSize: 15, fontWeight: 900, color: T.green }
    }, avgRate.toFixed(1), " كم/لتر")), allPetrolEntries.slice().reverse().slice(0, 10).map((e, i) => {
      const rate = e.liters > 0 ? (e.km / e.liters) : 0;
      return /*#__PURE__*/React.createElement("div", {
        key: e.id || i,
        style: { display: "flex", justifyContent: "space-between", fontSize: 11, padding: "5px 0", borderBottom: i < 9 ? "1px solid #1a2840" : "none" }
      }, /*#__PURE__*/React.createElement("span", { style: { color: "#4a6080" } }, e.date, " · ", e.km, " كم · ", e.liters, " لتر"), /*#__PURE__*/React.createElement("span", {
        style: { fontWeight: 700, color: rate >= avgRate ? T.green : T.red }
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
// GOALS SCREEN
// ══════════════════════════════════════════════════════════════
function GoalsScreen({
  monthly
}) {
  const todayKey = DK(); // "2026-06-30"
  const dailyStoreKey = `mh_daily_${todayKey}`;

  // تحميل تشيكات اليوم — لو يوم جديد بيبدأ بـ false تلقائي
  const [ch, sCh] = useState(() => {
    const saved = ld(dailyStoreKey, null);
    if (saved) return saved;
    return CHECK_DEF.map((t, i) => ({ id: i, t, done: false }));
  });

  const [gl, sGl] = useState(() => ld("mh_gl5", GOALS_DEF.map((t, i) => ({
    id: i,
    t,
    done: false
  }))));
  const [ng, sNg] = useState("");
  const [showMonthReport, setShowMonthReport] = useState(false);

  // حفظ تشيكات اليوم بتاريخه
  useEffect(() => sv(dailyStoreKey, ch), [ch]);
  useEffect(() => sv("mh_gl5", gl), [gl]);

  // حساب تقرير الشهر الحالي
  const monthReport = useMemo(() => {
    const year = todayKey.slice(0, 7); // "2026-06"
    const report = {};
    CHECK_DEF.forEach((t, i) => { report[i] = { t, days: 0, total: 0 }; });
    // مسح كل الأيام المحفوظة في الشهر ده
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
  const {
    salfaRem,
    aptRem
  } = useMemo(() => calcLoans(monthly), [monthly]);
  function LoanCard({
    icon,
    lbl,
    color,
    original,
    remaining,
    qist,
    note
  }) {
    const paid = original - remaining,
      p = PCT(paid, original);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        ...S.card(`${color}33`),
        border: `1px solid ${color}44`,
        marginBottom: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        fontWeight: 700,
        color: "#e2e8f0"
      }
    }, icon, " ", lbl), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: "#4a6080",
        marginTop: 2
      }
    }, note)), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "left"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        color: "#4a6080"
      }
    }, "تم السداد"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        fontWeight: 900,
        color: T.green
      }
    }, fmt(Math.round(paid)), " ج"))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement(Bar, {
      v: paid,
      max: original,
      c: color,
      h: 10
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        fontWeight: 900,
        color,
        whiteSpace: "nowrap"
      }
    }, p, "%")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: 4,
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: T.bg,
        borderRadius: 8,
        padding: "7px 4px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        color: "#4a6080"
      }
    }, "الأصل"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        color: "#64748b"
      }
    }, fmt(original), " ج")), /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#ef444411",
        borderRadius: 8,
        padding: "7px 4px",
        border: "1px solid #ef444422"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        color: "#4a6080"
      }
    }, "المتبقي"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 900,
        color: T.red
      }
    }, fmt(Math.round(remaining * 100) / 100), " ج")), /*#__PURE__*/React.createElement("div", {
      style: {
        background: color + "11",
        borderRadius: 8,
        padding: "7px 4px",
        border: `1px solid ${color}22`
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        color: "#4a6080"
      }
    }, "القسط"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        color
      }
    }, qist))));
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "13px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: S.sub
  }, "💳 القروض (محدّث تلقائياً)"), /*#__PURE__*/React.createElement(LoanCard, {
    icon: "🏦",
    lbl: "السلفة",
    color: T.purple,
    original: SALFA_ORIGINAL,
    remaining: salfaRem,
    qist: "7,000 ج",
    note: "كل قسط عربية شهري يخصم من المتبقي تلقائياً"
  }), /*#__PURE__*/React.createElement(LoanCard, {
    icon: "🏠",
    lbl: "قسط الشقة",
    color: T.blue,
    original: APT_ORIGINAL,
    remaining: aptRem,
    qist: "~1,030 ج",
    note: "كل إيجار/قسط شهري يخصم من المتبقي تلقائياً"
  }), /*#__PURE__*/React.createElement("div", {
    style: S.sub
  }, "محاسبة النفس اليومية ✅"), /*#__PURE__*/React.createElement(WeightTracker, {
    storeKey: "mh_weight_v1",
    startWeight: 110,
    goalWeight: 85,
    name: "محمد",
    color: "#1565ff"
  }), /*#__PURE__*/React.createElement("div", {
    style: S.card()
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.row,
      marginBottom: 7
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 700
    }
  }, "إنجازك اليوم"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 18,
      fontWeight: 900,
      color: dp >= 70 ? T.green : T.orange
    }
  }, dp, "%")), /*#__PURE__*/React.createElement(Bar, {
    v: dp,
    max: 100,
    c: T.green
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10
    }
  }, ch.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.id,
    onClick: () => sCh(a => a.map(x => x.id === c.id ? {
      ...x,
      done: !x.done
    } : x)),
    style: {
      display: "flex",
      gap: 9,
      alignItems: "center",
      padding: "7px 0",
      borderBottom: `1px solid ${T.bdr}`,
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 19,
      height: 19,
      borderRadius: 4,
      border: `2px solid ${c.done ? T.green : "#2a3a55"}`,
      background: c.done ? T.green : "transparent",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0
    }
  }, c.done && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: "#fff",
      lineHeight: 1
    }
  }, "✓")), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: c.done ? "#4a6080" : "#e2e8f0",
      textDecoration: c.done ? "line-through" : "none",
      flex: 1
    }
  }, c.t), /*#__PURE__*/React.createElement("span", {
    onClick: e => { e.stopPropagation(); sCh(a => a.filter(x => x.id !== c.id)); },
    style: { fontSize: 14, color: T.red, cursor: "pointer", padding: "0 4px", opacity: 0.6 }
  }, "×"))))), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowMonthReport(v => !v),
    style: {
      width: "100%",
      marginTop: 12,
      padding: "10px",
      background: showMonthReport ? "#1565ff22" : "#1a2840",
      border: "1px solid #1565ff44",
      borderRadius: 10,
      color: "#7aa3d4",
      fontSize: 13,
      fontWeight: 700,
      cursor: "pointer"
    }
  }, showMonthReport ? "▲ إخفاء تقرير الشهر" : "📊 تقرير الشهر"), showMonthReport && /*#__PURE__*/React.createElement("div", {
    style: { ...S.card("#1565ff11"), border: "1px solid #1565ff22", marginTop: 8 }
  }, /*#__PURE__*/React.createElement("div", {
    style: { fontSize: 13, fontWeight: 700, color: T.blue, marginBottom: 10 }
  }, "📊 تقرير هذا الشهر"), monthReport.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: { fontSize: 12, color: "#4a6080", textAlign: "center", padding: 10 }
  }, "مفيش بيانات لهذا الشهر لسه") : monthReport.map((r, i) => {
    const pct = r.total > 0 ? Math.round(r.days / r.total * 100) : 0;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: { marginBottom: 8 }
    }, /*#__PURE__*/React.createElement("div", {
      style: { display: "flex", justifyContent: "space-between", marginBottom: 3 }
    }, /*#__PURE__*/React.createElement("span", {
      style: { fontSize: 11, color: "#e2e8f0" }
    }, r.t), /*#__PURE__*/React.createElement("span", {
      style: { fontSize: 11, fontWeight: 700, color: pct >= 70 ? T.green : pct >= 40 ? T.orange : T.red }
    }, r.days, "/", r.total, " (", pct, "%)")
    ), /*#__PURE__*/React.createElement(Bar, { v: r.days, max: r.total, c: pct >= 70 ? T.green : pct >= 40 ? T.orange : T.red, h: 5 }));
  })), /*#__PURE__*/React.createElement("div", {
    style: S.sub
  }, "أهدافي 2026 🎯"), /*#__PURE__*/React.createElement("div", {
    style: S.card()
  }, gl.map(g => /*#__PURE__*/React.createElement("div", {
    key: g.id,
    onClick: () => sGl(a => a.map(x => x.id === g.id ? {
      ...x,
      done: !x.done
    } : x)),
    style: {
      display: "flex",
      gap: 9,
      alignItems: "center",
      padding: "7px 0",
      borderBottom: `1px solid ${T.bdr}`,
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 19,
      height: 19,
      borderRadius: 99,
      border: `2px solid ${g.done ? T.blue : "#2a3a55"}`,
      background: g.done ? T.blue : "transparent",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0
    }
  }, g.done && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: "#fff",
      lineHeight: 1
    }
  }, "✓")), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: g.done ? "#4a6080" : "#e2e8f0",
      textDecoration: g.done ? "line-through" : "none",
      flex: 1
    }
  }, g.t), /*#__PURE__*/React.createElement("span", {
    onClick: e => { e.stopPropagation(); sGl(a => a.filter(x => x.id !== g.id)); },
    style: { fontSize: 14, color: T.red, cursor: "pointer", padding: "0 4px", opacity: 0.6 }
  }, "×"))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      display: "flex",
      gap: 7
    }
  }, /*#__PURE__*/React.createElement("input", {
    style: {
      ...S.inp,
      marginBottom: 0,
      flex: 1
    },
    type: "text",
    placeholder: "أضف هدف جديد...",
    value: ng,
    onChange: e => sNg(e.target.value),
    onKeyDown: e => {
      if (e.key === "Enter" && ng.trim()) {
        sGl(g => [...g, {
          id: Date.now(),
          t: ng.trim(),
          done: false
        }]);
        sNg("");
      }
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if (ng.trim()) {
        sGl(g => [...g, {
          id: Date.now(),
          t: ng.trim(),
          done: false
        }]);
        sNg("");
      }
    },
    style: {
      ...S.btn(T.blue),
      width: "auto",
      padding: "9px 14px",
      marginTop: 0
    }
  }, "+"))));
}

// ══════════════════════════════════════════════════════════════
// WEIGHT TRACKER COMPONENT
// ══════════════════════════════════════════════════════════════
const CLD_CLOUD = "tpzkvsa6";
const CLD_PRESET = "Mohamed";
const OPENROUTER_KEY = "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";

async function openRouterAnalyze(b64, mime, prompt) {
  const body = {
    model: "google/gemini-flash-1.5",
    messages: [{
      role: "user",
      content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: `data:${mime || "image/jpeg"};base64,${b64}` } }
      ]
    }]
  };
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://mohamedhossamomara01-maker.github.io/budget-app/",
      "X-Title": "Mohamed Budget App"
    },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices?.[0]?.message?.content || "مش قادر أحلل دلوقتي";
}

async function analyzeBodyPhoto(base64Data, mimeType) {
  return openRouterAnalyze(
    base64Data,
    mimeType,
    "أنت مساعد لياقة بدنية. حلل هذه الصورة وأعطني ملاحظات عن الجسم مثل: الوجه، منطقة البطن، الجسم عموماً. كن إيجابياً ومشجعاً. الرد بالعربية فقط في 3-4 جمل قصيرة."
  );
}

async function compareBodyPhotos(b64A, b64B, weightA, weightB, mimeA, mimeB) {
  const diff = Math.abs(weightA - weightB).toFixed(1);
  const body = {
    model: "google/gemini-flash-1.5",
    messages: [{
      role: "user",
      content: [
        { type: "text", text: `قارن بين الصورتين. الصورة الأولى وزنها ${weightA} كجم والثانية ${weightB} كجم، الفرق ${diff} كجم. وضح الفروق المرئية بشكل إيجابي ومشجع. الرد بالعربية في 4-5 جمل.` },
        { type: "image_url", image_url: { url: `data:${mimeA || "image/jpeg"};base64,${b64A}` } },
        { type: "image_url", image_url: { url: `data:${mimeB || "image/jpeg"};base64,${b64B}` } }
      ]
    }]
  };
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://mohamedhossamomara01-maker.github.io/budget-app/",
      "X-Title": "Mohamed Budget App"
    },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices?.[0]?.message?.content || "مش قادر أقارن دلوقتي";
}

async function uploadToCloudinary(file) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", CLD_PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLD_CLOUD}/image/upload`, { method: "POST", body: fd });
  const data = await res.json();
  return data.secure_url;
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
  // cache base64 محلي للتحليل بـ Gemini (مش بيتحفظ في localStorage)
  const b64Cache = useRef({});

  useEffect(() => sv(storeKey, entries), [entries]);

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
    )
  );
}

// ══════════════════════════════════════════════════════════════
// DUHA GOALS SCREEN
// ══════════════════════════════════════════════════════════════
const DUHA_CHECK_DEF_DEFAULT = ["اذكار الصباح", "تمرين", "تظبيط اكل الفطار", "تظبيط اكل الغدا", "تظبيط اكل العشا", "اذكار المساء", "الصلاه في ميعادها", "الفجر في ميعاده"];
const DUHA_GOALS_DEF_DEFAULT = ["اخسي لحد وزن معين", "تمرين منتظم", "قراءة يومية"];

function DuhaGoalsSection() {
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
    /*#__PURE__*/React.createElement(WeightTracker, {
      storeKey: "dh_weight_v1",
      startWeight: 110,
      goalWeight: 80,
      name: "ضحي",
      color: "#ec4899"
    }),
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
    /*#__PURE__*/React.createElement("div", { style: S.sub }, "أهدافها 🎯"),
    /*#__PURE__*/React.createElement("div", { style: S.card() },
      gl.map(g => /*#__PURE__*/React.createElement("div", {
        key: g.id,
        style: { display: "flex", gap: 9, alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${T.bdr}` }
      },
        /*#__PURE__*/React.createElement("div", {
          onClick: () => sGl(a => a.map(x => x.id === g.id ? { ...x, done: !x.done } : x)),
          style: { width: 19, height: 19, borderRadius: 99, border: `2px solid ${g.done ? T.blue : "#2a3a55"}`, background: g.done ? T.blue : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }
        }, g.done && /*#__PURE__*/React.createElement("span", { style: { fontSize: 11, color: "#fff", lineHeight: 1 } }, "✓")),
        /*#__PURE__*/React.createElement("span", {
          onClick: () => sGl(a => a.map(x => x.id === g.id ? { ...x, done: !x.done } : x)),
          style: { fontSize: 12, color: g.done ? "#4a6080" : "#e2e8f0", textDecoration: g.done ? "line-through" : "none", flex: 1, cursor: "pointer" }
        }, g.t),
        /*#__PURE__*/React.createElement("span", {
          onClick: () => sGl(a => a.filter(x => x.id !== g.id)),
          style: { fontSize: 14, color: T.red, cursor: "pointer", padding: "0 4px", opacity: 0.6 }
        }, "×")
      )),
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
    )
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════
function App() {
  const [entries, setEn] = useState(() => ld("mhapp_v8", []));
  const [deletedXl, setDelXl] = useState(() => ld("mhdelxl_v1", []));
  const [monthly, setMo] = useState(() => ld("mhmonth_v8", {}));
  const [indExtra, setIE] = useState(() => ld("mhind_v8", []));
  const [tab, setTab] = useState("summary");
  const [homeInitialView, setHomeInitialView] = useState(null);
  const [mk, setMk] = useState(currentFinMonth());
  const [modal, setMod] = useState(false);
  const [syncing, setSync] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const syncTimer = useRef(null);

  // حفظ محلي فوري
  useEffect(() => sv("mhapp_v8", entries), [entries]);
  useEffect(() => sv("mhdelxl_v1", deletedXl), [deletedXl]);
  useEffect(() => sv("mhmonth_v8", monthly), [monthly]);
  useEffect(() => sv("mhind_v8", indExtra), [indExtra]);

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
    l: "الأكل والبيت"
  }, {
    k: "car",
    ic: "🚗",
    l: "العربية"
  }, {
    k: "indrive",
    ic: "🛺",
    l: "إندرايف"
  }, {
    k: "goals",
    ic: "🎯",
    l: "أهدافي"
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: S.root
  }, /*#__PURE__*/React.createElement("style", null, `@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
    *{box-sizing:border-box;}input::-webkit-outer-spin-button,input::-webkit-inner-spin-button{-webkit-appearance:none;}
    ::-webkit-scrollbar{width:4px;height:4px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:#1a2840;border-radius:99px;}`), /*#__PURE__*/React.createElement("div", {
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
  }, tab === "summary" ? "📊 الملخص" : tab === "duha" ? "👩 ضحي" : tab === "food" ? "🛒 الأكل والبيت" : tab === "car" ? "🚗 العربية" : tab === "indrive" ? "🛺 إندرايف" : "🎯 أهدافي"), /*#__PURE__*/React.createElement("div", {
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
  }, "محمد حسام"), sb && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: syncing ? "#f59e0b" : lastSync ? "#10b981" : "#4a6080",
      display: "flex",
      alignItems: "center",
      gap: 3
    }
  }, /*#__PURE__*/React.createElement("span", null, syncing ? "⟳" : "☁️"), /*#__PURE__*/React.createElement("span", null, syncing ? "جاري الحفظ..." : lastSync ? "محفوظ على السحابة" : "غير متصل")), !sb && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: "#ef4444"
    }
  }, "⚠️ محلي فقط"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 5,
      alignItems: "center"
    }
  }, tab !== "goals" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
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
  }, "›")), /*#__PURE__*/React.createElement("button", {
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
  }, "✏️")))), tab === "summary" && /*#__PURE__*/React.createElement(SummaryScreen, {
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
  }), tab === "duha" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(CategoryScreen, {
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
    addTitle: "إضافة مصروف ضحي"
  }), /*#__PURE__*/React.createElement(DuhaGoalsSection, null)), tab === "food" && /*#__PURE__*/React.createElement(CategoryScreen, {
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
    headerLabel: "الأكل والبيت",
    noBudget: true,
    addTitle: "إضافة مصروف بيت"
  }), tab === "car" && /*#__PURE__*/React.createElement(CarScreen, {
    entries: entries,
    onAdd: addE,
    onDel: delE,
    mk: mk
  }), tab === "indrive" && /*#__PURE__*/React.createElement(IndriveScreen, {
    indExtra: indExtra,
    onAddInd: addInd,
    onDelInd: delInd,
    mk: mk
  }), tab === "goals" && /*#__PURE__*/React.createElement(GoalsScreen, {
    monthly: monthly
  }), modal && /*#__PURE__*/React.createElement(SalaryModal, {
    mk: mk,
    monthly: monthly,
    onSave: saveM,
    onClose: () => setMod(false)
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      maxWidth: 480,
      margin: "0 auto",
      background: T.bg,
      borderTop: `1px solid ${T.bdr}`,
      display: "flex",
      zIndex: 20
    }
  }, NAV.map(n => /*#__PURE__*/React.createElement("button", {
    key: n.k,
    onClick: () => setTab(n.k),
    style: {
      flex: 1,
      padding: "10px 0",
      border: "none",
      background: "transparent",
      color: tab === n.k ? T.blue : "#2a3a55",
      fontFamily: "'Cairo',sans-serif",
      fontSize: 10,
      fontWeight: 700,
      cursor: "pointer",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 19
    }
  }, n.ic), /*#__PURE__*/React.createElement("span", null, n.l)))));
}
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));
  });
})();
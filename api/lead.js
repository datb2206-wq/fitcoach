/**
 * POST /api/lead  (Vercel Serverless Function)
 *
 * Khách gửi Phiếu Khám Cơ Thể ở trang chủ -> đổ dữ liệu về (nơi nào đã cấu hình thì gửi nơi đó):
 *   1. Trang admin (admin.html)      – cần UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 *   2. Google Sheets (mỗi khách 1 dòng) – cần GOOGLE_SHEETS_WEBHOOK_URL (xem google-apps-script.gs)
 *   3. Telegram báo ngay cho PT       – cần TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID
 *
 * Mỗi hồ sơ có sẵn "summary": 1 khối văn bản tóm tắt để PT copy nguyên đoạn dán vào công cụ lập Plan.
 */
import { randomUUID } from "node:crypto";
import { hasStore, addLead } from "./_lib/store.js";
import { hasTelegram, notifyAdmin, esc } from "./_lib/telegram.js";

const SHEETS_URL = process.env.GOOGLE_SHEETS_WEBHOOK_URL || "";

const ACTIVITY_NAMES = { 1.2: "Ít vận động", 1.375: "Tập nhẹ 1–3 buổi/tuần", 1.55: "Tập vừa 3–5 buổi/tuần", 1.725: "Vận động nhiều" };
export const PLACE_NAMES = { home: "Tập tại nhà (không có dụng cụ)", home_gear: "Tập tại nhà (có tạ đơn / dây kháng lực)", gym: "Tập tại phòng Gym" };
const SESSIONS = { 3: "3 buổi/tuần", 4: "4 buổi/tuần", "5-6": "5–6 buổi/tuần" };
const EATING = ["Ăn cơm cùng gia đình", "Tự nấu riêng được", "Thường xuyên ăn quán/cơm văn phòng"];

const clean = (v, max = 200) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");
const num = (v, min, max) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? Math.round(n * 10) / 10 : null;
};
const vn = (n, d = 0) => Number(n).toLocaleString("vi-VN", { maximumFractionDigits: d });

// Số Zalo Việt Nam: 10 số, bắt đầu bằng 0 (tự đổi +84 / 84 thành 0)
function normalizePhone(v) {
  let d = typeof v === "string" ? v.replace(/[^\d+]/g, "") : "";
  if (d.startsWith("+84")) d = "0" + d.slice(3);
  else if (/^84\d{9}$/.test(d)) d = "0" + d.slice(2);
  return d;
}

// Đoán cân nặng mục tiêu từ câu "Muốn giảm 5kg trong 2 tháng" / "về 55kg"
function targetFromText(text, weight) {
  const m = text.match(/(\d+(?:[.,]\d+)?)\s*(?:kg|ký|ki|cân)/i);
  if (!m || !weight) return null;
  const n = parseFloat(m[1].replace(",", "."));
  if (!n) return null;
  const t = n < weight * 0.5 ? weight - n : n; // số nhỏ = số kg muốn giảm, số lớn = cân nặng muốn đạt
  return t >= 30 && t < weight ? Math.round(t * 10) / 10 : null;
}

// Chỉ số tính sẵn (giống công cụ tính calo trên trang chủ): BMI châu Á, Mifflin-St Jeor, TDEE - 400
export function quickMetrics(l) {
  const h = l.height / 100;
  const bmi = l.weight / (h * h);
  const cat = bmi < 18.5 ? "thiếu cân" : bmi < 23 ? "bình thường" : bmi < 25 ? "thừa cân" : "béo phì";
  const bmr = 10 * l.weight + 6.25 * l.height - 5 * l.age + (l.sex === "male" ? 5 : -161);
  const tdee = bmr * (l.activity || 1.375);
  const floor = l.sex === "male" ? 1500 : 1200;
  const target = bmi >= 18.5 && l.age >= 18 ? Math.max(floor, tdee - 400) : tdee;
  return { bmi, cat, tdee, target };
}

// Khối văn bản tóm tắt hồ sơ: PT copy nguyên đoạn dán vào công cụ lập Plan
export function buildSummary(l) {
  const m = quickMetrics(l);
  return [
    "HỒ SƠ KHÁM KHÁCH HÀNG",
    `- Họ tên: ${l.name}`,
    `- Zalo: ${l.contact}`,
    `- Giới tính / tuổi: ${l.sex === "male" ? "Nam" : "Nữ"}, ${l.age} tuổi`,
    `- Chiều cao / cân nặng: ${l.height} cm / ${l.weight} kg (BMI ${vn(m.bmi, 1)} – ${m.cat})`,
    `- Mục tiêu: ${l.goalText || "—"}${l.target ? ` (cân nặng mục tiêu ~${l.target} kg)` : ""}`,
    `- Nơi tập: ${PLACE_NAMES[l.place] || "—"}`,
    `- Số buổi tập/tuần: ${SESSIONS[l.sessions] || "—"}`,
    `- Thói quen ăn uống: ${l.eating || "—"}`,
    `- Sức khỏe / chấn thương / dị ứng: ${l.note || "Không ghi"}`,
    `- Gói quan tâm: ${l.plan || "Cần tư vấn thêm"}`,
    `- Mức vận động: ${l.activityFromCalc ? ACTIVITY_NAMES[l.activity] : "chưa rõ (ước tính: tập nhẹ 1–3 buổi/tuần)"}`,
    `- Ước tính: TDEE ~${vn(m.tdee)} kcal/ngày; calo giảm cân (TDEE - 400) ~${vn(m.target)} kcal/ngày`,
  ].join("\n");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!hasStore() && !hasTelegram() && !SHEETS_URL) {
    console.error("[lead] Chưa cấu hình nơi nhận: Upstash, Google Sheets hoặc Telegram");
    return res.status(500).json({ error: "Server chưa cấu hình nơi nhận đăng ký" });
  }

  const body = typeof req.body === "string" ? safeJson(req.body) : req.body || {};

  // Bot điền vào ô ẩn (honeypot) -> giả vờ thành công, không lưu
  if (clean(body.website)) return res.status(200).json({ ok: true });

  const activity = ACTIVITY_NAMES[body.activity] ? Number(body.activity) : null;
  const lead = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    status: "new",
    lang: "vi",
    name: clean(body.name, 80),
    contact: normalizePhone(body.contact),
    sex: body.sex === "male" ? "male" : "female",
    age: num(body.age, 14, 90),
    height: num(body.height, 120, 230),
    weight: num(body.weight, 30, 250),
    activity: activity || 1.375,
    activityFromCalc: Boolean(activity),
    goalText: clean(body.goalText, 120),
    place: PLACE_NAMES[body.place] ? body.place : "",
    sessions: SESSIONS[body.sessions] ? String(body.sessions) : "",
    eating: EATING.includes(body.eating) ? body.eating : "",
    note: clean(body.note, 1000),
    plan: clean(body.plan, 80),
    goalIdx: 1, // "Siết cân, giảm cân toàn thân" (trang admin dùng để gợi ý)
    goal: "",
    advice: "",
  };
  lead.target = targetFromText(lead.goalText, lead.weight);
  lead.goal = lead.goalText;

  if (lead.name.length < 2 || !/^0\d{9}$/.test(lead.contact) || !lead.age || !lead.height || !lead.weight || !lead.place) {
    return res.status(400).json({ error: "Thiếu thông tin bắt buộc" });
  }
  lead.summary = buildSummary(lead);

  const tasks = [];
  if (hasStore()) tasks.push(["store", () => addLead(lead)]);
  if (SHEETS_URL) tasks.push(["sheets", () => sendToSheets(lead)]);
  if (hasTelegram()) tasks.push(["telegram", () => notifyAdmin(telegramText(lead, req.headers.host))]);

  const results = await Promise.allSettled(tasks.map(([, fn]) => fn()));
  results.forEach((r, i) => r.status === "rejected" && console.error(`[lead] ${tasks[i][0]} lỗi:`, r.reason));

  // Chỉ báo lỗi cho khách khi KHÔNG nơi nào nhận được
  if (results.every((r) => r.status === "rejected")) return res.status(502).json({ error: "Gửi đăng ký thất bại" });
  return res.status(200).json({ ok: true });
}

// Google Sheets: Apps Script nhận JSON và thêm 1 dòng (xem google-apps-script.gs)
async function sendToSheets(l) {
  const res = await fetch(SHEETS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      thoiGian: new Date(l.createdAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }),
      hoTen: l.name,
      zalo: l.contact,
      gioiTinh: l.sex === "male" ? "Nam" : "Nữ",
      tuoi: l.age,
      chieuCao: l.height,
      canNang: l.weight,
      mucTieu: l.goalText,
      noiTap: PLACE_NAMES[l.place] || "",
      soBuoi: SESSIONS[l.sessions] || "",
      thoiQuenAn: l.eating,
      sucKhoe: l.note,
      goi: l.plan,
      tomTat: l.summary,
      id: l.id,
    }),
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`Google Sheets: HTTP ${res.status}`);
}

function telegramText(l, host) {
  const time = new Date(l.createdAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  return [
    "🔥 <b>PHIẾU KHÁM MỚI</b> · " + time,
    `👤 <b>${esc(l.name)}</b> · 📱 <a href="https://zalo.me/${l.contact}">Chat Zalo ${l.contact}</a>`,
    hasStore() ? `👉 <a href="https://${host}/admin.html#${l.id}">Mở trang admin</a>` : null,
    "",
    "📸 Nhắc khách gửi 3 ảnh dáng người (trước – ngang – sau) qua Zalo, rồi gửi giáo án 3 ngày miễn phí.",
    "",
    "📋 Bấm vào khối dưới để sao chép hồ sơ:",
    `<pre>${esc(l.summary)}</pre>`,
  ]
    .filter((x) => x !== null)
    .join("\n");
}

function safeJson(s) {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}

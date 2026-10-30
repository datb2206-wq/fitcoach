/**
 * POST /api/lead  (Vercel Serverless Function)
 *
 * Khách gửi form đăng ký -> lưu vào danh sách trên trang admin (admin.html)
 * và (nếu có cấu hình) báo ngay về Telegram kèm link mở trang admin.
 *
 * Biến môi trường:
 *   UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN – lưu khách để xem trên admin.html (khuyên dùng)
 *   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID             – báo Telegram khi có khách mới (không bắt buộc)
 */
import { randomUUID } from "node:crypto";
import { hasStore, addLead } from "./_lib/store.js";
import { hasTelegram, notifyAdmin, esc } from "./_lib/telegram.js";

const LANG_NAMES = { vi: "Tiếng Việt", en: "English", zh: "中文" };
const ACTIVITY_NAMES = { 1.2: "Ít vận động", 1.375: "Nhẹ", 1.55: "Vừa", 1.725: "Nhiều" };

const clean = (v, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const num = (v, min, max) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? Math.round(n * 10) / 10 : null;
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!hasStore() && !hasTelegram()) {
    console.error("[lead] Chưa cấu hình Upstash hoặc Telegram");
    return res.status(500).json({ error: "Server chưa cấu hình nơi nhận đăng ký" });
  }

  const body = typeof req.body === "string" ? safeJson(req.body) : req.body || {};

  // Bot điền vào ô ẩn (honeypot) -> giả vờ thành công, không lưu
  if (clean(body.website)) return res.status(200).json({ ok: true });

  const lead = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    status: "new",
    lang: LANG_NAMES[body.lang] ? body.lang : "vi",
    name: clean(body.name, 80),
    contact: clean(body.contact, 200),
    sex: body.sex === "male" ? "male" : "female",
    age: num(body.age, 14, 90),
    height: num(body.height, 120, 230),
    weight: num(body.weight, 30, 250),
    target: num(body.target, 30, 250),
    activity: ACTIVITY_NAMES[body.activity] ? Number(body.activity) : 1.375,
    goalIdx: Number.isInteger(body.goalIdx) && body.goalIdx >= 0 && body.goalIdx <= 4 ? body.goalIdx : 1,
    goal: clean(body.goal, 80),
    plan: clean(body.plan, 80),
    note: clean(body.note, 1000),
    advice: "",
  };

  if (lead.name.length < 2 || lead.contact.length < 3 || !lead.age || !lead.height || !lead.weight) {
    return res.status(400).json({ error: "Thiếu thông tin bắt buộc" });
  }

  const errors = [];

  if (hasStore()) {
    try {
      await addLead(lead);
    } catch (err) {
      console.error("[lead] Lưu thất bại:", err, lead);
      errors.push("store");
    }
  }

  if (hasTelegram()) {
    const adminUrl = `https://${req.headers.host}/admin.html#${lead.id}`;
    const time = new Date(lead.createdAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
    const text = [
      "🔥 <b>KHÁCH HÀNG MỚI ĐĂNG KÝ</b>",
      "",
      `👤 <b>${esc(lead.name)}</b> · ${lead.sex === "male" ? "Nam" : "Nữ"}, ${lead.age} tuổi`,
      `📩 ${esc(lead.contact)}`,
      `⚖️ ${lead.weight} kg${lead.target ? ` → ${lead.target} kg` : ""} · 📏 ${lead.height} cm · 🏃 ${ACTIVITY_NAMES[lead.activity]}`,
      `🎯 ${esc(lead.goal || "—")} · 💎 ${esc(lead.plan || "Cần tư vấn")}`,
      lead.note ? `📝 ${esc(lead.note)}` : null,
      `🌐 ${LANG_NAMES[lead.lang]} · 🕒 ${time}`,
      "",
      hasStore() ? `👉 <a href="${adminUrl}">Mở trang admin để soạn lộ trình</a>` : null,
    ]
      .filter((l) => l !== null)
      .join("\n");
    try {
      await notifyAdmin(text);
    } catch (err) {
      console.error("[lead] Telegram lỗi:", err);
      errors.push("telegram");
    }
  }

  // Chỉ báo lỗi cho khách khi KHÔNG nơi nào nhận được
  const channels = (hasStore() ? 1 : 0) + (hasTelegram() ? 1 : 0);
  if (errors.length >= channels) return res.status(502).json({ error: "Gửi đăng ký thất bại" });
  return res.status(200).json({ ok: true });
}

function safeJson(s) {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}

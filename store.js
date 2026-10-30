/**
 * Lưu danh sách khách đăng ký trong Upstash Redis (gói miễn phí là đủ).
 * Thư mục bắt đầu bằng "_" nên Vercel không biến file này thành API.
 *
 * Biến môi trường (tạo database tại https://console.upstash.com hoặc Vercel → Storage → Upstash):
 *   UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
 *   (hoặc KV_REST_API_URL, KV_REST_API_TOKEN nếu tạo qua Vercel)
 */

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

const LIST_KEY = "leads"; // danh sách id, mới nhất ở đầu
const MAX_LEADS = 2000;

export const hasStore = () => Boolean(REDIS_URL && REDIS_TOKEN);
export const isLeadId = (v) => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);

// Gửi nhiều lệnh Redis trong 1 request
async function pipeline(commands) {
  const res = await fetch(`${REDIS_URL}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
  });
  const data = await res.json();
  if (!res.ok || !Array.isArray(data)) throw new Error(`Redis: ${data.error || res.status}`);
  const failed = data.find((r) => r.error);
  if (failed) throw new Error(`Redis: ${failed.error}`);
  return data.map((r) => r.result);
}

/**
 * Một khách đăng ký:
 * { id, createdAt, status: "new" | "sent", lang, name, contact, sex, age, height, weight, target,
 *   activity, goalIdx, goal, plan, note, advice, adviceUpdatedAt, sentAt }
 */
export async function addLead(lead) {
  await pipeline([
    ["SET", `lead:${lead.id}`, JSON.stringify(lead)],
    ["LPUSH", LIST_KEY, lead.id],
    ["LTRIM", LIST_KEY, 0, MAX_LEADS - 1],
  ]);
}

export async function getLead(id) {
  const [raw] = await pipeline([["GET", `lead:${id}`]]);
  return raw ? JSON.parse(raw) : null;
}

export async function updateLead(lead) {
  await pipeline([["SET", `lead:${lead.id}`, JSON.stringify(lead)]]);
}

export async function deleteLead(id) {
  await pipeline([
    ["DEL", `lead:${id}`],
    ["LREM", LIST_KEY, 0, id],
  ]);
}

export async function listLeads(limit = 300) {
  const [ids] = await pipeline([["LRANGE", LIST_KEY, 0, limit - 1]]);
  if (!ids || !ids.length) return [];
  const [values] = await pipeline([["MGET", ...ids.map((id) => `lead:${id}`)]]);
  return values.filter(Boolean).map((v) => JSON.parse(v));
}

/* ----------------------------- BÀI ĐĂNG (BLOG) ----------------------------- */
/**
 * Một bài đăng:
 * { id, status: "published" | "draft", pinned, image, createdAt, updatedAt, publishedAt,
 *   i18n: { vi: { title, excerpt, content }, en: {...}, zh: {...} } }
 */
const POSTS_KEY = "posts";

export async function savePost(post, isNew) {
  const commands = [["SET", `post:${post.id}`, JSON.stringify(post)]];
  if (isNew) commands.push(["LPUSH", POSTS_KEY, post.id]);
  await pipeline(commands);
}

export async function getPost(id) {
  const [raw] = await pipeline([["GET", `post:${id}`]]);
  return raw ? JSON.parse(raw) : null;
}

export async function deletePost(id) {
  await pipeline([
    ["DEL", `post:${id}`],
    ["LREM", POSTS_KEY, 0, id],
  ]);
}

// Bài ghim lên đầu, sau đó bài mới nhất
export async function listPosts({ publishedOnly = false, limit = 100 } = {}) {
  const [ids] = await pipeline([["LRANGE", POSTS_KEY, 0, 299]]);
  if (!ids || !ids.length) return [];
  const [values] = await pipeline([["MGET", ...ids.map((id) => `post:${id}`)]]);
  return values
    .filter(Boolean)
    .map((v) => JSON.parse(v))
    .filter((p) => !publishedOnly || p.status === "published")
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || new Date(b.publishedAt || b.createdAt) - new Date(a.publishedAt || a.createdAt))
    .slice(0, limit);
}

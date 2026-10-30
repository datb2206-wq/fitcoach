/**
 * GET /api/posts  (Vercel Serverless Function, công khai)
 *
 * Trả về các bài đã ĐĂNG (status "published") để trang chủ hiển thị ở mục Blog.
 * Bài do admin viết trên admin.html (tab "Bài đăng"). Trang chủ nhận bài mới sau tối đa ~30 giây.
 */
import { hasStore, listPosts } from "./_lib/store.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!hasStore()) return res.status(200).json({ posts: [] });

  try {
    const posts = (await listPosts({ publishedOnly: true, limit: 6 })).map((p) => ({
      id: p.id,
      pinned: Boolean(p.pinned),
      image: p.image || "",
      publishedAt: p.publishedAt || p.createdAt,
      i18n: p.i18n,
    }));
    // Cache ngắn trên CDN của Vercel: nhanh mà bài mới vẫn lên trong ~30 giây
    res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=300");
    return res.status(200).json({ posts });
  } catch (err) {
    console.error("[posts]", err);
    return res.status(200).json({ posts: [] });
  }
}

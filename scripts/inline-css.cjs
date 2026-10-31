// Chạy tự động trong:  npm run build:css
//  1. Nhúng assets/site.css vào index.html  -> trang tự hiển thị đầy đủ giao diện, không phụ thuộc file CSS ngoài.
//  2. Chép config.js vào index.html làm bản DỰ PHÒNG (chỉ dùng khi thiếu file config.js).
//  3. Nhúng ảnh học viên (khai báo trong config.js, nằm trong thư mục images/) vào index.html
//     -> ảnh vẫn hiện kể cả khi chỉ mở / chỉ tải lên mỗi file index.html.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const file = path.join(root, "index.html");
let html = fs.readFileSync(file, "utf8");

function replaceBetween(name, content) {
  const start = `<!-- ${name}:START (tự sinh bởi npm run build:css, đừng sửa tay) -->`;
  const end = `<!-- ${name}:END -->`;
  const a = html.indexOf(start);
  const b = html.indexOf(end);
  if (a < 0 || b < 0) throw new Error(`Không tìm thấy dấu mốc ${name} trong index.html`);
  html = html.slice(0, a + start.length) + "\n  " + content + "\n  " + html.slice(b);
}

const css = fs.readFileSync(path.join(root, "assets/site.css"), "utf8").trim();
replaceBetween("SITE-CSS", `<style>${css}</style>`);

const config = fs.readFileSync(path.join(root, "config.js"), "utf8").replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, "").replace(/\n\s*\n/g, "\n").trim();
replaceBetween("SITE-CONFIG", `<script>if (!window.SITE_CONFIG) {\n${config}\n}</script>`);

// Ảnh học viên: đọc danh sách từ config.js, nhúng dạng data:image/webp;base64
const sandbox = { window: {} };
new Function("window", fs.readFileSync(path.join(root, "config.js"), "utf8"))(sandbox.window);
const paths = new Set();
for (const r of sandbox.window.SITE_CONFIG.RESULTS || []) {
  if (r.image) paths.add(r.image);
  (r.images || []).forEach((im) => im.src && paths.add(im.src));
}
const images = {};
let bytes = 0;
for (const p of paths) {
  const full = path.join(root, p);
  if (/^https?:/i.test(p) || !fs.existsSync(full)) continue;
  const buf = fs.readFileSync(full);
  const ext = path.extname(p).slice(1).toLowerCase().replace("jpg", "jpeg");
  images[p] = `data:image/${ext};base64,${buf.toString("base64")}`;
  bytes += buf.length;
}
replaceBetween("SITE-IMAGES", `<script>window.SITE_IMAGES = ${JSON.stringify(images)};</script>`);

fs.writeFileSync(file, html);
console.log(`Đã nhúng ${Object.keys(images).length} ảnh học viên (${Math.round(bytes / 1024)} KB)`);
console.log(`Đã nhúng CSS (${css.length.toLocaleString()} ký tự) và cấu hình dự phòng vào index.html`);

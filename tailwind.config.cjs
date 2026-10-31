/** Cấu hình Tailwind cho trang chủ (index.html).
 * Sửa giao diện xong chạy:  npm install  rồi  npm run build:css
 * để tạo lại file assets/site.css (trang chủ dùng file CSS dựng sẵn này cho nhanh, không dùng CDN).
 */
module.exports = {
  content: ["./index.html", "./config.js"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Be Vietnam Pro"', "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      colors: {
        primary: { DEFAULT: "#1089ff", dark: "#006fdc", light: "#e7f2ff" },
        leaf: { DEFAULT: "#a3cb4c", dark: "#6f9424", light: "#f1f7e3" },
        zalo: "#0068ff",
        dark: "#131719",
        light: "#f8f9fd",
        body: "#6b7280",
        heading: "#25282b",
      },
      boxShadow: {
        card: "0 20px 40px -14px rgba(16, 24, 40, 0.14)",
      },
    },
  },
};

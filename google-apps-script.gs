/**
 * NHẬN PHIẾU KHÁM VÀO GOOGLE SHEETS (miễn phí)
 * ------------------------------------------------------------------
 * Cách cài (làm 1 lần, khoảng 5 phút):
 *  1. Tạo 1 Google Sheet mới (VD: "Phiếu khám khách hàng").
 *  2. Menu Tiện ích mở rộng (Extensions) → Apps Script. Xoá code mẫu, dán toàn bộ file này vào, bấm Lưu.
 *  3. Bấm Triển khai (Deploy) → Tùy chọn triển khai mới (New deployment) → chọn loại "Ứng dụng web" (Web app):
 *       - Thực thi dưới dạng (Execute as): Tôi (Me)
 *       - Người có quyền truy cập (Who has access): Bất kỳ ai (Anyone)
 *     Bấm Triển khai, cấp quyền cho tài khoản Google của bạn, rồi COPY "URL ứng dụng web" (kết thúc bằng /exec).
 *  4. Vào Vercel → Project → Settings → Environment Variables, thêm:
 *       GOOGLE_SHEETS_WEBHOOK_URL = <URL vừa copy>
 *     rồi Redeploy. Từ giờ mỗi khách gửi Phiếu Khám sẽ thành 1 dòng mới trong Sheet.
 *
 * Lưu ý: nếu sửa code này, phải Deploy → Quản lý triển khai → sửa phiên bản (Edit → New version) thì mới có hiệu lực.
 */

const HEADERS = [
  ["thoiGian", "Thời gian"],
  ["hoTen", "Họ tên"],
  ["zalo", "Số Zalo"],
  ["gioiTinh", "Giới tính"],
  ["tuoi", "Tuổi"],
  ["chieuCao", "Chiều cao (cm)"],
  ["canNang", "Cân nặng (kg)"],
  ["mucTieu", "Mục tiêu"],
  ["noiTap", "Nơi tập"],
  ["soBuoi", "Số buổi/tuần"],
  ["thoiQuenAn", "Thói quen ăn uống"],
  ["sucKhoe", "Sức khỏe / chấn thương / dị ứng"],
  ["goi", "Gói quan tâm"],
  ["tomTat", "Tóm tắt hồ sơ (copy dán vào AI)"],
  ["id", "Mã hồ sơ"],
];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const data = JSON.parse(e.postData.contents || "{}");
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS.map((h) => h[1]));
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
    }
    // Thêm dấu ' trước số Zalo để Google Sheets không làm mất số 0 ở đầu
    const row = HEADERS.map(([key]) => (key === "zalo" ? "'" + (data[key] || "") : data[key] == null ? "" : data[key]));
    sheet.appendRow(row);
    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

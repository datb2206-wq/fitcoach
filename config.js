/* =====================================================================
 * CẤU HÌNH TRANG CHỦ – chủ web tự sửa file này, không cần đụng vào index.html
 * Sửa xong: lưu file -> deploy lại Vercel (hoặc đẩy lên GitHub nếu đã nối Vercel).
 * ===================================================================== */
window.SITE_CONFIG = {
  /* ---------- PT ---------- */
  // Tên PT hiện trên web (ảnh đầu trang, popup cảm ơn, chân trang). Đổi tên ở đây là cả trang đổi theo.
  PT_NAME: "PT Minh Anh",

  /* ---------- Liên hệ ---------- */
  // Số Zalo của PT (10 số, viết liền). Nút Zalo nổi + nút "Mở Zalo" sau khi gửi form dùng số này.
  ZALO_PHONE: "0900000000",
  // ID / tên trang Facebook (Fanpage): m.me/<ID> mở Messenger, facebook.com/<ID> mở trang
  FANPAGE_ID: "fitcoach",
  EMAIL: "hello@fitcoach.vn",

  /* ---------- Quảng cáo Facebook ---------- */
  // Dán ID Meta Pixel (dãy số trong Events Manager). Để trống "" = chưa bật Pixel.
  // Sự kiện tự gửi: PageView (mở trang), Lead (gửi Phiếu Khám thành công), Contact (bấm Zalo / Messenger).
  META_PIXEL_ID: "",

  /* ---------- Bảng giá (đổi giá khuyến mãi khi chạy Ads ở đây) ---------- */
  PRICING: {
    // Cột đối chiếu (làm mờ, không có nút bấm)
    gymPT: {
      name: "PT Phòng Tập Truyền Thống",
      price: "5.000.000đ – 8.000.000đ",
      unit: "/ tháng",
      cons: ["Chi phí đắt đỏ khó duy trì lâu", "Phải di chuyển và phụ thuộc giờ giấc của PT", "Hết gói tập dễ bị tăng cân trở lại"],
    },
    plans: [
      {
        id: "dung-thu",
        name: "Dùng Thử 3 Ngày",
        badge: "MIỄN PHÍ",
        price: 0, // 0 = hiện chữ "Miễn phí"
        unit: "3 ngày đầu",
        features: [
          "Khám cơ thể miễn phí qua 3 ảnh dáng người (trước – ngang – sau), không cần lộ mặt",
          "Giáo án dinh dưỡng riêng cho 3 ngày đầu",
          "Giáo án tập riêng cho 3 ngày đầu (tại nhà hoặc phòng Gym)",
          "Không ưng ý? Dừng lại, không mất đồng nào",
        ],
        cta: "Nhận 3 Ngày Miễn Phí",
      },
      {
        id: "30-ngay",
        name: "Gói Đồng Hành 30 Ngày",
        badge: "SAU 3 NGÀY DÙNG THỬ",
        price: 288000,
        unit: "/ 30 ngày",
        days: 30, // dùng để tính "≈ ... đ/ngày"
        features: [
          "Mỗi ngày nhận giáo án tập và thực đơn dinh dưỡng mới",
          "PT kiểm tra bữa ăn & nhắc kỷ luật mỗi ngày qua Zalo",
          "Chỉnh kỹ thuật bài tập qua video",
          "Cập nhật cân nặng, số đo hằng tuần để điều chỉnh giáo án",
          "Đóng theo từng tháng, muốn dừng lúc nào cũng được",
        ],
        cta: "Đăng Ký Gói 30 Ngày",
      },
    ],
  },

  /* ---------- Kết quả học viên ----------
   * Mục này TỰ ẨN khi danh sách trống. Chỉ dùng ảnh học viên THẬT, đã xin phép và che mặt.
   * Ảnh để trong thư mục images/ket-qua/ (nên dùng .webp, rộng ~1000px). Thêm học viên mới: chép 1 khối { ... } rồi sửa số.
   *   before / after : cân nặng trước – sau (kg)      time : thời gian ("3 tháng", "36 buổi"…)
   *   who            : "Nam" / "Nữ"                    images : 1 hoặc nhiều góc chụp (mỗi góc 1 ảnh ghép trước–sau)
   * Ảnh chụp màn hình tin nhắn Zalo học viên báo cáo: { type: "zalo", image: "images/ket-qua/zalo-1.webp", caption: "Báo cáo bữa trưa ngày 12" }
   */
  RESULTS: [
    { who: "Nam", before: 86.2, after: 80.4, time: "36 buổi", images: [
      { src: "images/ket-qua/nam-862-804-36buoi-truoc.webp", label: "Chính diện" },
      { src: "images/ket-qua/nam-862-804-36buoi-nghieng.webp", label: "Nghiêng" },
    ] },
    { who: "Nam", before: 69.3, after: 63.7, time: "3 tháng", images: [{ src: "images/ket-qua/nam-693-637-3thang.webp", label: "Nghiêng" }] },
    { who: "Nữ", before: 56.7, after: 52.2, time: "40 buổi", images: [{ src: "images/ket-qua/nu-567-522-40buoi.webp", label: "Nghiêng" }] },
    { who: "Nữ", before: 63, after: 60, time: "15 buổi", images: [{ src: "images/ket-qua/nu-63-60-15buoi.webp", label: "Chính diện" }] },
    { who: "Nữ", before: 55, after: 52, time: "3 tháng", images: [{ src: "images/ket-qua/nu-55-52-3thang.webp", label: "Chính diện" }] },
    { who: "Nữ", before: 57, after: 54.5, time: "16 buổi", images: [{ src: "images/ket-qua/nu-57-545-16buoi.webp", label: "Chính diện" }] },
  ],
};

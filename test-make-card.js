// test-make-card.js
// Chạy thử trực tiếp (không cần web) để kiểm tra DLL + đầu đọc ngay tại quầy:
//   node test-make-card.js
// Đặt 1 thẻ trắng lên đầu đọc rồi chạy. Sửa roomNo/checkoutTime bên dưới cho đúng.
const lock = require('./lockSdk');

(function main() {
  try {
    const type = lock.configure();
    console.log('✅ Cấu hình đầu đọc OK. lockType =', type, '(4=RF57, 5=RF50)');
  } catch (e) {
    console.error('❌ Không cấu hình được đầu đọc:', e.message);
    process.exit(1);
  }

  // Test 1: đọc serial thẻ đang đặt trên đầu đọc
  const snr = lock.getCardSnr();
  console.log('Serial thẻ hiện tại:', snr);

  // Test 2: tạo thẻ khách (đổi roomNo cho khớp định dạng phần mềm khóa của bạn)
  const r = lock.makeGuestCard({
    roomNo: '1.2.28',
    checkoutTime: '2026-06-01 12:00:00',
    iflags: 0,
    waitMs: 8000,
  });
  console.log('Kết quả tạo thẻ:', r);
  console.log(r.ok ? '✅ TẠO THẺ THÀNH CÔNG' : '❌ TẠO THẺ THẤT BẠI');
})();

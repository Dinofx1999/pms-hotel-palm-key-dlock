// lockSdk.js
// ════════════════════════════════════════════════════════════════════
// Wrapper gọi LockSDK.dll (Windows, __stdcall) qua koffi.
//
// QUAN TRỌNG:
//  - Node phải CÙNG kiến trúc bit với DLL. SDK khóa cửa kiểu này thường là
//    32-bit → cài Node.js x86 (32-bit) trên máy quầy. Nếu sai bit sẽ lỗi
//    "could not load ... is not a valid Win32 application".
//  - Tất cả DLL phụ (RF57S.dll, RF50S.dll, des.dll, mbedtls_tx.dll, ...) phải
//    nằm CÙNG thư mục với LockSDK.dll (hoặc trong PATH). Đặt agent.js cùng thư mục
//    chứa toàn bộ DLL là chắc ăn nhất.
// ════════════════════════════════════════════════════════════════════
const koffi = require('koffi');
const path = require('path');

// Đường dẫn tới LockSDK.dll. Mặc định: cùng thư mục agent (nơi đặt mọi .dll).
//   Có thể override bằng biến môi trường LOCK_DLL_PATH.
const DLL_PATH = process.env.LOCK_DLL_PATH || path.join(__dirname, 'LockSDK.dll');

let lib = null;
let fns = null;
let configuredType = null; // lock_type đã cấu hình thành công (4 hoặc 5)

// Nạp DLL và khai báo chữ ký hàm (theo LockSDK.h).
function loadLib() {
  if (lib) return;
  lib = koffi.load(DLL_PATH);

  // koffi: '__stdcall' cho Win32 stdcall. Kiểu 'int', 'str' (char* in),
  //   '_Out_ char *' cho buffer nhận dữ liệu ra.
  fns = {
    // int TP_Configuration(int lock_type)
    Configuration: lib.func('__stdcall', 'TP_Configuration', 'int', ['int']),

    // int TP_GetCardSnr(char *card_snr)   -- card_snr OUT (>=20 byte)
    GetCardSnr: lib.func('__stdcall', 'TP_GetCardSnr', 'int', ['_Out_ char *']),

    // int TP_MakeGuestCardEx2(char *card_snr, char *room_no, char *checkin_time,
    //                         char *checkout_time, int iflags, int waitMs)
    MakeGuestCardEx2: lib.func('__stdcall', 'TP_MakeGuestCardEx2', 'int',
      ['_Out_ char *', 'str', 'str', 'str', 'int', 'int']),

    // int TP_ReadGuestCardEx2(char *card_snr, char *room_no, char *checkin_time,
    //                         char *checkout_time, int *iFlags, int waitMs)
    ReadGuestCardEx2: lib.func('__stdcall', 'TP_ReadGuestCardEx2', 'int',
      ['_Out_ char *', '_Out_ char *', '_Out_ char *', '_Out_ char *', '_Out_ int *', 'int']),

    // int TP_CancelCardEx2(char *card_snr, int waitMs)
    CancelCardEx2: lib.func('__stdcall', 'TP_CancelCardEx2', 'int', ['_Out_ char *', 'int']),
  };
}

// Cấp buffer char* cho tham số OUT, đọc lại chuỗi C (cắt ở \0).
function outBuf(size = 64) {
  return Buffer.alloc(size);
}
function readCStr(buf) {
  const i = buf.indexOf(0);
  return buf.toString('latin1', 0, i === -1 ? buf.length : i).trim();
}

// ── Cấu hình SDK: tự dò loại đầu đọc (RF57=4, RF50=5) ──────────────
//   Trả về lock_type chạy được, hoặc ném lỗi nếu cả hai đều thất bại.
function configure(preferType) {
  loadLib();
  const candidates = preferType ? [preferType] : [4, 5]; // thử RF57 trước, rồi RF50
  let lastRet = null;
  for (const t of candidates) {
    const ret = fns.Configuration(t);
    lastRet = ret;
    // Quy ước SDK: hàm trả 0 = thành công (theo "返回值：错误代码", 0 nghĩa là không lỗi).
    if (ret === 0) {
      configuredType = t;
      return t;
    }
  }
  throw new Error(`TP_Configuration thất bại cho cả RF57/RF50 (mã lỗi cuối: ${lastRet})`);
}

function ensureConfigured() {
  if (configuredType === null) configure();
}

// ── Lấy số serial thẻ đang đặt trên đầu đọc ───────────────────────
function getCardSnr() {
  ensureConfigured();
  const buf = outBuf(32);
  const ret = fns.GetCardSnr(buf);
  return { ret, ok: ret === 0, cardSnr: readCStr(buf) };
}

// ── Tạo thẻ khách ─────────────────────────────────────────────────
//   roomNo: "1.2.28" (toà.tầng.phòng) — PHẢI khớp định dạng trong phần mềm khóa.
//   checkoutTime: "YYYY-MM-DD HH:mm:ss"
//   iflags: 0 = thẻ thường, ghi đè thẻ cũ (mặc định). waitMs: thời gian chờ quẹt.
function makeGuestCard({ roomNo, checkinTime = '', checkoutTime, iflags = 0, waitMs = 8000 }) {
  ensureConfigured();
  if (!roomNo) throw new Error('Thiếu roomNo');
  if (!checkoutTime) throw new Error('Thiếu checkoutTime');
  const snrBuf = outBuf(32);
  const ret = fns.MakeGuestCardEx2(snrBuf, String(roomNo), String(checkinTime), String(checkoutTime), iflags | 0, waitMs | 0);
  return { ret, ok: ret === 0, cardSnr: readCStr(snrBuf) };
}

// ── Đọc thẻ khách ─────────────────────────────────────────────────
function readGuestCard({ waitMs = 8000 } = {}) {
  ensureConfigured();
  const snr = outBuf(32), room = outBuf(32), ci = outBuf(40), co = outBuf(40);
  const iflags = outBuf(4); // int* — dùng buffer 4 byte
  const ret = fns.ReadGuestCardEx2(snr, room, ci, co, iflags, waitMs | 0);
  return {
    ret, ok: ret === 0,
    cardSnr: readCStr(snr),
    roomNo: readCStr(room),
    checkinTime: readCStr(ci),
    checkoutTime: readCStr(co),
    iflags: iflags.readInt32LE(0),
  };
}

// ── Hủy/xóa thẻ ───────────────────────────────────────────────────
function cancelCard({ waitMs = 8000 } = {}) {
  ensureConfigured();
  const snrBuf = outBuf(32);
  const ret = fns.CancelCardEx2(snrBuf, waitMs | 0);
  return { ret, ok: ret === 0, cardSnr: readCStr(snrBuf) };
}

module.exports = {
  configure, getCardSnr, makeGuestCard, readGuestCard, cancelCard,
  get configuredType() { return configuredType; },
};

// lockSdk.js
// ════════════════════════════════════════════════════════════════════
// Wrapper gọi LockSDK.dll (Windows, __stdcall) qua koffi.
//
// CHẾ ĐỘ MOCK (giả lập):
//   - Bật bằng biến môi trường MOCK=1, HOẶC tự bật khi không nạp được DLL
//     (vd chạy trên Mac/Linux để dev luồng PMS mà chưa có phần cứng).
//   - Trả dữ liệu thẻ GIẢ, không đụng phần cứng. API giữ nguyên nên FE không đổi gì.
//   - Khi lên máy Windows thật + có DLL → tự dùng DLL thật (không cần sửa code).
//
// QUAN TRỌNG (chế độ thật):
//   - Node phải CÙNG bit với DLL (SDK này 32-bit → cài Node x86 32-bit trên máy quầy).
//   - Tất cả DLL phụ (RF57S.dll, RF50S.dll, des.dll, ...) để CÙNG thư mục LockSDK.dll.
// ════════════════════════════════════════════════════════════════════
const path = require('path');

const DLL_PATH = process.env.LOCK_DLL_PATH || path.join(__dirname, 'LockSDK.dll');
const FORCE_MOCK = process.env.MOCK === '1' || process.env.MOCK === 'true';

let koffi = null;
let lib = null;
let fns = null;
let configuredType = null;   // 4=RF57, 5=RF50 (hoặc 99 = mock)
let mockMode = false;        // true nếu đang chạy giả lập

// ── Nạp DLL thật. Nếu lỗi → bật mock (trừ khi đang chạy đúng Windows mà vẫn lỗi
//    thì vẫn bật mock để agent không chết, nhưng log rõ). ──────────────
function loadLib() {
  if (lib || mockMode) return;
  if (FORCE_MOCK) { mockMode = true; return; }
  try {
    koffi = require('koffi');
    lib = koffi.load(DLL_PATH);
    fns = {
      Configuration: lib.func('__stdcall', 'TP_Configuration', 'int', ['int']),
      GetCardSnr: lib.func('__stdcall', 'TP_GetCardSnr', 'int', ['_Out_ char *']),
      MakeGuestCardEx2: lib.func('__stdcall', 'TP_MakeGuestCardEx2', 'int',
        ['_Out_ char *', 'str', 'str', 'str', 'int', 'int']),
      ReadGuestCardEx2: lib.func('__stdcall', 'TP_ReadGuestCardEx2', 'int',
        ['_Out_ char *', '_Out_ char *', '_Out_ char *', '_Out_ char *', '_Out_ int *', 'int']),
      CancelCardEx2: lib.func('__stdcall', 'TP_CancelCardEx2', 'int', ['_Out_ char *', 'int']),
    };
  } catch (e) {
    // Không nạp được DLL (sai OS/bit/thiếu file) → chuyển sang MOCK để không chặn dev.
    mockMode = true;
    console.warn('[lockSdk] Không nạp được DLL → chạy CHẾ ĐỘ GIẢ LẬP (mock).',
      'Lý do:', e.message);
  }
}

function outBuf(size = 64) { return Buffer.alloc(size); }
function readCStr(buf) {
  const i = buf.indexOf(0);
  return buf.toString('latin1', 0, i === -1 ? buf.length : i).trim();
}

// Sinh serial thẻ giả 8 hex (giống định dạng thật "15C6C7DE")
function fakeSnr() {
  return Array.from({ length: 8 }, () =>
    '0123456789ABCDEF'[Math.floor(Math.random() * 16)]).join('');
}

// ── Cấu hình SDK ──────────────────────────────────────────────────
function configure(preferType) {
  loadLib();
  if (mockMode) {
    configuredType = 99; // đánh dấu mock
    return 99;
  }
  const candidates = preferType ? [preferType] : [4, 5];
  let lastRet = null;
  for (const t of candidates) {
    const ret = fns.Configuration(t);
    lastRet = ret;
    if (ret === 0) { configuredType = t; return t; }
  }
  throw new Error(`TP_Configuration thất bại cho cả RF57/RF50 (mã lỗi cuối: ${lastRet})`);
}

function ensureConfigured() {
  if (configuredType === null) configure();
}

// ── Lấy serial thẻ ────────────────────────────────────────────────
function getCardSnr() {
  ensureConfigured();
  if (mockMode) return { ret: 0, ok: true, cardSnr: fakeSnr(), mock: true };
  const buf = outBuf(32);
  const ret = fns.GetCardSnr(buf);
  return { ret, ok: ret === 0, cardSnr: readCStr(buf) };
}

// ── Tạo thẻ khách ─────────────────────────────────────────────────
function makeGuestCard({ roomNo, checkinTime = '', checkoutTime, iflags = 0, waitMs = 8000 }) {
  ensureConfigured();
  if (!roomNo) throw new Error('Thiếu roomNo');
  if (!checkoutTime) throw new Error('Thiếu checkoutTime');
  if (mockMode) {
    return { ret: 0, ok: true, cardSnr: fakeSnr(), mock: true, roomNo, checkoutTime };
  }
  const snrBuf = outBuf(32);
  const ret = fns.MakeGuestCardEx2(snrBuf, String(roomNo), String(checkinTime), String(checkoutTime), iflags | 0, waitMs | 0);
  return { ret, ok: ret === 0, cardSnr: readCStr(snrBuf) };
}

// ── Đọc thẻ ───────────────────────────────────────────────────────
function readGuestCard({ waitMs = 8000 } = {}) {
  ensureConfigured();
  if (mockMode) {
    return {
      ret: 0, ok: true, mock: true,
      cardSnr: fakeSnr(), roomNo: '1.2.28',
      checkinTime: '2026-05-31 14:00:00', checkoutTime: '2026-06-01 12:00:00',
      iflags: 0,
    };
  }
  const snr = outBuf(32), room = outBuf(32), ci = outBuf(40), co = outBuf(40);
  const iflags = outBuf(4);
  const ret = fns.ReadGuestCardEx2(snr, room, ci, co, iflags, waitMs | 0);
  return {
    ret, ok: ret === 0,
    cardSnr: readCStr(snr), roomNo: readCStr(room),
    checkinTime: readCStr(ci), checkoutTime: readCStr(co),
    iflags: iflags.readInt32LE(0),
  };
}

// ── Hủy thẻ ───────────────────────────────────────────────────────
function cancelCard({ waitMs = 8000 } = {}) {
  ensureConfigured();
  if (mockMode) return { ret: 0, ok: true, cardSnr: fakeSnr(), mock: true };
  const snrBuf = outBuf(32);
  const ret = fns.CancelCardEx2(snrBuf, waitMs | 0);
  return { ret, ok: ret === 0, cardSnr: readCStr(snrBuf) };
}

module.exports = {
  configure, getCardSnr, makeGuestCard, readGuestCard, cancelCard,
  get configuredType() { return configuredType; },
  get isMock() { return mockMode; },
};
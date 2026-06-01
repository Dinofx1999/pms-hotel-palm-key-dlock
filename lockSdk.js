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

// ── Mã trả về của SDK (theo Defines.h) ───────────────────────────────
//   OPR_OK = 1  → THÀNH CÔNG (không phải 0!). Các lỗi đều là số ÂM:
//   NO_CARD=-1, CARD_TYPE_ERROR=-4, RDWR_ERROR=-5, COMM_ERROR=-12, ...
//   ⚠ Trước đây code dùng ret===0 là sai → máy thật trả 1 bị hiểu nhầm là lỗi.
const OPR_OK = 1;
// Một số hàm khởi tạo (Configuration) ở vài bản SDK trả 0=OK. Chấp nhận cả 0 lẫn 1
//   cho riêng configure để không phá luồng đang chạy được.
const isOk = (ret) => ret === OPR_OK;

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
    // ⚠ FIX: KHÔNG tự động rơi vào mock khi nạp DLL lỗi (trừ khi cho phép tường minh).
    //   Trước đây lỗi DLL → âm thầm bật mock → trả ok GIẢ, lễ tân tưởng đã tạo thẻ
    //   nhưng thẻ KHÔNG hề được ghi. Trên máy quầy thật phải BÁO LỖI RÕ.
    //   Chỉ fallback mock nếu đặt ALLOW_MOCK_FALLBACK=1 (dùng cho dev trên Mac).
    const allowFallback = process.env.ALLOW_MOCK_FALLBACK === '1';
    if (allowFallback) {
      mockMode = true;
      console.warn('[lockSdk] Không nạp được DLL → CHẠY MOCK (ALLOW_MOCK_FALLBACK=1).',
        'Lý do:', e.message);
      return;
    }
    // Máy thật: ném lỗi để lộ nguyên nhân (thiếu DLL phụ, sai bit Node, sai đường dẫn...)
    throw new Error(
      `Không nạp được LockSDK.dll tại "${DLL_PATH}". ` +
      `Kiểm tra: (1) Node 32-bit, (2) đủ các .dll phụ cùng thư mục, (3) đường dẫn DLL. ` +
      `Chi tiết: ${e.message}`
    );
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
  const tries = [];
  for (const t of candidates) {
    const ret = fns.Configuration(t);
    tries.push({ type: t, name: t === 4 ? 'RF57' : t === 5 ? 'RF50' : `type${t}`, ret });
    if (ret === 0 || ret === OPR_OK) { configuredType = t; return t; }
  }
  const detail = tries.map(x => `${x.name}(type ${x.type})=${x.ret} [${errMsg(x.ret)}]`).join(', ');
  throw new Error(`TP_Configuration thất bại — ${detail}`);
}

// Diễn giải mã lỗi SDK (theo Defines.h ERROR_TYPE)
function errMsg(ret) {
  const M = {
    1: 'OK', '-1': 'Không thấy thẻ', '-2': 'Không thấy đầu đọc thẻ',
    '-3': 'Thẻ không hợp lệ', '-4': 'Sai loại thẻ', '-5': 'Lỗi đọc/ghi',
    '-6': 'Cổng chưa mở', '-8': 'Tham số không hợp lệ', '-9': 'Thao tác không hợp lệ',
    '-10': 'Lỗi khác', '-11': 'Cổng đang bị chiếm (đóng phần mềm khoá khác)',
    '-12': 'Lỗi giao tiếp', '-20': 'Sai mã khách hàng (authorization)',
    '-29': 'Chưa đăng ký (chưa nạp thẻ授权/authorization)',
    '-30': 'Không có thông tin thẻ授权 (authorization card)',
    '-37': 'Sai loại đầu đọc', '-38': 'Lỗi CRC',
  };
  if (ret >= 8000) return `Lỗi thư viện RF50 (mã ${ret - 8000})`;
  return M[String(ret)] ?? 'Không rõ';
}

function ensureConfigured() {
  if (configuredType === null) configure();
}

// ── Lấy serial thẻ ────────────────────────────────────────────────
function getCardSnr() {
  ensureConfigured();
  if (mockMode) return { ret: OPR_OK, ok: true, cardSnr: fakeSnr(), mock: true };
  const buf = outBuf(32);
  const ret = fns.GetCardSnr(buf);
  return { ret, ok: isOk(ret), cardSnr: readCStr(buf) };
}

// ── Tạo thẻ khách ─────────────────────────────────────────────────
function makeGuestCard({ roomNo, checkinTime = '', checkoutTime, iflags = 0, waitMs = 8000 }) {
  ensureConfigured();
  if (!roomNo) throw new Error('Thiếu roomNo');
  if (!checkoutTime) throw new Error('Thiếu checkoutTime');
  if (mockMode) {
    return { ret: OPR_OK, ok: true, cardSnr: fakeSnr(), mock: true, roomNo, checkoutTime };
  }
  const snrBuf = outBuf(32);
  const ret = fns.MakeGuestCardEx2(snrBuf, String(roomNo), String(checkinTime), String(checkoutTime), iflags | 0, waitMs | 0);
  return { ret, ok: isOk(ret), cardSnr: readCStr(snrBuf) };
}

// ── Đọc thẻ ───────────────────────────────────────────────────────
function readGuestCard({ waitMs = 8000 } = {}) {
  ensureConfigured();
  if (mockMode) {
    return {
      ret: OPR_OK, ok: true, mock: true,
      cardSnr: fakeSnr(), roomNo: '1.2.28',
      checkinTime: '2026-05-31 14:00:00', checkoutTime: '2026-06-01 12:00:00',
      iflags: 0,
    };
  }
  const snr = outBuf(32), room = outBuf(32), ci = outBuf(40), co = outBuf(40);
  const iflags = outBuf(4);
  const ret = fns.ReadGuestCardEx2(snr, room, ci, co, iflags, waitMs | 0);
  return {
    ret, ok: isOk(ret),
    cardSnr: readCStr(snr), roomNo: readCStr(room),
    checkinTime: readCStr(ci), checkoutTime: readCStr(co),
    iflags: iflags.readInt32LE(0),
  };
}

// ── Hủy thẻ ───────────────────────────────────────────────────────
function cancelCard({ waitMs = 8000 } = {}) {
  ensureConfigured();
  if (mockMode) return { ret: OPR_OK, ok: true, cardSnr: fakeSnr(), mock: true };
  const snrBuf = outBuf(32);
  const ret = fns.CancelCardEx2(snrBuf, waitMs | 0);
  return { ret, ok: isOk(ret), cardSnr: readCStr(snrBuf) };
}

module.exports = {
  configure, getCardSnr, makeGuestCard, readGuestCard, cancelCard,
  get configuredType() { return configuredType; },
  get isMock() { return mockMode; },
};
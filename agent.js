// agent.js
// ════════════════════════════════════════════════════════════════════
// Palm Lock Agent — connector chạy trên MÁY QUẦY Windows (cắm đầu đọc thẻ).
// Mô phỏng giao thức ezCloud DLockConnector: endpoint GET + query param,
// trả JSON khi ?format=json.
//
// Ví dụ ezCloud:  http://localhost:2000/readcard?format=json
// Bản này (mặc định cổng 2000 cho giống ezCloud):
//   GET /readcard?format=json
//   GET /makecard?room=1.2.28&checkout=2026-06-01%2012:00:00&format=json
//   GET /cancelcard?format=json
//   GET /getcardsnr?format=json
//   GET /getlockconfig?format=json     (config local của agent)
//   GET /status
//
// Luồng: [PMS web trên máy quầy] → http://localhost:2000/makecard?... → LockSDK.dll → đầu đọc
//
// Cài: Node.js 32-bit, copy agent + tất cả .dll cùng thư mục, npm install, npm start.
// ════════════════════════════════════════════════════════════════════
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const lock = require('./lockSdk');

// Cổng 2000 cho giống ezCloud DLockConnector (đổi qua biến môi trường nếu cần).
const PORT = process.env.LOCK_AGENT_PORT || 2000;

const LOG_FILE = path.join(__dirname, 'lock-agent.log');
function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.map(a =>
    typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch { /* ignore */ }
}

const app = express();
app.use(express.json());
app.use(cors({ origin: true })); // agent chỉ nghe localhost nên mở CORS cho PMS gọi

// Helper trả kết quả: nếu ?format=json → JSON; ngược lại text đơn giản (giống connector cũ).
function reply(req, res, obj) {
  const fmt = (req.query.format || '').toString().toLowerCase();
  if (fmt === 'json') return res.json(obj);
  // text mặc định: "OK|<cardSnr>" hoặc "ERR|<message>"
  if (obj.ok) return res.send(`OK|${obj.cardSnr ?? ''}`);
  return res.send(`ERR|${obj.error ?? 'unknown'}`);
}

// ── /status ───────────────────────────────────────────────────────
app.get('/status', (req, res) => {
  res.json({
    ok: true, service: 'palm-lock-agent', version: '1.1.0',
    protocol: 'ezcloud-like', port: PORT,
    configuredType: lock.configuredType,
    mock: lock.isMock,   // true = đang giả lập (chưa có DLL/phần cứng)
    pid: process.pid,
  });
});

// ── /getlockconfig — config LOCAL của agent (loại đầu đọc dò được) ─
//   Khác với GetLockConfig ở backend PMS (cấu hình theo chi nhánh).
app.get('/getlockconfig', (req, res) => {
  let type = lock.configuredType;
  if (type === null) { try { type = lock.configure(); } catch { /* */ } }
  reply(req, res, {
    ok: type !== null,
    lockType: type,                 // 4=RF57, 5=RF50, 99=mock
    lockBrand: 'DLOCK',
    mock: lock.isMock,
    agentVersion: '1.1.0',
    port: PORT,
  });
});

// ── /getcardsnr — đọc serial thẻ đang đặt ─────────────────────────
app.get('/getcardsnr', (req, res) => {
  try {
    const r = lock.getCardSnr();
    log('getcardsnr:', r);
    reply(req, res, r);
  } catch (e) {
    log('getcardsnr ERROR:', e.message);
    reply(req, res, { ok: false, error: e.message });
  }
});

// ── /readcard — đọc thẻ khách ─────────────────────────────────────
//   GET /readcard?format=json[&waitMs=8000]
app.get('/readcard', (req, res) => {
  try {
    const waitMs = parseInt(req.query.waitMs) || 8000;
    const r = lock.readGuestCard({ waitMs });
    // Thêm 'expired': so giờ checkout trên thẻ với giờ hiện tại của máy quầy.
    if (r && r.ok && r.checkoutTime) {
      const co = new Date(String(r.checkoutTime).replace(' ', 'T')).getTime();
      r.expired = !isNaN(co) ? (co < Date.now()) : null;
    }
    log('readcard:', r);
    reply(req, res, r);
  } catch (e) {
    log('readcard ERROR:', e.message);
    reply(req, res, { ok: false, error: e.message });
  }
});

// ── /makecard — tạo thẻ khách ─────────────────────────────────────
//   GET /makecard?room=1.2.28&checkout=2026-06-01 12:00:00&format=json
//   tham số: room (bắt buộc), checkout (bắt buộc), checkin, iflags, waitMs
app.get('/makecard', (req, res) => {
  try {
    const roomNo = (req.query.room || req.query.roomNo || '').toString();
    const checkoutTime = (req.query.checkout || req.query.checkoutTime || '').toString();
    const checkinTime = (req.query.checkin || req.query.checkinTime || '').toString();
    const iflags = parseInt(req.query.iflags) || 0;
    const waitMs = parseInt(req.query.waitMs) || 8000;
    if (!roomNo || !checkoutTime) {
      return reply(req, res, { ok: false, error: 'Thiếu room hoặc checkout' });
    }
    log('makecard request:', { roomNo, checkoutTime, iflags });
    const r = lock.makeGuestCard({ roomNo, checkinTime, checkoutTime, iflags, waitMs });
    log('makecard result:', r);
    reply(req, res, r);
  } catch (e) {
    log('makecard ERROR:', e.message);
    reply(req, res, { ok: false, error: e.message });
  }
});

// ── /cancelcard — hủy thẻ ─────────────────────────────────────────
app.get('/cancelcard', (req, res) => {
  try {
    const waitMs = parseInt(req.query.waitMs) || 8000;
    const r = lock.cancelCard({ waitMs });
    log('cancelcard:', r);
    reply(req, res, r);
  } catch (e) {
    log('cancelcard ERROR:', e.message);
    reply(req, res, { ok: false, error: e.message });
  }
});

// ── (giữ) POST /configure để ép loại đầu đọc khi cần ──────────────
app.post('/configure', (req, res) => {
  try {
    const type = lock.configure(req.body?.lockType);
    log('Configure OK, lockType =', type);
    res.json({ ok: true, lockType: type });
  } catch (e) {
    log('Configure FAIL:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.listen(PORT, '127.0.0.1', () => {
  log(`Palm Lock Agent (ezcloud-like) chạy tại http://127.0.0.1:${PORT}`);
  try {
    const t = lock.configure();
    log('Khởi động: cấu hình đầu đọc OK, lockType =', t);
  } catch (e) {
    log('Khởi động: chưa cấu hình được đầu đọc —', e.message, '(thử lại khi có request)');
  }
});
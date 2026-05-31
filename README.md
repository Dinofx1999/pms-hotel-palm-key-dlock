# Palm Lock Agent — cầu nối PMS web ↔ khóa cửa (LockSDK.dll / DLOCK)

Agent Node.js chạy trên **máy quầy Windows** (nơi cắm đầu đọc thẻ USB), mở HTTP API ở
`http://127.0.0.1:2000` để PMS web (mở trên cùng máy) gọi tạo/đọc/hủy thẻ phòng.
Giao thức mô phỏng ezCloud DLockConnector (endpoint GET + `?format=json`).

```
[PMS web trên máy quầy] → http://127.0.0.1:2000/makecard?... → LockSDK.dll → đầu đọc thẻ
```

## Vì sao cần agent riêng?
Trình duyệt và backend PMS (chạy trên server) KHÔNG gọi trực tiếp được `LockSDK.dll` —
DLL phải chạy trên đúng máy có cắm đầu đọc. Agent này là cầu nối chạy ngay tại quầy.
Mỗi máy quầy (mỗi chi nhánh) cài 1 bản agent giống nhau.

## Thành phần thư mục
```
palm-lock-agent/
├── agent.js              # HTTP server (ezCloud-like)
├── lockSdk.js            # wrapper koffi quanh LockSDK.dll
├── test-make-card.js     # test nhanh bằng Node (không cần web)
├── test-agent.html       # test bằng trình duyệt (mở trực tiếp)
├── ecosystem.config.js   # cấu hình PM2
├── package.json
└── (TẤT CẢ file .dll của SDK: LockSDK.dll, RF57S.dll, RF50S.dll, des.dll,
    mbedtls_tx.dll, RC500USB.dll, Rf_Rw.dll, MF0SIM.dll, PubFuns.dll, ...)
```

## Cài đặt (mỗi máy quầy)

### 1. Cài Node.js 32-bit (x86) — QUAN TRỌNG
SDK khóa cửa là 32-bit; Node phải CÙNG bit, nếu không lỗi load DLL.
Tải bản "Windows Installer (.msi) — 32-bit" từ nodejs.org.
Kiểm tra:
```
node -p "process.arch"
```
Phải in ra `ia32`. Nếu ra `x64` → gỡ và cài lại bản 32-bit.

### 2. Copy file
Đặt toàn bộ file agent + TẤT CẢ `.dll` của SDK vào CÙNG một thư mục, ví dụ
`C:\palm-lock-agent\`. Để chung 1 thư mục để DLL phụ được tìm thấy.

### 3. Cài thư viện
```
cd C:\palm-lock-agent
npm install
```

### 4. Test phần cứng TRƯỚC (chưa cần web)
Đặt 1 thẻ trắng lên đầu đọc, rồi chạy:
```
npm run test-card
```
Kết quả mong đợi: in ra `lockType` (4=RF57 hoặc 5=RF50) và "TẠO THẺ THÀNH CÔNG".

Hoặc test bằng trình duyệt: chạy `npm start` rồi mở file `test-agent.html` trong trình
duyệt trên chính máy quầy — bấm các nút để thử.

### 5. Chạy thường trực bằng PM2 (tự chạy sau reboot)
```
npm install -g pm2
npm install -g pm2-windows-startup
pm2-startup install
pm2 start ecosystem.config.js
pm2 save
```
Sau reboot máy, PM2 tự khởi động agent. Kiểm tra:
```
pm2 status
pm2 logs palm-lock-agent
```

## API (giao thức ezCloud-like)

| Method | Path                                                          | Mô tả |
|--------|---------------------------------------------------------------|-------|
| GET    | `/status`                                                     | Kiểm tra sống + lockType |
| GET    | `/getlockconfig?format=json`                                  | Config local (loại đầu đọc) |
| GET    | `/getcardsnr?format=json`                                     | Đọc serial thẻ đang đặt |
| GET    | `/readcard?format=json`                                       | Đọc thẻ khách |
| GET    | `/makecard?room=1.2.28&checkout=2026-06-01 12:00:00&format=json` | Tạo thẻ khách |
| GET    | `/cancelcard?format=json`                                     | Hủy thẻ |
| POST   | `/configure` body `{lockType:4}`                              | Ép loại đầu đọc |

`?format=json` → trả JSON `{ ok, ret, cardSnr, ... }`. Không có format → trả text `OK|<serial>` hoặc `ERR|<msg>`.

Tham số `makecard`: `room` (bắt buộc, = mã khóa "1.2.28"), `checkout` (bắt buộc,
"YYYY-MM-DD HH:mm:ss"), `checkin`, `iflags` (mặc định 0), `waitMs` (mặc định 8000).

## Tích hợp PMS
Frontend dùng helper `frontend/src/utils/lockCard.ts` → hàm `makeRoomCard({ roomId, checkoutISO })`.
Nó tự lấy `lockCode` + cổng agent từ backend, rồi gọi `http://127.0.0.1:<port>/makecard`.
Quản lý cấu hình + mã khóa phòng trong PMS: menu **Hệ thống → Khóa cửa**.

## Hai thứ cần xác minh khi test trên máy thật
1. **Mã trả về**: code giả định `0 = thành công`. Nếu thẻ tạo được mà báo thất bại,
   sửa `lockSdk.js` đổi điều kiện `ret === 0` → `ret === 1`.
2. **Định dạng `roomNo`**: phải khớp phần mềm khóa của bạn (xem `cardRecord.ini` mẫu:
   dạng `1.2.28` = toà.tầng.phòng).

## Lưu ý bảo mật / mixed-content
- Agent chỉ nghe `127.0.0.1` → không lộ ra mạng LAN/internet.
- PMS chạy `https://` gọi `http://127.0.0.1` thường được trình duyệt cho phép (loopback).
  Nếu bị chặn, cho agent chạy HTTPS cert tự ký hoặc thêm ngoại lệ — bàn khi gặp.

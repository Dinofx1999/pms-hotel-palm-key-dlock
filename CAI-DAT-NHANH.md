# Cài Palm Lock Agent GỌN — đóng gói 1 lần, mỗi máy quầy chỉ 2 bước

Mục tiêu: **không phải cài Node / npm / PM2 trên từng máy quầy**. Đóng gói sẵn 1 lần,
rồi mỗi máy chỉ **copy thư mục + double-click 1 file** là agent chạy + tự khởi động khi bật máy.

---

## A. CHUẨN BỊ GÓI (làm 1 LẦN, trên 1 máy Windows bất kỳ)

1. **Cài Node 32-bit (ia32)** trên máy build này (chỉ để chạy `npm install` lấy thư viện):
   - `https://nodejs.org/dist/v22.22.0/node-v22.22.0-x86.msi`
   - Kiểm: `node -p "process.arch"` → phải ra **`ia32`**.

2. Mở CMD trong thư mục `palm-lock-agent`, chạy:
   ```
   npm install
   ```
   (tải `koffi`, `express`, `cors` — bản ia32, vào `node_modules`.)

3. **Thả 2 file portable vào thư mục `palm-lock-agent`:**
   - `node.exe` **bản 32-bit (ia32)**: tải `https://nodejs.org/dist/v22.22.0/node-v22.22.0-win-x86.zip`
     → giải nén → copy **`node.exe`** ra cạnh `agent.js`.
   - `nssm.exe`: tải `https://nssm.cc/release/nssm-2.24.zip` → lấy file `win64/nssm.exe`
     → copy ra cạnh `agent.js`.

4. **Nén cả thư mục `palm-lock-agent`** thành `PalmLockAgent.zip`.
   (Trong đó đã có: `node.exe`, `nssm.exe`, `agent.js`, `node_modules`, TẤT CẢ `.dll` của SDK,
   `LockInfo.dll` đã uỷ quyền, `install-service.bat`, `uninstall-service.bat`.)

> ✅ Xong gói. File `PalmLockAgent.zip` này dùng để cài cho **mọi máy quầy**.

---

## B. CÀI TRÊN TỪNG MÁY QUẦY (chỉ 2 bước)

1. Giải nén `PalmLockAgent.zip` vào, ví dụ, `C:\PalmLockAgent\`.
   (Cắm đầu đọc thẻ USB vào máy này.)

2. **Chuột phải `install-service.bat` → Run as administrator.**
   → Nó tự cài thành **Windows Service** (`PalmLockAgent`), chạy ở cổng **2000**, và **tự khởi động mỗi khi bật máy**.

**Kiểm tra:** mở trình duyệt vào `http://127.0.0.1:2000/status` → thấy JSON `{ ok: true, ... }` là chạy.

→ Xong. **Không cài Node/npm/PM2 trên máy quầy.** Đặt 1 thẻ trắng lên đầu đọc, vào PMS bấm **"Tạo thẻ"** để thử.

---

## Gỡ / Cập nhật
- **Gỡ service:** chuột phải `uninstall-service.bat` → Run as administrator.
- **Cập nhật agent:** copy đè file mới vào thư mục → chạy lại `install-service.bat` (admin) hoặc `nssm restart PalmLockAgent`.

## Xem log / trạng thái
```
sc query PalmLockAgent
type service-err.log
```
Hoặc mở `http://127.0.0.1:2000/status`.

---

## Lưu ý
- **`LockInfo.dll` (uỷ quyền)** phải nằm trong gói → agent dùng được ngay, không cần quẹt lại thẻ System. (Đây là dữ liệu của khách sạn anh.)
- **node.exe và koffi PHẢI cùng 32-bit (ia32)** với SDK khoá. Nếu lỡ dùng node x64 → lỗi load DLL.
- Agent chỉ nghe `127.0.0.1` (không lộ ra mạng) → an toàn.

## (Tuỳ chọn) Đóng thành 1 file .exe duy nhất
Nếu muốn gọn hơn nữa (1 file `.exe`, khỏi kèm `node.exe` + `node_modules`):
```
npm i -D @yao-pkg/pkg
npx pkg . --targets node20-win-x86 --output palm-lock-agent.exe
```
→ Tạo `palm-lock-agent.exe`. Khi đó `install-service.bat` tự nhận file `.exe` này (không cần `node.exe`).
⚠️ `koffi` là native module — bản đóng gói cần test kỹ trên Windows (có thể phải thêm `koffi.node` vào assets). Cách portable `node.exe` ở trên **chắc ăn hơn**.

// ecosystem.config.js
// ════════════════════════════════════════════════════════════════════
// Cấu hình PM2 cho Lock Agent. Chạy:
//   pm2 start ecosystem.config.js
//   pm2 save
// (Xem README phần "Tự chạy sau reboot" để bật startup trên Windows.)
// ════════════════════════════════════════════════════════════════════
module.exports = {
  apps: [
    {
      name: 'palm-lock-agent',
      script: 'agent.js',
      cwd: __dirname,            // chạy trong thư mục chứa agent + DLL
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      env: {
        LOCK_AGENT_PORT: 2000,   // đổi cổng nếu cần
        // LOCK_DLL_PATH: 'C:\\palm-lock-agent\\LockSDK.dll',  // chỉ cần nếu DLL ở nơi khác
      },
      // Log riêng cho agent (ngoài lock-agent.log do chính agent ghi)
      out_file: './pm2-out.log',
      error_file: './pm2-error.log',
      time: true,
    },
  ],
};

// src/utils/cheatLog.js
// ============================================================
// SO GHI VI PHAM CUA PHIEN LAM BAI HIEN TAI (in-memory)
// ------------------------------------------------------------
// AntiCheatGuard ghi vao day moi lan vi pham.
// Khi nop bai (het gio / tu nop / bi ep nop), trang thi doc so nay
// de nhung bao cao gian lan vao email ket qua gui helpdesk.
// Reset moi khi vao bai thi moi (AntiCheatGuard mount).
// ============================================================

let log = { times: [], forced: false };

// Reset khi bat dau bai thi moi
export const resetCheatLog = () => { log = { times: [], forced: false }; };

// Ghi nhan 1 lan vi pham; forced = true neu day la lan bi ep nop
export const addCheatViolation = (forced = false) => {
    log.times.push(new Date());
    if (forced) log.forced = true;
};

export const getCheatLog = () => log;

// Hau to gan vao tieu de email ket qua, vd: " ⚠️ CO GIAN LAN (2 lan)"
export const cheatTitleSuffix = () => {
    if (log.times.length === 0) return '';
    return log.forced
        ? ` 🚨 ÉP NỘP - GIAN LẬN ${log.times.length} LẦN`
        : ` ⚠️ CÓ GIAN LẬN (${log.times.length} lần)`;
};

// Khoi HTML do nhung vao dau email ket qua; tra ve '' neu khong vi pham
export const buildCheatReportHTML = () => {
    const n = log.times.length;
    if (n === 0) return '';

    // Liet ke thoi diem cu the tung lan vi pham
    const rows = log.times
        .map((t, i) => `<li style="padding:2px 0;">Lần ${i + 1}: <strong>${t.toLocaleString('vi-VN')}</strong></li>`)
        .join('');

    const headline = log.forced
        ? `🚨 BÀI THI BỊ ÉP NỘP: học viên vi phạm quá ${n} lần (rời màn hình bài thi)`
        : `⚠️ BÀI THI NÀY CÓ GIAN LẬN: học viên đã rời màn hình bài thi ${n} lần`;

    return `
        <div style="border:3px solid #d32f2f; border-radius:8px; padding:14px 16px; background:#fef2f2; font-family:Arial,sans-serif; margin-bottom:18px;">
            <p style="color:#d32f2f; font-weight:bold; font-size:15px; margin:0 0 8px 0;">${headline}</p>
            <p style="margin:0 0 4px 0; font-weight:bold;">Thời gian ghi nhận cheating:</p>
            <ul style="margin:0; padding-left:20px;">${rows}</ul>
            ${log.forced ? '<p style="color:#d32f2f; font-weight:bold; margin:8px 0 0 0;">Kết quả bên dưới là bài làm tại thời điểm hệ thống tự động nộp.</p>' : ''}
        </div>`;
};

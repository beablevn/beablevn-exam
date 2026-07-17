// src/utils/device.js
// ============================================================
// Phát hiện thiết bị iOS (iPad / iPhone / iPod).
// Dùng cho anti-cheat: trên iOS, sự kiện `window blur` bắn ra rất nhiều
// một cách VÔ HẠI (bàn phím ảo hiện lên, thanh công cụ Safari, lúc chuyển
// vào chế độ toàn màn hình...) → nếu đếm blur như desktop sẽ bị tính nhầm
// vi phạm và tự động nộp bài oan. Vì vậy ở iOS ta bỏ nghe blur, chỉ dựa vào
// `visibilitychange` (chỉ bật khi học viên THẬT SỰ rời trang: chuyển app /
// khoá máy / đổi tab), vẫn bắt được gian lận thật.
// ============================================================

// true nếu đang chạy trên iPad / iPhone / iPod
export function isIOSDevice() {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';

    // iPhone / iPod / iPad (Safari đời cũ khai báo rõ trong userAgent)
    const isClassicIOS = /iPad|iPhone|iPod/.test(ua);

    // iPadOS 13+ giả danh máy Mac (userAgent ghi "Macintosh") → nhận diện thêm
    // bằng việc có màn cảm ứng (maxTouchPoints > 1). MacBook thật có maxTouchPoints = 0.
    const isIPadOS = /Macintosh|Mac OS X/.test(ua) && (navigator.maxTouchPoints || 0) > 1;

    return isClassicIOS || isIPadOS;
}

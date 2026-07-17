// src/components/FullscreenGuard.jsx
// ============================================================
// CHẶN LÀM BÀI KHI CHƯA BẬT TOÀN MÀN HÌNH (FULLSCREEN GUARD)
// ------------------------------------------------------------
// Cách hoạt động:
// 1. Kiểm tra 2 kiểu fullscreen:
//    - Fullscreen API (khi bấm nút "BẬT TOÀN MÀN HÌNH" → JS gọi requestFullscreen)
//    - F11 của trình duyệt (JS không gọi được F11, nhưng phát hiện được
//      bằng cách so chiều cao cửa sổ với chiều cao màn hình)
// 2. Nếu CHƯA fullscreen → hiện overlay che toàn bộ bài thi, không thao tác được.
// 3. Nếu học viên thoát fullscreen GIỮA BÀI (bấm Esc/F11) → overlay hiện lại ngay,
//    đồng hồ vẫn chạy → học viên buộc phải quay lại fullscreen để làm tiếp.
// ============================================================
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

// Hàm kiểm tra trạng thái fullscreen (gộp cả 2 kiểu)
function checkIsFullscreen() {
    // Kiểu 1: Fullscreen API đang bật (thêm webkit cho Safari/iPad)
    if (document.fullscreenElement || document.webkitFullscreenElement) return true;
    // Kiểu 2: F11, cửa sổ cao bằng màn hình (cho phép sai số 1px do zoom)
    return window.innerHeight >= window.screen.height - 1;
}

export default function FullscreenGuard() {
    const [isFullscreen, setIsFullscreen] = useState(checkIsFullscreen());

    useEffect(() => {
        const update = () => setIsFullscreen(checkIsFullscreen());
        // Lắng nghe cả 2 sự kiện: đổi fullscreen API + đổi kích thước cửa sổ (F11)
        document.addEventListener('fullscreenchange', update);
        document.addEventListener('webkitfullscreenchange', update); // Safari/iPad
        window.addEventListener('resize', update);
        return () => {
            document.removeEventListener('fullscreenchange', update);
            document.removeEventListener('webkitfullscreenchange', update);
            window.removeEventListener('resize', update);
        };
    }, []);

    // Bấm nút → yêu cầu trình duyệt vào chế độ toàn màn hình
    const enterFullscreen = () => {
        const el = document.documentElement;
        if (el.requestFullscreen) {
            el.requestFullscreen().catch(() => {
                // Trình duyệt từ chối (hiếm gặp) → nhắc học viên tự bấm F11 (toast thay alert native theo SOP)
                toast.warning('⚠️ Trình duyệt không cho phép tự động bật. Vui lòng bấm phím F11.', { autoClose: 6000 });
            });
        } else if (el.webkitRequestFullscreen) {
            // Safari / iPad đời cũ dùng tiền tố webkit
            el.webkitRequestFullscreen();
        } else {
            // Thiết bị không hỗ trợ Fullscreen API (vd iPhone) → nhắc rõ cho học viên
            toast.error('📵 Thiết bị của em không hỗ trợ chế độ toàn màn hình. Vui lòng dùng iPad hoặc máy tính để làm bài thi.', { autoClose: 8000 });
        }
    };

    // Đã fullscreen → không render gì, bài thi hiển thị bình thường
    if (isFullscreen) return null;

    // Chưa fullscreen → overlay chặn toàn bộ thao tác
    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            zIndex: 2147483647, /* cao nhat co the, che moi modal khac */
            background: 'rgba(30, 82, 37, 0.97)', /* Dark Forest Green theo brand */
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', textAlign: 'center', padding: '20px',
            color: 'white', fontFamily: "'Be Vietnam Pro', 'Segoe UI', sans-serif"
        }}>
            <i className="fa-solid fa-expand" style={{ fontSize: '4rem', marginBottom: '25px', color: '#E8F4EC' }}></i>
            <h1 style={{ margin: '0 0 12px 0', fontSize: '1.8rem' }}>
                Vui lòng bật chế độ TOÀN MÀN HÌNH
            </h1>
            <p style={{ margin: '0 0 30px 0', fontSize: '1.05rem', color: '#E8F4EC', maxWidth: '520px', lineHeight: 1.7 }}>
                Để đảm bảo điều kiện thi chuẩn, em cần làm bài ở chế độ toàn màn hình.
                Bấm nút bên dưới hoặc nhấn phím <strong>F11</strong> để tiếp tục.
                Nếu thoát toàn màn hình giữa bài, màn hình này sẽ hiện lại, <strong>đồng hồ vẫn chạy</strong>.
            </p>
            <button
                onClick={enterFullscreen}
                style={{
                    background: 'white', color: '#2B6830', border: 'none',
                    padding: '16px 40px', borderRadius: '50px', fontSize: '1.15rem',
                    fontWeight: 700, cursor: 'pointer', display: 'flex',
                    alignItems: 'center', gap: '12px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                    fontFamily: 'inherit'
                }}
            >
                <i className="fa-solid fa-up-right-and-down-left-from-center"></i>
                BẬT TOÀN MÀN HÌNH NGAY
            </button>
            <p style={{ marginTop: '25px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
                BAVN EXAM · #Know2Grow
            </p>
        </div>
    );
}

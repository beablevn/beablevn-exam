// src/components/AntiCheatGuard.jsx
// ============================================================
// PHAT HIEN GIAN LAN: ROI TAB / CHUYEN UNG DUNG KHAC
// ------------------------------------------------------------
// Nguyen ly:
// - Chuyen sang TAB khac   -> trinh duyet ban su kien 'visibilitychange'
// - Alt-Tab sang APP khac  -> cua so mat focus, ban su kien 'blur'
// - Hai su kien co the ban cung luc cho 1 hanh dong -> dung "cua so 2 giay"
//   de khong dem trung (1 lan roi = 1 vi pham, khong phai 2)
//
// Luat xu ly (3-strike):
// - Lan 1, 2: overlay canh bao do, hoc vien phai bam xac nhan moi lam tiep
// - Lan 3:    TU DONG NOP BAI (goi onForceSubmit tu trang cha)
// - Moi vi pham: ghi log Firebase violations/{studentId}
// - Thong tin cheating duoc nhung vao EMAIL KET QUA (1 email duy nhat/ky nang)
//   thong qua so vi pham cheatLog.js - khong gui email canh bao rieng
//
// LUU Y KY THUAT (fix loi gui email x4):
// App dang bat React.StrictMode -> ham updater cua setState bi goi 2 LAN
// de phat hien side effect. Vi vay TUYET DOI KHONG dat side effect
// (gui email, ghi log, nop bai) ben trong setState updater.
// Giai phap: dem vi pham bang violationsRef (ref khong bi goi lai),
// setState chi dung de cap nhat UI, moi side effect co chot chong trung.
// ============================================================
import { useState, useEffect, useRef } from 'react';
import { ref, push, set } from 'firebase/database';
import { db } from '../firebase';
import { resetCheatLog, addCheatViolation } from '../utils/cheatLog';
import { isIOSDevice } from '../utils/device';

const MAX_VIOLATIONS = 3; // So lan vi pham toi da truoc khi tu nop bai

export default function AntiCheatGuard({ active = true, testId = '', onForceSubmit }) {
    const [violations, setViolations] = useState(0); // CHI de hien thi UI
    const [showWarning, setShowWarning] = useState(false);

    const violationsRef = useRef(0);       // Nguon su that ve so lan vi pham
    const lastViolationTime = useRef(0);   // Chong dem trung blur + visibilitychange
    const forcedRef = useRef(false);       // Chi ep nop bai 1 lan duy nhat

    // Giu ban moi nhat cua props - tranh stale closure trong listener
    const activeRef = useRef(active);
    const submitRef = useRef(onForceSubmit);
    useEffect(() => {
        activeRef.current = active;
        submitRef.current = onForceSubmit;
    });

    // Ghi log vi pham len Firebase de admin/giao vien truy xuat
    const logViolation = async (count) => {
        const studentId = localStorage.getItem('currentStudentId') || 'Guest';
        const studentName = localStorage.getItem('currentStudentName') || 'Hoc vien';
        try {
            await set(push(ref(db, `violations/${studentId}`)), {
                studentId,
                studentName,
                testId,
                type: 'LEFT_TEST_SCREEN',
                count,
                forced: count >= MAX_VIOLATIONS,
                date: new Date().toISOString()
            });
        } catch (e) { console.error('Loi ghi log vi pham:', e); }
    };

    useEffect(() => {
        resetCheatLog(); // Bat dau bai moi -> xoa so vi pham phien truoc

        const handleViolation = () => {
            // Mien tru cho tai khoan test/giao vien (role private):
            // khi debug voi DevTools, moi click vao DevTools gay blur -> dem oan vi pham
            if (localStorage.getItem('currentUserRole') === 'private') return;
            // Bo qua neu: guard tat (da nop bai/dang loading) hoac da ep nop roi
            if (!activeRef.current || forcedRef.current) return;

            // Cua so 2 giay: blur + visibilitychange cung 1 hanh dong chi dem 1 lan
            const now = Date.now();
            if (now - lastViolationTime.current < 2000) return;
            lastViolationTime.current = now;

            // Dem bang ref - khong bi StrictMode goi lai nhu setState updater
            violationsRef.current += 1;
            const next = violationsRef.current;
            setViolations(next); // chi cap nhat so hien thi tren overlay

            addCheatViolation(next >= MAX_VIOLATIONS); // Ghi vao so vi pham (de nhung vao email ket qua)
            logViolation(next);       // Ghi log Firebase

            if (next >= MAX_VIOLATIONS) {
                // Qua 3 lan -> ep nop bai ngay (chi 1 lan nho forcedRef)
                forcedRef.current = true;
                setShowWarning(false);
                if (submitRef.current) submitRef.current();
            } else {
                setShowWarning(true);
            }
        };

        // Chuyen tab / thu nho trinh duyet
        const onVisibility = () => { if (document.hidden) handleViolation(); };
        // Alt-Tab sang ung dung khac
        const onBlur = () => handleViolation();

        document.addEventListener('visibilitychange', onVisibility);
        // iOS (iPad/iPhone): 'blur' bắn oan do bàn phím ảo / thanh Safari / lúc vào fullscreen
        // → KHÔNG nghe blur, chỉ dựa visibilitychange (rời app/đổi tab/khoá máy mới tính).
        // Desktop (Windows/macOS): giữ cả blur để bắt Alt-Tab/Cmd-Tab không làm ẩn trang.
        const iOS = isIOSDevice();
        if (!iOS) window.addEventListener('blur', onBlur);
        return () => {
            document.removeEventListener('visibilitychange', onVisibility);
            if (!iOS) window.removeEventListener('blur', onBlur);
        };
    }, []);

    if (!showWarning) return null;

    // Overlay canh bao - hoc vien phai bam xac nhan moi tiep tuc duoc
    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            zIndex: 2147483646, /* ngay duoi FullscreenGuard */
            background: 'rgba(127, 29, 29, 0.97)', /* do dam - tin hieu nghiem trong */
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', textAlign: 'center', padding: '20px',
            color: 'white', fontFamily: "'Be Vietnam Pro', 'Segoe UI', sans-serif"
        }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '4rem', marginBottom: '25px', color: '#fca5a5' }}></i>
            <h1 style={{ margin: '0 0 12px 0', fontSize: '1.8rem' }}>
                CẢNH BÁO VI PHẠM: Lần {violations}/{MAX_VIOLATIONS}
            </h1>
            <p style={{ margin: '0 0 10px 0', fontSize: '1.05rem', maxWidth: '550px', lineHeight: 1.7 }}>
                Hệ thống phát hiện em vừa <strong>rời khỏi màn hình bài thi</strong> (chuyển tab hoặc mở ứng dụng khác).
                Vi phạm đã được <strong>ghi nhận và báo về giáo viên</strong>.
            </p>
            <p style={{ margin: '0 0 30px 0', fontSize: '1.1rem', fontWeight: 700, color: '#fecaca' }}>
                Vi phạm lần thứ {MAX_VIOLATIONS}, bài thi sẽ TỰ ĐỘNG NỘP với kết quả hiện tại.
            </p>
            <button
                onClick={() => setShowWarning(false)}
                style={{
                    background: 'white', color: '#7f1d1d', border: 'none',
                    padding: '16px 40px', borderRadius: '50px', fontSize: '1.1rem',
                    fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
                }}
            >
                TÔI HIỂU, QUAY LẠI BÀI THI
            </button>
        </div>
    );
}

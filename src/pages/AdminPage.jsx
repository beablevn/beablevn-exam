// src/pages/AdminPage.jsx
import { useState, useEffect } from 'react';
import { db } from '../firebase';
// Moi GHI nhay cam di qua Cloud Function (gate token role='admin'); client chi con ĐỌC.
import { adminApi, reviewApi } from '../utils/api';
// allTests (~1.4MB) chi dung khi bam "Dong bo de len Cloud" -> dynamic import trong handler,
// KHONG import tinh de tranh keo toan bo data de vao bundle chinh.
import { ref, get, child } from "firebase/database";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import ConfirmDialog from '../components/ConfirmDialog';
import PasswordField from '../components/PasswordField';
import { isTypableId, isValidLoginId } from '../utils/idValidation';

// Mat khau mac dinh khi tao tai khoan moi — trung voi DEFAULT_RESET_PASSWORD ben
// functions/index.js (mat khau reset ve khi bam nut "Reset Pass"). Dien san de admin
// khong phai go tay, van sua duoc neu can mat khau rieng.
const DEFAULT_NEW_PASSWORD = 'BAVNbavn';

export default function AdminPage() {
    const [activeTab, setActiveTab] = useState('userList');
    // Hop thoai xac nhan brand thay window.confirm (SOP cam native dialog)
    const [confirmReq, setConfirmReq] = useState(null);
    // Khoa cac nut ghi Firebase khi dang xu ly, chong double-submit
    const [busy, setBusy] = useState(false);

    const [studentId, setStudentId] = useState('');
    const [password, setPassword] = useState(DEFAULT_NEW_PASSWORD);
    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState('normal');
    // Quyen truy cap he thi khi tao tai khoan moi: 'ielts' | 'sat' | 'both'
    const [examSystem, setExamSystem] = useState('both');

    const [usersList, setUsersList] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');

    // 👉 CÁC STATE QUẢN LÝ DANH SÁCH LỖI
    const [reportedBugs, setReportedBugs] = useState([]);
    const [loadingBugs, setLoadingBugs] = useState(false);

    const [wId, setWId] = useState('');
    const [wType, setWType] = useState('TASK 1');
    const [wCategory, setWCategory] = useState('');
    const [wContent, setWContent] = useState('');
    const [wImage, setWImage] = useState('');

    const [writingList, setWritingList] = useState([]);
    const [loadingWritingList, setLoadingWritingList] = useState(false);
    const [confirmDeleteWritingId, setConfirmDeleteWritingId] = useState(null);

    const [wManageTab, setWManageTab] = useState('task1');
    const [wSearchTask1, setWSearchTask1] = useState('');
    const [wSearchTask2, setWSearchTask2] = useState('');

    const [mockCode, setMockCode] = useState('');

    const quillModules = {
        toolbar: [
            [{ 'header': [1, 2, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['link'],
            ['clean']
        ],
    };

    const handleBulkUploadTests = async () => {
        // Nap data de theo yeu cau (dynamic import) de khong phinh bundle chinh
        const { allTests } = await import("../data/index");
        toast.info(`⏳ Đang tự động quét và đẩy ${allTests.length} đề lên Cloud...`);

        try {
            // Đẩy từng đề qua Cloud Function adminUploadMock (gate token admin, không ghi thẳng RTDB).
            // Lưu ý: đề lên trạng thái 'pending', duyệt lại ở Review Hub trước khi hiển thị.
            for (const test of allTests) {
                if (!test.id) continue;
                await adminApi.uploadMock(test);
                console.log(`✅ Đã up thành công đề: ${test.testName}`);
            }

            toast.success(`🚀 Đã đồng bộ ${allTests.length} đề (trạng thái Chờ duyệt)!`);
        } catch (error) {
            console.error("Lỗi Bulk Upload:", error);
            toast.error("❌ Thất bại: " + error.message);
        }
    };

    // listUsers gate bang token role='admin' (khong con gui mat khau kem). AdminRoute chan isAdmin.
    const fetchUsers = async () => {
        try {
            setLoadingUsers(true);
            const arr = await adminApi.listUsers();
            arr.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            setUsersList(arr);
        } catch (error) {
            console.error("Lỗi tải danh sách tài khoản:", error);
            toast.error("❌ Không tải được danh sách. Kiểm tra đã chạy: firebase deploy --only functions chưa.");
            setUsersList([]);
        } finally {
            setLoadingUsers(false);
        }
    };

    // 👉 HÀM HÚT CÁC ĐỀ BỊ BÁO LỖI (CẢ MOCK LẪN WRITING)
    const fetchReportedBugs = async () => {
        try {
            setLoadingBugs(true);
            const dbRef = ref(db);
            let allReported = [];

            // Lấy lỗi từ Mock Tests
            const mockSnap = await get(child(dbRef, 'mockTests'));
            if (mockSnap.exists()) {
                const mocks = Object.values(mockSnap.val()).filter(test => test.status === 'reported');
                allReported = [...allReported, ...mocks.map(m => ({ ...m, _collection: 'mockTests', displayName: m.testName }))];
            }

            // Lấy lỗi từ Writing Library
            const writeSnap = await get(child(dbRef, 'writingLibrary'));
            if (writeSnap.exists()) {
                const writings = Object.values(writeSnap.val()).filter(item => item.status === 'reported');
                allReported = [...allReported, ...writings.map(w => ({ ...w, _collection: 'writingLibrary', displayName: `Writing: ${w.id}` }))];
            }

            setReportedBugs(allReported);
        } catch (error) {
            // Khong duoc im lang: neu chi console.error, tab se hien "He thong sach loi!" du that ra loi mang
            console.error("Lỗi tải danh sách báo cáo:", error);
            toast.error("❌ Không tải được danh sách đề lỗi, vui lòng bấm Tải lại.");
        } finally {
            setLoadingBugs(false);
        }
    };

    const fetchAllWriting = async () => {
        try {
            setLoadingWritingList(true);
            const dbRef = ref(db);
            const snap = await get(child(dbRef, 'writingLibrary'));
            if (snap.exists()) {
                const data = Object.values(snap.val()).sort((a, b) => a.id.localeCompare(b.id));
                setWritingList(data);
            } else {
                setWritingList([]);
            }
        } catch (error) {
            toast.error("❌ Không tải được danh sách Writing: " + error.message);
        } finally {
            setLoadingWritingList(false);
        }
    };

    const handleDeleteWritingEssay = async (id) => {
        if (confirmDeleteWritingId !== id) {
            setConfirmDeleteWritingId(id);
            toast.warning(`⚠️ Bấm "Xóa" lần nữa để xác nhận xóa vĩnh viễn đề "${id}"!`, { autoClose: 5000 });
            setTimeout(() => setConfirmDeleteWritingId(prev => prev === id ? null : prev), 5000);
            return;
        }
        try {
            // Xóa qua Function (reject = remove), gate token admin/private.
            await reviewApi.setStatus('writingLibrary', id, 'reject');
            toast.success(`🗑️ Đã xóa vĩnh viễn đề: ${id}`);
            setConfirmDeleteWritingId(null);
            fetchAllWriting();
        } catch (error) {
            toast.error("❌ Lỗi xóa: " + error.message);
        }
    };

    useEffect(() => {
        // Tự động tải dữ liệu theo tab đang mở
        if (activeTab === 'userList') {
            fetchUsers();
        } else if (activeTab === 'bugList') {
            fetchReportedBugs();
        } else if (activeTab === 'writingManage') {
            fetchAllWriting();
        }
    }, [activeTab]);

    const handleCreateUser = async (e) => {
        e.preventDefault();
        if (busy) return; // chong bam doi tao trung tai khoan
        if (!studentId || !password || !fullName) { toast.warning("⚠️ Vui lòng nhập đủ thông tin!"); return; }
        if (!isValidLoginId(studentId)) { toast.warning("⚠️ ID không hợp lệ (chỉ chữ và số, không dấu cách, tối đa 30 ký tự)!"); return; }

        setBusy(true);
        try {
            // Tạo qua Function: kiểm trùng ID + hash password server-side (không lưu plaintext).
            await adminApi.createUser(studentId, password, fullName, role, examSystem);
            toast.success(`✅ Đã tạo tài khoản: ${fullName}`);
            setStudentId(''); setPassword(DEFAULT_NEW_PASSWORD); setFullName(''); setRole('normal'); setExamSystem('both');
            setActiveTab('userList');
        } catch (error) {
            const dup = (error?.message || '').includes('ton tai');
            toast.error(dup ? `⛔ ID ${studentId} đã tồn tại!` : "❌ Lỗi tạo tài khoản: " + error.message);
        }
        finally { setBusy(false); }
    };

    const handleToggleRole = (userId, currentRole) => {
        const newRole = currentRole === 'normal' ? 'private' : 'normal';
        setConfirmReq({
            title: newRole === 'private' ? 'THĂNG CẤP TÀI KHOẢN?' : 'HẠ CẤP TÀI KHOẢN?',
            message: newRole === 'private'
                ? `Tài khoản ${userId} sẽ trở thành NGƯỜI KIỂM DUYỆT (PRIVATE).`
                : `Tài khoản ${userId} sẽ trở về HỌC VIÊN (NORMAL).`,
            yesLabel: newRole === 'private' ? 'THĂNG CẤP' : 'HẠ CẤP',
            onYes: async () => {
                try {
                    await adminApi.setRole(userId, newRole);
                    toast.success(`🔄 Đã cập nhật quyền cho ${userId}`);
                    fetchUsers();
                } catch (error) { toast.error("❌ Lỗi đổi quyền: " + error.message); }
            }
        });
    };

    // 👉 HÀM ĐỔI QUYỀN HỆ THI (IELTS / SAT / Cả 2) — tách trục với role (normal/private)
    const EXAM_SYSTEM_LABEL = { ielts: 'CHỈ IELTS', sat: 'CHỈ SAT', both: 'CẢ 2 HỆ' };
    const handleSetExamSystem = (userId, newExamSystem) => {
        setConfirmReq({
            title: 'ĐỔI QUYỀN HỆ THI?',
            message: `Tài khoản ${userId} sẽ chỉ được truy cập: ${EXAM_SYSTEM_LABEL[newExamSystem]}.`,
            yesLabel: 'XÁC NHẬN',
            onYes: async () => {
                try {
                    await adminApi.setExamSystem(userId, newExamSystem);
                    toast.success(`🔄 Đã cập nhật hệ thi cho ${userId}`);
                    fetchUsers();
                } catch (error) { toast.error("❌ Lỗi đổi hệ thi: " + error.message); }
            }
        });
    };

    const handleResetPassword = (userId) => {
        setConfirmReq({
            title: 'RESET MẬT KHẨU?',
            message: `Mật khẩu của ${userId} sẽ được đặt lại về mặc định "BAVNbavn".`,
            yesLabel: 'RESET',
            onYes: async () => {
                try {
                    await adminApi.resetPassword(userId);
                    toast.success(`🔑 Đã reset mật khẩu tài khoản ${userId}!`);
                } catch (error) { toast.error("❌ Lỗi reset pass: " + error.message); }
            }
        });
    };

    // 👉 HÀM KHÓA / MỞ KHÓA TÀI KHOẢN
    const handleToggleLock = (userId, currentLockStatus) => {
        const isCurrentlyLocked = currentLockStatus || false;
        setConfirmReq({
            title: isCurrentlyLocked ? 'MỞ KHÓA TÀI KHOẢN?' : 'KHÓA TÀI KHOẢN?',
            message: isCurrentlyLocked
                ? `🔓 Tài khoản ${userId} sẽ được làm bài trở lại.`
                : `🔒 Tài khoản ${userId} vẫn đăng nhập được nhưng KHÔNG THỂ làm bài thi.`,
            danger: !isCurrentlyLocked,
            yesLabel: isCurrentlyLocked ? 'MỞ KHÓA' : 'KHÓA',
            onYes: async () => {
                try {
                    await adminApi.toggleLock(userId, !isCurrentlyLocked);
                    toast.success(isCurrentlyLocked ? `🔓 Đã mở khóa cho ${userId}` : `🔒 Đã khóa tài khoản ${userId}`);
                    fetchUsers(); // Tải lại danh sách
                } catch (error) { toast.error("❌ Lỗi cập nhật: " + error.message); }
            }
        });
    };

    // 👉 LOGIC LỌC DANH SÁCH TÌM KIẾM (client-side, tức thì): theo ID (một phần) HOẶC tên.
    const _term = searchTerm.trim().toLowerCase();
    const filteredUsers = usersList.filter(user =>
        !_term ||
        (user.id && String(user.id).toLowerCase().includes(_term)) ||
        (user.fullName && user.fullName.toLowerCase().includes(_term))
    );

    const handleDeleteUser = (userId, name) => {
        setConfirmReq({
            title: '🚨 XÓA VĨNH VIỄN TÀI KHOẢN?',
            message: `Tài khoản "${name}" (ID: ${userId}) sẽ bị xóa vĩnh viễn, không thể khôi phục.`,
            danger: true,
            yesLabel: 'XÓA VĨNH VIỄN',
            onYes: async () => {
                try {
                    await adminApi.deleteUser(userId);
                    toast.success(`🗑️ Đã xóa tài khoản ${userId}.`);
                    fetchUsers();
                } catch (error) { toast.error("❌ Lỗi xóa: " + error.message); }
            }
        });
    };

    // 👉 HÀM THỦ CÔNG ĐỂ ADMIN CHỦ ĐỘNG ĐÓNG LỖI VÀ TÁI SINH ĐỀ
    const handleResolveBug = (id, collection) => {
        setConfirmReq({
            title: 'ĐỀ ĐÃ SỬA XONG?',
            message: `Đề ${id} sẽ trở về trạng thái Chờ duyệt (Pending) và nhật ký lỗi sẽ được xóa sạch.`,
            yesLabel: 'XÁC NHẬN',
            onYes: async () => {
                try {
                    // pending: Function tự xóa sạch bugNotes
                    await reviewApi.setStatus(collection, id, 'pending');
                    toast.success(`✅ Đề ${id} đã trở lại trạng thái Chờ duyệt!`);
                    fetchReportedBugs();
                } catch (error) {
                    toast.error("❌ Lỗi cập nhật: " + error.message);
                }
            }
        });
    };

    const handleDeleteReportedMock = (id, name, collection) => {
        setConfirmReq({
            title: '🚨 XÓA VĨNH VIỄN ĐỀ THI?',
            message: `Đề thi "${name}" (ID: ${id}) sẽ bị xóa hoàn toàn khỏi Firebase, không thể khôi phục.`,
            danger: true,
            yesLabel: 'XÓA VĨNH VIỄN',
            onYes: async () => {
                try {
                    await reviewApi.setStatus(collection, id, 'reject');
                    toast.success(`🗑️ Đã dọn dẹp và xóa sổ đề lỗi: ${id}`);
                    fetchReportedBugs();
                } catch (error) { toast.error("❌ Thất bại: " + error.message); }
            }
        });
    };

    // Đăng Writing qua Function adminUploadWriting (gate token admin, status='pending' server-side)
    const commitWriting = async (newWriting) => {
        setBusy(true);
        try {
            await adminApi.uploadWriting(newWriting);
            toast.success(`🚀 Đã tải lên đề Writing: ${newWriting.id} (Chờ duyệt)`);
            setWId(''); setWContent(''); setWImage(''); setWCategory('');
        } catch (error) { toast.error("❌ Lỗi tải lên: " + error.message); }
        finally { setBusy(false); }
    };

    const handleCreateWriting = async (e) => {
        e.preventDefault();
        if (busy) return;
        const cleanContent = wContent.replace(/<[^>]*>?/gm, '').trim();
        if (!wId || !cleanContent) { toast.warning("⚠️ Vui lòng nhập ID và Nội dung đề bài!"); return; }

        const newWriting = { id: wId.trim(), type: wType, status: 'pending', createdAt: new Date().toISOString() };
        if (wType === 'TASK 1') {
            newWriting.title = wContent; newWriting.category = wCategory || 'Mixed Charts';
            if (wImage) newWriting.image = wImage;
        } else {
            newWriting.question = wContent; newWriting.title = wCategory || 'General Issues';
        }

        setBusy(true);
        try {
            const snap = await get(child(ref(db), `writingLibrary/${newWriting.id}`));
            setBusy(false);
            if (snap.exists()) {
                setConfirmReq({
                    title: '⚠️ ID ĐÃ TỒN TẠI',
                    message: `Đề Writing "${newWriting.id}" đã có trên hệ thống. Ghi đè sẽ thay thế toàn bộ nội dung cũ.`,
                    danger: true,
                    yesLabel: 'GHI ĐÈ',
                    onYes: () => commitWriting(newWriting)
                });
                return;
            }
            await commitWriting(newWriting);
        } catch (error) { setBusy(false); toast.error("❌ Lỗi tải lên: " + error.message); }
    };

    // Đăng Mock qua Function adminUploadMock (gate token admin, status='pending' server-side)
    const commitMockUpload = async (testObj) => {
        setBusy(true);
        try {
            await adminApi.uploadMock(testObj);
            toast.success(`🚀 Đã tải lên Mock Test: ${testObj.testName} (Chờ duyệt)`);
            setMockCode('');
        } catch (error) { toast.error("❌ Lỗi tải lên Firebase: " + error.message); }
        finally { setBusy(false); }
    };

    const handleUploadMockTest = async () => {
        if (busy) return;
        if (!mockCode.trim()) { toast.warning("⚠️ Vui lòng dán code của đề thi vào ô trống!"); return; }

        // Buoc 1: parse code (loi o day la loi cu phap that su)
        let testObj;
        try {
            let codeToParse = mockCode.trim();
            const firstBrace = codeToParse.indexOf('{');
            const lastBrace = codeToParse.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) { codeToParse = codeToParse.substring(firstBrace, lastBrace + 1); }

            const parseJSObject = new Function("return " + codeToParse);
            testObj = parseJSObject();
        } catch (error) {
            toast.error("❌ Lỗi Cú Pháp Code: Kiểm tra lại dấu ngoặc, phẩy.");
            return;
        }

        if (!testObj || !testObj.id || !testObj.testName) {
            toast.error("❌ Code không hợp lệ! Đề thi phải có ít nhất 'id' và 'testName'."); return;
        }
        testObj.status = 'pending';

        // Buoc 2: kiem tra trung ID + ghi (loi o day la loi mang/Firebase, bao dung ban chat)
        setBusy(true);
        try {
            const snap = await get(child(ref(db), `mockTests/${testObj.id}`));
            setBusy(false);
            if (snap.exists()) {
                setConfirmReq({
                    title: '⚠️ ĐỀ THI ĐÃ TỒN TẠI',
                    message: `Đề thi có ID "${testObj.id}" đã có trên hệ thống. Ghi đè sẽ thay thế toàn bộ đề cũ.`,
                    danger: true,
                    yesLabel: 'GHI ĐÈ',
                    onYes: () => commitMockUpload(testObj)
                });
                return;
            }
            await commitMockUpload(testObj);
        } catch (error) { setBusy(false); toast.error("❌ Lỗi kết nối Firebase: " + error.message); }
    };

    const MenuButton = ({ id, icon, label }) => (
        <button
            onClick={() => setActiveTab(id)}
            style={{
                background: activeTab === id ? '#1E5225' : 'transparent', color: 'white',
                border: 'none', padding: '10px 15px', borderRadius: '8px', textAlign: 'left',
                cursor: 'pointer', fontSize: '0.95rem', fontWeight: activeTab === id ? 'bold' : 'normal',
                transition: '0.2s', display: 'flex', alignItems: 'center', gap: '10px'
            }}
            onMouseOver={e => { if (activeTab !== id) e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
            onMouseOut={e => { if (activeTab !== id) e.currentTarget.style.background = 'transparent'; }}
        >
            <i className={icon} style={{ width: '20px' }}></i> {label}
        </button>
    );

    return (
        <div className="admin-layout" style={{ display: 'flex', height: 'calc(100vh - 65px)', background: '#f8fafc', overflow: 'hidden' }}>
            <ToastContainer position="top-right" autoClose={3000} theme="colored" />
            <ConfirmDialog req={confirmReq} onClose={() => setConfirmReq(null)} />

            <style>{`
          .main-footer { display: none !important; }
          .quill { background: white; border-radius: 4px; }
          .ql-container { font-size: 1rem; font-family: inherit; }
          /* Fix: dropdown picker của Quill bị clip bởi overflow:hidden container */
          .ql-snow .ql-picker-options { z-index: 200 !important; }
          .ql-snow .ql-picker.ql-expanded .ql-picker-label { z-index: 201 !important; }
          /* Responsive AdminPage trên mobile/tablet */
          @media (max-width: 768px) {
            .admin-layout { flex-direction: column !important; height: auto !important; overflow: visible !important; }
            .admin-sidebar { width: 100% !important; height: auto !important; flex-direction: row !important; flex-wrap: wrap !important; padding: 12px 10px !important; gap: 6px !important; overflow-y: visible !important; }
            .admin-sidebar h2 { display: none !important; }
            .admin-sidebar > div[style*="font-size: 0.8rem"] { display: none !important; }
            /* Nut menu thanh chip chia deu hang: khong co dong nay moi nut rong ~216px
               nen 1 nut/hang, sidebar chiem 1/3 man hinh dien thoai */
            .admin-sidebar button { flex: 1 1 40% !important; justify-content: center !important; min-height: 44px; font-size: 0.85rem !important; padding: 8px 10px !important; }
            .admin-content { padding: 16px !important; height: auto !important; overflow-y: visible !important; }
            /* Nut hanh dong trong bang du vung cham ngon tay (chuan 44px, toi thieu 40px) */
            .admin-content table button { min-width: 40px; min-height: 40px; }
          }
      `}</style>

            {/* --- SIDEBAR TRÁI --- */}
            <div className="admin-sidebar" style={{
                width: '280px', background: '#2B6830', color: 'white', padding: '30px 20px',
                display: 'flex', flexDirection: 'column', gap: '5px', boxShadow: '2px 0 10px rgba(0,0,0,0.1)', flexShrink: 0,
                height: '100%', overflowY: 'auto'
            }}>
                <h2 style={{ margin: '0 0 30px 0', fontSize: '1.2rem', textAlign: 'center', color: '#e2e8f0', letterSpacing: '1px' }}>
                    <i className="fa-solid fa-shield-halved"></i> ADMIN PANEL
                </h2>

                <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 'bold', margin: '15px 0 5px 10px', textTransform: 'uppercase' }}>
                    👥 QUẢN LÝ TÀI KHOẢN
                </div>
                <MenuButton id="userList" icon="fa-solid fa-address-book" label="Danh Sách Tài Khoản" />
                <MenuButton id="userCreate" icon="fa-solid fa-user-plus" label="Tạo Tài Khoản Mới" />

                <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 'bold', margin: '25px 0 5px 10px', textTransform: 'uppercase' }}>
                    📚 QUẢN LÝ ĐỀ THI
                </div>
                <MenuButton id="mock" icon="fa-solid fa-headphones" label="Đăng Đề Mock Test" />
                <MenuButton id="writing" icon="fa-solid fa-pen-nib" label="Đăng Đề Writing" />
                <MenuButton id="writingManage" icon="fa-solid fa-list-check" label="Quản Lý Writing Library" />

                <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 'bold', margin: '25px 0 5px 10px', textTransform: 'uppercase' }}>
                    🛠️ HỆ THỐNG BẢO TRÌ
                </div>
                <MenuButton id="bugList" icon="fa-solid fa-bug" label="🏥 Xử Lý Lỗi Đề" />
            </div>

            {/* --- CONTENT PHẢI --- */}
            <div className="admin-content" style={{ flex: 1, padding: '20px 40px', overflowY: 'auto', height: '100%' }}>

                {/* TAB 1: DANH SÁCH TÀI KHOẢN */}
                {activeTab === 'userList' && (
                    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                        <div className="card" style={{ padding: '20px 30px', minHeight: '400px' }}>
                            {/* 👉 HEADER & THANH TÌM KIẾM ĐƯỢC GOM CHUNG 1 DÒNG */}
                            <div style={{ borderBottom: '2px solid #eee', paddingBottom: '15px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                                <h2 style={{ color: '#2B6830', margin: 0 }}>
                                    <i className="fa-solid fa-address-book"></i> Danh Sách Tài Khoản
                                </h2>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                                    {/* maxWidth thay width cung: man hep o tim kiem tu co, khong day tran hang */}
                                    <div style={{ position: 'relative', width: '300px', maxWidth: '100%' }}>
                                        <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}></i>
                                        <input
                                            type="text"
                                            placeholder="Tìm ID hoặc Tên học viên..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            style={{ width: '100%', padding: '10px 15px 10px 40px', borderRadius: '20px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem' }}

                                        />
                                    </div>


                                    <span style={{ fontSize: '1rem', background: '#e2e8f0', color: '#475569', padding: '8px 15px', borderRadius: '20px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                                        {searchTerm.trim() ? `Hiển thị: ${filteredUsers.length} / ${usersList.length}` : `Tổng: ${usersList.length}`}
                                    </span>
                                </div>
                            </div>

                            {loadingUsers ? (
                                <div style={{ textAlign: 'center', padding: '50px', color: '#2B6830' }}>
                                    <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2rem' }}></i><p>Đang tải danh sách...</p>
                                </div>
                            ) : filteredUsers.length === 0 ? (
                                <p style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>Không tìm thấy học viên nào phù hợp.</p>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem', textAlign: 'left' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '2px solid #cbd5e1', color: '#475569', fontWeight: 'bold' }}>
                                                <th style={{ padding: '10px' }}>ID</th>
                                                <th style={{ padding: '10px' }}>Họ và Tên</th>
                                                <th style={{ padding: '10px' }}>Quyền & Trạng thái</th>
                                                <th style={{ padding: '10px', textAlign: 'center' }}>Hành động</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredUsers.map((user) => {
                                                const safeRole = user.role || 'normal';
                                                const isLocked = user.isLocked || false;
                                                const safeExamSystem = user.examSystem || 'both';

                                                return (
                                                    <tr key={user.id} style={{ borderBottom: '1px solid #e2e8f0', transition: '0.2s', opacity: isLocked ? 0.7 : 1 }} onMouseOver={e => e.currentTarget.style.background = '#f8fafc'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                                                        <td style={{ padding: '12px 10px', fontWeight: 'bold', color: '#0f172a' }}>{user.id}</td>
                                                        <td style={{ padding: '12px 10px', color: '#334155', textDecoration: isLocked ? 'line-through' : 'none' }}>{user.fullName}</td>
                                                        <td style={{ padding: '12px 10px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                                            <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold', background: safeRole === 'private' ? '#fef3c7' : '#E8F4EC', color: safeRole === 'private' ? '#d97706' : '#3D8B47' }}>
                                                                {safeRole === 'private' ? '🕵️‍♂️ PRIVATE' : '👤 NORMAL'}
                                                            </span>
                                                            <select
                                                                value={safeExamSystem}
                                                                onChange={(e) => handleSetExamSystem(user.id, e.target.value)}
                                                                title="Quyền truy cập hệ thi"
                                                                style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', cursor: 'pointer' }}
                                                            >
                                                                <option value="both">🌐 CẢ 2 HỆ</option>
                                                                <option value="ielts">🌏 CHỈ IELTS</option>
                                                                <option value="sat">🎓 CHỈ SAT</option>
                                                            </select>
                                                            {isLocked && (
                                                                <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold', background: '#fee2e2', color: '#dc2626' }}>
                                                                    <i className="fa-solid fa-lock"></i> BỊ KHÓA
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                                <button onClick={() => handleToggleRole(user.id, safeRole)} title={safeRole === 'normal' ? "Thăng cấp" : "Hạ cấp"} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px 10px', cursor: 'pointer', color: '#475569' }}>
                                                                    <i className={safeRole === 'normal' ? "fa-solid fa-arrow-up" : "fa-solid fa-arrow-down"}></i>
                                                                </button>

                                                                <button onClick={() => handleToggleLock(user.id, isLocked)} title={isLocked ? "Mở khóa tài khoản" : "Khóa tài khoản"} style={{ background: isLocked ? '#dcfce7' : '#fff7ed', border: `1px solid ${isLocked ? '#86efac' : '#fed7aa'}`, borderRadius: '4px', padding: '6px 10px', cursor: 'pointer', color: isLocked ? '#166534' : '#2B6830' }}>
                                                                    <i className={isLocked ? "fa-solid fa-lock-open" : "fa-solid fa-lock"}></i>
                                                                </button>

                                                                <button onClick={() => handleResetPassword(user.id)} title="Reset Pass" style={{ background: '#E8F4EC', border: '1px solid #b7d9bc', borderRadius: '4px', padding: '6px 10px', cursor: 'pointer', color: '#2B6830' }}>
                                                                    <i className="fa-solid fa-key"></i>
                                                                </button>
                                                                <button onClick={() => handleDeleteUser(user.id, user.fullName)} title="Xóa tài khoản" style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '4px', padding: '6px 10px', cursor: 'pointer', color: '#dc2626' }}>
                                                                    <i className="fa-solid fa-trash-can"></i>
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* TAB 2: FORM TẠO TÀI KHOẢN */}
                {activeTab === 'userCreate' && (
                    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                        <div className="card" style={{ padding: '20px 30px' }}>
                            <h2 style={{ color: '#2B6830', marginTop: 0, borderBottom: '2px solid #eee', paddingBottom: '10px', marginBottom: '15px' }}>
                                <i className="fa-solid fa-user-plus"></i> Tạo Tài Khoản Mới
                            </h2>
                            <form onSubmit={handleCreateUser}>
                                <div style={{ marginBottom: 15 }}>
                                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 5, color: '#334155' }}>ID (Học viên / Nhân sự)</label>
                                    <input className="login-input" value={studentId} onChange={(e) => { if (isTypableId(e.target.value)) setStudentId(e.target.value); }} placeholder="VD: 12345678 hoặc NguyenVanA (không dấu cách)" />
                                </div>
                                <div style={{ marginBottom: 15 }}>
                                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 5, color: '#334155' }}>Họ và Tên</label>
                                    <input className="login-input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="VD: Nguyễn Văn A" />
                                </div>
                                <div style={{ marginBottom: 15 }}>
                                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 5, color: '#334155' }}>Mật khẩu <span style={{ fontWeight: 'normal', color: '#94a3b8' }}>(đã điền sẵn mặc định, có thể sửa)</span></label>
                                    <PasswordField className="login-input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Nhập mật khẩu..." />
                                </div>
                                <div style={{ marginBottom: 15 }}>
                                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 5, color: '#334155' }}>Phân quyền (Role)</label>
                                    <select className="login-input" value={role} onChange={(e) => setRole(e.target.value)} style={{ cursor: 'pointer', background: '#f8fafc' }}>
                                        <option value="normal">👤 Normal (Học viên thi bình thường)</option>
                                        <option value="private">🕵️‍♂️ Private (Người kiểm duyệt đề)</option>
                                    </select>
                                </div>
                                <div style={{ marginBottom: 20 }}>
                                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 5, color: '#334155' }}>Hệ thi được phép</label>
                                    <select className="login-input" value={examSystem} onChange={(e) => setExamSystem(e.target.value)} style={{ cursor: 'pointer', background: '#f8fafc' }}>
                                        <option value="both">🌐 Cả 2 hệ (IELTS + SAT)</option>
                                        <option value="ielts">🌏 Chỉ IELTS</option>
                                        <option value="sat">🎓 Chỉ SAT</option>
                                    </select>
                                </div>
                                <button type="submit" className="btn-submit-login" disabled={busy} style={{ fontSize: '1rem', padding: '12px', opacity: busy ? 0.6 : 1, cursor: busy ? 'wait' : 'pointer' }}>
                                    {busy ? 'ĐANG LƯU...' : 'LƯU VÀO HỆ THỐNG'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* TAB 3: TẢI LÊN MOCK TEST */}
                {activeTab === 'mock' && (
                    <div style={{ maxWidth: '800px', margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <div className="card" style={{ padding: '20px 30px', borderTop: '5px solid #2B6830', flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <h2 style={{ color: '#2B6830', marginTop: 0, marginBottom: '5px' }}>
                                <i className="fa-solid fa-code"></i> Tải Lên Đề Mock Test
                            </h2>
                            <p style={{ color: '#64748b', marginBottom: '15px', fontSize: '0.95rem' }}>
                                Dán object cấu trúc (JSON/JS) của một đề thi mới vào đây. Đề bài sẽ mang trạng thái <strong>Chờ duyệt (Pending)</strong>.
                            </p>

                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <textarea
                                    value={mockCode}
                                    onChange={(e) => setMockCode(e.target.value)}
                                    placeholder="Dán code Object JS của đề thi vào đây...&#10;VD:&#10;{&#10;  id: 'cam21_test1',&#10;  testName: 'Cambridge IELTS 21 Test 1',&#10;  ...&#10;}"
                                    style={{ flex: 1, width: '100%', padding: '15px', borderRadius: '8px', minHeight: '220px', border: '1px solid #cbd5e1', background: '#1e293b', color: '#10b981', fontFamily: 'monospace', fontSize: '13px', resize: 'vertical', lineHeight: '1.6' }}
                                    spellCheck="false"
                                />
                                <button onClick={handleUploadMockTest} className="btn-submit-login" disabled={busy}
                                    style={{ background: '#2B6830', fontSize: '1rem', padding: '12px', opacity: busy ? 0.6 : 1, cursor: busy ? 'wait' : 'pointer' }}
                                    onMouseOver={e => { if (!busy) e.currentTarget.style.background = '#1E5225'; }}
                                    onMouseOut={e => { if (!busy) e.currentTarget.style.background = '#2B6830'; }}>
                                    <i className="fa-solid fa-cloud-arrow-up"></i> {busy ? 'ĐANG TẢI LÊN...' : 'KIỂM TRA CODE & TẢI LÊN MÂY'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {/* TAB 4: TẠO ĐỀ WRITING VỚI RICH TEXT EDITOR */}
                {activeTab === 'writing' && (
                    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                        <div className="card" style={{ padding: '20px 30px', borderTop: '5px solid #2B6830' }}>
                            <h2 style={{ color: '#2B6830', marginTop: 0, marginBottom: '5px' }}>
                                <i className="fa-solid fa-pen-nib"></i> Tạo Đề Writing
                            </h2>
                            <p style={{ color: '#64748b', marginBottom: '15px', fontSize: '0.95rem' }}>Đề bài tải lên sẽ mặc định ở trạng thái <strong>Chờ duyệt (Pending)</strong>.</p>

                            <form onSubmit={handleCreateWriting}>
                                <div style={{ display: 'flex', gap: '15px', marginBottom: 15 }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 5, color: '#334155', fontSize: '0.85rem' }}>ID Đề bài</label>
                                        <input className="login-input" value={wId} onChange={(e) => setWId(e.target.value)} placeholder="VD: t1_99" required />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 5, color: '#334155', fontSize: '0.85rem' }}>Loại Task</label>
                                        <select className="login-input" value={wType} onChange={(e) => setWType(e.target.value)} style={{ cursor: 'pointer' }}>
                                            <option value="TASK 1">TASK 1</option>
                                            <option value="TASK 2">TASK 2</option>
                                        </select>
                                    </div>
                                </div>

                                <div style={{ marginBottom: 15 }}>
                                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 5, color: '#334155', fontSize: '0.85rem' }}>Chủ đề / Thể loại (Tùy chọn)</label>
                                    <input
                                        className="login-input"
                                        list="category-suggestions"
                                        value={wCategory}
                                        onChange={(e) => setWCategory(e.target.value)}
                                        placeholder={wType === 'TASK 1' ? "VD: Graphs & Charts" : "VD: Education"}
                                    />
                                    <datalist id="category-suggestions">
                                        {wType === 'TASK 1' ? (
                                            <>
                                                <option value="Graphs & Charts" />
                                                <option value="Maps" />
                                                <option value="Processes" />
                                                <option value="Mixed Charts" />
                                            </>
                                        ) : (
                                            <>
                                                <option value="Education" />
                                                <option value="Environment" />
                                                <option value="Technology" />
                                                <option value="Health" />
                                                <option value="Crime and Law" />
                                                <option value="Advertising and Media" />
                                                <option value="Work and Employment" />
                                                <option value="Society and Family" />
                                                <option value="Urbanization and Housing" />
                                                <option value="Sports" />
                                                <option value="Art and Culture" />
                                                <option value="Food and Agriculture" />
                                                <option value="Globalization and International Issues" />
                                                <option value="Tourism" />
                                                <option value="Transport" />
                                                <option value="Economy" />
                                            </>
                                        )}
                                    </datalist>
                                </div>

                                {wType === 'TASK 1' && (
                                    <div style={{ marginBottom: 15 }}>
                                        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 5, color: '#334155', fontSize: '0.85rem' }}>Link Ảnh (Image URL)</label>
                                        <input className="login-input" value={wImage} onChange={(e) => setWImage(e.target.value)} placeholder="https://..." />
                                    </div>
                                )}

                                <div style={{ marginBottom: 60 }}>
                                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 5, color: '#334155', fontSize: '0.85rem' }}>Đề bài (Prompt)</label>
                                    <ReactQuill
                                        theme="snow"
                                        value={wContent}
                                        onChange={setWContent}
                                        modules={quillModules}
                                        style={{ height: '220px' }}
                                        placeholder="Soạn thảo nội dung đề bài (Hỗ trợ in đậm, in nghiêng, list...)"
                                    />
                                </div>

                                <button type="submit" className="btn-submit-login" style={{ background: '#2B6830', fontSize: '1rem', padding: '12px' }}
                                    onMouseOver={e => e.currentTarget.style.background = '#1E5225'}
                                    onMouseOut={e => e.currentTarget.style.background = '#2B6830'}>ĐẨY LÊN HỆ THỐNG (PENDING)</button>
                            </form>
                        </div>
                    </div>
                )}

                {/* 👉 TAB 5: QUẢN LÝ WRITING LIBRARY - XÓA ĐỀ */}
                {activeTab === 'writingManage' && (() => {
                    const t1List = writingList.filter(i => i.type === 'TASK 1');
                    const t2List = writingList.filter(i => i.type === 'TASK 2');
                    const currentList = wManageTab === 'task1' ? t1List : t2List;
                    const searchVal = wManageTab === 'task1' ? wSearchTask1 : wSearchTask2;
                    const setSearch = wManageTab === 'task1' ? setWSearchTask1 : setWSearchTask2;
                    const filtered = searchVal.trim()
                        ? currentList.filter(i => {
                            const t = searchVal.toLowerCase();
                            return i.id.toLowerCase().includes(t) ||
                                (i.category || i.title || '').toLowerCase().includes(t);
                        })
                        : currentList;

                    const tabDefs = [
                        { id: 'task1', label: 'Task 1', icon: 'fa-solid fa-chart-pie', color: '#2B6830', bg: '#E8F4EC', count: t1List.length },
                        { id: 'task2', label: 'Task 2', icon: 'fa-solid fa-pen-fancy', color: '#2B6830', bg: '#E8F4EC', count: t2List.length },
                    ];

                    return (
                        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                            <div className="card" style={{ padding: '24px 30px', minHeight: '400px', borderTop: '5px solid #2B6830' }}>

                                {/* ── Header ── */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
                                    <div>
                                        <h2 style={{ color: '#2B6830', margin: 0, fontSize: '1.25rem' }}>
                                            <i className="fa-solid fa-list-check"></i> Quản Lý Writing Library
                                        </h2>
                                        <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>
                                            Tổng: {writingList.length} đề ({t1List.length} Task 1 · {t2List.length} Task 2)
                                        </p>
                                    </div>
                                    <button onClick={fetchAllWriting} style={{ background: '#2B6830', color: 'white', border: 'none', padding: '9px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '7px' }}
                                        onMouseOver={e => e.currentTarget.style.background = '#1E5225'}
                                        onMouseOut={e => e.currentTarget.style.background = '#2B6830'}>
                                        <i className="fa-solid fa-arrows-rotate"></i> Tải lại
                                    </button>
                                </div>

                                {/* ── Sub-tabs TASK 1 / TASK 2 ── */}
                                <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: '20px', gap: '4px' }}>
                                    {tabDefs.map(tab => {
                                        const isActive = wManageTab === tab.id;
                                        return (
                                            <button key={tab.id}
                                                onClick={() => { setWManageTab(tab.id); setConfirmDeleteWritingId(null); }}
                                                style={{
                                                    padding: '10px 22px', border: 'none', background: 'transparent',
                                                    cursor: 'pointer', fontSize: '0.95rem', fontWeight: isActive ? '700' : '500',
                                                    color: isActive ? tab.color : '#94a3b8', transition: '0.15s',
                                                    borderBottom: isActive ? `3px solid ${tab.color}` : '3px solid transparent',
                                                    marginBottom: '-2px', display: 'flex', alignItems: 'center', gap: '8px',
                                                }}>
                                                <i className={tab.icon}></i>
                                                {tab.label}
                                                <span style={{
                                                    background: isActive ? tab.bg : '#f1f5f9',
                                                    color: isActive ? tab.color : '#94a3b8',
                                                    padding: '2px 9px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '600'
                                                }}>
                                                    {tab.count}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {loadingWritingList ? (
                                    <div style={{ textAlign: 'center', padding: '60px', color: '#2B6830' }}>
                                        <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2rem' }}></i>
                                        <p style={{ marginTop: '12px' }}>Đang tải danh sách...</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* ── Thanh tìm kiếm + stats ── */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', gap: '16px', flexWrap: 'wrap' }}>
                                            <div style={{ position: 'relative', flex: '1', maxWidth: '340px' }}>
                                                <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}></i>
                                                <input
                                                    type="text"
                                                    placeholder="Tìm theo ID hoặc chủ đề..."
                                                    value={searchVal}
                                                    onChange={e => setSearch(e.target.value)}
                                                    style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem', outline: 'none', transition: '0.15s', boxSizing: 'border-box' }}
                                                    onFocus={e => e.target.style.borderColor = '#2B6830'}
                                                    onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                                                />
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', gap: '12px', alignItems: 'center', flexShrink: 0 }}>
                                                <span>
                                                    {searchVal.trim() ? `${filtered.length} / ${currentList.length}` : currentList.length} đề
                                                </span>
                                                <span style={{ width: '1px', height: '14px', background: '#e2e8f0' }}></span>
                                                <span style={{ color: '#15803d', fontWeight: '600' }}>
                                                    <i className="fa-solid fa-circle-check"></i> {currentList.filter(i => i.status === 'published').length} published
                                                </span>
                                                <span style={{ color: '#a16207', fontWeight: '600' }}>
                                                    <i className="fa-regular fa-clock"></i> {currentList.filter(i => i.status === 'pending').length} pending
                                                </span>
                                                {currentList.filter(i => i.status === 'reported').length > 0 && (
                                                    <span style={{ color: '#dc2626', fontWeight: '600' }}>
                                                        <i className="fa-solid fa-bug"></i> {currentList.filter(i => i.status === 'reported').length} reported
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* ── Gợi ý thao tác ── */}
                                        <p style={{ margin: '0 0 14px 0', color: '#94a3b8', fontSize: '0.82rem' }}>
                                            <i className="fa-solid fa-circle-info"></i> Nhấn <strong style={{ color: '#64748b' }}>Xóa</strong> lần 1 → xác nhận toast → nhấn lần 2 trong 5 giây để xóa vĩnh viễn.
                                        </p>

                                        {/* ── Table hoặc empty state ── */}
                                        {filtered.length === 0 ? (
                                            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                                                <i className="fa-solid fa-inbox" style={{ fontSize: '2.8rem', marginBottom: '12px', display: 'block' }}></i>
                                                <p style={{ margin: 0, fontSize: '1rem' }}>
                                                    {searchVal.trim() ? 'Không tìm thấy đề phù hợp.' : `Chưa có đề ${wManageTab === 'task1' ? 'Task 1' : 'Task 2'} nào.`}
                                                </p>
                                            </div>
                                        ) : (
                                            <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                                    <thead>
                                                        <tr style={{ background: '#f8fafc' }}>
                                                            <th style={{ padding: '11px 16px', color: '#475569', fontWeight: '600', textAlign: 'left', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>ID</th>
                                                            <th style={{ padding: '11px 16px', color: '#475569', fontWeight: '600', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Chủ đề</th>
                                                            <th style={{ padding: '11px 16px', color: '#475569', fontWeight: '600', textAlign: 'left', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>Trạng thái</th>
                                                            <th style={{ padding: '11px 16px', color: '#475569', fontWeight: '600', textAlign: 'left', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>Ngày tạo</th>
                                                            <th style={{ padding: '11px 16px', color: '#475569', fontWeight: '600', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>Hành động</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {filtered.map((item, idx) => {
                                                            const isPendingDelete = confirmDeleteWritingId === item.id;
                                                            const statusMap = {
                                                                published: { bg: '#dcfce7', color: '#15803d', label: '✅ Published' },
                                                                pending:   { bg: '#fef9c3', color: '#a16207', label: '⏳ Pending' },
                                                                reported:  { bg: '#fee2e2', color: '#dc2626', label: '🚨 Reported' },
                                                            };
                                                            const st = statusMap[item.status] || { bg: '#f1f5f9', color: '#64748b', label: item.status };
                                                            const topicLabel = item.category || item.title || '-';
                                                            const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : '-';
                                                            return (
                                                                <tr key={item.id} style={{
                                                                    background: isPendingDelete ? '#fff5f5' : (idx % 2 === 0 ? 'white' : '#fafafa'),
                                                                    transition: 'background 0.15s',
                                                                    borderBottom: idx < filtered.length - 1 ? '1px solid #f1f5f9' : 'none',
                                                                }}
                                                                    onMouseOver={e => { if (!isPendingDelete) e.currentTarget.style.background = '#F2F8F4'; }}
                                                                    onMouseOut={e => { if (!isPendingDelete) e.currentTarget.style.background = idx % 2 === 0 ? 'white' : '#fafafa'; }}>
                                                                    <td style={{ padding: '11px 16px', fontWeight: '700', color: '#0f172a', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                                                                        {item.id}
                                                                    </td>
                                                                    <td style={{ padding: '11px 16px', color: '#334155', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={topicLabel}>
                                                                        {topicLabel}
                                                                    </td>
                                                                    <td style={{ padding: '11px 16px', whiteSpace: 'nowrap' }}>
                                                                        <span style={{ background: st.bg, color: st.color, padding: '4px 11px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '600' }}>
                                                                            {st.label}
                                                                        </span>
                                                                    </td>
                                                                    <td style={{ padding: '11px 16px', color: '#64748b', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>{dateStr}</td>
                                                                    <td style={{ padding: '11px 16px', textAlign: 'center' }}>
                                                                        <button
                                                                            onClick={() => handleDeleteWritingEssay(item.id)}
                                                                            style={{
                                                                                background: isPendingDelete ? '#dc2626' : 'white',
                                                                                color: isPendingDelete ? 'white' : '#dc2626',
                                                                                border: `1.5px solid ${isPendingDelete ? '#dc2626' : '#fca5a5'}`,
                                                                                padding: '6px 14px', borderRadius: '6px', cursor: 'pointer',
                                                                                fontSize: '0.82rem', fontWeight: isPendingDelete ? '700' : '500',
                                                                                transition: '0.15s', whiteSpace: 'nowrap',
                                                                            }}>
                                                                            <i className="fa-solid fa-trash-can"></i>
                                                                            {' '}{isPendingDelete ? 'XÁC NHẬN' : 'Xóa'}
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })()}

                {/* 👉 TAB 6: BỆNH VIỆN - TRẠM XỬ LÝ LỖI ĐỀ */}
                {activeTab === 'bugList' && (
                    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                        <div className="card" style={{ padding: '20px 30px', minHeight: '400px', borderTop: '5px solid #ef4444' }}>
                            <h2 style={{ color: '#dc2626', marginTop: 0, borderBottom: '2px solid #eee', paddingBottom: '10px', marginBottom: '15px' }}>
                                <span><i className="fa-solid fa-bug"></i> 🏥 Trạm Xử Lý Lỗi Đề (Reported)</span>
                            </h2>
                            <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '20px' }}>
                                💡 <strong>Quy trình:</strong> Đọc ghi chú bên dưới ➡️ Mở file code trên máy tính sửa lại ➡️ Tải đè lên hệ thống ➡️ Bấm <strong>"Đã Sửa Xong"</strong> để bàn giao lại cho QA kiểm duyệt.
                            </p>

                            {loadingBugs ? (
                                <div style={{ textAlign: 'center', padding: '50px', color: '#ef4444' }}>
                                    <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2rem' }}></i><p>Đang quét danh sách lỗi...</p>
                                </div>
                            ) : reportedBugs.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '50px', color: '#64748b' }}>
                                    <i className="fa-solid fa-circle-check" style={{ fontSize: '3rem', color: '#10b981', marginBottom: '15px' }}></i>
                                    <h3>Hệ thống sạch lỗi!</h3>
                                    <p>Không có đề thi nào bị báo cáo lỗi vào lúc này.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    {reportedBugs.map((test) => (
                                        <div key={test.id} style={{ border: '1px solid #fca5a5', background: '#fffefc', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                            {/* flexWrap: tren dien thoai ten de dai + 2 nut khong chen nhau (cac card khac cung file da co wrap) */}
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed #fca5a5', paddingBottom: '10px', marginBottom: '15px' }}>
                                                <div style={{ minWidth: 0 }}>
                                                    <span style={{ background: '#ef4444', color: 'white', padding: '3px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', marginRight: '10px' }}>
                                                        ID: {test.id}
                                                    </span>
                                                    <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>{test.displayName}</strong>
                                                </div>

                                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                                    <button onClick={() => handleResolveBug(test.id, test._collection)} style={{ background: '#2B6830', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem', transition: '0.2s' }} onMouseOver={e => e.target.style.background = '#1E5225'} onMouseOut={e => e.target.style.background = '#2B6830'}>
                                                        <i className="fa-solid fa-circle-check"></i> ĐÃ SỬA XONG
                                                    </button>

                                                    <button onClick={() => handleDeleteReportedMock(test.id, test.displayName, test._collection)} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem', transition: '0.2s' }} onMouseOver={e => e.target.style.background = '#dc2626'} onMouseOut={e => e.target.style.background = '#ef4444'}>
                                                        <i className="fa-solid fa-trash-can"></i> XÓA ĐỀ NÀY
                                                    </button>
                                                </div>
                                            </div>
                                            <div style={{ background: '#fef2f2', borderLeft: '4px solid #ef4444', padding: '15px', borderRadius: '4px', color: '#991b1b', fontSize: '0.95rem', fontFamily: 'monospace', whiteSpace: 'pre-line', lineHeight: '1.6' }}>
                                                {test.bugNotes || "Không có nội dung mô tả lỗi cụ thể."}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}

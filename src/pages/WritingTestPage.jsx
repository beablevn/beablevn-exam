// src/pages/WritingTestPage.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate, useParams, useLocation } from 'react-router-dom';
import FullscreenGuard from '../components/FullscreenGuard';
import AntiCheatGuard from '../components/AntiCheatGuard';
import { buildCheatReportHTML, cheatTitleSuffix } from '../utils/cheatLog';
import { generateContentWithRotation } from '../utils/geminiHelper';
import { reportTestBug } from '../utils/api';
import emailjs from '@emailjs/browser';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import parse from 'html-react-parser';

import { ref, push, set, get, child, update } from "firebase/database";
import { db } from '../firebase';

const EMAIL_SERVICE_ID = "service_gvlyalu";
const EMAIL_TEMPLATE_ID = "template_h4voh6v";
const EMAIL_PUBLIC_KEY = "Tq7e72DxJoSIlhIU4";

export default function WritingTestPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();
    // 👉 ĐỌC ID TỪ TRÊN THANH URL (Do Review Hub đẩy sang)
    const { id: urlId } = useParams(); 

    // 1. LOGIC LẤY ID THÔNG MINH
    const isUrlTask2 = urlId && urlId.startsWith('t2');
    const t1Id = urlId ? (!isUrlTask2 ? urlId : null) : searchParams.get('t1');
    const t2Id = urlId ? (isUrlTask2 ? urlId : null) : searchParams.get('t2');
    const mode = urlId ? (isUrlTask2 ? 'task2' : 'task1') : searchParams.get('mode');

    // 2. STATE DỮ LIỆU CƠ BẢN
    const [activeTask, setActiveTask] = useState(mode === 'task2' ? 'task2' : 'task1');
    const [task1Data, setTask1Data] = useState(null);
    const [task2Data, setTask2Data] = useState(null);
    const [loadingData, setLoadingData] = useState(true);

    // 👉 STATE CHO TÍNH NĂNG BÁO LỖI VÀ ĐIỀU HƯỚNG
    const userRole = localStorage.getItem('currentUserRole') || 'normal';
    const [showBugModal, setShowBugModal] = useState(false);
    const [bugNote, setBugNote] = useState('');
    const [isSendingBug, setIsSendingBug] = useState(false); // khoa nut gui, chong bam doi ghi trung bugNotes

    // Gắn ID học viên vào khoá lưu nháp để nháp KHÔNG bị dùng chung giữa các tài khoản
    // đăng nhập trên cùng một trình duyệt (trước đây khoá không có ID -> lộ bài người trước).
    const _draftOwner = localStorage.getItem("currentStudentId") || "Guest";
    const testSaveKey = useMemo(() => `ielts_writing_save_${_draftOwner}_${mode}_${t1Id || 'x'}_${t2Id || 'x'}`, [_draftOwner, mode, t1Id, t2Id]);
    const timeSaveKey = useMemo(() => `ielts_writing_time_${_draftOwner}_${mode}_${t1Id || 'x'}_${t2Id || 'x'}`, [_draftOwner, mode, t1Id, t2Id]);

    const initialTime = useMemo(() => {
        if (mode === 'task1') return 20 * 60;
        if (mode === 'task2') return 40 * 60;
        return 60 * 60;
    }, [mode]);

    const [answers, setAnswers] = useState({ task1: "", task2: "" });
    const [timeLeft, setTimeLeft] = useState(initialTime);
    const [isRestored, setIsRestored] = useState(false);
    
    const [isTestStarted, setIsTestStarted] = useState(true);
    const [studentId, setStudentId] = useState("");

    const [isGrading, setIsGrading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const [aiResultTask1, setAiResultTask1] = useState(null);
    const [aiResultTask2, setAiResultTask2] = useState(null);

    // 👉 TẠO CÁC REF ĐỂ ĐỒNG BỘ DỮ LIỆU ĐÁM MÂY CHUẨN XÁC
    const answersRef = useRef(answers);
    useEffect(() => { answersRef.current = answers; }, [answers]);

    const timeLeftRef = useRef(timeLeft);
    useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);

    // Chot chong nop bai 2 lan (bam nut + timer het gio + StrictMode double-invoke): ref khoa ngay lap tuc,
    // khong doi setState nen 2 lenh goi lien tiep trong cung tick khong the cung vao.
    const submittedRef = useRef(false);

    // =========================================================
    // 🛠️ KHU VỰC CÁC HÀM XỬ LÝ (ĐƯỢC ĐƯA LÊN TRÊN ĐỂ TRÁNH LỖI HOISTING)
    // =========================================================

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600); const m = Math.floor((seconds % 3600) / 60); const s = seconds % 60;
        return `${h > 0 ? h + ':' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const renderHTML = (text) => parse((text || "").replace(/\n/g, '<br/>'));

    const handleReportBug = async () => {
        if (isSendingBug) return; // dang gui do, bo qua lan bam them
        if (!bugNote.trim()) { toast.warning("⚠️ Vui lòng nhập chi tiết lỗi!"); return; }
        setIsSendingBug(true);
        try {
            const currentId = t1Id || t2Id;
            if (!currentId) { toast.error("❌ Không xác định được đề để báo lỗi."); return; }

            // Báo lỗi qua Function (gộp bugNotes + set status server-side)
            await reportTestBug('writingLibrary', currentId, bugNote.trim(), 'WRITING');

            toast.success("🐞 Đã ghi nhận lỗi! Đề thi đã bị đưa vào trạm xử lý.");
            setShowBugModal(false);
            setBugNote('');
            if (userRole === 'private' && location.state?.fromReviewHub) {
                navigate('/review-hub', { state: { tab: 'writing' }, replace: true });
            } else {
                navigate('/writing-library', { replace: true });
            }
        } catch (error) {
            const msg = (error?.message || '').includes('not-found') || (error?.message || '').includes('Khong tim thay')
                ? "❌ Không tìm thấy đề trên hệ thống, có thể đề đã bị gỡ."
                : "❌ Lỗi khi gửi báo cáo: " + error.message;
            toast.error(msg);
        }
        finally { setIsSendingBug(false); }
    };

    const saveToHistory = async (bandScore, t1Band, t2Band) => {
        const studentId = localStorage.getItem("currentStudentId") || "Guest";
        const studentName = localStorage.getItem("currentStudentName") || "Học viên";
        
        let customTestName = "Writing Practice";
        const getT1Name = () => task1Data ? `Task 1 (${t1Id})` : 'Task 1';
        const getT2Name = () => task2Data ? `Task 2 (${t2Id})` : 'Task 2';

        if (mode === 'full') { customTestName = `${getT1Name()} & ${getT2Name()}`; } 
        else if (mode === 'task1') { customTestName = getT1Name(); } 
        else if (mode === 'task2') { customTestName = getT2Name(); }

        const record = {
            id: Date.now(), type: 'writing', date: new Date().toISOString(), studentId, studentName,
            testId: mode === 'full' ? `${t1Id}_${t2Id}` : (t1Id || t2Id), testName: customTestName, 
            skill: mode === 'task1' ? 'TASK 1' : mode === 'task2' ? 'TASK 2' : 'FULL TEST',
            band: `${bandScore}`, t1Band: t1Band, t2Band: t2Band  
        };

        if (studentId === "Guest") {
            const history = JSON.parse(localStorage.getItem("ielts_history") || "[]");
            history.push(record); localStorage.setItem("ielts_history", JSON.stringify(history));
        } else {
            try {
                await set(push(ref(db, `history/${studentId}`)), record);
            } catch (error) {
                console.error("Lỗi Firebase:", error);
                const history = JSON.parse(localStorage.getItem("ielts_history") || "[]");
                history.push(record); localStorage.setItem("ielts_history", JSON.stringify(history));
            }
        }
    };

    const gradeSingleTask = async (taskKey, essayContent, promptText) => {
        if (!essayContent || essayContent.length < 10) return null;
        const taskCriterion = taskKey === 'task1' ? "TA" : "TR";
        const cleanQuestion = (promptText || "No prompt").replace(/<[^>]*>?/gm, '');

        const prompt = `You are an IELTS Examiner. Task: ${taskKey}. Question: "${cleanQuestion}" Essay: "${essayContent}" Output ONLY strict JSON: { "criteria": { "${taskCriterion}": { "score": 6.0, "text": "brief comment" }, "CC": { "score": 6.0, "text": "brief comment" }, "LR": { "score": 6.0, "text": "brief comment" }, "GRA": { "score": 6.0, "text": "brief comment" } } }`;

        try {
            const responseText = await generateContentWithRotation(prompt);
            let cleanJson = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
            const scoreData = JSON.parse(cleanJson);
            const cr = scoreData.criteria;

            const scores = [cr[taskCriterion]?.score || 0, cr.CC?.score || 0, cr.LR?.score || 0, cr.GRA?.score || 0];
            const avg = scores.reduce((a, b) => a + b, 0) / 4;
            scoreData.band = (Math.round(avg * 2) / 2).toString();

            if (taskKey === 'task1' && cr.TR) { cr.TA = cr.TR; delete cr.TR; }
            if (taskKey === 'task2' && cr.TA) { cr.TR = cr.TA; delete cr.TA; }
            return scoreData;
        } catch (e) { toast.error(`Chi tiết lỗi ${taskKey}: ${e.message}`); return null; }
    };

    const handleAiGrade = async () => {
        const t1 = answers?.task1 || ""; const t2 = answers?.task2 || "";
        const hasT1 = task1Data && t1.length > 20; const hasT2 = task2Data && t2.length > 20;

        if (!hasT1 && !hasT2) { toast.warning("⚠️ Bài làm quá ngắn để chấm điểm."); return; }
        setIsGrading(true); toast.info("🤖 Đang gửi bài cho AI...");

        try {
            let isSuccess = false;
            if (hasT1) {
                const promptT1 = task1Data?.title || task1Data?.prompt || "";
                const res1 = await gradeSingleTask('task1', t1, promptT1);
                if (res1) { setAiResultTask1(res1); isSuccess = true; }
            }
            if (hasT1 && hasT2) { await new Promise(resolve => setTimeout(resolve, 2500)); }
            if (hasT2) {
                const promptT2 = task2Data?.question || task2Data?.prompt || "";
                const res2 = await gradeSingleTask('task2', t2, promptT2);
                if (res2) { setAiResultTask2(res2); isSuccess = true; }
            }
            if (isSuccess) { toast.success("✅ Đã hoàn tất chấm điểm!"); } else { toast.error("❌ Hệ thống chấm điểm thất bại."); }
        } catch (error) { toast.error("❌ Lỗi hệ thống: " + error.message); } finally { setIsGrading(false); }
    };

    const generateWritingFeedbackHTML = (aiResult, taskType) => {
        if (!aiResult || !aiResult.criteria) return "<em>Chưa chấm điểm AI.</em>";
        const { criteria, band } = aiResult;
        let html = `<table style="width:100%; border-collapse: collapse; font-family: monospace; font-size: 13px;">`;
        const keysOrder = taskType === 'task1' ? ['TA', 'CC', 'LR', 'GRA'] : ['TR', 'CC', 'LR', 'GRA'];
        keysOrder.forEach(key => {
            const item = criteria[key];
            if (item) html += `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px; color: #2B6830; font-weight: bold; width: 60px;">${key}</td><td style="padding: 8px; color: #333;">${item.text || item.comment}</td><td style="padding: 8px; text-align: right;"><span style="background: #2B6830; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;">${item.score}</span></td></tr>`;
        });
        html += `<tr><td colspan="3" style="padding: 10px; text-align: right; background-color: #e8f5e9; color: #2e7d32; font-weight: bold; border-top: 2px solid #ddd;">BAND SCORE: ${band}</td></tr></table>`;
        return html;
    };

    const handlePreSubmit = () => { setShowConfirmModal(true); };

    const handleRealSubmit = async () => {
        // Da nop roi thi bo qua moi lenh goi sau (chong nop 2 lan)
        if (submittedRef.current) return;
        submittedRef.current = true;
        setShowConfirmModal(false); setIsSubmitting(true);

        let overallText = "N/A";
        let t1Band = aiResultTask1 ? aiResultTask1.band : "N/A";
        let t2Band = aiResultTask2 ? aiResultTask2.band : "N/A";        

        if (aiResultTask1 && aiResultTask2) {
            const b1 = parseFloat(aiResultTask1.band || 0); const b2 = parseFloat(aiResultTask2.band || 0);
            overallText = ((b1 + b2 * 2) / 3).toFixed(1);
        } else if (aiResultTask1) overallText = aiResultTask1.band;
        else if (aiResultTask2) overallText = aiResultTask2.band;

        await saveToHistory(overallText, t1Band, t2Band);

        // 👉 Mã đề writing chuyên biệt: học viên tự chọn đề, có thể làm Task 1, Task 2 hoặc cả 2.
        // Mã đề phản ánh đúng (các) task đã chọn kèm ID đề tương ứng.
        let writingTestCode;
        if (mode === 'full' || (t1Id && t2Id)) {
            writingTestCode = `Writing Task 1 (${t1Id}) và Task 2 (${t2Id})`;
        } else if (mode === 'task2' || t2Id) {
            writingTestCode = `Writing Task 2 (${t2Id})`;
        } else {
            writingTestCode = `Writing Task 1 (${t1Id})`;
        }

        const m = Math.floor((initialTime - timeLeft) / 60); const s = (initialTime - timeLeft) % 60;
        const templateParams = {
            student_name: studentId, test_code: writingTestCode, overall_score: overallText, time_taken: `${m}m ${s}s`, submission_time: new Date().toLocaleString('vi-VN'),
            task1_content: answers.task1 || "(No submission)", task1_feedback: buildCheatReportHTML() + generateWritingFeedbackHTML(aiResultTask1, 'task1'),
            task2_content: answers.task2 || "(No submission)", task2_feedback: generateWritingFeedbackHTML(aiResultTask2, 'task2')
        };

        // 👉 Gửi email kết quả: KHÔNG để việc gửi mail chặn việc nộp bài.
        // Nếu email lỗi/timeout, học viên VẪN phải được nộp xong: xoá nháp + về thư viện,
        // tránh kẹt màn hình và tránh lộ bài cho người dùng kế tiếp trên cùng máy.
        try {
            await emailjs.send(EMAIL_SERVICE_ID, EMAIL_TEMPLATE_ID, templateParams);
        } catch (err) {
            console.error("Gửi email kết quả Writing thất bại:", err);
            toast.warning("Bài đã nộp nhưng hệ thống gửi email đang bận!");
        }

        // 👉 DỌN NHÁP + ĐIỀU HƯỚNG: LUÔN chạy dù email thành công hay thất bại
        localStorage.removeItem(testSaveKey); localStorage.removeItem(timeSaveKey);
        const sId = localStorage.getItem("currentStudentId");
        if (sId && sId !== "Guest") {
            try { await update(ref(db, `drafts/${sId}/writing`), { [`${t1Id || 'x'}_${t2Id || 'x'}`]: null }); }
            catch (e) { console.error(e); }
        }

        toast.success("🎉 Nộp bài thành công!", { autoClose: 6000 });
        if (userRole === 'private' && location.state?.fromReviewHub) {
            navigate('/review-hub', { state: { tab: 'writing' }, replace: true });
        } else {
            navigate('/writing-library', { replace: true });
        }
    };

    // =========================================================
    // 📡 KHU VỰC HOOKS EFFECT (LẬP ĐƯỜNG TRUYỀN DỮ LIỆU)
    // =========================================================

    // 👉 3. KÉO DỮ LIỆU TỪ FIREBASE & KHÔI PHỤC BẢN NHÁP (CÓ BẢO VỆ TRY-CATCH)
    useEffect(() => {
        const fetchWritingTasksAndDrafts = async () => {
            const currentStudentId = localStorage.getItem("currentStudentId") || "Guest";
            try {
                const dbRef = ref(db);
                let t1 = null, t2 = null;

                if (t1Id) { const snap1 = await get(child(dbRef, `writingLibrary/${t1Id}`)); if (snap1.exists()) t1 = snap1.val(); }
                if (t2Id) { const snap2 = await get(child(dbRef, `writingLibrary/${t2Id}`)); if (snap2.exists()) t2 = snap2.val(); }
                setTask1Data(t1); setTask2Data(t2);

                // 🔥 LOGIC KHÔI PHỤC AN TOÀN CHỐNG CRASH
                const localAns = localStorage.getItem(testSaveKey);
                const localTime = localStorage.getItem(timeSaveKey);

                if (localAns && localTime) {
                    try {
                        setAnswers(JSON.parse(localAns));
                        setTimeLeft(parseInt(localTime, 10));
                    } catch (e) {
                        setAnswers({ task1: "", task2: "" });
                        setTimeLeft(initialTime);
                    }
                    setIsRestored(true);
                } else if (currentStudentId !== "Guest") {
                    const draftSnap = await get(child(dbRef, `drafts/${currentStudentId}/writing/${t1Id || 'x'}_${t2Id || 'x'}`));
                    if (draftSnap.exists()) {
                        const draftData = draftSnap.val();
                        setAnswers(draftData.answers || { task1: "", task2: "" });
                        setTimeLeft(draftData.timeLeft || initialTime);
                        localStorage.setItem(testSaveKey, JSON.stringify(draftData.answers || { task1: "", task2: "" }));
                        localStorage.setItem(timeSaveKey, (draftData.timeLeft || initialTime).toString());
                    } else {
                        setTimeLeft(initialTime);
                    }
                    setIsRestored(true);
                } else {
                    setTimeLeft(initialTime);
                    setIsRestored(false);
                }
            } catch (error) {
                console.error("Lỗi tải đề Writing:", error);
                toast.error("Không thể kết nối tải đề thi.");
            } finally {
                setLoadingData(false);
            }
        };

        const storedId = localStorage.getItem("currentStudentId");
        const storedName = localStorage.getItem("currentStudentName");
        setStudentId(storedName ? `${storedName} (ID: ${storedId})` : (storedId || "Guest"));
        emailjs.init(EMAIL_PUBLIC_KEY);

        fetchWritingTasksAndDrafts();
    }, [t1Id, t2Id, testSaveKey, timeSaveKey, initialTime]);

    // 👉 ĐỒNG BỘ LOCAL LIÊN TỤC KHI GÕ
    useEffect(() => {
        if (!loadingData && isRestored) localStorage.setItem(testSaveKey, JSON.stringify(answers));
    }, [answers, testSaveKey, loadingData, isRestored]);

    useEffect(() => {
        if (!loadingData && isRestored && timeLeft > 0) localStorage.setItem(timeSaveKey, timeLeft.toString());
    }, [timeLeft, timeSaveKey, loadingData, isRestored]);

    // 👉 AUTO-SAVE LÊN FIREBASE (RÚT NGẮN CÒN 5 GIÂY & KÍCH HOẠT LƯU NGAY PHÁT ĐẦU)
    useEffect(() => {
        const sId = localStorage.getItem("currentStudentId");
        if (!sId || sId === "Guest" || loadingData || !isRestored || timeLeftRef.current <= 0) return;

        const saveToCloud = async () => {
            // Da nop bai thi khong ghi nhap nua (tranh ghi de sau khi drafts da bi xoa luc nop)
            if (submittedRef.current) return;
            try {
                await update(ref(db, `drafts/${sId}/writing/${t1Id || 'x'}_${t2Id || 'x'}`), {
                    answers: answersRef.current,
                    timeLeft: timeLeftRef.current,
                    updatedAt: new Date().toISOString()
                });
                console.log("☁️ Backup Cloud Writing thành công.");
            } catch (err) { console.error("Lỗi lưu nháp Cloud:", err); }
        };

        // 🔥 LỆNH THẦN THÁNH: Ghi nhận dữ liệu lên Firebase ngay lập tức khi vừa vào trang!
        saveToCloud();

        // Cứ mỗi 5 giây chạy ngầm một lần thay vì 20 giây quá lâu
        const autoSaveInterval = setInterval(saveToCloud, 5000);

        return () => clearInterval(autoSaveInterval);
    }, [loadingData, isRestored, t1Id, t2Id]);

    // 👉 4. TIMER ĐẾM NGƯỢC THỜI GIAN (chi giam so, KHONG goi submit trong updater)
    useEffect(() => {
        let timer = null;
        if (isTestStarted && timeLeft > 0 && !loadingData) {
            timer = setInterval(() => {
                setTimeLeft(prev => (prev <= 1 ? 0 : prev - 1));
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [isTestStarted, timeLeft, loadingData]);

    // Tu dong nop khi het gio: tach khoi setState updater de tranh StrictMode goi 2 lan (nguon bug email x2).
    // submittedRef trong handleRealSubmit dam bao chi nop 1 lan du effect chay lai.
    useEffect(() => {
        if (timeLeft === 0 && isTestStarted && !loadingData && !submittedRef.current) {
            handleRealSubmit();
        }
    }, [timeLeft, isTestStarted, loadingData]);

    // 👉 5. HIỂN THỊ MÀN HÌNH LOADING
    if (loadingData) {
        return (
            <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F2F8F4', color: '#2B6830', position: 'fixed', top: 0, left: 0, zIndex: 9999 }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '3.5rem', marginBottom: '20px' }}></i>
                <h2 style={{ margin: 0 }}>Đang chuẩn bị đề Writing...</h2>
                <p style={{ color: '#666', marginTop: '10px' }}>Vui lòng chờ trong giây lát</p>
            </div>
        );
    }

    if (!task1Data && !task2Data) {
        return (
            <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F2F8F4' }}>
                <i className="fa-regular fa-face-frown" style={{ fontSize: '4rem', color: '#ef4444', marginBottom: '20px' }}></i>
                <h2 style={{ color: '#2B6830' }}>❌ Lỗi tải đề thi!</h2>
                {/* Dung class btn-home co san (hover + vung cham chuan) thay vi tu ve nut */}
                <button className="btn-home" onClick={() => navigate('/writing-library', { replace: true })}>
                    <i className="fa-solid fa-arrow-left"></i> Về thư viện Writing
                </button>
            </div>
        );
    }

    return (
        <div className="test-page-layout">
            <FullscreenGuard />
            <AntiCheatGuard active={!isSubmitting && !loadingData} testId={urlId || "writing"} onForceSubmit={handleRealSubmit} />
            <ToastContainer position="bottom-right" autoClose={3000} theme="colored" style={{ zIndex: 999999 }} />

            <div className="test-header">
                <div className="header-left"><img src="/images/logo.png" alt="Logo" className="test-logo" /></div>
                <div className="header-center"><div className="timer-box"><i className="fa-regular fa-clock"></i> {formatTime(timeLeft)}</div></div>
                <div className="header-right">
                    {userRole === 'private' && (
                        <button className="btn-report-header" onClick={() => setShowBugModal(true)}>
                            <i className="fa-solid fa-bug"></i> <span>BÁO LỖI</span>
                        </button>
                    )}
                    {/* Chu trong span de rule mobile .btn-ai-header span { display: none } thu gon duoc */}
                    <button className="btn-ai-header" onClick={handleAiGrade} disabled={isGrading || isSubmitting}><i className="fa-solid fa-wand-magic-sparkles"></i> <span>{isGrading ? 'Grading...' : 'AI Grade'}</span></button>
                    <button className="submit-btn" onClick={handlePreSubmit} disabled={isSubmitting}>SUBMIT WRITING</button>                   
                </div>
            </div>

            <div className="test-main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div className="writing-wrapper">
                    <div className="writing-tabs-bar">
                        {task1Data && <button className={`w-tab-btn ${activeTask === 'task1' ? 'active' : ''}`} onClick={() => setActiveTask('task1')}>Task 1</button>}
                        {task2Data && <button className={`w-tab-btn ${activeTask === 'task2' ? 'active' : ''}`} onClick={() => setActiveTask('task2')}>Task 2</button>}
                    </div>

                    <div className="writing-workspace" style={{ position: 'relative' }}>
                        <div className="w-left-pane">
                            <div className="w-header-part">
                                <h2>{activeTask === 'task1' ? 'WRITING TASK 1' : 'WRITING TASK 2'}</h2>
                                <p>You should spend about {activeTask === 'task1' ? '20' : '40'} minutes on this task.</p>
                            </div>
                            <div className="prompt-box">
                                {activeTask === 'task1' && task1Data ? (
                                    <>
                                        {/* dangerouslySetInnerHTML để render đúng HTML từ ReactQuill, tránh lỗi parse() với inline style phức tạp */}
                                        <div style={{ marginBottom: '20px' }} dangerouslySetInnerHTML={{ __html: (task1Data.title || task1Data.prompt || "").replace(/\n/g, '<br/>') }} />
                                        {task1Data.images && task1Data.images.length > 0 && (task1Data.images.map((img, i) => (<img key={i} src={img} className="task-img" style={{ marginBottom: '15px' }} alt={`Task 1 Part ${i + 1}`} />)))}
                                        {task1Data.image && !task1Data.images && (<img src={task1Data.image} className="task-img" alt="Task 1" />)}
                                    </>
                                ) : activeTask === 'task2' && task2Data ? (
                                    <>
                                        <div style={{ fontSize: '1.05rem', lineHeight: '1.6', marginBottom: '20px' }} dangerouslySetInnerHTML={{ __html: (task2Data.question || task2Data.prompt || "").replace(/\n/g, '<br/>') }} />
                                        {task2Data.instruction && (<p style={{ fontStyle: 'italic', color: '#555', borderLeft: '3px solid #ccc', paddingLeft: '10px' }}>{task2Data.instruction}</p>)}
                                    </>
                                ) : (<p>Loading...</p>)}
                            </div>
                        </div>

                        <div className="w-right-pane">
                            <textarea className="writing-textarea" placeholder={`Type your ${activeTask === 'task1' ? 'Task 1' : 'Task 2'} answer here...`} value={answers[activeTask] || ''} onChange={(e) => setAnswers({ ...answers, [activeTask]: e.target.value })} />
                            <div className="meta-row">Word Count: <strong>{(answers[activeTask] || "").split(/\s+/).filter(w => w.length > 0).length}</strong></div>
                            {(activeTask === 'task1' ? aiResultTask1 : aiResultTask2) && (
                                <div className="grading-box">
                                    {(() => {
                                        const res = activeTask === 'task1' ? aiResultTask1 : aiResultTask2;
                                        const criteria = res.criteria;
                                        const keysOrder = activeTask === 'task1' ? ['TA', 'CC', 'LR', 'GRA'] : ['TR', 'CC', 'LR', 'GRA'];
                                        return (
                                            <>
                                                {keysOrder.map(key => (
                                                    criteria[key] && (
                                                        <div key={key} className="grade-row">
                                                            <span className="grade-label">{key}</span><span className="grade-text">{criteria[key].text || criteria[key].comment}</span><span className="grade-score">{criteria[key].score}</span>
                                                        </div>
                                                    )
                                                ))}
                                                <div className="task-overall">BAND SCORE: {res.band}</div>
                                            </>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {showConfirmModal && (
                <div className="confirm-overlay" onClick={() => setShowConfirmModal(false)}>
                    <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
                        <h3 className="confirm-title">Nộp bài thi?</h3>
                        <p className="confirm-desc">Bạn có chắc chắn muốn nộp bài không?<br /><span style={{ fontSize: '0.9rem', color: '#D32F2F' }}>(Lưu ý: Nếu muốn có điểm chấm AI, hãy bấm nút "AI Grade" trước khi nộp)</span></p>
                        <div className="confirm-actions"><button className="btn-cancel" onClick={() => setShowConfirmModal(false)}>Hủy bỏ</button><button className="btn-confirm" onClick={handleRealSubmit}>Đồng ý Nộp</button></div>
                    </div>
                </div>
            )}
            {userRole === 'private' && showBugModal && (
                <div className="modal-overlay" onClick={() => setShowBugModal(false)} style={{ zIndex: 9999 }}>
                    {/* modal-box-test (650px): ban cu dung modal-box width 350 co dinh, maxWidth 650 khong noi rong duoc */}
                    <div className="modal-box-test" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'left' }}>
                        <button className="close-modal" onClick={() => setShowBugModal(false)}>×</button>
                        <h2 style={{ color: '#ef4444', marginTop: 0, borderBottom: '2px solid #fee2e2', paddingBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <i className="fa-solid fa-bug"></i> BÁO LỖI ĐỀ WRITING
                        </h2>
                        <p style={{ color: '#666666', fontSize: '1rem', marginBottom: '20px' }}>
                            Hệ thống sẽ cập nhật trạng thái đề thành <strong>Reported</strong>.
                        </p>
                        <textarea
                            value={bugNote}
                            onChange={(e) => setBugNote(e.target.value)}
                            placeholder="Mô tả chi tiết lỗi bạn gặp ở đề này... (VD: Hình ảnh bị lỗi, sai chính tả...)"
                            style={{ width: '100%', height: '150px', padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1', resize: 'vertical', marginBottom: '20px', fontFamily: 'inherit', fontSize: '1rem' }}
                            autoFocus
                        />
                        <button
                            onClick={handleReportBug}
                            disabled={isSendingBug}
                            style={{ width: '100%', background: '#ef4444', color: 'white', border: 'none', padding: '15px', borderRadius: '8px', fontWeight: 'bold', cursor: isSendingBug ? 'wait' : 'pointer', fontSize: '1.1rem', opacity: isSendingBug ? 0.6 : 1 }}
                        >
                            <i className="fa-solid fa-paper-plane"></i> {isSendingBug ? 'ĐANG GỬI...' : 'GỬI BÁO CÁO LỖI'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
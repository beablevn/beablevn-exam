// src/pages/FullTestPage.jsx
import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import FullscreenGuard from '../components/FullscreenGuard';
import AntiCheatGuard from '../components/AntiCheatGuard';
import { buildCheatReportHTML, cheatTitleSuffix } from '../utils/cheatLog';
import parse, { domToReact } from 'html-react-parser';
import emailjs from '@emailjs/browser';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { generateContentWithRotation } from '../utils/geminiHelper';
import { reportTestBug } from '../utils/api';

// 👉 IMPORT FIREBASE ĐẦY ĐỦ CÁC HÀM GET, CHILD
import { ref, push, set, get, child, update } from "firebase/database";
import { db } from '../firebase';

// Bang tra audioSrc tu file local (audioMap.js nho), uu tien hon Firebase de tranh link cu trong DB.
// Tách khỏi allTests để KHÔNG kéo toàn bộ data đề (~1.4MB) vào bundle chính.
import { audioMap as _localAudioMap } from '../data/audioMap';

// --- CẤU HÌNH ---
const EMAIL_PUBLIC_KEY = "Tq7e72DxJoSIlhIU4";
const EMAIL_SERVICE_ID = "service_gvlyalu";
const EMAIL_TEMPLATE_LR = "template_dbls4x9";
const EMAIL_TEMPLATE_WRITING = "template_h4voh6v";

export default function FullTestPage() {
    const userRole = localStorage.getItem('currentUserRole') || 'normal';
    const [showBugModal, setShowBugModal] = useState(false);
    const [bugNote, setBugNote] = useState('');
    const [isSendingBug, setIsSendingBug] = useState(false); // khoa nut gui bao loi, chong bam doi ghi trung bugNotes

    const { testId, skill } = useParams(); 
    const navigate = useNavigate();
    const location = useLocation();
    const audioRef = useRef(null);

    const [testData, setTestData] = useState(null);
    const [loadingData, setLoadingData] = useState(true);

    const initialTime = useMemo(() => {
        if (!testData) return 0;
        const sectionConfig = testData?.sections?.[skill];
        if (sectionConfig && sectionConfig.timeLimit) return sectionConfig.timeLimit;
        if (skill === 'listening') return 30 * 60;
        if (skill === 'reading') return 60 * 60;
        if (skill === 'writing') return 60 * 60;
        return 0;
    }, [skill, testData]);

    const [isTestStarted, setIsTestStarted] = useState(true);
    const [timeLeft, setTimeLeft] = useState(0);
    const [isAudioPlaying, setIsAudioPlaying] = useState(false);
    const [showListeningStart, setShowListeningStart] = useState(skill === 'listening');

    const saveKey = `ielts_save_${testId}_${skill}`;

    const [answers, setAnswers] = useState(() => {
        const savedAnswers = localStorage.getItem(saveKey);
        if (savedAnswers) {
            try { return JSON.parse(savedAnswers); } catch (e) { return {}; }
        }
        return {};
    });

    const [isRestored, setIsRestored] = useState(false);

    const answersRef = useRef(answers);
    useEffect(() => { answersRef.current = answers; }, [answers]);

    const timeLeftRef = useRef(timeLeft);
    useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);

    const [isSubmitted, setIsSubmitted] = useState(false);
    // Chot chong nop/gui email 2 lan (auto het gio + AntiCheat force + bam nut + StrictMode double-invoke).
    // Ref khoa ngay lap tuc, khong doi setIsSubmitted (async) nen 2 lenh goi cung tick khong cung vao.
    const submitLockRef = useRef(false);
    const [showResult, setShowResult] = useState(false);
    const [resultData, setResultData] = useState({ score: 0, total: 0 });

    const [activeWritingTask, setActiveWritingTask] = useState('task1');
    const [isGrading, setIsGrading] = useState(false);
    const [aiResultTask1, setAiResultTask1] = useState(null);
    const [aiResultTask2, setAiResultTask2] = useState(null);

    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, type: 'none' });
    const [notes, setNotes] = useState({});
    const [tooltip, setTooltip] = useState({ visible: false, content: '', x: 0, y: 0 });
    const savedRange = useRef(null);
    const currentNoteId = useRef(null);
    // Ref đồng bộ notes để tránh stale closure trong drag handlers
    const notesRef = useRef({});
    useEffect(() => { notesRef.current = notes; }, [notes]);
    // Ref lưu trạng thái drag (không cần re-render nên dùng ref thay state)
    const dragDataRef = useRef({ isDragging: false, noteId: null, offsetX: 0, offsetY: 0 });
    const [dragData, setDragData] = useState({ isDragging: false, noteId: null, offsetX: 0, offsetY: 0 });

    useEffect(() => { emailjs.init(EMAIL_PUBLIC_KEY); }, []);

    // Xóa tất cả toast cũ khi rời trang (tránh toast từ skill trước hiện sang skill mới)
    useEffect(() => {
        return () => { toast.dismiss(); };
    }, []);

    // 👉 HÀM LẤY SỐ THỨ TỰ CÂU HỎI (ĐÃ ĐƯỢC BỌC ÁO GIÁP CHỐNG LỖI MÀN HÌNH TRẮNG)
    const flatQuestions = useMemo(() => {
        // Bổ sung chặn đứng ngay lập tức nếu dữ liệu từ mây chưa tải xong
        if (!testData || !testData.sections || skill === 'writing') return [];
        
        const section = testData.sections[skill];
        if (!section || !section.questions) return [];
        
        let list = [];
        section.questions.forEach(part => {
            if (part.items) {
                part.items.forEach(item => {
                    if (item.qNums && Array.isArray(item.qNums)) {
                        item.qNums.forEach(num => { list.push({ qNum: num, isGroup: true, mainId: item.qNums[0], ...item }); });
                    } else if (item.qNum) { list.push(item); }
                });
            }
        });
        return list.sort((a, b) => a.qNum - b.qNum);
    }, [skill, testData]);

    // 👉 2. PHỤC HỒI HÀM CUỘN CHUẨN XÁC ĐẾN TỪNG CÂU HỎI
    const scrollToQuestion = (qNum) => {
        let el = document.getElementById(`nav-q-${qNum}`) || document.getElementById(`q-${qNum}`);
        if (!el) { 
            const qItem = flatQuestions.find(i => i.qNum === qNum); 
            if (qItem && qItem.mainId) el = document.getElementById(`nav-q-${qItem.mainId}`); 
        }
        if (el) { 
            el.scrollIntoView({ behavior: "smooth", block: "center" }); 
            if (['INPUT', 'SELECT'].includes(el.tagName)) el.focus(); 
        }
    };

    const formatTime = (seconds) => {
        if (isNaN(seconds) || seconds < 0) return "00:00";
        const h = Math.floor(seconds / 3600); 
        const m = Math.floor((seconds % 3600) / 60); 
        const s = seconds % 60;
        return `${h > 0 ? h + ':' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const getStudentId = () => localStorage.getItem("currentStudentId") || "Guest";
    const renderHTML = (htmlString) => parse(htmlString || "", {
        replace: (domNode) => {
            if (domNode.name === 'span' && domNode.attribs?.class?.includes('q-badge-inline')) {
                return <></>;
            }

            if (domNode.name === 'input' && domNode.attribs?.class?.includes('gap-input')) {
                const qNum = domNode.attribs['data-qnum'];
                return <input
                    className="gap-input"
                    id={`q-${qNum}`}
                    data-qnum={qNum}
                    placeholder={qNum}
                    value={answers[qNum] || ''}
                    onChange={(e) => handleInputChange(qNum, e.target.value)}
                    autoComplete="off"
                    spellCheck="false"
                />;
            }

            if (domNode.name === 'select' && domNode.attribs?.class?.includes('gap-select')) { const qNum = domNode.attribs['data-qnum']; return <select className="gap-select" id={`q-${qNum}`} data-qnum={qNum} value={answers[qNum] || ''} onChange={(e) => handleInputChange(qNum, e.target.value)}>{domToReact(domNode.children)}</select>; }
            if (domNode.name === 'input' && (domNode.attribs?.type === 'radio' || domNode.attribs?.type === 'checkbox')) { const nameAttr = domNode.attribs['name']; const qNum = nameAttr.replace('q-', ''); const val = domNode.attribs['value']; return <input type={domNode.attribs.type} name={nameAttr} value={val} checked={answers[qNum] === val} onChange={() => handleInputChange(qNum, val)} style={{ cursor: 'pointer', transform: 'scale(1.2)', marginRight: '8px' }} />; }
        }
    });
    const generateDetailedLog = (score, total, validQuestions, userAnswers) => {
        let html = `<div style="font-family:sans-serif;background:#fff;padding:15px;border-radius:8px;"><h2 style="color:#2B6830;text-align:center;border-bottom:2px solid #eee;padding-bottom:10px;margin-top:0;">Kết quả: <span style="color:#28a745;">${score}</span> / ${total}</h2><div style="text-align:center;padding:10px 0;">`;

        validQuestions.forEach(item => {
            const uRaw = userAnswers[item.qNum] || "";
            const u = uRaw.trim().toLowerCase();
            let isCorrect = false;
            let correctDisplay = "";

            if (item.answer !== undefined && item.answer !== null) {
                const c = Array.isArray(item.answer) ? item.answer : [item.answer];
                isCorrect = c.some(ans => ans && ans.toString().toLowerCase() === u);
                correctDisplay = c.join(" / ");
            }

            const bg = isCorrect ? "#f0fdf4" : "#fef2f2";
            const bd = isCorrect ? "#bbf7d0" : "#fecaca";
            const txt = isCorrect ? "#155724" : "#d32f2f";
            const icon = isCorrect ? "✅" : "❌";
            const ansDisplay = uRaw === "" ? "<em style='color:#999'>(trống)</em>" : uRaw;

            // 👉 Kỹ thuật HTML nén (Minified) chống vỡ Layout trên Gmail & Vượt qua rào cản dung lượng 50KB của EmailJS
            html += `<div style="display:inline-block;width:155px;height:95px;margin:4px;padding:10px;border:1px solid ${bd};border-radius:6px;background:${bg};text-align:left;vertical-align:top;box-sizing:border-box;"><div style="border-bottom:1px dashed ${bd};padding-bottom:4px;margin-bottom:6px;display:table;width:100%;"><div style="display:table-cell;font-size:13px;font-weight:bold;color:#334155;">Q.${item.qNum}</div><div style="display:table-cell;text-align:right;font-size:13px;">${icon}</div></div><div style="color:${txt};font-weight:bold;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${ansDisplay}</div>${!isCorrect && item.answer ? `<div style="font-size:12px;color:#475569;margin-top:4px;border-top:1px solid ${bd};padding-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"><strong>Key:</strong> ${correctDisplay}</div>` : ''}</div>`;
        });

        html += `</div></   div>`;
        return html;
    };
    const handleNoteDragStart = (e, id) => {
        e.preventDefault();
        const note = notesRef.current[id];
        if (!note) return;
        // Tính offset giữa vị trí chuột và góc trên-trái của popup
        const offsetX = e.clientX - (note.x || 0);
        const offsetY = e.clientY - (note.y || 0);
        dragDataRef.current = { isDragging: true, noteId: id, offsetX, offsetY };

        const handleMouseMove = (mv) => {
            if (!dragDataRef.current.isDragging) return;
            const { noteId, offsetX: ox, offsetY: oy } = dragDataRef.current;
            setNotes(prev => ({
                ...prev,
                [noteId]: { ...prev[noteId], x: mv.clientX - ox, y: mv.clientY - oy }
            }));
        };

        const handleMouseUp = () => {
            dragDataRef.current.isDragging = false;
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };
    const handleStartListeningClick = () => {
        setShowListeningStart(false); setIsAudioPlaying(true);
        if (audioRef.current) audioRef.current.play().catch(err => {
            // play() that bai (autoplay bi chan / file loi): phai bao hoc vien va tra co
            // isAudioPlaying ve false de timer khong chay khi chua co tieng
            console.error(err);
            setIsAudioPlaying(false);
            toast.error("❌ Không phát được audio. Em hãy bấm lại nút bắt đầu, nếu vẫn lỗi hãy báo giáo viên.", { autoClose: 8000 });
            setShowListeningStart(true);
        });
    };

    // Cham 1 task bang AI - dung chung prompt va cach tinh band voi trang Writing rieng le
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
            // Band = trung binh 4 tieu chi, lam tron 0.5
            const scores = [cr[taskCriterion]?.score || 0, cr.CC?.score || 0, cr.LR?.score || 0, cr.GRA?.score || 0];
            const avg = scores.reduce((a, b) => a + b, 0) / 4;
            scoreData.band = (Math.round(avg * 2) / 2).toString();
            if (taskKey === 'task1' && cr.TR) { cr.TA = cr.TR; delete cr.TR; }
            if (taskKey === 'task2' && cr.TA) { cr.TR = cr.TA; delete cr.TA; }
            return scoreData;
        } catch (e) { toast.error(`Chi tiết lỗi ${taskKey}: ${e.message}`); return null; }
    };

    // Cham ca 2 task Writing trong Mock Test (truoc day la ham gia chi hien toast)
    const handleUnifiedGrading = async () => {
        const t1 = answersRef.current['writing_task1'] || "";
        const t2 = answersRef.current['writing_task2'] || "";
        const w = testData?.sections?.writing || {};
        const hasT1 = w.task1 && t1.length > 20;
        const hasT2 = w.task2 && t2.length > 20;
        if (!hasT1 && !hasT2) { toast.warning("⚠️ Bài làm quá ngắn để chấm điểm."); return; }

        setIsGrading(true); toast.info("🤖 AI đang chấm điểm bài Writing của bạn...");
        try {
            let isSuccess = false;
            if (hasT1) {
                const res1 = await gradeSingleTask('task1', t1, w.task1.prompt || w.task1.content || "");
                if (res1) { setAiResultTask1(res1); isSuccess = true; }
            }
            // Nghi 2.5s giua 2 task de tranh gioi han toc do cua Gemini
            if (hasT1 && hasT2) { await new Promise(r => setTimeout(r, 2500)); }
            if (hasT2) {
                const res2 = await gradeSingleTask('task2', t2, w.task2.prompt || w.task2.content || "");
                if (res2) { setAiResultTask2(res2); isSuccess = true; }
            }
            if (isSuccess) { toast.success("✅ Đã hoàn tất chấm điểm! Kết quả chi tiết sẽ có trong email khi nộp bài."); }
            else { toast.error("❌ Hệ thống chấm điểm thất bại."); }
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

    const handleReportBug = async () => {
        if (isSendingBug) return; // dang gui do, bo qua lan bam them
        if (!bugNote.trim()) {
            toast.warning("⚠️ Vui lòng nhập chi tiết lỗi bạn gặp phải!");
            return;
        }
        setIsSendingBug(true);
        try {
            // Báo lỗi qua Function (gộp bugNotes + set status server-side); client không ghi thẳng mockTests nữa.
            await reportTestBug('mockTests', testId, bugNote.trim(), skill);
            toast.success("🐞 Đã ghi nhận lỗi! Đề thi đã bị ẩn khỏi Review Hub. Bạn hãy tiếp tục test các phần khác nhé.");
            setShowBugModal(false);
            setBugNote('');
        } catch (error) {
            toast.error("❌ Lỗi khi gửi báo cáo: " + error.message);
        } finally {
            setIsSendingBug(false);
        }
    };

    useEffect(() => {
        const fetchTestDetailsAndDrafts = async () => {
            const studentId = localStorage.getItem("currentStudentId") || "Guest";
            try {
                const dbRef = ref(db);
                const snapshot = await get(child(dbRef, `mockTests/${testId}`));
                let fetchedTestData = null;
                
                if (snapshot.exists()) {
                    fetchedTestData = snapshot.val();
                    setTestData(fetchedTestData);
                } else {
                    setTestData(null);
                    setLoadingData(false); 
                    return; 
                }

                if (fetchedTestData && fetchedTestData.sections && fetchedTestData.sections[skill]) {
                    const localAns = localStorage.getItem(saveKey);
                    const localTime = localStorage.getItem(`ielts_time_${testId}_${skill}`);
                    const defaultTime = fetchedTestData.sections[skill].timeLimit || (skill === 'listening' ? 30*60 : 60*60);
                    
                    if (localAns && localTime) {
                        try {
                            setAnswers(JSON.parse(localAns));
                        } catch(e) {
                            setAnswers({});
                        }
                        setTimeLeft(parseInt(localTime, 10));
                        setIsRestored(true);
                    } else if (studentId !== "Guest") {
                        const draftSnap = await get(child(dbRef, `drafts/${studentId}/mock/${testId}_${skill}`));
                        if (draftSnap.exists()) {
                            const draftData = draftSnap.val();
                            setAnswers(draftData.answers || {});
                            setTimeLeft(draftData.timeLeft || defaultTime);
                            
                            localStorage.setItem(saveKey, JSON.stringify(draftData.answers || {}));
                            localStorage.setItem(`ielts_time_${testId}_${skill}`, (draftData.timeLeft || defaultTime).toString());
                        } else {
                            setTimeLeft(defaultTime);
                        }
                        setIsRestored(true);
                    } else {
                        setTimeLeft(defaultTime);
                        setIsRestored(false); 
                    }
                } else {
                    setTimeLeft(60*60);
                    setIsRestored(false);
                }

            } catch (error) {
                console.error("Lỗi tải đề/khôi phục:", error);
                toast.error("Không thể kết nối tải dữ liệu.");
            } finally {
                setLoadingData(false);
            }
        };

        fetchTestDetailsAndDrafts();
    }, [testId, skill, saveKey]);

    useEffect(() => {
        if (!loadingData && isRestored && !isSubmitted) localStorage.setItem(saveKey, JSON.stringify(answers));
    }, [answers, saveKey, loadingData, isRestored, isSubmitted]);

    useEffect(() => {
        if (!loadingData && isRestored && timeLeft > 0 && !isSubmitted) localStorage.setItem(`ielts_time_${testId}_${skill}`, timeLeft.toString());
    }, [timeLeft, testId, skill, loadingData, isRestored, isSubmitted]);

    useEffect(() => {
        const sId = localStorage.getItem("currentStudentId");
        if (!sId || sId === "Guest" || loadingData || !isRestored || timeLeft <= 0 || isSubmitted) return;

        const saveToCloud = async () => {
            try {
                await update(ref(db, `drafts/${sId}/mock/${testId}_${skill}`), {
                    answers: answersRef.current, timeLeft: timeLeftRef.current, updatedAt: new Date().toISOString()
                });
                console.log(`☁️ Backup Cloud Mock Test: ${skill}`);
            } catch (err) { console.error("Lỗi lưu nháp Cloud:", err); }
        };

        saveToCloud(); 
        const autoSaveInterval = setInterval(saveToCloud, 5000); 
        return () => clearInterval(autoSaveInterval);
    }, [loadingData, isRestored, testId, skill, isSubmitted]);

    // 👉 4. TIMER ĐẾM NGƯỢC THỜI GIAN
    useEffect(() => {
        let timer = null;
        const needsAudioPlay = skill === 'listening';
        
        // Nếu là Listening thì chờ ấn chạy audio, nếu Reading/Writing thì dựa vào isTestStarted
        const canTick = needsAudioPlay ? isAudioPlaying : isTestStarted;

        // Chỉ đếm ngược khi thỏa mãn: được phép chạy + còn thời gian + tải xong + chưa nộp bài
        if (canTick && timeLeft > 0 && !loadingData && !showResult && !isSubmitted) {
            timer = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) { 
                        clearInterval(timer); 
                        if (!isSubmitted) handleSubmitAuto(); 
                        return 0; 
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [isTestStarted, isAudioPlaying, timeLeft, loadingData, skill, showResult, isSubmitted]);

    const handleInputChange = (qNum, value) => {
        setAnswers(prev => ({ ...prev, [qNum]: value }));
    };

    const saveToHistory = async (type, scoreOrBand, totalQuestions = 0, extra = {}) => {
        const studentId = localStorage.getItem("currentStudentId") || "Guest";
        const studentName = localStorage.getItem("currentStudentName") || "Học viên";

        const record = {
            id: Date.now(),
            type: type,
            date: new Date().toISOString(),
            studentId,
            studentName,
            testId: testId,
            testName: testData?.testName || "Full Mock Test",
            skill: skill.toUpperCase()
        };

        if (skill === 'writing') {
            record.band = scoreOrBand;
            record.t1Band = extra.t1Band;
            record.t2Band = extra.t2Band;
        } else {
            record.score = scoreOrBand;
            record.total = totalQuestions;
        }

        if (studentId === "Guest") {
            const history = JSON.parse(localStorage.getItem("ielts_history") || "[]");
            history.push(record);
            localStorage.setItem("ielts_history", JSON.stringify(history));
        } else {
            try {
                await set(push(ref(db, `history/${studentId}`)), record);
            } catch (error) {
                console.error("Lỗi Firebase:", error);
                const history = JSON.parse(localStorage.getItem("ielts_history") || "[]");
                history.push(record);
                localStorage.setItem("ielts_history", JSON.stringify(history));
            }
        }
    };

    const sendEmailReport = (score, total, type, detailedLog = "") => {
        const sName = localStorage.getItem("currentStudentName");
        const sId = localStorage.getItem("currentStudentId");
        const displayName = sName ? `${sName} (ID: ${sId})` : (sId || "Guest Candidate");

        const currentAnswers = answersRef.current;
        const currentTimeLeft = timeLeftRef.current;
        
        const diffSeconds = initialTime - currentTimeLeft;
        const mTaken = Math.floor(diffSeconds / 60);
        const sTaken = diffSeconds % 60;
        const timeTaken = `${mTaken}m ${sTaken}s`;

        const now = new Date().toLocaleString('vi-VN');
        let templateParams = {}; let templateId = "";

        // 👉 Mã đề mock test = testId trên URL (vd: cam14_test1); fallback theo testName
        // Viết hoa ký tự đầu cho đẹp (vd: mt3 -> Mt3)
        const rawMockCode = testId || testData?.testName || "N/A";
        const mockTestCode = rawMockCode.charAt(0).toUpperCase() + rawMockCode.slice(1);

        if (type === 'lr') {
            templateId = EMAIL_TEMPLATE_LR;
            templateParams = { test_name: skill.toUpperCase() + cheatTitleSuffix(), test_code: mockTestCode, student_name: displayName, score: score, total: total, time_taken: timeTaken, submission_time: now, detailed_answers: buildCheatReportHTML() + detailedLog };
        } else {
            templateId = EMAIL_TEMPLATE_WRITING;
            let overallText = "Chấm sau";
            if (aiResultTask1 && aiResultTask2) {
                const band1 = parseFloat(aiResultTask1.band || 0); const band2 = parseFloat(aiResultTask2.band || 0);
                overallText = ((band1 + band2 * 2) / 3).toFixed(1);
            } else if (aiResultTask1 || aiResultTask2) { overallText = (aiResultTask1?.band || aiResultTask2?.band) + " (Partial)"; }

            // 👉 Mã đề writing trong full mock = mã đề mock
            templateParams = {
                student_name: displayName, test_code: mockTestCode, overall_score: overallText, time_taken: timeTaken, submission_time: now,
                task1_content: currentAnswers['writing_task1'] || "(No submission)", task1_feedback: buildCheatReportHTML() + generateWritingFeedbackHTML(aiResultTask1, 'task1'),
                task2_content: currentAnswers['writing_task2'] || "(No submission)", task2_feedback: generateWritingFeedbackHTML(aiResultTask2, 'task2')
            };
        }
        
        // Xóa nháp ở Local Storage
        localStorage.removeItem(`ielts_save_${testId}_${skill}`);
        localStorage.removeItem(`ielts_time_${testId}_${skill}`);
        
        // Xóa nháp trên Firebase Cloud
        if (sId && sId !== "Guest") {
            update(ref(db, `drafts/${sId}/mock`), { [`${testId}_${skill}`]: null }).catch(e => console.error(e));
        }

        // Gửi Email
        emailjs.send(EMAIL_SERVICE_ID, templateId, templateParams)
            .then(() => {
                console.log("Email sent successfully!");
            })
            .catch((error) => {
                console.error("Email failed:", error);
                toast.warning("Bài thi đã nộp nhưng hệ thống gửi email đang bận!");
            });
        }; 

    const handleSubmitAuto = () => {
        if (skill === 'writing') {
            handleSubmitWriting();
        } else {
            handleSubmitLR();
        }
    };

    const handleSubmitLR = async () => {
        if (submitLockRef.current) return;
        submitLockRef.current = true;
        let score = 0;
        const validQuestions = flatQuestions.filter(q => q.qNum);
        let total = validQuestions.length;

        validQuestions.forEach(item => {
            const u = (answersRef.current[item.qNum] || "").trim().toLowerCase();
            if (item.answer === undefined || item.answer === null) return;
            const c = Array.isArray(item.answer) ? item.answer : [item.answer];
            if (c.some(ans => ans && ans.toString().toLowerCase() === u)) score++;
        });

        // 👇 Đã cập nhật để truyền đủ danh sách câu hỏi và đáp án vào hàm tạo Bảng Mail
        const logHtml = generateDetailedLog(score, total, validQuestions, answersRef.current);

        setIsSubmitted(true);
        setResultData({ score, total });
        setShowResult(true);

        await saveToHistory('mock_test', score, total);

        sendEmailReport(score, total, 'lr', logHtml);
        toast.success("🎉 Nộp bài thành công!", { autoClose: 6000 });
    };

    const handleSubmitWriting = async () => {
        if (submitLockRef.current) return;
        submitLockRef.current = true;
        setIsSubmitted(true);
        setShowResult(true);

        let overallBand = "N/A";
        let t1Band = aiResultTask1 ? aiResultTask1.band : "N/A";
        let t2Band = aiResultTask2 ? aiResultTask2.band : "N/A";

        if (aiResultTask1 && aiResultTask2) {
            const b1 = parseFloat(aiResultTask1.band || 0);
            const b2 = parseFloat(aiResultTask2.band || 0);
            overallBand = ((b1 + b2 * 2) / 3).toFixed(1);
        } else if (aiResultTask1 || aiResultTask2) {
            overallBand = (aiResultTask1?.band || aiResultTask2?.band) + " (Partial)";
        }

        await saveToHistory('mock_test', `${overallBand}`, 0, { t1Band, t2Band });

        sendEmailReport(0, 0, 'writing');
        toast.success("📝 Bài Writing đã nộp.", { autoClose: 6000 });
    };

    const handleRealSubmitFromModal = () => {
        setShowConfirmModal(false);
        skill === 'writing' ? handleSubmitWriting() : handleSubmitLR();
    };

    useEffect(() => {
        const handleContextMenu = (e) => {
            const targetArea = e.target.closest('.reading-left-pane, .reading-right-pane, .questions-area');
            if (!targetArea) return;

            e.preventDefault();
            const sel = window.getSelection();
            const range = sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
            let type = 'none';
            const targetNote = e.target.closest('.note-attached');

            const highlightedElement = isInsideHighlight(e.target);

            if (targetNote) {
                type = 'note-context';
                currentNoteId.current = targetNote.id;
            }
            else if (range && !sel.isCollapsed && range.toString().trim().length > 0) {
                type = 'selection';
                savedRange.current = range.cloneRange();
            }
            else if (highlightedElement) {
                type = 'highlight-context';
                const newRange = document.createRange();
                newRange.selectNode(highlightedElement);
                savedRange.current = newRange;
            }
            else {
                setContextMenu({ visible: false, x: 0, y: 0, type: 'none' });
                return;
            }
            setContextMenu({ visible: true, x: e.clientX, y: e.clientY, type });
        };
        const handleClick = () => { if (contextMenu.visible) setContextMenu({ ...contextMenu, visible: false }); };

        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('click', handleClick);

        return () => {
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('click', handleClick);
        };
    }, [skill, contextMenu.visible]);

    const isInsideHighlight = (node) => {
        let current = node.nodeType === 3 ? node.parentNode : node;
        while (current && current !== document.body) {
            if (current.nodeType === 1) {
                const bgColor = window.getComputedStyle(current).backgroundColor;
                if (bgColor === 'rgb(255, 255, 0)' || bgColor === 'rgba(255, 255, 0, 1)' || bgColor === '#ffff00' || bgColor === 'yellow') {
                    return current;
                }
            }
            current = current.parentNode;
        }
        return null;
    };

    const doHighlight = () => { if (!savedRange.current) return; const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(savedRange.current); document.designMode = "on"; if (!document.execCommand("hiliteColor", false, "#ffff00")) document.execCommand("backColor", false, "#ffff00"); document.designMode = "off"; sel.removeAllRanges(); setContextMenu({ ...contextMenu, visible: false }); };
    const doClearHighlight = () => { if (!savedRange.current) return; const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(savedRange.current); document.designMode = "on"; if (!document.execCommand("hiliteColor", false, "transparent")) { document.execCommand("backColor", false, "transparent"); } document.designMode = "off"; sel.removeAllRanges(); setContextMenu({ ...contextMenu, visible: false }); };
    const doAddNote = () => { if (!savedRange.current) return; const noteId = 'note-' + Date.now(); const span = document.createElement('span'); span.className = 'note-attached'; span.id = noteId; try { savedRange.current.surroundContents(span); } catch (e) { toast.info("💡 Vui lòng chỉ chọn văn bản trong cùng một đoạn văn để thêm ghi chú."); return; } setNotes(prev => ({ ...prev, [noteId]: { content: '', isOpen: true, x: contextMenu.x, y: contextMenu.y } })); window.getSelection().removeAllRanges(); setContextMenu({ ...contextMenu, visible: false }); };
    const doDeleteNote = () => { if (!currentNoteId.current) return; const id = currentNoteId.current; const span = document.getElementById(id); if (span) { const parent = span.parentNode; while (span.firstChild) parent.insertBefore(span.firstChild, span); parent.removeChild(span); } const newNotes = { ...notes }; delete newNotes[id]; setNotes(newNotes); setContextMenu({ ...contextMenu, visible: false }); };
    const handleNoteInteraction = (e) => { const target = e.target.closest('.note-attached'); if (target) { const id = target.id; if (e.type === 'mouseover') { if (notes[id] && notes[id].content && !notes[id].isOpen) { setTooltip({ visible: true, content: notes[id].content, x: e.clientX, y: e.clientY }); } } else if (e.type === 'mouseout') { setTooltip(prev => ({ ...prev, visible: false })); } else if (e.type === 'click') { setNotes(prev => ({ ...prev, [id]: { ...prev[id], isOpen: true, x: e.clientX, y: e.clientY } })); setTooltip(prev => ({ ...prev, visible: false })); } } };

    const readingPassageRender = useMemo(() => {
        if (skill !== 'reading' || !testData) return null;
        return <div className="reading-left-pane" onClick={handleNoteInteraction} onMouseOver={handleNoteInteraction} onMouseOut={handleNoteInteraction}>{renderHTML(testData?.sections?.reading?.passage)}</div>;
    }, [skill, testData?.sections?.reading?.passage]);

    const renderStructuredQuestion = (part) => {
        const cleanText = (text, qNum) => { if (!text) return ""; const strNum = String(qNum); const regex = new RegExp(`^${strNum}([.\\s\\)]+|$)`); if (regex.test(text.trim())) { return text.trim().replace(regex, '').trim(); } return text; };

        if (part.type === 'matching' || part.type === 'matching_headings' || part.type === 'matching_info') {
            return (
                <div>
                    {part.options && <div style={{ background: '#f9f9f9', padding: '10px', marginBottom: '15px', fontWeight: 'bold', border: '1px solid #eee', fontSize: '0.95rem' }} dangerouslySetInnerHTML={{ __html: part.options.join('<br>') }} />}
                    {part.items.map(item => (
                        <div key={item.qNum} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '25px', gap: '12px' }}>
                            <strong style={{ flexShrink: 0, marginTop: '2px', fontSize: '1.05rem', color: 'black' }}>{item.qNum}.</strong>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', minWidth: 0 }}>
                                <span style={{ lineHeight: '1.6' }}>{item.text}</span>
                                <select className="gap-select" style={{ width: 'fit-content', maxWidth: '100%', margin: '0', padding: '8px 15px', cursor: 'pointer' }} value={answers[item.qNum] || ""} onChange={(e) => handleInputChange(item.qNum, e.target.value)}>
                                    <option value="">---  ---</option>
                                    {part.options.map((opt, idx) => {
                                        const optVal = opt.split('.')[0].trim();
                                        return <option key={idx} value={optVal}>{opt}</option>;
                                    })}
                                </select>
                            </div>
                        </div>
                    ))}
                </div>
            );
        }

        if (part.type === 'mcq_single' || part.type === 'mcq_multi' || part.type === 'mcq') {
            return (
                <div>
                    {part.items.map(item => {
                        const qDisplay = item.qNum || item.qNums?.join(', ');
                        const navId = item.qNum || item.qNums?.[0];
                        const currentOptions = item.options || part.options || [];
                        const handleMultiChange = (val) => {
                            if (!item.qNums) return;
                            let currentSelected = item.qNums.map(q => answers[q]).filter(Boolean);
                            if (currentSelected.includes(val)) { currentSelected = currentSelected.filter(v => v !== val); }
                            else { if (currentSelected.length < item.qNums.length) { currentSelected.push(val); } }
                            const newAnswers = { ...answers };
                            item.qNums.forEach(q => delete newAnswers[q]);
                            currentSelected.sort().forEach((ans, idx) => { newAnswers[item.qNums[idx]] = ans; });
                            setAnswers(newAnswers);
                        };
                        return (
                            <div key={qDisplay} style={{ marginBottom: '25px' }}>
                                <div style={{ marginBottom: '10px', color: 'inherit', fontWeight: '700', fontSize: '1rem' }} id={`nav-q-${navId}`}>
                                    <span>{qDisplay}. </span>
                                    <span>{cleanText(part.stem || item.text || "Choose the correct answer:", qDisplay)}</span>
                                </div>
                                <div style={{ marginLeft: '20px' }}>
                                    {currentOptions.map(opt => {
                                        const val = opt.split('.')[0].trim();
                                        let isChecked = false;
                                        if (part.type === 'mcq_multi' && item.qNums) { const selectedValues = item.qNums.map(q => answers[q]); isChecked = selectedValues.includes(val); }
                                        else { isChecked = answers[item.qNum] === val; }
                                        return (
                                            <label key={val} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '8px', cursor: 'pointer', padding: '6px', borderRadius: '4px', transition: '0.2s', background: isChecked ? '#E8F4EC' : 'transparent' }}>
                                                <input type={part.type === 'mcq_multi' ? 'checkbox' : 'radio'} name={part.type === 'mcq_multi' ? `group-${navId}` : `q-${item.qNum}`} value={val} checked={isChecked} onChange={() => { if (part.type === 'mcq_multi') { handleMultiChange(val); } else { handleInputChange(item.qNum, val); } }} style={{ marginTop: '4px', marginRight: '10px', transform: 'scale(1.2)', flexShrink: 0 }} />
                                                <span style={{ lineHeight: '1.4' }}>{opt}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            );
        }

        if (part.type === 'tfng' || part.type === 'ynng') {
            const options = part.type === 'tfng' ? ['TRUE', 'FALSE', 'NOT GIVEN'] : ['YES', 'NO', 'NOT GIVEN'];
            return (
                <div>
                    <div style={{ marginBottom: '15px', fontStyle: 'italic', color: '#666', fontSize: '0.9rem' }}>Select one option for each statement:</div>
                    {part.items.map(item => (
                        <div key={item.qNum} style={{ marginBottom: '20px', borderBottom: '1px dashed #eee', paddingBottom: '15px' }}>
                            <div style={{ marginBottom: '10px', fontSize: '1rem', color: 'inherit', lineHeight: '1.6' }} id={`nav-q-${item.qNum}`}>
                                <strong style={{ color: 'black', marginRight: '5px' }}>{item.qNum}.</strong>
                                <span>{cleanText(item.text, item.qNum)}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '15px', marginLeft: '20px', flexWrap: 'wrap' }}>
                                {options.map(opt => (
                                    <label key={opt} style={{ cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', background: answers[item.qNum] === opt ? '#E8F4EC' : '#f5f5f5', padding: '6px 12px', borderRadius: '20px', border: answers[item.qNum] === opt ? '1px solid #3D8B47' : '1px solid #ddd', transition: '0.2s' }}>
                                        <input type="radio" name={`q-${item.qNum}`} value={opt} checked={answers[item.qNum] === opt} onChange={() => handleInputChange(item.qNum, opt)} style={{ marginRight: '6px', transform: 'scale(1.1)' }} />
                                        {opt}
                                    </label>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            );
        }

        if (part.type === 'labelling_grid') {
            const opts = part.options || ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
            return (
                <div>
                    {part.image && (<div style={{ marginBottom: '25px', textAlign: 'center' }}> <img src={part.image} alt="Map Labeling" style={{ maxWidth: '100%', maxHeight: '500px', border: '1px solid #ddd', borderRadius: '4px', padding: '5px' }} /> </div>)}
                    <div style={{ overflowX: 'auto', border: '1px solid #eee', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
                            <thead style={{ background: '#f5f7fa', borderBottom: '2px solid #e1e4e8' }}>
                                <tr>
                                    <th style={{ padding: '12px 15px', textAlign: 'left', color: '#2B6830', fontWeight: '800' }}>Question</th>
                                    {opts.map(opt => (<th key={opt} style={{ padding: '12px 5px', textAlign: 'center', color: '#2B6830', fontWeight: '800', width: '40px' }}>{opt}</th>))}
                                </tr>
                            </thead>
                            <tbody>
                                {part.items.map((item, index) => (
                                    <tr key={item.qNum} style={{ borderBottom: '1px solid #eee', backgroundColor: index % 2 === 0 ? '#fff' : '#fafafa' }} id={`nav-q-${item.qNum}`}>
                                        <td style={{ padding: '12px 15px', fontWeight: '600', color: '#333' }}> <strong style={{ marginRight: '8px' }}>{item.qNum}</strong> {cleanText(item.text, item.qNum)} </td>
                                        {opts.map(opt => (<td key={opt} style={{ textAlign: 'center', padding: '10px' }}> <input type="radio" name={`q-${item.qNum}`} value={opt} checked={answers[item.qNum] === opt} onChange={() => handleInputChange(item.qNum, opt)} style={{ cursor: 'pointer', width: '18px', height: '18px', accentColor: '#2B6830' }} /> </td>))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
        }
        return <div style={{ color: 'red' }}>Unsupported Question Type: {part.type}</div>;
    };

    if (loadingData) {
        return (
            <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F2F8F4', color: '#2B6830', position: 'fixed', top: 0, left: 0, zIndex: 9999 }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '3.5rem', marginBottom: '20px' }}></i>
                <h2 style={{ margin: 0 }}>Đang chuẩn bị đề thi...</h2>
                <p style={{ color: '#666', marginTop: '10px' }}>Vui lòng chờ trong giây lát</p>
            </div>
        );
    }

    if (!testData) {
        return (
            <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F2F8F4' }}>
                <i className="fa-regular fa-face-frown" style={{ fontSize: '4rem', color: '#ef4444', marginBottom: '20px' }}></i>
                <h2 style={{ color: '#2B6830' }}>❌ Không tìm thấy đề thi!</h2>
                <button onClick={() => navigate('/dashboard')} style={{ background: '#2B6830', color: 'white', padding: '10px 20px', borderRadius: '6px', border: 'none', cursor: 'pointer', marginTop: '15px' }}>Quay lại Trang chủ</button>
            </div>
        );
    }

    if (showResult) {
        return (
            <div className="result-screen scrollable">
                <h2 style={{ fontSize: '2.5rem', marginBottom: '10px', color: '#2B6830' }}>Test Finished</h2>
                <h3 style={{ margin: '0 0 20px 0', color: '#666', fontWeight: 'normal' }}>Student ID: <strong>{getStudentId()}</strong></h3>

                {skill !== 'writing' && (
                    <>
                        <div className="result-score" style={{ fontSize: '4.5rem', color: '#28a745', marginBottom: '10px', textShadow: '2px 2px 4px rgba(0,0,0,0.1)' }}>
                            {resultData.score} <span style={{ fontSize: '2.5rem', color: '#ccc' }}>/ {resultData.total}</span>
                        </div>

                        <div className="detailed-result-container">
                            <h3 style={{ color: '#2B6830', margin: '0 0 20px 0', borderBottom: '2px solid #eee', paddingBottom: '15px' }}>
                                <i className="fa-solid fa-chart-pie"></i> Detailed Results
                            </h3>

                            <div className="result-grid">
                                {flatQuestions.filter(q => q.qNum).map((item) => {
                                    const userAns = (answers[item.qNum] || "").trim();
                                    let isCorrect = false;
                                    let correctDisplay = "";

                                    if (item.answer) {
                                        const correctArr = Array.isArray(item.answer) ? item.answer : [item.answer];
                                        isCorrect = correctArr.some(ans => ans && ans.toString().toLowerCase() === userAns.toLowerCase());
                                        correctDisplay = correctArr.join(" / ");
                                    }

                                    return (
                                        <div key={item.qNum} className={`result-item ${isCorrect ? 'correct' : 'wrong'}`}>
                                            <div className="result-item-header">
                                                <span>Question {item.qNum}</span>
                                                <span>{isCorrect ? '✅' : '❌'}</span>
                                            </div>
                                            <div className="result-item-ans" style={{ color: isCorrect ? '#155724' : '#d32f2f' }}>
                                                {userAns === "" ? <em style={{ color: '#999', fontWeight: 'normal' }}>(trống)</em> : userAns}
                                            </div>
                                            {!isCorrect && item.answer && (
                                                <div className="result-correct-ans">
                                                    <strong>Key:</strong> {correctDisplay}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </>
                )}

                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', margin: '30px auto' }}>
                    <button 
                        className="btn-home" 
                        style={{ margin: 0 }} 
                        onClick={() => {
                            if (location.state?.fromMenu) {
                                // Nếu đi từ Menu vào -> Lùi lại 1 bước để xóa sạch trang Làm bài khỏi lịch sử
                                navigate(-1);
                            } else {
                                // Nếu đi từ chỗ khác (Ví dụ: bấm Tiếp tục từ Trang chủ) -> Ghi đè lịch sử bằng trang Menu
                                navigate(`/test-menu/${testId}`, { replace: true });
                            }
                        }}
                    >
                        <i className="fa-solid fa-house"></i> Home
                    </button>

                    {userRole === 'private' && (
                        <button 
                            onClick={() => setShowBugModal(true)}
                            style={{
                                background: '#ef4444', color: 'white', border: 'none',
                                borderRadius: '30px', padding: '0 30px', fontWeight: 'bold', fontSize: '1.2rem',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                            }}
                        >
                            <i className="fa-solid fa-bug"></i> BÁO LỖI ĐÁP ÁN
                        </button>
                    )}
                </div>

                {userRole === 'private' && showBugModal && (
                    <div className="modal-overlay" onClick={() => setShowBugModal(false)} style={{ zIndex: 9999, position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}>
                        <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px', padding: '30px', background: 'white', borderRadius: '12px' }}>
                            <button className="close-modal" onClick={() => setShowBugModal(false)} style={{ border: 'none', background: 'transparent', fontSize: '1.5rem', float: 'right', cursor: 'pointer' }}>×</button>
                            <h2 style={{ color: '#ef4444', marginTop: 0, borderBottom: '2px solid #fee2e2', paddingBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <i className="fa-solid fa-bug"></i> BÁO LỖI SAI ĐÁP ÁN
                            </h2>
                            <p style={{ color: '#64748b', fontSize: '1rem', marginBottom: '20px', lineHeight: '1.6' }}>
                                Hệ thống sẽ cập nhật trạng thái đề thành <strong>Reported</strong>. Ghi chú lỗi sẽ giúp đội Lập trình cập nhật lại Key chuẩn.
                            </p>
                            <textarea
                                value={bugNote}
                                onChange={(e) => setBugNote(e.target.value)}
                                placeholder="VD: Câu 14 đáp án phải là TRUE chứ không phải FALSE..."
                                style={{
                                    width: '100%', height: '150px', padding: '15px', borderRadius: '8px',
                                    border: '1px solid #cbd5e1', resize: 'vertical', fontFamily: 'inherit',
                                    marginBottom: '20px', fontSize: '1rem', lineHeight: '1.6', background: '#f8fafc'
                                }}
                                autoFocus
                            />
                            <button
                                onClick={handleReportBug}
                                disabled={isSendingBug}
                                style={{ width: '100%', background: '#ef4444', color: 'white', border: 'none', padding: '15px', borderRadius: '8px', fontWeight: 'bold', cursor: isSendingBug ? 'wait' : 'pointer', fontSize: '1.1rem', opacity: isSendingBug ? 0.6 : 1 }}
                            >
                                <i className="fa-solid fa-paper-plane"></i> {isSendingBug ? 'ĐANG GỬI...' : 'BÁO CÁO LỖI NÀY'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="test-page-layout">
            <FullscreenGuard />
            <AntiCheatGuard active={!isSubmitted && !showResult && !loadingData} testId={testId} onForceSubmit={handleSubmitAuto} />
            <ToastContainer position="bottom-right" autoClose={3000} theme="colored" style={{ zIndex: 999999 }} />

            {contextMenu.visible && (
                <div className="ctx-menu" style={{ top: contextMenu.y, left: contextMenu.x, display: 'block' }}>
                    {contextMenu.type === 'selection' && (<><div className="ctx-menu-item" onClick={doHighlight}><i className="fa-solid fa-highlighter" style={{ color: '#d4b106' }}></i> Highlight</div><div className="ctx-menu-item" onClick={doAddNote}><i className="fa-solid fa-sticky-note" style={{ color: '#f57c00' }}></i> Add Note</div></>)}
                    {contextMenu.type === 'highlight-context' && (<div className="ctx-menu-item" onClick={doClearHighlight}><i className="fa-solid fa-eraser" style={{ color: '#666' }}></i> Clear Highlight</div>)}
                    {contextMenu.type === 'note-context' && (<div className="ctx-menu-item" onClick={doDeleteNote} style={{ color: 'red' }}><i className="fa-solid fa-trash"></i> Delete Note</div>)}
                </div>
            )}
            {tooltip.visible && <div className="note-tooltip" style={{ display: 'block', top: tooltip.y + 15, left: tooltip.x + 15 }}>{tooltip.content}</div>}

            {Object.entries(notes).map(([id, note]) => (
                note.isOpen && (
                    <div key={id} className="note-popup" style={{ top: note.y, left: note.x, position: 'fixed', zIndex: 1000 }}>
                        <div className="note-header" onMouseDown={(e) => handleNoteDragStart(e, id)} style={{ cursor: 'grab', userSelect: 'none' }}>
                            <span>Note</span><span className="note-close" onMouseDown={(e) => e.stopPropagation()} onClick={() => setNotes(prev => ({ ...prev, [id]: { ...prev[id], isOpen: false } }))}>×</span>
                        </div>
                        <textarea className="note-textarea" placeholder="Type your note here..." value={note.content} onKeyDown={(e) => e.stopPropagation()} onChange={(e) => setNotes(prev => ({ ...prev, [id]: { ...prev[id], content: e.target.value } }))} />
                    </div>
                )
            ))}

            <div className="test-header">
                <div className="header-left"><img src="/images/logo.png" alt="Logo" className="test-logo" /></div>
                <div className="header-center"><div className="timer-box"><i className="fa-regular fa-clock"></i> {formatTime(timeLeft)}</div></div>
                
                {/* KHONG dat gap inline o day: inline se de len rule mobile .header-right { gap: 8px } trong App.css */}
                <div className="header-right">
                    {userRole === 'private' && (
                        <button
                            className="btn-report-header"
                            onClick={() => setShowBugModal(true)}
                        >
                            <i className="fa-solid fa-bug"></i> <span>BÁO LỖI ĐỀ</span>
                        </button>
                    )}

                    {skill === 'writing' && (
                        <button className="btn-ai-header" onClick={handleUnifiedGrading} disabled={isGrading}>
                            {/* Chu nam trong span de rule mobile .btn-ai-header span { display: none } an duoc */}
                            <i className="fa-solid fa-wand-magic-sparkles"></i> <span>{isGrading ? 'Grading...' : 'AI Grade'}</span>
                        </button>
                    )}
                    <button className="submit-btn" onClick={() => setShowConfirmModal(true)}>
                        {skill === 'writing' ? 'SUBMIT WRITING' : 'SUBMIT TEST'}
                    </button>
                </div>
            </div>

            <div className="test-main-content">
                {skill === 'listening' && (
                    <div className="listening-container">
                        <audio
                            ref={audioRef}
                            src={_localAudioMap[testId] || testData?.sections?.listening?.audioSrc}
                            style={{ display: 'none' }}
                            preload="auto"
                            onPlaying={() => setIsAudioPlaying(true)}
                            onWaiting={() => setIsAudioPlaying(false)}
                            onPause={() => setIsAudioPlaying(false)}
                            onError={(e) => {
                                // Audio hong ma im lang thi hoc vien ngoi cho vo ich trong khi dong ho chay
                                console.error('[Audio Error]', e.target.error, 'src:', e.target.src);
                                setIsAudioPlaying(false);
                                toast.error("❌ File nghe bị lỗi, không tải được. Em hãy báo giáo viên để kiểm tra đề.", { autoClose: false });
                            }}
                        />
                        {showListeningStart && (
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(255,255,255,0.98)', zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}>
                                <i className="fa-solid fa-headphones" style={{ fontSize: '4.5rem', color: '#2B6830', marginBottom: '20px' }}></i>
                                <h2 style={{ color: '#2B6830', marginBottom: '10px', fontSize: '2rem' }}>BÀI THI LISTENING</h2>
                                <p style={{ color: '#666', marginBottom: '30px', fontSize: '1.1rem' }}>Nhấn nút bên dưới để mở đề, phát audio và tính giờ.</p>
                                <button 
                                    onClick={handleStartListeningClick} 
                                    style={{ background: '#2B6830', color: 'white', padding: '15px 40px', fontSize: '1.2rem', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', transition: '0.2s' }} 
                                    onMouseOver={e => { e.currentTarget.style.background = '#1E5225'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                                    onMouseOut={e => { e.currentTarget.style.background = '#2B6830'; e.currentTarget.style.transform = 'scale(1)'; }}
                                >
                                    BẮT ĐẦU NGHE & LÀM BÀI
                                </button>
                            </div>
                        )}
                        <div className="questions-area" onClick={handleNoteInteraction} onMouseOver={handleNoteInteraction} onMouseOut={handleNoteInteraction}>
                            {renderHTML(testData?.sections?.listening?.passage || "")}
                            {testData?.sections?.listening?.questions?.map((part, i) => (
                                <div key={i} className="question-part">
                                    <h3>{part.title}</h3>
                                    {part.instruction && <p style={{ fontStyle: 'italic', color: '#555', marginBottom: '15px' }}>{renderHTML(part.instruction)}</p>}
                                    <div className="content-box">{part.htmlContent ? renderHTML(part.htmlContent) : renderStructuredQuestion(part)}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {skill === 'reading' && (
                    <div className="reading-container">
                        {readingPassageRender}
                        <div className="reading-right-pane" onClick={handleNoteInteraction} onMouseOver={handleNoteInteraction} onMouseOut={handleNoteInteraction}>
                            {testData?.sections?.reading?.questions?.map((part, i) => (
                                <div key={i} className="question-part">
                                    <h3>{part.title}</h3>
                                    {part.instruction && <p style={{ fontStyle: 'italic', color: '#555', marginBottom: '15px' }}>{renderHTML(part.instruction)}</p>}
                                    <div className="content-box">{part.htmlContent ? renderHTML(part.htmlContent) : renderStructuredQuestion(part)}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {skill === 'writing' && (
                    <div className="writing-wrapper">
                        <div className="writing-tabs-bar">
                            <button className={`w-tab-btn ${activeWritingTask === 'task1' ? 'active' : ''}`} onClick={() => setActiveWritingTask('task1')}>Task 1</button>
                            <button className={`w-tab-btn ${activeWritingTask === 'task2' ? 'active' : ''}`} onClick={() => setActiveWritingTask('task2')}>Task 2</button>
                        </div>
                        <div className="writing-workspace">
                            <div className="w-left-pane">
                                <div className="w-header-part">
                                    <h2 style={{ color: '#2B6830', margin: '0 0 10px', fontSize: '1.4rem' }}>{activeWritingTask === 'task1' ? 'WRITING TASK 1' : 'WRITING TASK 2'}</h2>
                                    <p style={{ color: '#666', fontStyle: 'italic', marginBottom: '20px' }}>You should spend about {activeWritingTask === 'task1' ? '20' : '40'} minutes on this task.</p>
                                </div>
                                <div className="prompt-box">
                                    {testData?.sections?.writing && testData.sections.writing[activeWritingTask] ? (
                                        <>{renderHTML((testData.sections.writing[activeWritingTask].prompt || testData.sections.writing[activeWritingTask].content || "").replace(/\n/g, '<br/>'))}
                                            {activeWritingTask === 'task1' && (
                                                <>
                                                    {testData.sections.writing.task1.images && testData.sections.writing.task1.images.length > 0 && (
                                                        testData.sections.writing.task1.images.map((imgUrl, index) => (
                                                            <img key={index} src={imgUrl} alt={`Task 1 Part ${index + 1}`} className="task-img" style={{ marginBottom: '15px' }} />
                                                        ))
                                                    )}
                                                    {testData.sections.writing.task1.image && !testData.sections.writing.task1.images && (
                                                        <img src={testData.sections.writing.task1.image} alt="Task 1 Chart" className="task-img" />
                                                    )}
                                                </>
                                            )}</>
                                    ) : (<p>Đang tải đề bài...</p>)}
                                </div>
                            </div>
                            <div className="w-right-pane">
                                <textarea className="writing-textarea" placeholder="Type your answer here..." value={answers[`writing_${activeWritingTask}`] || ''} onChange={(e) => handleInputChange(`writing_${activeWritingTask}`, e.target.value)} />
                                <div className="meta-row">Word Count: <strong>{(answers[`writing_${activeWritingTask}`] || "").split(/\s+/).filter(w => w.length > 0).length}</strong></div>
                                {/* PANEL KET QUA CHAM AI - hien ngay sau khi bam AI Grade, theo task dang mo */}
                                {(activeWritingTask === 'task1' ? aiResultTask1 : aiResultTask2) && (
                                    <div style={{ marginTop: '15px', background: 'white', border: '2px solid #2B6830', borderRadius: '10px', padding: '15px', maxHeight: '40vh', overflowY: 'auto' }}>
                                        <h3 style={{ margin: '0 0 10px 0', color: '#2B6830', fontSize: '1.05rem' }}>
                                            <i className="fa-solid fa-wand-magic-sparkles"></i> Kết quả AI: {activeWritingTask === 'task1' ? 'Task 1' : 'Task 2'}
                                        </h3>
                                        {parse(generateWritingFeedbackHTML(activeWritingTask === 'task1' ? aiResultTask1 : aiResultTask2, activeWritingTask))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {skill !== 'writing' && (
                <div className="test-footer">
                    {flatQuestions.map(item => (<div key={item.qNum} className={`q-nav-btn ${answers[item.qNum] ? 'done' : ''}`} onClick={() => scrollToQuestion(item.qNum)}>{item.qNum}</div>))}
                </div>
            )}

            {showConfirmModal && (
                <div className="confirm-overlay" onClick={() => setShowConfirmModal(false)}>
                    <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
                        <h3 className="confirm-title">Nộp bài thi?</h3>
                        <p className="confirm-desc">
                            Bạn có chắc chắn muốn nộp bài không?<br />
                            {skill === 'writing' && <span style={{ fontSize: '0.9rem', color: '#d32f2f' }}>(Lưu ý: Nếu muốn có điểm chấm AI, hãy bấm nút "AI Grade" trước khi nộp)</span>}
                        </p>
                        <div className="confirm-actions">
                            <button className="btn-cancel" onClick={() => setShowConfirmModal(false)}>Hủy bỏ</button>
                            <button className="btn-confirm" onClick={handleRealSubmitFromModal}>Đồng ý Nộp</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 👉 GIAO DIỆN BÁO LỖI (ĐÃ ĐƯỢC BƠM TO VÀ BỎ NÚT TRÔI NỔI) */}
            {userRole === 'private' && showBugModal && (
                <div className="modal-overlay" onClick={() => setShowBugModal(false)} style={{ zIndex: 9999 }}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px', padding: '30px' }}>
                        <button className="close-modal" onClick={() => setShowBugModal(false)}>×</button>
                        <h2 style={{ color: '#ef4444', marginTop: 0, borderBottom: '2px solid #fee2e2', paddingBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <i className="fa-solid fa-bug"></i> BÁO LỖI ĐỀ THI
                        </h2>
                        <p style={{ color: '#64748b', fontSize: '1rem', marginBottom: '20px', lineHeight: '1.6' }}>
                            Hệ thống sẽ cập nhật trạng thái đề thành <strong>Reported</strong>.
                            Bạn <strong>không bị văng ra ngoài</strong> mà vẫn có thể tiếp tục làm bài và báo cáo thêm lỗi nếu có.
                        </p>
                        <textarea
                            value={bugNote}
                            onChange={(e) => setBugNote(e.target.value)}
                            placeholder={`Mô tả chi tiết lỗi bạn gặp ở phần ${skill.toUpperCase()}...\n(VD: File nghe bị rè, câu 14 sai đáp án, v.v.)`}
                            style={{
                                width: '100%', height: '200px', padding: '20px', borderRadius: '8px',
                                border: '1px solid #cbd5e1', resize: 'vertical', fontFamily: 'inherit',
                                marginBottom: '20px', fontSize: '1rem', lineHeight: '1.6', background: '#f8fafc'
                            }}
                            autoFocus
                        />
                        <button
                            onClick={handleReportBug}
                            disabled={isSendingBug}
                            style={{
                                width: '100%', background: '#ef4444', color: 'white', border: 'none',
                                padding: '15px', borderRadius: '8px', fontWeight: 'bold', cursor: isSendingBug ? 'wait' : 'pointer', fontSize: '1.1rem',
                                transition: '0.2s', opacity: isSendingBug ? 0.6 : 1
                            }}
                            onMouseOver={(e) => { if (!isSendingBug) e.currentTarget.style.background = '#dc2626'; }}
                            onMouseOut={(e) => { if (!isSendingBug) e.currentTarget.style.background = '#ef4444'; }}
                        >
                            <i className="fa-solid fa-paper-plane"></i> {isSendingBug ? 'ĐANG GỬI...' : 'GỬI LÊN HỆ THỐNG'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
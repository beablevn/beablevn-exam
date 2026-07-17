// src/pages/SatAdaptiveTestPage.jsx
// ============================================================
// TRANG THI SAT READING & WRITING, CO CHE ADAPTIVE 2 MODULE (v2)
// ------------------------------------------------------------
// Luong thi:
//   intro -> module1 (32', 27 cau) -> re nhanh -> module2 (Kho/De) -> ket qua
// Re nhanh: dung >= threshold (15/25 cau tinh diem) o Module 1 -> nhanh Kho.
// Tinh diem: nhanh Kho  score = 200 + 12 x raw (toi da 800)
//            nhanh De   score = 200 + 7.6 x raw, lam tron xuong boi 10, TRAN 580
// Cau isPretest KHONG tinh diem (cau 7 va 27 moi module).
//
// v2 bo sung:
//   - AUTOSAVE moi 5s (localStorage + drafts/{sId}/sat/{satId} tren RTDB)
//     va KHOI PHUC bai dang thi khi vao lai. cleanupOldDrafts tren Functions
//     quet moi nhanh con cua drafts/{sId} nen nhanh 'sat' tu duoc don dep.
//   - Dong ho tinh theo DEADLINE thuc (Date.now) -> thoat ra vao lai
//     KHONG dung duoc thoi gian, chong "cau gio".
//   - Danh dau XEM LAI tung cau (co vang tren bang dieu huong).
//   - Canh bao con 5 phut (1 lan moi module).
//   - Man intro hien ket qua lan thi truoc (neu co).
// Anti-cheat: FullscreenGuard + AntiCheatGuard (3-strike -> ep nop toan bai).
// LUU Y StrictMode: khong dat side effect trong setState updater,
// dung ref lam nguon su that + chot chong chay trung.
// ============================================================
import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ref, push, set, update, get, child, remove } from 'firebase/database';
import { db } from '../firebase';
import { toast } from 'react-toastify';
import emailjs from '@emailjs/browser';
import FullscreenGuard from '../components/FullscreenGuard';
import AntiCheatGuard from '../components/AntiCheatGuard';
import { buildCheatReportHTML, cheatTitleSuffix } from '../utils/cheatLog';
import { satTests } from '../data/sat';

// Dung chung tai khoan EmailJS voi FullTestPage (1 email duy nhat cho ky nang)
const EMAIL_PUBLIC_KEY = 'Tq7e72DxJoSIlhIU4';
const EMAIL_SERVICE_ID = 'service_gvlyalu';
const EMAIL_TEMPLATE_LR = 'template_dbls4x9';

const FG = '#2B6830', DF = '#1E5225', TINT = '#E8F4EC', BG = '#F2F8F4', TX = '#2C2C2C';
const AMBER = '#b45309';

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const sid = () => localStorage.getItem('currentStudentId') || 'Guest';

export default function SatAdaptiveTestPage() {
  const { satId } = useParams();

  const [testData, setTestData] = useState(null);
  const [loadError, setLoadError] = useState(false);
  // phase: intro | module | interstitial | result
  const [phase, setPhase] = useState('intro');
  const [moduleKey, setModuleKey] = useState('module1'); // module1 | module2_harder | module2_easier
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState({});   // { module1: {qNum:'A'}, module2: {...} }
  const [flags, setFlags] = useState({});       // { module1: {qNum:true}, module2: {...} } danh dau xem lai
  const [timeLeft, setTimeLeft] = useState(0);
  const [result, setResult] = useState(null);
  const [prevAttempt, setPrevAttempt] = useState(null); // lan thi truoc (neu co)
  const [savedDraft, setSavedDraft] = useState(null);   // ban nhap dang do (neu co)

  const answersRef = useRef({});
  const flagsRef = useRef({});
  const deadlineRef = useRef(0);                // moc het gio thuc (epoch ms), chong cau gio
  const finishLockRef = useRef(false);
  const finalizedRef = useRef(false);
  const restoredRef = useRef(false);            // chong khoi phuc 2 lan (StrictMode)
  const warned5Ref = useRef(false);             // canh bao 5 phut, 1 lan / module
  const moduleKeyRef = useRef('module1');
  const phaseRef = useRef('intro');

  useEffect(() => { emailjs.init(EMAIL_PUBLIC_KEY); }, []);
  useEffect(() => { moduleKeyRef.current = moduleKey; }, [moduleKey]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const draftLocalKey = `sat_save_${satId}`;

  // ---- 1. NAP DATA DE + LICH SU LAN TRUOC + BAN NHAP ----
  useEffect(() => {
    const entry = satTests.find(t => t.id === satId);
    if (!entry) { setLoadError(true); return; }
    entry.load().then(setTestData).catch(err => {
      console.error('Loi nap de SAT:', err);
      setLoadError(true);
    });
  }, [satId]);

  useEffect(() => {
    if (restoredRef.current) return; // StrictMode goi effect 2 lan
    restoredRef.current = true;
    const s = sid();
    // Ban nhap local truoc (nhanh), sau do doi chieu cloud (moi hon thi lay cloud)
    let local = null;
    try { local = JSON.parse(localStorage.getItem(draftLocalKey) || 'null'); } catch { local = null; }
    if (local) setSavedDraft(local);
    if (s !== 'Guest') {
      // Lay ban nhap cloud + ket qua lan thi truoc
      get(child(ref(db), `drafts/${s}/sat/${satId}`)).then(snap => {
        if (snap.exists()) {
          const cloud = snap.val();
          const localTime = local?.updatedAt ? new Date(local.updatedAt).getTime() : 0;
          const cloudTime = cloud?.updatedAt ? new Date(cloud.updatedAt).getTime() : 0;
          if (cloudTime > localTime) setSavedDraft(cloud);
        }
      }).catch(e => console.error('Loi doc draft:', e));
      get(child(ref(db), `history/${s}`)).then(snap => {
        if (!snap.exists()) return;
        const list = Object.values(snap.val()).filter(r => r.type === 'sat_adaptive' && r.testId === satId);
        if (list.length > 0) {
          list.sort((a, b) => new Date(b.date) - new Date(a.date));
          setPrevAttempt(list[0]);
        }
      }).catch(e => console.error('Loi doc lich su:', e));
    }
  }, [satId]); // eslint-disable-line react-hooks/exhaustive-deps

  const cfg = testData?.adaptiveConfig;
  const curModule = testData?.modules?.[moduleKey];
  const questions = curModule?.questions || [];
  const q = questions[qIndex];
  const slot = moduleKey === 'module1' ? 'module1' : 'module2';

  // ---- 2. TIMER THEO DEADLINE THUC ----
  useEffect(() => {
    if (phase !== 'module') return;
    const t = setInterval(() => {
      const remain = Math.max(0, Math.round((deadlineRef.current - Date.now()) / 1000));
      setTimeLeft(remain);
      if (remain <= 0) clearInterval(t);
    }, 1000);
    return () => clearInterval(t);
  }, [phase, moduleKey]);

  // Het gio -> tu nop module (side effect NGOAI setState updater)
  useEffect(() => {
    if (phase === 'module' && timeLeft === 0 && testData && deadlineRef.current > 0) {
      toast.info('⏰ Hết giờ! Hệ thống tự nộp module.');
      finishModule();
    }
  }, [timeLeft]); // eslint-disable-line react-hooks/exhaustive-deps

  // Canh bao con 5 phut, 1 lan moi module
  useEffect(() => {
    if (phase === 'module' && timeLeft > 0 && timeLeft <= 300 && !warned5Ref.current) {
      warned5Ref.current = true;
      toast.warn('⏳ Còn 5 phút! Kiểm tra các câu đã đánh dấu xem lại.', { autoClose: 6000 });
    }
  }, [timeLeft, phase]);

  // ---- 3. AUTOSAVE MOI 5 GIAY (local + cloud) ----
  useEffect(() => {
    if (phase !== 'module') return;
    const saveDraft = () => {
      const payload = {
        phase: 'module', moduleKey: moduleKeyRef.current,
        answers: answersRef.current, flags: flagsRef.current,
        deadline: deadlineRef.current, updatedAt: new Date().toISOString(),
      };
      try { localStorage.setItem(draftLocalKey, JSON.stringify(payload)); } catch (e) { console.error(e); }
      const s = sid();
      if (s !== 'Guest') {
        update(ref(db, `drafts/${s}/sat/${satId}`), payload).catch(e => console.error('Loi luu nhap cloud:', e));
      }
    };
    saveDraft();
    const iv = setInterval(saveDraft, 5000);
    return () => clearInterval(iv);
  }, [phase, moduleKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Xoa ban nhap (khi hoan thanh bai)
  const clearDraft = () => {
    try { localStorage.removeItem(draftLocalKey); } catch (e) { console.error(e); }
    const s = sid();
    if (s !== 'Guest') remove(ref(db, `drafts/${s}/sat/${satId}`)).catch(e => console.error(e));
  };

  // Khoi phuc bai dang do tu man intro
  const resumeDraft = () => {
    if (!savedDraft) return;
    answersRef.current = savedDraft.answers || {};
    flagsRef.current = savedDraft.flags || {};
    setAnswers(answersRef.current);
    setFlags(flagsRef.current);
    setModuleKey(savedDraft.moduleKey || 'module1');
    // Deadline thuc: thoi gian troi qua khi thoat van bi tru
    deadlineRef.current = savedDraft.deadline || (Date.now() + (cfg?.timeLimitPerModule ?? 1920) * 1000);
    const remain = Math.max(0, Math.round((deadlineRef.current - Date.now()) / 1000));
    setTimeLeft(remain);
    setQIndex(0);
    warned5Ref.current = remain <= 300;
    setPhase('module');
    if (remain === 0) toast.warn('Bài thi đã hết giờ trong lúc bạn rời đi. Hệ thống sẽ nộp module này.');
  };

  // Bat dau lam moi (bo ban nhap cu neu co)
  const startFresh = () => {
    clearDraft();
    answersRef.current = {}; flagsRef.current = {};
    setAnswers({}); setFlags({});
    deadlineRef.current = Date.now() + (cfg?.timeLimitPerModule ?? 1920) * 1000;
    setTimeLeft(cfg?.timeLimitPerModule ?? 1920);
    warned5Ref.current = false;
    setPhase('module');
  };

  // ---- 4. CHON DAP AN + DANH DAU XEM LAI ----
  const pick = (letter) => {
    if (!q) return;
    setAnswers(prev => {
      const next = { ...prev, [slot]: { ...(prev[slot] || {}), [q.qNum]: letter } };
      answersRef.current = next;
      return next;
    });
  };
  const toggleFlag = () => {
    if (!q) return;
    setFlags(prev => {
      const cur = { ...(prev[slot] || {}) };
      if (cur[q.qNum]) delete cur[q.qNum]; else cur[q.qNum] = true;
      const next = { ...prev, [slot]: cur };
      flagsRef.current = next;
      return next;
    });
  };

  // Cham 1 module: { rawScored, rawAll, byDomain }
  const grade = (mKey, slotKey) => {
    const qs = testData.modules[mKey].questions;
    const ans = answersRef.current[slotKey] || {};
    let rawScored = 0, rawAll = 0;
    const byDomain = {};
    qs.forEach(item => {
      const ok = ans[item.qNum] === item.answer;
      if (!byDomain[item.domain]) byDomain[item.domain] = { correct: 0, total: 0 };
      if (!item.isPretest) {
        byDomain[item.domain].total += 1;
        if (ok) { rawScored += 1; byDomain[item.domain].correct += 1; }
      }
      if (ok) rawAll += 1;
    });
    return { rawScored, rawAll, byDomain };
  };

  const scaledScore = (raw, branch) => {
    if (branch === 'harder') return Math.min(800, 200 + 12 * raw);
    const capped = Math.floor((200 + 7.6 * raw) / 10) * 10;
    return Math.min(cfg?.scoring?.easierBranch?.scaleMax ?? 580, capped);
  };

  // ---- 5. KET THUC MODULE ----
  const finishModule = (forced = false) => {
    if (finishLockRef.current) return;
    finishLockRef.current = true;

    if (moduleKeyRef.current === 'module1' && !forced) {
      const g1 = grade('module1', 'module1');
      const threshold = cfg?.routing?.thresholdCorrect ?? 15;
      const nextKey = g1.rawScored >= threshold ? 'module2_harder' : 'module2_easier';
      setModuleKey(nextKey);
      setQIndex(0);
      setPhase('interstitial');
      setTimeout(() => { finishLockRef.current = false; }, 300);
    } else {
      finalize(forced);
    }
  };

  const startModule2 = () => {
    deadlineRef.current = Date.now() + (cfg?.timeLimitPerModule ?? 1920) * 1000;
    setTimeLeft(cfg?.timeLimitPerModule ?? 1920);
    warned5Ref.current = false;
    setPhase('module');
  };

  // ---- 6. TONG KET, LUU LICH SU, GUI EMAIL ----
  const finalize = async (forced = false) => {
    if (finalizedRef.current) return;
    finalizedRef.current = true;
    clearDraft(); // Bai da xong, xoa ban nhap local + cloud

    const g1 = grade('module1', 'module1');
    const inModule2 = moduleKeyRef.current !== 'module1';
    const g2 = inModule2 ? grade(moduleKeyRef.current, 'module2') : { rawScored: 0, rawAll: 0, byDomain: {} };
    const branch = moduleKeyRef.current === 'module2_harder' ? 'harder'
                 : moduleKeyRef.current === 'module2_easier' ? 'easier'
                 : (g1.rawScored >= (cfg?.routing?.thresholdCorrect ?? 15) ? 'harder' : 'easier');
    const raw = g1.rawScored + g2.rawScored;
    const scaled = scaledScore(raw, branch);

    const byDomain = {};
    [g1.byDomain, g2.byDomain].forEach(src => {
      Object.entries(src).forEach(([d, v]) => {
        if (!byDomain[d]) byDomain[d] = { correct: 0, total: 0 };
        byDomain[d].correct += v.correct; byDomain[d].total += v.total;
      });
    });

    const res = { raw, scaled, branch, m1: g1.rawScored, m2: g2.rawScored, byDomain, forced };
    setResult(res);
    setPhase('result');

    const studentId = sid();
    const studentName = localStorage.getItem('currentStudentName') || 'Học viên';
    const record = {
      id: Date.now(), type: 'sat_adaptive', date: new Date().toISOString(),
      studentId, studentName, testId: satId, testName: testData.testName,
      skill: 'SAT R&W', score: raw, total: cfg?.scoring?.totalScored ?? 50,
      scaledScore: scaled, branch, module1Correct: g1.rawScored, module2Correct: g2.rawScored,
      forcedSubmit: forced,
    };
    try {
      if (studentId !== 'Guest') await set(push(ref(db, `history/${studentId}`)), record);
      else {
        const h = JSON.parse(localStorage.getItem('ielts_history') || '[]');
        h.push(record); localStorage.setItem('ielts_history', JSON.stringify(h));
      }
    } catch (e) { console.error('Loi luu lich su:', e); }

    try {
      const displayName = studentName ? `${studentName} (ID: ${studentId})` : studentId;
      const branchVi = branch === 'harder' ? 'Nhánh Khó (trần 800)' : 'Nhánh Dễ (trần 580)';
      const domRows = Object.entries(byDomain).map(([d, v]) =>
        `<tr><td style="padding:6px;border:1px solid #ccc;">${d}</td><td style="padding:6px;border:1px solid #ccc;text-align:center;">${v.correct}/${v.total}</td></tr>`).join('');
      const detail = `${buildCheatReportHTML()}
        <p><b>Scaled score:</b> ${scaled}/800 | <b>Raw:</b> ${raw}/50 | <b>${branchVi}</b>${forced ? ' | <b style="color:red">BỊ ÉP NỘP DO VI PHẠM</b>' : ''}</p>
        <p>Module 1: ${g1.rawScored}/25 đúng | Module 2: ${g2.rawScored}/25 đúng</p>
        <table style="border-collapse:collapse;">${domRows}</table>`;
      await emailjs.send(EMAIL_SERVICE_ID, EMAIL_TEMPLATE_LR, {
        test_name: 'SAT R&W ADAPTIVE' + cheatTitleSuffix(),
        test_code: satId, student_name: displayName,
        score: `${scaled} (raw ${raw}/50)`, total: 800,
        time_taken: '2 x 32 phút', submission_time: new Date().toLocaleString('vi-VN'),
        detailed_answers: detail,
      });
    } catch (e) { console.error('Email failed:', e); toast.warning('Bài thi đã nộp nhưng hệ thống gửi email đang bận!'); }
  };

  const handleForceSubmit = () => finishModule(true);

  const answered = useMemo(() => Object.keys(answers[slot] || {}).length, [answers, slot]);
  const flagged = useMemo(() => Object.keys(flags[slot] || {}).length, [flags, slot]);

  // ============ RENDER ============
  if (loadError) return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <h2 style={{ color: FG }}>❌ Không tìm thấy đề SAT!</h2>
      <Link to="/dashboard" style={{ background: FG, color: 'white', padding: '10px 20px', borderRadius: 6, textDecoration: 'none', fontWeight: 'bold' }}>Quay lại Trang chủ</Link>
    </div>
  );
  if (!testData) return (
    <div style={{ textAlign: 'center', padding: '80px 20px', color: FG }}>
      <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2.5rem', marginBottom: 15 }}></i>
      <h3 style={{ margin: 0 }}>Đang tải đề thi SAT...</h3>
    </div>
  );

  // ---- MAN HINH GIOI THIEU ----
  if (phase === 'intro') return (
    <div className="sat-page-pad" style={{ maxWidth: 860, margin: '30px auto', padding: 20 }}>
      <div className="sat-panel" style={{ background: 'white', border: `2px solid ${FG}`, borderRadius: 12, padding: 30 }}>
        <h1 style={{ color: FG, marginTop: 0 }}>{testData.testName}</h1>
        <p style={{ color: TX }}>{testData.description}</p>

        {prevAttempt && (
          <div style={{ background: '#fff8e6', border: `1px solid ${AMBER}`, borderRadius: 8, padding: '12px 18px', margin: '12px 0', color: TX }}>
            <b style={{ color: AMBER }}>Bạn đã thi đề này:</b> {new Date(prevAttempt.date).toLocaleString('vi-VN')} •
            kết quả <b>{prevAttempt.scaledScore}/800</b> (raw {prevAttempt.score}/{prevAttempt.total}).
            Thi lại sẽ ghi thêm một kết quả mới vào lịch sử.
          </div>
        )}

        <div style={{ background: TINT, borderRadius: 8, padding: '15px 20px', margin: '15px 0' }}>
          <b style={{ color: DF }}>Cơ chế Adaptive:</b>
          <ul style={{ margin: '8px 0 0 0', color: TX, lineHeight: 1.7 }}>
            <li>2 module, mỗi module <b>27 câu / 32 phút</b> (25 câu tính điểm + 2 câu thử nghiệm).</li>
            <li>Module 1 cố định. Làm tốt (đúng từ {cfg?.routing?.thresholdCorrect ?? 15}/25 câu tính điểm) vào <b>Nhánh Khó</b>, trần 800 điểm.</li>
            <li>Sai nhiều vào <b>Nhánh Dễ</b>, điểm bị giới hạn trần 580 kể cả đúng 100% Module 2.</li>
            <li>Đồng hồ tính theo thời gian thực: thoát ra rồi vào lại vẫn bị trừ giờ.</li>
            <li>Bài làm tự lưu mỗi 5 giây, mất mạng hoặc lỡ tắt trang có thể vào thi tiếp.</li>
          </ul>
        </div>
        <p style={{ color: '#a33', fontWeight: 'bold' }}>⚠️ Bài thi bật chế độ chống gian lận: thoát fullscreen hoặc rời tab sẽ bị ghi nhận; vi phạm 3 lần bài thi bị nộp ngay.</p>

        {savedDraft ? (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button onClick={resumeDraft} className="sat-btn-lg"
              style={{ background: FG, color: 'white', border: 'none', padding: '14px 30px', borderRadius: 8, fontSize: '1.02rem', fontWeight: 'bold', cursor: 'pointer' }}>
              ▶ TIẾP TỤC BÀI ĐANG THI ({savedDraft.moduleKey === 'module1' ? 'Module 1' : 'Module 2'})
            </button>
            <button onClick={startFresh} className="sat-btn-lg"
              style={{ background: 'white', color: DF, border: `2px solid ${FG}`, padding: '14px 30px', borderRadius: 8, fontSize: '1.02rem', fontWeight: 'bold', cursor: 'pointer' }}>
              Làm lại từ đầu
            </button>
          </div>
        ) : (
          <button onClick={startFresh} className="sat-btn-lg"
            style={{ background: FG, color: 'white', border: 'none', padding: '14px 34px', borderRadius: 8, fontSize: '1.05rem', fontWeight: 'bold', cursor: 'pointer' }}>
            BẮT ĐẦU MODULE 1 <i className="fa-solid fa-arrow-right"></i>
          </button>
        )}
      </div>
    </div>
  );

  // ---- MAN HINH CHUYEN MODULE ----
  if (phase === 'interstitial') {
    const harder = moduleKey === 'module2_harder';
    return (
      <div className="sat-page-pad" style={{ maxWidth: 720, margin: '60px auto', padding: 20, textAlign: 'center' }}>
        <div className="sat-panel" style={{ background: 'white', border: `2px solid ${FG}`, borderRadius: 12, padding: 40 }}>
          <h2 style={{ color: FG }}>✅ Đã nộp Module 1</h2>
          <p style={{ fontSize: '1.1rem', color: TX }}>
            Hệ thống đã phân tích kết quả. Module 2 của bạn: <b style={{ color: harder ? DF : AMBER }}>
            {harder ? 'NHÁNH KHÓ (Harder adaptive mix), trần điểm 800' : 'NHÁNH DỄ (Easier adaptive mix), trần điểm 580'}</b>
          </p>
          <p style={{ color: '#666' }}>27 câu / 32 phút. Đồng hồ bắt đầu chạy khi bạn bấm nút.</p>
          <button onClick={startModule2} className="sat-btn-lg"
            style={{ background: FG, color: 'white', border: 'none', padding: '14px 34px', borderRadius: 8, fontSize: '1.05rem', fontWeight: 'bold', cursor: 'pointer' }}>
            BẮT ĐẦU MODULE 2 <i className="fa-solid fa-arrow-right"></i>
          </button>
        </div>
      </div>
    );
  }

  // ---- MAN HINH KET QUA ----
  if (phase === 'result' && result) return (
    <div className="sat-page-pad" style={{ maxWidth: 860, margin: '30px auto', padding: 20 }}>
      <div className="sat-panel" style={{ background: 'white', border: `2px solid ${FG}`, borderRadius: 12, padding: 30, textAlign: 'center' }}>
        <h2 style={{ color: FG, marginTop: 0 }}>🎉 Hoàn thành bài thi!</h2>
        <div className="sat-score" style={{ fontSize: '3rem', fontWeight: 'bold', color: DF }}>{result.scaled}<span style={{ fontSize: '1.2rem', color: '#666' }}> / 800</span></div>
        <p style={{ color: TX }}>
          Raw score: <b>{result.raw}/50</b> (Module 1: {result.m1}/25, Module 2: {result.m2}/25) |
          Nhánh: <b>{result.branch === 'harder' ? 'Khó (trần 800)' : 'Dễ (trần 580)'}</b>
          {result.forced && <span style={{ color: '#a33' }}> | Bài bị ép nộp do vi phạm quy chế</span>}
        </p>
        <div className="sat-table-wrap">
        <table style={{ margin: '15px auto', borderCollapse: 'collapse' }}>
          <thead><tr>
            <th style={{ border: '1px solid #ccc', padding: '6px 14px', background: TINT, color: DF }}>Nhóm kiến thức</th>
            <th style={{ border: '1px solid #ccc', padding: '6px 14px', background: TINT, color: DF }}>Đúng / Tổng (tính điểm)</th>
          </tr></thead>
          <tbody>
            {Object.entries(result.byDomain).map(([d, v]) => (
              <tr key={d}>
                <td style={{ border: '1px solid #ccc', padding: '6px 14px', textAlign: 'left' }}>{d}</td>
                <td style={{ border: '1px solid #ccc', padding: '6px 14px' }}>{v.correct} / {v.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <p style={{ color: '#666', fontSize: '0.9rem' }}>Kết quả đã được lưu vào lịch sử và gửi email cho giáo viên.</p>
        <Link to="/dashboard" style={{ background: FG, color: 'white', padding: '12px 26px', borderRadius: 8, textDecoration: 'none', fontWeight: 'bold' }}>Về Trang chủ</Link>
      </div>
    </div>
  );

  // ---- MAN HINH LAM BAI ----
  const curAns = (answers[slot] || {})[q?.qNum];
  const curFlag = (flags[slot] || {})[q?.qNum];
  const isLast = qIndex === questions.length - 1;
  return (
    <div className="test-page-layout sat-test-layout">
      <FullscreenGuard />
      <AntiCheatGuard active={phase === 'module'} testId={satId} onForceSubmit={handleForceSubmit} />
      {/* Bo cuc chieu cao (shell cuon, inner lap day) nam trong App.css, khong dat
          inline o day vi inline se de len class va lam hong lai bo cuc. */}
      <div className="sat-shell">
       <div className="sat-inner">
        {/* Thanh trang thai */}
        <div className="sat-status-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, background: 'white', border: `1px solid ${FG}`, borderRadius: 10, padding: '10px 18px' }}>
          <b style={{ color: DF }}>{curModule.title}</b>
          <span style={{ color: TX }}>Đã trả lời: <b>{answered}/27</b>{flagged > 0 && <span style={{ color: AMBER }}> • Xem lại: <b>{flagged}</b></span>}</span>
          <span style={{ fontWeight: 'bold', fontSize: '1.15rem', color: timeLeft < 300 ? '#c0392b' : FG }}>
            <i className="fa-regular fa-clock"></i> {fmt(timeLeft)}
          </span>
        </div>
        {/* Cau hoi */}
        <div className="sat-qcard" style={{ background: 'white', borderRadius: 10, border: '1px solid #ddd', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ color: '#666', fontSize: '0.85rem' }}>Câu {qIndex + 1} / 27 • {q.domain}</span>
            <button onClick={toggleFlag}
              style={{ background: curFlag ? '#fff3d6' : 'white', color: AMBER, border: `1px solid ${AMBER}`, padding: '5px 12px', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold', fontSize: '0.82rem' }}>
              <i className={curFlag ? 'fa-solid fa-bookmark' : 'fa-regular fa-bookmark'}></i> {curFlag ? 'Bỏ đánh dấu' : 'Đánh dấu xem lại'}
            </button>
          </div>
          <p style={{ fontStyle: 'italic', color: TX, lineHeight: 1.7 }}>{q.passage}</p>
          <p style={{ fontWeight: 'bold', color: DF }}>{q.stem}</p>
          <div>
            {q.options.map((opt) => {
              const letter = opt.slice(0, 1);
              const chosen = curAns === letter;
              return (
                <div key={letter} onClick={() => pick(letter)} className="sat-option"
                  style={{ padding: '11px 15px', margin: '8px 0', borderRadius: 8, cursor: 'pointer',
                           border: chosen ? `2px solid ${FG}` : '1px solid #ccc',
                           background: chosen ? TINT : 'white', color: TX, fontWeight: chosen ? 'bold' : 'normal' }}>
                  {opt}
                </div>
              );
            })}
          </div>
          {/* Dieu huong */}
          <div className="sat-nav" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button disabled={qIndex === 0} className="sat-btn" onClick={() => setQIndex(i => Math.max(0, i - 1))}
              style={{ background: qIndex === 0 ? '#ccc' : 'white', color: DF, border: `1px solid ${FG}`, padding: '10px 20px', borderRadius: 8, cursor: qIndex === 0 ? 'default' : 'pointer', fontWeight: 'bold' }}>
              <i className="fa-solid fa-arrow-left"></i> Câu trước
            </button>
            {isLast ? (
              <button onClick={() => {
                  if (answered < 27 && !window.__satConfirmPending) {
                    window.__satConfirmPending = true;
                    toast.warn(`Bạn mới trả lời ${answered}/27 câu. Bấm NỘP MODULE lần nữa để xác nhận.`, { autoClose: 4000 });
                    setTimeout(() => { window.__satConfirmPending = false; }, 4500);
                    return;
                  }
                  finishModule();
                }} className="sat-btn"
                style={{ background: FG, color: 'white', border: 'none', padding: '10px 26px', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' }}>
                NỘP MODULE <i className="fa-solid fa-paper-plane"></i>
              </button>
            ) : (
              <button className="sat-btn" onClick={() => setQIndex(i => Math.min(questions.length - 1, i + 1))}
                style={{ background: FG, color: 'white', border: 'none', padding: '10px 26px', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' }}>
                Câu tiếp <i className="fa-solid fa-arrow-right"></i>
              </button>
            )}
          </div>
        </div>
        {/* Bang dieu huong nhanh */}
        <div className="sat-palette-box" style={{ background: 'white', borderRadius: 10, border: '1px solid #ddd', padding: 14 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {questions.map((item, i) => {
              const done = (answers[slot] || {})[item.qNum];
              const fl = (flags[slot] || {})[item.qNum];
              return (
                <div key={item.qNum} onClick={() => setQIndex(i)} className="sat-cell"
                  style={{ width: 34, height: 34, lineHeight: '30px', textAlign: 'center', borderRadius: 6, cursor: 'pointer',
                           fontWeight: 'bold', fontSize: '0.85rem', boxSizing: 'border-box',
                           border: i === qIndex ? `2px solid ${DF}` : (fl ? `2px solid ${AMBER}` : '1px solid #bbb'),
                           background: done ? FG : 'white', color: done ? 'white' : TX }}>
                  {i + 1}
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 8, fontSize: '0.78rem', color: '#666' }}>
            <span style={{ display: 'inline-block', width: 12, height: 12, background: FG, borderRadius: 3, verticalAlign: 'middle', marginRight: 4 }}></span> đã trả lời
            <span style={{ display: 'inline-block', width: 12, height: 12, border: `2px solid ${AMBER}`, borderRadius: 3, verticalAlign: 'middle', margin: '0 4px 0 14px', boxSizing: 'border-box' }}></span> đánh dấu xem lại
          </div>
        </div>
       </div>
      </div>
    </div>
  );
}

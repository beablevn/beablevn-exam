// src/pages/HomePage.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

// 👉 1. IMPORT CÁC HÀM CỦA FIREBASE
import { ref, get, child } from "firebase/database";
import { db } from '../firebase';
import { toast } from 'react-toastify';
import { satTests } from '../data/sat'; // Danh muc de SAT Adaptive (metadata nhe, data nap khi vao thi)
import { isTestProtected, isTestUnlocked, tryUnlockTest, clearAllTestUnlocks } from '../utils/testLock';

export default function HomePage() {
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔒 Popup mật khẩu cho các đề bị khóa — testId đang chờ nhập mật khẩu (null = không hiện popup).
  // Vao lai Dashboard la xoa het cac de da mo khoa truoc do, buoc nhap lai mat khau moi lan bam Start Test
  // (chong hoc vien mo khoa 1 lan roi lam nhieu de gian doan giua chung ma khong bi hoi lai).
  const [pwModalTestId, setPwModalTestId] = useState(null);
  const [pwInput, setPwInput] = useState('');
  const [pwError, setPwError] = useState('');
  useEffect(() => { clearAllTestUnlocks(); }, []);

  // 👉 TAB IELTS / SAT: tach 2 he de thi thanh 2 tab rieng cho gon giao dien.
  //    Ghi nho tab dang chon vao localStorage de lan sau mo lai dung tab cu.
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('exam_home_tab') || 'ielts');
  const switchTab = (tab) => {
    setActiveTab(tab);
    try { localStorage.setItem('exam_home_tab', tab); } catch (e) { console.error(e); }
  };

  // 👉 GỌI DỮ LIỆU IELTS TỪ FIREBASE KHI TRANG VỪA MỞ LÊN
  useEffect(() => {
    const fetchTests = async () => {
      try {
        const dbRef = ref(db);
        const snapshot = await get(child(dbRef, 'mockTests'));
        if (snapshot.exists()) {
          const data = snapshot.val();
          const testsArray = Object.values(data);
          // 🔥 LỌC BẢO MẬT: Chỉ lấy những đề đã được duyệt (published)
          let publishedTests = testsArray.filter(test => test.status === 'published');
          // 🌟 SẮP XẾP TỰ NHIÊN (NATURAL SORT)
          publishedTests.sort((a, b) => a.testName.localeCompare(b.testName, undefined, { numeric: true }));
          setTests(publishedTests);
        } else {
          setTests([]);
        }
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu:", error);
        toast.error("Không thể kết nối tải danh sách đề thi.");
      } finally {
        setLoading(false);
      }
    };
    fetchTests();
  }, []);

  // 👉 GÁC CỔNG chung: kiểm tra khóa tài khoản rồi mới chạy hành động (navigate hoặc mở popup mật khẩu)
  const checkLockThenRun = async (e, onPass) => {
    e.preventDefault();
    const studentId = localStorage.getItem("currentStudentId");
    if (!studentId || studentId === 'Guest') { onPass(); return; }
    try {
      const dbRef = ref(db);
      const snap = await get(child(dbRef, `users/${studentId}`));
      if (snap.exists() && snap.val().isLocked) {
        toast.error("🔒 TÀI KHOẢN BỊ KHÓA: Bạn không thể làm đề thi lúc này. Vui lòng liên hệ Admin!", { autoClose: 5000 });
      } else {
        onPass();
      }
    } catch (error) {
      toast.error("❌ Lỗi kiểm tra tài khoản: " + error.message);
    }
  };
  const handleStartTest = (e, testId) => checkLockThenRun(e, () => {
    if (isTestProtected(testId) && !isTestUnlocked(testId)) {
      setPwModalTestId(testId); setPwInput(''); setPwError('');
    } else {
      navigate(`/test-menu/${testId}`);
    }
  });
  const handleStartSat = (e, satId) => checkLockThenRun(e, () => navigate(`/sat-test/${satId}`));

  const handlePwSubmit = (e) => {
    e.preventDefault();
    if (tryUnlockTest(pwModalTestId, pwInput)) {
      const testId = pwModalTestId;
      setPwModalTestId(null);
      navigate(`/test-menu/${testId}`);
    } else {
      setPwError('❌ Sai mật khẩu, vui lòng thử lại.');
    }
  };

  return (
    <div className="homepage-wrapper">

      {/* 🔒 POPUP MẬT KHẨU: hiện ngay khi bấm START TEST cho các đề bị khóa. */}
      {pwModalTestId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '14px', padding: '32px 28px', maxWidth: '340px', width: '90%', textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.25)' }}>
            <i className="fa-solid fa-lock" style={{ fontSize: '2.5rem', color: '#2B6830', marginBottom: '16px' }}></i>
            <h3 style={{ color: '#2B6830', margin: '0 0 6px' }}>Đề thi yêu cầu mật khẩu</h3>
            <p style={{ color: '#666', marginBottom: '20px', fontSize: '0.9rem' }}>Nhập mật khẩu để bắt đầu làm bài.</p>
            <form onSubmit={handlePwSubmit}>
              <input
                type="password"
                value={pwInput}
                onChange={(e) => { setPwInput(e.target.value); setPwError(''); }}
                placeholder="Nhập mật khẩu"
                autoFocus
                style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem', marginBottom: '12px', textAlign: 'center', boxSizing: 'border-box' }}
              />
              {pwError && <p style={{ color: '#ef4444', marginTop: '-4px', marginBottom: '12px', fontSize: '0.85rem' }}>{pwError}</p>}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setPwModalTestId(null)}
                  style={{ flex: 1, background: '#f1f5f9', color: '#475569', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={{ flex: 1, background: '#2B6830', color: 'white', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}
                >
                  Xác nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="hp-container">

        {/* HEADER */}
        <div className="hp-header">
          <div className="hp-title">
            <h1>{activeTab === 'sat' ? 'SAT PRACTICE TEST SYSTEM' : 'IELTS PRACTICE TEST SYSTEM'}</h1>
          </div>
          <div className="hp-nav">
            <Link to="/dashboard" className="hp-link active">MOCK TEST</Link>
            <Link to="/writing-library" className="hp-link">WRITING</Link>
          </div>
        </div>

        {/* 👉 TAB BAR: IELTS | SAT */}
        <div className="hp-tab-bar">
          <button className={`hp-tab ${activeTab === 'ielts' ? 'active' : ''}`} onClick={() => switchTab('ielts')}>
            <i className="fa-solid fa-earth-asia"></i> IELTS
          </button>
          <button className={`hp-tab ${activeTab === 'sat' ? 'active' : ''}`} onClick={() => switchTab('sat')}>
            <i className="fa-solid fa-graduation-cap"></i> SAT <span className="hp-tab-badge">Adaptive</span>
          </button>
        </div>

        {/* ===== TAB IELTS ===== */}
        {activeTab === 'ielts' && (
          loading ? (
            <div style={{ textAlign: 'center', padding: '50px', color: '#2B6830' }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2.5rem', marginBottom: '15px' }}></i>
              <h3 style={{ margin: 0 }}>Đang kết nối hệ thống...</h3>
              <p style={{ color: '#666' }}>Vui lòng chờ trong giây lát</p>
            </div>
          ) : (
            <div className="hp-grid">
              {tests.length > 0 ? (
                tests.map(test => (
                  <div key={test.id} className="hp-card">
                    <h3>{test.testName}</h3>
                    <p className="hp-card-desc">{test.description}</p>
                    <button
                      className="btn-start"
                      onClick={(e) => handleStartTest(e, test.id)}
                      style={{ border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      START TEST
                    </button>
                  </div>
                ))
              ) : (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '50px', background: 'white', borderRadius: '12px', border: '1px dashed #ccc' }}>
                  <i className="fa-regular fa-folder-open" style={{ fontSize: '3rem', color: '#ccc', marginBottom: '15px' }}></i>
                  <h3 style={{ margin: '0 0 10px 0', color: '#555' }}>Chưa có đề thi nào</h3>
                  <p style={{ color: '#888' }}>Hiện tại chưa có bài thi nào được xuất bản trên hệ thống.</p>
                </div>
              )}
            </div>
          )
        )}

        {/* ===== TAB SAT ===== */}
        {activeTab === 'sat' && (
          <>
            <div className="sat-tab-note">
              <i className="fa-solid fa-circle-info"></i>&nbsp;
              Đề SAT chạy theo cơ chế <b>Adaptive</b>: 2 module Reading & Writing, mỗi module 27 câu / 32 phút.
              Kết quả Module 1 quyết định độ khó và trần điểm của Module 2.
            </div>
            <div className="hp-grid">
              {satTests.length > 0 ? (
                satTests.map(t => (
                  <div key={t.id} className="hp-card sat-card-accent">
                    <h3>{t.testName}</h3>
                    <p className="hp-card-desc">{t.description}</p>
                    <button
                      className="btn-start"
                      onClick={(e) => handleStartSat(e, t.id)}
                      style={{ border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      START SAT TEST
                    </button>
                  </div>
                ))
              ) : (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '50px', background: 'white', borderRadius: '12px', border: '1px dashed #ccc' }}>
                  <i className="fa-regular fa-folder-open" style={{ fontSize: '3rem', color: '#ccc', marginBottom: '15px' }}></i>
                  <h3 style={{ margin: '0 0 10px 0', color: '#555' }}>Chưa có đề SAT nào</h3>
                  <p style={{ color: '#888' }}>Đề SAT Adaptive sẽ xuất hiện tại đây khi được phát hành.</p>
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
}

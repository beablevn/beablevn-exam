// src/pages/HomePage.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

// 👉 1. IMPORT CÁC HÀM CỦA FIREBASE
import { ref, get, child } from "firebase/database";
import { db } from '../firebase';
import { toast } from 'react-toastify';

export default function HomePage() {
  const navigate = useNavigate();

  // 👉 2. KHAI BÁO STATE
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);

  // 👉 STATE CHO PASSWORD GATE
  const [lockedConfig, setLockedConfig] = useState(null);
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [pendingTestId, setPendingTestId] = useState(null);
  const [pwdInput, setPwdInput] = useState('');
  const [pwdError, setPwdError] = useState('');

  // 👉 3. GỌI DỮ LIỆU TỪ FIREBASE KHI TRANG VỪA MỞ LÊN
  useEffect(() => {
    // Config mặc định — dùng khi Firebase rules chặn đọc node config/
    const DEFAULT_LOCKED_CONFIG = {
      password: "22674",
      lockedTests: [
        "Mock Test 1","Mock Test 2","Mock Test 3","Mock Test 4","Mock Test 5",
        "Mock Test 29","Mock Test 30","Mock Test 31","Mock Test 32","Mock Test 33",
        "MOCK TEST MQR 1","MOCK TEST MQR 2"
      ]
    };

    const fetchData = async () => {
      // --- Tải danh sách đề thi (tách riêng để lỗi config không ảnh hưởng) ---
      try {
        const dbRef = ref(db);
        const snapshot = await get(child(dbRef, 'mockTests'));
        if (snapshot.exists()) {
          const data = snapshot.val();
          const testsArray = Object.values(data);
          let publishedTests = testsArray.filter(test => test.status === 'published');
          publishedTests.sort((a, b) => a.testName.localeCompare(b.testName, undefined, { numeric: true }));
          setTests(publishedTests);
        } else {
          setTests([]);
        }
      } catch (error) {
        console.error("Lỗi khi tải danh sách đề thi:", error);
        toast.error("Không thể kết nối tải danh sách đề thi.");
      } finally {
        setLoading(false);
      }

      // --- Tải config mật khẩu (không hiện lỗi nếu rules chặn, dùng fallback) ---
      try {
        const dbRef = ref(db);
        const configSnap = await get(child(dbRef, 'config/mockTestPassword'));
        setLockedConfig(configSnap.exists() ? configSnap.val() : DEFAULT_LOCKED_CONFIG);
      } catch {
        // Firebase rules chặn đọc config → dùng config mặc định
        setLockedConfig(DEFAULT_LOCKED_CONFIG);
      }
    };

    fetchData();
  }, []);

  // 👉 KIỂM TRA ĐỀ CÓ BỊ KHÓA MẬT KHẨU KHÔNG
  const isTestLocked = (testName) => {
    if (!lockedConfig || !lockedConfig.lockedTests) return false;
    const name = (testName || '').toLowerCase().trim();
    return lockedConfig.lockedTests.some(n => n.toLowerCase().trim() === name);
  };

  // 👉 XỬ LÝ NHẬP MẬT KHẨU
  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (pwdInput === lockedConfig?.password) {
      setShowPwdModal(false);
      setPwdInput('');
      setPwdError('');
      navigate(`/test-menu/${pendingTestId}`);
    } else {
      setPwdError('Sai mật khẩu! Vui lòng thử lại.');
      setPwdInput('');
    }
  };

  const closePwdModal = () => {
    setShowPwdModal(false);
    setPwdInput('');
    setPwdError('');
    setPendingTestId(null);
  };

  // 👉 HÀM GÁC CỔNG: KIỂM TRA KHÓA + MẬT KHẨU TRƯỚC KHI VÀO THI
  const handleStartTest = async (e, testId, testName) => {
    e.preventDefault();
    const studentId = localStorage.getItem("currentStudentId");

    if (!studentId || studentId === 'Guest') {
      if (isTestLocked(testName)) {
        setPendingTestId(testId);
        setShowPwdModal(true);
        return;
      }
      navigate(`/test-menu/${testId}`);
      return;
    }

    try {
      const dbRef = ref(db);
      const snap = await get(child(dbRef, `users/${studentId}`));
      if (snap.exists() && snap.val().isLocked) {
        toast.error("🔒 TÀI KHOẢN BỊ KHÓA: Bạn không thể làm đề thi lúc này. Vui lòng liên hệ Admin!", { autoClose: 5000 });
      } else {
        // Kiểm tra mật khẩu đề thi
        if (isTestLocked(testName)) {
          setPendingTestId(testId);
          setShowPwdModal(true);
          return;
        }
        navigate(`/test-menu/${testId}`);
      }
    } catch (error) {
      toast.error("❌ Lỗi kiểm tra tài khoản: " + error.message);
    }
  };

  return (
    <div className="homepage-wrapper">
      <div className="hp-container">

        {/* HEADER */}
        <div className="hp-header">
          <div className="hp-title">
            <h1>IELTS PRACTICE TEST SYSTEM</h1>
          </div>
          <div className="hp-nav">
            <Link to="/dashboard" className="hp-link active">MOCK TEST</Link>
            <Link to="/writing-library" className="hp-link">WRITING</Link>
          </div>
        </div>

        {/* 👉 4. HIỂN THỊ DỮ LIỆU */}
        {loading ? (
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
                    onClick={(e) => handleStartTest(e, test.id, test.testName)}
                    style={{ border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    {isTestLocked(test.testName)
                      ? <><i className="fa-solid fa-lock" style={{ marginRight: '6px' }}></i>START TEST</>
                      : 'START TEST'
                    }
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
        )}
      </div>

      {/* 👉 MODAL NHẬP MẬT KHẨU ĐỀ ĐẶC BIỆT */}
      {showPwdModal && (
        <div className="modal-overlay" onClick={closePwdModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={closePwdModal}>×</button>
            <h2 style={{ color: '#2B6830', marginTop: 0 }}>
              <i className="fa-solid fa-lock" style={{ marginRight: '10px' }}></i>ĐỀ THI ĐẶC BIỆT
            </h2>
            <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.5' }}>
              Đề thi này yêu cầu mật khẩu để truy cập.<br />
              Vui lòng liên hệ giáo viên để được cung cấp.
            </p>
            <form onSubmit={handlePasswordSubmit}>
              <div style={{ textAlign: 'left', fontSize: '12px', fontWeight: 'bold', marginTop: 10, color: '#555' }}>MẬT KHẨU</div>
              <input
                type="password"
                className="login-input"
                placeholder="Nhập mật khẩu..."
                value={pwdInput}
                onChange={(e) => { setPwdInput(e.target.value); setPwdError(''); }}
                autoFocus
              />
              {pwdError && (
                <div style={{ color: '#dc2626', fontSize: '13px', marginTop: '8px', textAlign: 'left' }}>
                  <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '5px' }}></i>{pwdError}
                </div>
              )}
              <button type="submit" className="btn-submit-login">
                <i className="fa-solid fa-unlock" style={{ marginRight: '8px' }}></i>TRUY CẬP
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

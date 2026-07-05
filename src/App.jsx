// src/App.jsx
import { useState, useEffect, useRef } from 'react'; 
import { Routes, Route, Link, useNavigate, Navigate, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';       
import FullTestPage from './pages/FullTestPage'; 
import LandingPage from './pages/LandingPage';   
import AdminPage from './pages/AdminPage'; 
import TestMenuPage from './pages/TestMenuPage';
import WritingLibraryPage from './pages/WritingLibraryPage';
import WritingTestPage from './pages/WritingTestPage';
import TestHistoryPage from './pages/TestHistoryPage'; 
import ReviewHubPage from './pages/ReviewHubPage';
import { ref, get, child, update, remove } from "firebase/database";
import { httpsCallable } from "firebase/functions";
import { db, functions } from './firebase';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

const ProtectedRoute = ({ isLoggedIn, children }) => {
  if (!isLoggedIn) return <Navigate to="/" replace />;
  return children;
};

// 👉 GUARD CHO TRANG ADMIN — chỉ cho vào khi isAdmin = true (state nội bộ, không từ localStorage)
const AdminRoute = ({ isAdmin, children }) => {
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
};

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isLoggedIn, setIsLoggedIn] = useState(false); 
  const [isAdmin, setIsAdmin] = useState(false);

  // 👉 STATE CHO CHỨC NĂNG "TIẾP TỤC LÀM BÀI"
  const [showInProgressModal, setShowInProgressModal] = useState(false);
  const [inProgressTests, setInProgressTests] = useState([]);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [modalView, setModalView] = useState('login'); 

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [credentials, setCredentials] = useState({ studentId: '', password: '' });
  const [passForm, setPassForm] = useState({ studentId: '', oldPass: '', newPass: '', confirmPass: '' });
  
  const [studentName, setStudentName] = useState(''); 
  // 👉 KHÔNG đọc role từ localStorage — localStorage có thể bị sửa trong DevTools.
  //    Role chỉ được set từ dữ liệu Firebase sau khi login thành công (handleLoginSubmit).
  const [userRole, setUserRole] = useState('normal');

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleContextMenu = (e) => e.preventDefault();
    const handleKeyDown = (e) => {
      if (e.keyCode === 123 || e.key === 'F12') { e.preventDefault(); return false; }
      if (e.ctrlKey && e.shiftKey && (['I', 'J', 'C'].includes(e.key.toUpperCase()))) { e.preventDefault(); return false; }
      if (e.ctrlKey && e.key.toUpperCase() === 'U') { e.preventDefault(); return false; }
      if (e.ctrlKey && e.key.toUpperCase() === 'F') { e.preventDefault(); return false; }
    };
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleIdChange = (e) => {
    const val = e.target.value;
    if (/^\d*$/.test(val) && val.length <= 8) {
      setCredentials({ ...credentials, studentId: val });
    }
  };

  // 🔥 LOGIC TẢI VÀ QUẢN LÝ BÀI LÀM DANG DỞ
  const fetchInProgressTests = async () => {
      const studentId = localStorage.getItem("currentStudentId");
      if (!studentId || studentId === 'Guest') return;
      
      setLoadingDrafts(true);
      try {
          const dbRef = ref(db);
          const draftSnap = await get(child(dbRef, `drafts/${studentId}`));
          if (draftSnap.exists()) {
              const data = draftSnap.val();
              const list = [];
              
              // Kéo bản nháp Writing
              if (data.writing) {
                  Object.entries(data.writing).forEach(([key, info]) => {
                      list.push({ id: key, type: 'writing', time: info.timeLeft, date: info.updatedAt, data: info });
                  });
              }
              // Kéo bản nháp Mock (Chúng ta sẽ nâng cấp Mock ở bước sau)
              if (data.mock) {
                  Object.entries(data.mock).forEach(([key, info]) => {
                      list.push({ id: key, type: 'mock', time: info.timeLeft, date: info.updatedAt, data: info });
                  });
              }
              setInProgressTests(list.sort((a, b) => new Date(b.date) - new Date(a.date)));
          } else {
              setInProgressTests([]);
          }
      } catch (error) { console.error("Lỗi kéo dữ liệu:", error); } 
      finally { setLoadingDrafts(false); }
  };

  const handleDeleteDraft = async (type, id) => {
      if (!window.confirm("Bạn có chắc muốn xóa bản nháp này? Dữ liệu bài làm sẽ mất vĩnh viễn.")) return;
      const studentId = localStorage.getItem("currentStudentId");
      try {
          await remove(ref(db, `drafts/${studentId}/${type}/${id}`));
          toast.success("🗑️ Đã xóa bản nháp thành công!");
          fetchInProgressTests(); 
      } catch (e) { toast.error("❌ Lỗi xóa bản nháp: " + e.message); }
  };

  const handleContinueDraft = (item) => {
      setShowInProgressModal(false);
      if (item.type === 'writing') {
          // Bóc tách ID thông minh bằng Regex
          const t1Match = item.id.match(/t1_\d+/);
          const t2Match = item.id.match(/t2_\d+/);
          const t1 = t1Match ? t1Match[0] : 'x';
          const t2 = t2Match ? t2Match[0] : 'x';
          
          const params = new URLSearchParams();
          if (t1 !== 'x') params.append('t1', t1);
          if (t2 !== 'x') params.append('t2', t2);
          
          let mode = 'full';
          if (t1 !== 'x' && t2 === 'x') mode = 'task1';
          if (t1 === 'x' && t2 !== 'x') mode = 'task2';
          params.append('mode', mode);
          
          navigate(`/writing-practice?${params.toString()}`);
      } else {
          // Mock Test: ID lưu dạng "cam21_test1_listening"
          const lastUnderscore = item.id.lastIndexOf('_');
          const testId = item.id.substring(0, lastUnderscore);
          const skill = item.id.substring(lastUnderscore + 1);
          navigate(`/do-test/${testId}/${skill}`);
      }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const { studentId, password } = credentials;
    if (studentId.length !== 8 && studentId !== 'admin') { toast.warning("⚠️ Mã học viên phải có đúng 8 chữ số!"); return; }
    if (password.length < 6) { toast.warning("⚠️ Mật khẩu phải có ít nhất 6 ký tự!"); return; }

    // Fix 5: Mat khau admin duoc so sanh tren server (khong con trong bundle JS)
    if (studentId === '15082022') {
      try {
        const verifyAdmin = httpsCallable(functions, 'verifyAdminLogin');
        const result = await verifyAdmin({ password });
        if (result.data?.success) {
          setIsLoggedIn(true); setIsAdmin(true); setStudentName("Quản Trị Viên");
          setShowLoginModal(false); toast.success("🔓 Đăng nhập Admin thành công!");
          navigate('/admin');
        }
      } catch (err) {
        toast.error("❌ Sai mật khẩu Admin!");
      }
      return;
    }

    try {
      const dbRef = ref(db);
      const snapshot = await get(child(dbRef, `users/${studentId}`));
      if (snapshot.exists()) {
        const userData = snapshot.val();
        if (userData.password === password) {
           setIsLoggedIn(true); setIsAdmin(false); 
           
           const currentRole = userData.role || 'normal';
           setStudentName(userData.fullName);
           setUserRole(currentRole);

           localStorage.setItem("currentStudentName", userData.fullName);
           localStorage.setItem("currentStudentId", studentId);
           localStorage.setItem("currentUserRole", currentRole);

           setShowLoginModal(false);
           toast.success(`🦄 Xin chào ${userData.fullName}! Chúc bạn thi tốt.`); 
           navigate('/dashboard'); 
        } else { toast.error("❌ Sai mật khẩu! Vui lòng thử lại."); }
      } else { toast.error("❌ Mã học viên không tồn tại!"); }
    } catch (error) { console.error(error); toast.error("❌ Lỗi kết nối Server: " + error.message); }
  };

  const handleChangePassSubmit = async (e) => {
    e.preventDefault();
    const { studentId, oldPass, newPass, confirmPass } = passForm;
    if (studentId.length !== 8) { toast.warning("⚠️ Vui lòng nhập đúng Mã học viên!"); return; }
    if (newPass.length < 6) { toast.warning("⚠️ Mật khẩu mới phải từ 6 ký tự!"); return; }
    if (newPass !== confirmPass) { toast.error("❌ Xác nhận mật khẩu không khớp!"); return; }

    try {
        const dbRef = ref(db);
        const snapshot = await get(child(dbRef, `users/${studentId}`));
        if (snapshot.exists()) {
            const userData = snapshot.val();
            if (userData.password === oldPass) {
                await update(ref(db, `users/${studentId}`), { password: newPass });
                toast.success("✅ Đổi mật khẩu thành công! Vui lòng đăng nhập lại.");
                setModalView('login');
                setCredentials({ studentId: studentId, password: '' });
                setPassForm({ studentId: '', oldPass: '', newPass: '', confirmPass: '' });
            } else { toast.error("❌ Mật khẩu cũ không đúng!"); }
        } else { toast.error("❌ Mã học viên không tồn tại!"); }
    } catch (error) { console.error(error); toast.error("❌ Lỗi hệ thống: " + error.message); }
  };

  const handleResetPassSubmit = async (e) => {
    e.preventDefault();
    const { studentId } = passForm;
    if (!studentId || studentId.length !== 8) { toast.warning("⚠️ Vui lòng nhập đúng Mã học viên (8 số)!"); return; }
    try {
        const dbRef = ref(db);
        const snapshot = await get(child(dbRef, `users/${studentId}`));
        if (snapshot.exists()) {
            await update(ref(db, `users/${studentId}`), { password: "BAVNbavn" });
            toast.success("✅ Khôi phục thành công! Mật khẩu mới là: BAVNbavn", { autoClose: 8000 });
            setModalView('login');
            setCredentials({ studentId: studentId, password: '' });
            setPassForm({ ...passForm, studentId: '' });
        } else { toast.error("❌ Mã học viên không tồn tại!"); }
    } catch (error) { console.error(error); toast.error("❌ Lỗi hệ thống: " + error.message); }
  };

  const handleLogout = () => {
    setIsMenuOpen(false); 
    setIsLoggedIn(false); setIsAdmin(false); 
    setStudentName(''); setUserRole('normal'); 

    localStorage.removeItem("currentStudentId");
    localStorage.removeItem("currentStudentName");
    localStorage.removeItem("currentUserRole"); 
    navigate('/'); 
  };

  const openModal = () => { setModalView('login'); setShowLoginModal(true); }

  const isTestingPage = location.pathname.startsWith('/do-test/') || location.pathname === '/writing-practice';

  return (
    <div className="app-container"> 
      <ToastContainer position="top-right" autoClose={3000} theme="colored" />
      
      {!isTestingPage && (
        <nav className="main-navbar">
            <Link to="/" className="nav-center-logo">
                <img src="/images/logo.png" alt="BeableVN Logo" className="nav-logo-img"/>
            </Link>
            
            <div className="nav-right-text">
                {isLoggedIn ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    
                    <div style={{ position: 'relative', zIndex: 9999 }} ref={dropdownRef}>
                      <div 
                        onClick={() => setIsMenuOpen(!isMenuOpen)} 
                        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', background: '#f1f5f9', padding: '6px 15px 6px 6px', borderRadius: '30px', border: '1px solid #e2e8f0', fontWeight: 'bold', color: '#2B6830', userSelect: 'none' }}
                      >
                        <div style={{ width: '32px', height: '32px', flexShrink: 0, borderRadius: '50%', background: '#2B6830', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <i className="fa-solid fa-user" style={{ fontSize: '14px' }}></i>
                        </div>
                        <span style={{ fontSize: '0.9rem' }}>Xin chào, <strong>{studentName}</strong></span> 
                        <i className="fa-solid fa-chevron-down" style={{ fontSize: '14px', transform: isMenuOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }}></i>
                      </div>

                      {isMenuOpen && (
                        <div style={{ position: 'absolute', top: '125%', right: 0, background: '#fff', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', borderRadius: '10px', overflow: 'hidden', minWidth: '220px', border: '1px solid #eee', textAlign: 'left' }}>
                          <div style={{ padding: '12px 15px', borderBottom: '1px solid #f1f5f9', color: '#64748b', fontSize: '0.85rem' }}>Tài khoản cá nhân</div>
                          
                          <div 
                              onClick={() => { setIsMenuOpen(false); setShowInProgressModal(true); fetchInProgressTests(); }} 
                              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 15px', color: '#3D8B47', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 'bold' }} 
                              onMouseOver={e => e.target.style.background = '#E8F4EC'} 
                              onMouseOut={e => e.target.style.background = '#fff'}
                          >
                              <i className="fa-solid fa-clock-rotate-left"></i> Tiếp tục làm bài
                          </div>

                          {/* 👉 NÚT DUYỆT ĐỀ ĐÃ ĐƯỢC CHUYỂN VÀO ĐÂY */}
                          {userRole === 'private' && (
                              <Link to="/review-hub" onClick={() => setIsMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 15px', color: '#d97706', textDecoration: 'none', fontSize: '0.95rem', fontWeight: 'bold' }} onMouseOver={e => e.target.style.background = '#fef3c7'} onMouseOut={e => e.target.style.background = '#fff'}>
                                  <i className="fa-solid fa-clipboard-check"></i> Duyệt đề Pending
                              </Link>
                          )}
          
                          <Link to="/history" onClick={() => setIsMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 15px', color: '#334155', textDecoration: 'none', fontSize: '0.95rem', borderTop: userRole === 'private' ? '1px solid #f1f5f9' : 'none' }} onMouseOver={e => e.target.style.background = '#f8fafc'} onMouseOut={e => e.target.style.background = '#fff'}>
                              <i className="fa-solid fa-clock-rotate-left" style={{ color: '#2B6830' }}></i> Xem lịch sử bài làm
                          </Link>
                          
                          <div onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 15px', color: '#dc2626', cursor: 'pointer', fontSize: '0.95rem', borderTop: '1px solid #f1f5f9' }} onMouseOver={e => e.target.style.background = '#fef2f2'} onMouseOut={e => e.target.style.background = '#fff'}>
                              <i className="fa-solid fa-arrow-right-from-bracket"></i> Thoát hệ thống
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null }
            </div>
        </nav>
      )}

      {/* --- MODAL LOGIN --- */}
      {showLoginModal && (
        <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
           <div className="modal-box" onClick={(e) => e.stopPropagation()}>
              <button className="close-modal" onClick={() => setShowLoginModal(false)}>×</button>
              {modalView === 'login' && (
                  <>
                    <h2 style={{color:'#2B6830', marginTop:0}}>ĐĂNG NHẬP</h2>
                    <p style={{color:'#666', fontSize:'14px'}}>Hệ thống thi thử IELTS Online</p>
                    <form onSubmit={handleLoginSubmit}>
                        <div style={{textAlign:'left', fontSize:'12px', fontWeight:'bold', marginTop:10, color:'#555'}}>MÃ HỌC VIÊN</div>
                        <input type="text" className="login-input" placeholder="Nhập 8 số ID..." value={credentials.studentId} onChange={handleIdChange} inputMode="numeric" />
                        <div style={{textAlign:'left', fontSize:'12px', fontWeight:'bold', marginTop:10, color:'#555'}}>MẬT KHẨU</div>
                        <input type="password" className="login-input" placeholder="Nhập mật khẩu..." value={credentials.password} onChange={(e) => setCredentials({...credentials, password: e.target.value})} />
                        <button type="submit" className="btn-submit-login">TRUY CẬP HỆ THỐNG</button>
                    </form>
                    <div style={{marginTop:'20px', fontSize:'13px', display:'flex', flexDirection:'column', gap:'8px'}}>
                        <span onClick={() => setModalView('change-pass')} className="link-switch-mode"><i className="fa-solid fa-key"></i> Đổi mật khẩu</span>
                        <span onClick={() => setModalView('reset-pass')} className="link-switch-mode" style={{color:'#d32f2f'}}><i className="fa-solid fa-life-ring"></i> Quên mật khẩu?</span>
                    </div>
                  </>
              )}
              {modalView === 'change-pass' && (
                  <>
                    <h3 style={{color:'#2B6830', marginTop:0}}>ĐỔI MẬT KHẨU</h3>
                    <p style={{color:'#666', fontSize:'13px', fontStyle:'italic'}}>Nhập thông tin xác thực để đổi mật khẩu mới</p>
                    <form onSubmit={handleChangePassSubmit}>
                        <div style={{textAlign:'left', fontSize:'12px', fontWeight:'bold', marginTop:10, color:'#555'}}>Mã Học Viên</div>
                        <input type="text" className="login-input" placeholder="Nhập 8 số ID..." value={passForm.studentId} onChange={(e) => {if(/^\d*$/.test(e.target.value) && e.target.value.length<=8) setPassForm({...passForm, studentId: e.target.value})}} />
                        <div style={{textAlign:'left', fontSize:'12px', fontWeight:'bold', marginTop:10, color:'#555'}}>Mật khẩu cũ</div>
                        <input type="password" className="login-input" placeholder="Nhập mật khẩu hiện tại..." value={passForm.oldPass} onChange={(e) => setPassForm({...passForm, oldPass: e.target.value})} />
                        <div style={{textAlign:'left', fontSize:'12px', fontWeight:'bold', marginTop:10, color:'#555'}}>Mật khẩu mới</div>
                        <input type="password" className="login-input" placeholder="Mật khẩu mới (min 6 ký tự)" value={passForm.newPass} onChange={(e) => setPassForm({...passForm, newPass: e.target.value})} />
                        <div style={{textAlign:'left', fontSize:'12px', fontWeight:'bold', marginTop:10, color:'#555'}}>Xác nhận mật khẩu</div>
                        <input type="password" className="login-input" placeholder="Nhập lại mật khẩu mới..." value={passForm.confirmPass} onChange={(e) => setPassForm({...passForm, confirmPass: e.target.value})} />
                        <button type="submit" className="btn-submit-login" style={{background:'#28a745'}}>LƯU MẬT KHẨU MỚI</button>
                    </form>
                    <div style={{marginTop:'15px', fontSize:'13px'}}>
                        <span onClick={() => setModalView('login')} className="link-switch-mode"><i className="fa-solid fa-arrow-left"></i> Quay lại Đăng nhập</span>
                    </div>
                  </>
              )}
              {modalView === 'reset-pass' && (
                  <>
                    <h3 style={{color:'#d32f2f', marginTop:0}}>KHÔI PHỤC MẬT KHẨU</h3>
                    <p style={{color:'#666', fontSize:'13px'}}>Nhập ID để reset mật khẩu về mặc định</p>
                    <form onSubmit={handleResetPassSubmit}>
                        <div style={{textAlign:'left', fontSize:'12px', fontWeight:'bold', marginTop:10, color:'#555'}}>Mã Học Viên</div>
                        <input type="text" className="login-input" placeholder="Nhập 8 số ID..." value={passForm.studentId} onChange={(e) => {if(/^\d*$/.test(e.target.value) && e.target.value.length<=8) setPassForm({...passForm, studentId: e.target.value})}} />
                        <button type="submit" className="btn-submit-login" style={{background:'#d32f2f'}}>XÁC NHẬN KHÔI PHỤC</button>
                    </form>
                    <div style={{marginTop:'20px', fontSize:'13px'}}>
                        <span onClick={() => setModalView('login')} className="link-switch-mode"><i className="fa-solid fa-arrow-left"></i> Quay lại Đăng nhập</span>
                    </div>
                  </>
              )}
           </div>
        </div>
      )}

      <div className="app-content">
        <Routes>
          <Route path="/" element={ !isLoggedIn ? <LandingPage onOpenLogin={openModal} /> : (isAdmin ? <Navigate to="/admin" /> : <Navigate to="/dashboard" />) } />         
          <Route path="/admin" element={<AdminRoute isAdmin={isAdmin}><AdminPage /></AdminRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute isLoggedIn={isLoggedIn}><HomePage /></ProtectedRoute>} />
          <Route path="/test-menu/:testId" element={<ProtectedRoute isLoggedIn={isLoggedIn}><TestMenuPage /></ProtectedRoute>} />
          <Route path="/do-test/:testId/:skill" element={<ProtectedRoute isLoggedIn={isLoggedIn}><FullTestPage /></ProtectedRoute>} />
          <Route path="/writing-library" element={<ProtectedRoute isLoggedIn={isLoggedIn}><WritingLibraryPage /></ProtectedRoute>} />
          <Route path="/writing-practice" element={<ProtectedRoute isLoggedIn={isLoggedIn}><WritingTestPage /></ProtectedRoute>} />
          <Route path="/writing-practice/:id" element={<ProtectedRoute isLoggedIn={isLoggedIn}><WritingTestPage /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute isLoggedIn={isLoggedIn}><TestHistoryPage /></ProtectedRoute>} />
          
          <Route path="/review-hub" element={<ProtectedRoute isLoggedIn={isLoggedIn}><ReviewHubPage /></ProtectedRoute>} />
        </Routes>
      </div>

      {!isTestingPage && (
        <footer className="main-footer" style={{ height: 'auto', padding: '12px 20px', flexDirection: 'column', textAlign: 'center', gap: '5px' }}>
          <div>©2026 Be Able VN. All rights reserved.</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
            No part of this document may be reproduced or transmitted in any form or by any means, electronic, mechanical, photocopying, recording, or otherwise, without prior written permission of Be Able VN.
          </div>
        </footer>
      )}
      {/* ========================================== */}
      {/* 🚀 MODAL: DANH SÁCH BÀI LÀM DANG DỞ       */}
      {/* ========================================== */}
      {showInProgressModal && (
        <div className="modal-overlay" onClick={() => setShowInProgressModal(false)} style={{ zIndex: 99999 }}>
           <div className="modal-box-test" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px', padding: '30px' }}>
              <button className="close-modal" onClick={() => setShowInProgressModal(false)}>×</button>
              
              <h2 style={{color:'#2B6830', marginTop:0, display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '2px solid #f1f5f9', paddingBottom: '15px'}}>
                  <i className="fa-solid fa-clock-rotate-left" style={{ color: '#3D8B47' }}></i> BÀI THI ĐANG LÀM
              </h2>
              <p style={{color:'#64748b', fontSize:'0.95rem', marginBottom: '20px'}}>
                  Hệ thống tự động sao lưu tiến độ của bạn. Chọn bài thi bên dưới để tiếp tục.
              </p>

              {loadingDrafts ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#3D8B47' }}>
                      <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2rem' }}></i>
                      <p>Đang tìm dữ liệu của bạn...</p>
                  </div>
              ) : inProgressTests.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                      <i className="fa-regular fa-face-smile-beam" style={{ fontSize: '3rem', color: '#94a3b8', marginBottom: '15px' }}></i>
                      <h3 style={{ color: '#475569', margin: '0 0 10px 0' }}>Chưa có bản nháp nào!</h3>
                      <p style={{ color: '#64748b', margin: 0 }}>Bạn đã hoàn thành xuất sắc mọi bài thi.</p>
                  </div>
              ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '400px', overflowY: 'auto', paddingRight: '5px' }}>
                      {inProgressTests.map((item, idx) => {
                          // 👇 ĐOẠN CODE TỰ ĐỘNG TÍNH THỜI GIAN ĐẾM NGƯỢC
                          let countdownText = "";
                          const itemTime = item.date; // Trong logic của bạn, ngày cập nhật lưu ở item.date
                          if (itemTime) {
                              const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
                              const expireTimeMs = new Date(itemTime).getTime() + THREE_DAYS_MS;
                              const timeRemainingMs = expireTimeMs - Date.now();

                              if (timeRemainingMs > 0) {
                                  const hoursLeft = Math.floor(timeRemainingMs / (1000 * 60 * 60));
                                  const minutesLeft = Math.floor((timeRemainingMs % (1000 * 60 * 60)) / (1000 * 60));
                                  countdownText = `(Còn ${hoursLeft}h ${minutesLeft}m sẽ xóa)`;
                              } else {
                                  countdownText = "(Sắp bị xóa)";
                              }
                          }

                          return (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                  
                                  <div>
                                      <div style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '1.05rem', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                          <span>
                                              {item.type === 'writing' ? '📝 Writing Practice' : '🎧 Mock Test'}
                                              <span style={{ color: '#3D8B47', marginLeft: '5px' }}>({item.id.replace(/_x/g, '').replace(/x_/g, '')})</span>
                                          </span>

                                          {/* 👇 HIỂN THỊ LABEL ĐẾM NGƯỢC ĐỎ CẢNH BÁO KẾ BÊN TÊN BÀI THI 👇 */}
                                          {countdownText && (
                                              <span style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: '500', background: '#fef2f2', padding: '2px 6px', borderRadius: '4px', border: '1px solid #fca5a5' }}>
                                                  <i className="fa-solid fa-hourglass-half" style={{ marginRight: '4px', fontSize: '0.75rem' }}></i> {countdownText}
                                              </span>
                                          )}
                                      </div>
                                      <div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', gap: '15px' }}>
                                          <span><i className="fa-regular fa-clock"></i> Còn: {Math.floor(item.time / 60)} phút</span>
                                          <span><i className="fa-regular fa-calendar-days"></i> Cập nhật: {new Date(item.date).toLocaleString('vi-VN')}</span>
                                      </div>
                                  </div>

                                  <div style={{ display: 'flex', gap: '10px' }}>
                                      <button onClick={() => handleContinueDraft(item)} style={{ background: '#0ea5e9', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }} onMouseOver={e => e.target.style.background = '#0284c7'} onMouseOut={e => e.target.style.background = '#0ea5e9'}>
                                          TIẾP TỤC
                                      </button>
                                      <button onClick={() => handleDeleteDraft(item.type, item.id)} style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', transition: '0.2s' }} onMouseOver={e => e.target.style.background = '#fee2e2'} onMouseOut={e => e.target.style.background = '#fef2f2'}>
                                          <i className="fa-solid fa-trash-can"></i>
                                      </button>
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
}

export default App;
// src/pages/ReviewHubPage.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, get, child, update, remove } from "firebase/database";
import { toast, ToastContainer } from 'react-toastify'; 
import 'react-toastify/dist/ReactToastify.css';

// 👉 THÊM useNavigate ĐỂ CHUYỂN TRANG
import { useNavigate } from 'react-router-dom';

export default function ReviewHubPage() {
  const navigate = useNavigate(); // Khởi tạo hook chuyển trang

  const [pendingMocks, setPendingMocks] = useState([]);
  const [pendingWritings, setPendingWritings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('mock'); 

  const fetchPendingData = async () => {
    setLoading(true);
    try {
      const dbRef = ref(db);
      
      const mockSnap = await get(child(dbRef, 'mockTests'));
      let mocks = [];
      if (mockSnap.exists()) {
        const allMocks = Object.values(mockSnap.val());
        mocks = allMocks.filter(test => test.status === 'pending');
      }

      const writeSnap = await get(child(dbRef, 'writingLibrary'));
      let writings = [];
      if (writeSnap.exists()) {
        const allWritings = Object.values(writeSnap.val());
        writings = allWritings.filter(item => item.status === 'pending');
      }

      setPendingMocks(mocks);
      setPendingWritings(writings);

    } catch (error) {
      console.error("Lỗi khi tải dữ liệu chờ duyệt:", error);
      toast.error("Không thể tải danh sách chờ duyệt!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingData();
  }, []);

  // 👉 HÀM XEM THỬ ĐỀ (PREVIEW)
  const handlePreview = (item, isMock) => {
    if (isMock) {
        // Đẩy thẳng đến trang Test Menu của đề Mock đó
        navigate(`/test-menu/${item.id}`);
    } else {
        // Đẩy đến trang Writing Practice và truyền ID qua state
        navigate(`/writing-practice/${item.id}`, { state: { fromReviewHub: true } });
    }
  };

  const handleApprove = async (collection, id, title) => {
    if (!window.confirm(`Bạn có chắc chắn muốn XUẤT BẢN đề "${title}" (ID: ${id}) ra hệ thống chính thức không?`)) return;

    try {
      await update(ref(db, `${collection}/${id}`), { status: 'published' });
      toast.success(`🎉 Đã xuất bản thành công đề: ${id}`);
      fetchPendingData(); 
    } catch (error) {
      toast.error("❌ Lỗi xuất bản: " + error.message);
    }
  };

  const handleReject = async (collection, id, title) => {
    if (!window.confirm(`🚨 Bạn có chắc chắn muốn TỪ CHỐI và XÓA BỎ đề "${title}" (ID: ${id}) không? Hành động này không thể hoàn tác!`)) return;

    try {
      await remove(ref(db, `${collection}/${id}`));
      toast.success(`🗑️ Đã từ chối và xóa đề: ${id}`);
      fetchPendingData(); 
    } catch (error) {
      toast.error("❌ Lỗi xóa đề: " + error.message);
    }
  };

  if (loading) {
    return (
      <div style={{ width: '100%', padding: '100px 20px', textAlign: 'center', color: '#2B6830' }}>
        <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '3rem', marginBottom: '20px' }}></i>
        <h2>Đang tải Trung tâm Kiểm duyệt...</h2>
      </div>
    );
  }

  const renderTable = (data, isMock) => {
    // 1. ĐƯA HÀM NÀY LÊN ĐẦU TIÊN (Trước mọi lệnh return)
    const stripHtml = (html) => {
      if (!html) return '';
      return html.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim();
    };

    if (data.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '50px', background: 'white', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
          <i className="fa-regular fa-face-smile-wink" style={{ fontSize: '3rem', color: '#94a3b8', marginBottom: '15px' }}></i>
          <h3 style={{ color: '#475569', margin: 0 }}>Thật tuyệt vời!</h3>
          <p style={{ color: '#64748b' }}>Không có đề bài nào đang chờ duyệt lúc này.</p>
        </div>
      );
    }

    return (
      <div style={{ overflowX: 'auto', background: 'white', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#334155' }}>
              <th style={{ padding: '15px' }}>ID Đề bài</th>
              <th style={{ padding: '15px' }}>Tên / Tiêu đề</th>
              {isMock ? null : <th style={{ padding: '15px' }}>Loại Task</th>}
              <th style={{ padding: '15px', textAlign: 'center' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '15px', fontWeight: 'bold', color: '#0f172a' }}>{item.id}</td>
                
                {/* 2. ĐÃ GỌI HÀM STRIPHTML VÀO ĐÂY */}
                <td style={{ padding: '15px', color: '#475569' }}>
                  {isMock ? item.testName : stripHtml(item.title || item.question).substring(0, 80) + '...'}
                </td>
                
                {isMock ? null : (
                  <td style={{ padding: '15px' }}>
                    <span style={{ 
                        background: '#e0e7ff', color: '#0284c7', 
                        padding: '4px 10px', borderRadius: '12px', 
                        fontSize: '0.85rem', fontWeight: 'bold',
                        whiteSpace: 'nowrap'
                    }}>
                      {item.type}
                    </span>
                  </td>
                )}
                <td style={{ padding: '15px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    
                    <button 
                      onClick={() => handlePreview(item, isMock)}
                      style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}
                      title="Làm thử để kiểm tra"
                    >
                      <i className="fa-solid fa-play"></i> LÀM THỬ
                    </button>

                    <button 
                      onClick={() => handleApprove(isMock ? 'mockTests' : 'writingLibrary', item.id, isMock ? item.testName : item.id)}
                      style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}
                      title="Xuất bản lên hệ thống"
                    >
                      <i className="fa-solid fa-check"></i> DUYỆT
                    </button>
                    
                    <button 
                      onClick={() => handleReject(isMock ? 'mockTests' : 'writingLibrary', item.id, isMock ? item.testName : item.id)}
                      style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}
                      title="Từ chối và xóa bỏ"
                    >
                      <i className="fa-solid fa-xmark"></i> TỪ CHỐI
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 20px', minHeight: 'calc(100vh - 200px)' }}>
      <ToastContainer position="top-right" autoClose={3000} theme="colored" />
      
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ color: '#2B6830', margin: '0 0 10px 0', fontSize: '2.2rem' }}>
          <i className="fa-solid fa-clipboard-check"></i> TRẠM KIỂM DUYỆT ĐỀ
        </h1>
        <p style={{ color: '#64748b', fontSize: '1.1rem' }}>Xét duyệt các đề thi được gửi lên trước khi xuất bản chính thức.</p>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button 
          onClick={() => setActiveTab('mock')}
          style={{ 
            flex: 1, padding: '15px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer',
            background: activeTab === 'mock' ? '#c2410c' : '#fff', 
            color: activeTab === 'mock' ? '#fff' : '#64748b',
            border: activeTab === 'mock' ? 'none' : '1px solid #cbd5e1',
            borderRadius: '8px 8px 0 0', borderBottom: 'none'
          }}
        >
          <i className="fa-solid fa-headphones"></i> Mock Tests ({pendingMocks.length})
        </button>
        <button 
          onClick={() => setActiveTab('writing')}
          style={{ 
            flex: 1, padding: '15px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer',
            background: activeTab === 'writing' ? '#0f766e' : '#fff', 
            color: activeTab === 'writing' ? '#fff' : '#64748b',
            border: activeTab === 'writing' ? 'none' : '1px solid #cbd5e1',
            borderRadius: '8px 8px 0 0', borderBottom: 'none'
          }}
        >
          <i className="fa-solid fa-pen-nib"></i> Writing ({pendingWritings.length})
        </button>
      </div>

      <div style={{ background: 'transparent' }}>
        {activeTab === 'mock' ? renderTable(pendingMocks, true) : renderTable(pendingWritings, false)}
      </div>

    </div>
  );
}
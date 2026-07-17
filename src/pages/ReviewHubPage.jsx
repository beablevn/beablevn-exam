// src/pages/ReviewHubPage.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, get, child } from "firebase/database";
import { reviewApi } from '../utils/api';
import { toast, ToastContainer } from 'react-toastify';
import ConfirmDialog from '../components/ConfirmDialog';
import 'react-toastify/dist/ReactToastify.css';

// 👉 THÊM useNavigate ĐỂ CHUYỂN TRANG
import { useNavigate } from 'react-router-dom';

export default function ReviewHubPage() {
  const navigate = useNavigate(); // Khởi tạo hook chuyển trang

  const [pendingMocks, setPendingMocks] = useState([]);
  const [pendingWritings, setPendingWritings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('mock');
  const [confirmReq, setConfirmReq] = useState(null); // hop thoai xac nhan brand thay window.confirm

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

  const handleApprove = (collection, id, title) => {
    setConfirmReq({
      title: 'XUẤT BẢN ĐỀ NÀY?',
      message: `Đề "${title}" (ID: ${id}) sẽ được xuất bản ra hệ thống chính thức cho học viên làm bài.`,
      yesLabel: 'XUẤT BẢN',
      onYes: async () => {
        try {
          await reviewApi.setStatus(collection, id, 'published');
          toast.success(`🎉 Đã xuất bản thành công đề: ${id}`);
          fetchPendingData();
        } catch (error) {
          toast.error("❌ Lỗi xuất bản: " + error.message);
        }
      }
    });
  };

  const handleReject = (collection, id, title) => {
    setConfirmReq({
      title: 'TỪ CHỐI VÀ XÓA BỎ?',
      message: `Đề "${title}" (ID: ${id}) sẽ bị xóa vĩnh viễn khỏi hệ thống. Hành động này không thể hoàn tác!`,
      danger: true,
      yesLabel: 'XÓA VĨNH VIỄN',
      onYes: async () => {
        try {
          await reviewApi.setStatus(collection, id, 'reject');
          toast.success(`🗑️ Đã từ chối và xóa đề: ${id}`);
          fetchPendingData();
        } catch (error) {
          toast.error("❌ Lỗi xóa đề: " + error.message);
        }
      }
    });
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
                    {/* Badge dung tint Forest Green thay indigo/sky lech brand */}
                    <span style={{
                        background: '#E8F4EC', color: '#1E5225',
                        padding: '4px 10px', borderRadius: '999px',
                        fontSize: '0.85rem', fontWeight: 'bold',
                        whiteSpace: 'nowrap'
                    }}>
                      {item.type}
                    </span>
                  </td>
                )}
                <td style={{ padding: '15px', textAlign: 'center' }}>
                  {/* Nut theo he brand: hanh dong chinh Forest Green, duyet = success, tu choi = danger */}
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>

                    <button
                      onClick={() => handlePreview(item, isMock)}
                      style={{ background: '#2B6830', color: 'white', border: 'none', padding: '8px 12px', minHeight: '40px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}
                      title="Làm thử để kiểm tra"
                    >
                      <i className="fa-solid fa-play"></i> LÀM THỬ
                    </button>

                    <button
                      onClick={() => handleApprove(isMock ? 'mockTests' : 'writingLibrary', item.id, isMock ? item.testName : item.id)}
                      style={{ background: '#2E7D32', color: 'white', border: 'none', padding: '8px 12px', minHeight: '40px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}
                      title="Xuất bản lên hệ thống"
                    >
                      <i className="fa-solid fa-check"></i> DUYỆT
                    </button>

                    <button
                      onClick={() => handleReject(isMock ? 'mockTests' : 'writingLibrary', item.id, isMock ? item.testName : item.id)}
                      style={{ background: '#D32F2F', color: 'white', border: 'none', padding: '8px 12px', minHeight: '40px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}
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
    <div style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 20px', minHeight: 'calc(100vh - 200px)', width: '100%' }}>
      <ToastContainer position="top-right" autoClose={3000} theme="colored" />
      <ConfirmDialog req={confirmReq} onClose={() => setConfirmReq(null)} />

      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ color: '#2B6830', margin: '0 0 10px 0', fontSize: '2.2rem' }}>
          <i className="fa-solid fa-clipboard-check"></i> TRẠM KIỂM DUYỆT ĐỀ
        </h1>
        <p style={{ color: '#64748b', fontSize: '1.1rem' }}>Xét duyệt các đề thi được gửi lên trước khi xuất bản chính thức.</p>
      </div>

      {/* Tab active dung Forest Green thay cam gach #c2410c / teal #0f766e lech brand */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('mock')}
          style={{
            flex: 1, padding: '15px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer',
            background: activeTab === 'mock' ? '#2B6830' : '#fff',
            color: activeTab === 'mock' ? '#fff' : '#666666',
            border: activeTab === 'mock' ? 'none' : '1px solid #CBE3D2',
            borderRadius: '8px 8px 0 0', borderBottom: 'none'
          }}
        >
          <i className="fa-solid fa-headphones"></i> Mock Tests ({pendingMocks.length})
        </button>
        <button
          onClick={() => setActiveTab('writing')}
          style={{
            flex: 1, padding: '15px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer',
            background: activeTab === 'writing' ? '#2B6830' : '#fff',
            color: activeTab === 'writing' ? '#fff' : '#666666',
            border: activeTab === 'writing' ? 'none' : '1px solid #CBE3D2',
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
// src/pages/TestHistoryPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';

// Nhúng Firebase
import { ref, get, child, set } from "firebase/database";
import { db } from '../firebase';
import { toast } from 'react-toastify';
import ConfirmDialog from '../components/ConfirmDialog';

dayjs.extend(relativeTime);
dayjs.locale('vi');

export default function TestHistoryPage() {
    const navigate = useNavigate();
    const [history, setHistory] = useState([]);
    const [activeTab, setActiveTab] = useState('mock_test');
    const [confirmReq, setConfirmReq] = useState(null); // hop thoai xac nhan brand thay window.confirm
    
    // UI States
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedTestKey, setExpandedTestKey] = useState(null); 
    
    const currentStudentId = localStorage.getItem("currentStudentId") || "Guest";

    // 👉 TẢI VÀ GỘP DỮ LIỆU TỪ CẢ FIREBASE LẪN LOCALSTORAGE
    useEffect(() => {
        const fetchHistory = async () => {
            const savedHistory = JSON.parse(localStorage.getItem("ielts_history") || "[]");
            const localHistory = savedHistory.filter(record => record.studentId === currentStudentId);

            if (currentStudentId === "Guest") {
                localHistory.sort((a, b) => b.id - a.id); 
                setHistory(localHistory);
            } else {
                try {
                    const dbRef = ref(db);
                    const snapshot = await get(child(dbRef, `history/${currentStudentId}`));
                    
                    let firebaseArray = [];
                    if (snapshot.exists()) {
                        firebaseArray = Object.values(snapshot.val());
                    }

                    const mergedHistory = [...firebaseArray];
                    localHistory.forEach(localItem => {
                        if (!mergedHistory.find(m => m.id === localItem.id)) {
                            mergedHistory.push(localItem);
                        }
                    });

                    mergedHistory.sort((a, b) => b.id - a.id); 
                    setHistory(mergedHistory);
                } catch (error) {
                    console.error("Lỗi tải từ Firebase, dùng dữ liệu trên máy:", error);
                    toast.warn("⚠️ Không kết nối được máy chủ, đang hiển thị lịch sử lưu trên máy này.");
                    localHistory.sort((a, b) => b.id - a.id);
                    setHistory(localHistory);
                }
            }
        };
        fetchHistory();
    }, [currentStudentId]);

    // Ghi danh sach con lai: Firebase TRUOC (that bai thi giu nguyen UI + bao loi), roi moi cap nhat local
    const commitRemaining = async (remainingHistory) => {
        if (currentStudentId !== "Guest") {
            try {
                await set(ref(db, `history/${currentStudentId}`), remainingHistory);
            } catch (error) {
                console.error("Lỗi xóa Firebase:", error);
                toast.error("❌ Xóa trên máy chủ thất bại, lịch sử được giữ nguyên. Vui lòng thử lại.");
                return; // khong cap nhat UI/local de khong tao cam giac da xoa
            }
        }
        const allStorage = JSON.parse(localStorage.getItem("ielts_history") || "[]");
        const otherUsers = allStorage.filter(record => record.studentId !== currentStudentId);
        localStorage.setItem("ielts_history", JSON.stringify([...otherUsers, ...remainingHistory]));
        setHistory(remainingHistory);
        toast.success("🗑️ Đã xóa khỏi lịch sử.");
    };

    // 👉 LOGIC XÓA LỊCH SỬ CỦA TAB
    const clearTabHistory = () => {
        const tabName = activeTab === 'mock_test' ? 'L/R Mock Test' : 'Writing Test';
        setConfirmReq({
            title: 'XÓA TOÀN BỘ LỊCH SỬ?',
            message: `Toàn bộ lịch sử của phần ${tabName} sẽ bị xóa vĩnh viễn.\n(Lịch sử của các phần khác vẫn được giữ nguyên)`,
            danger: true,
            yesLabel: 'XÓA TẤT CẢ',
            onYes: () => commitRemaining(history.filter(item => item.type !== activeTab))
        });
    };

    // 👉 XÓA 1 BÀI THI KỸ NĂNG LẺ
    const deleteSingleRecord = (recordId, e) => {
        e.stopPropagation();
        setConfirmReq({
            title: 'XÓA KẾT QUẢ NÀY?',
            message: 'Kết quả bài thi sẽ bị xóa vĩnh viễn khỏi lịch sử.',
            danger: true,
            yesLabel: 'XÓA',
            onYes: () => commitRemaining(history.filter(item => item.id !== recordId))
        });
    };

    // 👉 LỌC DỮ LIỆU
    const displayedHistory = history.filter(item => {
        const matchTab = item.type === activeTab;
        const matchSearch = item.testName?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchTab && matchSearch;
    });

    // 👉 GOM NHÓM 2 CẤP
    const groupedHistory = useMemo(() => {
        const groups = {};
        displayedHistory.forEach(record => {
            const dateStr = dayjs(record.date).format('DD/MM/YYYY');
            const testName = record.testName || 'Bài thi không tên';

            if (!groups[dateStr]) groups[dateStr] = {};
            if (!groups[dateStr][testName]) groups[dateStr][testName] = [];
            
            groups[dateStr][testName].push(record);
        });
        return groups;
    }, [displayedHistory]);

    const toggleExpand = (key) => {
        setExpandedTestKey(prev => prev === key ? null : key);
    };

    const renderWritingSubScores = (record) => {
        if (!record.t1Band && !record.t2Band) return null; 
        
        // Cap badge theo brand: T1 xanh Forest tint, T2 amber (amber thuoc he mau chuc nang cho phep)
        const badgeStyleT1 = { background: '#E8F4EC', color: '#1E5225', border: '1px solid #CBE3D2', padding: '2px 6px', borderRadius: '6px', fontWeight: '800', fontSize: '0.8rem', whiteSpace: 'nowrap' };
        const badgeStyleT2 = { background: '#FEF6E7', color: '#B45309', border: '1px solid #F2DFB8', padding: '2px 6px', borderRadius: '6px', fontWeight: '800', fontSize: '0.8rem', whiteSpace: 'nowrap' };

        if (record.skill === 'TASK 1') return <div style={{ marginTop: '5px' }}><span style={badgeStyleT1}>T1: {record.t1Band || 'N/A'}</span></div>;
        if (record.skill === 'TASK 2') return <div style={{ marginTop: '5px' }}><span style={badgeStyleT2}>T2: {record.t2Band || 'N/A'}</span></div>;
        
        return (
            <div style={{ marginTop: '5px', display: 'flex', gap: '6px', justifyContent: 'flex-start', flexWrap: 'wrap' }}>
                <span style={badgeStyleT1}>T1: {record.t1Band || 'N/A'}</span>
                <span style={badgeStyleT2}>T2: {record.t2Band || 'N/A'}</span>
            </div>
        );
    };

    return (
        /* 👉 KHUNG CHỨA THÔNG MINH: Rộng tối đa 1000px trên PC, tự co giãn 100% trên Điện thoại */
            <div className="homepage-wrapper">
                <ConfirmDialog req={confirmReq} onClose={() => setConfirmReq(null)} />
                <div className="hp-container">
                
                    {/* Điều chỉnh Header một chút để đồng bộ font chữ to, đậm giống Homepage */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
                        <button 
                            onClick={() => navigate(-1)} 
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', background: '#fff', color: '#2B6830', border: '1px solid #e2e8f0', borderRadius: '50%', cursor: 'pointer', transition: '0.2s', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}
                            onMouseOver={(e) => { e.target.style.background = '#f1f5f9'; }}
                            onMouseOut={(e) => { e.target.style.background = '#fff'; }}
                        >
                            <i className="fa-solid fa-arrow-left" style={{ pointerEvents: 'none' }}></i>
                        </button>
                        {/* clamp(): tu co tren man hep, media query khong ghi de duoc inline style */}
                        <h1 style={{ color: '#2B6830', margin: 0, fontSize: 'clamp(1.4rem, 5vw, 2.2rem)', fontWeight: '900', letterSpacing: '-1px', textTransform: 'uppercase' }}>
                            Lịch Sử Làm Bài
                        </h1>
                </div>

                {/* Thanh tab dung tint Forest Green thay slate */}
                <div style={{ display: 'flex', background: '#E8F4EC', padding: '6px', borderRadius: '12px', marginBottom: '25px' }}>
                    <button
                        onClick={() => {setActiveTab('mock_test'); setExpandedTestKey(null);}}
                        style={{ flex: 1, padding: '12px 0', minHeight: '44px', background: activeTab === 'mock_test' ? '#fff' : 'transparent', border: 'none', borderRadius: '8px', color: activeTab === 'mock_test' ? '#2B6830' : '#666666', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', transition: '0.2s', boxShadow: activeTab === 'mock_test' ? '0 2px 5px rgba(0,0,0,0.05)' : 'none' }}
                    >
                        <i className="fa-solid fa-headphones" style={{ marginRight: '8px' }}></i> Mock Test
                    </button>
                    <button
                        onClick={() => {setActiveTab('writing'); setExpandedTestKey(null);}}
                        style={{ flex: 1, padding: '12px 0', minHeight: '44px', background: activeTab === 'writing' ? '#fff' : 'transparent', border: 'none', borderRadius: '8px', color: activeTab === 'writing' ? '#2B6830' : '#666666', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', transition: '0.2s', boxShadow: activeTab === 'writing' ? '0 2px 5px rgba(0,0,0,0.05)' : 'none' }}
                    >
                        <i className="fa-solid fa-pen-nib" style={{ marginRight: '8px' }}></i> Writing Test
                    </button>
                </div>

                <div style={{ marginBottom: '30px' }}>
                    <div style={{ position: 'relative' }}>
                        <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', top: '50%', left: '18px', transform: 'translateY(-50%)', color: '#2B6830' }}></i>
                        <input 
                            type="text" 
                            placeholder="Tìm kiếm tên đề thi (VD: Mock test 1)..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ width: '100%', padding: '15px 20px 15px 50px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', color: '#2B6830', fontSize: '1rem', outline: 'none', boxSizing: 'border-box', transition: '0.2s', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}
                            onFocus={(e) => e.target.style.borderColor = '#2B6830'}
                            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                        />
                    </div>
                </div>

                <div>
                    {Object.keys(groupedHistory).length === 0 ? (
                        <div style={{ padding: '60px 20px', textAlign: 'center', color: '#2B6830', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
                            <i className="fa-regular fa-folder-open" style={{ fontSize: '3.5rem', marginBottom: '15px', color: '#cbd5e1' }}></i>
                            <h3 style={{ margin: '0 0 8px 0', color: '#2B6830' }}>Chưa có dữ liệu</h3>
                            <p style={{ margin: 0, fontSize: '0.95rem', color: '#475569' }}>Bạn chưa hoàn thành bài thi nào ở mục này.</p>
                        </div>
                    ) : (
                        Object.keys(groupedHistory).map(dateStr => (
                            <div key={dateStr} style={{ marginBottom: '30px' }}>
                                <div style={{ display: 'inline-block', background: '#f8fafc', padding: '6px 14px', borderRadius: '8px', color: '#2B6830', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '15px', border: '1px solid #e2e8f0' }}>
                                    <i className="fa-regular fa-calendar-days" style={{ marginRight: '6px' }}></i>
                                    Ngày {dateStr}
                                </div>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {Object.keys(groupedHistory[dateStr]).map(testName => {
                                        const testRecords = groupedHistory[dateStr][testName]; 
                                        const expandKey = `${dateStr}-${testName}`;
                                        const isExpanded = expandedTestKey === expandKey;
                                        const completedSkillsCount = testRecords.length;

                                        return (
                                            <div key={expandKey} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: isExpanded ? '0 4px 15px rgba(0,0,0,0.05)' : '0 2px 5px rgba(0,0,0,0.02)', transition: 'all 0.2s ease-in-out' }}>
                                                
                                                <div 
                                                    onClick={() => toggleExpand(expandKey)}
                                                    style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: isExpanded ? '#f8fafc' : '#fff', transition: 'background 0.3s ease' }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: isExpanded ? '#e2e8f0' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2B6830', transition: 'background 0.3s ease', flexShrink: 0 }}>
                                                            <i className="fa-solid fa-chevron-right" style={{ fontSize: '0.85rem', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}></i>
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: '800', color: '#2B6830', fontSize: '1.1rem', textTransform: 'uppercase' }}>
                                                                {testName}
                                                            </div>
                                                            <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '2px' }}>
                                                                Đã hoàn thành {completedSkillsCount} phần thi
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateRows: isExpanded ? '1fr' : '0fr', transition: 'grid-template-rows 0.3s ease-in-out' }}>
                                                    <div style={{ overflow: 'hidden' }}>
                                                        <div style={{ background: '#fafbfc', borderTop: '1px solid #f1f5f9' }}>
                                                            {testRecords.map((record, index) => {
                                                                const isWritingRecord = record.type === 'writing' || record.skill === 'WRITING';
                                                                // Record SAT Adaptive: hien scaled score /800 + raw + nhanh
                                                                const isSatRecord = record.type === 'sat_adaptive';
                                                                const isLast = index === testRecords.length - 1;

                                                                return (
                                                                    <div key={record.id} style={{ padding: '16px 20px 16px 64px', borderBottom: isLast ? 'none' : '1px solid #f1f5f9', display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                        
                                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                                                                                <span style={{ fontSize: '0.75rem', background: isWritingRecord ? '#E8F4EC' : '#FEF6E7', color: isWritingRecord ? '#1E5225' : '#B45309', padding: '4px 8px', borderRadius: '6px', fontWeight: '800', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                                                                                    {record.skill}
                                                                                </span>
                                                                                <span style={{ color: '#475569', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                                                                                    <i className="fa-regular fa-clock" style={{ marginRight: '4px' }}></i> 
                                                                                    {dayjs(record.date).format('HH:mm')}
                                                                                </span>
                                                                            </div>
                                                                            {isWritingRecord && renderWritingSubScores(record)}
                                                                            {isSatRecord && (
                                                                                <div style={{ marginTop: '5px' }}>
                                                                                    <span style={{ fontSize: '0.78rem', background: '#E8F4EC', color: '#1E5225', padding: '3px 8px', borderRadius: '6px', fontWeight: '700' }}>
                                                                                        Raw {record.score}/{record.total} • {record.branch === 'harder' ? 'Nhánh Khó' : 'Nhánh Dễ'}
                                                                                    </span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexShrink: 0, marginLeft: '10px' }}>
                                                                            {/* Diem so dung Forest Green: do (danger) cho diem la sai ngu nghia, emerald lech brand */}
                                                                            <div style={{ fontWeight: '800', fontSize: '1.1rem', color: '#2B6830', whiteSpace: 'nowrap' }}>
                                                                                {isWritingRecord ? `Band ${record.band?.replace('Band: ', '')}` : isSatRecord ? `${record.scaledScore} / 800` : `${record.score} / ${record.total}`}
                                                                            </div>
                                                                            
                                                                            <button 
                                                                                onClick={(e) => deleteSingleRecord(record.id, e)}
                                                                                style={{ width: '40px', height: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#fff', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '6px', cursor: 'pointer', transition: '0.2s', flexShrink: 0 }}
                                                                                title="Xóa kết quả này"
                                                                                onMouseOver={(e) => { e.currentTarget.style.background = '#fef2f2'; }}
                                                                                onMouseOut={(e) => { e.currentTarget.style.background = '#fff'; }}
                                                                            >
                                                                                <i className="fa-regular fa-trash-can"></i>
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {displayedHistory.length > 0 && (
                    <div style={{ textAlign: 'center', marginTop: '40px' }}>
                        <button 
                            onClick={clearTabHistory} 
                            style={{ padding: '12px 24px', background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.95rem', transition: '0.2s', textDecoration: 'underline' }}
                            onMouseOver={(e) => { e.target.style.color = '#b91c1c'; }}
                            onMouseOut={(e) => { e.target.style.color = '#ef4444'; }}
                        >
                            <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '6px' }}></i> 
                            Xóa toàn bộ lịch sử {activeTab === 'mock_test' ? 'Mock Test' : 'Writing'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
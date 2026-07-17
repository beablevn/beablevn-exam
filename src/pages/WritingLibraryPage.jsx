// src/pages/WritingLibraryPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify'; 
import 'react-toastify/dist/ReactToastify.css'; 

// 👉 1. IMPORT FIREBASE
import { ref, get, child } from "firebase/database";
import { db } from '../firebase';

const TaskGroup = ({ groupName, items, type, selectedId, onSelect }) => {
    const [isOpen, setIsOpen] = useState(false); 
    const toggleOpen = () => setIsOpen(!isOpen);
    const folderIcon = type === 1 ? <i className="fa-solid fa-chart-simple"></i> : <i className="fa-solid fa-folder"></i>;

    return (
        <div className="topic-group">
            <div className={`topic-header ${isOpen ? 'active' : ''}`} onClick={toggleOpen}>
                <div className="topic-title-wrapper">
                    {folderIcon}
                    <span>{groupName}</span>
                    <span className="count-badge">{items.length}</span>
                </div>
                <i className={`fa-solid fa-chevron-down arrow-icon ${isOpen ? 'rotate' : ''}`}></i>
            </div>
            {isOpen && (
                <div className="topic-content show">
                    {items.map((item) => {
                        const isSelected = selectedId === item.id;
                        // Strip HTML tags từ nội dung ReactQuill để hiển thị text thuần trong card preview
                        const stripHtml = (html) => (html || "").replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
                        const desc = type === 1 ? stripHtml(item.title) : stripHtml(item.question);
                        const thumb = type === 1 ? (item.image || (item.images && item.images[0])) : null;
                        return (
                            <div key={item.id} className={`item-card ${isSelected ? 'selected' : ''}`} onClick={() => onSelect(item.id)}>
                                <div className="item-img-wrapper">
                                    {type === 1 ? <img src={thumb || "https://via.placeholder.com/60"} alt="T1" className="item-img"/> : <div className="item-icon-placeholder"><i className="fa-solid fa-pen-fancy"></i></div>}
                                </div>
                                <div className="item-info">
                                    <div className="item-title">Test {item.originalIndex}</div>
                                    <div className="item-desc">{desc}</div>
                                </div>
                                <i className={`fa-regular fa-circle-check check-icon ${isSelected ? 'checked' : ''}`}></i>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default function WritingLibraryPage() {
  const navigate = useNavigate();
  
  // 👉 2. KHAI BÁO STATE CHO DỮ LIỆU VÀ LOADING
  const [task1Library, setTask1Library] = useState([]);
  const [task2Library, setTask2Library] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedT1, setSelectedT1] = useState(null);
  const [selectedT2, setSelectedT2] = useState(null);
  const [isStarting, setIsStarting] = useState(false); // khoa nut START khi dang kiem tra khoa tai khoan tren Firebase
  const [searchT1, setSearchT1] = useState("");
  const [searchT2, setSearchT2] = useState("");

  // 👉 3. HÚT DỮ LIỆU TỪ FIREBASE KHI MỞ TRANG
  useEffect(() => {
    const fetchWritingData = async () => {
      try {
        const dbRef = ref(db);
        const snapshot = await get(child(dbRef, 'writingLibrary'));
        
        if (snapshot.exists()) {
          const data = snapshot.val();
          const allWriting = Object.values(data);
          
          // 🔥 LỌC BẢO MẬT: Chỉ lấy đề 'published'
          const publishedWriting = allWriting.filter(item => item.status === 'published');
          
          // Phân loại Task 1 và Task 2, đồng thời sắp xếp theo ID (t1_01, t1_02...) để giữ đúng thứ tự
          const t1 = publishedWriting
            .filter(item => item.type === 'TASK 1')
            .sort((a, b) => a.id.localeCompare(b.id));
            
          const t2 = publishedWriting
            .filter(item => item.type === 'TASK 2')
            .sort((a, b) => a.id.localeCompare(b.id));
          
          setTask1Library(t1);
          setTask2Library(t2);
        } else {
          setTask1Library([]);
          setTask2Library([]);
        }
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu Writing:", error);
        toast.error("Không thể kết nối tải danh sách đề Writing.");
      } finally {
        setLoading(false);
      }
    };

    fetchWritingData();
  }, []);

  const getTestLabel = (id, library) => {
      if (!id) return "None";
      const index = library.findIndex(item => item.id === id);
      if (index !== -1) return `Test ${index + 1}`;
      return id;
  };

  const groupData = (data, type, searchTerm) => {
    if (!data || data.length === 0) return {};
    const groups = {};
    const term = searchTerm.toLowerCase().trim();
    const isDigitSearch = /^\d+$/.test(term);

    data.forEach((item, index) => {
        const testNum = index + 1; 
        const strNum = testNum.toString();
        let groupName = type === 1 ? (item.category || "Mixed Charts") : (item.title || "General Issues"); 
        let isMatch = false;
        
        if (!term) { isMatch = true; } 
        else if (isDigitSearch) { if (strNum === term || strNum.startsWith(term)) isMatch = true; } 
        else {
            const content = (type === 1 ? item.title : item.question) || "";
            if (groupName.toLowerCase().includes(term) || content.toLowerCase().includes(term)) isMatch = true;
        }

        if (isMatch) {
            if (!groups[groupName]) groups[groupName] = [];
            item.originalIndex = testNum; 
            groups[groupName].push(item);
        }
    });
    return groups;
  };

  // Cập nhật useMemo để lắng nghe sự thay đổi của dữ liệu Firebase
  const groupedT1 = useMemo(() => groupData(task1Library, 1, searchT1), [searchT1, task1Library]);
  const groupedT2 = useMemo(() => groupData(task2Library, 2, searchT2), [searchT2, task2Library]);

  const handleSelectT1 = (id) => setSelectedT1(prev => prev === id ? null : id);
  const handleSelectT2 = (id) => setSelectedT2(prev => prev === id ? null : id);

  // 👉 HÀM GÁC CỔNG WRITING
  const handleStart = async () => {
    if (isStarting) return; // chan bam nhieu lan khi dang cho Firebase
    if (!selectedT1 && !selectedT2) { toast.warning("⚠️ Vui lòng chọn ít nhất một bài thi!"); return; }

    const studentId = localStorage.getItem("currentStudentId");

    // Kiểm tra khóa tài khoản trên Firebase
    if (studentId && studentId !== 'Guest') {
        setIsStarting(true);
        try {
            const snap = await get(child(ref(db), `users/${studentId}`));
            if (snap.exists() && snap.val().isLocked) {
                toast.error("🔒 TÀI KHOẢN BỊ KHÓA: Bạn không thể làm đề thi lúc này. Vui lòng liên hệ Admin!", { autoClose: 5000 });
                // 👉 Tuyệt chiêu hủy diệt: Xóa trắng bài đã chọn để nút Start bị vô hiệu hóa
                setSelectedT1(null);
                setSelectedT2(null);
                return;
            }
        } catch (error) {
            // Thong bao than thien thay vi error.message ky thuat cua Firebase
            console.error("Lỗi kiểm tra tài khoản:", error);
            toast.error("❌ Không kết nối được máy chủ, vui lòng kiểm tra mạng rồi thử lại.");
            return;
        } finally {
            setIsStarting(false);
        }
    }

    // Nếu an toàn thì cho đi tiếp
    const params = new URLSearchParams();
    if (selectedT1) params.append('t1', selectedT1);
    if (selectedT2) params.append('t2', selectedT2);
    let mode = 'full';
    if (selectedT1 && !selectedT2) mode = 'task1';
    if (!selectedT1 && selectedT2) mode = 'task2';
    params.append('mode', mode);
    navigate(`/writing-practice?${params.toString()}`);
  };

  return (
    <div className="library-container">
        <ToastContainer position="top-right" autoClose={3000} theme="colored" />
        <div className="lib-header-wrapper">
          
          <div className="hp-header">
              <div className="hp-title">
                <h1>IELTS PRACTICE TEST SYSTEM</h1>
              </div>
              <div className="hp-nav">
                <Link to="/dashboard" className="hp-link">MOCK TEST</Link>
                <Link to="/writing-library" className="hp-link active">WRITING</Link>
              </div>
          </div>

        </div>

        <div className="lib-body">
            {/* 👉 4. HIỂN THỊ LOADING HOẶC DỮ LIỆU */}
            {loading ? (
                <div style={{ width: '100%', textAlign: 'center', padding: '80px 20px', color: '#2B6830' }}>
                    <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2.5rem', marginBottom: '15px' }}></i>
                    <h3 style={{ margin: 0 }}>Đang kết nối thư viện Writing...</h3>
                    <p style={{ color: '#666' }}>Vui lòng chờ trong giây lát</p>
                </div>
            ) : (
                <>
                    <div className="lib-column">
                        <div className="col-header">
                            <h3 className="col-title"><i className="fa-solid fa-chart-pie"></i> Task 1 Library</h3>
                            <input type="text" className="search-box" placeholder="Search No. (1, 2) or Type..." value={searchT1} onChange={(e) => setSearchT1(e.target.value)} />
                        </div>
                        <div className="col-content">
                            {Object.keys(groupedT1).length === 0 ? <div style={{textAlign:'center', padding:'20px', color:'#999'}}>No tasks found</div> : Object.entries(groupedT1).map(([groupName, items]) => (
                                <TaskGroup key={groupName} groupName={groupName} items={items} type={1} selectedId={selectedT1} onSelect={handleSelectT1} />
                            ))}
                        </div>
                    </div>

                    <div className="lib-column">
                        <div className="col-header">
                            <h3 className="col-title"><i className="fa-solid fa-pen-nib"></i> Task 2 Library</h3>
                            <input type="text" className="search-box" placeholder="Search No. (1, 2) or Topic..." value={searchT2} onChange={(e) => setSearchT2(e.target.value)} />
                        </div>
                        <div className="col-content">
                            {Object.keys(groupedT2).length === 0 ? <div style={{textAlign:'center', padding:'20px', color:'#999'}}>No tasks found</div> : Object.entries(groupedT2).map(([groupName, items]) => (
                                <TaskGroup key={groupName} groupName={groupName} items={items} type={2} selectedId={selectedT2} onSelect={handleSelectT2} />
                            ))}
                        </div>
                    </div>

                    <div className="lib-sidebar">
                        <div className="sticky-box">
                            <h3 style={{marginTop:0, color:'#2B6830'}}>Your Selection</h3>
                            <div className="sel-row">
                                <div className="sel-label">Task 1</div>
                                <div className="sel-value">{selectedT1 ? <span style={{color:'#2E7D32'}}><i className="fa-solid fa-check"></i> {getTestLabel(selectedT1, task1Library)}</span> : <span style={{color:'#8A8A8A'}}>None</span>}</div>
                            </div>
                            <div className="sel-row">
                                <div className="sel-label">Task 2</div>
                                <div className="sel-value">{selectedT2 ? <span style={{color:'#2E7D32'}}><i className="fa-solid fa-check"></i> {getTestLabel(selectedT2, task2Library)}</span> : <span style={{color:'#8A8A8A'}}>None</span>}</div>
                            </div>
                            <button className="btn-lib-start" onClick={handleStart} disabled={isStarting} style={isStarting ? { opacity: 0.6, cursor: 'wait' } : undefined}>
                                {isStarting ? 'ĐANG KIỂM TRA...' : <>START PRACTICE <i className="fa-solid fa-arrow-right"></i></>}
                            </button>
                            <p style={{fontSize:'0.8rem', color:'#777', marginTop:'15px', lineHeight:'1.4'}}><i className="fa-solid fa-circle-info"></i> Select items from the lists on the left.</p>
                        </div>
                    </div>
                </>
            )}
        </div>
    </div>
  );
}
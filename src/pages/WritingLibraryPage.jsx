// src/pages/WritingLibraryPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// 👉 IMPORT FIREBASE (chỉ còn Task 1 lấy từ Firebase)
import { ref, get, child } from "firebase/database";
import { db } from '../firebase';

// 👉 NGÂN HÀNG ĐỀ TASK 2 (202 đề, nguồn local từ file NGAN HANG DE) + danh sách giá trị lọc
import { task2Library as TASK2_BANK, TASK2_FILTERS } from '../data/writing_library';

// Rút phần tiếng Anh sau dấu en dash của nhãn song ngữ ("... – Discuss both views" -> "Discuss both views")
const enPart = (s) => {
    if (!s) return "";
    const parts = String(s).split("–");
    return (parts.length > 1 ? parts[parts.length - 1] : s).trim();
};
// "Cấp 4 – Upper-Inter (6.0→7.0)" -> "Cấp 4"; "TO BE – Học..." -> "TO BE"
const shortLabel = (s) => (s ? String(s).split("–")[0].trim() : "");

// Các trường có thể chọn để nhóm danh sách Task 2
const GROUP_OPTIONS = [
    { key: 'level',  label: 'Cấp độ' },
    { key: 'topic',  label: 'Chủ đề' },
    { key: 'pillar', label: 'Nhóm 4 trụ' },
    { key: 'qtype',  label: 'Dạng đề' },
    { key: 'year',   label: 'Năm' },
    { key: 'unit',   label: 'Unit' },
];

const TaskGroup = ({ groupName, items, type, selectedId, onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const toggleOpen = () => setIsOpen(!isOpen);
    const folderIcon = type === 1 ? <i className="fa-solid fa-chart-simple"></i> : <i className="fa-solid fa-folder"></i>;
    // Strip HTML tags từ nội dung ReactQuill để hiển thị text thuần trong card preview
    const stripHtml = (html) => (html || "").replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

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
                        const desc = type === 1 ? stripHtml(item.title) : stripHtml(item.question);
                        const thumb = type === 1 ? (item.image || (item.images && item.images[0])) : null;
                        return (
                            <div key={item.id} className={`item-card ${isSelected ? 'selected' : ''}`} onClick={() => onSelect(item.id)}>
                                <div className="item-img-wrapper">
                                    {type === 1
                                        ? <img src={thumb || "https://via.placeholder.com/60"} alt="T1" className="item-img"/>
                                        : <div className="item-icon-placeholder"><i className="fa-solid fa-pen-fancy"></i></div>}
                                </div>
                                <div className="item-info">
                                    <div className="item-title">Test {item.originalIndex}</div>
                                    <div className={type === 2 ? "item-desc item-desc-multi" : "item-desc"}>{desc}</div>
                                    {type === 2 && (
                                        <div className="item-chips">
                                            {item.level && <span className="meta-chip chip-level">{shortLabel(item.level)}</span>}
                                            {item.qtype && <span className="meta-chip chip-type">{enPart(item.qtype)}</span>}
                                            {item.year && <span className="meta-chip chip-year">{item.year}</span>}
                                        </div>
                                    )}
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

  // Task 1 vẫn hút từ Firebase; Task 2 dùng ngân hàng local
  const [task1Library, setTask1Library] = useState([]);
  const [loadingT1, setLoadingT1] = useState(true);

  const [selectedT1, setSelectedT1] = useState(null);
  const [selectedT2, setSelectedT2] = useState(null);
  const [isStarting, setIsStarting] = useState(false); // khoa nut START khi dang kiem tra khoa tai khoan
  const [searchT1, setSearchT1] = useState("");
  const [searchT2, setSearchT2] = useState("");

  // 👉 BỘ LỌC TASK 2 (theo các cột trong file NGAN HANG DE)
  const [fLevel, setFLevel]   = useState("");
  const [fType, setFType]     = useState("");
  const [fPillar, setFPillar] = useState("");
  const [fTopic, setFTopic]   = useState("");
  const [fYear, setFYear]     = useState("");
  const [groupBy, setGroupBy] = useState("level"); // mặc định nhóm theo Cấp độ (giống thứ tự file)

  // Chỉ tải Task 1 từ Firebase khi mở trang
  useEffect(() => {
    const fetchTask1 = async () => {
      try {
        const snapshot = await get(child(ref(db), 'writingLibrary'));
        if (snapshot.exists()) {
          const allWriting = Object.values(snapshot.val());
          // LỌC BẢO MẬT: chỉ lấy đề Task 1 đã 'published'
          const t1 = allWriting
            .filter(item => item.status === 'published' && item.type === 'TASK 1')
            .sort((a, b) => a.id.localeCompare(b.id));
          setTask1Library(t1);
        } else {
          setTask1Library([]);
        }
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu Task 1:", error);
        toast.error("Không thể kết nối tải danh sách đề Task 1.");
      } finally {
        setLoadingT1(false);
      }
    };
    fetchTask1();
  }, []);

  const getTestLabel = (id, library) => {
      if (!id) return "None";
      const index = library.findIndex(item => item.id === id);
      if (index !== -1) return `Test ${index + 1}`;
      return id;
  };

  // ----- TASK 1: giữ nguyên nhóm theo category -----
  const groupedT1 = useMemo(() => {
    const data = task1Library;
    if (!data || data.length === 0) return {};
    const groups = {};
    const term = searchT1.toLowerCase().trim();
    const isDigitSearch = /^\d+$/.test(term);
    data.forEach((item, index) => {
        const testNum = index + 1;
        const strNum = testNum.toString();
        const groupName = item.category || "Mixed Charts";
        let isMatch = false;
        if (!term) isMatch = true;
        else if (isDigitSearch) { if (strNum === term || strNum.startsWith(term)) isMatch = true; }
        else {
            const content = item.title || "";
            if (groupName.toLowerCase().includes(term) || content.toLowerCase().includes(term)) isMatch = true;
        }
        if (isMatch) {
            if (!groups[groupName]) groups[groupName] = [];
            item.originalIndex = testNum;
            groups[groupName].push(item);
        }
    });
    return groups;
  }, [searchT1, task1Library]);

  // ----- TASK 2: lọc nhiều chiều + nhóm theo trường đã chọn (như file) -----
  const groupedT2 = useMemo(() => {
    const term = searchT2.toLowerCase().trim();
    const isDigitSearch = /^\d+$/.test(term);

    const filtered = TASK2_BANK.filter((item, index) => {
        item.originalIndex = item.testNo || (index + 1); // Test N = STT trong file gốc
        if (fLevel && item.level !== fLevel) return false;
        if (fType && item.qtype !== fType) return false;
        if (fPillar && item.pillar !== fPillar) return false;
        if (fTopic && item.topic !== fTopic) return false;
        if (fYear && String(item.year) !== String(fYear)) return false;
        if (!term) return true;
        if (isDigitSearch) return String(item.originalIndex) === term || String(item.originalIndex).startsWith(term);
        const hay = `${item.question} ${item.topic} ${item.pillar} ${item.qtype} ${item.unit}`.toLowerCase();
        return hay.includes(term);
    });

    // Thứ tự các nhóm bám theo danh sách giá trị đã sắp xếp sẵn trong data
    const orderMap = {
        level:  TASK2_FILTERS.levels,
        pillar: TASK2_FILTERS.pillars,
        qtype:  TASK2_FILTERS.qtypes,
        topic:  TASK2_FILTERS.topics,
        year:   (TASK2_FILTERS.years || []).map(String),
        unit:   TASK2_FILTERS.units,
    };
    const order = orderMap[groupBy] || [];

    const groups = {};
    filtered.forEach(item => {
        const key = groupBy === 'year' ? String(item.year) : (item[groupBy] || "Khác");
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
    });

    const ordered = {};
    order.forEach(k => { if (groups[k]) ordered[k] = groups[k]; });
    Object.keys(groups).forEach(k => { if (!ordered[k]) ordered[k] = groups[k]; }); // key ngoài danh sách (nếu có)
    return ordered;
  }, [searchT2, fLevel, fType, fPillar, fTopic, fYear, groupBy]);

  const t2Count = useMemo(() => Object.values(groupedT2).reduce((s, arr) => s + arr.length, 0), [groupedT2]);
  const hasFilter = fLevel || fType || fPillar || fTopic || fYear || searchT2;
  const clearFilters = () => { setFLevel(""); setFType(""); setFPillar(""); setFTopic(""); setFYear(""); setSearchT2(""); };

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
                setSelectedT1(null);
                setSelectedT2(null);
                return;
            }
        } catch (error) {
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
            {/* --- CỘT TASK 1 (Firebase) --- */}
            <div className="lib-column">
                <div className="col-header">
                    <h3 className="col-title"><i className="fa-solid fa-chart-pie"></i> Task 1 Library</h3>
                    <input type="text" className="search-box" placeholder="Search No. (1, 2) or Type..." value={searchT1} onChange={(e) => setSearchT1(e.target.value)} />
                </div>
                <div className="col-content">
                    {loadingT1
                        ? <div className="lib-col-loading"><i className="fa-solid fa-spinner fa-spin"></i> Đang tải Task 1...</div>
                        : Object.keys(groupedT1).length === 0
                            ? <div style={{textAlign:'center', padding:'20px', color:'#999'}}>No tasks found</div>
                            : Object.entries(groupedT1).map(([groupName, items]) => (
                                <TaskGroup key={groupName} groupName={groupName} items={items} type={1} selectedId={selectedT1} onSelect={handleSelectT1} />
                            ))}
                </div>
            </div>

            {/* --- CỘT TASK 2 (ngân hàng local + bộ lọc) --- */}
            <div className="lib-column">
                <div className="col-header">
                    <h3 className="col-title"><i className="fa-solid fa-pen-nib"></i> Task 2 Library <span className="col-count">{t2Count}/{TASK2_BANK.length} đề</span></h3>
                    <input type="text" className="search-box" placeholder="Tìm số (1, 2) hoặc từ khóa trong đề..." value={searchT2} onChange={(e) => setSearchT2(e.target.value)} />
                    <div className="lib-filters">
                        <select className="filter-select" value={fLevel} onChange={(e) => setFLevel(e.target.value)}>
                            <option value="">Cấp độ: Tất cả</option>
                            {TASK2_FILTERS.levels.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                        <select className="filter-select" value={fType} onChange={(e) => setFType(e.target.value)}>
                            <option value="">Dạng đề: Tất cả</option>
                            {TASK2_FILTERS.qtypes.map(v => <option key={v} value={v}>{enPart(v)}</option>)}
                        </select>
                        <select className="filter-select" value={fPillar} onChange={(e) => setFPillar(e.target.value)}>
                            <option value="">Nhóm 4 trụ: Tất cả</option>
                            {TASK2_FILTERS.pillars.map(v => <option key={v} value={v}>{shortLabel(v)}</option>)}
                        </select>
                        <select className="filter-select" value={fTopic} onChange={(e) => setFTopic(e.target.value)}>
                            <option value="">Chủ đề: Tất cả</option>
                            {TASK2_FILTERS.topics.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                        <select className="filter-select" value={fYear} onChange={(e) => setFYear(e.target.value)}>
                            <option value="">Năm: Tất cả</option>
                            {TASK2_FILTERS.years.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                        <div className="filter-groupby">
                            <span>Nhóm theo</span>
                            <select className="filter-select" value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
                                {GROUP_OPTIONS.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
                            </select>
                        </div>
                        {hasFilter && <button type="button" className="filter-clear" onClick={clearFilters}><i className="fa-solid fa-xmark"></i> Xóa lọc</button>}
                    </div>
                </div>
                <div className="col-content">
                    {t2Count === 0
                        ? <div style={{textAlign:'center', padding:'20px', color:'#999'}}>Không tìm thấy đề phù hợp bộ lọc</div>
                        : Object.entries(groupedT2).map(([groupName, items]) => (
                            <TaskGroup key={groupName} groupName={groupName} items={items} type={2} selectedId={selectedT2} onSelect={handleSelectT2} />
                        ))}
                </div>
            </div>

            {/* --- CỘT PHẢI: TÓM TẮT LỰA CHỌN --- */}
            <div className="lib-sidebar">
                <div className="sticky-box">
                    <h3 style={{marginTop:0, color:'#2B6830'}}>Your Selection</h3>
                    <div className="sel-row">
                        <div className="sel-label">Task 1</div>
                        <div className="sel-value">{selectedT1 ? <span style={{color:'#2E7D32'}}><i className="fa-solid fa-check"></i> {getTestLabel(selectedT1, task1Library)}</span> : <span style={{color:'#8A8A8A'}}>None</span>}</div>
                    </div>
                    <div className="sel-row">
                        <div className="sel-label">Task 2</div>
                        <div className="sel-value">{selectedT2 ? <span style={{color:'#2E7D32'}}><i className="fa-solid fa-check"></i> {getTestLabel(selectedT2, TASK2_BANK)}</span> : <span style={{color:'#8A8A8A'}}>None</span>}</div>
                    </div>
                    <button className="btn-lib-start" onClick={handleStart} disabled={isStarting} style={isStarting ? { opacity: 0.6, cursor: 'wait' } : undefined}>
                        {isStarting ? 'ĐANG KIỂM TRA...' : <>START PRACTICE <i className="fa-solid fa-arrow-right"></i></>}
                    </button>
                    <p style={{fontSize:'0.8rem', color:'#777', marginTop:'15px', lineHeight:'1.4'}}><i className="fa-solid fa-circle-info"></i> Select items from the lists on the left.</p>
                </div>
            </div>
        </div>
    </div>
  );
}

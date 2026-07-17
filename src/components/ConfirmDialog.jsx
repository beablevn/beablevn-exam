// src/components/ConfirmDialog.jsx
// Hop thoai xac nhan theo brand, thay the window.confirm() native (SOP cam dung).
// Dung chung voi state o component cha:
//   const [confirmReq, setConfirmReq] = useState(null);
//   setConfirmReq({ title: 'XOA TAI KHOAN?', message: '...', danger: true, onYes: async () => {...} });
//   <ConfirmDialog req={confirmReq} onClose={() => setConfirmReq(null)} />
// Style dung class .confirm-overlay/.confirm-box co san trong App.css.
import React from 'react';

export default function ConfirmDialog({ req, onClose }) {
  if (!req) return null;

  const handleYes = () => {
    onClose();
    // Goi sau khi dong modal de tranh setState chong cheo trong cung tick
    if (typeof req.onYes === 'function') req.onYes();
  };

  return (
    <div className="confirm-overlay" style={{ zIndex: 100000 }} onClick={onClose}>
      <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
        <h3 className="confirm-title" style={req.danger ? { color: '#D32F2F' } : undefined}>
          {req.title || 'XÁC NHẬN'}
        </h3>
        {/* pre-line: giu xuong dong \n trong message nhieu dong */}
        <p className="confirm-desc" style={{ whiteSpace: 'pre-line' }}>{req.message}</p>
        <div className="confirm-actions">
          <button className="btn-cancel" onClick={onClose}>HỦY</button>
          <button
            className="btn-confirm"
            style={req.danger ? { background: '#D32F2F' } : undefined}
            onClick={handleYes}
          >
            {req.yesLabel || 'ĐỒNG Ý'}
          </button>
        </div>
      </div>
    </div>
  );
}

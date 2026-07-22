// src/components/PasswordField.jsx
// Input mat khau dung chung, co icon con mat de hoc vien/nhan su xem lai mat khau vua go
// khi nghi ngo go sai — tranh phai doan mo/xoa go lai nhieu lan.
import { useState } from 'react';

export default function PasswordField({ value, onChange, placeholder, className, style }) {
  const [show, setShow] = useState(false);

  return (
    <div style={{ position: 'relative', ...style }}>
      <input
        type={show ? 'text' : 'password'}
        className={className}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{ width: '100%', boxSizing: 'border-box', paddingRight: '38px' }}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        tabIndex={-1}
        title={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        style={{
          position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer', color: '#888', padding: '4px',
          display: 'flex', alignItems: 'center',
        }}
      >
        <i className={show ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'}></i>
      </button>
    </div>
  );
}

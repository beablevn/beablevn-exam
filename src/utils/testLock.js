// src/utils/testLock.js
// 🔒 Mật khẩu riêng cho một số mock test (theo yêu cầu Bak) — dùng chung giữa
// HomePage (popup lúc bấm START TEST) và TestMenuPage (chặn nếu vào thẳng URL, tránh bypass).
// id khớp với field "id" trong src/data/fullmt/*.js (vd: Mock Test 1 -> "mt1", MQR 2 -> "mqr_test2").
const PASSWORD_PROTECTED_TEST_IDS = new Set(['mt1', 'mt2', 'mt3', 'mt4', 'mt29', 'mt30', 'mt31', 'mt32', 'mt33', 'mqr', 'mqr_test2']);
const PROTECTED_TEST_PASSWORD = '22674';
const unlockKey = (testId) => `examPwUnlocked_${testId}`;

export const isTestProtected = (testId) => PASSWORD_PROTECTED_TEST_IDS.has(testId);

// Mo khoa chi ton tai trong phien lam bai hien tai (sessionStorage) — quay lai Dashboard se bi xoa (xem clearAllTestUnlocks),
// chong hoc vien mo khoa 1 lan roi lam gian doan nhieu de khac nhau ma khong phai nhap lai mat khau.
export const isTestUnlocked = (testId) => !isTestProtected(testId) || sessionStorage.getItem(unlockKey(testId)) === '1';

export const tryUnlockTest = (testId, password) => {
  if (password.trim() !== PROTECTED_TEST_PASSWORD) return false;
  sessionStorage.setItem(unlockKey(testId), '1');
  return true;
};

// Goi khi vao lai Dashboard: xoa het cac de da mo khoa, buoc nhap lai mat khau lan sau bam Start Test.
export const clearAllTestUnlocks = () => {
  Object.keys(sessionStorage)
    .filter((k) => k.startsWith('examPwUnlocked_'))
    .forEach((k) => sessionStorage.removeItem(k));
};

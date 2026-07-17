// src/utils/api.js
// ============================================================
// Goi cac Cloud Function onCall + dang nhap bang custom token.
// Moi ghi nhay cam (users/mockTests/writingLibrary) di qua day, KHONG con
// ghi thang RTDB tu client. Rules chi cho ghi khi auth.token.role='admin'.
// ============================================================
import { httpsCallable } from "firebase/functions";
import { signInWithCustomToken, signOut } from "firebase/auth";
import { functions, auth } from "../firebase";

const call = (name, opts) => httpsCallable(functions, name, opts);

// --- Xac thuc ---------------------------------------------------
// Dang nhap hoc vien: goi function login -> nhan custom token -> signIn.
// Tra ve { studentId, fullName, role } de client set state.
export async function loginStudent(studentId, password) {
  const res = await call("login")({ studentId, password });
  const { token, fullName, role } = res.data || {};
  await signInWithCustomToken(auth, token);
  return { studentId, fullName, role };
}

// Dang nhap admin: nhan token role='admin'.
export async function loginAdmin(password) {
  const res = await call("verifyAdminLogin")({ password });
  const { token } = res.data || {};
  await signInWithCustomToken(auth, token);
  return true;
}

export async function logout() {
  await signOut(auth);
}

export async function changePassword(oldPassword, newPassword) {
  await call("changePassword")({ oldPassword, newPassword });
}

// --- Admin (yeu cau token role='admin') -------------------------
export const adminApi = {
  listUsers: () => call("listUsers")().then((r) => r.data?.users || []),
  createUser: (studentId, password, fullName, role) =>
    call("adminCreateUser")({ studentId, password, fullName, role }),
  deleteUser: (studentId) => call("adminDeleteUser")({ studentId }),
  setRole: (studentId, role) => call("adminSetRole")({ studentId, role }),
  resetPassword: (studentId) => call("adminResetPassword")({ studentId }),
  toggleLock: (studentId, isLocked) => call("adminToggleLock")({ studentId, isLocked }),
  uploadMock: (testObj) => call("adminUploadMock", { timeout: 120000 })({ testObj }),
  uploadWriting: (writingObj) => call("adminUploadWriting")({ writingObj }),
};

// --- Duyet de (admin hoac private) ------------------------------
export const reviewApi = {
  // status: 'published' (duyet) | 'pending' (resolve) | 'reject' (xoa)
  setStatus: (collection, id, status) => call("reviewSetStatus")({ collection, id, status }),
};

// --- Bao loi de (moi user dang nhap) ----------------------------
export function reportTestBug(collection, id, note, skill) {
  return call("reportTestBug")({ collection, id, note, skill });
}

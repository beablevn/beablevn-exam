// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
// 1. THÊM DÒNG NÀY (Để dùng Database)
import { getDatabase } from "firebase/database";
// Firebase Auth thật: phiên đăng nhập qua custom token (bcrypt server-side),
// để Rules phân vai theo auth.token.role / auth.uid.
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";

// ⚠️ QUAN TRỌNG: Bạn phải thay đoạn bên dưới bằng Config của bạn
// (Vào Firebase Console -> Project Settings -> General -> Kéo xuống dưới cùng để copy)
const firebaseConfig = {
  apiKey: "AIzaSyAEJHBhFE69ja_cH661EMAr46WFgwKyt_c",
  authDomain: "beablevn-ielts.firebaseapp.com",
  databaseURL: "https://beablevn-ielts-default-rtdb.firebaseio.com",
  projectId: "beablevn-ielts",
  storageBucket: "beablevn-ielts.firebasestorage.app",
  messagingSenderId: "313486840491",
  appId: "1:313486840491:web:75f10e1624f616181b5dee"
};


// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);

// Khởi tạo Functions (Giữ nguyên)
export const functions = getFunctions(app);

// 2. THÊM DÒNG NÀY (Để xuất Database ra cho QAApp dùng)
export const db = getDatabase(app);

// Auth: giữ phiên trong trình duyệt (browserLocalPersistence) để F5 không mất đăng nhập.
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch((e) => console.error("Lỗi set persistence:", e));

// ⚠️ CHÚ Ý: Dòng này của bạn rất quan trọng để chạy thử trên máy tính
// Đừng xóa nó nếu bạn vẫn đang test AI trên localhost
// connectFunctionsEmulator(functions, "localhost", 5001); 
// (Nếu bạn đang bật comment dòng trên thì cứ để nguyên, nếu đang mở thì giữ mở)
// Trong ảnh bạn gửi thì dòng này đang mở, nên mình để mở luôn:
// connectFunctionsEmulator(functions, "localhost", 5001);
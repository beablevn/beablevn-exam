// functions/index.js
// ============================================================
// PROXY CHAM DIEM AI - GEMINI CHAY TREN SERVER (Firebase Functions)
// ------------------------------------------------------------
// Ly do ton tai file nay: API key dat o frontend (.env VITE_*) bi Vite
// nhung vao bundle JS public -> Google quet thay -> bao "leaked" va khoa.
// Key gio nam trong Secret Manager cua Google Cloud, trinh duyet
// khong bao gio nhin thay.
//
// Setup (chay 1 lan tren may):
//   firebase functions:secrets:set GEMINI_API_KEY   <- dan key MOI vao
//   cd functions && npm install && cd ..
//   firebase deploy --only functions
// ============================================================
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Key duoc nap tu Google Secret Manager luc runtime - khong nam trong code
const geminiKey = defineSecret("GEMINI_API_KEY");

const MODEL_NAME = "gemini-2.5-flash";

exports.generateContent = onCall(
    {
        secrets: [geminiKey],
        timeoutSeconds: 120,     // cham essay co the mat 30-60s
        memory: "256MiB",
        maxInstances: 5          // chan lam dung quota khi bi spam
    },
    async (request) => {
        const promptText = request.data?.promptText;
        const studentId  = request.data?.studentId;

        // Kiem tra dau vao
        if (!promptText || typeof promptText !== "string") {
            throw new HttpsError("invalid-argument", "Thieu noi dung cham diem.");
        }
        if (promptText.length > 50000) {
            throw new HttpsError("invalid-argument", "Noi dung qua dai.");
        }

        // Xac thuc nguoi goi: phai la tai khoan ton tai trong he thong.
        // Ngan ke ngoai biet projectId goi function tieu quota Gemini.
        if (!studentId || typeof studentId !== "string") {
            throw new HttpsError("unauthenticated", "Yeu cau xac thuc: thieu studentId.");
        }
        const dbRef = admin.database();
        // Admin (15082022) luon duoc phep, hoc vien phai check DB
        if (studentId !== "15082022") {
            const userSnap = await dbRef.ref(`users/${studentId}`).once("value");
            if (!userSnap.exists()) {
                throw new HttpsError("unauthenticated", "Tai khoan khong hop le.");
            }
            if (userSnap.val()?.isLocked === true) {
                throw new HttpsError("permission-denied", "Tai khoan bi khoa, khong the su dung AI.");
            }
        }

        try {
            const genAI = new GoogleGenerativeAI(geminiKey.value());
            const model = genAI.getGenerativeModel(
                { model: MODEL_NAME },
                { apiVersion: "v1" }
            );
            const result = await model.generateContent(promptText);
            return { text: result.response.text() };
        } catch (error) {
            console.error("Loi goi Gemini:", error.message);
            // Phan loai loi de client hien thong bao dung
            if (error.message?.includes("429")) {
                throw new HttpsError("resource-exhausted", "Het han muc AI. Vui long thu lai sau.");
            }
            if (error.message?.includes("503")) {
                throw new HttpsError("unavailable", "Server AI dang qua tai. Thu lai sau vai phut.");
            }
            throw new HttpsError("internal", `Loi he thong cham diem: ${error.message}`);
        }
    }
);

// ============================================================
// DON DEP BAN NHAP CU - CHAY TU DONG MOI NGAY
// ------------------------------------------------------------
// Viet lai function cleanupOldDrafts (ban cu bi xoa khi deploy 8/6/2026
// vi khong con source code).
// Cau truc drafts trong Realtime Database (client ghi moi 5 giay khi lam bai):
//   drafts/{studentId}/mock/{testId_skill}    = { answers, timeLeft, updatedAt }
//   drafts/{studentId}/writing/{t1Id_t2Id}    = { answers, timeLeft, updatedAt }
// Luat don dep:
//   - Draft co updatedAt cu hon RETENTION_DAYS ngay -> xoa
//   - Draft KHONG co updatedAt (dinh dang cu/loi)   -> xoa luon
// Lich chay: 03:00 sang moi ngay (gio Viet Nam) - luc khong ai lam bai
// ============================================================
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");

admin.initializeApp({
    databaseURL: "https://beablevn-ielts-default-rtdb.firebaseio.com"
});

// ============================================================
// LIET KE TAI KHOAN CHO TRANG ADMIN (an toan - khong lo mat khau)
// ------------------------------------------------------------
// Rules chi cho doc users/{id} DICH DANH, KHONG cho doc ca thu muc "users".
// Function nay chay bang Admin SDK (bo qua Rules), doc toan bo "users" roi
// tra ve danh sach DA LOC BO MAT KHAU. Co cong chan bang mat khau admin
// (so o server - KHONG con trong App.jsx sau Fix 5).
// Deploy: firebase deploy --only functions
// ============================================================
const ADMIN_PANEL_PASSWORD = "BAVNbavn$67896789#"; // Chi nam o server, khong con trong bundle JS

exports.listUsers = onCall(
    {
        memory: "256MiB",
        maxInstances: 5
    },
    async (request) => {
        const pass = request.data?.adminPass;
        if (!pass || pass !== ADMIN_PANEL_PASSWORD) {
            throw new HttpsError("permission-denied", "Khong co quyen xem danh sach tai khoan.");
        }
        const db = admin.database();
        const snap = await db.ref("users").once("value");
        if (!snap.exists()) return { users: [] };
        const data = snap.val();
        const users = Object.entries(data).map(([id, u]) => ({
            id,
            fullName: u?.fullName || "",
            role: u?.role || "normal",
            isLocked: u?.isLocked || false,
            createdAt: u?.createdAt || null
        }));
        return { users };
    }
);

// ============================================================
// XAC THUC DANG NHAP ADMIN - SO SANH MAT KHAU O SERVER (Fix 5)
// ------------------------------------------------------------
// Truoc Fix 5: App.jsx so sat cung mat khau 'BAVNbavn$67896789#' ngay trong
// bundle JS -> bat ky ai mo DevTools -> Sources -> bundle.js la doc duoc.
// Sau Fix 5: client gui password len day, server so sanh voi ADMIN_PANEL_PASSWORD.
// Password khong con trong bundle cua trinh duyet.
// Client van gui studentId = '15082022' de bien hay trang dang nhap binh thuong
// (admin ID khong phai secret quan trong bang password).
// Deploy sau khi sua: firebase deploy --only functions
// ============================================================
exports.verifyAdminLogin = onCall(
    { memory: "128MiB", maxInstances: 3 },
    async (request) => {
        const { password } = request.data || {};
        if (!password || password !== ADMIN_PANEL_PASSWORD) {
            throw new HttpsError("permission-denied", "Sai mat khau Admin.");
        }
        return { success: true };
    }
);

const RETENTION_DAYS = 7; // Giu ban nhap toi da 7 ngay

exports.cleanupOldDrafts = onSchedule(
    {
        schedule: "every day 03:00",
        timeZone: "Asia/Ho_Chi_Minh",
        memory: "256MiB",
        timeoutSeconds: 300
    },
    async () => {
        const db = admin.database();
        const snapshot = await db.ref("drafts").once("value");

        if (!snapshot.exists()) {
            console.log("Khong co draft nao. Ket thuc.");
            return;
        }

        const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
        const updates = {}; // Gom tat ca path can xoa, xoa 1 lan duy nhat
        let deleted = 0, kept = 0;

        snapshot.forEach((studentSnap) => {           // drafts/{studentId}
            studentSnap.forEach((typeSnap) => {        // mock | writing
                typeSnap.forEach((draftSnap) => {      // {testId_skill}
                    const updatedAt = draftSnap.child("updatedAt").val();
                    // Khong co updatedAt -> dinh dang cu -> xoa
                    // Co updatedAt nhung qua han -> xoa
                    const isStale = !updatedAt || new Date(updatedAt).getTime() < cutoff;
                    if (isStale) {
                        updates[`${studentSnap.key}/${typeSnap.key}/${draftSnap.key}`] = null;
                        deleted++;
                    } else {
                        kept++;
                    }
                });
            });
        });

        if (deleted > 0) {
            await db.ref("drafts").update(updates);
        }
        // RTDB tu xoa cac node cha rong sau khi children = null
        console.log(`Don dep xong: xoa ${deleted} draft cu, giu lai ${kept} draft con han.`);
    }
);

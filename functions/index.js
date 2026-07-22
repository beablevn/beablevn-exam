// functions/index.js
// ============================================================
// BACKEND APP EXAM (beablevn-ielts) - XAC THUC THAT + GHI NHAY CAM SERVER-SIDE
// ------------------------------------------------------------
// Kien truc bao mat (vá 16/07/2026, theo pattern EDU/OPS trong bao-mat.md):
//   1. login/verifyAdminLogin so mat khau BCRYPT phia server -> cap Firebase
//      custom token co claim {role}. Client signInWithCustomToken -> co phien
//      auth that (auth != null, auth.token.role).
//   2. Moi thao tac GHI nhay cam (tao/xoa/doi role/reset pass/khoa/dang de/duyet)
//      la Cloud Function onCall, gate bang request.auth.token.role === 'admin'
//      (hoac 'private' cho duyet de). Client KHONG con ghi thang RTDB cac node nay.
//   3. database.rules.json siet: mac dinh cam, phan vai theo auth.token.role +
//      auth.uid. Mat khau (hash) nam o node authSecrets (read/write=false, chi
//      Admin SDK trong function nay cham toi).
//
// Luu tru:
//   users/{studentId}      = { fullName, role, isLocked, createdAt }   (KHONG con password)
//   authSecrets/{studentId}= { passwordHash }   (bcrypt; rules read/write=false)
//   Admin: uid = '15082022', claim role='admin', hash o authSecrets/15082022.
//
// Region: giu MAC DINH (us-central1) khop client getFunctions(app) hien tai.
// Deploy: firebase deploy --only functions  (doc canh bao xoa function o duoi).
// ============================================================
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const admin = require("firebase-admin");
const bcrypt = require("bcryptjs");

admin.initializeApp({
    databaseURL: "https://beablevn-ielts-default-rtdb.firebaseio.com"
});

const geminiKey = defineSecret("GEMINI_API_KEY");
// Mat khau admin nam trong Secret Manager (Bak dat bang: firebase functions:secrets:set ADMIN_PANEL_PASSWORD).
// KHONG con hardcode trong source. Doi mat khau = set lai secret roi deploy.
const adminPassword = defineSecret("ADMIN_PANEL_PASSWORD");
const MODEL_NAME = "gemini-2.5-flash";

const ADMIN_UID = "15082022";     // uid cua tai khoan quan tri (claim role='admin')
const BCRYPT_ROUNDS = 10;
const DEFAULT_RESET_PASSWORD = "BAVNbavn"; // reset ve mat khau nay (da hash truoc khi luu)

// ---- Helpers ------------------------------------------------
const db = () => admin.database();

// Cho phep ca ID hoc vien (8 so) lan ID nhan su (ten, khong co ma so co dinh):
// chu cai Unicode (giu dau tieng Viet) + chu so. KHONG khoang trang, KHONG ky tu dac biet.
// Toi da 30 ky tu. PHAI dong bo voi src/utils/idValidation.js (ID_PATTERN) ben client.
const isValidStudentId = (id) => typeof id === "string" && /^[\p{L}\p{N}]{1,30}$/u.test(id);

// Bat buoc nguoi goi la admin (co claim role='admin' trong token)
function assertAdmin(request) {
    if (!request.auth) throw new HttpsError("unauthenticated", "Chua dang nhap.");
    if (request.auth.token?.role !== "admin") {
        throw new HttpsError("permission-denied", "Chi quan tri vien duoc thuc hien thao tac nay.");
    }
}

// Bat buoc nguoi goi co role thuoc danh sach cho phep
function assertRole(request, roles) {
    if (!request.auth) throw new HttpsError("unauthenticated", "Chua dang nhap.");
    if (!roles.includes(request.auth.token?.role)) {
        throw new HttpsError("permission-denied", "Khong du quyen.");
    }
}

async function hashPassword(plain) {
    return bcrypt.hash(String(plain), BCRYPT_ROUNDS);
}

// ============================================================
// 1. DANG NHAP HOC VIEN -> cap custom token co claim role
// ------------------------------------------------------------
// So mat khau bcrypt phia server. Client KHONG con doc node users de so pass,
// nen password (hash) khong bao gio ra trinh duyet.
// ============================================================
exports.login = onCall(
    { memory: "256MiB", maxInstances: 10 },
    async (request) => {
        const studentId = request.data?.studentId;
        const password = request.data?.password;

        if (!isValidStudentId(studentId)) {
            throw new HttpsError("invalid-argument", "Ma hoc vien phai la 8 chu so.");
        }
        if (!password || typeof password !== "string") {
            throw new HttpsError("invalid-argument", "Thieu mat khau.");
        }

        const userSnap = await db().ref(`users/${studentId}`).once("value");
        if (!userSnap.exists()) {
            throw new HttpsError("permission-denied", "Ma hoc vien hoac mat khau khong dung.");
        }
        const user = userSnap.val();

        const hashSnap = await db().ref(`authSecrets/${studentId}/passwordHash`).once("value");
        const hash = hashSnap.val();

        let ok = false;
        if (hash) {
            // Da migrate: so bcrypt
            ok = await bcrypt.compare(password, hash);
        } else if (typeof user.password === "string" && user.password.length) {
            // LAZY MIGRATION: tai khoan cu con mat khau plaintext -> so plaintext, dung thi
            // bam bcrypt vao authSecrets va XOA plaintext ngay (khong can chay script batch).
            ok = (password === user.password);
            if (ok) {
                await db().ref(`authSecrets/${studentId}/passwordHash`).set(await hashPassword(password));
                await db().ref(`users/${studentId}/password`).remove();
            }
        }
        // Thong bao dong nhat cho ID sai va pass sai (tranh do dam ID hop le)
        if (!ok) {
            throw new HttpsError("permission-denied", "Ma hoc vien hoac mat khau khong dung.");
        }

        const role = user.role === "private" ? "private" : "normal";
        const token = await admin.auth().createCustomToken(studentId, { role });
        return { token, studentId, fullName: user.fullName || "", role };
    }
);

// ============================================================
// 2. DANG NHAP ADMIN -> cap custom token role='admin'
// ------------------------------------------------------------
// Truoc day chi tra {success:true} (co UI); moi lenh ghi cua trang Admin van la
// client-write khong xac thuc. Nay cap token that de Rules phan vai.
// Mat khau admin luu bcrypt o authSecrets/15082022 (KHONG con hardcode trong source).
// ============================================================
exports.verifyAdminLogin = onCall(
    { secrets: [adminPassword], memory: "256MiB", maxInstances: 3 },
    async (request) => {
        const password = request.data?.password;
        if (!password || typeof password !== "string") {
            throw new HttpsError("invalid-argument", "Thieu mat khau.");
        }
        // So voi secret ADMIN_PANEL_PASSWORD (server-only, khong nam trong bundle, Bak xoay duoc).
        if (password !== adminPassword.value()) {
            throw new HttpsError("permission-denied", "Sai mat khau Admin.");
        }
        const token = await admin.auth().createCustomToken(ADMIN_UID, { role: "admin" });
        return { token };
    }
);

// ============================================================
// 3. DOI MAT KHAU (hoc vien tu doi, phai dang nhap)
// ------------------------------------------------------------
// So mat khau cu bcrypt server-side (truoc day so o client roi ghi thang RTDB,
// ai cung ghi de duoc password ID bat ky).
// ============================================================
exports.changePassword = onCall(
    { memory: "256MiB", maxInstances: 5 },
    async (request) => {
        if (!request.auth) throw new HttpsError("unauthenticated", "Chua dang nhap.");
        const uid = request.auth.uid;
        const oldPassword = request.data?.oldPassword;
        const newPassword = request.data?.newPassword;

        if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
            throw new HttpsError("invalid-argument", "Mat khau moi phai tu 6 ky tu.");
        }
        const hashSnap = await db().ref(`authSecrets/${uid}/passwordHash`).once("value");
        const hash = hashSnap.val();
        let ok = false;
        if (hash) {
            ok = await bcrypt.compare(String(oldPassword || ""), hash);
        } else {
            // Chua co hash (chua tung login sau migration): so voi plaintext cu con lai
            const pSnap = await db().ref(`users/${uid}/password`).once("value");
            const plain = pSnap.val();
            ok = typeof plain === "string" && String(oldPassword || "") === plain;
        }
        if (!ok) {
            throw new HttpsError("permission-denied", "Mat khau cu khong dung.");
        }
        await db().ref(`authSecrets/${uid}/passwordHash`).set(await hashPassword(newPassword));
        await db().ref(`users/${uid}/password`).remove(); // don plaintext neu con
        return { success: true };
    }
);

// ============================================================
// 4. ADMIN: LIET KE TAI KHOAN (gate bang token role='admin')
// ------------------------------------------------------------
// Bo cong "mat khau admin gui kem" (truoc day gui plaintext moi lan goi).
// ============================================================
exports.listUsers = onCall(
    { memory: "256MiB", maxInstances: 5 },
    async (request) => {
        assertAdmin(request);
        const snap = await db().ref("users").once("value");
        if (!snap.exists()) return { users: [] };
        const data = snap.val();
        const users = Object.entries(data).map(([id, u]) => ({
            id,
            fullName: u?.fullName || "",
            role: u?.role || "normal",
            isLocked: u?.isLocked || false,
            examSystem: u?.examSystem || "both",
            createdAt: u?.createdAt || null
        }));
        return { users };
    }
);

// ============================================================
// 5. ADMIN: CAC THAO TAC GHI NHAY CAM (gate token role='admin')
// ============================================================
exports.adminCreateUser = onCall(
    { memory: "256MiB", maxInstances: 5 },
    async (request) => {
        assertAdmin(request);
        const { studentId, password, fullName, role, examSystem } = request.data || {};
        if (!isValidStudentId(studentId)) throw new HttpsError("invalid-argument", "Ma hoc vien phai 8 chu so.");
        if (studentId === ADMIN_UID) throw new HttpsError("invalid-argument", "ID nay danh cho quan tri.");
        if (!password || typeof password !== "string" || password.length < 6) {
            throw new HttpsError("invalid-argument", "Mat khau phai tu 6 ky tu.");
        }
        if (!fullName || typeof fullName !== "string") throw new HttpsError("invalid-argument", "Thieu ho ten.");
        const newRole = role === "private" ? "private" : "normal";
        // He thi duoc phep: 'ielts' | 'sat' | 'both' (mac dinh ca 2, khong gioi han).
        const newExamSystem = ["ielts", "sat", "both"].includes(examSystem) ? examSystem : "both";

        const exists = await db().ref(`users/${studentId}`).once("value");
        if (exists.exists()) throw new HttpsError("already-exists", "ID da ton tai.");

        await db().ref(`users/${studentId}`).set({
            fullName, role: newRole, isLocked: false, examSystem: newExamSystem, createdAt: new Date().toISOString()
        });
        await db().ref(`authSecrets/${studentId}/passwordHash`).set(await hashPassword(password));
        return { success: true };
    }
);

exports.adminDeleteUser = onCall(
    { memory: "128MiB", maxInstances: 5 },
    async (request) => {
        assertAdmin(request);
        const { studentId } = request.data || {};
        if (!isValidStudentId(studentId)) throw new HttpsError("invalid-argument", "ID khong hop le.");
        await db().ref(`users/${studentId}`).remove();
        await db().ref(`authSecrets/${studentId}`).remove();
        return { success: true };
    }
);

exports.adminSetRole = onCall(
    { memory: "128MiB", maxInstances: 5 },
    async (request) => {
        assertAdmin(request);
        const { studentId, role } = request.data || {};
        if (!isValidStudentId(studentId)) throw new HttpsError("invalid-argument", "ID khong hop le.");
        const newRole = role === "private" ? "private" : "normal";
        await db().ref(`users/${studentId}/role`).set(newRole);
        return { success: true, role: newRole };
    }
);

// He thi duoc phep hoc vien truy cap: 'ielts' | 'sat' | 'both'. Tach truc voi "role"
// (role = normal/private la vai tro kiem duyet, khong lien quan quyen chon he thi).
exports.adminSetExamSystem = onCall(
    { memory: "128MiB", maxInstances: 5 },
    async (request) => {
        assertAdmin(request);
        const { studentId, examSystem } = request.data || {};
        if (!isValidStudentId(studentId)) throw new HttpsError("invalid-argument", "ID khong hop le.");
        const newExamSystem = ["ielts", "sat", "both"].includes(examSystem) ? examSystem : "both";
        await db().ref(`users/${studentId}/examSystem`).set(newExamSystem);
        return { success: true, examSystem: newExamSystem };
    }
);

exports.adminResetPassword = onCall(
    { memory: "256MiB", maxInstances: 5 },
    async (request) => {
        assertAdmin(request);
        const { studentId } = request.data || {};
        if (!isValidStudentId(studentId)) throw new HttpsError("invalid-argument", "ID khong hop le.");
        await db().ref(`authSecrets/${studentId}/passwordHash`).set(await hashPassword(DEFAULT_RESET_PASSWORD));
        return { success: true };
    }
);

exports.adminToggleLock = onCall(
    { memory: "128MiB", maxInstances: 5 },
    async (request) => {
        assertAdmin(request);
        const { studentId, isLocked } = request.data || {};
        if (!isValidStudentId(studentId)) throw new HttpsError("invalid-argument", "ID khong hop le.");
        await db().ref(`users/${studentId}/isLocked`).set(isLocked === true);
        return { success: true, isLocked: isLocked === true };
    }
);

// Kiem tra so bo mot object de (chan rac). Khong kiem sau vi noi dung do admin dan.
function validateTestObject(obj) {
    if (!obj || typeof obj !== "object") return "Object rong.";
    if (!obj.id || typeof obj.id !== "string") return "Thieu id.";
    return null;
}

exports.adminUploadMock = onCall(
    { memory: "512MiB", maxInstances: 3 },
    async (request) => {
        assertAdmin(request);
        const testObj = request.data?.testObj;
        const err = validateTestObject(testObj);
        if (err || !testObj.testName) throw new HttpsError("invalid-argument", err || "Thieu testName.");
        testObj.status = "pending";
        await db().ref(`mockTests/${testObj.id}`).set(testObj);
        return { success: true, id: testObj.id };
    }
);

exports.adminUploadWriting = onCall(
    { memory: "256MiB", maxInstances: 3 },
    async (request) => {
        assertAdmin(request);
        const writingObj = request.data?.writingObj;
        const err = validateTestObject(writingObj);
        if (err) throw new HttpsError("invalid-argument", err);
        writingObj.status = "pending";
        await db().ref(`writingLibrary/${writingObj.id}`).set(writingObj);
        return { success: true, id: writingObj.id };
    }
);

// ============================================================
// 6. DUYET DE (role admin HOAC private) + BAO LOI (moi user dang nhap)
// ============================================================
const VALID_COLLECTIONS = ["mockTests", "writingLibrary"];

exports.reviewSetStatus = onCall(
    { memory: "128MiB", maxInstances: 5 },
    async (request) => {
        assertRole(request, ["admin", "private"]);
        const { collection, id, status } = request.data || {};
        if (!VALID_COLLECTIONS.includes(collection)) throw new HttpsError("invalid-argument", "Collection khong hop le.");
        if (!id || typeof id !== "string") throw new HttpsError("invalid-argument", "Thieu id.");

        if (status === "published" || status === "pending") {
            const patch = { status };
            if (status === "pending") patch.bugNotes = null; // resolve: xoa nhat ky loi
            await db().ref(`${collection}/${id}`).update(patch);
            return { success: true };
        }
        if (status === "reject") {
            // Tu choi = xoa vinh vien (chi admin/private)
            await db().ref(`${collection}/${id}`).remove();
            return { success: true, deleted: true };
        }
        throw new HttpsError("invalid-argument", "Trang thai khong hop le.");
    }
);

exports.reportTestBug = onCall(
    { memory: "128MiB", maxInstances: 5 },
    async (request) => {
        if (!request.auth) throw new HttpsError("unauthenticated", "Chua dang nhap.");
        const { collection, id, note, skill } = request.data || {};
        if (!VALID_COLLECTIONS.includes(collection)) throw new HttpsError("invalid-argument", "Collection khong hop le.");
        if (!id || typeof id !== "string") throw new HttpsError("invalid-argument", "Thieu id.");
        if (!note || typeof note !== "string" || !note.trim()) throw new HttpsError("invalid-argument", "Thieu noi dung loi.");

        const ref = db().ref(`${collection}/${id}`);
        const snap = await ref.once("value");
        if (!snap.exists()) throw new HttpsError("not-found", "Khong tim thay de.");

        const existing = snap.child("bugNotes").val() || "";
        const stamp = new Date().toLocaleString("vi-VN");
        const skillTag = skill ? ` [${String(skill).toUpperCase()}]` : "";
        const entry = `[${stamp}]${skillTag}: ${note.trim().slice(0, 1000)}`;
        await ref.update({
            status: "reported",
            bugNotes: existing ? `${existing}\n\n${entry}` : entry
        });
        return { success: true };
    }
);

// ============================================================
// 7. CHAM DIEM AI (Gemini server-side) - xac thuc bang phien auth THAT
// ------------------------------------------------------------
// Truoc day "xac thuc" bang studentId doan duoc. Nay dung request.auth.uid.
// ============================================================
exports.generateContent = onCall(
    {
        secrets: [geminiKey],
        timeoutSeconds: 120,
        memory: "256MiB",
        maxInstances: 5
    },
    async (request) => {
        if (!request.auth) throw new HttpsError("unauthenticated", "Chua dang nhap.");
        const promptText = request.data?.promptText;
        if (!promptText || typeof promptText !== "string") {
            throw new HttpsError("invalid-argument", "Thieu noi dung cham diem.");
        }
        if (promptText.length > 50000) {
            throw new HttpsError("invalid-argument", "Noi dung qua dai.");
        }

        const uid = request.auth.uid;
        const role = request.auth.token?.role;
        // Admin khong nam trong node users; hoc vien phai ton tai + khong bi khoa.
        if (role !== "admin") {
            const userSnap = await db().ref(`users/${uid}`).once("value");
            if (!userSnap.exists()) throw new HttpsError("permission-denied", "Tai khoan khong hop le.");
            if (userSnap.val()?.isLocked === true) {
                throw new HttpsError("permission-denied", "Tai khoan bi khoa, khong the su dung AI.");
            }
        }

        try {
            const genAI = new GoogleGenerativeAI(geminiKey.value());
            const model = genAI.getGenerativeModel({ model: MODEL_NAME }, { apiVersion: "v1" });
            const result = await model.generateContent(promptText);
            return { text: result.response.text() };
        } catch (error) {
            // Log chi tiet o server, KHONG tra error.message noi bo ve client
            console.error("Loi goi Gemini:", error.message);
            if (error.message?.includes("429")) {
                throw new HttpsError("resource-exhausted", "Het han muc AI. Vui long thu lai sau.");
            }
            if (error.message?.includes("503")) {
                throw new HttpsError("unavailable", "Server AI dang qua tai. Thu lai sau vai phut.");
            }
            throw new HttpsError("internal", "Loi he thong cham diem. Vui long thu lai sau.");
        }
    }
);

// ============================================================
// 8. DON DEP BAN NHAP CU - 03:00 moi ngay (gio VN)
// ------------------------------------------------------------
// Duyet theo TUNG hoc vien (shallow) de khong nap ca cay drafts vao RAM cung luc.
// ============================================================
const RETENTION_DAYS = 7;

exports.cleanupOldDrafts = onSchedule(
    {
        schedule: "every day 03:00",
        timeZone: "Asia/Ho_Chi_Minh",
        memory: "256MiB",
        timeoutSeconds: 300
    },
    async () => {
        const rootRef = db().ref("drafts");
        // Lay danh sach studentId (shallow) truoc, roi xu ly tung nguoi
        const shallow = await rootRef.once("value"); // RTDB khong co shallow onCall; van doc nhung xu ly + xoa theo student
        if (!shallow.exists()) {
            console.log("Khong co draft nao. Ket thuc.");
            return;
        }
        const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
        let deleted = 0, kept = 0;

        // Xoa theo tung student de moi lan update nho, tranh 1 update khong lo
        const studentIds = [];
        shallow.forEach((s) => { studentIds.push(s.key); });

        for (const sid of studentIds) {
            const updates = {};
            const sSnap = shallow.child(sid);
            sSnap.forEach((typeSnap) => {
                typeSnap.forEach((draftSnap) => {
                    const updatedAt = draftSnap.child("updatedAt").val();
                    const isStale = !updatedAt || new Date(updatedAt).getTime() < cutoff;
                    if (isStale) {
                        updates[`${sid}/${typeSnap.key}/${draftSnap.key}`] = null;
                        deleted++;
                    } else {
                        kept++;
                    }
                });
            });
            if (Object.keys(updates).length > 0) {
                await rootRef.update(updates);
            }
        }
        console.log(`Don dep xong: xoa ${deleted} draft cu, giu ${kept} draft con han.`);
    }
);

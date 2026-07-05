// src/utils/geminiHelper.js
// ============================================================
// GOI AI CHAM DIEM QUA FIREBASE FUNCTIONS (khong con key o frontend)
// ------------------------------------------------------------
// Truoc day: file nay cam 3 API key Gemini va goi thang Google tu
// trinh duyet -> key bi nhung vao bundle JS public -> Google bao
// "leaked" va khoa key (loi 403).
// Bay gio: trinh duyet goi function `generateContent` tren Firebase,
// key nam trong Secret Manager server-side - khong the bi lo.
// Giu nguyen ten ham generateContentWithRotation de cac trang
// (FullTestPage, WritingTestPage) khong phai sua gi.
// ============================================================
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";

export const generateContentWithRotation = async (promptText, studentId) => {
    // timeout 120s - cham essay dai co the lau
    const callGemini = httpsCallable(functions, "generateContent", { timeout: 120000 });

    // Lấy studentId từ localStorage nếu caller không truyền vào
    const sid = studentId || localStorage.getItem("currentStudentId") || "";

    try {
        const result = await callGemini({ promptText, studentId: sid });
        return result.data.text;
    } catch (error) {
        // error.code cua Firebase Functions: functions/resource-exhausted, functions/unavailable...
        const code = error.code || "";
        if (code.includes("resource-exhausted")) {
            throw new Error("Da het han muc su dung AI. Vui long thu lai sau!");
        }
        if (code.includes("unavailable") || code.includes("deadline-exceeded")) {
            throw new Error("Server AI dang qua tai. Vui long thu lai sau vai phut!");
        }
        throw new Error(`Loi he thong cham diem: ${error.message}`);
    }
};

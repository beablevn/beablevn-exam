// src/utils/idValidation.js
// Quy tac ID dang nhap dung CHUNG voi functions/index.js (isValidStudentId) — sua ben nay
// thi phai sua ca ben do, khong se client cho nhap nhung server tu choi.
// Cho phep: chu cai Unicode (giu nguyen dau tieng Viet) + chu so. KHONG khoang trang,
// KHONG ky tu dac biet. Toi da 30 ky tu (theo yeu cau Bak).
export const ID_MAX_LEN = 30;
export const ID_PATTERN = new RegExp(`^[\\p{L}\\p{N}]{1,${ID_MAX_LEN}}$`, "u");

export const isValidLoginId = (id) => typeof id === "string" && ID_PATTERN.test(id);

// Dung cho onChange: cho go dan (bao gom chuoi rong khi dang xoa), chi chan ky tu la/so ngoai
// danh sach cho phep va gioi han do dai — KHONG kiem "du 1-30" o day (de nguoi dung go dan).
export const isTypableId = (val) => /^[\p{L}\p{N}]*$/u.test(val) && val.length <= ID_MAX_LEN;

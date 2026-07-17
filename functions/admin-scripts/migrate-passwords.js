// functions/admin-scripts/migrate-passwords.js
// ============================================================
// SCRIPT CHAY 1 LAN: bam (bcrypt) toan bo mat khau hoc vien + dat mat khau admin.
// ------------------------------------------------------------
// Truoc migration:  users/{id}/password = "<plaintext>"
// Sau  migration:   users/{id}          = { fullName, role, isLocked, createdAt }  (KHONG con password)
//                   authSecrets/{id}/passwordHash = "<bcrypt hash>"
//                   authSecrets/15082022/passwordHash = "<bcrypt hash cua mat khau admin MOI>"
//
// CHAY O DAU: tren may Bak (co quyen Firebase), KHONG chay trong ham deploy.
// CAN: file service account JSON cua project beablevn-ielts (Console > Project settings
//      > Service accounts > Generate new private key). KHONG commit file nay.
//
// LENH CHAY (PowerShell), dat mat khau admin MOI qua bien moi truong:
//   cd "functions"
//   npm install                       # co bcryptjs + firebase-admin
//   $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\duong\dan\service-account.json"
//   $env:NEW_ADMIN_PASSWORD = "<mat khau admin MOI, manh, thay cho cai da lo>"
//   node admin-scripts/migrate-passwords.js            # chay THU (dry-run), chi in ra
//   node admin-scripts/migrate-passwords.js --commit   # chay THAT (ghi DB)
//
// AN TOAN:
//   - Mac dinh DRY-RUN: chi dem va in, KHONG ghi gi. Them --commit moi ghi that.
//   - Chi bam nhung user CON password plaintext; user da co hash thi bo qua (idempotent,
//     chay lai nhieu lan khong hong).
//   - KHONG in mat khau ra man hinh.
//   - Nen backup node "users" tren Console truoc khi chay --commit.
// ============================================================
const admin = require("firebase-admin");
const bcrypt = require("bcryptjs");

const ADMIN_UID = "15082022";
const BCRYPT_ROUNDS = 10;
const DATABASE_URL = "https://beablevn-ielts-default-rtdb.firebaseio.com";

const COMMIT = process.argv.includes("--commit");

admin.initializeApp({
  // Dung GOOGLE_APPLICATION_CREDENTIALS (bien moi truong tro toi service account JSON)
  credential: admin.credential.applicationDefault(),
  databaseURL: DATABASE_URL,
});

const db = admin.database();

async function main() {
  console.log(COMMIT ? "=== CHE DO GHI THAT (--commit) ===" : "=== DRY-RUN (chi in, khong ghi). Them --commit de ghi that. ===");

  // 1. Bam mat khau admin moi
  const newAdminPass = process.env.NEW_ADMIN_PASSWORD;
  if (!newAdminPass || newAdminPass.length < 8) {
    console.error("LOI: chua dat NEW_ADMIN_PASSWORD (>= 8 ky tu). Dung lai.");
    process.exit(1);
  }

  // 2. Doc toan bo users
  const snap = await db.ref("users").once("value");
  if (!snap.exists()) {
    console.log("Khong co user nao.");
  }
  const users = snap.val() || {};
  const ids = Object.keys(users);

  let hashed = 0, skipped = 0, noPass = 0;
  for (const id of ids) {
    const u = users[id] || {};
    // Da co hash roi -> bo qua (idempotent)
    const existingHash = await db.ref(`authSecrets/${id}/passwordHash`).once("value");
    if (existingHash.exists()) { skipped++; continue; }

    if (typeof u.password !== "string" || !u.password) {
      // User khong co password plaintext (du lieu la, hoac da migrate) -> khong xu ly
      noPass++;
      continue;
    }

    if (COMMIT) {
      const hash = await bcrypt.hash(u.password, BCRYPT_ROUNDS);
      await db.ref(`authSecrets/${id}/passwordHash`).set(hash);
      await db.ref(`users/${id}/password`).remove(); // xoa plaintext
    }
    hashed++;
  }

  // 3. Dat mat khau admin
  const adminHasHash = await db.ref(`authSecrets/${ADMIN_UID}/passwordHash`).once("value");
  if (COMMIT) {
    const adminHash = await bcrypt.hash(newAdminPass, BCRYPT_ROUNDS);
    await db.ref(`authSecrets/${ADMIN_UID}/passwordHash`).set(adminHash);
  }

  console.log(`Tong user: ${ids.length}`);
  console.log(`  - se bam/da bam mat khau: ${hashed}`);
  console.log(`  - bo qua (da co hash):     ${skipped}`);
  console.log(`  - khong co password plaintext: ${noPass}`);
  console.log(`  - mat khau admin (${ADMIN_UID}): ${COMMIT ? "DA DAT MOI" : (adminHasHash.exists() ? "da co hash (se ghi de)" : "chua co, se dat")}`);
  console.log(COMMIT ? "XONG. Kiem tra: authSecrets co hash, users KHONG con field password." : "DRY-RUN xong. Chay lai voi --commit de ghi that.");
  process.exit(0);
}

main().catch((e) => { console.error("Loi migration:", e); process.exit(1); });

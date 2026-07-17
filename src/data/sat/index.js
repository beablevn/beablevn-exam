// src/data/sat/index.js
// Danh muc de SAT Adaptive. Data nang (~60KB/de) duoc nap bang dynamic import
// trong SatAdaptiveTestPage de KHONG phinh bundle chinh (theo pattern AdminPage).
export const satTests = [
  {
    id: 'sat_l12_midterm_rw',
    testName: 'SAT FOUNDATION | MIDTERM READING & WRITING',
    description: 'Đề giữa kỳ Buổi 12. Adaptive 2 module: 27 câu / 32 phút mỗi module. Module 2 rẽ nhánh Khó/Dễ theo kết quả Module 1.',
    // Ham nap data: tra ve module JS chua object de thi
    load: () => import('./sat_l12_midterm_rw.js').then(m => m.sat_l12_midterm_rw),
  },
];

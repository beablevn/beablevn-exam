// src/data/sat/sat_l12_midterm_rw.js
// Đề giữa kỳ SAT R&W Adaptive, sinh tự động từ ngân hàng câu hỏi Buổi 11-12

export const sat_l12_midterm_rw = {
 "id": "sat_l12_midterm_rw",
 "category": "sat_adaptive",
 "testName": "SAT FOUNDATION | MIDTERM READING & WRITING (Buổi 12)",
 "description": "Đề thi giữa kỳ Reading & Writing chuẩn Digital SAT, cơ chế Adaptive Testing 2 module: Module 1 cố định, Module 2 rẽ nhánh Khó/Dễ theo kết quả Module 1.",
 "adaptiveConfig": {
  "routing": {
   "basedOn": "module1",
   "scoredQuestions": 25,
   "note": "Chỉ tính 25 câu điểm (bỏ 2 câu isPretest=true).",
   "thresholdCorrect": 15,
   "rule": "Đúng >= 15/25 câu tính điểm ở Module 1 -> module2_harder; ngược lại -> module2_easier."
  },
  "scoring": {
   "scoredPerModule": 25,
   "totalScored": 50,
   "scaleMin": 200,
   "harderBranch": {
    "formula": "score = 200 + 12 x (số câu đúng cả 2 module, tối đa 50)",
    "scaleMax": 800
   },
   "easierBranch": {
    "formula": "score = 200 + 7.6 x (số câu đúng cả 2 module), làm tròn xuống bội số 10",
    "scaleMax": 580,
    "note": "Trần điểm nhánh Dễ: 580. Kể cả đúng 100% Module 2 vẫn không vượt trần."
   },
   "reportBands": {
    "target_hon_600": "chỉ đạt được qua nhánh Khó",
    "muc_dat": "450+",
    "can_co_gang": "dưới 450"
   }
  },
  "timeLimitPerModule": 1920,
  "breakBetweenModules": 0
 },
 "modules": {
  "module1": {
   "id": "module1",
   "title": "Module 1 (Cố định, mọi học viên làm giống nhau)",
   "timeLimit": 1920,
   "questionCount": 27,
   "scoredCount": 25,
   "domainOrder": [
    "Craft and Structure",
    "Information and Ideas",
    "Expression of Ideas",
    "Standard English Conventions"
   ],
   "questions": [
    {
     "qNum": 1,
     "domain": "Craft and Structure",
     "skill": "Words in Context: Roots & Prefixes",
     "difficulty": "E",
     "isPretest": false,
     "passage": "The teacher asked us to rewrite the essay, revising each paragraph carefully.",
     "stem": "Based on the prefix \"re-\", \"rewrite\" means to write ____.",
     "options": [
      "A. quickly",
      "B. again",
      "C. before",
      "D. neatly"
     ],
     "answer": "B",
     "explanation": "re- = lại, một lần nữa (return, reread). 'revising each paragraph' xác nhận hành động làm lại."
    },
    {
     "qNum": 2,
     "domain": "Craft and Structure",
     "skill": "Words in Context: Definition Clue",
     "difficulty": "E",
     "isPretest": false,
     "passage": "The farmers built terraces, flat steps of land cut into the hillside, to grow rice on the steep slopes.",
     "stem": "Based on the context, \"terraces\" are ____.",
     "options": [
      "A. tools for cutting rice",
      "B. small mountain houses",
      "C. irrigation channels",
      "D. steps of land on a hillside"
     ],
     "answer": "D",
     "explanation": "Definition clue giữa hai dấu phẩy: 'flat steps of land cut into the hillside'."
    },
    {
     "qNum": 3,
     "domain": "Craft and Structure",
     "skill": "Words in Context: Contrast Clue",
     "difficulty": "M",
     "isPretest": false,
     "passage": "Rather than accept the theory outright, the committee remained skeptical, demanding further evidence before making any decision.",
     "stem": "As used in the text, \"skeptical\" most nearly means ____.",
     "options": [
      "A. enthusiastic",
      "B. confused",
      "C. doubtful",
      "D. hostile"
     ],
     "answer": "C",
     "explanation": "Contrast clue 'Rather than accept' + 'demanding further evidence': thái độ nghi ngờ, chưa tin."
    },
    {
     "qNum": 4,
     "domain": "Craft and Structure",
     "skill": "Words in Context: Roots",
     "difficulty": "M",
     "isPretest": false,
     "passage": "The witness's account contradicted the official report, so investigators reopened the case.",
     "stem": "Based on the roots \"contra-\" and \"dict-\", \"contradicted\" most nearly means ____.",
     "options": [
      "A. supported quietly",
      "B. copied exactly",
      "C. recorded carefully",
      "D. spoke against"
     ],
     "answer": "D",
     "explanation": "contra- (chống, ngược) + dict- (nói): nói ngược lại. Việc mở lại hồ sơ xác nhận có mâu thuẫn."
    },
    {
     "qNum": 5,
     "domain": "Craft and Structure",
     "skill": "Text Structure & Purpose",
     "difficulty": "M",
     "isPretest": false,
     "passage": "Homework has value, but only in moderation. Studies find that beyond two hours a night, extra assignments add stress without improving grades.",
     "stem": "What is the main purpose of the text?",
     "options": [
      "A. to argue for limiting homework",
      "B. to describe a typical school night",
      "C. to explain how to finish homework faster",
      "D. to compare schools in two countries"
     ],
     "answer": "A",
     "explanation": "Câu chủ đề 'but only in moderation' + bằng chứng nghiên cứu: lập luận nên giới hạn bài tập."
    },
    {
     "qNum": 6,
     "domain": "Craft and Structure",
     "skill": "Text Structure & Purpose: Function",
     "difficulty": "H",
     "isPretest": false,
     "passage": "Some historians dismiss oral traditions as unreliable. Yet when researchers compared Aboriginal stories about rising seas with geological records, the stories accurately described coastlines as they existed 7,000 years ago.",
     "stem": "The second sentence mainly serves to ____.",
     "options": [
      "A. challenge the view stated in the first sentence",
      "B. provide an example of an unreliable story",
      "C. explain how geological records are made",
      "D. summarize the history of Aboriginal peoples"
     ],
     "answer": "A",
     "explanation": "'Yet' báo hiệu phản bác: bằng chứng địa chất cho thấy truyện kể truyền miệng CHÍNH XÁC, ngược với quan điểm câu 1."
    },
    {
     "qNum": 7,
     "domain": "Craft and Structure",
     "skill": "Words in Context",
     "difficulty": "M",
     "isPretest": true,
     "passage": "The mayor's plan was met with widespread approbation: citizens praised it in meetings across the city.",
     "stem": "As used in the text, \"approbation\" most nearly means ____.",
     "options": [
      "A. confusion",
      "B. resistance",
      "C. approval",
      "D. curiosity"
     ],
     "answer": "C",
     "explanation": "[Câu thử nghiệm, không tính điểm] Vế sau dấu hai chấm 'citizens praised it' giải thích nghĩa: sự tán thành."
    },
    {
     "qNum": 8,
     "domain": "Information and Ideas",
     "skill": "Central Ideas: Main Idea",
     "difficulty": "E",
     "isPretest": false,
     "passage": "Octopuses are escape artists. They squeeze through cracks smaller than a coin, open jar lids from the inside, and slip out of aquarium tanks at night.",
     "stem": "Which choice best states the main idea of the text?",
     "options": [
      "A. Aquarium tanks are poorly built",
      "B. Octopuses dislike closed jars",
      "C. Sea animals are active at night",
      "D. Octopuses are skilled at escaping"
     ],
     "answer": "D",
     "explanation": "Câu đầu là topic sentence; ba ví dụ sau minh họa tài thoát thân."
    },
    {
     "qNum": 9,
     "domain": "Information and Ideas",
     "skill": "Supporting Details",
     "difficulty": "E",
     "isPretest": false,
     "passage": "The Trung sisters led a rebellion against Han rule in 40 CE, raising an army that captured sixty-five cities before the revolt was crushed three years later.",
     "stem": "According to the text, the rebellion lasted about ____.",
     "options": [
      "A. sixty-five years",
      "B. three years",
      "C. forty years",
      "D. one year"
     ],
     "answer": "B",
     "explanation": "'crushed three years later': cuộc khởi nghĩa kéo dài khoảng ba năm. 65 là số thành chiếm được, 40 là năm bắt đầu."
    },
    {
     "qNum": 10,
     "domain": "Information and Ideas",
     "skill": "Central Ideas: Main Idea",
     "difficulty": "M",
     "isPretest": false,
     "passage": "Streaming services promised endless choice, yet users report spending more time browsing than watching. Some platforms now limit menus deliberately, betting that fewer options will keep viewers happier.",
     "stem": "Which choice best states the main idea of the text?",
     "options": [
      "A. Streaming services offer too few shows",
      "B. Users enjoy browsing more than watching",
      "C. Too much choice may reduce viewer satisfaction",
      "D. Platforms are losing money on menus"
     ],
     "answer": "C",
     "explanation": "'yet users report...' + việc nền tảng chủ động giảm lựa chọn: quá nhiều lựa chọn làm giảm sự hài lòng."
    },
    {
     "qNum": 11,
     "domain": "Information and Ideas",
     "skill": "Command of Evidence: Data",
     "difficulty": "M",
     "isPretest": false,
     "passage": "Average study hours per week at one school: Grade 10: 12 hours; Grade 11: 15 hours; Grade 12: 21 hours.",
     "stem": "Which statement does the data support?",
     "options": [
      "A. Study time nearly doubles from Grade 10 to Grade 12",
      "B. Grade 11 students study the least",
      "C. Study time falls slightly each year",
      "D. All three grades study equally"
     ],
     "answer": "A",
     "explanation": "12 giờ lên 21 giờ: gần gấp đôi (12 x 2 = 24, 21 gần 24). Các đáp án khác trái với bảng."
    },
    {
     "qNum": 12,
     "domain": "Information and Ideas",
     "skill": "Inference",
     "difficulty": "M",
     "isPretest": false,
     "passage": "Cities plant trees for shade, but species choice matters: gingkos tolerate pollution well, while cherry trees, though beautiful, sicken quickly along busy roads.",
     "stem": "Based on the text, a street with heavy traffic is better suited to ____.",
     "options": [
      "A. cherry trees",
      "B. no trees at all",
      "C. gingkos",
      "D. fruit trees"
     ],
     "answer": "C",
     "explanation": "Suy luận: đường đông xe = ô nhiễm cao; gingko 'tolerate pollution well' nên phù hợp hơn."
    },
    {
     "qNum": 13,
     "domain": "Information and Ideas",
     "skill": "Command of Evidence: Data",
     "difficulty": "H",
     "isPretest": false,
     "passage": "Researchers tracked 2,000 adults for a decade: those who walked at least 7,000 steps daily had a 50 percent lower risk of early death, but benefits leveled off beyond 10,000 steps.",
     "stem": "The data best support which conclusion?",
     "options": [
      "A. Walking more always adds equal benefit",
      "B. Benefits of walking increase up to a point",
      "C. Only athletes benefit from daily walking",
      "D. Step counting devices are inaccurate"
     ],
     "answer": "B",
     "explanation": "'benefits leveled off beyond 10,000 steps': lợi ích tăng đến một ngưỡng rồi chững lại."
    },
    {
     "qNum": 14,
     "domain": "Information and Ideas",
     "skill": "Command of Evidence: Support",
     "difficulty": "H",
     "isPretest": false,
     "passage": "A historian claims that Vietnamese ceramics reached global markets centuries before European traders arrived in Asia.",
     "stem": "Which finding, if true, would best support the historian's claim?",
     "options": [
      "A. Vietnamese kilns produced ceramics mainly for local temples",
      "B. Fifteenth-century Vietnamese bowls were found in a shipwreck bound for the Middle East",
      "C. European traders kept detailed records of their purchases",
      "D. Modern Vietnamese ceramics are exported worldwide"
     ],
     "answer": "B",
     "explanation": "Bát gốm thế kỷ 15 trên tàu đi Trung Đông = bằng chứng giao thương toàn cầu TRƯỚC khi người châu Âu đến."
    },
    {
     "qNum": 15,
     "domain": "Expression of Ideas",
     "skill": "Transitions",
     "difficulty": "E",
     "isPretest": false,
     "passage": "Mangroves protect coastlines from storms. ____, their roots shelter young fish and crabs.",
     "stem": "Which choice completes the text with the most logical transition?",
     "options": [
      "A. In addition",
      "B. However",
      "C. Instead",
      "D. On the contrary"
     ],
     "answer": "A",
     "explanation": "Câu 2 bổ sung một lợi ích MỚI cùng hướng: dùng 'In addition'."
    },
    {
     "qNum": 16,
     "domain": "Expression of Ideas",
     "skill": "Transitions",
     "difficulty": "E",
     "isPretest": false,
     "passage": "The first bridge design proved too costly. ____, engineers proposed a simpler structure.",
     "stem": "Which choice completes the text with the most logical transition?",
     "options": [
      "A. Similarly",
      "B. Therefore",
      "C. For example",
      "D. Meanwhile"
     ],
     "answer": "B",
     "explanation": "Quan hệ nhân quả: thiết kế quá đắt NÊN kỹ sư đề xuất phương án đơn giản hơn."
    },
    {
     "qNum": 17,
     "domain": "Expression of Ideas",
     "skill": "Transitions",
     "difficulty": "M",
     "isPretest": false,
     "passage": "Coffee prices rose sharply last year. ____, many cafes kept their menu prices unchanged, absorbing the extra cost themselves.",
     "stem": "Which choice completes the text with the most logical transition?",
     "options": [
      "A. As a result",
      "B. For instance",
      "C. Even so",
      "D. In other words"
     ],
     "answer": "C",
     "explanation": "Giá tăng NHƯNG quán vẫn giữ giá: quan hệ nhượng bộ, dùng 'Even so' (dù vậy)."
    },
    {
     "qNum": 18,
     "domain": "Expression of Ideas",
     "skill": "Combining Sentences",
     "difficulty": "M",
     "isPretest": false,
     "passage": "The museum digitized its collection. Researchers worldwide can now study the artifacts.",
     "stem": "Which choice best combines the sentences to show cause and effect?",
     "options": [
      "A. The museum digitized its collection, researchers worldwide can now study the artifacts.",
      "B. Because the museum digitized its collection, researchers worldwide can now study the artifacts.",
      "C. The museum digitized its collection; because researchers can now study the artifacts.",
      "D. The museum, digitizing its collection, researchers study the artifacts."
     ],
     "answer": "B",
     "explanation": "'Because' + DC đứng đầu, dấu phẩy trước IC: đúng ngữ pháp và đúng quan hệ nhân quả. Đáp án A là Comma Splice."
    },
    {
     "qNum": 19,
     "domain": "Expression of Ideas",
     "skill": "Concision",
     "difficulty": "M",
     "isPretest": false,
     "passage": "The end result of the experiment was that it completely eliminated all of the bacteria entirely.",
     "stem": "Which choice most effectively revises the sentence for concision?",
     "options": [
      "A. The experiment eliminated the bacteria.",
      "B. The end result was the complete elimination of all bacteria entirely.",
      "C. The experiment completely eliminated all of the bacteria in the end.",
      "D. The result was that bacteria were all completely eliminated."
     ],
     "answer": "A",
     "explanation": "'eliminated' đã bao hàm 'completely/entirely'; 'end result' lặp nghĩa. Bản ngắn nhất giữ đủ ý."
    },
    {
     "qNum": 20,
     "domain": "Expression of Ideas",
     "skill": "Rhetorical Synthesis",
     "difficulty": "H",
     "isPretest": false,
     "passage": "Notes: Hoi An founded in the 15th century; major trading port for silk and ceramics; monthly lantern festival; UNESCO World Heritage Site since 1999.",
     "stem": "The student wants to emphasize Hoi An's historical role in trade. Which choice best accomplishes this goal?",
     "options": [
      "A. Hoi An hosts a beautiful and famous lantern festival every single month.",
      "B. From the 15th century, Hoi An served as a major port where silk and ceramics changed hands.",
      "C. Hoi An became a UNESCO World Heritage Site in the year 1999.",
      "D. Visitors today enjoy walking slowly along Hoi An's charming ancient streets."
     ],
     "answer": "B",
     "explanation": "Chỉ đáp án B nói về vai trò THƯƠNG MẠI trong LỊCH SỬ: cảng, tơ lụa, gốm sứ, thế kỷ 15."
    },
    {
     "qNum": 21,
     "domain": "Standard English Conventions",
     "skill": "Boundaries: FANBOYS",
     "difficulty": "E",
     "isPretest": false,
     "passage": "The bell rang ____ the students hurried to class.",
     "stem": "Which choice completes the text so that it conforms to the conventions of Standard Written English?",
     "options": [
      "A. a comma only",
      "B. a semicolon + \"so\"",
      "C. a comma + \"and\"",
      "D. \"and\" followed by a comma"
     ],
     "answer": "C",
     "explanation": "Hai IC nối bằng FANBOYS cần dấu phẩy TRƯỚC liên từ: ', and'."
    },
    {
     "qNum": 22,
     "domain": "Standard English Conventions",
     "skill": "Subject-Verb Agreement",
     "difficulty": "E",
     "isPretest": false,
     "passage": "The paintings in the gallery ____ from the eighteenth century.",
     "stem": "Which choice completes the text so that it conforms to the conventions of Standard Written English?",
     "options": [
      "A. dates",
      "B. is dating",
      "C. has dated",
      "D. date"
     ],
     "answer": "D",
     "explanation": "Chủ ngữ thật 'paintings' (số nhiều); 'in the gallery' là cụm xen giữa: dùng 'date'."
    },
    {
     "qNum": 23,
     "domain": "Standard English Conventions",
     "skill": "Boundaries: Colon",
     "difficulty": "M",
     "isPretest": false,
     "passage": "One ingredient is essential to the recipe ____ fresh lemongrass.",
     "stem": "Which punctuation correctly completes the text?",
     "options": [
      "A. a comma (,)",
      "B. a semicolon (;)",
      "C. a colon (:)",
      "D. a period (.)"
     ],
     "answer": "C",
     "explanation": "Trước chỗ trống là IC hoàn chỉnh, sau đó là phần giải thích/định nghĩa: dùng colon."
    },
    {
     "qNum": 24,
     "domain": "Standard English Conventions",
     "skill": "Verb Tense: Consistency",
     "difficulty": "M",
     "isPretest": false,
     "passage": "The team collected samples, labeled each vial, and ____ them to the laboratory.",
     "stem": "Which choice completes the text so that it conforms to the conventions of Standard Written English?",
     "options": [
      "A. sends",
      "B. will send",
      "C. sent",
      "D. is sending"
     ],
     "answer": "C",
     "explanation": "Chuỗi hành động quá khứ 'collected, labeled': động từ thứ ba giữ cùng thì 'sent'."
    },
    {
     "qNum": 25,
     "domain": "Standard English Conventions",
     "skill": "Subject-Verb Agreement: Neither/nor",
     "difficulty": "M",
     "isPretest": false,
     "passage": "Neither the coach nor the players ____ satisfied with the final result.",
     "stem": "Which choice completes the text so that it conforms to the conventions of Standard Written English?",
     "options": [
      "A. was",
      "B. is",
      "C. has been",
      "D. were"
     ],
     "answer": "D",
     "explanation": "Với 'neither... nor', động từ chia theo danh từ GẦN NHẤT: 'players' (số nhiều) nên dùng 'were'."
    },
    {
     "qNum": 26,
     "domain": "Standard English Conventions",
     "skill": "Boundaries: Non-essential Elements",
     "difficulty": "H",
     "isPretest": false,
     "passage": "The Perfume River ____ which flows through Hue ____ turns gold at sunset.",
     "stem": "Which punctuation correctly sets off the phrase \"which flows through Hue\"?",
     "options": [
      "A. a pair of commas",
      "B. a pair of semicolons",
      "C. a colon before and after",
      "D. no punctuation is needed"
     ],
     "answer": "A",
     "explanation": "Mệnh đề 'which flows through Hue' là thông tin bổ sung (non-essential): bao bằng CẶP dấu phẩy."
    },
    {
     "qNum": 27,
     "domain": "Standard English Conventions",
     "skill": "Verb Tense",
     "difficulty": "M",
     "isPretest": true,
     "passage": "The lecture had already begun when we ____ the hall.",
     "stem": "Which choice completes the text so that it conforms to the conventions of Standard Written English?",
     "options": [
      "A. enter",
      "B. entered",
      "C. will enter",
      "D. are entering"
     ],
     "answer": "B",
     "explanation": "[Câu thử nghiệm, không tính điểm] 'had already begun' đặt bối cảnh quá khứ: dùng 'entered'."
    }
   ]
  },
  "module2_harder": {
   "id": "module2_harder",
   "title": "Module 2 | Nhánh Khó (Harder adaptive mix)",
   "timeLimit": 1920,
   "questionCount": 27,
   "scoredCount": 25,
   "domainOrder": [
    "Craft and Structure",
    "Information and Ideas",
    "Expression of Ideas",
    "Standard English Conventions"
   ],
   "questions": [
    {
     "qNum": 1,
     "domain": "Craft and Structure",
     "skill": "Words in Context",
     "difficulty": "M",
     "isPretest": false,
     "passage": "The findings were preliminary; the team cautioned that months of replication would be needed before any firm conclusion could be drawn.",
     "stem": "As used in the text, \"preliminary\" most nearly means ____.",
     "options": [
      "A. completely mistaken",
      "B. surprising to experts",
      "C. kept secret",
      "D. early and not yet final"
     ],
     "answer": "D",
     "explanation": "Vế sau dấu chấm phẩy giải thích: còn cần nhiều tháng kiểm chứng, tức kết quả mới là bước đầu."
    },
    {
     "qNum": 2,
     "domain": "Craft and Structure",
     "skill": "Words in Context: Roots",
     "difficulty": "H",
     "isPretest": false,
     "passage": "Her benevolent gestures, from funding scholarships to housing refugees, earned citywide gratitude.",
     "stem": "Based on the root \"bene-\", \"benevolent\" most nearly means ____.",
     "options": [
      "A. extremely wealthy",
      "B. widely famous",
      "C. careful with money",
      "D. kind and generous"
     ],
     "answer": "D",
     "explanation": "bene- = tốt, thiện (benefit, benefactor). Các ví dụ (học bổng, nhà ở) đều là việc thiện."
    },
    {
     "qNum": 3,
     "domain": "Craft and Structure",
     "skill": "Words in Context: Context Clues",
     "difficulty": "H",
     "isPretest": false,
     "passage": "The manuscript's provenance was murky: no one could trace who had owned it before 1890.",
     "stem": "As used in the text, \"provenance\" most nearly means ____.",
     "options": [
      "A. physical condition",
      "B. literary style",
      "C. history of ownership",
      "D. market value"
     ],
     "answer": "C",
     "explanation": "Definition clue sau dấu hai chấm: 'no one could trace who had OWNED it', tức lai lịch sở hữu."
    },
    {
     "qNum": 4,
     "domain": "Craft and Structure",
     "skill": "Words in Context",
     "difficulty": "M",
     "isPretest": false,
     "passage": "The senator's remarks were deliberately equivocal, allowing both supporters and critics to hear what they wished.",
     "stem": "As used in the text, \"equivocal\" most nearly means ____.",
     "options": [
      "A. loud and forceful",
      "B. intentionally unclear",
      "C. deeply offensive",
      "D. carefully rehearsed"
     ],
     "answer": "B",
     "explanation": "Cả hai phe đều nghe được điều mình muốn: phát ngôn cố tình mơ hồ, nước đôi."
    },
    {
     "qNum": 5,
     "domain": "Craft and Structure",
     "skill": "Text Structure & Purpose",
     "difficulty": "H",
     "isPretest": false,
     "passage": "Economists long assumed that people weigh costs and benefits rationally. Behavioral research upended this view: shoppers anchor on the first price they see, and losses loom larger than equivalent gains.",
     "stem": "Which choice best describes the overall structure of the text?",
     "options": [
      "A. an assumption followed by evidence against it",
      "B. the steps of an economic process in order",
      "C. a comparison of two shopping strategies",
      "D. a definition followed by its history"
     ],
     "answer": "A",
     "explanation": "Câu 1 nêu giả định cũ; 'upended this view' + hai bằng chứng hành vi bác bỏ giả định đó."
    },
    {
     "qNum": 6,
     "domain": "Craft and Structure",
     "skill": "Text Structure & Purpose: Function",
     "difficulty": "H",
     "isPretest": false,
     "passage": "Critics call urban farming a hobby for the wealthy. A Hanoi rooftop cooperative, however, sells vegetables at neighborhood markets below supermarket prices, and its members are mostly retirees on modest pensions.",
     "stem": "The example of the cooperative mainly serves to ____.",
     "options": [
      "A. confirm the critics' description of urban farming",
      "B. counter the characterization in the first sentence",
      "C. explain how rooftop gardens are constructed",
      "D. argue that supermarkets overcharge customers"
     ],
     "answer": "B",
     "explanation": "'however' + chi tiết giá rẻ, thành viên hưu trí thu nhập khiêm tốn: phản bác nhận định 'thú vui nhà giàu'."
    },
    {
     "qNum": 7,
     "domain": "Craft and Structure",
     "skill": "Words in Context",
     "difficulty": "M",
     "isPretest": true,
     "passage": "The species is so elusive that researchers have photographed it only twice in thirty years.",
     "stem": "As used in the text, \"elusive\" most nearly means ____.",
     "options": [
      "A. dangerous",
      "B. tiny",
      "C. hard to find",
      "D. newly discovered"
     ],
     "answer": "C",
     "explanation": "[Câu thử nghiệm, không tính điểm] 30 năm chỉ chụp được hai lần: loài vật khó bắt gặp."
    },
    {
     "qNum": 8,
     "domain": "Information and Ideas",
     "skill": "Central Ideas: Main Idea",
     "difficulty": "M",
     "isPretest": false,
     "passage": "The Saharan dust that drifts across the Atlantic each summer is no mere nuisance: it fertilizes the Amazon with phosphorus, feeds ocean plankton, and even suppresses hurricanes by drying the air.",
     "stem": "Which choice best states the main idea of the text?",
     "options": [
      "A. Saharan dust plays several surprising ecological roles",
      "B. Hurricanes cannot form in dry air",
      "C. The Amazon rainforest lacks natural nutrients",
      "D. Dust storms are becoming more frequent"
     ],
     "answer": "A",
     "explanation": "'no mere nuisance' + ba vai trò được liệt kê: bụi Sahara có nhiều tác dụng sinh thái bất ngờ."
    },
    {
     "qNum": 9,
     "domain": "Information and Ideas",
     "skill": "Supporting Details",
     "difficulty": "M",
     "isPretest": false,
     "passage": "Nguyen Du composed The Tale of Kieu in six-eight verse, a form whose alternating lines lend themselves to memorization; generations of Vietnamese who never read the poem could nonetheless recite long passages.",
     "stem": "According to the text, the six-eight verse form helped the poem ____.",
     "options": [
      "A. reach foreign readers",
      "B. win official approval",
      "C. avoid strict censorship",
      "D. be easily memorized"
     ],
     "answer": "D",
     "explanation": "'lend themselves to memorization' và việc nhiều thế hệ thuộc lòng dù chưa từng đọc."
    },
    {
     "qNum": 10,
     "domain": "Information and Ideas",
     "skill": "Central Ideas: Main Idea (implied)",
     "difficulty": "H",
     "isPretest": false,
     "passage": "In 1907, a \"computer\" was a person, usually a woman, hired to calculate by hand. The word outlived the workers: when machines took over the arithmetic, they inherited the name as well.",
     "stem": "The text is mainly about ____.",
     "options": [
      "A. how a word's meaning shifted with technology",
      "B. why women were hired as computers",
      "C. the invention of arithmetic machines",
      "D. office wages in the early 1900s"
     ],
     "answer": "A",
     "explanation": "Trọng tâm là số phận của TỪ 'computer': từ chỉ người sang chỉ máy. Các chi tiết khác chỉ phục vụ ý này."
    },
    {
     "qNum": 11,
     "domain": "Information and Ideas",
     "skill": "Command of Evidence: Data",
     "difficulty": "H",
     "isPretest": false,
     "passage": "Share of global vanilla supply: Madagascar about 80 percent; Indonesia 6 percent; Mexico, vanilla's native home, under 5 percent.",
     "stem": "The data most directly support which statement?",
     "options": [
      "A. Mexico consumes very little vanilla",
      "B. Vanilla production has moved far from its place of origin",
      "C. Madagascar's vanilla crop is declining",
      "D. Indonesian vanilla is the highest quality"
     ],
     "answer": "B",
     "explanation": "Quê gốc (Mexico) dưới 5 phần trăm trong khi Madagascar 80 phần trăm: sản xuất đã dời rất xa nơi xuất xứ."
    },
    {
     "qNum": 12,
     "domain": "Information and Ideas",
     "skill": "Inference",
     "difficulty": "H",
     "isPretest": false,
     "passage": "Desert plants space themselves widely, their roots secreting chemicals that deter seedlings nearby. What looks like emptiness is, in effect, fierce underground competition.",
     "stem": "The author implies that the apparent emptiness of deserts is ____.",
     "options": [
      "A. proof that few seeds ever arrive",
      "B. the outcome of competition among plants",
      "C. caused entirely by poor soil",
      "D. an illusion created by distance"
     ],
     "answer": "B",
     "explanation": "'in effect, fierce underground competition': khoảng trống là KẾT QUẢ của cạnh tranh hóa học giữa rễ cây."
    },
    {
     "qNum": 13,
     "domain": "Information and Ideas",
     "skill": "Command of Evidence: Data",
     "difficulty": "M",
     "isPretest": false,
     "passage": "In a memory study, participants recalled 42 percent of items after one night of cramming but 78 percent after spaced review over a week.",
     "stem": "The data best support which conclusion?",
     "options": [
      "A. Spaced review nearly doubled recall compared with cramming",
      "B. Cramming improves long-term memory more than spaced review",
      "C. Both study methods produced almost equal results",
      "D. Human memory cannot be measured reliably in studies"
     ],
     "answer": "A",
     "explanation": "78 so với 42: gần gấp đôi. Đây chính là hiệu ứng spaced repetition."
    },
    {
     "qNum": 14,
     "domain": "Information and Ideas",
     "skill": "Command of Evidence: Support",
     "difficulty": "H",
     "isPretest": false,
     "passage": "A biologist hypothesizes that city birds sing at higher pitches in order to be heard over low-frequency traffic noise.",
     "stem": "Which finding, if true, would best support the hypothesis?",
     "options": [
      "A. City birds sing more often at dawn than at noon",
      "B. The same species sings at a higher pitch in cities than in nearby forests",
      "C. Traffic noise varies from neighborhood to neighborhood",
      "D. Some forest birds also sing at high pitches"
     ],
     "answer": "B",
     "explanation": "So sánh CÙNG MỘT LOÀI ở hai môi trường: khác biệt cao độ gắn trực tiếp với tiếng ồn đô thị."
    },
    {
     "qNum": 15,
     "domain": "Expression of Ideas",
     "skill": "Transitions",
     "difficulty": "M",
     "isPretest": false,
     "passage": "The reef appeared healthy from the surface. ____, divers found widespread bleaching below ten meters.",
     "stem": "Which choice completes the text with the most logical transition?",
     "options": [
      "A. Consequently",
      "B. For example",
      "C. Likewise",
      "D. However"
     ],
     "answer": "D",
     "explanation": "Bề mặt trông khỏe mạnh NHƯNG bên dưới tẩy trắng diện rộng: hai ý trái ngược."
    },
    {
     "qNum": 16,
     "domain": "Expression of Ideas",
     "skill": "Transitions",
     "difficulty": "M",
     "isPretest": false,
     "passage": "Vaccination rates in the region rose above 90 percent. ____, outbreaks of measles nearly disappeared.",
     "stem": "Which choice completes the text with the most logical transition?",
     "options": [
      "A. Nevertheless",
      "B. By contrast",
      "C. Consequently",
      "D. For instance"
     ],
     "answer": "C",
     "explanation": "Tỷ lệ tiêm chủng cao dẫn đến hệ quả: dịch sởi gần như biến mất. Quan hệ nhân quả."
    },
    {
     "qNum": 17,
     "domain": "Expression of Ideas",
     "skill": "Transitions",
     "difficulty": "H",
     "isPretest": false,
     "passage": "Critics predicted the electric buses would fail in the summer heat. The fleet, ____, has run for three summers without a single breakdown.",
     "stem": "Which choice completes the text with the most logical transition?",
     "options": [
      "A. in other words",
      "B. for example",
      "C. however",
      "D. therefore"
     ],
     "answer": "C",
     "explanation": "Dự đoán thất bại nhưng thực tế ngược lại: 'however' chen giữa câu, giữa hai dấu phẩy."
    },
    {
     "qNum": 18,
     "domain": "Expression of Ideas",
     "skill": "Combining Sentences",
     "difficulty": "H",
     "isPretest": false,
     "passage": "The village moved to higher ground. Flooding had destroyed its rice fields three years in a row.",
     "stem": "Which choice best combines the sentences to show why the village moved?",
     "options": [
      "A. The village moved to higher ground; flooding, destroying its rice fields three years in a row.",
      "B. The village moved to higher ground, flooding had destroyed its rice fields three years in a row.",
      "C. Although the village moved to higher ground, flooding had destroyed its rice fields.",
      "D. The village moved to higher ground because flooding had destroyed its rice fields three years in a row."
     ],
     "answer": "D",
     "explanation": "'because' nêu đúng quan hệ nhân quả. Đáp án B là Comma Splice; A sai cấu trúc; C đổi nghĩa."
    },
    {
     "qNum": 19,
     "domain": "Expression of Ideas",
     "skill": "Concision",
     "difficulty": "M",
     "isPretest": false,
     "passage": "The reason that the bridge closed was due to the fact that inspectors found cracks in two support beams.",
     "stem": "Which choice most effectively revises the sentence for concision?",
     "options": [
      "A. The bridge closed because inspectors found cracks in two support beams.",
      "B. The bridge closed due to the fact that cracks were found by inspectors.",
      "C. The reason the bridge closed was because of cracks being found.",
      "D. Inspectors finding cracks was the reason for which the bridge closed."
     ],
     "answer": "A",
     "explanation": "'The reason... was due to the fact that' là cụm lặp nghĩa kinh điển; thay bằng 'because'."
    },
    {
     "qNum": 20,
     "domain": "Expression of Ideas",
     "skill": "Rhetorical Synthesis",
     "difficulty": "H",
     "isPretest": false,
     "passage": "Notes on Vo Thi Sau: born 1933; joined the resistance at 14; executed in 1952; youngest prisoner at Con Dao; commemorated today in songs and school names across Vietnam.",
     "stem": "The student wants to emphasize Vo Thi Sau's lasting legacy. Which choice best accomplishes this goal?",
     "options": [
      "A. Vo Thi Sau was born in 1933 in Ba Ria province in southern Vietnam.",
      "B. She joined the resistance movement at the young age of fourteen.",
      "C. Songs and schools across Vietnam still carry Vo Thi Sau's name, decades after her death.",
      "D. Con Dao prison held many political prisoners during the colonial period."
     ],
     "answer": "C",
     "explanation": "'lasting legacy' = di sản còn lại HÔM NAY: chỉ đáp án C nói về sự tưởng nhớ hiện tại."
    },
    {
     "qNum": 21,
     "domain": "Standard English Conventions",
     "skill": "Boundaries: Semicolon",
     "difficulty": "M",
     "isPretest": false,
     "passage": "The experiment demanded patience ____ each trial took a full week to complete.",
     "stem": "Which punctuation correctly completes the text?",
     "options": [
      "A. a comma (,)",
      "B. a semicolon (;)",
      "C. a colon placed after \"each\"",
      "D. no punctuation"
     ],
     "answer": "B",
     "explanation": "Hai IC liên quan chặt chẽ: dấu chấm phẩy nối đúng. Dấu phẩy một mình là Comma Splice."
    },
    {
     "qNum": 22,
     "domain": "Standard English Conventions",
     "skill": "Subject-Verb Agreement",
     "difficulty": "M",
     "isPretest": false,
     "passage": "The quality of the recordings, not the performances themselves, ____ criticized in early reviews.",
     "stem": "Which choice completes the text so that it conforms to the conventions of Standard Written English?",
     "options": [
      "A. were",
      "B. have been",
      "C. was",
      "D. are"
     ],
     "answer": "C",
     "explanation": "Chủ ngữ thật là 'The quality' (số ít); cụm 'not the performances themselves' chỉ là phần chen giữa."
    },
    {
     "qNum": 23,
     "domain": "Standard English Conventions",
     "skill": "Boundaries: Colon",
     "difficulty": "H",
     "isPretest": false,
     "passage": "Three rivers converge at the delta ____ the Tien, the Hau, and their countless branching channels.",
     "stem": "Which punctuation correctly completes the text?",
     "options": [
      "A. a semicolon (;)",
      "B. a colon (:)",
      "C. a comma (,)",
      "D. a period (.)"
     ],
     "answer": "B",
     "explanation": "IC hoàn chỉnh + danh sách giải thích: colon. Semicolon đòi hỏi vế sau là IC."
    },
    {
     "qNum": 24,
     "domain": "Standard English Conventions",
     "skill": "Verb Tense: Past Perfect",
     "difficulty": "H",
     "isPretest": false,
     "passage": "By the time conservators finished the restoration, the mural ____ hidden under plaster for two centuries.",
     "stem": "Which choice completes the text so that it conforms to the conventions of Standard Written English?",
     "options": [
      "A. was",
      "B. had been",
      "C. has been",
      "D. would be"
     ],
     "answer": "B",
     "explanation": "'By the time + quá khứ': hành động xảy ra TRƯỚC đó dùng past perfect 'had been'."
    },
    {
     "qNum": 25,
     "domain": "Standard English Conventions",
     "skill": "Subject-Verb Agreement: Inverted",
     "difficulty": "H",
     "isPretest": false,
     "passage": "Among the artifacts recovered from the shipwreck ____ a rare set of bronze drums.",
     "stem": "Which choice completes the text so that it conforms to the conventions of Standard Written English?",
     "options": [
      "A. were",
      "B. are",
      "C. was",
      "D. have been"
     ],
     "answer": "C",
     "explanation": "Câu đảo ngữ: chủ ngữ thật là 'a rare set' (số ít) đứng SAU động từ: dùng 'was'."
    },
    {
     "qNum": 26,
     "domain": "Standard English Conventions",
     "skill": "Boundaries: Non-essential Elements",
     "difficulty": "M",
     "isPretest": false,
     "passage": "The cathedral ____ begun in 1877 and finished half a century later ____ still dominates the city skyline.",
     "stem": "Which punctuation correctly sets off the phrase \"begun in 1877 and finished half a century later\"?",
     "options": [
      "A. a pair of commas",
      "B. a pair of semicolons",
      "C. a colon before and after",
      "D. no punctuation is needed"
     ],
     "answer": "A",
     "explanation": "Cụm bổ sung thông tin có thể lược bỏ: bao bằng CẶP dấu phẩy (hoặc cặp dấu gạch)."
    },
    {
     "qNum": 27,
     "domain": "Standard English Conventions",
     "skill": "Verb Tense",
     "difficulty": "M",
     "isPretest": true,
     "passage": "Farmers in the delta ____ rice for a thousand years before saltwater intrusion forced many to change crops.",
     "stem": "Which choice completes the text so that it conforms to the conventions of Standard Written English?",
     "options": [
      "A. grow",
      "B. have grown",
      "C. had grown",
      "D. will grow"
     ],
     "answer": "C",
     "explanation": "[Câu thử nghiệm, không tính điểm] Hành động kéo dài TRƯỚC một mốc quá khứ: past perfect 'had grown'."
    }
   ]
  },
  "module2_easier": {
   "id": "module2_easier",
   "title": "Module 2 | Nhánh Dễ (Easier adaptive mix)",
   "timeLimit": 1920,
   "questionCount": 27,
   "scoredCount": 25,
   "domainOrder": [
    "Craft and Structure",
    "Information and Ideas",
    "Expression of Ideas",
    "Standard English Conventions"
   ],
   "questions": [
    {
     "qNum": 1,
     "domain": "Craft and Structure",
     "skill": "Words in Context: Prefixes",
     "difficulty": "E",
     "isPretest": false,
     "passage": "The show was postponed until next week because of the heavy rain.",
     "stem": "Based on the prefix \"post-\", \"postponed\" means moved to a ____ time.",
     "options": [
      "A. earlier",
      "B. shorter",
      "C. better",
      "D. later"
     ],
     "answer": "D",
     "explanation": "post- = sau (postscript). 'until next week' xác nhận nghĩa dời về sau."
    },
    {
     "qNum": 2,
     "domain": "Craft and Structure",
     "skill": "Words in Context: Definition Clue",
     "difficulty": "E",
     "isPretest": false,
     "passage": "The market sells many local herbs, plants used to flavor food.",
     "stem": "Based on the context, \"herbs\" are ____.",
     "options": [
      "A. cooking pots",
      "B. types of dried fish",
      "C. sweet fruits",
      "D. plants used in cooking"
     ],
     "answer": "D",
     "explanation": "Definition clue sau dấu phẩy: 'plants used to flavor food'."
    },
    {
     "qNum": 3,
     "domain": "Craft and Structure",
     "skill": "Words in Context: Example Clue",
     "difficulty": "E",
     "isPretest": false,
     "passage": "Huong enjoys aquatic sports such as swimming and rowing.",
     "stem": "As used in the text, \"aquatic\" most nearly means ____.",
     "options": [
      "A. very expensive",
      "B. played in teams",
      "C. slightly dangerous",
      "D. done in water"
     ],
     "answer": "D",
     "explanation": "Example clue 'such as swimming and rowing': cả hai đều là môn dưới nước."
    },
    {
     "qNum": 4,
     "domain": "Craft and Structure",
     "skill": "Words in Context: Contrast Clue",
     "difficulty": "M",
     "isPretest": false,
     "passage": "The old software was complicated, but the new app is remarkably straightforward.",
     "stem": "As used in the text, \"straightforward\" most nearly means ____.",
     "options": [
      "A. costly",
      "B. slow",
      "C. simple",
      "D. colorful"
     ],
     "answer": "C",
     "explanation": "Contrast clue 'but': trái nghĩa với 'complicated' là đơn giản, dễ dùng."
    },
    {
     "qNum": 5,
     "domain": "Craft and Structure",
     "skill": "Text Structure & Purpose",
     "difficulty": "E",
     "isPretest": false,
     "passage": "Wash your hands for twenty seconds. Cover your mouth when you cough. These simple habits stop germs from spreading.",
     "stem": "What is the main purpose of the text?",
     "options": [
      "A. to describe a hospital",
      "B. to give advice on stopping germs",
      "C. to explain how germs are studied",
      "D. to tell a story about illness"
     ],
     "answer": "B",
     "explanation": "Hai câu mệnh lệnh + lời khuyên: mục đích hướng dẫn/khuyên bảo."
    },
    {
     "qNum": 6,
     "domain": "Craft and Structure",
     "skill": "Text Structure & Purpose",
     "difficulty": "M",
     "isPretest": false,
     "passage": "Many people think tomatoes are vegetables. Botanists, however, classify them as fruits because they grow from flowers and contain seeds.",
     "stem": "Which choice best describes the structure of the text?",
     "options": [
      "A. a common belief followed by a correction",
      "B. a list of popular vegetables",
      "C. a story about a farmer",
      "D. the steps for growing tomatoes"
     ],
     "answer": "A",
     "explanation": "Câu 1 nêu niềm tin phổ biến; 'however' + phân loại khoa học chỉnh lại niềm tin đó."
    },
    {
     "qNum": 7,
     "domain": "Craft and Structure",
     "skill": "Words in Context",
     "difficulty": "E",
     "isPretest": true,
     "passage": "The library is a valuable resource for students preparing for exams.",
     "stem": "As used in the text, \"resource\" most nearly means ____.",
     "options": [
      "A. something useful",
      "B. a kind of book",
      "C. a quiet room",
      "D. a difficult test"
     ],
     "answer": "A",
     "explanation": "[Câu thử nghiệm, không tính điểm] resource = nguồn hỗ trợ hữu ích (AWL Buổi 1)."
    },
    {
     "qNum": 8,
     "domain": "Information and Ideas",
     "skill": "Central Ideas: Main Idea",
     "difficulty": "E",
     "isPretest": false,
     "passage": "Rice is central to Vietnamese life. Families eat it daily, festivals celebrate it, and the language has dozens of words for it.",
     "stem": "Which choice best states the main idea of the text?",
     "options": [
      "A. Rice is very important in Vietnamese life",
      "B. Festivals happen every year in Vietnam",
      "C. Vietnamese has many interesting words",
      "D. Families should eat together daily"
     ],
     "answer": "A",
     "explanation": "Câu đầu là topic sentence; ba ví dụ sau minh họa tầm quan trọng của lúa gạo."
    },
    {
     "qNum": 9,
     "domain": "Information and Ideas",
     "skill": "Supporting Details",
     "difficulty": "E",
     "isPretest": false,
     "passage": "The night market opens at six in the evening and closes at midnight, though food stalls often stay open an hour longer.",
     "stem": "According to the text, food stalls often close at ____.",
     "options": [
      "A. midnight",
      "B. six in the evening",
      "C. one in the morning",
      "D. eleven at night"
     ],
     "answer": "C",
     "explanation": "'an hour longer' sau midnight = 1 giờ sáng. Cẩn thận với đáp án A lấy đúng chữ 'midnight'."
    },
    {
     "qNum": 10,
     "domain": "Information and Ideas",
     "skill": "Central Ideas: Main Idea",
     "difficulty": "M",
     "isPretest": false,
     "passage": "Walking to school has quiet benefits. Students arrive more alert, they get daily exercise, and they learn the streets of their own neighborhood.",
     "stem": "Which choice best states the main idea of the text?",
     "options": [
      "A. Walking to school brings several benefits",
      "B. Most students dislike riding buses",
      "C. Exercise should happen in the morning",
      "D. City streets can be dangerous"
     ],
     "answer": "A",
     "explanation": "Câu đầu nêu ý chính; ba lợi ích liệt kê phía sau là supporting details."
    },
    {
     "qNum": 11,
     "domain": "Information and Ideas",
     "skill": "Command of Evidence: Data",
     "difficulty": "M",
     "isPretest": false,
     "passage": "Bus route 8 runs every 10 minutes during rush hour and every 20 minutes at other times of day.",
     "stem": "Based on the text, at 8 a.m. on a workday (rush hour), the bus runs ____.",
     "options": [
      "A. every 20 minutes",
      "B. every 10 minutes",
      "C. once an hour",
      "D. every 5 minutes"
     ],
     "answer": "B",
     "explanation": "8 giờ sáng ngày làm việc thuộc rush hour: 10 phút một chuyến."
    },
    {
     "qNum": 12,
     "domain": "Information and Ideas",
     "skill": "Supporting Details",
     "difficulty": "E",
     "isPretest": false,
     "passage": "The school garden grows morning glory, mint, and basil. Students water the plants before class each day.",
     "stem": "According to the text, which plant grows in the school garden?",
     "options": [
      "A. corn",
      "B. mint",
      "C. roses",
      "D. bamboo"
     ],
     "answer": "B",
     "explanation": "'morning glory, mint, and basil': mint có trong danh sách."
    },
    {
     "qNum": 13,
     "domain": "Information and Ideas",
     "skill": "Command of Evidence: Data",
     "difficulty": "M",
     "isPretest": false,
     "passage": "A survey of 100 students found: 40 walk to school, 35 ride bicycles, and 25 come by bus.",
     "stem": "Which statement about the data is accurate?",
     "options": [
      "A. Most students come by bus",
      "B. Walking is the most common way to school",
      "C. Bicycles are the least common choice",
      "D. Every student lives near school"
     ],
     "answer": "B",
     "explanation": "40 là con số lớn nhất trong ba nhóm: đi bộ phổ biến nhất."
    },
    {
     "qNum": 14,
     "domain": "Information and Ideas",
     "skill": "Inference",
     "difficulty": "M",
     "isPretest": false,
     "passage": "Minh checked the dark sky, grabbed his raincoat, and hurried to the bus stop.",
     "stem": "It is most reasonable to infer that Minh expected ____.",
     "options": [
      "A. bright sunshine",
      "B. a school holiday",
      "C. rain",
      "D. a difficult test"
     ],
     "answer": "C",
     "explanation": "Trời tối sầm + mang áo mưa: suy luận hợp lý là Minh đoán trời sắp mưa."
    },
    {
     "qNum": 15,
     "domain": "Expression of Ideas",
     "skill": "Transitions",
     "difficulty": "E",
     "isPretest": false,
     "passage": "Mai finished her homework early. ____, she helped her younger brother with his.",
     "stem": "Which choice completes the text with the most logical transition?",
     "options": [
      "A. Then",
      "B. However",
      "C. Instead",
      "D. For example"
     ],
     "answer": "A",
     "explanation": "Hai hành động nối tiếp theo thời gian: 'Then' (sau đó)."
    },
    {
     "qNum": 16,
     "domain": "Expression of Ideas",
     "skill": "Transitions",
     "difficulty": "E",
     "isPretest": false,
     "passage": "The path was muddy after the storm. ____, we wore rubber boots.",
     "stem": "Which choice completes the text with the most logical transition?",
     "options": [
      "A. However",
      "B. Therefore",
      "C. For instance",
      "D. On the other hand"
     ],
     "answer": "B",
     "explanation": "Đường lầy NÊN mang ủng: quan hệ nhân quả, dùng 'Therefore'."
    },
    {
     "qNum": 17,
     "domain": "Expression of Ideas",
     "skill": "Transitions",
     "difficulty": "M",
     "isPretest": false,
     "passage": "Some birds fly south for the winter. ____, the swallows leave Vietnam's north each November.",
     "stem": "Which choice completes the text with the most logical transition?",
     "options": [
      "A. However",
      "B. Therefore",
      "C. For example",
      "D. Instead"
     ],
     "answer": "C",
     "explanation": "Chim én là VÍ DỤ cụ thể cho ý 'một số loài chim bay về phương nam'."
    },
    {
     "qNum": 18,
     "domain": "Expression of Ideas",
     "skill": "Combining Sentences",
     "difficulty": "E",
     "isPretest": false,
     "passage": "The bell rang. The students went home.",
     "stem": "Which choice best combines the two sentences?",
     "options": [
      "A. The bell rang, the students went home.",
      "B. When the bell rang, the students went home.",
      "C. The bell rang the students went home.",
      "D. The bell, ringing, the students, went home."
     ],
     "answer": "B",
     "explanation": "'When' + DC đứng đầu, dấu phẩy trước IC. Đáp án A là Comma Splice, C là Run-on."
    },
    {
     "qNum": 19,
     "domain": "Expression of Ideas",
     "skill": "Concision",
     "difficulty": "M",
     "isPretest": false,
     "passage": "In this day and age of today, phones are used by almost everyone.",
     "stem": "Which choice most effectively revises the sentence for concision?",
     "options": [
      "A. Today, almost everyone uses a phone.",
      "B. In this modern day and age, phones are used by everyone.",
      "C. Nowadays of today, everyone uses phones.",
      "D. Phones, in this day and age, are used by almost everyone today."
     ],
     "answer": "A",
     "explanation": "'In this day and age of today' lặp nghĩa; 'Today' là đủ. Câu chủ động ngắn gọn hơn."
    },
    {
     "qNum": 20,
     "domain": "Expression of Ideas",
     "skill": "Rhetorical Synthesis",
     "difficulty": "M",
     "isPretest": false,
     "passage": "Notes on the beach clean-up: 50 volunteers joined; 200 kg of trash collected; next event happens in March.",
     "stem": "The student wants to invite readers to join the next event. Which choice best accomplishes this goal?",
     "options": [
      "A. The clean-up collected 200 kg of trash from the beach in one day.",
      "B. Fifty enthusiastic volunteers attended the event this year.",
      "C. Join the next beach clean-up this March and help keep our coast clean.",
      "D. Trash left on beaches can seriously harm many sea animals."
     ],
     "answer": "C",
     "explanation": "Mục tiêu là LỜI MỜI: chỉ đáp án C kêu gọi trực tiếp người đọc tham gia."
    },
    {
     "qNum": 21,
     "domain": "Standard English Conventions",
     "skill": "Boundaries: FANBOYS",
     "difficulty": "E",
     "isPretest": false,
     "passage": "We packed our bags ____ we left for the station.",
     "stem": "Which choice completes the text so that it conforms to the conventions of Standard Written English?",
     "options": [
      "A. a comma + \"and\"",
      "B. \"and\" followed by a comma",
      "C. a semicolon + \"and\"",
      "D. a comma only"
     ],
     "answer": "A",
     "explanation": "Hai IC nối bằng FANBOYS: dấu phẩy TRƯỚC 'and'. Dấu phẩy một mình là Comma Splice."
    },
    {
     "qNum": 22,
     "domain": "Standard English Conventions",
     "skill": "Subject-Verb Agreement",
     "difficulty": "E",
     "isPretest": false,
     "passage": "My brother ____ badminton with his friends every weekend.",
     "stem": "Which choice completes the text so that it conforms to the conventions of Standard Written English?",
     "options": [
      "A. play",
      "B. are playing",
      "C. have played",
      "D. plays"
     ],
     "answer": "D",
     "explanation": "Chủ ngữ 'My brother' số ít + thói quen hằng tuần: hiện tại đơn 'plays'."
    },
    {
     "qNum": 23,
     "domain": "Standard English Conventions",
     "skill": "Boundaries: Items in a List",
     "difficulty": "E",
     "isPretest": false,
     "passage": "We bought mangoes ____ bananas, and papayas at the market.",
     "stem": "Which punctuation correctly completes the text?",
     "options": [
      "A. a semicolon (;)",
      "B. a colon (:)",
      "C. a comma (,)",
      "D. a period (.)"
     ],
     "answer": "C",
     "explanation": "Danh sách 3 món trở lên: dấu phẩy sau mỗi mục (Oxford comma trước 'and')."
    },
    {
     "qNum": 24,
     "domain": "Standard English Conventions",
     "skill": "Verb Tense: Time Signals",
     "difficulty": "E",
     "isPretest": false,
     "passage": "Yesterday, the children ____ kites by the river all afternoon.",
     "stem": "Which choice completes the text so that it conforms to the conventions of Standard Written English?",
     "options": [
      "A. fly",
      "B. flies",
      "C. will fly",
      "D. flew"
     ],
     "answer": "D",
     "explanation": "'Yesterday' là quá khứ: dùng 'flew'."
    },
    {
     "qNum": 25,
     "domain": "Standard English Conventions",
     "skill": "Subject-Verb Agreement: Each",
     "difficulty": "M",
     "isPretest": false,
     "passage": "Each of the classrooms ____ a new projector this semester.",
     "stem": "Which choice completes the text so that it conforms to the conventions of Standard Written English?",
     "options": [
      "A. have",
      "B. has",
      "C. are having",
      "D. were having"
     ],
     "answer": "B",
     "explanation": "'Each' luôn đi với động từ số ít; 'of the classrooms' là cụm xen giữa."
    },
    {
     "qNum": 26,
     "domain": "Standard English Conventions",
     "skill": "Verb Tense: Consistency",
     "difficulty": "M",
     "isPretest": false,
     "passage": "Lan opened her book and ____ to read by the window.",
     "stem": "Which choice completes the text so that it conforms to the conventions of Standard Written English?",
     "options": [
      "A. begins",
      "B. will begin",
      "C. began",
      "D. is beginning"
     ],
     "answer": "C",
     "explanation": "'opened' ở quá khứ: động từ thứ hai giữ cùng thì 'began'."
    },
    {
     "qNum": 27,
     "domain": "Standard English Conventions",
     "skill": "Boundaries: FANBOYS",
     "difficulty": "E",
     "isPretest": true,
     "passage": "It rained all morning ____ the match was cancelled.",
     "stem": "Which choice completes the text so that it conforms to the conventions of Standard Written English?",
     "options": [
      "A. a comma + \"so\"",
      "B. \"so\" followed by a comma",
      "C. a semicolon + \"and so,\"",
      "D. a comma only"
     ],
     "answer": "A",
     "explanation": "[Câu thử nghiệm, không tính điểm] Nhân quả giữa hai IC: ', so' đúng chuẩn."
    }
   ]
  }
 }
};

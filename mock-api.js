/**
 * EDUBAHO Mock API Server — port 3001
 * Hech qanday DB kerak emas. Frontend ni test qilish uchun.
 * Ishga tushirish: node mock-api.js
 */

const http = require('http')

// ─── Mock ma'lumotlar ──────────────────────────────────────────────────────────

const cities = [
  { id: 'c1', nameUz: 'Toshkent', nameRu: 'Ташкент' },
  { id: 'c2', nameUz: 'Samarqand', nameRu: 'Самарканд' },
  { id: 'c3', nameUz: 'Buxoro', nameRu: 'Бухара' },
  { id: 'c4', nameUz: 'Namangan', nameRu: 'Наманган' },
  { id: 'c5', nameUz: 'Andijon', nameRu: 'Андижан' },
]

const regions = [
  { id: 'r1', nameUz: 'Toshkent shahri', nameRu: 'г. Ташкент', slug: 'toshkent-shahri', type: 'city', institutionCount: 12 },
  { id: 'r2', nameUz: 'Toshkent viloyati', nameRu: 'Ташкентская область', slug: 'toshkent-viloyati', type: 'region', institutionCount: 5 },
  { id: 'r3', nameUz: 'Samarqand viloyati', nameRu: 'Самаркандская область', slug: 'samarqand', type: 'region', institutionCount: 4 },
  { id: 'r4', nameUz: 'Farg\'ona viloyati', nameRu: 'Ферганская область', slug: 'fargona', type: 'region', institutionCount: 3 },
  { id: 'r5', nameUz: 'Buxoro viloyati', nameRu: 'Бухарская область', slug: 'buxoro', type: 'region', institutionCount: 2 },
]

const institutions = [
  {
    id: '1', slug: 'najot-talim', nameUz: "Najot Ta'lim", nameRu: "Najot Ta'lim",
    type: 'IT_SCHOOL', status: 'ACTIVE', isVerified: true,
    avgRating: 4.8, reviewCount: 342,
    phone: '+998712000004', telegram: 'najottalim', instagram: 'najottalim',
    website: 'https://najottalim.uz',
    address: "Toshkent, Yunusobod tumani, 19-mavze, 14-uy",
    city: { nameUz: 'Toshkent', nameRu: 'Ташкент' },
    subscription: { plan: 'PREMIUM' },
    pricing: { monthlyMin: 800000, monthlyMax: 1500000, paymentMethods: ['Naqd', 'Karta', "Bo'lib to'lash"] },
    details: {
      descriptionUz: "Najot Ta'lim — O'zbekistondagi eng yirik IT ta'lim markazlaridan biri. 2016-yildan beri 50 000+ bitiruvchi tayyorlagan. Toshkent, Samarqand, Namangan va boshqa shaharlarda filiallari mavjud. Barcha kurslar amaliy loyihalar asosida o'tiladi.",
      descriptionRu: "Najot Ta'lim — один из крупнейших IT-образовательных центров Узбекистана. С 2016 года подготовлено более 50 000 выпускников.",
      foundedYear: 2016, studentCount: 12000, teacherCount: 85,
      languages: ['uz', 'ru'],
      programs: ['Frontend', 'Backend', 'Mobile (Flutter)', 'Python', 'Java', 'UI/UX Design', 'Data Science', 'DevOps'],
      specializations: ['Web development', 'Mobile development', 'Grafik dizayn'],
      shifts: ['08:00–10:00', '10:00–12:00', '14:00–16:00', '18:00–20:00'],
      achievements: "• 50 000+ bitiruvchi\n• Top-3 IT maktablar reytingida\n• Google, Epam, Uzum kabi kompaniyalarda ishlayotgan bitiruvchilar\n• O'quvchilarning 78% kursgacha ishga joylashadi",
    },
    reviews: [
      { id: 'rv1', overallRating: 5, teacherRating: 5, facilityRating: 4, valueRating: 5, serviceRating: 5, atmosphereRating: 5, title: "Ajoyib o'quv markaz!", body: "Python kursini tugatdim. O'qituvchilar juda malakali, amaliy loyihalar juda foydali bo'ldi. Kurs davomida haqiqiy loyiha ustida ishlash imkoniyati bor edi.", isAnonymous: false, helpfulCount: 24, createdAt: '2025-04-10T10:00:00Z', user: { name: 'Jasur Toshmatov' } },
      { id: 'rv2', overallRating: 5, teacherRating: 5, facilityRating: 5, valueRating: 4, serviceRating: 5, atmosphereRating: 5, title: "Frontend kursini tavsiya qilaman", body: "6 oy ichida Frontend dasturchi bo'ldim. Hozir Tashkent shahridagi kompaniyada ishlayapman. O'qituvchilar doimo yordam berishga tayyor.", isAnonymous: false, helpfulCount: 18, createdAt: '2025-03-22T14:30:00Z', user: { name: 'Malika Yusupova' } },
      { id: 'rv3', overallRating: 4, teacherRating: 4, facilityRating: 4, valueRating: 4, serviceRating: 4, atmosphereRating: 5, body: "Umuman yaxshi markaz. Flutter kursi sifatli. Narxi bir oz yuqori lekin sifatiga arziyor.", isAnonymous: true, helpfulCount: 12, createdAt: '2025-02-15T09:00:00Z' },
    ]
  },
  {
    id: '2', slug: 'pdp-academy', nameUz: 'PDP Academy', nameRu: 'PDP Academy',
    type: 'IT_SCHOOL', status: 'ACTIVE', isVerified: true,
    avgRating: 4.7, reviewCount: 218,
    phone: '+998781234567', telegram: 'pdpacademy', instagram: 'pdpacademy_uz',
    website: 'https://pdp.uz',
    address: "Toshkent, Chilonzor tumani, Bunyodkor ko'chasi, 1A",
    city: { nameUz: 'Toshkent', nameRu: 'Ташкент' },
    subscription: { plan: 'PREMIUM' },
    pricing: { monthlyMin: 700000, monthlyMax: 1200000, paymentMethods: ['Naqd', 'Karta'] },
    details: {
      descriptionUz: "PDP Academy — O'zbekistondagi IT ta'lim sohasi yetakchilaridan biri. Zamonaviy o'qitish metodlari va tajribali o'qituvchilar bilan 40 000+ talaba tayyorlangan.",
      descriptionRu: "PDP Academy — один из лидеров IT-образования в Узбекистане.",
      foundedYear: 2017, studentCount: 8500, teacherCount: 60,
      languages: ['uz', 'ru', 'en'],
      programs: ['Frontend (React)', 'Backend (Node.js)', 'Java', 'Python', 'Flutter', 'iOS (Swift)', 'Android (Kotlin)', 'Cyber Security'],
      specializations: ['Full Stack', 'Mobile', 'Xavfsizlik'],
      shifts: ['09:00–11:00', '11:00–13:00', '17:00–19:00', '19:00–21:00'],
      achievements: "• 40 000+ bitiruvchi\n• YandEx, Google, Epam hamkorligi\n• O'quvchilarning 82% kurs davomida ishga joylashadi",
    },
    reviews: [
      { id: 'rv4', overallRating: 5, teacherRating: 5, facilityRating: 5, valueRating: 4, serviceRating: 5, atmosphereRating: 5, title: "React kursini tavsiya qilaman", body: "6 oy React kursini tugatdim. Endi Tashkentdagi kompaniyada junior frontend dasturchi sifatida ishlamoqdaman. O'qituvchilar industry tajribasiga ega.", isAnonymous: false, helpfulCount: 31, createdAt: '2025-05-01T11:00:00Z', user: { name: 'Bobur Alimov' } },
      { id: 'rv5', overallRating: 4, teacherRating: 4, facilityRating: 5, valueRating: 4, serviceRating: 4, atmosphereRating: 4, body: "Juda yaxshi markaz. Java kursi kuchli dastur bilan o'tiladi. Bir oz boshlanishda qiyin bo'ladi, lekin keyin osonlashadi.", isAnonymous: false, helpfulCount: 15, createdAt: '2025-04-15T09:30:00Z', user: { name: 'Sherzod Nazarov' } },
    ]
  },
  {
    id: '3', slug: 'itpark-academy', nameUz: 'IT Park Academy', nameRu: 'IT Park Academy',
    type: 'IT_SCHOOL', status: 'ACTIVE', isVerified: true,
    avgRating: 4.6, reviewCount: 156,
    phone: '+998781234568', telegram: 'itpark_academy',
    website: 'https://itpark.uz',
    address: "Toshkent, Yakkasaroy tumani, Amir Temur shoh ko'chasi, 108",
    city: { nameUz: 'Toshkent', nameRu: 'Ташкент' },
    subscription: { plan: 'BASIC' },
    pricing: { monthlyMin: 600000, monthlyMax: 1000000, paymentMethods: ['Naqd', 'Karta', 'Online'] },
    details: {
      descriptionUz: "IT Park Academy — Davlat qo'llab-quvvatlashida faoliyat yurituvchi IT ta'lim markazi. Zamonaviy laboratoriyalar va xalqaro sertifikatlar bilan ta'minlangan.",
      foundedYear: 2019, studentCount: 5200, teacherCount: 45,
      languages: ['uz', 'en'],
      programs: ['Dasturlash (Python)', 'Web dasturlash', 'Sun\'iy intellekt', 'Data Science', 'Kibertexnologiyalar'],
      shifts: ['09:00–13:00', '14:00–18:00', '18:00–22:00'],
      achievements: "• Davlat sertifikati beriladigan kurslar\n• Xalqaro hamkorlik dasturlari\n• 5000+ bitiruvchi",
    },
    reviews: [
      { id: 'rv6', overallRating: 5, teacherRating: 5, facilityRating: 5, valueRating: 5, serviceRating: 4, atmosphereRating: 5, body: "Data Science kursini tugatdim. O'qituvchilar PhD darajasiga ega, juda chuqur bilim berishadi.", isAnonymous: false, helpfulCount: 22, createdAt: '2025-03-10T10:00:00Z', user: { name: 'Nodira Hasanova' } },
    ]
  },
  {
    id: '4', slug: 'british-council-tashkent', nameUz: 'British Council', nameRu: 'Британский совет',
    type: 'LANGUAGE_CENTER', status: 'ACTIVE', isVerified: true,
    avgRating: 4.9, reviewCount: 89,
    phone: '+998712524265', website: 'https://britishcouncil.uz',
    telegram: 'britishcounciluz', instagram: 'britishcounciluz',
    address: "Toshkent, Mirzo Ulug'bek tumani, Afrosiyob ko'chasi, 21",
    city: { nameUz: 'Toshkent', nameRu: 'Ташкент' },
    subscription: { plan: 'PREMIUM' },
    pricing: { monthlyMin: 1200000, monthlyMax: 2500000, paymentMethods: ['Karta', 'Online'] },
    details: {
      descriptionUz: "British Council — ingliz tili o'qitishda dunyo yetakchisi. Cambridge sertifikatlari (IELTS, Cambridge English) tayyorlovi bo'yicha rasmiy imtihon markazi.",
      descriptionRu: "Британский совет — мировой лидер в преподавании английского языка. Официальный центр экзаменов Cambridge.",
      foundedYear: 1997, studentCount: 3200, teacherCount: 35,
      languages: ['uz', 'ru', 'en'],
      programs: ['IELTS tayyorgarlik', 'Cambridge English', 'General English', 'Business English', 'TOEFL Preparation'],
      specializations: ['Bolalar uchun ingliz tili', 'Kattalar uchun', 'Korporativ ta\'lim'],
      shifts: ['08:00–10:00', '10:00–12:00', '14:00–16:00', '16:00–18:00', '18:00–20:00'],
      achievements: "• IELTS rasmiy imtihon markazi\n• O'rtacha IELTS bali: 7.0\n• Cambridge sertifikati beriladigan kurslar",
    },
    reviews: [
      { id: 'rv7', overallRating: 5, teacherRating: 5, facilityRating: 5, valueRating: 4, serviceRating: 5, atmosphereRating: 5, title: "IELTS 7.5 oldim!", body: "British Council da IELTS kursini tugatib 7.5 ball oldim. O'qituvchilar native speaker va juda tajribali. Narxi yuqori lekin sifatiga to'g'ri keladi.", isAnonymous: false, helpfulCount: 45, createdAt: '2025-04-20T12:00:00Z', user: { name: 'Zulfiya Karimova' } },
    ]
  },
  {
    id: '5', slug: 'zero-one-education', nameUz: 'Zero-One Education', nameRu: 'Zero-One Education',
    type: 'LANGUAGE_CENTER', status: 'ACTIVE', isVerified: true,
    avgRating: 4.5, reviewCount: 174,
    phone: '+998781234570', telegram: 'zerooneedu',
    address: "Toshkent, Yakkasaroy tumani, Mustakillik shoh ko'chasi, 75",
    city: { nameUz: 'Toshkent', nameRu: 'Ташкент' },
    subscription: { plan: 'BASIC' },
    pricing: { monthlyMin: 400000, monthlyMax: 800000, paymentMethods: ['Naqd', 'Karta'] },
    details: {
      descriptionUz: "Zero-One Education — ingliz, rus, xitoy va koreys tillarini o'qituvchi zamonaviy til markazi. Qulay jadval va arzon narxlar bilan mashhur.",
      foundedYear: 2018, studentCount: 4800, teacherCount: 42,
      languages: ['uz', 'ru'],
      programs: ["Ingliz tili (A1-C2)", "Rus tili", "Xitoy tili (HSK)", "Koreys tili (TOPIK)", "IELTS", "CEFR sertifikat"],
      shifts: ['08:00–10:00', '10:00–12:00', '12:00–14:00', '14:00–16:00', '16:00–18:00', '18:00–20:00'],
      achievements: "• IELTS o'rtacha ball: 6.5\n• 4800+ faol talaba\n• Arzon narx va sifatli ta'lim kombinatsiyasi",
    },
    reviews: [
      { id: 'rv8', overallRating: 5, teacherRating: 4, facilityRating: 4, valueRating: 5, serviceRating: 4, atmosphereRating: 5, body: "Arzon narxda sifatli ingliz tili kursi. IELTS 6.5 oldim, juda mamnun.", isAnonymous: false, helpfulCount: 28, createdAt: '2025-03-05T10:00:00Z', user: { name: 'Sardor Mirzayev' } },
    ]
  },
  {
    id: '6', slug: 'toshkent-xalqaro-maktab', nameUz: 'Toshkent Xalqaro Maktabi', nameRu: 'Ташкентская международная школа',
    type: 'SCHOOL', status: 'ACTIVE', isVerified: true,
    avgRating: 4.7, reviewCount: 67,
    phone: '+998712207300', website: 'https://tashkentintschool.com',
    address: "Toshkent, Mirzo Ulug'bek tumani, Xalqlar do'stligi 2A",
    city: { nameUz: 'Toshkent', nameRu: 'Ташкент' },
    subscription: { plan: 'PREMIUM' },
    pricing: { monthlyMin: 3500000, monthlyMax: 5000000, paymentMethods: ['Karta', 'Bank o\'tkazmasi'] },
    details: {
      descriptionUz: "Toshkent Xalqaro Maktabi — xalqaro IB (International Baccalaureate) dasturi asosida ta'lim beruvchi prestijli maktab. 1-sinfdan 12-sinfgacha ingliz tilida o'qitish.",
      foundedYear: 1994, studentCount: 850, teacherCount: 120,
      languages: ['en', 'uz', 'ru'],
      programs: ['IB PYP (Boshlang\'ich)', 'IB MYP (O\'rta)', 'IB DP (Yuqori)', 'A-Level', 'SAT tayyorgarlik'],
      specializations: ['Xalqaro maktab', 'IB dasturi', 'Chet el universitetiga kirish'],
      achievements: "• 100% IB bitiruvchilari xalqaro universitetlarga kiradi\n• Harvard, Oxford, MIT kabi universitetlarda bitiruvchilar\n• Ingilteraning akkreditatsiyasiga ega",
    },
    reviews: [
      { id: 'rv9', overallRating: 5, teacherRating: 5, facilityRating: 5, valueRating: 4, serviceRating: 5, atmosphereRating: 5, title: "Farzandim uchun eng yaxshi tanlov", body: "O'g'lim 3-sinfdan beri o'qiydi. IB dasturi juda kuchli, o'qituvchilar tajribali native speakerlar. Narxi yuqori lekin sifat a'lo darajada.", isAnonymous: false, helpfulCount: 19, createdAt: '2025-02-28T10:00:00Z', user: { name: 'Dilnoza Ergasheva' } },
    ]
  },
  {
    id: '7', slug: 'mirzo-ulugbek-litseyi', nameUz: "Mirzo Ulug'bek nomidagi Prezident Litseyi", nameRu: 'Президентский лицей им. Мирзо Улугбека',
    type: 'LYCEUM', status: 'ACTIVE', isVerified: true,
    avgRating: 4.9, reviewCount: 134,
    phone: '+998712378900',
    address: "Toshkent, Chilonzor tumani, Qorasaroy ko'chasi, 1",
    city: { nameUz: 'Toshkent', nameRu: 'Ташкент' },
    subscription: { plan: 'PREMIUM' },
    pricing: { monthlyMin: 0, paymentMethods: ['Bepul (davlat granti)'] },
    details: {
      descriptionUz: "Prezident Litseyi — O'zbekistondagi eng nufuzli o'rta ta'lim muassasasi. Faqat eng a'lo o'quvchilar qabul qilinadi. Barcha shaharlar uchun yotoqxona mavjud.",
      foundedYear: 1999, studentCount: 1200, teacherCount: 95,
      languages: ['uz', 'ru', 'en'],
      programs: ['Matematika', 'Fizika', 'Kimyo', 'Biologiya', 'Informatika', "Chet tillari"],
      achievements: "• Xalqaro olimpiadalarda 50+ oltin medal\n• Abituriyentlarning 95% top universitetlarga kiradi\n• IMO, IPhO, IChO ishtirokchilari",
    },
    reviews: [
      { id: 'rv10', overallRating: 5, teacherRating: 5, facilityRating: 5, valueRating: 5, serviceRating: 5, atmosphereRating: 5, title: "O'zbekistondagi eng yaxshi litsey", body: "3 yil o'qidim. Matematika olimpiadalarida xalqaro darajada qatnashdim. O'qituvchilar fan doktorlari, ta'lim darajasi universitetdan yuqori.", isAnonymous: false, helpfulCount: 67, createdAt: '2025-01-15T10:00:00Z', user: { name: 'Timur Abdullayev' } },
    ]
  },
  {
    id: '8', slug: 'samarqand-it-hub', nameUz: 'Samarqand IT Hub', nameRu: 'Самарканд IT Hub',
    type: 'IT_SCHOOL', status: 'ACTIVE', isVerified: false,
    avgRating: 4.3, reviewCount: 52,
    phone: '+998662345678', telegram: 'samarqand_ithub',
    address: "Samarqand, Registon ko'chasi, 45",
    city: { nameUz: 'Samarqand', nameRu: 'Самарканд' },
    subscription: { plan: 'BASIC' },
    pricing: { monthlyMin: 450000, monthlyMax: 700000, paymentMethods: ['Naqd', 'Karta'] },
    details: {
      descriptionUz: "Samarqand IT Hub — Samarqand shahridagi yetakchi IT ta'lim markazi. Web dasturlash, grafik dizayn va marketing kurslarini o'tkazadi.",
      foundedYear: 2020, studentCount: 1800, teacherCount: 22,
      languages: ['uz'],
      programs: ['Frontend (HTML/CSS/JS)', 'Python', 'Grafik dizayn (Figma)', 'SMM & Digital Marketing'],
      shifts: ['09:00–11:00', '17:00–19:00'],
    },
    reviews: [
      { id: 'rv11', overallRating: 4, teacherRating: 4, facilityRating: 3, valueRating: 5, serviceRating: 4, atmosphereRating: 4, body: "Samarqandda yaxshi tanlov. Narxi arzon, o'qituvchilar yaxshi. Hudud uchun eng sifatli IT markaz.", isAnonymous: false, helpfulCount: 11, createdAt: '2025-04-01T10:00:00Z', user: { name: 'Ulmas Tursunov' } },
    ]
  },
  {
    id: '9', slug: 'step-computer-academy', nameUz: 'STEP Computer Academy', nameRu: 'Компьютерная Академия ШАГ',
    type: 'IT_SCHOOL', status: 'ACTIVE', isVerified: true,
    avgRating: 4.4, reviewCount: 203,
    phone: '+998712000011', website: 'https://itstep.uz',
    telegram: 'itstepuz', instagram: 'itstepuz',
    address: "Toshkent, Mirzo Ulug'bek tumani, Amir Temur shoh ko'chasi, 22",
    city: { nameUz: 'Toshkent', nameRu: 'Ташкент' },
    subscription: { plan: 'BASIC' },
    pricing: { monthlyMin: 650000, monthlyMax: 1100000, paymentMethods: ['Naqd', 'Karta'] },
    details: {
      descriptionUz: "STEP Computer Academy — xalqaro IT ta'lim tarmog'ining O'zbekiston filiali. 25 yillik tajriba va xalqaro sertifikatlar.",
      foundedYear: 2000, studentCount: 6500, teacherCount: 55,
      languages: ['uz', 'ru'],
      programs: ['C++/C# dasturlash', 'Java', 'Web dasturlash', 'Game Development', 'AI & Machine Learning', 'Cyber Security'],
      achievements: "• Microsoft, Cisco rasmiy sertifikatlash markazi\n• 20+ yillik tajriba\n• Toshkent, Namangan, Andijon shaharlarda filiallar",
    },
    reviews: [
      { id: 'rv12', overallRating: 4, teacherRating: 4, facilityRating: 4, valueRating: 4, serviceRating: 4, atmosphereRating: 4, body: "C++ va Java kurslarini tugatdim. Microsoft sertifikatini oldim. Xalqaro miqyosdagi ta'lim dasturi.", isAnonymous: false, helpfulCount: 34, createdAt: '2025-02-10T10:00:00Z', user: { name: 'Kamol Rustamov' } },
    ]
  },
  {
    id: '10', slug: 'milliy-bogcha-1', nameUz: "Milliy Bog'cha №1", nameRu: 'Национальный детский сад №1',
    type: 'KINDERGARTEN', status: 'ACTIVE', isVerified: true,
    avgRating: 4.6, reviewCount: 38,
    phone: '+998712345001',
    address: "Toshkent, Uchtepa tumani, Uchtepa ko'chasi, 12",
    city: { nameUz: 'Toshkent', nameRu: 'Ташкент' },
    subscription: { plan: 'BASIC' },
    pricing: { monthlyMin: 800000, monthlyMax: 1200000, paymentMethods: ['Naqd', 'Karta'] },
    details: {
      descriptionUz: "Zamonaviy maktabgacha ta'lim muassasasi. Montessori metodikasi asosida 2-6 yoshli bolalarga ingliz tili va rivojlantiruvchi ta'lim beriladi.",
      foundedYear: 2015, studentCount: 180, teacherCount: 18,
      languages: ['uz', 'en'],
      programs: ['Ingliz tili (Early Childhood)', 'Montessori metodikasi', 'Musiqa va raqs', 'Rasm chizish', 'Sport va jismoniy rivojlanish'],
    },
    reviews: [
      { id: 'rv13', overallRating: 5, teacherRating: 5, facilityRating: 5, valueRating: 4, serviceRating: 5, atmosphereRating: 5, body: "Qizimni 3 yoshidan beri olib boraman. Ingliz tilini yaxshi o'rganmoqda, o'qituvchilar bolalarga mehribonlik bilan munosabatda. Juda mamnun!", isAnonymous: false, helpfulCount: 14, createdAt: '2025-04-05T10:00:00Z', user: { name: 'Gulnora Abdullayeva' } },
    ]
  },
  {
    id: '11', slug: 'ustoz-quv-markazi', nameUz: "Ustoz O'quv Markazi", nameRu: 'Учебный центр Устоз',
    type: 'COURSE_CENTER', status: 'ACTIVE', isVerified: false,
    avgRating: 4.2, reviewCount: 95,
    phone: '+998901234567', telegram: 'ustoz_edu',
    address: "Toshkent, Sergeli tumani, Yangi Sergeli ko'chasi, 8",
    city: { nameUz: 'Toshkent', nameRu: 'Ташкент' },
    subscription: { plan: 'BASIC' },
    pricing: { monthlyMin: 250000, monthlyMax: 500000, paymentMethods: ['Naqd'] },
    details: {
      descriptionUz: "Qulay narxlarda matematika, fizika, kimyo va ingliz tili kurslari. Maktab o'quvchilari va imtihonga tayyorgarlik uchun mo'ljallangan.",
      foundedYear: 2019, studentCount: 1200, teacherCount: 15,
      languages: ['uz'],
      programs: ['Matematika', 'Fizika', 'Kimyo', 'Biologiya', "Ingliz tili", "O'zbek tili va adabiyoti"],
      shifts: ['14:00–16:00', '16:00–18:00', '18:00–20:00'],
    },
    reviews: [
      { id: 'rv14', overallRating: 4, teacherRating: 4, facilityRating: 3, valueRating: 5, serviceRating: 4, atmosphereRating: 4, body: "Matematika va fizikadan juda yaxshi dars berishadi. Narxi juda qulay. Imtihonga tayyorgarlik uchun tavsiya qilaman.", isAnonymous: false, helpfulCount: 20, createdAt: '2025-03-20T10:00:00Z', user: { name: 'Alisher Toshpulatov' } },
    ]
  },
  {
    id: '12', slug: 'new-generation-school', nameUz: 'New Generation School', nameRu: 'Школа нового поколения',
    type: 'SCHOOL', status: 'ACTIVE', isVerified: true,
    avgRating: 4.5, reviewCount: 78,
    phone: '+998712345100', website: 'https://newgen.school.uz',
    address: "Toshkent, Yakkasaroy tumani, Kichik halqa yo'li, 34",
    city: { nameUz: 'Toshkent', nameRu: 'Ташкент' },
    subscription: { plan: 'BASIC' },
    pricing: { monthlyMin: 1500000, monthlyMax: 2000000, paymentMethods: ['Karta', 'Bank o\'tkazmasi'] },
    details: {
      descriptionUz: "New Generation School — zamonaviy xususiy maktab. STEM ta'lim yo'nalishi va ingliz tili chuqurlashtirilgan o'rta ta'lim muassasasi.",
      foundedYear: 2018, studentCount: 650, teacherCount: 72,
      languages: ['uz', 'en'],
      programs: ['STEM (Science, Technology, Engineering, Math)', "Chuqurlashtirilgan ingliz tili", "Dasturlash asoslari", "Robototexnika"],
      achievements: "• Respublika olimpiadalarida 15+ sovrindor\n• SAT o'rtacha bali: 1350",
    },
    reviews: [
      { id: 'rv15', overallRating: 5, teacherRating: 5, facilityRating: 4, valueRating: 4, serviceRating: 5, atmosphereRating: 5, body: "O'g'lim 5-sinfdan beri o'qiydi. STEM yo'nalishi juda kuchli, ingliz tili darajasi yuqori. Har yili olimpiadalarda qatnashadi.", isAnonymous: false, helpfulCount: 25, createdAt: '2025-01-20T10:00:00Z', user: { name: 'Barno Xolmatova' } },
    ]
  },
]

// ─── Helper funksiyalar ────────────────────────────────────────────────────────

function paginate(arr, page, limit) {
  const p = parseInt(page) || 1
  const l = parseInt(limit) || 12
  const total = arr.length
  const totalPages = Math.ceil(total / l)
  const start = (p - 1) * l
  const data = arr.slice(start, start + l)
  return { data, meta: { total, page: p, limit: l, totalPages } }
}

function filterInstitutions(query) {
  const q = (query.q || '').toLowerCase()
  const type = query.type || ''
  const sortBy = query.sortBy || 'rating'
  const page = query.page || 1
  const limit = query.limit || 12

  let list = [...institutions]

  // Filter by type
  if (type) list = list.filter(i => i.type === type)

  // Filter by search query
  if (q) {
    list = list.filter(i =>
      i.nameUz.toLowerCase().includes(q) ||
      (i.nameRu || '').toLowerCase().includes(q) ||
      (i.city?.nameUz || '').toLowerCase().includes(q) ||
      (i.details?.programs || []).some(p => p.toLowerCase().includes(q))
    )
  }

  // Sort
  if (sortBy === 'rating') list.sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0))
  else if (sortBy === 'newest') list.sort((a, b) => b.id.localeCompare(a.id))
  else if (sortBy === 'price_asc') list.sort((a, b) => (a.pricing?.monthlyMin || 0) - (b.pricing?.monthlyMin || 0))
  else if (sortBy === 'price_desc') list.sort((a, b) => (b.pricing?.monthlyMin || 0) - (a.pricing?.monthlyMin || 0))

  return paginate(list, page, limit)
}

// ─── Server ────────────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, ngrok-skip-browser-warning')
  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return }

  const url = new URL(req.url, 'http://localhost:3001')
  const path = url.pathname
  const query = Object.fromEntries(url.searchParams)

  console.log(`${req.method} ${path}`)

  // ─── Routes ────────────────────────────────────────────────────────────────

  // GET /api/v1/institutions
  if (path === '/api/v1/institutions' && req.method === 'GET') {
    const result = filterInstitutions(query)
    res.writeHead(200)
    res.end(JSON.stringify({ status: 'ok', ...result }))
    return
  }

  // GET /api/v1/institutions/:slug
  const slugMatch = path.match(/^\/api\/v1\/institutions\/([^\/]+)$/)
  if (slugMatch && req.method === 'GET') {
    const inst = institutions.find(i => i.slug === slugMatch[1])
    if (!inst) { res.writeHead(404); res.end(JSON.stringify({ error: 'Not found' })); return }
    res.writeHead(200)
    res.end(JSON.stringify({ status: 'ok', data: inst }))
    return
  }

  // GET /api/v1/geo/regions
  if (path === '/api/v1/geo/regions') {
    res.writeHead(200)
    res.end(JSON.stringify({ status: 'ok', data: regions }))
    return
  }

  // GET /api/v1/geo/cities
  if (path === '/api/v1/geo/cities') {
    res.writeHead(200)
    res.end(JSON.stringify({ status: 'ok', data: cities }))
    return
  }

  // GET /api/v1/auth/me — foydalanuvchi yo'q (guest)
  if (path === '/api/v1/auth/me') {
    res.writeHead(401)
    res.end(JSON.stringify({ error: 'Unauthorized' }))
    return
  }

  // Health check
  if (path === '/health' || path === '/api/v1/health') {
    res.writeHead(200)
    res.end(JSON.stringify({ status: 'ok', mode: 'mock', time: new Date().toISOString() }))
    return
  }

  // POST endpoints — mock OK response
  if (req.method === 'POST') {
    res.writeHead(200)
    res.end(JSON.stringify({ status: 'ok', message: 'Mock API — POST accepted' }))
    return
  }

  // 404
  res.writeHead(404)
  res.end(JSON.stringify({ error: 'Not found', path }))
})

const PORT = 3001
server.listen(PORT, () => {
  console.log(`\n✅  EDUBAHO Mock API — http://localhost:${PORT}`)
  console.log(`📊  ${institutions.length} ta muassasa yuklab qo'yildi`)
  console.log(`\n  Endpoints:`)
  console.log(`  GET /api/v1/institutions`)
  console.log(`  GET /api/v1/institutions/:slug`)
  console.log(`  GET /api/v1/geo/regions`)
  console.log(`  GET /api/v1/geo/cities`)
  console.log(`\n  Ctrl+C — to'xtatish\n`)
})

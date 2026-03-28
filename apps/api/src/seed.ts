/**
 * Production seed — TypeScript, dist/seed.js ga compile bo'ladi
 * Idempotent: upsert ishlatiladi, qayta ishlatsa xato bermaydi
 */
import { PrismaClient, InstitutionType, InstitutionStatus, Role } from '@prisma/client'
import { generateSlug } from './utils/slug'

const prisma = new PrismaClient()

interface SeedInstitution {
  nameUz: string
  nameRu: string
  type: InstitutionType
  citySlug: string
  phone?: string
  phone2?: string
  email?: string
  website?: string
  telegram?: string
  instagram?: string
  address: string
  lat?: number
  lng?: number
  descUz: string
  descRu: string
  languages: string[]
  programs?: string[]
  specializations?: string[]
  shifts?: string[]
  achievements?: string
  founded?: number
  students?: number
  teachers?: number
  monthlyMin?: number
  monthlyMax?: number
  paymentMethods?: string[]
  isVerified?: boolean
  avgRating?: number
}

// ─── TOSHKENT — UNIVERSITETLAR ───────────────────────────────────────────────
const universities: SeedInstitution[] = [
  {
    nameUz: "O'zbekiston Milliy Universiteti (NUUz)",
    nameRu: "Национальный университет Узбекистана",
    type: InstitutionType.UNIVERSITY,
    citySlug: 'toshkent',
    phone: '+998712274701',
    website: 'https://nuu.uz',
    telegram: 'nuu_official',
    address: "Toshkent, Universitetlar ko'chasi 4",
    lat: 41.3432, lng: 69.2918,
    descUz: "O'zbekiston Milliy Universiteti — mamlakatning eng qadimiy va nufuzli oliy ta'lim muassasasi. 1918-yilda tashkil etilgan. 20+ fakultet, 100+ yo'nalish.",
    descRu: "Национальный университет Узбекистана — старейшее и наиболее престижное высшее учебное заведение страны. Основан в 1918 году. 20+ факультетов, 100+ направлений.",
    languages: ['uz', 'ru', 'en'],
    programs: ['Matematika', 'Fizika', 'Kimyo', 'Biologiya', 'Geografiya', 'Tarix', 'Huquqshunoslik', 'Iqtisodiyot', 'Informatika', 'Jurnalistika'],
    specializations: ['Fundamental fanlar', 'Ijtimoiy fanlar', 'Gumanitar fanlar'],
    founded: 1918, students: 15000, teachers: 1200,
    monthlyMin: 0,
    isVerified: true, avgRating: 4.3,
  },
  {
    nameUz: "Toshkent Axborot Texnologiyalari Universiteti (TATU)",
    nameRu: "Ташкентский университет информационных технологий (ТУИТ)",
    type: InstitutionType.UNIVERSITY,
    citySlug: 'toshkent',
    phone: '+998712384920',
    website: 'https://tuit.uz',
    telegram: 'tuit_uz',
    address: "Toshkent, Amir Temur ko'chasi 108",
    lat: 41.3275, lng: 69.2836,
    descUz: "TATU — O'zbekistondagi IT ta'limining yetakchi davlat universiteti. Kompyuter fanlari, telekommunikatsiya, kiberxavfsizlik yo'nalishlari bo'yicha bakalavriat va magistratura.",
    descRu: "ТУИТ — ведущий государственный университет в области IT-образования Узбекистана. Бакалавриат и магистратура по компьютерным наукам, телекоммуникациям, кибербезопасности.",
    languages: ['uz', 'ru', 'en'],
    programs: ['Kompyuter fanlari', 'Dasturiy ta\'lim', 'Telekommunikatsiya', 'Kiberxavfsizlik', 'Sun\'iy intellekt', 'Ma\'lumotlar bazasi', 'Axborot tizimlari'],
    specializations: ['Kompyuter fanlari', 'Kiberxavfsizlik', 'AI/ML'],
    founded: 1955, students: 12000, teachers: 800,
    monthlyMin: 0,
    isVerified: true, avgRating: 4.4,
  },
  {
    nameUz: "Westminster Xalqaro Universiteti Toshkentda (WIUT)",
    nameRu: "Вестминстерский международный университет в Ташкенте",
    type: InstitutionType.UNIVERSITY,
    citySlug: 'toshkent',
    phone: '+998712382100',
    website: 'https://wiut.uz',
    telegram: 'wiut_uz',
    instagram: 'wiut_uz',
    address: "Toshkent, Istiqbol ko'chasi 12",
    lat: 41.3219, lng: 69.2870,
    descUz: "WIUT — Buyuk Britaniyaning Vestminster universiteti asosida tashkil etilgan xalqaro universitet. Ingliz tili muhitida ta'lim. Xalqaro diplom.",
    descRu: "WIUT — международный университет, основанный на базе Вестминстерского университета Великобритании. Обучение на английском языке. Международный диплом.",
    languages: ['en', 'uz'],
    programs: ['Biznes va menejment', 'Iqtisodiyot', 'Kompyuter fanlari', 'Huquqshunoslik', 'Moliya'],
    specializations: ['Biznes ta\'lim', 'IT', 'Huquq'],
    founded: 2002, students: 4000, teachers: 250,
    monthlyMin: 15000000, monthlyMax: 25000000,
    paymentMethods: ['Payme', 'Click', 'Uzcard', 'Humo'],
    isVerified: true, avgRating: 4.6,
  },
  {
    nameUz: "Turin Politexnika Universiteti Toshkentda (PoliTo)",
    nameRu: "Туринский политехнический университет в Ташкенте",
    type: InstitutionType.UNIVERSITY,
    citySlug: 'toshkent',
    phone: '+998712898900',
    website: 'https://polito.uz',
    telegram: 'polito_tashkent',
    instagram: 'politotashkent',
    address: "Toshkent, Kichik halqa yo'li ko'chasi 17",
    lat: 41.3450, lng: 69.3100,
    descUz: "Turin Politexnika Universiteti Toshkentda — Italiyaning eng nufuzli texnik universiteti filiali. Muhandislik, IT va arxitektura yo'nalishlari.",
    descRu: "Туринский политехнический университет в Ташкенте — филиал одного из самых престижных технических университетов Италии. Направления: инженерия, IT, архитектура.",
    languages: ['en', 'it', 'uz'],
    programs: ['Kompyuter muhandisligi', 'Elektron muhandislik', 'Mexanika muhandisligi', 'Arxitektura va dizayn', 'Matematika muhandisligi'],
    specializations: ['Muhandislik ta\'limi', 'IT', 'Arxitektura'],
    founded: 2009, students: 3000, teachers: 200,
    monthlyMin: 20000000, monthlyMax: 35000000,
    paymentMethods: ['Payme', 'Click', 'Uzcard'],
    isVerified: true, avgRating: 4.7,
  },
  {
    nameUz: "INHA Universiteti Toshkentda",
    nameRu: "Университет ИНХА в Ташкенте",
    type: InstitutionType.UNIVERSITY,
    citySlug: 'toshkent',
    phone: '+998712562700',
    website: 'https://inha.uz',
    telegram: 'inha_uz',
    instagram: 'inha_uz',
    address: "Toshkent, Ziyolilar ko'chasi 9",
    lat: 41.3500, lng: 69.3050,
    descUz: "INHA — Janubiy Koreaning Incheon National Hafsa University asosida tashkil etilgan xalqaro universitet. Texnologiya va muhandislik yo'nalishlari.",
    descRu: "ИНХА — международный университет, основанный на базе Incheon National Hafsa University Южной Кореи. Технические и инженерные направления.",
    languages: ['en', 'ko', 'uz'],
    programs: ['Elektrotexnika', 'Mexatronika', 'Kimyo muhandisligi', 'Kompyuter fanlari', 'Sanoat muhandisligi'],
    founded: 2014, students: 2500, teachers: 180,
    monthlyMin: 18000000, monthlyMax: 28000000,
    paymentMethods: ['Payme', 'Click'],
    isVerified: true, avgRating: 4.5,
  },
  {
    nameUz: "Toshkent Davlat Texnika Universiteti (TDTU)",
    nameRu: "Ташкентский государственный технический университет (ТГТУ)",
    type: InstitutionType.UNIVERSITY,
    citySlug: 'toshkent',
    phone: '+998712373240',
    website: 'https://tdtu.uz',
    address: "Toshkent, Universitetlar ko'chasi 2",
    lat: 41.3400, lng: 69.2900,
    descUz: "TDTU — texnik ta'limning yirik davlat universiteti. Mashinasozlik, qurilish, transport va boshqa muhandislik yo'nalishlari.",
    descRu: "ТГТУ — крупный государственный технический университет. Машиностроение, строительство, транспорт и другие инженерные направления.",
    languages: ['uz', 'ru'],
    programs: ['Mashinasozlik', 'Qurilish muhandisligi', 'Transport muhandisligi', 'Energetika', 'Metallurgiya'],
    founded: 1920, students: 18000, teachers: 1500,
    monthlyMin: 0,
    isVerified: true, avgRating: 4.2,
  },
  {
    nameUz: "Toshkent Moliya Instituti (TMI)",
    nameRu: "Ташкентский финансовый институт (ТФИ)",
    type: InstitutionType.UNIVERSITY,
    citySlug: 'toshkent',
    phone: '+998712282480',
    website: 'https://tfi.uz',
    address: "Toshkent, Amir Temur ko'chasi 60A",
    lat: 41.3150, lng: 69.2650,
    descUz: "TMI — moliya va iqtisodiyot sohasida O'zbekistondagi yetakchi davlat oliy ta'lim muassasasi.",
    descRu: "ТФИ — ведущее государственное высшее учебное заведение Узбекистана в сфере финансов и экономики.",
    languages: ['uz', 'ru', 'en'],
    programs: ['Moliya', 'Bank ishi', 'Buxgalteriya hisobi', 'Soliq ishi', 'Sug\'urta'],
    founded: 1931, students: 10000, teachers: 700,
    monthlyMin: 0,
    isVerified: true, avgRating: 4.1,
  },
  {
    nameUz: "Toshkent Tibbiyot Akademiyasi (TTA)",
    nameRu: "Ташкентская медицинская академия (ТМА)",
    type: InstitutionType.UNIVERSITY,
    citySlug: 'toshkent',
    phone: '+998712562640',
    website: 'https://tma.uz',
    address: "Toshkent, Farabi ko'chasi 2",
    lat: 41.3250, lng: 69.3100,
    descUz: "TTA — tibbiyot ta'limining yetakchi muassasasi. Davolash, stomatologiya, pediatriya, farmasevtika yo'nalishlari.",
    descRu: "ТМА — ведущее учебное заведение медицинского образования. Лечебное дело, стоматология, педиатрия, фармацевтика.",
    languages: ['uz', 'ru', 'en'],
    programs: ['Davolash ishi', 'Stomatologiya', 'Pediatriya', 'Tibbiy biologiya', 'Farmasevtika'],
    founded: 1919, students: 8000, teachers: 900,
    monthlyMin: 0,
    isVerified: true, avgRating: 4.3,
  },
]

// ─── TOSHKENT — IT MAKTABLAR ──────────────────────────────────────────────────
const itSchools: SeedInstitution[] = [
  {
    nameUz: "Astrum IT Academy",
    nameRu: "Astrum IT Academy",
    type: InstitutionType.IT_SCHOOL,
    citySlug: 'toshkent',
    phone: '+998712000008',
    website: 'https://astrum.uz',
    telegram: 'astrumuz',
    instagram: 'astrum_academy',
    address: "Toshkent, Mirzo Ulug'bek tumani, Mirzo Ulugbek ko'chasi 55",
    lat: 41.3480, lng: 69.2960,
    descUz: "Astrum IT Academy — yetakchi IT ta'lim markazi. 5+ yil tajriba, 15 000+ bitiruvchi. Python, Java, Flutter, Web yo'nalishlari.",
    descRu: "Astrum IT Academy — ведущий центр IT-образования. 5+ лет опыта, 15 000+ выпускников. Направления: Python, Java, Flutter, Web.",
    languages: ['uz', 'ru'],
    programs: ['Python', 'Java', 'Flutter', 'React/Vue', 'DevOps', 'Cybersecurity', 'UI/UX', 'Data Science'],
    specializations: ['Backend', 'Mobile', 'Frontend', 'DevOps'],
    shifts: ['Ertalabki (09:00-13:00)', 'Kechki (17:00-21:00)', 'Hafta oxiri'],
    achievements: "15 000+ bitiruvchi, 85% ish joylashtirish darajasi. IT Park rezidenti.",
    founded: 2018, students: 3000, teachers: 120,
    monthlyMin: 700000, monthlyMax: 1500000,
    paymentMethods: ['Payme', 'Click', 'Uzcard', 'Humo', 'Naqd'],
    isVerified: true, avgRating: 4.6,
  },
  {
    nameUz: "Mohirdev IT Academy",
    nameRu: "Mohirdev IT Academy",
    type: InstitutionType.IT_SCHOOL,
    citySlug: 'toshkent',
    phone: '+998712000009',
    website: 'https://mohirdev.uz',
    telegram: 'mohirdev',
    instagram: 'mohirdev_uz',
    address: "Toshkent, Shayxontohur tumani, Bunyodkor ko'chasi 5",
    lat: 41.3050, lng: 69.2500,
    descUz: "Mohirdev — O'zbekistondagi eng ommabop onlayn va oflayn IT ta'lim platformasi. 200 000+ ro'yxatdan o'tgan foydalanuvchi. Bepul kurslar ham mavjud.",
    descRu: "Mohirdev — самая популярная онлайн и офлайн IT-образовательная платформа в Узбекистане. 200 000+ зарегистрированных пользователей. Есть бесплатные курсы.",
    languages: ['uz'],
    programs: ['Python', 'JavaScript', 'Java', 'C++', 'Dart/Flutter', 'PHP/Laravel', 'Django', 'Vue.js', 'React'],
    specializations: ['Onlayn ta\'lim', 'Hamjamiyat ta\'limi'],
    founded: 2020, students: 5000, teachers: 80,
    monthlyMin: 200000, monthlyMax: 800000,
    paymentMethods: ['Payme', 'Click', 'Uzcard', 'Humo'],
    isVerified: true, avgRating: 4.5,
  },
  {
    nameUz: "EPAM Systems O'zbekiston",
    nameRu: "EPAM Systems Узбекистан",
    type: InstitutionType.IT_SCHOOL,
    citySlug: 'toshkent',
    phone: '+998712345678',
    website: 'https://epam.com/uzbekistan',
    telegram: 'epam_uz',
    address: "Toshkent, Yunusobod tumani, IT Park binosi",
    lat: 41.3369, lng: 69.2883,
    descUz: "EPAM Systems — global IT kompaniyasining o'quv markazi. Professional dasturlash kurslari. Bitiruvchilarga EPAM da ish imkoniyati.",
    descRu: "EPAM Systems — учебный центр глобальной IT-компании. Профессиональные курсы программирования. Возможность трудоустройства в EPAM для выпускников.",
    languages: ['en', 'uz', 'ru'],
    programs: ['Java', '.NET', 'Python', 'JavaScript', 'QA Engineering', 'Business Analysis', 'DevOps'],
    specializations: ['Enterprise dasturlash', 'Professional sertifikatsiya'],
    founded: 2019, students: 500, teachers: 40,
    monthlyMin: 1500000, monthlyMax: 3000000,
    paymentMethods: ['Payme', 'Click'],
    isVerified: true, avgRating: 4.7,
  },
]

// ─── TOSHKENT — O'QUV MARKAZLAR ──────────────────────────────────────────────
const courseCenters: SeedInstitution[] = [
  {
    nameUz: "Najot Ta'lim",
    nameRu: "Najot Ta'lim",
    type: InstitutionType.COURSE_CENTER,
    citySlug: 'toshkent',
    phone: '+998712000004',
    website: 'https://najottalim.uz',
    telegram: 'najottalim',
    instagram: 'najottalim',
    address: "Toshkent, Yunusobod tumani, 19-mavze, 14-uy",
    lat: 41.3369, lng: 69.2883,
    descUz: "Najot Ta'lim — O'zbekistondagi eng yirik IT ta'lim markazlaridan biri. 2016-yildan beri 50 000+ bitiruvchi tayyorlagan.",
    descRu: "Najot Ta'lim — один из крупнейших IT-учебных центров Узбекистана. С 2016 года подготовлено более 50 000 выпускников.",
    languages: ['uz', 'ru'],
    programs: ['Python', 'Java', 'Flutter', 'Frontend (React)', 'Backend (Node.js)', 'Android', 'iOS', 'Data Science', 'DevOps', 'UI/UX Design'],
    specializations: ['Backend dasturlash', 'Mobile dasturlash', 'Frontend dasturlash'],
    shifts: ['Ertalabki (08:00-13:00)', 'Tushki (13:00-18:00)', 'Kechki (18:00-22:00)', 'Hafta oxiri'],
    achievements: "50 000+ bitiruvchi. Bitiruvchilar Google, Yandex, Epam, Uzum Bank kabi kompaniyalarda ishlaydi.",
    founded: 2016, students: 8000, teachers: 250,
    monthlyMin: 800000, monthlyMax: 1800000,
    paymentMethods: ['Payme', 'Click', 'Uzcard', 'Humo', 'Naqd'],
    isVerified: true, avgRating: 4.7,
  },
  {
    nameUz: 'PDP Academy',
    nameRu: 'PDP Academy',
    type: InstitutionType.COURSE_CENTER,
    citySlug: 'toshkent',
    phone: '+998781134444',
    website: 'https://pdp.uz',
    telegram: 'pdpacademy',
    instagram: 'pdp_academy',
    address: "Toshkent, Mirzo Ulug'bek tumani, Qoratosh ko'chasi 4",
    lat: 41.3580, lng: 69.3012,
    descUz: "PDP Academy — O'zbekistondagi eng yirik IT ta'lim markazlaridan biri. Java, Python, Flutter yo'nalishlari bo'yicha intensiv kurslar. 100+ IT kompaniya bilan hamkorlik.",
    descRu: "PDP Academy — один из ведущих IT-учебных центров Узбекистана. Интенсивные курсы по Java, Python, Flutter. Сотрудничество с 100+ IT-компаниями.",
    languages: ['uz', 'ru', 'en'],
    programs: ['Java', 'Python', 'Flutter', 'Frontend', 'Backend', 'Cybersecurity', 'QA Testing', 'AI/ML', 'Golang'],
    specializations: ['Java Backend', 'Python & AI', 'Mobile (Flutter)', 'Kiberxavfsizlik'],
    shifts: ['Ertalabki (08:00-13:00)', 'Kechki (18:00-22:00)', 'Hafta oxiri'],
    achievements: "30 000+ bitiruvchi. 2024-yilda 3 000+ talabamiz IT sohasida ish topdi.",
    founded: 2018, students: 5000, teachers: 150,
    monthlyMin: 900000, monthlyMax: 2000000,
    paymentMethods: ['Payme', 'Click', 'Uzcard', 'Humo', 'Naqd'],
    isVerified: true, avgRating: 4.8,
  },
  {
    nameUz: "IT Step Academy Toshkent",
    nameRu: "IT Step Academy Ташкент",
    type: InstitutionType.COURSE_CENTER,
    citySlug: 'toshkent',
    phone: '+998712005050',
    website: 'https://itstep.uz',
    telegram: 'itstep_tashkent',
    instagram: 'itstep_uz',
    address: "Toshkent, Yakkasaroy tumani, Matbuotchilar ko'chasi 32",
    lat: 41.2990, lng: 69.2720,
    descUz: "IT Step Academy — xalqaro franchayzing asosida ishlaydigan IT ta'lim markazi. Dasturlash, dizayn va IT infratuzilmasi yo'nalishlari.",
    descRu: "IT Step Academy — международная сеть IT-образования. Профессиональные курсы по программированию, дизайну и IT-инфраструктуре.",
    languages: ['uz', 'ru'],
    programs: ['C#/.NET', 'Java', 'Python', 'Web Dizayn', 'Grafik Dizayn', '3D Modellashtirish', 'Network Admin'],
    specializations: ['.NET dasturlash', 'Grafik dizayn', 'IT infratuzilma'],
    shifts: ['Ertalabki (09:00-13:00)', 'Kechki (17:00-21:00)', 'Hafta oxiri'],
    founded: 2008, students: 2000, teachers: 80,
    monthlyMin: 750000, monthlyMax: 1500000,
    paymentMethods: ['Payme', 'Click', 'Naqd'],
    isVerified: true, avgRating: 4.4,
  },
  {
    nameUz: "Algoritmika O'zbekiston",
    nameRu: "Алгоритмика Узбекистан",
    type: InstitutionType.COURSE_CENTER,
    citySlug: 'toshkent',
    phone: '+998712100200',
    website: 'https://algoritmika.uz',
    telegram: 'algoritmika_uz',
    instagram: 'algoritmika_uz',
    address: "Toshkent, Shayxontohur tumani, Mustaqillik ko'chasi 75",
    lat: 41.3100, lng: 69.2600,
    descUz: "Algoritmika — bolalar va o'smirlar uchun dasturlash o'rgatuvchi markaz. Scratch, Python, Robotika, AI.",
    descRu: "Алгоритмика — центр обучения программированию для детей и подростков. Scratch, Python, Робототехника, ИИ.",
    languages: ['uz', 'ru'],
    programs: ['Scratch', 'Python', 'Robototexnika', 'Veb sayt yaratish', 'Roblox Studio', 'AI asoslari'],
    specializations: ['Bolalar uchun IT', 'Robototexnika', 'Ijodiy dasturlash'],
    shifts: ['Ertalabki (10:00-13:00)', 'Kechki (16:00-19:00)', 'Hafta oxiri'],
    founded: 2017, students: 1500, teachers: 60,
    monthlyMin: 600000, monthlyMax: 1200000,
    paymentMethods: ['Payme', 'Click', 'Uzcard', 'Naqd'],
    isVerified: false, avgRating: 4.5,
  },
  {
    nameUz: "Codelab Academy",
    nameRu: "Codelab Academy",
    type: InstitutionType.COURSE_CENTER,
    citySlug: 'toshkent',
    phone: '+998712300400',
    telegram: 'codelab_uz',
    instagram: 'codelab_academy',
    address: "Toshkent, Olmazor tumani, Oybek ko'chasi 20",
    lat: 41.3280, lng: 69.2520,
    descUz: "Codelab Academy — amaliyotga yo'naltirilgan IT ta'lim. Har bir kurs oxirida real loyiha. Mentor qo'llab-quvvatlashi.",
    descRu: "Codelab Academy — IT-образование, ориентированное на практику. Реальный проект в конце каждого курса. Поддержка ментора.",
    languages: ['uz', 'ru'],
    programs: ['Full Stack Web', 'Mobile (Flutter/React Native)', 'Data Science', 'AI/ML', 'Backend (Node.js/Python)', 'UI/UX Design'],
    founded: 2020, students: 800, teachers: 35,
    monthlyMin: 850000, monthlyMax: 1700000,
    paymentMethods: ['Payme', 'Click', 'Naqd'],
    isVerified: false, avgRating: 4.4,
  },
]

// ─── TOSHKENT — TIL MARKAZLAR ─────────────────────────────────────────────────
const languageCenters: SeedInstitution[] = [
  {
    nameUz: "British Council O'zbekiston",
    nameRu: "British Council Узбекистан",
    type: InstitutionType.LANGUAGE_CENTER,
    citySlug: 'toshkent',
    phone: '+998712005000',
    website: 'https://britishcouncil.org/uzbekistan',
    instagram: 'britishcounciluz',
    address: "Toshkent, Istiqbol ko'chasi 21",
    lat: 41.3170, lng: 69.2810,
    descUz: "British Council — Buyuk Britaniyaning rasmiy madaniyat va ta'lim tashkiloti. IELTS imtihoni markazi. Ingliz tili kurslari.",
    descRu: "British Council — официальная культурная и образовательная организация Великобритании. Центр сдачи IELTS. Курсы английского языка.",
    languages: ['en', 'uz', 'ru'],
    programs: ['Ingliz tili (IELTS)', 'Biznes ingliz tili', 'Bolalar uchun ingliz tili', 'Exam Preparation (IELTS, CAE, FCE)', "O'qituvchilar uchun kurslar"],
    specializations: ['IELTS tayyorgarlik', 'Rasmiy ingliz tili sertifikati'],
    shifts: ['Ertalabki (09:00-12:00)', 'Kechki (17:00-20:00)', 'Hafta oxiri'],
    founded: 1993, students: 1000, teachers: 50,
    monthlyMin: 1200000, monthlyMax: 2500000,
    paymentMethods: ['Payme', 'Click', 'Uzcard'],
    isVerified: true, avgRating: 4.7,
  },
  {
    nameUz: "Cambridge Learning Centre Toshkent",
    nameRu: "Cambridge Learning Centre Ташкент",
    type: InstitutionType.LANGUAGE_CENTER,
    citySlug: 'toshkent',
    phone: '+998712010203',
    website: 'https://cambridge.uz',
    telegram: 'cambridge_uz',
    instagram: 'cambridge_tashkent',
    address: "Toshkent, Yunusobod tumani, Sharaf Rashidov ko'chasi 4",
    lat: 41.3400, lng: 69.3000,
    descUz: "Cambridge Learning Centre — Cambridge sertifikatlari bo'yicha ixtisoslashgan til markazi. A1-C2 barcha darajalar.",
    descRu: "Cambridge Learning Centre — языковой центр, специализирующийся на сертификатах Cambridge. Все уровни A1-C2.",
    languages: ['en', 'uz'],
    programs: ['Ingliz tili (A1-C2)', 'Cambridge Sertifikat (PET, FCE, CAE, CPE)', 'Biznes ingliz tili', 'Bolalar uchun'],
    founded: 2010, students: 800, teachers: 35,
    monthlyMin: 900000, monthlyMax: 2000000,
    paymentMethods: ['Payme', 'Click', 'Naqd'],
    isVerified: true, avgRating: 4.5,
  },
  {
    nameUz: "ILMHUB Language Center",
    nameRu: "ILMHUB Language Center",
    type: InstitutionType.LANGUAGE_CENTER,
    citySlug: 'toshkent',
    phone: '+998712030405',
    telegram: 'ilmhub_uz',
    instagram: 'ilmhub_lc',
    address: "Toshkent, Mirzo Ulug'bek tumani, To'ytepa yo'li 3",
    lat: 41.3580, lng: 69.2950,
    descUz: "ILMHUB — ingliz, xitoy, koreys, arabcha, nemis, fransuz, ispan va boshqa tillar kurslari. Multilingval markaz.",
    descRu: "ILMHUB — курсы английского, китайского, корейского, арабского, немецкого, французского, испанского и других языков. Мультиязычный центр.",
    languages: ['uz', 'ru'],
    programs: ['Ingliz tili', 'Xitoy tili (HSK)', 'Koreys tili (TOPIK)', 'Arab tili', 'Nemis tili (Goethe)', 'Fransuz tili (DELF)', 'Ispan tili (DELE)', 'Yapon tili (JLPT)'],
    specializations: ['Ko\'p tilli ta\'lim', 'Xalqaro sertifikatlar'],
    founded: 2015, students: 2000, teachers: 80,
    monthlyMin: 700000, monthlyMax: 1800000,
    paymentMethods: ['Payme', 'Click', 'Uzcard', 'Naqd'],
    isVerified: true, avgRating: 4.6,
  },
  {
    nameUz: "Goethe-Institut Toshkent",
    nameRu: "Goethe-Institut Ташкент",
    type: InstitutionType.LANGUAGE_CENTER,
    citySlug: 'toshkent',
    phone: '+998712556660',
    website: 'https://goethe.de/uzbekistan',
    address: "Toshkent, Buyuk Turon ko'chasi 6",
    lat: 41.3050, lng: 69.2700,
    descUz: "Goethe-Institut — Germaniyaning rasmiy madaniyat tashkiloti. Nemis tili kurslari va Goethe sertifikatlari.",
    descRu: "Goethe-Institut — официальная культурная организация Германии. Курсы немецкого языка и сертификаты Goethe.",
    languages: ['de', 'uz', 'ru'],
    programs: ['Nemis tili (A1-C2)', 'Goethe Sertifikat', 'Biznes nemis tili', "TestDaF tayyorgarlik"],
    founded: 1996, students: 400, teachers: 20,
    monthlyMin: 1000000, monthlyMax: 2000000,
    paymentMethods: ['Payme', 'Click'],
    isVerified: true, avgRating: 4.6,
  },
  {
    nameUz: "Confucius Institute Toshkent",
    nameRu: "Институт Конфуция в Ташкенте",
    type: InstitutionType.LANGUAGE_CENTER,
    citySlug: 'toshkent',
    phone: '+998712562000',
    website: 'https://confucius.uz',
    address: "Toshkent, Universitets ko'chasi 4 (NUUz ichida)",
    lat: 41.3432, lng: 69.2918,
    descUz: "Confucius Institute — Xitoy madaniyati va tili markazi. NUUz da joylashgan. HSK sertifikat imtihonlari.",
    descRu: "Институт Конфуция — центр китайской культуры и языка. Расположен в НУУз. Экзамены HSK.",
    languages: ['zh', 'uz', 'ru'],
    programs: ['Xitoy tili (HSK 1-6)', "Xitoy madaniyati", "Kalligrafiya", 'Wushu'],
    founded: 2007, students: 300, teachers: 15,
    monthlyMin: 600000, monthlyMax: 1200000,
    paymentMethods: ['Payme', 'Naqd'],
    isVerified: true, avgRating: 4.4,
  },
]

// ─── TOSHKENT — MAKTABLAR ─────────────────────────────────────────────────────
const toshkentSchools: SeedInstitution[] = [
  {
    nameUz: "Toshkent Prezident Maktabi",
    nameRu: "Ташкентская Президентская Школа",
    type: InstitutionType.LYCEUM,
    citySlug: 'toshkent',
    phone: '+998712345880',
    website: 'https://prezidentmaktabi.uz',
    address: "Toshkent, Mirzo Ulug'bek tumani, Ziyolilar ko'chasi 7",
    lat: 41.3500, lng: 69.3050,
    descUz: "O'zbekiston Prezidenti tashabbusi bilan tashkil etilgan elita maktab. Iqtidorli o'quvchilar uchun bepul ta'lim. Xalqaro dasturlar.",
    descRu: "Элитная школа, основанная по инициативе Президента Узбекистана. Бесплатное образование для одарённых учащихся. Международные программы.",
    languages: ['uz', 'en'],
    programs: ['Matematika (olimpiada)', 'Fizika', 'Kimyo', 'Biologiya', 'Informatika', 'Ingliz tili'],
    specializations: ['Xalqaro olimpiadalar', 'Elita ta\'lim'],
    achievements: "IMO, IChO, IPhO, IOI da medal. 100% bitiruvchilar OTMga kiradi.",
    founded: 2018, students: 300, teachers: 60,
    monthlyMin: 0,
    isVerified: true, avgRating: 4.9,
  },
  {
    nameUz: "Intellect School",
    nameRu: "Intellect School",
    type: InstitutionType.SCHOOL,
    citySlug: 'toshkent',
    phone: '+998712345670',
    website: 'https://intellect.uz',
    telegram: 'intellect_school',
    instagram: 'intellect.school.uz',
    address: "Toshkent, Mirzo Ulug'bek tumani, Furqat ko'chasi 25",
    lat: 41.3450, lng: 69.2950,
    descUz: "Intellect School — O'zbekistondagi nufuzli xususiy maktab. Kuchli matematika va tabiiy fanlar yo'nalishi. Olimpiada g'oliblari ko'p.",
    descRu: "Intellect School — престижная частная школа. Сильное направление математики и естественных наук.",
    languages: ['uz', 'ru', 'en'],
    programs: ['Matematika (chuqur)', 'Fizika', 'Kimyo', 'Biologiya', 'Ingliz tili', 'Informatika'],
    specializations: ['Olimpiada matematikasi', 'SAT/ACT tayyorgarlik'],
    achievements: "Respublika va xalqaro olimpiadalarda 100+ g'olib.",
    founded: 2008, students: 800, teachers: 70,
    monthlyMin: 2000000, monthlyMax: 4000000,
    paymentMethods: ['Payme', 'Click', 'Humo'],
    isVerified: true, avgRating: 4.7,
  },
  {
    nameUz: "Umid School",
    nameRu: "Umid School",
    type: InstitutionType.SCHOOL,
    citySlug: 'toshkent',
    phone: '+998712678900',
    website: 'https://umidschool.uz',
    telegram: 'umid_school_uz',
    address: "Toshkent, Chilonzor tumani, 8-mavze, 21-uy",
    lat: 41.2810, lng: 69.2050,
    descUz: "Umid School — zamonaviy o'quv dasturi asosida ta'lim beradigan xususiy maktab. 1-11 sinflar. Ingliz tili chuqur o'rgatiladi.",
    descRu: "Umid School — частная школа с современными учебными программами. 1-11 классы. Углублённое изучение английского языка.",
    languages: ['uz', 'ru', 'en'],
    programs: ["Barcha umumta'lim fanlari", 'Ingliz tili (chuqur)', 'Dasturlash asoslari', 'Musiqa', 'Sport'],
    founded: 2012, students: 500, teachers: 45,
    monthlyMin: 1500000, monthlyMax: 2500000,
    paymentMethods: ['Payme', 'Click', 'Naqd'],
    isVerified: false, avgRating: 4.4,
  },
  {
    nameUz: "Mirzo Ulugbek nomidagi Ixtisoslashtirilgan Maktab",
    nameRu: "Специализированная школа имени Мирзо Улугбека",
    type: InstitutionType.SCHOOL,
    citySlug: 'toshkent',
    phone: '+998712414141',
    address: "Toshkent, Mirzo Ulug'bek tumani, Mirzo Ulugbek ko'chasi 1",
    lat: 41.3489, lng: 69.2920,
    descUz: "O'zbekistondagi eng qadimiy va nufuzli maktablardan biri. Matematika va tabiiy fanlar bo'yicha chuqurlashtirilgan ta'lim.",
    descRu: "Одна из старейших и престижных школ Узбекистана. Углублённое образование по математике и естественным наукам.",
    languages: ['uz', 'ru'],
    programs: ['Matematika', 'Fizika', 'Kimyo', 'Biologiya', 'Ingliz tili'],
    founded: 1934, students: 1200, teachers: 80,
    monthlyMin: 0,
    isVerified: true, avgRating: 4.5,
  },
  {
    nameUz: "Muhammad al-Xorazmiy nomidagi Maktab-Litsey",
    nameRu: "Школа-Лицей имени Мухаммада аль-Хорезми",
    type: InstitutionType.LYCEUM,
    citySlug: 'toshkent',
    phone: '+998712636363',
    address: "Toshkent, Yunusobod tumani, 7-mavze, 15-uy",
    lat: 41.3350, lng: 69.3100,
    descUz: "Matematika va informatika yo'nalishidagi ixtisoslashtirilgan litsey. OTMga kirishda matematik yo'nalishi eng kuchli.",
    descRu: "Специализированный лицей математико-информационного направления.",
    languages: ['uz', 'ru'],
    programs: ['Matematika (chuqur)', 'Informatika', 'Fizika', 'Ingliz tili'],
    founded: 1999, students: 600, teachers: 45,
    monthlyMin: 0,
    isVerified: false, avgRating: 4.6,
  },
  {
    nameUz: "New Generation International School",
    nameRu: "Международная школа New Generation",
    type: InstitutionType.SCHOOL,
    citySlug: 'toshkent',
    phone: '+998712555100',
    website: 'https://newgeneration.uz',
    telegram: 'newgeneration_school',
    instagram: 'newgeneration_school_uz',
    address: "Toshkent, Yunusobod tumani, 12-mavze, 5-uy",
    lat: 41.3480, lng: 69.3200,
    descUz: "New Generation — xalqaro ta'lim standartlarida ishlaydigan zamonaviy maktab. IB (International Baccalaureate) dasturi.",
    descRu: "New Generation — современная школа с международными образовательными стандартами. Программа IB (International Baccalaureate).",
    languages: ['en', 'uz', 'ru'],
    programs: ['IB Primary Years Programme', 'IB Middle Years Programme', 'IB Diploma', 'Ingliz tili', 'Matematika (xalqaro dastur)'],
    specializations: ['IB dastur', 'Xalqaro ta\'lim'],
    founded: 2012, students: 600, teachers: 55,
    monthlyMin: 3000000, monthlyMax: 6000000,
    paymentMethods: ['Payme', 'Click'],
    isVerified: true, avgRating: 4.7,
  },
]

// ─── TOSHKENT — BOG'CHALAR ────────────────────────────────────────────────────
const kindergartens: SeedInstitution[] = [
  {
    nameUz: "Little Stars Bolalar Bog'chasi",
    nameRu: "Детский сад Little Stars",
    type: InstitutionType.KINDERGARTEN,
    citySlug: 'toshkent',
    phone: '+998712100200',
    telegram: 'littlestars_uz',
    instagram: 'littlestars_tashkent',
    address: "Toshkent, Yunusobod tumani, 5-mavze, 10-uy",
    lat: 41.3420, lng: 69.3050,
    descUz: "Little Stars — zamonaviy xususiy bolalar bog'chasi. Ingliz tili, Montessori metodikasi. 2-6 yosh.",
    descRu: "Little Stars — современный частный детский сад. Английский язык, методика Монтессори. Возраст 2-6 лет.",
    languages: ['uz', 'en', 'ru'],
    programs: ['Montessori metodikasi', 'Ingliz tili', 'Musiqa', 'Rasm', 'Harakat o\'yinlari', 'Tabiatshunoslik'],
    founded: 2014, students: 150, teachers: 20,
    monthlyMin: 1800000, monthlyMax: 3000000,
    paymentMethods: ['Payme', 'Click', 'Naqd'],
    isVerified: false, avgRating: 4.6,
  },
  {
    nameUz: "Sunshine International Kindergarten",
    nameRu: "Sunshine International Kindergarten",
    type: InstitutionType.KINDERGARTEN,
    citySlug: 'toshkent',
    phone: '+998712200300',
    instagram: 'sunshine_kindergarten_uz',
    address: "Toshkent, Shayxontohur tumani, Mirabad ko'chasi 7",
    lat: 41.3100, lng: 69.2580,
    descUz: "Sunshine — xalqaro dasturda ishlaydigan bolalar bog'chasi. Cambridge curriculum. 1.5-5 yosh.",
    descRu: "Sunshine — детский сад с международной программой. Cambridge curriculum. Возраст 1.5-5 лет.",
    languages: ['en', 'uz'],
    programs: ['Cambridge Early Years', 'Ingliz tili', 'Ijodiy san\'at', 'Musiqa va raqslar', 'Sport'],
    founded: 2016, students: 120, teachers: 18,
    monthlyMin: 2500000, monthlyMax: 4000000,
    paymentMethods: ['Payme', 'Click'],
    isVerified: false, avgRating: 4.5,
  },
]

// ─── SAMARQAND ────────────────────────────────────────────────────────────────
const samarqandInstitutions: SeedInstitution[] = [
  {
    nameUz: "Samarqand IT Academy",
    nameRu: "Samarkand IT Academy",
    type: InstitutionType.COURSE_CENTER,
    citySlug: 'samarqand',
    phone: '+998662234567',
    telegram: 'samit_academy',
    address: "Samarqand, Registon ko'chasi 15",
    lat: 39.6542, lng: 66.9597,
    descUz: "Samarqandda IT ta'lim beradigan yirik markaz. Python, Web, Mobile yo'nalishlari.",
    descRu: "Крупный центр IT-образования в Самарканде. Направления: Python, Web, Mobile.",
    languages: ['uz', 'ru'],
    programs: ['Python', 'JavaScript', 'Flutter', 'Web dizayn', 'Grafik dizayn'],
    founded: 2020, students: 400, teachers: 20,
    monthlyMin: 500000, monthlyMax: 900000,
    paymentMethods: ['Payme', 'Click', 'Naqd'],
    isVerified: false, avgRating: 4.3,
  },
  {
    nameUz: "Samarqand Davlat Universiteti",
    nameRu: "Самаркандский государственный университет",
    type: InstitutionType.UNIVERSITY,
    citySlug: 'samarqand',
    phone: '+998662352220',
    website: 'https://samdu.uz',
    address: "Samarqand, Universitetlar ko'chasi 15",
    lat: 39.6590, lng: 66.9580,
    descUz: "Samarqand Davlat Universiteti — O'zbekistondagi eng qadimiy universitetlardan biri. 1927-yilda tashkil etilgan. 15+ fakultet.",
    descRu: "Самаркандский государственный университет — один из старейших университетов Узбекистана. Основан в 1927 году. 15+ факультетов.",
    languages: ['uz', 'ru', 'en'],
    programs: ['Matematika', 'Fizika', 'Kimyo', 'Biologiya', 'Tarix', 'Filologiya', 'Iqtisodiyot', 'Huquqshunoslik'],
    founded: 1927, students: 14000, teachers: 1000,
    monthlyMin: 0,
    isVerified: true, avgRating: 4.2,
  },
  {
    nameUz: "Samarqand Prezident Maktabi",
    nameRu: "Самаркандская Президентская Школа",
    type: InstitutionType.LYCEUM,
    citySlug: 'samarqand',
    phone: '+998662456789',
    address: "Samarqand, Amir Temur ko'chasi 45",
    lat: 39.6600, lng: 66.9650,
    descUz: "Samarqand viloyatidagi elita maktab. Matematika, fizika va kimyo bo'yicha xalqaro olimpiadalar g'oliblari.",
    descRu: "Элитная школа Самаркандской области. Победители международных олимпиад по математике, физике и химии.",
    languages: ['uz', 'en'],
    programs: ['Matematika', 'Fizika', 'Kimyo', 'Biologiya', 'Informatika', 'Ingliz tili'],
    founded: 2019, students: 250, teachers: 50,
    monthlyMin: 0,
    isVerified: true, avgRating: 4.8,
  },
  {
    nameUz: "Samarqand Til va Kommunikatsiya Markazi",
    nameRu: "Самаркандский центр языка и коммуникаций",
    type: InstitutionType.LANGUAGE_CENTER,
    citySlug: 'samarqand',
    phone: '+998662345000',
    telegram: 'samlang_center',
    address: "Samarqand, Bog'ishamol ko'chasi 12",
    lat: 39.6520, lng: 66.9560,
    descUz: "Samarqanddagi ingliz, nemis va xitoy tili kurslari. IELTS imtihon tayyorgarlik.",
    descRu: "Курсы английского, немецкого и китайского языков в Самарканде. Подготовка к экзамену IELTS.",
    languages: ['uz', 'ru'],
    programs: ['Ingliz tili (IELTS)', 'Nemis tili', 'Xitoy tili', 'Arab tili'],
    founded: 2015, students: 300, teachers: 15,
    monthlyMin: 400000, monthlyMax: 900000,
    paymentMethods: ['Payme', 'Click', 'Naqd'],
    isVerified: false, avgRating: 4.2,
  },
]

// ─── NAMANGAN ─────────────────────────────────────────────────────────────────
const namanganInstitutions: SeedInstitution[] = [
  {
    nameUz: "Namangan IT Valley",
    nameRu: "Namangan IT Valley",
    type: InstitutionType.COURSE_CENTER,
    citySlug: 'namangan',
    phone: '+998694455667',
    telegram: 'namangan_itvalley',
    address: "Namangan, Kosonsoy ko'chasi 5",
    lat: 41.0011, lng: 71.6722,
    descUz: "Namangandagi yirik IT ta'lim markazi. Frontend, Backend, Mobile yo'nalishlari. IT Park Namangan bilan hamkorlik.",
    descRu: "Крупный IT-учебный центр в Намангане. Направления: Frontend, Backend, Mobile.",
    languages: ['uz'],
    programs: ['Python', 'JavaScript/React', 'Flutter', 'Java', 'Grafik dizayn'],
    founded: 2021, students: 300, teachers: 15,
    monthlyMin: 450000, monthlyMax: 800000,
    paymentMethods: ['Payme', 'Click', 'Naqd'],
    isVerified: false, avgRating: 4.3,
  },
  {
    nameUz: "Namangan Davlat Universiteti",
    nameRu: "Наманганский государственный университет",
    type: InstitutionType.UNIVERSITY,
    citySlug: 'namangan',
    phone: '+998694225550',
    website: 'https://namdu.uz',
    address: "Namangan, Uychi ko'chasi 316",
    lat: 41.0100, lng: 71.6700,
    descUz: "Namangan Davlat Universiteti — Namangan viloyatining yetakchi davlat universiteti. 10+ fakultet, 50+ yo'nalish.",
    descRu: "Наманганский государственный университет — ведущий государственный университет Наманганской области. 10+ факультетов, 50+ направлений.",
    languages: ['uz', 'ru'],
    programs: ['Matematika', 'Fizika', 'Kimyo', 'Iqtisodiyot', 'Huquqshunoslik', 'Pedagogika', 'Filologiya'],
    founded: 1941, students: 10000, teachers: 700,
    monthlyMin: 0,
    isVerified: true, avgRating: 4.1,
  },
  {
    nameUz: "Namangan Prezident Maktabi",
    nameRu: "Наманганская Президентская Школа",
    type: InstitutionType.LYCEUM,
    citySlug: 'namangan',
    address: "Namangan, Navoi ko'chasi 25",
    lat: 41.0050, lng: 71.6680,
    descUz: "Namangan viloyatidagi elita prezident maktabi. Iqtidorli o'quvchilar uchun bepul ta'lim.",
    descRu: "Элитная президентская школа Наманганской области. Бесплатное образование для одарённых учащихся.",
    languages: ['uz', 'en'],
    programs: ['Matematika', 'Fizika', 'Kimyo', 'Biologiya', 'Informatika', 'Ingliz tili'],
    founded: 2019, students: 250, teachers: 45,
    monthlyMin: 0,
    isVerified: true, avgRating: 4.7,
  },
]

// ─── ANDIJON ──────────────────────────────────────────────────────────────────
const andijonInstitutions: SeedInstitution[] = [
  {
    nameUz: "Andijon IT Hub",
    nameRu: "Andijon IT Hub",
    type: InstitutionType.IT_SCHOOL,
    citySlug: 'andijon',
    phone: '+998742345678',
    telegram: 'andijon_ithub',
    address: "Andijon, Navoiy ko'chasi 22",
    lat: 40.7821, lng: 72.3442,
    descUz: "Andijonning yirik IT ta'lim markazi. Python, JavaScript, Flutter kurslar. IT Park Andijon rezidenti.",
    descRu: "Крупный центр IT-образования в Андижане. Курсы Python, JavaScript, Flutter. Резидент IT Park Andijon.",
    languages: ['uz'],
    programs: ['Python', 'JavaScript', 'Flutter', 'Java', 'Grafik dizayn', 'UI/UX'],
    founded: 2021, students: 350, teachers: 18,
    monthlyMin: 450000, monthlyMax: 900000,
    paymentMethods: ['Payme', 'Click', 'Naqd'],
    isVerified: false, avgRating: 4.2,
  },
  {
    nameUz: "Andijon Davlat Tibbiyot Instituti (ADTI)",
    nameRu: "Андижанский государственный медицинский институт (АГМИ)",
    type: InstitutionType.UNIVERSITY,
    citySlug: 'andijon',
    phone: '+998742243080',
    website: 'https://agmi.uz',
    address: "Andijon, Yaxshiliqov ko'chasi 1",
    lat: 40.7900, lng: 72.3500,
    descUz: "ADTI — O'zbekistondagi eng yirik tibbiyot institutlaridan biri. Davolash, Stomatologiya, Pediatriya, Tibbiy profilaktika yo'nalishlari.",
    descRu: "АГМИ — один из крупнейших медицинских институтов Узбекистана. Направления: лечебное дело, стоматология, педиатрия.",
    languages: ['uz', 'ru', 'en'],
    programs: ['Davolash ishi', 'Stomatologiya', 'Pediatriya', 'Tibbiy profilaktika'],
    founded: 1955, students: 9000, teachers: 600,
    monthlyMin: 0,
    isVerified: true, avgRating: 4.2,
  },
]

// ─── FARG'ONA ─────────────────────────────────────────────────────────────────
const farghonaInstitutions: SeedInstitution[] = [
  {
    nameUz: "Farg'ona IT Academy",
    nameRu: "Ферганская IT Academy",
    type: InstitutionType.COURSE_CENTER,
    citySlug: 'farghona',
    phone: '+998732234567',
    telegram: 'farghona_it',
    address: "Farg'ona, Mustaqillik ko'chasi 18",
    lat: 40.3864, lng: 71.7864,
    descUz: "Farg'onadagi IT ta'lim markazi. Python, Java, Web yo'nalishlari bo'yicha kurslar.",
    descRu: "IT-учебный центр в Фергане. Курсы по Python, Java, Web.",
    languages: ['uz'],
    programs: ['Python', 'Java', 'JavaScript', 'Web dizayn'],
    founded: 2020, students: 200, teachers: 10,
    monthlyMin: 400000, monthlyMax: 700000,
    paymentMethods: ['Payme', 'Click', 'Naqd'],
    isVerified: false, avgRating: 4.0,
  },
  {
    nameUz: "Farg'ona Davlat Universiteti (FarDU)",
    nameRu: "Ферганский государственный университет (ФарГУ)",
    type: InstitutionType.UNIVERSITY,
    citySlug: 'farghona',
    phone: '+998732223410',
    website: 'https://fardu.uz',
    address: "Farg'ona, Murabbiylar ko'chasi 19",
    lat: 40.3900, lng: 71.7900,
    descUz: "FarDU — Farg'ona viloyatining yetakchi davlat universiteti. 1930-yilda tashkil etilgan.",
    descRu: "ФарГУ — ведущий государственный университет Ферганской области. Основан в 1930 году.",
    languages: ['uz', 'ru'],
    programs: ['Matematika', 'Fizika', 'Kimyo', 'Biologiya', 'Tarix', 'Iqtisodiyot', 'Pedagogika'],
    founded: 1930, students: 12000, teachers: 800,
    monthlyMin: 0,
    isVerified: true, avgRating: 4.1,
  },
  {
    nameUz: "Farg'ona Prezident Maktabi",
    nameRu: "Ферганская Президентская Школа",
    type: InstitutionType.LYCEUM,
    citySlug: 'farghona',
    address: "Farg'ona, Navoi ko'chasi 10",
    lat: 40.3850, lng: 71.7850,
    descUz: "Farg'ona viloyatidagi elita prezident maktabi. Iqtidorli o'quvchilar uchun bepul ta'lim.",
    descRu: "Элитная президентская школа Ферганской области. Бесплатное образование для одарённых учащихся.",
    languages: ['uz', 'en'],
    programs: ['Matematika', 'Fizika', 'Kimyo', 'Biologiya', 'Informatika', 'Ingliz tili'],
    founded: 2019, students: 250, teachers: 45,
    monthlyMin: 0,
    isVerified: true, avgRating: 4.7,
  },
]

// ─── BUXORO ───────────────────────────────────────────────────────────────────
const buxoroInstitutions: SeedInstitution[] = [
  {
    nameUz: "Buxoro Davlat Universiteti (BuxDU)",
    nameRu: "Бухарский государственный университет (БухГУ)",
    type: InstitutionType.UNIVERSITY,
    citySlug: 'buxoro',
    phone: '+998652244540',
    website: 'https://buxdu.uz',
    address: "Buxoro, M. Iqbol ko'chasi 11",
    lat: 39.7681, lng: 64.4556,
    descUz: "BuxDU — Buxoro viloyatining yetakchi universiteti. 1930-yildan buyon faoliyat yuritadi.",
    descRu: "БухГУ — ведущий университет Бухарской области. Работает с 1930 года.",
    languages: ['uz', 'ru'],
    programs: ['Matematika', 'Fizika', 'Kimyo', 'Iqtisodiyot', 'Filologiya', 'Tarix', 'Pedagogika'],
    founded: 1930, students: 11000, teachers: 750,
    monthlyMin: 0,
    isVerified: true, avgRating: 4.1,
  },
  {
    nameUz: "Buxoro IT Academy",
    nameRu: "Бухарская IT Academy",
    type: InstitutionType.COURSE_CENTER,
    citySlug: 'buxoro',
    phone: '+998652345678',
    telegram: 'buxoro_it',
    address: "Buxoro, Karvon saroyi ko'chasi 5",
    lat: 39.7700, lng: 64.4580,
    descUz: "Buxorodagi IT ta'lim markazi. Python, Web, dizayn yo'nalishlari.",
    descRu: "IT-учебный центр в Бухаре. Направления: Python, Web, дизайн.",
    languages: ['uz', 'ru'],
    programs: ['Python', 'JavaScript', 'Flutter', 'Grafik dizayn', 'Web dizayn'],
    founded: 2021, students: 200, teachers: 10,
    monthlyMin: 400000, monthlyMax: 750000,
    paymentMethods: ['Payme', 'Click', 'Naqd'],
    isVerified: false, avgRating: 4.1,
  },
  {
    nameUz: "Buxoro Prezident Maktabi",
    nameRu: "Бухарская Президентская Школа",
    type: InstitutionType.LYCEUM,
    citySlug: 'buxoro',
    address: "Buxoro, Navoi ko'chasi 5",
    lat: 39.7660, lng: 64.4540,
    descUz: "Buxoro viloyatidagi elita prezident maktabi.",
    descRu: "Элитная президентская школа Бухарской области.",
    languages: ['uz', 'en'],
    programs: ['Matematika', 'Fizika', 'Kimyo', 'Biologiya', 'Informatika', 'Ingliz tili'],
    founded: 2019, students: 250, teachers: 45,
    monthlyMin: 0,
    isVerified: true, avgRating: 4.7,
  },
]

// ─── QARSHI (QASHQADARYO) ─────────────────────────────────────────────────────
const qarshiInstitutions: SeedInstitution[] = [
  {
    nameUz: "Qarshi Davlat Universiteti (QarDU)",
    nameRu: "Каршинский государственный университет (КарГУ)",
    type: InstitutionType.UNIVERSITY,
    citySlug: 'qarshi',
    phone: '+998752252000',
    website: 'https://qarshidu.uz',
    address: "Qarshi, Kesh ko'chasi 17",
    lat: 38.8606, lng: 65.7911,
    descUz: "QarDU — Qashqadaryo viloyatining yetakchi universiteti.",
    descRu: "КарГУ — ведущий университет Кашкадарьинской области.",
    languages: ['uz', 'ru'],
    programs: ['Matematika', 'Fizika', 'Kimyo', 'Iqtisodiyot', 'Huquq', 'Pedagogika'],
    founded: 1976, students: 9000, teachers: 600,
    monthlyMin: 0,
    isVerified: true, avgRating: 4.0,
  },
  {
    nameUz: "Qarshi IT ta'lim markazi",
    nameRu: "Каршинский IT-учебный центр",
    type: InstitutionType.COURSE_CENTER,
    citySlug: 'qarshi',
    phone: '+998752345678',
    telegram: 'qarshi_it',
    address: "Qarshi, Mustaqillik ko'chasi 9",
    lat: 38.8620, lng: 65.7930,
    descUz: "Qarshida IT ta'lim markazi. Python, Web, Grafik dizayn kurslar.",
    descRu: "IT-учебный центр в Карши. Курсы Python, Web, Графический дизайн.",
    languages: ['uz'],
    programs: ['Python', 'JavaScript', 'Flutter', 'Grafik dizayn'],
    founded: 2021, students: 150, teachers: 8,
    monthlyMin: 350000, monthlyMax: 650000,
    paymentMethods: ['Payme', 'Click', 'Naqd'],
    isVerified: false, avgRating: 4.0,
  },
]

// ─── URGANCH (XORAZM) ─────────────────────────────────────────────────────────
const urganchInstitutions: SeedInstitution[] = [
  {
    nameUz: "Urganch Davlat Universiteti (UrDU)",
    nameRu: "Ургенчский государственный университет (УрГУ)",
    type: InstitutionType.UNIVERSITY,
    citySlug: 'urganch',
    phone: '+998623265515',
    website: 'https://urdu.uz',
    address: "Urganch, Hamid Olimjon ko'chasi 14",
    lat: 41.5475, lng: 60.6347,
    descUz: "UrDU — Xorazm viloyatining yetakchi universiteti. 1932-yildan buyon faoliyat yuritadi.",
    descRu: "УрГУ — ведущий университет Хорезмской области. Работает с 1932 года.",
    languages: ['uz', 'ru'],
    programs: ['Matematika', 'Fizika', 'Kimyo', 'Biologiya', 'Tarix', 'Iqtisodiyot', 'Pedagogika'],
    founded: 1932, students: 10000, teachers: 680,
    monthlyMin: 0,
    isVerified: true, avgRating: 4.1,
  },
  {
    nameUz: "Urganch IT Academy",
    nameRu: "Ургенчская IT Academy",
    type: InstitutionType.COURSE_CENTER,
    citySlug: 'urganch',
    phone: '+998623456789',
    telegram: 'urganch_it',
    address: "Urganch, Al-Xorazmiy ko'chasi 8",
    lat: 41.5490, lng: 60.6360,
    descUz: "Urganchdagi IT ta'lim markazi. Python, Web, Flutter kurslar.",
    descRu: "IT-учебный центр в Ургенче. Курсы Python, Web, Flutter.",
    languages: ['uz'],
    programs: ['Python', 'JavaScript', 'Flutter', 'Grafik dizayn'],
    founded: 2021, students: 180, teachers: 9,
    monthlyMin: 380000, monthlyMax: 700000,
    paymentMethods: ['Payme', 'Click', 'Naqd'],
    isVerified: false, avgRating: 4.1,
  },
]

// ─── NUKUS (QORAQALPOG'ISTON) ─────────────────────────────────────────────────
const nukusInstitutions: SeedInstitution[] = [
  {
    nameUz: "Berdaq nomidagi Qoraqalpog'iston Davlat Universiteti (QDU)",
    nameRu: "Каракалпакский государственный университет имени Бердаха (КГУ)",
    type: InstitutionType.UNIVERSITY,
    citySlug: 'nukus',
    phone: '+998612223150',
    website: 'https://karsu.uz',
    address: "Nukus, Ch. Abdirov ko'chasi 1",
    lat: 42.4600, lng: 59.6100,
    descUz: "QDU — Qoraqalpog'iston Respublikasining yetakchi universiteti. 1976-yildan buyon faoliyat yuritadi.",
    descRu: "КГУ — ведущий университет Республики Каракалпакстан. Работает с 1976 года.",
    languages: ['kaa', 'uz', 'ru'],
    programs: ['Matematika', 'Fizika', 'Qoraqalpoq filologiyasi', 'Iqtisodiyot', 'Pedagogika', 'Biologiya'],
    founded: 1976, students: 8000, teachers: 550,
    monthlyMin: 0,
    isVerified: true, avgRating: 4.0,
  },
  {
    nameUz: "Nukus IT markazi",
    nameRu: "Нукусский IT-центр",
    type: InstitutionType.COURSE_CENTER,
    citySlug: 'nukus',
    phone: '+998612345678',
    telegram: 'nukus_it',
    address: "Nukus, Dostlik ko'chasi 15",
    lat: 42.4620, lng: 59.6120,
    descUz: "Nukusdagi IT ta'lim markazi. Python, Web dizayn yo'nalishlari.",
    descRu: "IT-учебный центр в Нукусе. Направления: Python, Web-дизайн.",
    languages: ['uz', 'kaa'],
    programs: ['Python', 'JavaScript', 'Grafik dizayn'],
    founded: 2022, students: 120, teachers: 6,
    monthlyMin: 300000, monthlyMax: 600000,
    paymentMethods: ['Payme', 'Click', 'Naqd'],
    isVerified: false, avgRating: 3.9,
  },
]

// ─── TERMIZ (SURXONDARYO) ─────────────────────────────────────────────────────
const termizInstitutions: SeedInstitution[] = [
  {
    nameUz: "Termiz Davlat Universiteti (TerDU)",
    nameRu: "Термезский государственный университет (ТерГУ)",
    type: InstitutionType.UNIVERSITY,
    citySlug: 'termiz',
    phone: '+998762223120',
    website: 'https://terdu.uz',
    address: "Termiz, Barkamol avlod ko'chasi 43",
    lat: 37.2242, lng: 67.2783,
    descUz: "TerDU — Surxondaryo viloyatining yetakchi universiteti.",
    descRu: "ТерГУ — ведущий университет Сурхандарьинской области.",
    languages: ['uz', 'ru'],
    programs: ['Matematika', 'Fizika', 'Tarix', 'Arxeologiya', 'Iqtisodiyot', 'Pedagogika'],
    founded: 1960, students: 8500, teachers: 580,
    monthlyMin: 0,
    isVerified: true, avgRating: 4.0,
  },
]

// ─── JIZZAX ───────────────────────────────────────────────────────────────────
const jizzaxInstitutions: SeedInstitution[] = [
  {
    nameUz: "Jizzax Davlat Pedagogika Universiteti (JDPU)",
    nameRu: "Джизакский государственный педагогический университет (ДжГПУ)",
    type: InstitutionType.UNIVERSITY,
    citySlug: 'jizzax',
    phone: '+998722264450',
    website: 'https://jdpu.uz',
    address: "Jizzax, Sh. Rashidov ko'chasi 4",
    lat: 40.1158, lng: 67.8422,
    descUz: "JDPU — Jizzax viloyatining yetakchi pedagogika universiteti.",
    descRu: "ДжГПУ — ведущий педагогический университет Джизакской области.",
    languages: ['uz', 'ru'],
    programs: ['Matematika', 'Fizika', 'Kimyo', 'Biologiya', 'Tarix', 'Ona tili va adabiyoti', 'Ingliz tili', 'Jismoniy tarbiya'],
    founded: 1974, students: 7000, teachers: 480,
    monthlyMin: 0,
    isVerified: true, avgRating: 4.0,
  },
]

// ─── GULISTON (SIRDARYO) ──────────────────────────────────────────────────────
const gulistonInstitutions: SeedInstitution[] = [
  {
    nameUz: "Sirdaryo Davlat Universiteti (SDU)",
    nameRu: "Сырдарьинский государственный университет (СГУ)",
    type: InstitutionType.UNIVERSITY,
    citySlug: 'guliston',
    phone: '+998672252080',
    website: 'https://sduguliston.uz',
    address: "Guliston, B. Hojiyev ko'chasi 175",
    lat: 40.4897, lng: 68.7780,
    descUz: "SDU — Sirdaryo viloyatining yetakchi universiteti.",
    descRu: "СГУ — ведущий университет Сырдарьинской области.",
    languages: ['uz', 'ru'],
    programs: ['Matematika', 'Fizika', 'Iqtisodiyot', 'Pedagogika', 'Huquq'],
    founded: 1967, students: 6500, teachers: 430,
    monthlyMin: 0,
    isVerified: true, avgRating: 3.9,
  },
]

// ─── NAVOIY ───────────────────────────────────────────────────────────────────
const navoiyInstitutions: SeedInstitution[] = [
  {
    nameUz: "Navoiy Davlat Konchilik-Texnologiyalar Universiteti",
    nameRu: "Навоийский государственный горно-технологический университет",
    type: InstitutionType.UNIVERSITY,
    citySlug: 'navoiy',
    phone: '+998792260444',
    website: 'https://ndti.uz',
    address: "Navoiy, Janubiy sanoat tumani, 1",
    lat: 40.0845, lng: 65.3793,
    descUz: "Navoiy Davlat Konchilik-Texnologiyalar Universiteti — konchilik, metallurgiya va geologiya yo'nalishlari bo'yicha ixtisoslashgan.",
    descRu: "Навоийский государственный горно-технологический университет — специализируется на горном деле, металлургии и геологии.",
    languages: ['uz', 'ru'],
    programs: ['Konchilik', 'Metallurgiya', 'Geologiya', 'Ekologiya', 'Kimyo texnologiyasi'],
    founded: 1992, students: 5000, teachers: 350,
    monthlyMin: 0,
    isVerified: true, avgRating: 4.1,
  },
]

async function main() {
  console.log("🌱 Seed ma'lumotlari yuklanmoqda...")

  // ─── Barcha 14 viloyat ────────────────────────────────────────────────────────
  const toshkentRegion = await prisma.region.upsert({
    where: { slug: 'toshkent-shahri' },
    update: { nameUz: 'Toshkent shahri', nameRu: 'город Ташкент' },
    create: { nameUz: 'Toshkent shahri', nameRu: 'город Ташкент', slug: 'toshkent-shahri', type: 'city' },
  })
  const toshkentViloyatRegion = await prisma.region.upsert({
    where: { slug: 'toshkent-viloyati' },
    update: {},
    create: { nameUz: 'Toshkent viloyati', nameRu: 'Ташкентская область', slug: 'toshkent-viloyati', type: 'region' },
  })
  const andijonRegion = await prisma.region.upsert({
    where: { slug: 'andijon-viloyati' },
    update: {},
    create: { nameUz: 'Andijon viloyati', nameRu: 'Андижанская область', slug: 'andijon-viloyati', type: 'region' },
  })
  const buxoroRegion = await prisma.region.upsert({
    where: { slug: 'buxoro-viloyati' },
    update: {},
    create: { nameUz: 'Buxoro viloyati', nameRu: 'Бухарская область', slug: 'buxoro-viloyati', type: 'region' },
  })
  const jizzaxRegion = await prisma.region.upsert({
    where: { slug: 'jizzax-viloyati' },
    update: {},
    create: { nameUz: 'Jizzax viloyati', nameRu: 'Джизакская область', slug: 'jizzax-viloyati', type: 'region' },
  })
  const qashqadaryoRegion = await prisma.region.upsert({
    where: { slug: 'qashqadaryo-viloyati' },
    update: {},
    create: { nameUz: 'Qashqadaryo viloyati', nameRu: 'Кашкадарьинская область', slug: 'qashqadaryo-viloyati', type: 'region' },
  })
  const navoiyRegion = await prisma.region.upsert({
    where: { slug: 'navoiy-viloyati' },
    update: {},
    create: { nameUz: 'Navoiy viloyati', nameRu: 'Навоийская область', slug: 'navoiy-viloyati', type: 'region' },
  })
  const namanganRegion = await prisma.region.upsert({
    where: { slug: 'namangan-viloyati' },
    update: {},
    create: { nameUz: 'Namangan viloyati', nameRu: 'Наманганская область', slug: 'namangan-viloyati', type: 'region' },
  })
  const samarqandRegion = await prisma.region.upsert({
    where: { slug: 'samarqand-viloyati' },
    update: {},
    create: { nameUz: 'Samarqand viloyati', nameRu: 'Самаркандская область', slug: 'samarqand-viloyati', type: 'region' },
  })
  const sirdaryoRegion = await prisma.region.upsert({
    where: { slug: 'sirdaryo-viloyati' },
    update: {},
    create: { nameUz: 'Sirdaryo viloyati', nameRu: 'Сырдарьинская область', slug: 'sirdaryo-viloyati', type: 'region' },
  })
  const surxondaryoRegion = await prisma.region.upsert({
    where: { slug: 'surxondaryo-viloyati' },
    update: {},
    create: { nameUz: 'Surxondaryo viloyati', nameRu: 'Сурхандарьинская область', slug: 'surxondaryo-viloyati', type: 'region' },
  })
  const farghonaRegion = await prisma.region.upsert({
    where: { slug: 'farghona-viloyati' },
    update: {},
    create: { nameUz: "Farg'ona viloyati", nameRu: 'Ферганская область', slug: 'farghona-viloyati', type: 'region' },
  })
  const xorazmRegion = await prisma.region.upsert({
    where: { slug: 'xorazm-viloyati' },
    update: {},
    create: { nameUz: 'Xorazm viloyati', nameRu: 'Хорезмская область', slug: 'xorazm-viloyati', type: 'region' },
  })
  const qoraqalpogRegion = await prisma.region.upsert({
    where: { slug: 'qoraqalpogiston-respublikasi' },
    update: {},
    create: { nameUz: "Qoraqalpog'iston Respublikasi", nameRu: 'Республика Каракалпакстан', slug: 'qoraqalpogiston-respublikasi', type: 'region' },
  })

  console.log('✓ 14 viloyat yaratildi/yangilandi')

  // ─── Shaharlar ───────────────────────────────────────────────────────────────
  const cityEntries = [
    { slug: 'toshkent', nameUz: 'Toshkent', nameRu: 'Ташкент', regionId: toshkentRegion.id, lat: 41.2995, lng: 69.2401 },
    { slug: 'nurafshon', nameUz: 'Nurafshon', nameRu: 'Нурафшон', regionId: toshkentViloyatRegion.id, lat: 41.5653, lng: 69.5228 },
    { slug: 'andijon', nameUz: 'Andijon', nameRu: 'Андижан', regionId: andijonRegion.id, lat: 40.7821, lng: 72.3442 },
    { slug: 'buxoro', nameUz: 'Buxoro', nameRu: 'Бухара', regionId: buxoroRegion.id, lat: 39.7681, lng: 64.4556 },
    { slug: 'jizzax', nameUz: 'Jizzax', nameRu: 'Джизак', regionId: jizzaxRegion.id, lat: 40.1158, lng: 67.8422 },
    { slug: 'qarshi', nameUz: 'Qarshi', nameRu: 'Карши', regionId: qashqadaryoRegion.id, lat: 38.8606, lng: 65.7911 },
    { slug: 'navoiy', nameUz: 'Navoiy', nameRu: 'Навои', regionId: navoiyRegion.id, lat: 40.0845, lng: 65.3793 },
    { slug: 'namangan', nameUz: 'Namangan', nameRu: 'Наманган', regionId: namanganRegion.id, lat: 41.0011, lng: 71.6722 },
    { slug: 'samarqand', nameUz: 'Samarqand', nameRu: 'Самарканд', regionId: samarqandRegion.id, lat: 39.6542, lng: 66.9597 },
    { slug: 'guliston', nameUz: 'Guliston', nameRu: 'Гулистан', regionId: sirdaryoRegion.id, lat: 40.4897, lng: 68.7780 },
    { slug: 'termiz', nameUz: 'Termiz', nameRu: 'Термез', regionId: surxondaryoRegion.id, lat: 37.2242, lng: 67.2783 },
    { slug: 'farghona', nameUz: "Farg'ona", nameRu: 'Фергана', regionId: farghonaRegion.id, lat: 40.3864, lng: 71.7864 },
    { slug: 'urganch', nameUz: 'Urganch', nameRu: 'Ургенч', regionId: xorazmRegion.id, lat: 41.5475, lng: 60.6347 },
    { slug: 'nukus', nameUz: 'Nukus', nameRu: 'Нукус', regionId: qoraqalpogRegion.id, lat: 42.4600, lng: 59.6100 },
    { slug: 'kokand', nameUz: "Qo'qon", nameRu: 'Коканд', regionId: farghonaRegion.id, lat: 40.5286, lng: 70.9428 },
    { slug: 'margilan', nameUz: 'Marg\'ilon', nameRu: 'Маргилан', regionId: farghonaRegion.id, lat: 40.4747, lng: 71.7234 },
    { slug: 'shahrisabz', nameUz: 'Shahrisabz', nameRu: 'Шахрисабз', regionId: qashqadaryoRegion.id, lat: 39.0550, lng: 66.8350 },
    { slug: 'chirchiq', nameUz: 'Chirchiq', nameRu: 'Чирчик', regionId: toshkentViloyatRegion.id, lat: 41.4686, lng: 69.5819 },
    { slug: 'olmaliq', nameUz: 'Olmaliq', nameRu: 'Алмалык', regionId: toshkentViloyatRegion.id, lat: 40.8550, lng: 69.5990 },
  ]

  const cityMap: Record<string, string> = {}
  const cityRegionMap: Record<string, string> = {}

  for (const c of cityEntries) {
    const city = await prisma.city.upsert({
      where: { slug: c.slug },
      update: {},
      create: { nameUz: c.nameUz, nameRu: c.nameRu, slug: c.slug, regionId: c.regionId, lat: c.lat, lng: c.lng },
    })
    cityMap[c.slug] = city.id
    cityRegionMap[c.slug] = c.regionId
  }

  console.log(`✓ ${cityEntries.length} shahar yaratildi/yangilandi`)

  // ─── Super adminlar (upsert) ──────────────────────────────────────────────────
  for (const phone of ['+998909775255', '+998907817877']) {
    const su = await prisma.user.upsert({
      where: { phone },
      update: { role: Role.SUPER_ADMIN, isVerified: true },
      create: { phone, role: Role.SUPER_ADMIN, isVerified: true },
    })
    await prisma.adminPermission.upsert({
      where: { adminId: su.id },
      update: { canManageAll: true, canCreateInstitutions: true, canEditInstitutions: true, canDeleteInstitutions: true, canModerateReviews: true, canViewUsers: true },
      create: { adminId: su.id, canManageAll: true, institutionIds: [], canCreateInstitutions: true, canEditInstitutions: true, canDeleteInstitutions: true, canModerateReviews: true, canViewUsers: true },
    })
  }

  // ─── Test foydalanuvchi ───────────────────────────────────────────────────────
  const testUser = await prisma.user.upsert({
    where: { phone: '+998901234567' },
    update: {},
    create: { phone: '+998901234567', name: 'Test Foydalanuvchi', role: Role.USER, cityId: cityMap['toshkent'] },
  })
  const reviewUser2 = await prisma.user.upsert({
    where: { phone: '+998990000002' },
    update: {},
    create: { phone: '+998990000002', name: 'Aziz Karimov', role: Role.USER, cityId: cityMap['toshkent'] },
  })

  console.log('✓ Foydalanuvchilar tayyor')

  // ─── Barcha muassasalar ───────────────────────────────────────────────────────
  const allInstitutions: SeedInstitution[] = [
    ...universities,
    ...itSchools,
    ...courseCenters,
    ...languageCenters,
    ...toshkentSchools,
    ...kindergartens,
    ...samarqandInstitutions,
    ...namanganInstitutions,
    ...andijonInstitutions,
    ...farghonaInstitutions,
    ...buxoroInstitutions,
    ...qarshiInstitutions,
    ...urganchInstitutions,
    ...nukusInstitutions,
    ...termizInstitutions,
    ...jizzaxInstitutions,
    ...gulistonInstitutions,
    ...navoiyInstitutions,
  ]

  let created = 0
  const reviewUsers = [testUser, reviewUser2]

  const reviewBodies = [
    "O'qituvchilar juda professional, darslar qiziqarli va amaliy. Tavsiya qilaman!",
    "Yaxshi muassasa, lekin ba'zan jadvalda o'zgarishlar bo'ladi. Umuman olganda ijobiy taassurot.",
    "Kursdan keyin ishga joylasha oldim. Sifat va narx nisbati yaxshi.",
    "O'qitish uslubi zamonaviy, mentorlar doimo yordam berishadi.",
  ]
  const ratings = [5, 4, 5, 4]

  for (const inst of allInstitutions) {
    const slug = generateSlug(inst.nameUz)
    const cityId = cityMap[inst.citySlug]
    const regionId = cityRegionMap[inst.citySlug]

    if (!cityId) {
      console.warn(`  ⚠ Shahar topilmadi: ${inst.citySlug} (${inst.nameUz})`)
      continue
    }

    const result = await prisma.institution.upsert({
      where: { slug },
      update: {
        avgRating: inst.avgRating ?? null,
        isVerified: inst.isVerified ?? false,
      },
      create: {
        nameUz: inst.nameUz,
        nameRu: inst.nameRu,
        slug,
        type: inst.type,
        status: InstitutionStatus.ACTIVE,
        phone: inst.phone,
        phone2: inst.phone2,
        email: inst.email,
        website: inst.website,
        telegram: inst.telegram,
        instagram: inst.instagram,
        address: inst.address,
        lat: inst.lat,
        lng: inst.lng,
        isVerified: inst.isVerified ?? false,
        avgRating: inst.avgRating ?? null,
        cityId,
        regionId,
        details: {
          create: {
            descriptionUz: inst.descUz,
            descriptionRu: inst.descRu,
            languages: inst.languages,
            programs: inst.programs ?? [],
            specializations: inst.specializations ?? [],
            shifts: inst.shifts ?? [],
            achievements: inst.achievements,
            foundedYear: inst.founded,
            studentCount: inst.students,
            teacherCount: inst.teachers,
          },
        },
        ...(inst.monthlyMin
          ? {
              pricing: {
                create: {
                  monthlyMin: inst.monthlyMin,
                  monthlyMax: inst.monthlyMax ?? inst.monthlyMin,
                  paymentMethods: inst.paymentMethods ?? ['Payme', 'Click', 'Naqd'],
                },
              },
            }
          : {}),
        subscription: { create: { plan: 'FREE', isActive: false } },
      },
    })

    created++
    console.log(`  ✓ ${inst.nameUz}`)

    // Namunaviy sharhlar
    for (let i = 0; i < Math.min(2, reviewUsers.length); i++) {
      const reviewUser = reviewUsers[i]
      const overallRating = ratings[i % ratings.length]
      const body = reviewBodies[i % reviewBodies.length]
      if (!reviewUser || overallRating === undefined || body === undefined) continue
      await prisma.review
        .upsert({
          where: { institutionId_userId: { institutionId: result.id, userId: reviewUser.id } },
          update: {},
          create: {
            institutionId: result.id,
            userId: reviewUser.id,
            status: 'APPROVED',
            overallRating,
            teacherRating: 5,
            facilityRating: 4,
            body,
            title: i === 0 ? 'Yaxshi muassasa' : 'Tavsiya etaman',
            helpfulCount: Math.floor(Math.random() * 10),
          },
        })
        .catch(() => {})
    }
  }

  // ─── avgRating yangilash ──────────────────────────────────────────────────────
  console.log('\n📊 Reytinglarni yangilash...')
  const allInst = await prisma.institution.findMany({ select: { id: true } })
  for (const { id } of allInst) {
    const agg = await prisma.review.aggregate({
      where: { institutionId: id, status: 'APPROVED' },
      _avg: { overallRating: true },
      _count: { id: true },
    })
    if (agg._count.id > 0) {
      await prisma.institution.update({
        where: { id },
        data: { avgRating: agg._avg.overallRating, reviewCount: agg._count.id },
      })
    }
  }

  console.log('\n✅ Seed muvaffaqiyatli yakunlandi!')
  console.log(`   📍 14 viloyat + ${cityEntries.length} shahar`)
  console.log(`   🏫 ${created} muassasa`)
  console.log(`   👤 Super adminlar + test foydalanuvchilar tayyor`)
}

main()
  .catch((e) => {
    console.error('❌ Seed xatoligi:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

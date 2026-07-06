import { PrismaClient, InstitutionType, InstitutionStatus, Role } from '@prisma/client'
import { generateSlug } from './utils/slug'

const prisma = new PrismaClient()

// ─── Seed ma'lumotlari ────────────────────────────────────────────────────────

interface SeedInstitution {
  nameUz: string
  nameRu: string
  type: InstitutionType
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

// ─── TOSHKENT — O'QUV MARKAZLARI (COURSE_CENTER) ─────────────────────────────
const courseCenters: SeedInstitution[] = [
  {
    nameUz: "Najot Ta'lim",
    nameRu: "Najot Ta'lim",
    type: InstitutionType.COURSE_CENTER,
    phone: '+998712000004',
    website: 'https://najottalim.uz',
    telegram: 'najottalim',
    instagram: 'najottalim',
    address: "Toshkent, Yunusobod tumani, 19-mavze, 14-uy",
    lat: 41.3369, lng: 69.2883,
    descUz: "Najot Ta'lim — O'zbekistondagi eng yirik IT ta'lim markazlaridan biri. 2016-yildan beri 50 000+ bitiruvchi tayyorlagan. Toshkent, Samarqand, Namangan, Andijon va boshqa shaharlarda filiallari mavjud.",
    descRu: "Najot Ta'lim — один из крупнейших IT-учебных центров Узбекистана. С 2016 года подготовлено более 50 000 выпускников. Филиалы в Ташкенте, Самарканде, Намангане, Андижане.",
    languages: ['uz', 'ru'],
    programs: ['Python', 'Java', 'Flutter', 'Frontend (React)', 'Backend (Node.js)', 'Android', 'iOS', 'Data Science', 'DevOps', 'UI/UX Design'],
    specializations: ['Backend dasturlash', 'Mobile dasturlash', 'Frontend dasturlash', 'Ma\'lumotlar fani'],
    shifts: ['Ertalabki (08:00-13:00)', 'Tushki (13:00-18:00)', 'Kechki (18:00-22:00)', 'Hafta oxiri'],
    achievements: "50 000+ bitiruvchi. 2023-yilda 5 000+ talaba IT kompaniyalariga ishga joylashdi. Bitiruvchilar Google, Yandex, Epam, Uzum Bank kabi kompaniyalarda ishlaydi.",
    founded: 2016, students: 8000, teachers: 250,
    monthlyMin: 800000, monthlyMax: 1800000,
    paymentMethods: ['Payme', 'Click', 'Uzcard', 'Humo', 'Naqd'],
    isVerified: true, avgRating: 4.7,
  },
  {
    nameUz: 'PDP Academy',
    nameRu: 'PDP Academy',
    type: InstitutionType.COURSE_CENTER,
    phone: '+998781134444',
    website: 'https://pdp.uz',
    telegram: 'pdpacademy',
    instagram: 'pdp_academy',
    address: "Toshkent, Mirzo Ulug'bek tumani, Qoratosh ko'chasi 4",
    lat: 41.3580, lng: 69.3012,
    descUz: "PDP Academy — O'zbekistondagi eng yirik IT ta'lim markazlaridan biri. Java, Python, Flutter yo'nalishlari bo'yicha intensiv kurslar taklif etadi. 100+ IT kompaniya bilan hamkorlik qiladi.",
    descRu: "PDP Academy — один из ведущих IT-учебных центров Узбекистана. Предлагает интенсивные курсы по Java, Python, Flutter. Сотрудничает с 100+ IT-компаниями.",
    languages: ['uz', 'ru', 'en'],
    programs: ['Java', 'Python', 'Flutter', 'Frontend', 'Backend', 'Cybersecurity', 'QA Testing', 'AI/ML', 'Golang'],
    specializations: ['Java Backend', 'Python & AI', 'Mobile (Flutter)', 'Kiberxavfsizlik'],
    shifts: ['Ertalabki (08:00-13:00)', 'Kechki (18:00-22:00)', 'Hafta oxiri'],
    achievements: "30 000+ bitiruvchi. 2024-yilda 3 000+ talabamiz IT sohasida ish topdi. O'zbekiston, Rossiya, AQSHdagi kompaniyalarda ishlaydi.",
    founded: 2018, students: 5000, teachers: 150,
    monthlyMin: 900000, monthlyMax: 2000000,
    paymentMethods: ['Payme', 'Click', 'Uzcard', 'Humo', 'Naqd'],
    isVerified: true, avgRating: 4.8,
  },
  {
    nameUz: "IT Step Academy Toshkent",
    nameRu: "IT Step Academy Ташкент",
    type: InstitutionType.COURSE_CENTER,
    phone: '+998712005050',
    website: 'https://itstep.uz',
    telegram: 'itstep_tashkent',
    instagram: 'itstep_uz',
    address: "Toshkent, Yakkasaroy tumani, Matbuotchilar ko'chasi 32",
    lat: 41.2990, lng: 69.2720,
    descUz: "IT Step Academy — xalqaro franchayzing asosida ishlaydigan IT ta'lim markazi. Dasturlash, dizayn va IT infratuzilmasi yo'nalishlari bo'yicha professional kurslar.",
    descRu: "IT Step Academy — международная сеть IT-образования. Профессиональные курсы по программированию, дизайну и IT-инфраструктуре.",
    languages: ['uz', 'ru'],
    programs: ['C#/.NET', 'Java', 'Python', 'Web Dizayn', 'Grafik Dizayn', '3D Modellashtirish', 'Network Admin'],
    specializations: ['.NET dasturlash', 'Grafik dizayn', 'IT infratuzilma'],
    shifts: ['Ertalabki (09:00-13:00)', 'Kechki (17:00-21:00)', 'Hafta oxiri'],
    achievements: "10 000+ bitiruvchi. 20+ yillik xalqaro tajriba. 30+ davlatda filiallar.",
    founded: 2005, students: 1500, teachers: 60,
    monthlyMin: 700000, monthlyMax: 1500000,
    paymentMethods: ['Payme', 'Click', 'Humo', 'Naqd'],
    isVerified: true, avgRating: 4.4,
  },
  {
    nameUz: "SVIC — Silicon Valley Innovations Camp",
    nameRu: "SVIC — Silicon Valley Innovations Camp",
    type: InstitutionType.COURSE_CENTER,
    phone: '+998712050505',
    website: 'https://svic.uz',
    telegram: 'svic_uz',
    instagram: 'svic.uz',
    address: "Toshkent, Sergeli tumani, Yangi O'zbekiston parkiga yaqin",
    lat: 41.2523, lng: 69.2178,
    descUz: "SVIC — IT Park Uzbekistan tarkibidagi startaplar va innovatsiyalar uchun ta'lim markazi. Dasturlash, startap, biznes va innovatsiya yo'nalishlari.",
    descRu: "SVIC — образовательный центр для стартапов и инноваций в составе IT Park Uzbekistan.",
    languages: ['uz', 'ru', 'en'],
    programs: ['Startap asoslari', 'Web dasturlash', 'Mobil dasturlash', 'Sun\'iy intellekt', 'Robotexnika', 'Biznes va innovatsiya'],
    specializations: ['Startap rivojlantirish', 'AI/ML', 'Robototexnika'],
    shifts: ['Ertalabki (09:00-17:00)', 'Hafta oxiri'],
    achievements: "2 000+ yoshlar dasturlashni o'rgandi. 50+ startap loyihalari yaratildi.",
    founded: 2019, students: 800, teachers: 40,
    monthlyMin: 600000, monthlyMax: 1200000,
    paymentMethods: ['Payme', 'Click', 'Naqd'],
    isVerified: true, avgRating: 4.5,
  },
  {
    nameUz: "Algorithmics Uzbekistan",
    nameRu: "Algorithmics Узбекистан",
    type: InstitutionType.COURSE_CENTER,
    phone: '+998712030303',
    website: 'https://algorithmics.uz',
    telegram: 'algorithmics_uz',
    instagram: 'algorithmics.uz',
    address: "Toshkent, Chilonzor tumani, Katartal ko'chasi 38",
    lat: 41.2745, lng: 69.2010,
    descUz: "Algorithmics — bolalar (6-17 yosh) uchun dasturlash maktabi. Scratch, Python, Web va Game Development yo'nalishlari. Dunyo bo'yicha 100+ mamlakatlarda ishlaydi.",
    descRu: "Algorithmics — школа программирования для детей 6-17 лет. Scratch, Python, Web и Game Development. Работает в 100+ странах мира.",
    languages: ['uz', 'ru'],
    programs: ['Scratch (6-9 yosh)', 'Python (10-14 yosh)', 'Web Development (12-17 yosh)', 'Game Development', 'Robotexnika'],
    specializations: ['Bolalar uchun dasturlash', 'Zamonaviy o\'yin yaratish', 'Robototexnika'],
    shifts: ['Ertalabki (10:00-13:00)', 'Tushki (14:00-17:00)', 'Kechki (17:00-20:00)', 'Hafta oxiri'],
    achievements: "5 000+ bola dasturlashni o'rgandi. Jahon olimpiadalarida g'olib bolalar.",
    founded: 2017, students: 600, teachers: 30,
    monthlyMin: 500000, monthlyMax: 900000,
    paymentMethods: ['Payme', 'Click', 'Humo', 'Naqd'],
    isVerified: true, avgRating: 4.6,
  },
  {
    nameUz: "Mohirdev IT Academy",
    nameRu: "Mohirdev IT Academy",
    type: InstitutionType.COURSE_CENTER,
    phone: '+998712020202',
    website: 'https://mohirdev.uz',
    telegram: 'mohirdev',
    instagram: 'mohirdev.uz',
    address: "Toshkent, Shayxontohur tumani, Labzak ko'chasi 72",
    lat: 41.3123, lng: 69.2450,
    descUz: "Mohirdev — o'zbek tilida IT ta'lim beruvchi platforma. Online va offline kurslar. YouTube kanalida 500 000+ obunachi. Frontend, Backend, Mobile yo'nalishlari.",
    descRu: "Mohirdev — платформа IT-образования на узбекском языке. Онлайн и офлайн курсы. 500 000+ подписчиков на YouTube.",
    languages: ['uz'],
    programs: ['HTML/CSS', 'JavaScript', 'React', 'Vue.js', 'Node.js', 'Python', 'Flutter'],
    specializations: ['Frontend (JavaScript)', 'Backend (Node.js)', 'Mobile (Flutter)'],
    shifts: ['Ertalabki (09:00-13:00)', 'Kechki (17:00-21:00)', 'Online (istalgan vaqt)'],
    achievements: "200 000+ online talaba. 20 000+ sertifikat berilgan. O'zbekistondagi eng yirik o'zbek tilidagi IT platforma.",
    founded: 2018, students: 3000, teachers: 50,
    monthlyMin: 300000, monthlyMax: 800000,
    paymentMethods: ['Payme', 'Click', 'Naqd'],
    isVerified: true, avgRating: 4.6,
  },
  {
    nameUz: "Netskills IT ta'lim markazi",
    nameRu: "Netskills IT учебный центр",
    type: InstitutionType.COURSE_CENTER,
    phone: '+998909090909',
    website: 'https://netskills.uz',
    telegram: 'netskills_uz',
    address: "Toshkent, Uchtepa tumani, Bunyodkor ko'chasi 2",
    lat: 41.2870, lng: 69.1980,
    descUz: "Netskills — tarmoq va IT infratuzilmasi bo'yicha professional ta'lim markazi. Cisco, CompTIA sertifikatlari uchun tayyorlov.",
    descRu: "Netskills — профессиональный учебный центр по сети и IT-инфраструктуре. Подготовка к сертификатам Cisco, CompTIA.",
    languages: ['uz', 'ru'],
    programs: ['Cisco CCNA', 'CompTIA A+', 'CompTIA Network+', 'Linux Admin', 'Windows Server', 'Kiberxavfsizlik'],
    specializations: ['Tarmoq administratori', 'Kiberxavfsizlik', 'Linux/Windows server'],
    shifts: ['Ertalabki (09:00-13:00)', 'Kechki (17:00-21:00)'],
    achievements: "3 000+ sertifikat topshiruvchilar. Cisco Golden Partner maqomi.",
    founded: 2014, students: 400, teachers: 20,
    monthlyMin: 600000, monthlyMax: 1000000,
    paymentMethods: ['Payme', 'Click', 'Naqd'],
    isVerified: true, avgRating: 4.3,
  },
  {
    nameUz: "Geeks — Dasturlash maktabi",
    nameRu: "Geeks — Школа программирования",
    type: InstitutionType.COURSE_CENTER,
    phone: '+998901112233',
    website: 'https://geeks.uz',
    telegram: 'geeks_uz',
    instagram: 'geeks.uz',
    address: "Toshkent, Yunusobod tumani, 19-mavze",
    lat: 41.3400, lng: 69.2900,
    descUz: "Geeks — amaliy yo'nalishda dasturlash o'qitadigan maktab. Har bir talaba real loyihalar ustida ishlaydi. Mentorlik tizimi va karyera markazi mavjud.",
    descRu: "Geeks — школа практического программирования. Каждый студент работает над реальными проектами. Система менторства и карьерный центр.",
    languages: ['uz', 'ru'],
    programs: ['Python', 'JavaScript/React', 'Flutter', 'Backend (Django)', 'Data Science', 'QA Testing'],
    specializations: ['Real loyihalar ustida ishlash', 'Karyera markazi', 'Mentorlik'],
    shifts: ['Ertalabki (09:00-13:00)', 'Kechki (17:00-21:00)', 'Online'],
    achievements: "5 000+ bitiruvchi. Bitiruvchilarning 85% ish topdi. Uzum, Humans, Beeline, Bpay kabi kompaniyalar bilan hamkorlik.",
    founded: 2019, students: 1200, teachers: 45,
    monthlyMin: 750000, monthlyMax: 1500000,
    paymentMethods: ['Payme', 'Click', 'Humo', 'Naqd'],
    isVerified: true, avgRating: 4.5,
  },
  {
    nameUz: "Innomart IT Academy",
    nameRu: "Innomart IT Academy",
    type: InstitutionType.COURSE_CENTER,
    phone: '+998712345610',
    website: 'https://innomart.uz',
    telegram: 'innomart_uz',
    address: "Toshkent, Mirzo Ulug'bek tumani, Do'stlik ko'chasi 20",
    lat: 41.3560, lng: 69.2990,
    descUz: "Innomart IT Academy — IT, marketing va biznes yo'nalishlari bo'yicha amaliy ta'lim markazi.",
    descRu: "Innomart IT Academy — практический учебный центр по IT, маркетингу и бизнесу.",
    languages: ['uz', 'ru'],
    programs: ['Python', 'Django', 'JavaScript', 'Digital Marketing', 'SMM', 'Grafik Dizayn', '1C Buxgalteriya'],
    specializations: ['Digital marketing', 'Dasturlash', 'Grafik dizayn'],
    shifts: ['Ertalabki (09:00-13:00)', 'Kechki (16:00-20:00)'],
    founded: 2017, students: 600, teachers: 25,
    monthlyMin: 500000, monthlyMax: 900000,
    paymentMethods: ['Payme', 'Click', 'Naqd'],
    isVerified: false, avgRating: 4.2,
  },
  {
    nameUz: "Becode IT School",
    nameRu: "Becode IT School",
    type: InstitutionType.COURSE_CENTER,
    phone: '+998907070707',
    website: 'https://becode.uz',
    telegram: 'becode_uz',
    instagram: 'becode.uz',
    address: "Toshkent, Yashnobod tumani, Fayzobod ko'chasi 16",
    lat: 41.3210, lng: 69.3150,
    descUz: "Becode — intensiv bootcamp formatida dasturlash o'qitish markazi. Qisqa muddatda professional dasturchi bo'lish imkoniyati.",
    descRu: "Becode — учебный центр программирования в формате интенсивного буткемпа.",
    languages: ['uz', 'ru'],
    programs: ['Full Stack Web', 'Python Backend', 'React Frontend', 'Flutter Mobile'],
    specializations: ['Bootcamp formatida o\'qitish', 'Tez karyeraga yo\'naltirish'],
    shifts: ['Ertalabki (09:00-18:00)', 'Online'],
    achievements: "2 000+ bitiruvchi. 3-6 oyda ishga joylashish kafolati.",
    founded: 2020, students: 400, teachers: 20,
    monthlyMin: 800000, monthlyMax: 1400000,
    paymentMethods: ['Payme', 'Click', 'Naqd'],
    isVerified: false, avgRating: 4.4,
  },
  {
    nameUz: "UIC Ta'lim markazi",
    nameRu: "Учебный центр UIC",
    type: InstitutionType.COURSE_CENTER,
    phone: '+998712110011',
    website: 'https://uic.uz',
    telegram: 'uic_uzbekistan',
    address: "Toshkent, Shayxontohur tumani, Xadra maydoni 4",
    lat: 41.3085, lng: 69.2670,
    descUz: "UIC (University of IT Cooperation) — IT, biznes va chet tillari yo'nalishlari bo'yicha ta'lim markazi. Diplomli va qisqa muddatli kurslar.",
    descRu: "UIC — учебный центр по направлениям IT, бизнес и иностранные языки. Дипломные и краткосрочные курсы.",
    languages: ['uz', 'ru', 'en'],
    programs: ['Dasturlash asoslari', 'Web dizayn', 'Buxgalteriya (1C)', 'Ingliz tili', 'IELTS tayyorgarlik', 'Biznes administratsiyasi'],
    shifts: ['Ertalabki (09:00-13:00)', 'Tushki (13:00-17:00)', 'Kechki (17:00-21:00)'],
    founded: 2012, students: 1000, teachers: 40,
    monthlyMin: 450000, monthlyMax: 850000,
    paymentMethods: ['Payme', 'Click', 'Humo', 'Naqd'],
    isVerified: false, avgRating: 4.1,
  },
  {
    nameUz: "IT Park Ta'lim Markazi",
    nameRu: "IT Park Учебный Центр",
    type: InstitutionType.COURSE_CENTER,
    phone: '+998711234560',
    website: 'https://it-park.uz',
    telegram: 'itpark_edu',
    instagram: 'itpark.uz',
    address: "Toshkent, Yakkasaroy tumani, Amir Temur ko'chasi 107B",
    lat: 41.2956, lng: 69.2734,
    descUz: "IT Park — O'zbekiston Respublikasi hukumati tomonidan tashkil etilgan IT industriyasi inkubatori va ta'lim markazi. Startaplar, akseleratorlar va IT kurslar.",
    descRu: "IT Park — инкубатор IT-индустрии и образовательный центр, учреждённый правительством Узбекистана.",
    languages: ['uz', 'ru', 'en'],
    programs: ['Python', 'JavaScript', 'Startap asoslari', 'Biznes modellash', 'AI/ML', 'Blockchain'],
    specializations: ['Startap ekosistema', 'IT innovatsiyalar', 'Hukumat IT dasturlari'],
    shifts: ['Ertalabki (09:00-17:00)'],
    achievements: "500+ startap kompaniya inkubatsiya qilindi. 10 000+ mutaxassis tayyorlandi.",
    founded: 2019, students: 800, teachers: 45,
    monthlyMin: 600000, monthlyMax: 1200000,
    paymentMethods: ['Payme', 'Click', 'Naqd'],
    isVerified: true, avgRating: 4.5,
  },
  {
    nameUz: "Amaliy IT O'quv Markazi",
    nameRu: "Amaliy IT Учебный центр",
    type: InstitutionType.COURSE_CENTER,
    phone: '+998935050505',
    telegram: 'amaliyit',
    address: "Toshkent, Olmazor tumani, Bunyodkor ko'chasi 14",
    lat: 41.3290, lng: 69.2570,
    descUz: "Amaliy IT — amaliy ko'nikmalarga asoslangan IT ta'lim markazi. Real loyihalar ustida ishlash orqali o'rgatish metodologiyasi.",
    descRu: "Amaliy IT — учебный центр с акцентом на практические навыки в сфере IT.",
    languages: ['uz'],
    programs: ['Web dasturlash', 'Python', 'Android', 'iOS', 'UI/UX Design', 'QA Testing'],
    shifts: ['Ertalabki (09:00-13:00)', 'Kechki (16:00-20:00)'],
    founded: 2020, students: 350, teachers: 15,
    monthlyMin: 500000, monthlyMax: 900000,
    paymentMethods: ['Payme', 'Click', 'Naqd'],
    isVerified: false, avgRating: 4.2,
  },
  {
    nameUz: "British Council O'zbekiston",
    nameRu: "British Council Узбекистан",
    type: InstitutionType.COURSE_CENTER,
    phone: '+998712062664',
    website: 'https://britishcouncil.uz',
    telegram: 'britishcouncil_uz',
    address: "Toshkent, Yakkasaroy tumani, Gulyamov ko'chasi 7",
    lat: 41.2976, lng: 69.2748,
    descUz: "British Council — Buyuk Britaniyaning rasmiy madaniy va ta'lim muassasasi. IELTS imtihoni markazi, ingliz tili kurslari va professional rivojlanish dasturlari.",
    descRu: "British Council — официальная культурная и образовательная организация Великобритании. Центр экзаменов IELTS, курсы английского языка.",
    languages: ['uz', 'ru', 'en'],
    programs: ['IELTS tayyorgarlik', 'General English', 'Business English', 'IELTS imtihoni (rasmiy)', 'Cambridge imtihonlari'],
    specializations: ['IELTS', 'Cambridge sertifikatlari', 'Ingliz tili o\'qituvchilariga seminarlar'],
    shifts: ['Ertalabki (09:00-13:00)', 'Kechki (14:00-20:00)'],
    achievements: "O'zbekistonda 25+ yillik faoliyat. Yiliga 10 000+ IELTS imtihoni o'tkaziladi.",
    founded: 1994, students: 2000, teachers: 50,
    monthlyMin: 700000, monthlyMax: 2000000,
    paymentMethods: ['Payme', 'Click', 'Visa'],
    isVerified: true, avgRating: 4.7,
  },
  {
    nameUz: "Wall Street English Toshkent",
    nameRu: "Wall Street English Ташкент",
    type: InstitutionType.COURSE_CENTER,
    phone: '+998712223344',
    website: 'https://wse.uz',
    telegram: 'wse_tashkent',
    address: "Toshkent, Mirzo Ulug'bek tumani, Mustakillik ko'chasi 75",
    lat: 41.3310, lng: 69.2990,
    descUz: "Wall Street English — dunyo bo'yicha 60 000+ muvaffaqiyatli bitiruvchiga ega xalqaro ingliz tili maktabi. Toshkentda professional ingliz tili kurslari.",
    descRu: "Wall Street English — международная школа английского языка с 60 000+ успешных выпускников по всему миру.",
    languages: ['uz', 'ru', 'en'],
    programs: ['Beginner English', 'Pre-Intermediate', 'Intermediate', 'Upper-Intermediate', 'Advanced', 'Business English', 'IELTS tayyorgarlik'],
    specializations: ['Kommunikativ ingliz tili', 'Biznes ingliz tili', 'IELTS/TOEFL'],
    shifts: ['Ertalabki (09:00-12:00)', 'Tushki (12:00-15:00)', 'Kechki (17:00-20:00)', 'Hafta oxiri'],
    founded: 2010, students: 800, teachers: 30,
    monthlyMin: 600000, monthlyMax: 1500000,
    paymentMethods: ['Payme', 'Click', 'Naqd'],
    isVerified: true, avgRating: 4.5,
  },
  {
    nameUz: "Lingua House til markazi",
    nameRu: "Lingua House языковой центр",
    type: InstitutionType.COURSE_CENTER,
    phone: '+998907778899',
    telegram: 'linguahouse_uz',
    address: "Toshkent, Shayxontohur tumani, Navoiy ko'chasi 30",
    lat: 41.3145, lng: 69.2512,
    descUz: "Lingua House — ko'p tilli ta'lim markazi. Ingliz, nemis, fransuz, koreys, xitoy va boshqa tillarda kurslar. IELTS, DELF, Goethe sertifikatlariga tayyorlov.",
    descRu: "Lingua House — многоязычный образовательный центр. Курсы на английском, немецком, французском, корейском, китайском языках.",
    languages: ['uz', 'ru'],
    programs: ['Ingliz tili', 'Nemis tili', 'Fransuz tili', 'Koreys tili', 'Xitoy tili', 'Turk tili', 'Arab tili', 'Yapon tili'],
    specializations: ['Ko\'p tilli sertifikatlash', 'IELTS', 'DELF', 'Goethe-Zertifikat'],
    shifts: ['Ertalabki (09:00-13:00)', 'Tushki (13:00-17:00)', 'Kechki (17:00-21:00)'],
    founded: 2013, students: 700, teachers: 35,
    monthlyMin: 400000, monthlyMax: 900000,
    paymentMethods: ['Payme', 'Click', 'Naqd'],
    isVerified: false, avgRating: 4.3,
  },
]

// ─── TOSHKENT — MAKTABLAR (SCHOOL / LYCEUM) ──────────────────────────────────
const schools: SeedInstitution[] = [
  // Xususiy maktablar (Private Schools)
  {
    nameUz: "Toshkent Xalqaro Maktabi (TIS)",
    nameRu: "Ташкентская Международная Школа (TIS)",
    type: InstitutionType.SCHOOL,
    phone: '+998712912020',
    website: 'https://tashkentinternationalschool.com',
    telegram: 'tis_tashkent',
    address: "Toshkent, Yunusobod tumani, 4-mavze",
    lat: 41.3420, lng: 69.3200,
    descUz: "Toshkent Xalqaro Maktabi — IB (International Baccalaureate) dasturi bo'yicha ta'lim beradigan xalqaro akkreditatsiyalangan maktab. 1994-yildan faoliyat yuritadi.",
    descRu: "Ташкентская Международная Школа — аккредитованная международная школа, реализующая программу IB (International Baccalaureate). Работает с 1994 года.",
    languages: ['en', 'uz', 'ru'],
    programs: ['IB Boshlang\'ich yillar dasturi', 'IB O\'rta yillar dasturi', 'IB Diplom dasturi', 'Ingliz tili', 'Matematika', 'Tabiiy fanlar'],
    specializations: ['International Baccalaureate (IB)', 'Xalqaro universitetlarga tayyorlov'],
    achievements: "Bitiruvchilar Oxford, Cambridge, MIT va boshqa top universitetlarga kirgan.",
    founded: 1994, students: 600, teachers: 80,
    monthlyMin: 5000000, monthlyMax: 10000000,
    paymentMethods: ['Payme', 'Click'],
    isVerified: true, avgRating: 4.8,
  },
  {
    nameUz: "Intellect School",
    nameRu: "Intellect School",
    type: InstitutionType.SCHOOL,
    phone: '+998712345670',
    website: 'https://intellect.uz',
    telegram: 'intellect_school',
    instagram: 'intellect.school.uz',
    address: "Toshkent, Mirzo Ulug'bek tumani, Furqat ko'chasi 25",
    lat: 41.3450, lng: 69.2950,
    descUz: "Intellect School — O'zbekistondagi nufuzli xususiy maktablardan biri. Kuchli matematika va tabiiy fanlar yo'nalishi. Olimpiada g'oliblari ko'p.",
    descRu: "Intellect School — один из престижных частных школ Узбекистана. Сильное направление математики и естественных наук. Много победителей олимпиад.",
    languages: ['uz', 'ru', 'en'],
    programs: ['Matematika (chuqurlashtirilgan)', 'Fizika', 'Kimyo', 'Biologiya', 'Ingliz tili', 'Informatika'],
    specializations: ['Olimpiada matematikasi', 'SAT/ACT tayyorgarlik', 'Xalqaro sertifikatlar'],
    achievements: "Respublika va xalqaro olimpiadalarda 100+ g'olib. Ko'pgina bitiruvchilar xorijiy universitetlarda o'qiydi.",
    founded: 2008, students: 800, teachers: 70,
    monthlyMin: 2000000, monthlyMax: 4000000,
    paymentMethods: ['Payme', 'Click', 'Humo'],
    isVerified: true, avgRating: 4.7,
  },
  {
    nameUz: "Umid School",
    nameRu: "Umid School",
    type: InstitutionType.SCHOOL,
    phone: '+998712678900',
    website: 'https://umidschool.uz',
    telegram: 'umid_school_uz',
    address: "Toshkent, Chilonzor tumani, 8-mavze, 21-uy",
    lat: 41.2810, lng: 69.2050,
    descUz: "Umid School — zamonaviy o'quv dasturi asosida ta'lim beradigan xususiy maktab. 1-11 sinflar. Ingliz tili chuqur o'rgatiladi.",
    descRu: "Umid School — частная школа с современными учебными программами. 1-11 классы. Углублённое изучение английского языка.",
    languages: ['uz', 'ru', 'en'],
    programs: ['Barcha umumta\'lim fanlari', 'Ingliz tili (chuqur)', 'Dasturlash asoslari', 'Musiqa', 'Sport'],
    shifts: ['Ertalabki (08:00-13:00)', 'Tushki (13:00-18:00)'],
    founded: 2012, students: 500, teachers: 45,
    monthlyMin: 1500000, monthlyMax: 2500000,
    paymentMethods: ['Payme', 'Click', 'Naqd'],
    isVerified: false, avgRating: 4.4,
  },
  // Prezident maktablari
  {
    nameUz: "Toshkent Prezident Maktabi",
    nameRu: "Ташкентская Президентская Школа",
    type: InstitutionType.LYCEUM,
    phone: '+998712345880',
    website: 'https://prezidentmaktabi.uz',
    address: "Toshkent, Mirzo Ulug'bek tumani, Ziyolilar ko'chasi 7",
    lat: 41.3500, lng: 69.3050,
    descUz: "O'zbekiston Prezidenti Shavkat Mirziyoyev tashabbusi bilan tashkil etilgan elita maktab. Iqtidorli o'quvchilar uchun bepul ta'lim. Xalqaro dasturlar.",
    descRu: "Элитная школа, основанная по инициативе Президента Узбекистана. Бесплатное образование для одарённых учащихся. Международные программы.",
    languages: ['uz', 'en'],
    programs: ['Matematika (olimpiada)', 'Fizika', 'Kimyo', 'Biologiya', 'Informatika', 'Ingliz tili', 'Tarix', 'Iqtisodiyot'],
    specializations: ['Xalqaro olimpiadalar', 'Elita ta\'lim', 'Ilmiy tadqiqot'],
    achievements: "IMO (Xalqaro Matematika Olimpiadasi) da medal. IChO, IPhO, IOI da g'olib o'quvchilar. 100% bitiruvchilar OTMga kiradi.",
    founded: 2018, students: 300, teachers: 60,
    monthlyMin: 0,
    isVerified: true, avgRating: 4.9,
  },
  // Davlat maktablari (mashhur)
  {
    nameUz: "Toshkent 1-son Ixtisoslashtirilgan Maktab",
    nameRu: "Ташкентская специализированная школа №1",
    type: InstitutionType.SCHOOL,
    phone: '+998712414141',
    address: "Toshkent, Mirzo Ulug'bek tumani, Mirzo Ulugbek ko'chasi 1",
    lat: 41.3489, lng: 69.2920,
    descUz: "O'zbekistondagi eng qadimiy va nufuzli maktablardan biri. Matematika va tabiiy fanlar bo'yicha chuqurlashtirilgan ta'lim.",
    descRu: "Одна из старейших и престижных школ Узбекистана. Углублённое образование по математике и естественным наукам.",
    languages: ['uz', 'ru'],
    programs: ['Matematika', 'Fizika', 'Kimyo', 'Biologiya', 'Geografiya', 'Tarix', 'Ingliz tili'],
    founded: 1934, students: 1200, teachers: 80,
    monthlyMin: 0,
    isVerified: true, avgRating: 4.5,
  },
  {
    nameUz: "Toshkent 110-son Maktab",
    nameRu: "Школа №110 Ташкент",
    type: InstitutionType.SCHOOL,
    phone: '+998712525252',
    address: "Toshkent, Chilonzor tumani, Qoratosh ko'chasi 18",
    lat: 41.2750, lng: 69.1990,
    descUz: "Toshkent shahrining yirik davlat maktablaridan biri. 1-11 sinflar. Sport va san'at yo'nalishlari kuchli.",
    descRu: "Одна из крупных государственных школ Ташкента. 1-11 классы. Сильное спортивное и художественное направление.",
    languages: ['uz', 'ru'],
    programs: ['Barcha umumta\'lim fanlari', 'Jismoniy tarbiya', 'Musiqa', 'Rassomlik'],
    founded: 1965, students: 1500, teachers: 90,
    monthlyMin: 0,
    isVerified: false, avgRating: 4.1,
  },
  {
    nameUz: "Muhammad al-Xorazmiy nomidagi Maktab-Litsey",
    nameRu: "Школа-Лицей имени Мухаммада аль-Хорезми",
    type: InstitutionType.LYCEUM,
    phone: '+998712636363',
    address: "Toshkent, Yunusobod tumani, 7-mavze, 15-uy",
    lat: 41.3350, lng: 69.3100,
    descUz: "Matematika va informatika yo'nalishidagi ixtisoslashtirilgan litsey. OTMga kirishda matematik yo'nalishi eng kuchli.",
    descRu: "Специализированный лицей математико-информационного направления. Один из сильнейших по математическому направлению.",
    languages: ['uz', 'ru'],
    programs: ['Matematika (chuqur)', 'Informatika', 'Fizika', 'Ingliz tili', 'Dasturlash asoslari'],
    specializations: ['Matematik olimpiadalar', 'Informatika olimpiadasi'],
    achievements: "Respublika matematika olimpiadalarida doimo yuqori o'rinlar. Ko'p o'quvchilar IT sohasida ishlaydi.",
    founded: 1999, students: 600, teachers: 45,
    monthlyMin: 0,
    isVerified: false, avgRating: 4.6,
  },
  {
    nameUz: "Mirzo School",
    nameRu: "Mirzo School",
    type: InstitutionType.SCHOOL,
    phone: '+998712747474',
    website: 'https://mirzoschool.uz',
    telegram: 'mirzo_school',
    address: "Toshkent, Bektemir tumani, Yangi hayot ko'chasi 5",
    lat: 41.3650, lng: 69.3300,
    descUz: "Mirzo School — zamonaviy o'quv muhiti va innovatsion ta'lim metodlari bilan qurollangan xususiy maktab.",
    descRu: "Mirzo School — частная школа с современной образовательной средой и инновационными методами обучения.",
    languages: ['uz', 'ru'],
    programs: ['Umumta\'lim fanlari', 'Ingliz tili', 'Informatika', 'Robototexnika', 'San\'at'],
    founded: 2016, students: 400, teachers: 35,
    monthlyMin: 1200000, monthlyMax: 2000000,
    paymentMethods: ['Payme', 'Click', 'Naqd'],
    isVerified: false, avgRating: 4.3,
  },
  {
    nameUz: "Maktab-Innovatsiya Litseyi",
    nameRu: "Школа-Инновационный Лицей",
    type: InstitutionType.LYCEUM,
    phone: '+998712858585',
    address: "Toshkent, Olmazor tumani, Oybek ko'chasi 14",
    lat: 41.3280, lng: 69.2520,
    descUz: "Innovatsion ta'lim usullari bilan ishlaydi. STEM yo'nalishi kuchli. Loyihalarga asoslangan ta'lim.",
    descRu: "Работает с инновационными методами обучения. Сильное STEM-направление. Проектное обучение.",
    languages: ['uz', 'ru'],
    programs: ['Matematika', 'Fizika', 'Kimyo', 'Biologiya', 'Robototexnika', 'Dasturlash', 'Ingliz tili'],
    specializations: ['STEM ta\'lim', 'Loyihalarga asoslangan o\'qitish'],
    founded: 2015, students: 500, teachers: 40,
    monthlyMin: 800000, monthlyMax: 1500000,
    paymentMethods: ['Payme', 'Click', 'Naqd'],
    isVerified: false, avgRating: 4.4,
  },
]

// ─── SAMARQAND ────────────────────────────────────────────────────────────────
const samarqandInstitutions: SeedInstitution[] = [
  {
    nameUz: "Samarqand IT Academy",
    nameRu: "Samarkand IT Academy",
    type: InstitutionType.COURSE_CENTER,
    phone: '+998662234567',
    telegram: 'samit_academy',
    address: "Samarqand, Registon ko'chasi 15",
    lat: 39.6542, lng: 66.9597,
    descUz: "Samarqandda IT ta'lim beradigan yirik markaz. Python, Web, Mobile yo'nalishlari.",
    descRu: "Крупный центр IT-образования в Самарканде. Направления: Python, Web, Mobile.",
    languages: ['uz', 'ru'],
    programs: ['Python', 'JavaScript', 'Flutter', 'Web dizayn', 'Grafik dizayn'],
    shifts: ['Ertalabki (09:00-13:00)', 'Kechki (16:00-20:00)'],
    founded: 2020, students: 400, teachers: 20,
    monthlyMin: 500000, monthlyMax: 900000,
    paymentMethods: ['Payme', 'Click', 'Naqd'],
    isVerified: false, avgRating: 4.3,
  },
  {
    nameUz: "Samarqand Ixtisoslashtirilgan Maktab-Internat",
    nameRu: "Самаркандская специализированная школа-интернат",
    type: InstitutionType.SCHOOL,
    phone: '+998662345678',
    address: "Samarqand, Amir Temur ko'chasi 22",
    lat: 39.6600, lng: 66.9650,
    descUz: "Samarqandning nufuzli davlat maktabi. Matematika va tabiiy fanlar bo'yicha chuqurlashtirilgan ta'lim.",
    descRu: "Престижная государственная школа Самарканда. Углублённое образование по математике и естественным наукам.",
    languages: ['uz', 'ru'],
    programs: ['Matematika', 'Fizika', 'Kimyo', 'Biologiya', 'Ingliz tili'],
    founded: 1960, students: 800, teachers: 55,
    monthlyMin: 0,
    isVerified: false, avgRating: 4.2,
  },
]

// ─── NAMANGAN ─────────────────────────────────────────────────────────────────
const namanganInstitutions: SeedInstitution[] = [
  {
    nameUz: "Namangan IT Valley",
    nameRu: "Namangan IT Valley",
    type: InstitutionType.COURSE_CENTER,
    phone: '+998694455667',
    telegram: 'namangan_itvalley',
    address: "Namangan, Kosonsoy ko'chasi 5",
    lat: 41.0011, lng: 71.6722,
    descUz: "Namangandagi yirik IT ta'lim markazi. Frontend, Backend, Mobile yo'nalishlari. IT Park Namangan bilan hamkorlik.",
    descRu: "Крупный IT-учебный центр в Намангане. Направления: Frontend, Backend, Mobile. Сотрудничество с IT Park Namangan.",
    languages: ['uz'],
    programs: ['Python', 'JavaScript/React', 'Flutter', 'Java', 'Grafik dizayn'],
    shifts: ['Ertalabki (09:00-13:00)', 'Kechki (16:00-20:00)'],
    founded: 2021, students: 300, teachers: 15,
    monthlyMin: 450000, monthlyMax: 800000,
    paymentMethods: ['Payme', 'Click', 'Naqd'],
    isVerified: false, avgRating: 4.2,
  },
  {
    nameUz: "Namangan 1-son Ixtisoslashtirilgan Maktab",
    nameRu: "Наманганская специализированная школа №1",
    type: InstitutionType.SCHOOL,
    phone: '+998692223344',
    address: "Namangan, Istiqlol ko'chasi 12",
    lat: 41.0040, lng: 71.6780,
    descUz: "Namanganning eng nufuzli davlat maktablaridan biri. Matematika olimpiadasi g'oliblarini tayyorlaydi.",
    descRu: "Одна из самых престижных государственных школ Намангана. Готовит победителей математических олимпиад.",
    languages: ['uz', 'ru'],
    programs: ['Matematika', 'Fizika', 'Kimyo', 'Biologiya', 'Ingliz tili'],
    founded: 1945, students: 1000, teachers: 65,
    monthlyMin: 0,
    isVerified: false, avgRating: 4.4,
  },
]

// ─── ANDIJON ──────────────────────────────────────────────────────────────────
const andijonInstitutions: SeedInstitution[] = [
  {
    nameUz: "Andijon IT Park Ta'lim Markazi",
    nameRu: "Андижанский IT Park Учебный Центр",
    type: InstitutionType.COURSE_CENTER,
    phone: '+998742001122',
    telegram: 'andijan_itpark',
    address: "Andijon, Bobur ko'chasi 33",
    lat: 40.7821, lng: 72.3442,
    descUz: "Andijon IT Park tarkibidagi ta'lim markazi. Dasturlash, dizayn va raqamli marketing kurslari.",
    descRu: "Учебный центр в составе Андижанского IT Park. Курсы программирования, дизайна и цифрового маркетинга.",
    languages: ['uz'],
    programs: ['Python', 'Web dasturlash', 'Grafik dizayn', 'Digital Marketing', 'SMM'],
    shifts: ['Ertalabki (09:00-13:00)', 'Kechki (16:00-20:00)'],
    founded: 2021, students: 250, teachers: 12,
    monthlyMin: 400000, monthlyMax: 700000,
    paymentMethods: ['Payme', 'Click', 'Naqd'],
    isVerified: false, avgRating: 4.1,
  },
]

// ─── FARG'ONA ─────────────────────────────────────────────────────────────────
const farghonaInstitutions: SeedInstitution[] = [
  {
    nameUz: "Farg'ona Tech Academy",
    nameRu: "Фергана Tech Academy",
    type: InstitutionType.COURSE_CENTER,
    phone: '+998732112233',
    telegram: 'farghona_tech',
    address: "Farg'ona, Mustaqillik ko'chasi 8",
    lat: 40.3864, lng: 71.7864,
    descUz: "Farg'onadagi IT ta'lim markazi. Python, Java, Web yo'nalishlari bo'yicha kurslar.",
    descRu: "IT-учебный центр в Фергане. Курсы по Python, Java, Web.",
    languages: ['uz'],
    programs: ['Python', 'Java', 'JavaScript', 'Web dizayn'],
    shifts: ['Ertalabki (09:00-13:00)', 'Kechki (16:00-20:00)'],
    founded: 2020, students: 200, teachers: 10,
    monthlyMin: 400000, monthlyMax: 700000,
    paymentMethods: ['Payme', 'Click', 'Naqd'],
    isVerified: false, avgRating: 4.0,
  },
]

async function main() {
  console.log('🌱 Real ma\'lumotlar bilan seed boshlandi...')

  // ─── Barcha 14 viloyat ───────────────────────────────────────────────────────
  const toshkentRegion = await prisma.region.upsert({
    where: { slug: 'toshkent-shahri' },
    update: { nameUz: 'Toshkent shahri', nameRu: 'город Ташкент' },
    create: { nameUz: 'Toshkent shahri', nameRu: 'город Ташкент', slug: 'toshkent-shahri', type: 'city' },
  })
  const toshkentViloyatRegion = await prisma.region.upsert({
    where: { slug: 'toshkent-viloyati' },
    update: { nameUz: 'Toshkent viloyati', nameRu: 'Ташкентская область' },
    create: { nameUz: 'Toshkent viloyati', nameRu: 'Ташкентская область', slug: 'toshkent-viloyati', type: 'region' },
  })
  const andijonRegion = await prisma.region.upsert({
    where: { slug: 'andijon-viloyati' },
    update: { nameUz: 'Andijon viloyati', nameRu: 'Андижанская область' },
    create: { nameUz: 'Andijon viloyati', nameRu: 'Андижанская область', slug: 'andijon-viloyati', type: 'region' },
  })
  const buxoroRegion = await prisma.region.upsert({
    where: { slug: 'buxoro-viloyati' },
    update: { nameUz: 'Buxoro viloyati', nameRu: 'Бухарская область' },
    create: { nameUz: 'Buxoro viloyati', nameRu: 'Бухарская область', slug: 'buxoro-viloyati', type: 'region' },
  })
  const jizzaxRegion = await prisma.region.upsert({
    where: { slug: 'jizzax-viloyati' },
    update: { nameUz: 'Jizzax viloyati', nameRu: 'Джизакская область' },
    create: { nameUz: 'Jizzax viloyati', nameRu: 'Джизакская область', slug: 'jizzax-viloyati', type: 'region' },
  })
  const qashqadaryoRegion = await prisma.region.upsert({
    where: { slug: 'qashqadaryo-viloyati' },
    update: { nameUz: 'Qashqadaryo viloyati', nameRu: 'Кашкадарьинская область' },
    create: { nameUz: 'Qashqadaryo viloyati', nameRu: 'Кашкадарьинская область', slug: 'qashqadaryo-viloyati', type: 'region' },
  })
  const navoiyRegion = await prisma.region.upsert({
    where: { slug: 'navoiy-viloyati' },
    update: { nameUz: 'Navoiy viloyati', nameRu: 'Навоийская область' },
    create: { nameUz: 'Navoiy viloyati', nameRu: 'Навоийская область', slug: 'navoiy-viloyati', type: 'region' },
  })
  const namanganRegion = await prisma.region.upsert({
    where: { slug: 'namangan-viloyati' },
    update: { nameUz: 'Namangan viloyati', nameRu: 'Наманганская область' },
    create: { nameUz: 'Namangan viloyati', nameRu: 'Наманганская область', slug: 'namangan-viloyati', type: 'region' },
  })
  const samarqandRegion = await prisma.region.upsert({
    where: { slug: 'samarqand-viloyati' },
    update: { nameUz: 'Samarqand viloyati', nameRu: 'Самаркандская область' },
    create: { nameUz: 'Samarqand viloyati', nameRu: 'Самаркандская область', slug: 'samarqand-viloyati', type: 'region' },
  })
  const sirdaryoRegion = await prisma.region.upsert({
    where: { slug: 'sirdaryo-viloyati' },
    update: { nameUz: 'Sirdaryo viloyati', nameRu: 'Сырдарьинская область' },
    create: { nameUz: 'Sirdaryo viloyati', nameRu: 'Сырдарьинская область', slug: 'sirdaryo-viloyati', type: 'region' },
  })
  const surxondaryoRegion = await prisma.region.upsert({
    where: { slug: 'surxondaryo-viloyati' },
    update: { nameUz: 'Surxondaryo viloyati', nameRu: 'Сурхандарьинская область' },
    create: { nameUz: 'Surxondaryo viloyati', nameRu: 'Сурхандарьинская область', slug: 'surxondaryo-viloyati', type: 'region' },
  })
  const farghonaRegion = await prisma.region.upsert({
    where: { slug: 'farghona-viloyati' },
    update: { nameUz: "Farg'ona viloyati", nameRu: 'Ферганская область' },
    create: { nameUz: "Farg'ona viloyati", nameRu: 'Ферганская область', slug: 'farghona-viloyati', type: 'region' },
  })
  const xorazmRegion = await prisma.region.upsert({
    where: { slug: 'xorazm-viloyati' },
    update: { nameUz: 'Xorazm viloyati', nameRu: 'Хорезмская область' },
    create: { nameUz: 'Xorazm viloyati', nameRu: 'Хорезмская область', slug: 'xorazm-viloyati', type: 'region' },
  })
  const qoraqalpogRegion = await prisma.region.upsert({
    where: { slug: 'qoraqalpogiston-respublikasi' },
    update: { nameUz: "Qoraqalpog'iston Respublikasi", nameRu: 'Республика Каракалпакстан' },
    create: { nameUz: "Qoraqalpog'iston Respublikasi", nameRu: 'Республика Каракалпакстан', slug: 'qoraqalpogiston-respublikasi', type: 'region' },
  })

  // ─── Barcha markaz shaharlar ─────────────────────────────────────────────────
  const toshkentCity = await prisma.city.upsert({
    where: { slug: 'toshkent' },
    update: {},
    create: { nameUz: 'Toshkent', nameRu: 'Ташкент', slug: 'toshkent', regionId: toshkentRegion.id, lat: 41.2995, lng: 69.2401 },
  })
  const nurafshonCity = await prisma.city.upsert({
    where: { slug: 'nurafshon' },
    update: {},
    create: { nameUz: 'Nurafshon', nameRu: 'Нурафшон', slug: 'nurafshon', regionId: toshkentViloyatRegion.id, lat: 41.5653, lng: 69.5228 },
  })
  const andijonCity = await prisma.city.upsert({
    where: { slug: 'andijon' },
    update: {},
    create: { nameUz: 'Andijon', nameRu: 'Андижан', slug: 'andijon', regionId: andijonRegion.id, lat: 40.7821, lng: 72.3442 },
  })
  const buxoroCity = await prisma.city.upsert({
    where: { slug: 'buxoro' },
    update: {},
    create: { nameUz: 'Buxoro', nameRu: 'Бухара', slug: 'buxoro', regionId: buxoroRegion.id, lat: 39.7681, lng: 64.4556 },
  })
  const jizzaxCity = await prisma.city.upsert({
    where: { slug: 'jizzax' },
    update: {},
    create: { nameUz: 'Jizzax', nameRu: 'Джизак', slug: 'jizzax', regionId: jizzaxRegion.id, lat: 40.1158, lng: 67.8422 },
  })
  const qarshiCity = await prisma.city.upsert({
    where: { slug: 'qarshi' },
    update: {},
    create: { nameUz: 'Qarshi', nameRu: 'Карши', slug: 'qarshi', regionId: qashqadaryoRegion.id, lat: 38.8606, lng: 65.7911 },
  })
  const navoiyCity = await prisma.city.upsert({
    where: { slug: 'navoiy' },
    update: {},
    create: { nameUz: 'Navoiy', nameRu: 'Навои', slug: 'navoiy', regionId: navoiyRegion.id, lat: 40.0845, lng: 65.3793 },
  })
  const namanganCity = await prisma.city.upsert({
    where: { slug: 'namangan' },
    update: {},
    create: { nameUz: 'Namangan', nameRu: 'Наманган', slug: 'namangan', regionId: namanganRegion.id, lat: 41.0011, lng: 71.6722 },
  })
  const samarqandCity = await prisma.city.upsert({
    where: { slug: 'samarqand' },
    update: {},
    create: { nameUz: 'Samarqand', nameRu: 'Самарканд', slug: 'samarqand', regionId: samarqandRegion.id, lat: 39.6542, lng: 66.9597 },
  })
  const gulistonCity = await prisma.city.upsert({
    where: { slug: 'guliston' },
    update: {},
    create: { nameUz: 'Guliston', nameRu: 'Гулистан', slug: 'guliston', regionId: sirdaryoRegion.id, lat: 40.4897, lng: 68.7780 },
  })
  const termizCity = await prisma.city.upsert({
    where: { slug: 'termiz' },
    update: {},
    create: { nameUz: 'Termiz', nameRu: 'Термез', slug: 'termiz', regionId: surxondaryoRegion.id, lat: 37.2242, lng: 67.2783 },
  })
  const farghonaCity = await prisma.city.upsert({
    where: { slug: 'farghona' },
    update: {},
    create: { nameUz: "Farg'ona", nameRu: 'Фергана', slug: 'farghona', regionId: farghonaRegion.id, lat: 40.3864, lng: 71.7864 },
  })
  const urganchCity = await prisma.city.upsert({
    where: { slug: 'urganch' },
    update: {},
    create: { nameUz: 'Urganch', nameRu: 'Ургенч', slug: 'urganch', regionId: xorazmRegion.id, lat: 41.5475, lng: 60.6347 },
  })
  const nukusCity = await prisma.city.upsert({
    where: { slug: 'nukus' },
    update: {},
    create: { nameUz: 'Nukus', nameRu: 'Нукус', slug: 'nukus', regionId: qoraqalpogRegion.id, lat: 42.4600, lng: 59.6100 },
  })

  // Seed ishlatmagan shaharlar — unused vars suppress
  void nurafshonCity; void buxoroCity; void jizzaxCity; void qarshiCity
  void navoiyCity; void gulistonCity; void termizCity; void urganchCity; void nukusCity

  // ─── Admin va test foydalanuvchi ─────────────────────────────────────────────
  const adminUser = await prisma.user.upsert({
    where: { phone: '+998990000001' },
    update: {},
    create: { phone: '+998990000001', name: 'Admin', role: Role.ADMIN },
  })

  const testUser = await prisma.user.upsert({
    where: { phone: '+998901234567' },
    update: {},
    create: { phone: '+998901234567', name: 'Test Foydalanuvchi', role: Role.USER, cityId: toshkentCity.id },
  })

  // ─── Muassasalarni yaratish ──────────────────────────────────────────────────
  const cityMap: Record<string, { cityId: string; regionId: string }> = {
    'Toshkent':   { cityId: toshkentCity.id,  regionId: toshkentRegion.id },
    'Samarqand':  { cityId: samarqandCity.id, regionId: samarqandRegion.id },
    'Namangan':   { cityId: namanganCity.id,  regionId: namanganRegion.id },
    'Andijon':    { cityId: andijonCity.id,   regionId: andijonRegion.id },
    "Farg'ona":   { cityId: farghonaCity.id,  regionId: farghonaRegion.id },
  }

  function getCityFromAddress(address: string) {
    for (const [city, ids] of Object.entries(cityMap)) {
      if (address.startsWith(city)) return ids
    }
    return { cityId: toshkentCity.id, regionId: toshkentRegion.id }
  }

  const allInstitutions = [
    ...courseCenters,
    ...schools,
    ...samarqandInstitutions,
    ...namanganInstitutions,
    ...andijonInstitutions,
    ...farghonaInstitutions,
  ]

  let created = 0
  let reviewUsers: { id: string }[] = [testUser, adminUser]

  for (const inst of allInstitutions) {
    const slug = generateSlug(inst.nameUz)
    const { cityId, regionId } = getCityFromAddress(inst.address)

    const result = await prisma.institution.upsert({
      where: { slug },
      update: {
        // Ma'lumotlar yangilansin
        avgRating:   inst.avgRating ?? null,
        reviewCount: 0,
        isVerified:  inst.isVerified ?? false,
      },
      create: {
        nameUz:     inst.nameUz,
        nameRu:     inst.nameRu,
        slug,
        type:       inst.type,
        status:     InstitutionStatus.ACTIVE,
        phone:      inst.phone,
        phone2:     inst.phone2,
        email:      inst.email,
        website:    inst.website,
        telegram:   inst.telegram,
        instagram:  inst.instagram,
        address:    inst.address,
        lat:        inst.lat,
        lng:        inst.lng,
        isVerified: inst.isVerified ?? false,
        avgRating:  inst.avgRating ?? null,
        cityId,
        regionId,
        details: {
          create: {
            descriptionUz:   inst.descUz,
            descriptionRu:   inst.descRu,
            languages:       inst.languages,
            programs:        inst.programs        ?? [],
            specializations: inst.specializations ?? [],
            shifts:          inst.shifts          ?? [],
            achievements:    inst.achievements,
            foundedYear:     inst.founded,
            studentCount:    inst.students,
            teacherCount:    inst.teachers,
          },
        },
        ...(inst.monthlyMin ? {
          pricing: {
            create: {
              monthlyMin:     inst.monthlyMin,
              monthlyMax:     inst.monthlyMax ?? inst.monthlyMin,
              paymentMethods: inst.paymentMethods ?? ['Payme', 'Click', 'Naqd'],
            },
          },
        } : {}),
        subscription: { create: { plan: 'FREE', isActive: false } },
      },
    })

    created++
    console.log(`  ✓ ${inst.nameUz} (${slug})`)

    // Har bir muassasaga 1-2 ta namunaviy sharh
    const reviewBodies = [
      "O'qituvchilar juda professional, darslar qiziqarli va amaliy. Tavsiya qilaman!",
      "Yaxshi muassasa, lekin ba'zan jadvalda o'zgarishlar bo'ladi. Umuman olganda ijobiy taassurot.",
      "Kursdan keyin ishga joylasha oldim. Sifat va narx nisbati yaxshi.",
      "O'qitish uslubi zamonaviy, mentorlar doimo yordam berishadi.",
    ]
    const ratings = [4, 5, 4, 5]

    for (let i = 0; i < Math.min(2, reviewUsers.length); i++) {
      const reviewer = reviewUsers[i]
      if (!reviewer) continue
      await prisma.review.upsert({
        where: {
          institutionId_userId: { institutionId: result.id, userId: reviewer.id },
        },
        update: {},
        create: {
          institutionId: result.id,
          userId:        reviewer.id,
          status:        'APPROVED',
          overallRating: ratings[i % ratings.length] ?? 4,
          teacherRating: 5,
          facilityRating: 4,
          body:  reviewBodies[i % reviewBodies.length] ?? reviewBodies[0] ?? '',
          title: i === 0 ? "Yaxshi muassasa" : "Tavsiya etaman",
          helpfulCount: Math.floor(Math.random() * 10),
        },
      }).catch(() => {}) // allaqachon sharh bor bo'lsa o'tkazib yuborish
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
  console.log(`   📍 14 ta viloyat + 14 ta markaz shahar`)
  console.log(`   🏫 ${created} ta muassasa`)
  console.log(`   👤 2 ta foydalanuvchi (admin + test)`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

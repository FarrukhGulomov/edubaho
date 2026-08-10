export interface Topic {
  slug: string
  term: string
  labelUz: string
  labelRu: string
  descUz: string
  descRu: string
}

// Haqiqiy seed dasturlaridan tanlangan, qidiruv sinonimlari (subjectSynonyms.ts)
// bilan mos keladigan mavzular — SEO uchun eng ko'p qidiriladigan yo'nalishlar.
// `/[city]/[topic]` sahifasi va `sitemap.ts` shu ro'yxatdan foydalanadi.
export const TOPICS: Topic[] = [
  {
    slug: 'python', term: 'Python',
    labelUz: 'Python dasturlash kurslari', labelRu: 'Курсы программирования Python',
    descUz: 'Python dasturlash tilini o\'rgatuvchi eng yaxshi kurslar va IT markazlar.',
    descRu: 'Лучшие курсы и IT-центры, обучающие языку программирования Python.',
  },
  {
    slug: 'frontend', term: 'Frontend',
    labelUz: 'Frontend dasturlash kurslari', labelRu: 'Курсы Frontend-разработки',
    descUz: 'Frontend (HTML, CSS, JavaScript, React) yo\'nalishida o\'qitadigan kurslar.',
    descRu: 'Курсы, обучающие Frontend-разработке (HTML, CSS, JavaScript, React).',
  },
  {
    slug: 'flutter', term: 'Flutter',
    labelUz: 'Flutter (mobil dasturlash) kurslari', labelRu: 'Курсы Flutter (мобильная разработка)',
    descUz: 'Flutter yordamida mobil ilova yaratishni o\'rgatuvchi kurslar.',
    descRu: 'Курсы по созданию мобильных приложений на Flutter.',
  },
  {
    slug: 'dasturlash', term: 'dasturlash',
    labelUz: 'Dasturlash kurslari', labelRu: 'Курсы программирования',
    descUz: 'Dasturlashni noldan o\'rgatadigan IT kurs markazlari.',
    descRu: 'IT-центры и курсы, обучающие программированию с нуля.',
  },
  {
    slug: 'ingliz-tili', term: 'ingliz tili',
    labelUz: 'Ingliz tili kurslari', labelRu: 'Курсы английского языка',
    descUz: 'Ingliz tilini har qanday darajada o\'rgatadigan til markazlari.',
    descRu: 'Языковые центры, обучающие английскому языку любого уровня.',
  },
  {
    slug: 'ielts', term: 'IELTS',
    labelUz: 'IELTS tayyorgarlik kurslari', labelRu: 'Курсы подготовки к IELTS',
    descUz: 'IELTS xalqaro imtihoniga tayyorlaydigan eng yaxshi markazlar.',
    descRu: 'Лучшие центры, готовящие к международному экзамену IELTS.',
  },
  {
    slug: 'dizayn', term: 'dizayn',
    labelUz: 'Dizayn kurslari (UI/UX, grafik)', labelRu: 'Курсы дизайна (UI/UX, графика)',
    descUz: 'UI/UX va grafik dizayn yo\'nalishida o\'qitadigan kurslar.',
    descRu: 'Курсы, обучающие UI/UX и графическому дизайну.',
  },
  {
    slug: 'robototexnika', term: 'robototexnika',
    labelUz: 'Robototexnika kurslari', labelRu: 'Курсы робототехники',
    descUz: 'Bolalar va o\'quvchilar uchun robototexnika to\'garaklari.',
    descRu: 'Кружки робототехники для детей и школьников.',
  },
]

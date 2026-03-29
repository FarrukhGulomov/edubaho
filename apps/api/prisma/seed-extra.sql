-- ================================================================
-- EduReyting.uz — O'quv markazlar va Maktablar
-- Railway PostgreSQL console'dan to'g'ridan-to'g'ri ishlatish uchun
-- Foydalanish: butun faylni nusxalab PostgreSQL console'ga joylashtiring
-- ================================================================

-- Yordamchi funksiya
CREATE OR REPLACE FUNCTION _seed_inst(
  p_slug      TEXT,
  p_nameUz    TEXT,
  p_nameRu    TEXT,
  p_type      TEXT,
  p_city      TEXT,
  p_phone     TEXT    DEFAULT NULL,
  p_website   TEXT    DEFAULT NULL,
  p_telegram  TEXT    DEFAULT NULL,
  p_instagram TEXT    DEFAULT NULL,
  p_address   TEXT    DEFAULT NULL,
  p_lat       FLOAT   DEFAULT NULL,
  p_lng       FLOAT   DEFAULT NULL,
  p_verified  BOOL    DEFAULT false,
  p_rating    FLOAT   DEFAULT NULL,
  p_descUz    TEXT    DEFAULT NULL,
  p_descRu    TEXT    DEFAULT NULL,
  p_founded   INT     DEFAULT NULL,
  p_students  INT     DEFAULT NULL,
  p_teachers  INT     DEFAULT NULL,
  p_langs     TEXT[]  DEFAULT ARRAY['uz'],
  p_programs  TEXT[]  DEFAULT ARRAY[]::TEXT[],
  p_specs     TEXT[]  DEFAULT ARRAY[]::TEXT[],
  p_min       INT     DEFAULT NULL,
  p_max       INT     DEFAULT NULL
) RETURNS TEXT LANGUAGE plpgsql AS $fn$
DECLARE
  v_iid TEXT;
  v_cid TEXT;
  v_rid TEXT;
BEGIN
  SELECT id, "regionId" INTO v_cid, v_rid FROM "City" WHERE slug = p_city;

  INSERT INTO "Institution" (
    id, "nameUz", "nameRu", slug, type, status,
    phone, website, telegram, instagram, address, lat, lng,
    "cityId", "regionId", "isVerified", "avgRating", "updatedAt"
  ) VALUES (
    gen_random_uuid()::text, p_nameUz, p_nameRu, p_slug,
    p_type::"InstitutionType", 'ACTIVE'::"InstitutionStatus",
    p_phone, p_website, p_telegram, p_instagram,
    p_address, p_lat, p_lng,
    v_cid, v_rid, p_verified, p_rating, NOW()
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO v_iid;

  IF v_iid IS NOT NULL THEN
    INSERT INTO "InstitutionDetail" (
      id, "institutionId", "descriptionUz", "descriptionRu",
      "foundedYear", "studentCount", "teacherCount",
      languages, programs, specializations, "updatedAt"
    ) VALUES (
      gen_random_uuid()::text, v_iid,
      p_descUz, p_descRu,
      p_founded, p_students, p_teachers,
      p_langs, p_programs, p_specs, NOW()
    );

    IF p_min IS NOT NULL THEN
      INSERT INTO "InstitutionPricing" (
        id, "institutionId", "monthlyMin", "monthlyMax",
        "paymentMethods", "updatedAt"
      ) VALUES (
        gen_random_uuid()::text, v_iid,
        p_min, p_max, ARRAY['Payme','Click','Naqd'], NOW()
      );
    END IF;

    INSERT INTO "Subscription" (id, "institutionId", plan, "isActive", "createdAt")
    VALUES (gen_random_uuid()::text, v_iid, 'FREE'::"SubscriptionPlan", false, NOW())
    ON CONFLICT ("institutionId") DO NOTHING;
  END IF;

  RETURN COALESCE(v_iid, 'mavjud: ' || p_slug);
END;
$fn$;

-- ================================================================
-- TIL MARKAZLARI (LANGUAGE_CENTER) — TOSHKENT
-- ================================================================
SELECT _seed_inst(
  'ilc-toshkent','International Language Center (ILC)','International Language Center (ILC)',
  'LANGUAGE_CENTER','toshkent','+998712561212','https://ilc.uz','ilc_tashkent','ilc.uz',
  'Toshkent, Yunusobod tumani, Amir Temur ko''chasi 1',41.3345,69.2967,true,4.6,
  'ILC — O''zbekistondagi eng yirik va eng nufuzli til markazlaridan biri. 30+ yillik tajriba. Ingliz, nemis, fransuz, ispan, xitoy va boshqa tillar. IELTS, TOEFL imtihonlari.',
  'ILC — один из крупнейших языковых центров Узбекистана. 30+ лет опыта. Английский, немецкий, французский и другие языки.',
  1992,3000,120,ARRAY['uz','ru','en'],
  ARRAY['General English','Business English','IELTS','TOEFL','Nemis tili','Fransuz tili','Ispan tili','Xitoy tili','Koreys tili'],
  ARRAY['IELTS','TOEFL','DELF','Goethe-Zertifikat'],500000,1800000);

SELECT _seed_inst(
  'accels-toshkent','American English Center (ACCELS)','Американский центр английского языка (ACCELS)',
  'LANGUAGE_CENTER','toshkent','+998712068500','https://americancouncils.uz',NULL,NULL,
  'Toshkent, Yunusobod tumani, Nukus ko''chasi 7',41.3370,69.2990,true,4.7,
  'ACCELS — Amerika Qo''shma Shtatlari hukumati tomonidan moliyalashtiriladigan rasmiy Amerika madaniy markazi. FLEX va UGRAD dasturlari, AQSHga o''qishga ketish.',
  'ACCELS — официальный американский культурный центр, финансируемый правительством США. Программы FLEX и UGRAD.',
  1993,1000,40,ARRAY['en','uz','ru'],
  ARRAY['American English','TOEFL tayyorgarlik','FLEX dasturi','UGRAD dasturi'],
  ARRAY['Amerika universitetlariga tayyorlov','FLEX stipendiyasi'],400000,1200000);

SELECT _seed_inst(
  'goethe-institut-toshkent','Goethe-Institut Toshkent','Институт Гёте в Ташкенте',
  'LANGUAGE_CENTER','toshkent','+998712524850','https://goethe.de/uz',NULL,NULL,
  'Toshkent, Yunusobod tumani, Buyuk Turon ko''chasi 41',41.3412,69.3045,true,4.8,
  'Goethe-Institut — Germaniyaning rasmiy til va madaniyat instituti. Nemis tili kurslari, Goethe sertifikatlari, Germaniyaga o''qishga borish haqida maslahat.',
  'Институт Гёте — официальный германский языковой и культурный институт. Курсы немецкого языка, сертификаты Гёте.',
  1995,800,25,ARRAY['de','uz','ru'],
  ARRAY['A1-C2 Nemis tili','Goethe-Zertifikat A1','Goethe-Zertifikat B2','Goethe-Zertifikat C1','TestDaF'],
  ARRAY['Nemis tili rasmiy sertifikatlari','Germaniyaga o''qishga borish'],600000,1500000);

SELECT _seed_inst(
  'institut-francais-toshkent','Institut Français Toshkent','Французский институт в Ташкенте',
  'LANGUAGE_CENTER','toshkent','+998712369240','https://institutfrancais.uz',NULL,NULL,
  'Toshkent, Mirzo Ulug''bek tumani, Puskin ko''chasi 8',41.3490,69.3010,true,4.7,
  'Institut Français — Fransiyaning rasmiy til va madaniyat instituti. Fransuz tili kurslari, DELF/DALF sertifikatlari.',
  'Французский институт — официальный французский языковой и культурный институт. DELF/DALF сертификаты.',
  2001,600,20,ARRAY['fr','uz','ru'],
  ARRAY['A1-C2 Fransuz tili','DELF A1-B2','DALF C1-C2','Fransiya universitetlariga tayyorlov'],
  ARRAY['DELF/DALF sertifikatlari','Fransiyaga o''qishga borish'],550000,1400000);

SELECT _seed_inst(
  'korea-cultural-center-toshkent','Korea Cultural Center (KOICA)','Корейский культурный центр (KOICA)',
  'LANGUAGE_CENTER','toshkent','+998712527600','https://koica.uz',NULL,NULL,
  'Toshkent, Mirzo Ulug''bek tumani, Abdulla Qodiriy ko''chasi 17',41.3480,69.3025,true,4.6,
  'Koreya Madaniyat Markazi — Janubiy Koreya hukumati tomonidan tashkil etilgan. Koreys tili kurslari, TOPIK imtihoni, Koreyaga o''qishga ketish dasturlari.',
  'Корейский культурный центр — основан правительством Южной Кореи. Курсы корейского языка, экзамен TOPIK.',
  2008,500,15,ARRAY['ko','uz','ru'],
  ARRAY['Koreys tili TOPIK I','Koreys tili TOPIK II','Koreys madaniyati','K-pop va K-drama klubi'],
  ARRAY['TOPIK sertifikati','Koreyaga o''qishga borish'],350000,800000);

SELECT _seed_inst(
  'confucius-institute-toshkent','Confucius Institute Toshkent','Институт Конфуция в Ташкенте',
  'LANGUAGE_CENTER','toshkent','+998712779900','https://confucius.uz',NULL,NULL,
  'Toshkent, Olmazor tumani, NUUz kampusi',41.3440,69.2895,true,4.5,
  'Konfutsiy Instituti — Xitoyning rasmiy til va madaniyat instituti, NUUz kampusida. Xitoy tili kurslari, HSK imtihoni, stipendiyalar.',
  'Институт Конфуция — официальный китайский языковой и культурный институт в кампусе НУУз.',
  2009,400,12,ARRAY['zh','uz','ru'],
  ARRAY['Xitoy tili HSK 1-6','Xitoy madaniyati','Kalligrafit','Tai Chi'],
  ARRAY['HSK sertifikati','Xitoyga o''qishga borish'],300000,700000);

SELECT _seed_inst(
  'global-english-toshkent','Global English Language Center','Global English Language Center',
  'LANGUAGE_CENTER','toshkent','+998901234560','https://globalenglish.uz','globalenglish_uz','globalenglish.uz',
  'Toshkent, Yunusobod tumani, Qoratosh ko''chasi 12',41.3390,69.3050,true,4.6,
  'Global English — IELTS va ingliz tili ta''limida ixtisoslashgan markaz. Native speaker o''qituvchilar, zamonaviy metodologiya, 7.0+ IELTS ball kafolati.',
  'Global English — центр, специализирующийся на IELTS. Носители языка, современная методология. Гарантия 7.0+.',
  2015,1200,50,ARRAY['en','uz','ru'],
  ARRAY['IELTS Academic','IELTS General','General English','Business English','TOEFL','SAT'],
  ARRAY['IELTS 6.5+ kafolati','Native speaker'],600000,1600000);

SELECT _seed_inst(
  'englishtime-toshkent','EnglishTime Language School','EnglishTime Language School',
  'LANGUAGE_CENTER','toshkent','+998935557777',NULL,'englishtime_uz','englishtime.uz',
  'Toshkent, Mirzo Ulug''bek tumani, Oliy Majlis ko''chasi 4',41.3510,69.2980,false,4.4,
  'EnglishTime — kommunikativ usulda ingliz tili o''rgatadigang markaz. Kichik guruhlar, zamonaviy darsliklar, speaking klublari.',
  'EnglishTime — центр обучения английскому языку коммуникативным методом. Маленькие группы, разговорные клубы.',
  2017,700,28,ARRAY['en','uz','ru'],
  ARRAY['Starter to Advanced','IELTS tayyorgarlik','Kids English (6-12 yosh)','Conversation Club'],
  ARRAY[]::TEXT[],400000,900000);

SELECT _seed_inst(
  'british-link-toshkent','British Link Language Center','Брит Линк Языковой Центр',
  'LANGUAGE_CENTER','toshkent','+998712009888','https://britishlink.uz','britishlink_uz','britishlink.uz',
  'Toshkent, Yunusobod tumani, 12-mavze, 5A',41.3370,69.3075,true,4.7,
  'British Link — britaniyalik o''qituvchilar bilan ingliz tili o''rgatadigan markaz. IELTS, Business English, Academic English.',
  'British Link — центр обучения английскому языку с британскими преподавателями. IELTS, Business English.',
  2013,1000,40,ARRAY['en','uz','ru'],
  ARRAY['General English','Business English','IELTS 7.0+','Academic English','Professional Development'],
  ARRAY['Native British speakers','IELTS 7.0+ kafolati'],700000,2000000);

SELECT _seed_inst(
  'speakup-toshkent','SpeakUp Language Center','SpeakUp Language Center',
  'LANGUAGE_CENTER','toshkent','+998905551234',NULL,'speakup_uz','speakup.tashkent',
  'Toshkent, Chilonzor tumani, 9-mavze, 3-uy',41.2790,69.2110,false,4.4,
  'SpeakUp — zamonaviy kommunikativ usulda ingliz tili o''rgatuvchi markaz. Kichik guruhlar, speaking klublari, intensiv kurslar.',
  'SpeakUp — центр обучения английскому языку современным коммуникативным методом.',
  2018,500,20,ARRAY['en','uz'],
  ARRAY['Beginner to Advanced English','IELTS tayyorgarlik','Kids English','Speaking Club'],
  ARRAY[]::TEXT[],380000,800000);

SELECT _seed_inst(
  'japan-foundation-toshkent','Japan Foundation — O''zbek-Yapon Til Markazi','Японо-Узбекский языковой центр Japan Foundation',
  'LANGUAGE_CENTER','toshkent','+998712562300','https://jfuz.uz',NULL,NULL,
  'Toshkent, Mirzo Ulug''bek tumani, Abdulla Qodiriy ko''chasi 22',41.3490,69.3035,true,4.6,
  'Japan Foundation — Yaponiyaning rasmiy til va madaniyat instituti. Yapon tili kurslari, JLPT imtihoni, Yaponiyaga o''qishga borish.',
  'Японо-узбекский языковой центр Japan Foundation — официальный японский языковой и культурный институт.',
  2003,300,10,ARRAY['ja','uz','ru'],
  ARRAY['Yapon tili N5-N1','JLPT tayyorgarlik','Yapon madaniyati'],
  ARRAY['JLPT sertifikati','Yaponiyaga o''qishga borish'],400000,900000);

-- TIL MARKAZLARI — VILOYATLAR
SELECT _seed_inst(
  'ilc-samarqand','ILC — Samarqand filiali','ILC — Самаркандский филиал',
  'LANGUAGE_CENTER','samarqand','+998662356060','https://ilc.uz',NULL,NULL,
  'Samarqand, Universitetski xiyoboni 7',39.6580,66.9700,true,4.5,
  'ILC Samarqand — O''zbekistondagi eng nufuzli til markazi filiali. Ingliz tili, IELTS, nemis, fransuz tillari.',
  'ILC Самарканд — филиал самого известного языкового центра Узбекистана.',
  2010,800,30,ARRAY['uz','ru','en'],
  ARRAY['General English','IELTS','Nemis tili','Fransuz tili','Koreys tili'],
  ARRAY[]::TEXT[],450000,1400000);

SELECT _seed_inst(
  'ilc-namangan','ILC — Namangan filiali','ILC — Наманганский филиал',
  'LANGUAGE_CENTER','namangan','+998692271212','https://ilc.uz',NULL,NULL,
  'Namangan, Uychi ko''chasi 45',40.9985,71.6480,true,4.5,
  'ILC Namangan — O''zbekistondagi eng nufuzli til markazi filiali. Ingliz tili, IELTS tayyorgarlik.',
  'ILC Наманган — филиал самого известного языкового центра Узбекистана.',
  2012,700,25,ARRAY['uz','ru','en'],
  ARRAY['General English','IELTS','Nemis tili','Koreys tili'],
  ARRAY[]::TEXT[],440000,1300000);

SELECT _seed_inst(
  'ilc-andijon','ILC — Andijon filiali','ILC — Андижанский филиал',
  'LANGUAGE_CENTER','andijon','+998742241212','https://ilc.uz',NULL,NULL,
  'Andijon, Navoi ko''chasi 25',40.7870,72.3510,true,4.4,
  'ILC Andijon — O''zbekistondagi eng nufuzli til markazi filiali. Ingliz tili, IELTS tayyorgarlik.',
  'ILC Андижан — филиал самого известного языкового центра Узбекистана.',
  2014,650,22,ARRAY['uz','ru','en'],
  ARRAY['General English','IELTS','Nemis tili'],
  ARRAY[]::TEXT[],430000,1200000);

SELECT _seed_inst(
  'ilc-buxoro','ILC — Buxoro filiali','ILC — Бухарский филиал',
  'LANGUAGE_CENTER','buxoro','+998652221212','https://ilc.uz',NULL,NULL,
  'Buxoro, Mustakillik ko''chasi 12',39.7700,64.4510,true,4.4,
  'ILC Buxoro — O''zbekistondagi eng nufuzli til markazi filiali. Ingliz tili, IELTS.',
  'ILC Бухара — филиал самого известного языкового центра Узбекистана.',
  2015,600,20,ARRAY['uz','ru','en'],
  ARRAY['General English','IELTS','Koreys tili'],
  ARRAY[]::TEXT[],430000,1200000);

SELECT _seed_inst(
  'konfutsiy-markazi-samarqand','Xitoy Tili va Madaniyati Markazi — Samarqand','Центр китайского языка и культуры — Самарканд',
  'LANGUAGE_CENTER','samarqand','+998662351234',NULL,NULL,NULL,
  'Samarqand, SamDU kampusi, 3-bino',39.6575,66.9748,false,4.3,
  'Xitoy Tili Markazi — SamDU huzuridagi Konfutsiy Instituti filiali. Xitoy tili kurslari, HSK imtihoni.',
  'Центр китайского языка — филиал Института Конфуция при СамГУ. Курсы китайского языка, экзамен HSK.',
  2012,200,8,ARRAY['zh','uz','ru'],
  ARRAY['Xitoy tili HSK 1-4','Xitoy biznesi asoslari','Xitoy madaniyati'],
  ARRAY[]::TEXT[],280000,650000);

-- ================================================================
-- IT MAKTABLAR (IT_SCHOOL) — TOSHKENT
-- ================================================================
SELECT _seed_inst(
  'najot-talim-toshkent','Najot Ta''lim — Toshkent (Asosiy)','Najot Ta''lim — Ташкент (Главный)',
  'IT_SCHOOL','toshkent','+998781234567','https://najottalim.uz','najottalim','najottalim',
  'Toshkent, Yunusobod tumani, 19-mavze, 3-uy',41.3395,69.2880,true,4.6,
  'Najot Ta''lim — O''zbekistondagi eng yirik IT ta''lim markazi. 20+ shahar, 50,000+ bitiruvchi. Python, Java, Flutter, iOS, Android, UI/UX, QA.',
  'Najot Ta''lim — крупнейший IT-учебный центр Узбекистана. 20+ городов, 50,000+ выпускников.',
  2016,8000,200,ARRAY['uz','ru'],
  ARRAY['Python','Java','Flutter','iOS (Swift)','Android (Kotlin)','Frontend (React)','Backend (Node.js)','UI/UX Design','QA Testing'],
  ARRAY['Keng ko''lamli IT ta''lim','Viloyatlarda filiallar'],700000,1800000);

SELECT _seed_inst(
  'pdp-academy-toshkent','PDP Academy — Toshkent (Asosiy)','PDP Academy — Ташкент (Главный)',
  'IT_SCHOOL','toshkent','+998781400400','https://pdp.uz','pdpacademy','pdp.academy',
  'Toshkent, Yunusobod tumani, Qoratosh ko''chasi 28',41.3380,69.3060,true,4.7,
  'PDP Academy — O''zbekistondagi yetakchi IT ta''lim markazlaridan biri. Java, Python, Flutter, Frontend. Karyeraga yo''naltirish. 2000+ bitiruvchi.',
  'PDP Academy — один из ведущих IT-учебных центров Узбекистана. Сервис по трудоустройству. 2000+ выпускников.',
  2016,2500,100,ARRAY['uz','ru'],
  ARRAY['Java (Spring Boot)','Python (Django/DRF)','Flutter','React (Frontend)','Node.js','DevOps','QA Testing'],
  ARRAY['Backend muhandisligi','Mobile dasturlash'],800000,2000000);

SELECT _seed_inst(
  'astrum-it-toshkent','Astrum IT Academy — Toshkent','Astrum IT Academy — Ташкент',
  'IT_SCHOOL','toshkent','+998781000111','https://astrumuz.com','astrum_academy','astrum.uz',
  'Toshkent, Mirzo Ulug''bek tumani, Mirzo Ulug''bek ko''chasi 86',41.3535,69.2978,true,4.5,
  'Astrum IT Academy — O''zbekistondagi mashhur IT ta''lim markazlaridan biri. Python, Flutter, Full Stack, UI/UX, Grafik Dizayn.',
  'Astrum IT Academy — один из самых известных IT-учебных центров Узбекистана.',
  2017,3000,90,ARRAY['uz','ru'],
  ARRAY['Python','Flutter','Full Stack Web','UI/UX Design','Grafik Dizayn','3D Modeling','Video Editing'],
  ARRAY[]::TEXT[],700000,1700000);

SELECT _seed_inst(
  'it-park-talim-toshkent','IT Park Ta''lim Markazi — Toshkent','IT Park Учебный Центр — Ташкент',
  'IT_SCHOOL','toshkent','+998712009001','https://it-park.uz','itpark_edu','itpark.uz',
  'Toshkent, Mirzo Ulug''bek tumani, Mirzo Ulug''bek ko''chasi 95',41.3540,69.2985,true,4.7,
  'IT Park Ta''lim Markazi — O''zbekiston IT Park tomonidan tashkil etilgan rasmiy markaz. AI, Blockchain, Data Science, Cybersecurity kurslari.',
  'IT Park — официальный образовательный центр IT Park Uzbekistan. AI, Blockchain, Data Science, Cybersecurity.',
  2019,2000,80,ARRAY['uz','ru','en'],
  ARRAY['AI & Machine Learning','Data Science','Cybersecurity','Blockchain','Cloud Computing','DevOps','Python','Java'],
  ARRAY['Ilg''or texnologiyalar'],1000000,3000000);

SELECT _seed_inst(
  'step-it-academy-toshkent','Step IT Academy Toshkent','Step IT Academy Ташкент',
  'IT_SCHOOL','toshkent','+998712312312','https://itstep.uz','itstep_tashkent','itstep.uz',
  'Toshkent, Yunusobod tumani, Amir Temur ko''chasi 56',41.3357,69.2970,true,4.5,
  'Step IT Academy — xalqaro IT ta''lim tarmog''ining Toshkent filiali. 25+ yillik xalqaro tajriba. C++, Java, .NET, Web, Mobile.',
  'Step IT Academy — ташкентский филиал международной сети IT-образования. 25+ лет опыта.',
  2007,1200,50,ARRAY['uz','ru'],
  ARRAY['C/C++','Java','.NET','Web Development','Mobile','Grafik Dizayn','GameDev'],
  ARRAY[]::TEXT[],750000,1800000);

SELECT _seed_inst(
  'governa-toshkent','Governa School of IT','Governa School of IT',
  'IT_SCHOOL','toshkent','+998711234900','https://governa.uz','governa_uz','governa.uz',
  'Toshkent, Yunusobod tumani, Amir Temur xiyoboni 1A',41.3355,69.2950,true,4.6,
  'Governa — professional dasturlash va raqamli kasb maktabi. Java, Python, Mobile, Full Stack. Karyeraga yo''naltirish xizmati.',
  'Governa — школа профессионального программирования и цифровых профессий. Сервис по трудоустройству.',
  2019,800,35,ARRAY['uz','ru'],
  ARRAY['Java','Python','iOS (Swift)','Android (Kotlin)','Full Stack','QA Testing','DevOps'],
  ARRAY[]::TEXT[],850000,1700000);

SELECT _seed_inst(
  'ucode-toshkent','Ucode IT School','Ucode IT School',
  'IT_SCHOOL','toshkent','+998781234560','https://ucode.uz','ucode_uz','ucode.uz',
  'Toshkent, Yunusobod tumani, 14-mavze',41.3412,69.2988,true,4.4,
  'Ucode — Hamkorbank tomonidan tashkil etilgan IT ta''lim markazi. Python, JavaScript, Flutter. Arzonroq narxlar va to''lovni kechiktirish.',
  'Ucode — IT-учебный центр, основанный Хамкорбанком. Python, JavaScript, Flutter. Доступные цены.',
  2020,1000,40,ARRAY['uz','ru'],
  ARRAY['Python','JavaScript','Flutter','Java','Grafik Dizayn'],
  ARRAY[]::TEXT[],500000,1000000);

SELECT _seed_inst(
  'mohirdev-toshkent','Mohirdev IT Academy','Mohirdev IT Academy',
  'IT_SCHOOL','toshkent','+998930001122','https://mohirdev.uz','mohirdev','mohirdev.uz',
  'Toshkent, Mirzo Ulug''bek tumani, Meros ko''chasi 10',41.3525,69.2990,true,4.6,
  'Mohirdev — onlayn va oflayn formatdagi IT ta''lim platformasi. 50+ kurs, 100,000+ o''quvchi. Python, Django, JavaScript, React, Flutter.',
  'Mohirdev — платформа IT-образования в онлайн и офлайн форматах. 50+ курсов, 100,000+ учащихся.',
  2020,5000,30,ARRAY['uz'],
  ARRAY['Python & Django','JavaScript & React','Flutter & Dart','PHP & Laravel','Node.js','SQL & PostgreSQL'],
  ARRAY[]::TEXT[],200000,800000);

SELECT _seed_inst(
  'zero-to-one-toshkent','Zero To One IT School','Zero To One IT School',
  'IT_SCHOOL','toshkent','+998990110011','https://zerotoone.uz','zerotoone_uz','zerotoone.uz',
  'Toshkent, Mirzo Ulug''bek tumani, Meros ko''chasi 5',41.3521,69.3003,true,4.5,
  'Zero To One — intensiv bootcamp formatida IT ta''lim. 6 oyda ishga joylashish kafolati. Python, JavaScript, Flutter yo''nalishlari.',
  'Zero To One — IT-образование в формате интенсивного буткемпа. Гарантия трудоустройства за 6 месяцев.',
  2020,500,20,ARRAY['uz','ru'],
  ARRAY['Python Backend','JavaScript Full Stack','Flutter Mobile','Data Science'],
  ARRAY['Ishga joylashish kafolati'],900000,1800000);

SELECT _seed_inst(
  'evolution-it-toshkent','Evolution IT Academy','Evolution IT Academy',
  'IT_SCHOOL','toshkent','+998950220022',NULL,'evolution_it','evolution_it_uz',
  'Toshkent, Shayxontohur tumani, Toshkent ko''chasi 42',41.3200,69.2600,false,4.4,
  'Evolution IT Academy — intensiv bootcamp formatida professional dasturchilar tayyorlaydigan markaz. Python, Java, iOS, Android.',
  'Evolution IT Academy — центр подготовки профессиональных разработчиков в формате буткемпа.',
  2019,700,28,ARRAY['uz','ru'],
  ARRAY['Python Backend','Java Backend','iOS (Swift)','Android (Kotlin)','React Frontend'],
  ARRAY[]::TEXT[],900000,2000000);

SELECT _seed_inst(
  'digital-league-toshkent','Digital League IT Academy','Digital League IT Academy',
  'IT_SCHOOL','toshkent','+998951234567','https://digitalleague.uz','digitalleague_uz','digitalleague.uz',
  'Toshkent, Shayxontohur tumani, Navoiy ko''chasi 22',41.3180,69.2520,false,4.2,
  'Digital League — IT va raqamli marketing yo''nalishlarida ta''lim beruvchi markaz. Python, Web, SMM, Grafik Dizayn kurslari.',
  'Digital League — центр обучения по IT и цифровому маркетингу.',
  2018,600,25,ARRAY['uz','ru'],
  ARRAY['Python','Web Development','SMM & Content','Grafik Dizayn','1C Buxgalteriya'],
  ARRAY[]::TEXT[],450000,900000);

-- IT MAKTABLAR — VILOYATLAR
SELECT _seed_inst(
  'najot-talim-samarqand','Najot Ta''lim — Samarqand filiali','Najot Ta''lim — Самаркандский филиал',
  'IT_SCHOOL','samarqand','+998662358070','https://najottalim.uz','najottalim_samarqand','najottalim_samarqand',
  'Samarqand, Registon ko''chasi 15',39.6590,66.9650,true,4.6,
  'Najot Ta''lim Samarqand filiali — O''zbekistondagi eng yirik IT ta''lim markazining Samarqand shahridagi bo''limi.',
  'Филиал Najot Ta''lim в Самарканде — отделение крупнейшего IT-учебного центра Узбекистана.',
  2020,600,25,ARRAY['uz','ru'],
  ARRAY['Python','Java','Flutter','Frontend (React)','Backend (Node.js)','Android'],
  ARRAY[]::TEXT[],700000,1500000);

SELECT _seed_inst(
  'pdp-academy-samarqand','PDP Academy — Samarqand filiali','PDP Academy — Самаркандский филиал',
  'IT_SCHOOL','samarqand','+998662358044','https://pdp.uz','pdpacademy_samarqand',NULL,
  'Samarqand, Registon ko''chasi 10',39.6595,66.9645,true,4.5,
  'PDP Academy Samarqand filiali — O''zbekistondagi yetakchi IT ta''lim markazining Samarqand shahridagi bo''limi.',
  'Филиал PDP Academy в Самарканде.',
  2021,520,21,ARRAY['uz','ru'],
  ARRAY['Java','Python','Flutter','Frontend','Backend'],
  ARRAY[]::TEXT[],750000,1600000);

SELECT _seed_inst(
  'astrum-it-samarqand','Astrum IT Academy — Samarqand','Astrum IT Academy — Самарканд',
  'IT_SCHOOL','samarqand','+998662358090','https://astrumuz.com','astrum_samarqand',NULL,
  'Samarqand, Mirzo Ulug''bek ko''chasi 7',39.6650,66.9580,false,4.4,
  'Astrum IT Academy Samarqand — zamonaviy IT kurslar markazi. Python, Flutter, Full Stack Web.',
  'Astrum IT Academy Самарканд — современный центр IT-курсов.',
  2021,350,15,ARRAY['uz','ru'],
  ARRAY['Python','Flutter','Full Stack Web','UI/UX Design'],
  ARRAY[]::TEXT[],650000,1300000);

SELECT _seed_inst(
  'pdp-academy-namangan','PDP Academy — Namangan filiali','PDP Academy — Наманганский филиал',
  'IT_SCHOOL','namangan','+998692260444','https://pdp.uz','pdpacademy_namangan',NULL,
  'Namangan, Buyuk ipak yo''li ko''chasi 47',40.9995,71.6680,true,4.5,
  'PDP Academy Namangan filiali — O''zbekistondagi yetakchi IT ta''lim markazining Namangan shahridagi bo''limi.',
  'Филиал PDP Academy в Намангане.',
  2021,500,20,ARRAY['uz','ru'],
  ARRAY['Java','Python','Flutter','Frontend','Backend'],
  ARRAY[]::TEXT[],750000,1600000);

SELECT _seed_inst(
  'astrum-it-namangan','Astrum IT Academy — Namangan','Astrum IT Academy — Наманган',
  'IT_SCHOOL','namangan','+998692271010','https://astrumuz.com','astrum_namangan',NULL,
  'Namangan, Buyuk ipak yo''li ko''chasi 32',40.9990,71.6660,false,4.3,
  'Astrum IT Academy Namangan — Namangandagi IT kurslar markazi. Python, Flutter, Web.',
  'Astrum IT Academy Наманган — центр IT-курсов в Намангане.',
  2022,330,13,ARRAY['uz'],
  ARRAY['Python','Flutter','Full Stack Web','Grafik Dizayn'],
  ARRAY[]::TEXT[],650000,1300000);

SELECT _seed_inst(
  'najot-talim-andijon','Najot Ta''lim — Andijon filiali','Najot Ta''lim — Андижанский филиал',
  'IT_SCHOOL','andijon','+998742252070','https://najottalim.uz','najottalim_andijon',NULL,
  'Andijon, Ipak yo''li ko''chasi 22',40.7850,72.3460,true,4.5,
  'Najot Ta''lim Andijon filiali — Andijon shahridagi IT ta''lim markazi.',
  'Филиал Najot Ta''lim в Андижане.',
  2021,450,18,ARRAY['uz'],
  ARRAY['Python','Java','Flutter','Frontend'],
  ARRAY[]::TEXT[],700000,1400000);

SELECT _seed_inst(
  'najot-talim-fargona','Najot Ta''lim — Farg''ona filiali','Najot Ta''lim — Ферганский филиал',
  'IT_SCHOOL','farghona','+998732252070','https://najottalim.uz','najottalim_fargona',NULL,
  'Farg''ona, Mustaqillik ko''chasi 18',40.3880,71.7840,true,4.4,
  'Najot Ta''lim Farg''ona filiali — Farg''ona shahridagi IT ta''lim markazi.',
  'Филиал Najot Ta''lim в Фергане.',
  2021,420,16,ARRAY['uz'],
  ARRAY['Python','Java','Flutter','Frontend'],
  ARRAY[]::TEXT[],700000,1400000);

SELECT _seed_inst(
  'it-park-fargona','Farg''ona IT Park Ta''lim Markazi','IT Park Фергана Учебный Центр',
  'IT_SCHOOL','farghona','+998732258090','https://it-park.uz','itpark_fargona',NULL,
  'Farg''ona, Mustaqillik ko''chasi 24',40.3900,71.7870,true,4.4,
  'Farg''ona IT Park — IT Park Uzbekistan ning Farg''onadagi ta''lim markazi. Dasturlash, dizayn va startap kurslar.',
  'IT Park Фергана — учебный центр IT Park Uzbekistan в Фергане.',
  2022,300,12,ARRAY['uz','ru'],
  ARRAY['Python','JavaScript','Grafik Dizayn','UI/UX','Startap asoslari'],
  ARRAY[]::TEXT[],550000,1100000);

SELECT _seed_inst(
  'fargona-smart-it','Farg''ona Smart IT','Фергана Smart IT',
  'IT_SCHOOL','farghona','+998732251515',NULL,'smart_it_fargona',NULL,
  'Farg''ona, Al-Farg''oniy ko''chasi 15',40.3905,71.7855,false,4.1,
  'Farg''ona Smart IT — Farg''onadagi zamonaviy IT kurslar markazi.',
  'Фергана Smart IT — современный центр IT-курсов в Фергане.',
  2022,220,8,ARRAY['uz'],
  ARRAY['Python','Java','Flutter','Frontend (React)','UI/UX'],
  ARRAY[]::TEXT[],550000,1100000);

SELECT _seed_inst(
  'namangan-it-hub','Namangan IT Hub','Namangan IT Hub',
  'IT_SCHOOL','namangan','+998692279090',NULL,'namangan_it_hub','namangan.it.hub',
  'Namangan, Lutfobod ko''chasi 8',41.0020,71.6600,false,4.3,
  'Namangan IT Hub — Namangandagi IT ta''lim va startap ekosistema markazi.',
  'Namangan IT Hub — центр IT-образования и стартап-экосистемы в Намангане.',
  2021,280,10,ARRAY['uz'],
  ARRAY['Python','Web Development','Mobile (Flutter)','UI/UX Design'],
  ARRAY[]::TEXT[],500000,1000000);

SELECT _seed_inst(
  'najot-talim-buxoro','Najot Ta''lim — Buxoro filiali','Najot Ta''lim — Бухарский филиал',
  'IT_SCHOOL','buxoro','+998652252070','https://najottalim.uz','najottalim_buxoro',NULL,
  'Buxoro, M. Iqbol ko''chasi 8',39.7670,64.4480,true,4.4,
  'Najot Ta''lim Buxoro filiali — Buxoro shahridagi IT ta''lim markazi.',
  'Филиал Najot Ta''lim в Бухаре.',
  2022,380,14,ARRAY['uz'],
  ARRAY['Python','Java','Flutter','Frontend'],
  ARRAY[]::TEXT[],700000,1400000);

SELECT _seed_inst(
  'it-hub-buxoro','IT Hub Buxoro','IT Hub Бухара',
  'IT_SCHOOL','buxoro','+998652250101',NULL,'ithub_buxoro','ithub.buxoro',
  'Buxoro, Navoiy ko''chasi 3',39.7660,64.4465,false,4.2,
  'IT Hub Buxoro — Buxorodagi zamonaviy IT ta''lim markazi. Python, JavaScript, Flutter yo''nalishlari.',
  'IT Hub Бухара — современный IT-учебный центр в Бухаре.',
  2022,260,10,ARRAY['uz','ru'],
  ARRAY['Python','JavaScript','Flutter','UI/UX Design'],
  ARRAY[]::TEXT[],550000,1100000);

SELECT _seed_inst(
  'qarshi-it-academy','Qarshi IT Academy','Карши IT Academy',
  'IT_SCHOOL','qarshi','+998752242020',NULL,'qarshi_it',NULL,
  'Qarshi, Mustakillik ko''chasi 8',38.8610,65.7890,false,4.2,
  'Qarshi IT Academy — Qashqadaryo viloyatidagi IT ta''lim markazi. Dasturlash va raqamli kasb kurslari.',
  'Карши IT Academy — IT-учебный центр в Кашкадарьинской области.',
  2021,250,9,ARRAY['uz'],
  ARRAY['Python','Web Development','Grafik Dizayn','SMM'],
  ARRAY[]::TEXT[],500000,1000000);

-- ================================================================
-- KURS MARKAZLARI (COURSE_CENTER)
-- ================================================================
SELECT _seed_inst(
  'ielts-plus-toshkent','IELTS+ Academy Toshkent','IELTS+ Academy Ташкент',
  'COURSE_CENTER','toshkent','+998901122334','https://ieltsplus.uz','ieltsplus_uz','ieltsplus.uz',
  'Toshkent, Yunusobod tumani, 19-mavze, 5-uy',41.3380,69.2870,true,4.7,
  'IELTS+ Academy — IELTS va xalqaro sertifikatlarga ixtisoslashgan markaz. 7.0+ ball kafolati. Tajribali o''qituvchilar, kichik guruhlar.',
  'IELTS+ Academy — центр, специализирующийся на IELTS. Гарантия 7.0+.',
  2016,900,35,ARRAY['en','uz','ru'],
  ARRAY['IELTS Academic (7.0+)','IELTS General Training','TOEFL iBT','SAT/ACT','Cambridge IELTS (6.5+)'],
  ARRAY['IELTS 7.0+ kafolati','Top universitetlarga tayyorlov'],700000,2000000);

SELECT _seed_inst(
  'sat-prep-toshkent','SAT Prep Center Toshkent','SAT Prep Center Ташкент',
  'COURSE_CENTER','toshkent','+998935556677',NULL,'satprep_uz','satprep.uz',
  'Toshkent, Mirzo Ulug''bek tumani, Mirzo Ulug''bek ko''chasi 72',41.3520,69.2970,false,4.6,
  'SAT Prep Center — SAT/ACT va xorijiy universitetlarga hujjat topshirish bo''yicha ixtisoslashgan markaz. 1400+ SAT ball kafolati.',
  'SAT Prep Center — специализированный центр по подготовке к SAT/ACT и поступлению в иностранные университеты.',
  2018,400,18,ARRAY['en','uz','ru'],
  ARRAY['SAT Math','SAT English','ACT Prep','Common App hujjatlari','IELTS/TOEFL','Essay yozish'],
  ARRAY['SAT 1400+ kafolati','Xorijiy universitetlarga qabul'],800000,2500000);

SELECT _seed_inst(
  'gre-gmat-toshkent','GRE & GMAT Prep Center Toshkent','GRE & GMAT Prep Center Ташкент',
  'COURSE_CENTER','toshkent','+998901234589',NULL,'gre_gmat_uz','gre.gmat.uz',
  'Toshkent, Mirzo Ulug''bek tumani, Yangi hayot ko''chasi 10',41.3505,69.3005,false,4.6,
  'GRE & GMAT Prep Center — magistratura va MBA uchun GRE/GMAT imtihonlariga tayyorlash markazi. 320+ GRE va 700+ GMAT ball kafolati.',
  'GRE & GMAT Prep Center — центр подготовки к GRE/GMAT для магистратуры и MBA.',
  2017,300,12,ARRAY['en','uz','ru'],
  ARRAY['GRE Verbal Reasoning','GRE Quantitative','GMAT Quant','GMAT Verbal','Graduate Admissions Essay'],
  ARRAY['GRE 320+','GMAT 700+'],1000000,3000000);

SELECT _seed_inst(
  'toshkent-design-school','Toshkent Design School','Ташкент Дизайн Скул',
  'COURSE_CENTER','toshkent','+998950001234','https://tashkentdesign.uz','tashkent_design','tashkent.design.school',
  'Toshkent, Shayxontohur tumani, Navoiy ko''chasi 17',41.3160,69.2510,false,4.5,
  'Toshkent Design School — grafik dizayn, UI/UX, brending va raqamli san''at bo''yicha professional kurslar.',
  'Ташкент Дизайн Скул — центр профессиональных курсов по графическому дизайну, UI/UX, брендингу.',
  2016,600,25,ARRAY['uz','ru'],
  ARRAY['Grafik Dizayn','UI/UX Design','Motion Design','Brending','3D Modeling (Blender)','Video Montaj','Fotografiya'],
  ARRAY[]::TEXT[],500000,1500000);

SELECT _seed_inst(
  'raqamli-marketing-akademiyasi','Raqamli Marketing Akademiyasi','Академия Цифрового Маркетинга',
  'COURSE_CENTER','toshkent','+998990001111',NULL,'digmarketing_uz','digital.marketing.academy.uz',
  'Toshkent, Yunusobod tumani, Amir Temur ko''chasi 30',41.3345,69.2965,false,4.3,
  'Raqamli Marketing Akademiyasi — SMM, SEO, kontekstli reklama, e-commerce va content marketing bo''yicha kurslar.',
  'Академия Цифрового Маркетинга — курсы по SMM, SEO, контекстной рекламе, e-commerce.',
  2019,800,20,ARRAY['uz','ru'],
  ARRAY['SMM (Instagram, Telegram)','SEO','Google Ads & Facebook Ads','E-commerce','Content Marketing','Email Marketing'],
  ARRAY[]::TEXT[],400000,1200000);

-- ================================================================
-- MAKTABLAR (SCHOOL)
-- ================================================================
SELECT _seed_inst(
  'cambridge-school-toshkent','Cambridge School Toshkent','Кембриджская школа Ташкент',
  'SCHOOL','toshkent','+998712345891','https://cambridgeschool.uz','cambridge_school_uz','cambridge.school.uz',
  'Toshkent, Yunusobod tumani, 7-mavze',41.3390,69.3120,true,4.7,
  'Cambridge School — ingliz tilida ta''lim beradigan xususiy maktab. Cambridge IGCSE va A-Level dasturlari. Xorijiy universitetlarga qabul bo''yicha yuqori ko''rsatkich.',
  'Cambridge School — частная школа с обучением на английском языке. Программы Cambridge IGCSE и A-Level.',
  2010,700,65,ARRAY['en','uz','ru'],
  ARRAY['Cambridge IGCSE','Cambridge A-Level','Matematika (inglizcha)','Fizika','Kimyo','Biologiya','Ingliz adabiyoti'],
  ARRAY['Cambridge sertifikati','Xorijiy universitetlarga tayyorlov'],3000000,6000000);

SELECT _seed_inst(
  'horizon-international-school-toshkent','Horizon International School Toshkent','Хоризон Интернэшнл Скул Ташкент',
  'SCHOOL','toshkent','+998712561000','https://horizon.uz','horizon_school_uz','horizon.school.uz',
  'Toshkent, Mirzo Ulug''bek tumani, Bog''ishamol ko''chasi 5',41.3500,69.3020,true,4.8,
  'Horizon International School — xalqaro maktab. IB (International Baccalaureate) dasturi. 1-12 sinflar. Ko''p tilli ta''lim: ingliz, o''zbek, rus.',
  'Horizon International School — международная школа. Программа IB. 1-12 классы. Многоязычное образование.',
  2005,800,80,ARRAY['en','uz','ru'],
  ARRAY['IB Primary Years Programme','IB Middle Years Programme','IB Diploma Programme','Cambridge A-Level'],
  ARRAY['IB Diploma','Xalqaro universitetlarga qabul'],4000000,8000000);

SELECT _seed_inst(
  'iq-school-toshkent','IQ School Toshkent','IQ School Ташкент',
  'SCHOOL','toshkent','+998712391234','https://iqschool.uz','iqschool_uz','iqschool.uz',
  'Toshkent, Yunusobod tumani, 4-mavze, 2-uy',41.3365,69.3085,true,4.6,
  'IQ School — zamonaviy xususiy maktab. Chuqurlashtirilgan matematika va informatika dasturi. STEAM ta''lim. 1-11 sinflar.',
  'IQ School — современная частная школа. Углублённая программа по математике и информатике. STEAM.',
  2012,900,75,ARRAY['uz','en','ru'],
  ARRAY['Chuqurlashtirilgan matematika','Informatika','Robotexnika','Ingliz tili','Fizika','Kimyo'],
  ARRAY['Olimpiada tayyorgarlik','STEAM ta''lim'],2500000,5000000);

SELECT _seed_inst(
  'bilim-istedad-maktabi','Bilim va Iste''dod Maktabi','Школа Знания и Таланта',
  'SCHOOL','toshkent','+998712567890','https://bilimistedad.uz',NULL,'bilim_istedad',
  'Toshkent, Chilonzor tumani, 9-mavze, 12-uy',41.2780,69.2090,false,4.5,
  'Bilim va Iste''dod — zamonaviy o''quv dasturi asosida faoliyat yurituvchi xususiy maktab. 1-11 sinflar. STEAM ta''lim yo''nalishi.',
  'Школа Знания и Таланта — частная школа по современным учебным программам. STEAM-образование.',
  2015,600,55,ARRAY['uz','ru','en'],
  ARRAY['STEAM ta''lim','Matematika','Fizika','Robotexnika','Dasturlash asoslari','Musiqa'],
  ARRAY[]::TEXT[],1800000,3000000);

SELECT _seed_inst(
  'samarqand-excellence-school','Samarqand Excellence School','Samarkand Excellence School',
  'SCHOOL','samarqand','+998662358900',NULL,NULL,'excellence_school_samarkand',
  'Samarqand, Bog''ishamol ko''chasi 14',39.6600,66.9700,false,4.4,
  'Samarqand Excellence School — Samarqandda ingliz tilida ta''lim beradigan zamonaviy xususiy maktab. 1-11 sinflar.',
  'Samarkand Excellence School — современная частная школа с обучением на английском языке в Самарканде.',
  2017,400,40,ARRAY['uz','en','ru'],
  ARRAY['Ingliz tili (intensiv)','Matematika','Tabiiy fanlar','Informatika','Musiqa'],
  ARRAY[]::TEXT[],1500000,2800000);

SELECT _seed_inst(
  'namangan-modern-school','Namangan Modern School','Наманган Модерн Скул',
  'SCHOOL','namangan','+998692278900',NULL,NULL,'namangan_modern_school',
  'Namangan, Yangi Namangan ko''chasi 5',40.9960,71.6550,false,4.3,
  'Namangan Modern School — zamonaviy xususiy maktab. Chuqurlashtirilgan ingliz tili, matematika va informatika dasturlari.',
  'Наманган Модерн Скул — современная частная школа. Углублённые программы по английскому, математике и информатике.',
  2018,350,35,ARRAY['uz','en'],
  ARRAY['Ingliz tili','Matematika','Informatika','Fizika','Kimyo'],
  ARRAY[]::TEXT[],1200000,2200000);

SELECT _seed_inst(
  'andijon-smart-school','Andijon Smart School','Андижан Смарт Скул',
  'SCHOOL','andijon','+998742262323',NULL,NULL,'smart_school_andijon',
  'Andijon, Navoiy ko''chasi 55',40.7900,72.3540,false,4.3,
  'Andijon Smart School — Andijondagi zamonaviy xususiy maktab. Ingliz tili intensiv, STEAM ta''lim. 1-11 sinflar.',
  'Андижан Смарт Скул — современная частная школа в Андижане. STEAM-образование.',
  2019,320,32,ARRAY['uz','en'],
  ARRAY['Ingliz tili intensiv','Matematika','Informatika','Robotexnika','Fizika'],
  ARRAY[]::TEXT[],1200000,2500000);

SELECT _seed_inst(
  'buxoro-stars-academy','Buxoro Stars Academy','Бухара Старс Академи',
  'SCHOOL','buxoro','+998652234567',NULL,NULL,'stars_academy_buxoro',
  'Buxoro, Navoi ko''chasi 18',39.7710,64.4530,false,4.2,
  'Buxoro Stars Academy — Buxorodagi xususiy maktab. Ingliz tili, matematika, tabiiy fanlar bo''yicha chuqurlashtirilgan ta''lim.',
  'Бухара Старс Академи — частная школа в Бухаре. Углублённое обучение английскому языку и естественным наукам.',
  2017,280,28,ARRAY['uz','en','ru'],
  ARRAY['Ingliz tili','Matematika','Fizika','Kimyo','Biologiya','Informatika'],
  ARRAY[]::TEXT[],1000000,2000000);

-- ================================================================
-- LITSEYLAR (LYCEUM) — PREZIDENT MAKTABLARI
-- ================================================================
SELECT _seed_inst(
  'prezident-maktabi-toshkent','Toshkent Prezident Maktabi','Ташкентская президентская школа',
  'LYCEUM','toshkent','+998712312080','https://prezidentmaktabi.uz',NULL,NULL,
  'Toshkent, Chilonzor tumani, 19-mavze',41.2920,69.2150,true,4.9,
  'Toshkent Prezident Maktabi — poytaxtdagi iqtidorli o''quvchilar uchun davlat tomonidan moliyalashtiriladigan elit ta''lim muassasasi. 7-11 sinflar.',
  'Ташкентская Президентская школа — элитное учебное заведение в столице для одарённых учащихся. 7-11 классы.',
  2019,540,85,ARRAY['uz','en','ru'],
  ARRAY['Chuqurlashtirilgan matematika','Fizika','Kimyo','Biologiya','Informatika','Ingliz tili'],
  ARRAY['Olimpiada tayyorgarlik','Xalqaro sertifikatlar'],NULL,NULL);

SELECT _seed_inst(
  'prezident-maktabi-samarqand','Samarqand Prezident Maktabi','Самаркандская президентская школа',
  'LYCEUM','samarqand','+998662358080','https://prezidentmaktabi.uz',NULL,NULL,
  'Samarqand, Registon ko''chasi 2',39.6630,66.9520,true,4.9,
  'Samarqand Prezident Maktabi — iqtidorli o''quvchilar uchun davlat tomonidan moliyalashtiriladigan elit ta''lim muassasasi. 7-11 sinflar. Olimpiada tayyorgarlik.',
  'Самаркандская Президентская школа — элитное учебное заведение для одарённых учащихся. 7-11 классы.',
  2019,500,80,ARRAY['uz','en','ru'],
  ARRAY['Chuqurlashtirilgan matematika','Fizika','Kimyo','Biologiya','Informatika','Ingliz tili'],
  ARRAY['Olimpiada tayyorgarlik','Xalqaro sertifikatlar'],NULL,NULL);

SELECT _seed_inst(
  'prezident-maktabi-namangan','Namangan Prezident Maktabi','Наманганская президентская школа',
  'LYCEUM','namangan','+998692272080','https://prezidentmaktabi.uz',NULL,NULL,
  'Namangan, Mustakillik ko''chasi 1',41.0045,71.6600,true,4.9,
  'Namangan Prezident Maktabi — iqtidorli o''quvchilar uchun davlat tomonidan moliyalashtiriladigan elit ta''lim muassasasi.',
  'Наманганская Президентская школа — элитное учебное заведение для одарённых учащихся.',
  2019,480,75,ARRAY['uz','en'],
  ARRAY['Matematika','Fizika','Kimyo','Biologiya','Informatika','Ingliz tili'],
  ARRAY['Olimpiada tayyorgarlik'],NULL,NULL);

SELECT _seed_inst(
  'prezident-maktabi-andijon','Andijon Prezident Maktabi','Андижанская президентская школа',
  'LYCEUM','andijon','+998742252080','https://prezidentmaktabi.uz',NULL,NULL,
  'Andijon, Navoi ko''chasi 15',40.7900,72.3500,true,4.8,
  'Andijon Prezident Maktabi — iqtidorli o''quvchilar uchun maxsus ta''lim markazi.',
  'Андижанская Президентская школа — специализированный образовательный центр для одарённых учащихся.',
  2019,460,72,ARRAY['uz','en'],
  ARRAY['Matematika','Fizika','Kimyo','Biologiya','Informatika','Ingliz tili'],
  ARRAY['Olimpiada tayyorgarlik'],NULL,NULL);

SELECT _seed_inst(
  'prezident-maktabi-fargona','Farg''ona Prezident Maktabi','Ферганская президентская школа',
  'LYCEUM','farghona','+998732252080','https://prezidentmaktabi.uz',NULL,NULL,
  'Farg''ona, Al-Farg''oniy ko''chasi 2',40.3920,71.7920,true,4.8,
  'Farg''ona Prezident Maktabi — Farg''ona viloyatidagi iqtidorli o''quvchilar uchun davlat ta''lim muassasasi.',
  'Ферганская Президентская школа — государственное образовательное учреждение для одарённых учащихся.',
  2019,470,74,ARRAY['uz','en'],
  ARRAY['Matematika','Fizika','Kimyo','Biologiya','Informatika','Ingliz tili'],
  ARRAY['Olimpiada tayyorgarlik'],NULL,NULL);

SELECT _seed_inst(
  'prezident-maktabi-buxoro','Buxoro Prezident Maktabi','Бухарская президентская школа',
  'LYCEUM','buxoro','+998652252080','https://prezidentmaktabi.uz',NULL,NULL,
  'Buxoro, Yovvoyitol ko''chasi 5',39.7720,64.4600,true,4.8,
  'Buxoro Prezident Maktabi — Buxoro viloyatidagi iqtidorli o''quvchilar uchun davlat ta''lim muassasasi.',
  'Бухарская Президентская школа — государственное образовательное учреждение для одарённых учащихся.',
  2019,450,70,ARRAY['uz','en'],
  ARRAY['Matematika','Fizika','Kimyo','Biologiya','Informatika','Ingliz tili'],
  ARRAY['Olimpiada tayyorgarlik'],NULL,NULL);

SELECT _seed_inst(
  'prezident-maktabi-qarshi','Qarshi Prezident Maktabi','Каршинская президентская школа',
  'LYCEUM','qarshi','+998752242080','https://prezidentmaktabi.uz',NULL,NULL,
  'Qarshi, Mustakillik ko''chasi 3',38.8650,65.7950,true,4.8,
  'Qarshi Prezident Maktabi — Qashqadaryo viloyatidagi iqtidorli o''quvchilar uchun davlat ta''lim muassasasi.',
  'Каршинская Президентская школа — государственное образовательное учреждение для одарённых учащихся.',
  2020,440,68,ARRAY['uz','en'],
  ARRAY['Matematika','Fizika','Kimyo','Biologiya','Informatika','Ingliz tili'],
  ARRAY['Olimpiada tayyorgarlik'],NULL,NULL);

SELECT _seed_inst(
  'prezident-maktabi-urganch','Urganch Prezident Maktabi','Ургенчская президентская школа',
  'LYCEUM','urganch','+998622222080','https://prezidentmaktabi.uz',NULL,NULL,
  'Urganch, Al-Xorazmiy ko''chasi 10',41.5580,60.6350,true,4.8,
  'Urganch Prezident Maktabi — Xorazm viloyatidagi iqtidorli o''quvchilar uchun davlat ta''lim muassasasi.',
  'Ургенчская Президентская школа — государственное образовательное учреждение для одарённых учащихся.',
  2020,430,65,ARRAY['uz','en'],
  ARRAY['Matematika','Fizika','Kimyo','Biologiya','Informatika','Ingliz tili'],
  ARRAY['Olimpiada tayyorgarlik'],NULL,NULL);

SELECT _seed_inst(
  'prezident-maktabi-termiz','Termiz Prezident Maktabi','Термезская президентская школа',
  'LYCEUM','termiz','+998762222080','https://prezidentmaktabi.uz',NULL,NULL,
  'Termiz, Mustakillik ko''chasi 5',37.2280,67.2820,true,4.7,
  'Termiz Prezident Maktabi — Surxondaryo viloyatidagi iqtidorli o''quvchilar uchun davlat ta''lim muassasasi.',
  'Термезская Президентская школа — государственное образовательное учреждение для одарённых учащихся.',
  2021,420,62,ARRAY['uz','en'],
  ARRAY['Matematika','Fizika','Kimyo','Biologiya','Informatika','Ingliz tili'],
  ARRAY['Olimpiada tayyorgarlik'],NULL,NULL);

-- AKADEMIK LITSEYLAR
SELECT _seed_inst(
  'tdtu-akademik-litseyi','Toshkent Davlat Texnika Universiteti Akademik Litseyi','Академический лицей ТГТУ',
  'LYCEUM','toshkent','+998712337212','https://tdtu.uz/litsey',NULL,NULL,
  'Toshkent, Yunusobod tumani, Universitetskaya ko''chasi 2A',41.3455,69.3070,true,4.4,
  'TDTU Akademik Litseyi — texnik fanlar bo''yicha chuqurlashtirilgan ta''lim beruvchi davlat litseysi. TDTU ga afzal qabul.',
  'Академический лицей ТГТУ — государственный лицей с углублённым обучением техническим наукам.',
  1998,600,60,ARRAY['uz','ru'],
  ARRAY['Matematika (chuqurlashtirilgan)','Fizika','Kimyo','Informatika','Muhandislik asoslari'],
  ARRAY[]::TEXT[],300000,600000);

SELECT _seed_inst(
  'tatu-akademik-litseyi','Toshkent Axborot Texnologiyalari Universiteti Akademik Litseyi','Академический лицей ТУИТ',
  'LYCEUM','toshkent','+998712388110','https://tuit.uz/litsey',NULL,NULL,
  'Toshkent, Yunusobod tumani, Amir Temur ko''chasi 108A',41.3390,69.3055,true,4.5,
  'TATU Akademik Litseyi — IT va telekommunikatsiya yo''nalishida chuqurlashtirilgan ta''lim beruvchi davlat litseysi.',
  'Академический лицей ТУИТ — государственный лицей с углублённым обучением IT и телекоммуникациям.',
  1997,500,50,ARRAY['uz','ru'],
  ARRAY['Informatika (chuqurlashtirilgan)','Dasturlash asoslari','Matematika','Fizika'],
  ARRAY[]::TEXT[],300000,550000);

SELECT _seed_inst(
  'nuu-akademik-litseyi','O''zbekiston Milliy Universiteti Akademik Litseyi','Академический лицей НУУз',
  'LYCEUM','toshkent','+998712279700','https://nuu.uz/litsey',NULL,NULL,
  'Toshkent, Olmazor tumani, Universitet ko''chasi 4A',41.3442,69.2910,true,4.5,
  'NUUz Akademik Litseyi — Milliy Universitetning litseysi. Tabiiy fanlar, gumanitar va ijtimoiy yo''nalishlar. NUUz ga afzal qabul.',
  'Академический лицей НУУз — лицей Национального университета. Естественные и гуманитарные науки.',
  1992,550,55,ARRAY['uz','ru'],
  ARRAY['Tabiiy fanlar (chuqurlashtirilgan)','Gumanitar fanlar','Matematika','Kimyo','Biologiya'],
  ARRAY[]::TEXT[],280000,550000);

SELECT _seed_inst(
  'samdu-akademik-litseyi','Samarqand Davlat Universiteti Akademik Litseyi','Академический лицей СамГУ',
  'LYCEUM','samarqand','+998662339200',NULL,NULL,NULL,
  'Samarqand, Universitetski xiyoboni 15A',39.6580,66.9760,true,4.2,
  'SamDU Akademik Litseyi — Samarqanddagi davlat litseysi. Tabiiy fanlar, gumanitar va ijtimoiy yo''nalishlar.',
  'Академический лицей СамГУ — государственный лицей в Самарканде.',
  1998,400,40,ARRAY['uz','ru'],
  ARRAY['Tabiiy fanlar','Gumanitar fanlar','Ijtimoiy fanlar','Informatika'],
  ARRAY[]::TEXT[],250000,500000);

-- ================================================================
-- Funksiyani o'chirish
-- ================================================================
DROP FUNCTION IF EXISTS _seed_inst;

-- Umumiy son tekshirish
SELECT type, COUNT(*) as soni
FROM "Institution"
WHERE slug IN (
  'ilc-toshkent','accels-toshkent','goethe-institut-toshkent',
  'institut-francais-toshkent','korea-cultural-center-toshkent',
  'confucius-institute-toshkent','global-english-toshkent',
  'englishtime-toshkent','british-link-toshkent','speakup-toshkent',
  'japan-foundation-toshkent','ilc-samarqand','ilc-namangan',
  'ilc-andijon','ilc-buxoro','konfutsiy-markazi-samarqand',
  'najot-talim-toshkent','pdp-academy-toshkent','astrum-it-toshkent',
  'it-park-talim-toshkent','step-it-academy-toshkent',
  'governa-toshkent','ucode-toshkent','mohirdev-toshkent',
  'zero-to-one-toshkent','evolution-it-toshkent','digital-league-toshkent',
  'najot-talim-samarqand','pdp-academy-samarqand','astrum-it-samarqand',
  'pdp-academy-namangan','astrum-it-namangan','najot-talim-andijon',
  'najot-talim-fargona','it-park-fargona','fargona-smart-it',
  'namangan-it-hub','najot-talim-buxoro','it-hub-buxoro','qarshi-it-academy',
  'ielts-plus-toshkent','sat-prep-toshkent','gre-gmat-toshkent',
  'toshkent-design-school','raqamli-marketing-akademiyasi',
  'cambridge-school-toshkent','horizon-international-school-toshkent',
  'iq-school-toshkent','bilim-istedad-maktabi','samarqand-excellence-school',
  'namangan-modern-school','andijon-smart-school','buxoro-stars-academy',
  'prezident-maktabi-toshkent','prezident-maktabi-samarqand',
  'prezident-maktabi-namangan','prezident-maktabi-andijon',
  'prezident-maktabi-fargona','prezident-maktabi-buxoro',
  'prezident-maktabi-qarshi','prezident-maktabi-urganch',
  'prezident-maktabi-termiz','tdtu-akademik-litseyi',
  'tatu-akademik-litseyi','nuu-akademik-litseyi','samdu-akademik-litseyi'
)
GROUP BY type ORDER BY type;

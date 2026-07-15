-- ================================================================
-- EduReyting.uz — O'quv markazlar va Maktablar
-- FOYDALANISH: 2 ta alohida query sifatida ishlatish kerak
-- ================================================================

-- ╔══════════════════════════════════════════════════════════╗
-- ║  STEP 1: Avval shu queryni ishlatib funksiya yarating    ║
-- ╚══════════════════════════════════════════════════════════╝

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
) RETURNS TEXT LANGUAGE plpgsql AS $$
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
$$;

-- ====================================================
-- Tekshirish: "CREATE" yoki xato xabari chiqishi kerak
-- ====================================================




-- ╔══════════════════════════════════════════════════════════╗
-- ║  STEP 2: Step 1 muvaffaqiyatli bo'lgandan keyin          ║
-- ║  shu DO blokni alohida query sifatida ishlatish kerak    ║
-- ╚══════════════════════════════════════════════════════════╝

DO $$
BEGIN
  -- TIL MARKAZLARI — TOSHKENT
  PERFORM _seed_inst('ilc-toshkent','International Language Center (ILC)','International Language Center (ILC)',
    'LANGUAGE_CENTER','toshkent','+998712561212','https://ilc.uz','ilc_tashkent','ilc.uz',
    'Toshkent, Yunusobod tumani, Amir Temur ko''chasi 1',41.3345,69.2967,true,4.6,
    'ILC — O''zbekistondagi eng yirik va eng nufuzli til markazlaridan biri. 30+ yillik tajriba. Ingliz, nemis, fransuz, ispan, xitoy va boshqa tillar. IELTS, TOEFL imtihonlari.',
    'ILC — один из крупнейших языковых центров Узбекистана. 30+ лет опыта.',
    1992,3000,120,ARRAY['uz','ru','en'],
    ARRAY['General English','Business English','IELTS','TOEFL','Nemis tili','Fransuz tili','Ispan tili','Xitoy tili','Koreys tili'],
    ARRAY['IELTS','TOEFL','DELF','Goethe-Zertifikat'],500000,1800000);

  PERFORM _seed_inst('accels-toshkent','American English Center (ACCELS)','Американский центр английского языка (ACCELS)',
    'LANGUAGE_CENTER','toshkent','+998712068500','https://americancouncils.uz',NULL,NULL,
    'Toshkent, Yunusobod tumani, Nukus ko''chasi 7',41.3370,69.2990,true,4.7,
    'ACCELS — Amerika Qo''shma Shtatlari hukumati tomonidan moliyalashtiriladigan rasmiy Amerika madaniy markazi. FLEX va UGRAD dasturlari.',
    'ACCELS — официальный американский культурный центр. Программы FLEX и UGRAD.',
    1993,1000,40,ARRAY['en','uz','ru'],
    ARRAY['American English','TOEFL tayyorgarlik','FLEX dasturi','UGRAD dasturi'],
    ARRAY['Amerika universitetlariga tayyorlov'],400000,1200000);

  PERFORM _seed_inst('goethe-institut-toshkent','Goethe-Institut Toshkent','Институт Гёте в Ташкенте',
    'LANGUAGE_CENTER','toshkent','+998712524850','https://goethe.de/uz',NULL,NULL,
    'Toshkent, Yunusobod tumani, Buyuk Turon ko''chasi 41',41.3412,69.3045,true,4.8,
    'Goethe-Institut — Germaniyaning rasmiy til va madaniyat instituti. Nemis tili kurslari, Goethe sertifikatlari.',
    'Институт Гёте — официальный германский языковой и культурный институт.',
    1995,800,25,ARRAY['de','uz','ru'],
    ARRAY['A1-C2 Nemis tili','Goethe-Zertifikat A1','Goethe-Zertifikat B2','Goethe-Zertifikat C1','TestDaF'],
    ARRAY['Nemis tili rasmiy sertifikatlari'],600000,1500000);

  PERFORM _seed_inst('institut-francais-toshkent','Institut Français Toshkent','Французский институт в Ташкенте',
    'LANGUAGE_CENTER','toshkent','+998712369240','https://institutfrancais.uz',NULL,NULL,
    'Toshkent, Mirzo Ulug''bek tumani, Puskin ko''chasi 8',41.3490,69.3010,true,4.7,
    'Institut Français — Fransiyaning rasmiy til va madaniyat instituti. DELF/DALF sertifikatlari.',
    'Французский институт — официальный французский языковой институт. DELF/DALF.',
    2001,600,20,ARRAY['fr','uz','ru'],
    ARRAY['A1-C2 Fransuz tili','DELF A1-B2','DALF C1-C2'],
    ARRAY['DELF/DALF sertifikatlari'],550000,1400000);

  PERFORM _seed_inst('korea-cultural-center-toshkent','Korea Cultural Center (KOICA)','Корейский культурный центр (KOICA)',
    'LANGUAGE_CENTER','toshkent','+998712527600','https://koica.uz',NULL,NULL,
    'Toshkent, Mirzo Ulug''bek tumani, Abdulla Qodiriy ko''chasi 17',41.3480,69.3025,true,4.6,
    'Koreya Madaniyat Markazi — Janubiy Koreya hukumati tomonidan tashkil etilgan. TOPIK imtihoni.',
    'Корейский культурный центр — основан правительством Южной Кореи. Экзамен TOPIK.',
    2008,500,15,ARRAY['ko','uz','ru'],
    ARRAY['Koreys tili TOPIK I','Koreys tili TOPIK II','K-pop va K-drama klubi'],
    ARRAY['TOPIK sertifikati'],350000,800000);

  PERFORM _seed_inst('confucius-institute-toshkent','Confucius Institute Toshkent','Институт Конфуция в Ташкенте',
    'LANGUAGE_CENTER','toshkent','+998712779900','https://confucius.uz',NULL,NULL,
    'Toshkent, Olmazor tumani, NUUz kampusi',41.3440,69.2895,true,4.5,
    'Konfutsiy Instituti — NUUz kampusida Xitoy tili kurslari, HSK imtihoni, stipendiyalar.',
    'Институт Конфуция в кампусе НУУз. Курсы китайского языка, HSK.',
    2009,400,12,ARRAY['zh','uz','ru'],
    ARRAY['Xitoy tili HSK 1-6','Xitoy madaniyati'],
    ARRAY['HSK sertifikati'],300000,700000);

  PERFORM _seed_inst('global-english-toshkent','Global English Language Center','Global English Language Center',
    'LANGUAGE_CENTER','toshkent','+998901234560','https://globalenglish.uz','globalenglish_uz','globalenglish.uz',
    'Toshkent, Yunusobod tumani, Qoratosh ko''chasi 12',41.3390,69.3050,true,4.6,
    'Global English — IELTS va ingliz tili ta''limida ixtisoslashgan markaz. Native speaker o''qituvchilar, 7.0+ kafolati.',
    'Global English — центр, специализирующийся на IELTS. Носители языка. Гарантия 7.0+.',
    2015,1200,50,ARRAY['en','uz','ru'],
    ARRAY['IELTS Academic','IELTS General','General English','Business English','TOEFL'],
    ARRAY['IELTS 6.5+ kafolati'],600000,1600000);

  PERFORM _seed_inst('englishtime-toshkent','EnglishTime Language School','EnglishTime Language School',
    'LANGUAGE_CENTER','toshkent','+998935557777',NULL,'englishtime_uz','englishtime.uz',
    'Toshkent, Mirzo Ulug''bek tumani, Oliy Majlis ko''chasi 4',41.3510,69.2980,false,4.4,
    'EnglishTime — kommunikativ usulda ingliz tili. Kichik guruhlar, speaking klublari.',
    'EnglishTime — коммуникативный метод. Маленькие группы, разговорные клубы.',
    2017,700,28,ARRAY['en','uz','ru'],
    ARRAY['Starter to Advanced','IELTS tayyorgarlik','Kids English','Conversation Club'],
    ARRAY[]::TEXT[],400000,900000);

  PERFORM _seed_inst('british-link-toshkent','British Link Language Center','Брит Линк Языковой Центр',
    'LANGUAGE_CENTER','toshkent','+998712009888','https://britishlink.uz','britishlink_uz','britishlink.uz',
    'Toshkent, Yunusobod tumani, 12-mavze, 5A',41.3370,69.3075,true,4.7,
    'British Link — britaniyalik o''qituvchilar bilan ingliz tili. IELTS 7.0+ kafolati.',
    'British Link — с британскими преподавателями. Гарантия IELTS 7.0+.',
    2013,1000,40,ARRAY['en','uz','ru'],
    ARRAY['General English','Business English','IELTS 7.0+','Academic English'],
    ARRAY['Native British speakers'],700000,2000000);

  PERFORM _seed_inst('speakup-toshkent','SpeakUp Language Center','SpeakUp Language Center',
    'LANGUAGE_CENTER','toshkent','+998905551234',NULL,'speakup_uz','speakup.tashkent',
    'Toshkent, Chilonzor tumani, 9-mavze, 3-uy',41.2790,69.2110,false,4.4,
    'SpeakUp — kommunikativ usulda ingliz tili. Kichik guruhlar, intensiv kurslar.',
    'SpeakUp — коммуникативный метод обучения английскому.',
    2018,500,20,ARRAY['en','uz'],
    ARRAY['Beginner to Advanced','IELTS tayyorgarlik','Kids English','Speaking Club'],
    ARRAY[]::TEXT[],380000,800000);

  PERFORM _seed_inst('japan-foundation-toshkent','Japan Foundation — O''zbek-Yapon Til Markazi','Японо-Узбекский языковой центр Japan Foundation',
    'LANGUAGE_CENTER','toshkent','+998712562300','https://jfuz.uz',NULL,NULL,
    'Toshkent, Mirzo Ulug''bek tumani, Abdulla Qodiriy ko''chasi 22',41.3490,69.3035,true,4.6,
    'Japan Foundation — Yaponiyaning rasmiy til va madaniyat instituti. JLPT imtihoni.',
    'Японо-узбекский языковой центр Japan Foundation. Экзамен JLPT.',
    2003,300,10,ARRAY['ja','uz','ru'],
    ARRAY['Yapon tili N5-N1','JLPT tayyorgarlik','Yapon madaniyati'],
    ARRAY['JLPT sertifikati'],400000,900000);

  -- TIL MARKAZLARI — VILOYATLAR
  PERFORM _seed_inst('ilc-samarqand','ILC — Samarqand filiali','ILC — Самаркандский филиал',
    'LANGUAGE_CENTER','samarqand','+998662356060','https://ilc.uz',NULL,NULL,
    'Samarqand, Universitetski xiyoboni 7',39.6580,66.9700,true,4.5,
    'ILC Samarqand — O''zbekistondagi eng nufuzli til markazi filiali. IELTS, nemis, fransuz tillari.',
    'ILC Самарканд — филиал самого известного языкового центра Узбекистана.',
    2010,800,30,ARRAY['uz','ru','en'],
    ARRAY['General English','IELTS','Nemis tili','Fransuz tili'],
    ARRAY[]::TEXT[],450000,1400000);

  PERFORM _seed_inst('ilc-namangan','ILC — Namangan filiali','ILC — Наманганский филиал',
    'LANGUAGE_CENTER','namangan','+998692271212','https://ilc.uz',NULL,NULL,
    'Namangan, Uychi ko''chasi 45',40.9985,71.6480,true,4.5,
    'ILC Namangan — O''zbekistondagi eng nufuzli til markazi filiali.',
    'ILC Наманган — филиал самого известного языкового центра.',
    2012,700,25,ARRAY['uz','ru','en'],
    ARRAY['General English','IELTS','Nemis tili'],
    ARRAY[]::TEXT[],440000,1300000);

  PERFORM _seed_inst('ilc-andijon','ILC — Andijon filiali','ILC — Андижанский филиал',
    'LANGUAGE_CENTER','andijon','+998742241212','https://ilc.uz',NULL,NULL,
    'Andijon, Navoi ko''chasi 25',40.7870,72.3510,true,4.4,
    'ILC Andijon — O''zbekistondagi eng nufuzli til markazi filiali.',
    'ILC Андижан — филиал самого известного языкового центра.',
    2014,650,22,ARRAY['uz','ru','en'],
    ARRAY['General English','IELTS'],
    ARRAY[]::TEXT[],430000,1200000);

  PERFORM _seed_inst('ilc-buxoro','ILC — Buxoro filiali','ILC — Бухарский филиал',
    'LANGUAGE_CENTER','buxoro','+998652221212','https://ilc.uz',NULL,NULL,
    'Buxoro, Mustakillik ko''chasi 12',39.7700,64.4510,true,4.4,
    'ILC Buxoro — O''zbekistondagi eng nufuzli til markazi filiali.',
    'ILC Бухара — филиал самого известного языкового центра.',
    2015,600,20,ARRAY['uz','ru','en'],
    ARRAY['General English','IELTS'],
    ARRAY[]::TEXT[],430000,1200000);

  PERFORM _seed_inst('konfutsiy-markazi-samarqand','Xitoy Tili va Madaniyati Markazi — Samarqand','Центр китайского языка — Самарканд',
    'LANGUAGE_CENTER','samarqand','+998662351234',NULL,NULL,NULL,
    'Samarqand, SamDU kampusi, 3-bino',39.6575,66.9748,false,4.3,
    'Xitoy Tili Markazi — SamDU huzuridagi Konfutsiy Instituti filiali. HSK imtihoni.',
    'Центр китайского языка — филиал Института Конфуция при СамГУ.',
    2012,200,8,ARRAY['zh','uz','ru'],
    ARRAY['Xitoy tili HSK 1-4','Xitoy madaniyati'],
    ARRAY[]::TEXT[],280000,650000);

  -- IT MAKTABLAR — TOSHKENT
  PERFORM _seed_inst('najot-talim-toshkent','Najot Ta''lim — Toshkent','Najot Ta''lim — Ташкент',
    'IT_SCHOOL','toshkent','+998781234567','https://najottalim.uz','najottalim','najottalim',
    'Toshkent, Yunusobod tumani, 19-mavze, 3-uy',41.3395,69.2880,true,4.6,
    'Najot Ta''lim — O''zbekistondagi eng yirik IT ta''lim markazi. 20+ shahar, 50,000+ bitiruvchi.',
    'Najot Ta''lim — крупнейший IT-учебный центр Узбекистана. 20+ городов.',
    2016,8000,200,ARRAY['uz','ru'],
    ARRAY['Python','Java','Flutter','iOS (Swift)','Android (Kotlin)','Frontend (React)','Backend (Node.js)','UI/UX Design','QA Testing'],
    ARRAY['Viloyatlarda filiallar'],700000,1800000);

  PERFORM _seed_inst('pdp-academy-toshkent','PDP Academy — Toshkent','PDP Academy — Ташкент',
    'IT_SCHOOL','toshkent','+998781400400','https://pdp.uz','pdpacademy','pdp.academy',
    'Toshkent, Yunusobod tumani, Qoratosh ko''chasi 28',41.3380,69.3060,true,4.7,
    'PDP Academy — O''zbekistondagi yetakchi IT ta''lim markazlaridan biri. 2000+ bitiruvchi.',
    'PDP Academy — один из ведущих IT-учебных центров Узбекистана.',
    2016,2500,100,ARRAY['uz','ru'],
    ARRAY['Java (Spring Boot)','Python (Django/DRF)','Flutter','React (Frontend)','Node.js','DevOps','QA Testing'],
    ARRAY['Backend muhandisligi'],800000,2000000);

  PERFORM _seed_inst('astrum-it-toshkent','Astrum IT Academy — Toshkent','Astrum IT Academy — Ташкент',
    'IT_SCHOOL','toshkent','+998781000111','https://astrumuz.com','astrum_academy','astrum.uz',
    'Toshkent, Mirzo Ulug''bek tumani, Mirzo Ulug''bek ko''chasi 86',41.3535,69.2978,true,4.5,
    'Astrum IT Academy — Python, Flutter, Full Stack, UI/UX, Grafik Dizayn.',
    'Astrum IT Academy — Python, Flutter, Full Stack, UI/UX, Графический дизайн.',
    2017,3000,90,ARRAY['uz','ru'],
    ARRAY['Python','Flutter','Full Stack Web','UI/UX Design','Grafik Dizayn','3D Modeling'],
    ARRAY[]::TEXT[],700000,1700000);

  PERFORM _seed_inst('it-park-talim-toshkent','IT Park Ta''lim Markazi — Toshkent','IT Park Учебный Центр — Ташкент',
    'IT_SCHOOL','toshkent','+998712009001','https://it-park.uz','itpark_edu','itpark.uz',
    'Toshkent, Mirzo Ulug''bek tumani, Mirzo Ulug''bek ko''chasi 95',41.3540,69.2985,true,4.7,
    'IT Park Ta''lim Markazi — AI, Blockchain, Data Science, Cybersecurity kurslari.',
    'IT Park — AI, Blockchain, Data Science, Cybersecurity курсы.',
    2019,2000,80,ARRAY['uz','ru','en'],
    ARRAY['AI & Machine Learning','Data Science','Cybersecurity','Blockchain','DevOps','Python','Java'],
    ARRAY['Ilg''or texnologiyalar'],1000000,3000000);

  PERFORM _seed_inst('step-it-academy-toshkent','Step IT Academy Toshkent','Step IT Academy Ташкент',
    'IT_SCHOOL','toshkent','+998712312312','https://itstep.uz','itstep_tashkent','itstep.uz',
    'Toshkent, Yunusobod tumani, Amir Temur ko''chasi 56',41.3357,69.2970,true,4.5,
    'Step IT Academy — xalqaro IT ta''lim tarmog''ining Toshkent filiali. 25+ yillik tajriba.',
    'Step IT Academy — ташкентский филиал международной сети IT-образования.',
    2007,1200,50,ARRAY['uz','ru'],
    ARRAY['C/C++','Java','.NET','Web Development','Mobile','GameDev'],
    ARRAY[]::TEXT[],750000,1800000);

  PERFORM _seed_inst('governa-toshkent','Governa School of IT','Governa School of IT',
    'IT_SCHOOL','toshkent','+998711234900','https://governa.uz','governa_uz','governa.uz',
    'Toshkent, Yunusobod tumani, Amir Temur xiyoboni 1A',41.3355,69.2950,true,4.6,
    'Governa — professional dasturlash va raqamli kasb maktabi. Karyeraga yo''naltirish xizmati.',
    'Governa — школа профессионального программирования. Сервис по трудоустройству.',
    2019,800,35,ARRAY['uz','ru'],
    ARRAY['Java','Python','iOS (Swift)','Android (Kotlin)','Full Stack','QA Testing','DevOps'],
    ARRAY[]::TEXT[],850000,1700000);

  PERFORM _seed_inst('ucode-toshkent','Ucode IT School','Ucode IT School',
    'IT_SCHOOL','toshkent','+998781234560','https://ucode.uz','ucode_uz','ucode.uz',
    'Toshkent, Yunusobod tumani, 14-mavze',41.3412,69.2988,true,4.4,
    'Ucode — Hamkorbank tomonidan tashkil etilgan IT markazi. Arzonroq narxlar.',
    'Ucode — IT-центр, основанный Хамкорбанком. Доступные цены.',
    2020,1000,40,ARRAY['uz','ru'],
    ARRAY['Python','JavaScript','Flutter','Java','Grafik Dizayn'],
    ARRAY[]::TEXT[],500000,1000000);

  PERFORM _seed_inst('mohirdev-toshkent','Mohirdev IT Academy','Mohirdev IT Academy',
    'IT_SCHOOL','toshkent','+998930001122','https://mohirdev.uz','mohirdev','mohirdev.uz',
    'Toshkent, Mirzo Ulug''bek tumani, Meros ko''chasi 10',41.3525,69.2990,true,4.6,
    'Mohirdev — onlayn va oflayn IT ta''lim platformasi. 50+ kurs, 100,000+ o''quvchi.',
    'Mohirdev — платформа IT-образования онлайн и офлайн. 50+ курсов.',
    2020,5000,30,ARRAY['uz'],
    ARRAY['Python & Django','JavaScript & React','Flutter & Dart','PHP & Laravel','Node.js'],
    ARRAY[]::TEXT[],200000,800000);

  PERFORM _seed_inst('zero-to-one-toshkent','Zero To One IT School','Zero To One IT School',
    'IT_SCHOOL','toshkent','+998990110011','https://zerotoone.uz','zerotoone_uz','zerotoone.uz',
    'Toshkent, Mirzo Ulug''bek tumani, Meros ko''chasi 5',41.3521,69.3003,true,4.5,
    'Zero To One — intensiv bootcamp. 6 oyda ishga joylashish kafolati.',
    'Zero To One — интенсивный буткемп. Гарантия трудоустройства за 6 месяцев.',
    2020,500,20,ARRAY['uz','ru'],
    ARRAY['Python Backend','JavaScript Full Stack','Flutter Mobile','Data Science'],
    ARRAY['Ishga joylashish kafolati'],900000,1800000);

  PERFORM _seed_inst('evolution-it-toshkent','Evolution IT Academy','Evolution IT Academy',
    'IT_SCHOOL','toshkent','+998950220022',NULL,'evolution_it','evolution_it_uz',
    'Toshkent, Shayxontohur tumani, Toshkent ko''chasi 42',41.3200,69.2600,false,4.4,
    'Evolution IT Academy — intensiv bootcamp formatida professional dasturchilar tayyorlaydigan markaz.',
    'Evolution IT Academy — подготовка профессиональных разработчиков в формате буткемпа.',
    2019,700,28,ARRAY['uz','ru'],
    ARRAY['Python Backend','Java Backend','iOS (Swift)','Android (Kotlin)','React Frontend'],
    ARRAY[]::TEXT[],900000,2000000);

  PERFORM _seed_inst('digital-league-toshkent','Digital League IT Academy','Digital League IT Academy',
    'IT_SCHOOL','toshkent','+998951234567','https://digitalleague.uz','digitalleague_uz','digitalleague.uz',
    'Toshkent, Shayxontohur tumani, Navoiy ko''chasi 22',41.3180,69.2520,false,4.2,
    'Digital League — IT va raqamli marketing yo''nalishlarida ta''lim.',
    'Digital League — обучение по IT и цифровому маркетингу.',
    2018,600,25,ARRAY['uz','ru'],
    ARRAY['Python','Web Development','SMM & Content','Grafik Dizayn','1C Buxgalteriya'],
    ARRAY[]::TEXT[],450000,900000);

  -- IT MAKTABLAR — VILOYATLAR
  PERFORM _seed_inst('najot-talim-samarqand','Najot Ta''lim — Samarqand filiali','Najot Ta''lim — Самарканд',
    'IT_SCHOOL','samarqand','+998662358070','https://najottalim.uz','najottalim_samarqand',NULL,
    'Samarqand, Registon ko''chasi 15',39.6590,66.9650,true,4.6,
    'Najot Ta''lim Samarqand filiali.',
    'Филиал Najot Ta''lim в Самарканде.',
    2020,600,25,ARRAY['uz','ru'],
    ARRAY['Python','Java','Flutter','Frontend (React)','Android'],
    ARRAY[]::TEXT[],700000,1500000);

  PERFORM _seed_inst('pdp-academy-samarqand','PDP Academy — Samarqand filiali','PDP Academy — Самарканд',
    'IT_SCHOOL','samarqand','+998662358044','https://pdp.uz','pdpacademy_samarqand',NULL,
    'Samarqand, Registon ko''chasi 10',39.6595,66.9645,true,4.5,
    'PDP Academy Samarqand filiali.',
    'Филиал PDP Academy в Самарканде.',
    2021,520,21,ARRAY['uz','ru'],
    ARRAY['Java','Python','Flutter','Frontend'],
    ARRAY[]::TEXT[],750000,1600000);

  PERFORM _seed_inst('astrum-it-samarqand','Astrum IT Academy — Samarqand','Astrum IT — Самарканд',
    'IT_SCHOOL','samarqand','+998662358090','https://astrumuz.com','astrum_samarqand',NULL,
    'Samarqand, Mirzo Ulug''bek ko''chasi 7',39.6650,66.9580,false,4.4,
    'Astrum IT Academy Samarqand — Python, Flutter, Full Stack Web.',
    'Astrum IT Academy Самарканд.',
    2021,350,15,ARRAY['uz','ru'],
    ARRAY['Python','Flutter','Full Stack Web','UI/UX Design'],
    ARRAY[]::TEXT[],650000,1300000);

  PERFORM _seed_inst('pdp-academy-namangan','PDP Academy — Namangan filiali','PDP Academy — Наманган',
    'IT_SCHOOL','namangan','+998692260444','https://pdp.uz','pdpacademy_namangan',NULL,
    'Namangan, Buyuk ipak yo''li ko''chasi 47',40.9995,71.6680,true,4.5,
    'PDP Academy Namangan filiali.',
    'Филиал PDP Academy в Намангане.',
    2021,500,20,ARRAY['uz','ru'],
    ARRAY['Java','Python','Flutter','Frontend'],
    ARRAY[]::TEXT[],750000,1600000);

  PERFORM _seed_inst('astrum-it-namangan','Astrum IT Academy — Namangan','Astrum IT — Наманган',
    'IT_SCHOOL','namangan','+998692271010','https://astrumuz.com','astrum_namangan',NULL,
    'Namangan, Buyuk ipak yo''li ko''chasi 32',40.9990,71.6660,false,4.3,
    'Astrum IT Academy Namangan.',
    'Astrum IT Academy Наманган.',
    2022,330,13,ARRAY['uz'],
    ARRAY['Python','Flutter','Full Stack Web'],
    ARRAY[]::TEXT[],650000,1300000);

  PERFORM _seed_inst('najot-talim-andijon','Najot Ta''lim — Andijon filiali','Najot Ta''lim — Андижан',
    'IT_SCHOOL','andijon','+998742252070','https://najottalim.uz','najottalim_andijon',NULL,
    'Andijon, Ipak yo''li ko''chasi 22',40.7850,72.3460,true,4.5,
    'Najot Ta''lim Andijon filiali.',
    'Филиал Najot Ta''lim в Андижане.',
    2021,450,18,ARRAY['uz'],
    ARRAY['Python','Java','Flutter','Frontend'],
    ARRAY[]::TEXT[],700000,1400000);

  PERFORM _seed_inst('najot-talim-fargona','Najot Ta''lim — Farg''ona filiali','Najot Ta''lim — Фергана',
    'IT_SCHOOL','farghona','+998732252070','https://najottalim.uz','najottalim_fargona',NULL,
    'Farg''ona, Mustaqillik ko''chasi 18',40.3880,71.7840,true,4.4,
    'Najot Ta''lim Farg''ona filiali.',
    'Филиал Najot Ta''lim в Фергане.',
    2021,420,16,ARRAY['uz'],
    ARRAY['Python','Java','Flutter','Frontend'],
    ARRAY[]::TEXT[],700000,1400000);

  PERFORM _seed_inst('it-park-fargona','Farg''ona IT Park Ta''lim Markazi','IT Park Фергана',
    'IT_SCHOOL','farghona','+998732258090','https://it-park.uz','itpark_fargona',NULL,
    'Farg''ona, Mustaqillik ko''chasi 24',40.3900,71.7870,true,4.4,
    'Farg''ona IT Park — dasturlash, dizayn va startap kurslar.',
    'IT Park Фергана — курсы программирования, дизайна и стартапов.',
    2022,300,12,ARRAY['uz','ru'],
    ARRAY['Python','JavaScript','Grafik Dizayn','UI/UX'],
    ARRAY[]::TEXT[],550000,1100000);

  PERFORM _seed_inst('fargona-smart-it','Farg''ona Smart IT','Фергана Smart IT',
    'IT_SCHOOL','farghona','+998732251515',NULL,'smart_it_fargona',NULL,
    'Farg''ona, Al-Farg''oniy ko''chasi 15',40.3905,71.7855,false,4.1,
    'Farg''ona Smart IT — zamonaviy IT kurslar markazi.',
    'Фергана Smart IT — современный центр IT-курсов.',
    2022,220,8,ARRAY['uz'],
    ARRAY['Python','Java','Flutter','Frontend (React)'],
    ARRAY[]::TEXT[],550000,1100000);

  PERFORM _seed_inst('namangan-it-hub','Namangan IT Hub','Namangan IT Hub',
    'IT_SCHOOL','namangan','+998692279090',NULL,'namangan_it_hub',NULL,
    'Namangan, Lutfobod ko''chasi 8',41.0020,71.6600,false,4.3,
    'Namangan IT Hub — IT ta''lim va startap ekosistema markazi.',
    'Namangan IT Hub — центр IT-образования и стартап-экосистемы.',
    2021,280,10,ARRAY['uz'],
    ARRAY['Python','Web Development','Mobile (Flutter)','UI/UX Design'],
    ARRAY[]::TEXT[],500000,1000000);

  PERFORM _seed_inst('najot-talim-buxoro','Najot Ta''lim — Buxoro filiali','Najot Ta''lim — Бухара',
    'IT_SCHOOL','buxoro','+998652252070','https://najottalim.uz','najottalim_buxoro',NULL,
    'Buxoro, M. Iqbol ko''chasi 8',39.7670,64.4480,true,4.4,
    'Najot Ta''lim Buxoro filiali.',
    'Филиал Najot Ta''lim в Бухаре.',
    2022,380,14,ARRAY['uz'],
    ARRAY['Python','Java','Flutter','Frontend'],
    ARRAY[]::TEXT[],700000,1400000);

  PERFORM _seed_inst('it-hub-buxoro','IT Hub Buxoro','IT Hub Бухара',
    'IT_SCHOOL','buxoro','+998652250101',NULL,'ithub_buxoro',NULL,
    'Buxoro, Navoiy ko''chasi 3',39.7660,64.4465,false,4.2,
    'IT Hub Buxoro — zamonaviy IT ta''lim markazi.',
    'IT Hub Бухара — современный IT-учебный центр.',
    2022,260,10,ARRAY['uz','ru'],
    ARRAY['Python','JavaScript','Flutter','UI/UX Design'],
    ARRAY[]::TEXT[],550000,1100000);

  PERFORM _seed_inst('qarshi-it-academy','Qarshi IT Academy','Карши IT Academy',
    'IT_SCHOOL','qarshi','+998752242020',NULL,'qarshi_it',NULL,
    'Qarshi, Mustakillik ko''chasi 8',38.8610,65.7890,false,4.2,
    'Qarshi IT Academy — IT ta''lim markazi.',
    'Карши IT Academy — IT-учебный центр.',
    2021,250,9,ARRAY['uz'],
    ARRAY['Python','Web Development','Grafik Dizayn'],
    ARRAY[]::TEXT[],500000,1000000);

  -- KURS MARKAZLARI
  PERFORM _seed_inst('ielts-plus-toshkent','IELTS+ Academy Toshkent','IELTS+ Academy Ташкент',
    'COURSE_CENTER','toshkent','+998901122334','https://ieltsplus.uz','ieltsplus_uz','ieltsplus.uz',
    'Toshkent, Yunusobod tumani, 19-mavze, 5-uy',41.3380,69.2870,true,4.7,
    'IELTS+ Academy — IELTS 7.0+ ball kafolati. Tajribali o''qituvchilar, kichik guruhlar.',
    'IELTS+ Academy — гарантия 7.0+. Опытные преподаватели, маленькие группы.',
    2016,900,35,ARRAY['en','uz','ru'],
    ARRAY['IELTS Academic (7.0+)','IELTS General Training','TOEFL iBT','SAT/ACT'],
    ARRAY['IELTS 7.0+ kafolati'],700000,2000000);

  PERFORM _seed_inst('sat-prep-toshkent','SAT Prep Center Toshkent','SAT Prep Center Ташкент',
    'COURSE_CENTER','toshkent','+998935556677',NULL,'satprep_uz','satprep.uz',
    'Toshkent, Mirzo Ulug''bek tumani, Mirzo Ulug''bek ko''chasi 72',41.3520,69.2970,false,4.6,
    'SAT Prep Center — 1400+ SAT ball kafolati. Xorijiy universitetlarga tayyorlov.',
    'SAT Prep Center — гарантия SAT 1400+. Подготовка в зарубежные университеты.',
    2018,400,18,ARRAY['en','uz','ru'],
    ARRAY['SAT Math','SAT English','ACT Prep','IELTS/TOEFL','Essay yozish'],
    ARRAY['SAT 1400+ kafolati'],800000,2500000);

  PERFORM _seed_inst('gre-gmat-toshkent','GRE & GMAT Prep Center Toshkent','GRE & GMAT Prep Center Ташкент',
    'COURSE_CENTER','toshkent','+998901234589',NULL,'gre_gmat_uz',NULL,
    'Toshkent, Mirzo Ulug''bek tumani, Yangi hayot ko''chasi 10',41.3505,69.3005,false,4.6,
    'GRE & GMAT Prep Center — 320+ GRE va 700+ GMAT ball kafolati.',
    'GRE & GMAT Prep Center — гарантия GRE 320+ и GMAT 700+.',
    2017,300,12,ARRAY['en','uz','ru'],
    ARRAY['GRE Verbal','GRE Quantitative','GMAT Quant','GMAT Verbal'],
    ARRAY['GRE 320+','GMAT 700+'],1000000,3000000);

  PERFORM _seed_inst('toshkent-design-school','Toshkent Design School','Ташкент Дизайн Скул',
    'COURSE_CENTER','toshkent','+998950001234','https://tashkentdesign.uz','tashkent_design','tashkent.design.school',
    'Toshkent, Shayxontohur tumani, Navoiy ko''chasi 17',41.3160,69.2510,false,4.5,
    'Toshkent Design School — grafik dizayn, UI/UX, brending, video montaj kurslari.',
    'Ташкент Дизайн Скул — курсы по дизайну, UI/UX, брендингу, видео.',
    2016,600,25,ARRAY['uz','ru'],
    ARRAY['Grafik Dizayn','UI/UX Design','Motion Design','Brending','3D Modeling (Blender)','Video Montaj'],
    ARRAY[]::TEXT[],500000,1500000);

  PERFORM _seed_inst('raqamli-marketing-akademiyasi','Raqamli Marketing Akademiyasi','Академия Цифрового Маркетинга',
    'COURSE_CENTER','toshkent','+998990001111',NULL,'digmarketing_uz',NULL,
    'Toshkent, Yunusobod tumani, Amir Temur ko''chasi 30',41.3345,69.2965,false,4.3,
    'Raqamli Marketing Akademiyasi — SMM, SEO, e-commerce, content marketing kurslari.',
    'Академия Цифрового Маркетинга — SMM, SEO, e-commerce, контент-маркетинг.',
    2019,800,20,ARRAY['uz','ru'],
    ARRAY['SMM (Instagram, Telegram)','SEO','Google Ads & Facebook Ads','E-commerce','Content Marketing'],
    ARRAY[]::TEXT[],400000,1200000);

  -- MAKTABLAR
  PERFORM _seed_inst('cambridge-school-toshkent','Cambridge School Toshkent','Кембриджская школа Ташкент',
    'SCHOOL','toshkent','+998712345891','https://cambridgeschool.uz','cambridge_school_uz','cambridge.school.uz',
    'Toshkent, Yunusobod tumani, 7-mavze',41.3390,69.3120,true,4.7,
    'Cambridge School — ingliz tilida ta''lim. Cambridge IGCSE va A-Level dasturlari.',
    'Cambridge School — обучение на английском. Cambridge IGCSE и A-Level.',
    2010,700,65,ARRAY['en','uz','ru'],
    ARRAY['Cambridge IGCSE','Cambridge A-Level','Matematika','Fizika','Kimyo','Biologiya'],
    ARRAY['Cambridge sertifikati'],3000000,6000000);

  PERFORM _seed_inst('horizon-international-school-toshkent','Horizon International School Toshkent','Хоризон Интернэшнл Скул Ташкент',
    'SCHOOL','toshkent','+998712561000','https://horizon.uz','horizon_school_uz','horizon.school.uz',
    'Toshkent, Mirzo Ulug''bek tumani, Bog''ishamol ko''chasi 5',41.3500,69.3020,true,4.8,
    'Horizon International School — IB (International Baccalaureate) dasturi. 1-12 sinflar.',
    'Horizon International School — программа IB. 1-12 классы.',
    2005,800,80,ARRAY['en','uz','ru'],
    ARRAY['IB Primary Years','IB Middle Years','IB Diploma','Cambridge A-Level'],
    ARRAY['IB Diploma'],4000000,8000000);

  PERFORM _seed_inst('iq-school-toshkent','IQ School Toshkent','IQ School Ташкент',
    'SCHOOL','toshkent','+998712391234','https://iqschool.uz','iqschool_uz','iqschool.uz',
    'Toshkent, Yunusobod tumani, 4-mavze, 2-uy',41.3365,69.3085,true,4.6,
    'IQ School — chuqurlashtirilgan matematika va informatika. STEAM ta''lim. 1-11 sinflar.',
    'IQ School — углублённая математика и информатика. STEAM. 1-11 классы.',
    2012,900,75,ARRAY['uz','en','ru'],
    ARRAY['Chuqurlashtirilgan matematika','Informatika','Robotexnika','Ingliz tili','Fizika'],
    ARRAY['Olimpiada tayyorgarlik'],2500000,5000000);

  PERFORM _seed_inst('bilim-istedad-maktabi','Bilim va Iste''dod Maktabi','Школа Знания и Таланта',
    'SCHOOL','toshkent','+998712567890','https://bilimistedad.uz',NULL,'bilim_istedad',
    'Toshkent, Chilonzor tumani, 9-mavze, 12-uy',41.2780,69.2090,false,4.5,
    'Bilim va Iste''dod — zamonaviy o''quv dasturi. 1-11 sinflar. STEAM ta''lim.',
    'Школа Знания и Таланта — современная программа. STEAM-образование.',
    2015,600,55,ARRAY['uz','ru','en'],
    ARRAY['STEAM ta''lim','Matematika','Fizika','Robotexnika','Dasturlash asoslari'],
    ARRAY[]::TEXT[],1800000,3000000);

  PERFORM _seed_inst('samarqand-excellence-school','Samarqand Excellence School','Samarkand Excellence School',
    'SCHOOL','samarqand','+998662358900',NULL,NULL,'excellence_school_samarkand',
    'Samarqand, Bog''ishamol ko''chasi 14',39.6600,66.9700,false,4.4,
    'Samarqand Excellence School — ingliz tilida zamonaviy xususiy maktab. 1-11 sinflar.',
    'Samarkand Excellence School — частная школа с обучением на английском.',
    2017,400,40,ARRAY['uz','en','ru'],
    ARRAY['Ingliz tili (intensiv)','Matematika','Tabiiy fanlar','Informatika'],
    ARRAY[]::TEXT[],1500000,2800000);

  PERFORM _seed_inst('namangan-modern-school','Namangan Modern School','Наманган Модерн Скул',
    'SCHOOL','namangan','+998692278900',NULL,NULL,'namangan_modern_school',
    'Namangan, Yangi Namangan ko''chasi 5',40.9960,71.6550,false,4.3,
    'Namangan Modern School — chuqurlashtirilgan ingliz tili va informatika.',
    'Наманган Модерн Скул — углублённый английский и информатика.',
    2018,350,35,ARRAY['uz','en'],
    ARRAY['Ingliz tili','Matematika','Informatika','Fizika'],
    ARRAY[]::TEXT[],1200000,2200000);

  PERFORM _seed_inst('andijon-smart-school','Andijon Smart School','Андижан Смарт Скул',
    'SCHOOL','andijon','+998742262323',NULL,NULL,'smart_school_andijon',
    'Andijon, Navoiy ko''chasi 55',40.7900,72.3540,false,4.3,
    'Andijon Smart School — STEAM ta''lim. 1-11 sinflar.',
    'Андижан Смарт Скул — STEAM-образование. 1-11 классы.',
    2019,320,32,ARRAY['uz','en'],
    ARRAY['Ingliz tili intensiv','Matematika','Informatika','Robotexnika'],
    ARRAY[]::TEXT[],1200000,2500000);

  PERFORM _seed_inst('buxoro-stars-academy','Buxoro Stars Academy','Бухара Старс Академи',
    'SCHOOL','buxoro','+998652234567',NULL,NULL,'stars_academy_buxoro',
    'Buxoro, Navoi ko''chasi 18',39.7710,64.4530,false,4.2,
    'Buxoro Stars Academy — ingliz tili, matematika chuqurlashtirilgan ta''lim.',
    'Бухара Старс Академи — углублённое обучение английскому и математике.',
    2017,280,28,ARRAY['uz','en','ru'],
    ARRAY['Ingliz tili','Matematika','Fizika','Kimyo','Biologiya'],
    ARRAY[]::TEXT[],1000000,2000000);

  -- LITSEYLAR — PREZIDENT MAKTABLARI
  PERFORM _seed_inst('prezident-maktabi-toshkent','Toshkent Prezident Maktabi','Ташкентская президентская школа',
    'LYCEUM','toshkent','+998712312080','https://prezidentmaktabi.uz',NULL,NULL,
    'Toshkent, Chilonzor tumani, 19-mavze',41.2920,69.2150,true,4.9,
    'Toshkent Prezident Maktabi — iqtidorli o''quvchilar. 7-11 sinflar. Olimpiada tayyorgarlik.',
    'Ташкентская Президентская школа — для одарённых учащихся. 7-11 классы.',
    2019,540,85,ARRAY['uz','en','ru'],
    ARRAY['Matematika (chuqurlashtirilgan)','Fizika','Kimyo','Biologiya','Informatika','Ingliz tili'],
    ARRAY['Olimpiada tayyorgarlik'],NULL,NULL);

  PERFORM _seed_inst('prezident-maktabi-samarqand','Samarqand Prezident Maktabi','Самаркандская президентская школа',
    'LYCEUM','samarqand','+998662358080','https://prezidentmaktabi.uz',NULL,NULL,
    'Samarqand, Registon ko''chasi 2',39.6630,66.9520,true,4.9,
    'Samarqand Prezident Maktabi — iqtidorli o''quvchilar. 7-11 sinflar.',
    'Самаркандская Президентская школа — для одарённых учащихся.',
    2019,500,80,ARRAY['uz','en','ru'],
    ARRAY['Matematika (chuqurlashtirilgan)','Fizika','Kimyo','Biologiya','Informatika','Ingliz tili'],
    ARRAY['Olimpiada tayyorgarlik'],NULL,NULL);

  PERFORM _seed_inst('prezident-maktabi-namangan','Namangan Prezident Maktabi','Наманганская президентская школа',
    'LYCEUM','namangan','+998692272080','https://prezidentmaktabi.uz',NULL,NULL,
    'Namangan, Mustakillik ko''chasi 1',41.0045,71.6600,true,4.9,
    'Namangan Prezident Maktabi — iqtidorli o''quvchilar.',
    'Наманганская Президентская школа — для одарённых учащихся.',
    2019,480,75,ARRAY['uz','en'],
    ARRAY['Matematika','Fizika','Kimyo','Biologiya','Informatika','Ingliz tili'],
    ARRAY['Olimpiada tayyorgarlik'],NULL,NULL);

  PERFORM _seed_inst('prezident-maktabi-andijon','Andijon Prezident Maktabi','Андижанская президентская школа',
    'LYCEUM','andijon','+998742252080','https://prezidentmaktabi.uz',NULL,NULL,
    'Andijon, Navoi ko''chasi 15',40.7900,72.3500,true,4.8,
    'Andijon Prezident Maktabi — iqtidorli o''quvchilar.',
    'Андижанская Президентская школа — для одарённых учащихся.',
    2019,460,72,ARRAY['uz','en'],
    ARRAY['Matematika','Fizika','Kimyo','Biologiya','Informatika','Ingliz tili'],
    ARRAY['Olimpiada tayyorgarlik'],NULL,NULL);

  PERFORM _seed_inst('prezident-maktabi-fargona','Farg''ona Prezident Maktabi','Ферганская президентская школа',
    'LYCEUM','farghona','+998732252080','https://prezidentmaktabi.uz',NULL,NULL,
    'Farg''ona, Al-Farg''oniy ko''chasi 2',40.3920,71.7920,true,4.8,
    'Farg''ona Prezident Maktabi — iqtidorli o''quvchilar.',
    'Ферганская Президентская школа — для одарённых учащихся.',
    2019,470,74,ARRAY['uz','en'],
    ARRAY['Matematika','Fizika','Kimyo','Biologiya','Informatika','Ingliz tili'],
    ARRAY['Olimpiada tayyorgarlik'],NULL,NULL);

  PERFORM _seed_inst('prezident-maktabi-buxoro','Buxoro Prezident Maktabi','Бухарская президентская школа',
    'LYCEUM','buxoro','+998652252080','https://prezidentmaktabi.uz',NULL,NULL,
    'Buxoro, Yovvoyitol ko''chasi 5',39.7720,64.4600,true,4.8,
    'Buxoro Prezident Maktabi — iqtidorli o''quvchilar.',
    'Бухарская Президентская школа — для одарённых учащихся.',
    2019,450,70,ARRAY['uz','en'],
    ARRAY['Matematika','Fizika','Kimyo','Biologiya','Informatika','Ingliz tili'],
    ARRAY['Olimpiada tayyorgarlik'],NULL,NULL);

  PERFORM _seed_inst('prezident-maktabi-qarshi','Qarshi Prezident Maktabi','Каршинская президентская школа',
    'LYCEUM','qarshi','+998752242080','https://prezidentmaktabi.uz',NULL,NULL,
    'Qarshi, Mustakillik ko''chasi 3',38.8650,65.7950,true,4.8,
    'Qarshi Prezident Maktabi — iqtidorli o''quvchilar.',
    'Каршинская Президентская школа — для одарённых учащихся.',
    2020,440,68,ARRAY['uz','en'],
    ARRAY['Matematika','Fizika','Kimyo','Biologiya','Informatika','Ingliz tili'],
    ARRAY['Olimpiada tayyorgarlik'],NULL,NULL);

  PERFORM _seed_inst('prezident-maktabi-urganch','Urganch Prezident Maktabi','Ургенчская президентская школа',
    'LYCEUM','urganch','+998622222080','https://prezidentmaktabi.uz',NULL,NULL,
    'Urganch, Al-Xorazmiy ko''chasi 10',41.5580,60.6350,true,4.8,
    'Urganch Prezident Maktabi — iqtidorli o''quvchilar.',
    'Ургенчская Президентская школа — для одарённых учащихся.',
    2020,430,65,ARRAY['uz','en'],
    ARRAY['Matematika','Fizika','Kimyo','Biologiya','Informatika','Ingliz tili'],
    ARRAY['Olimpiada tayyorgarlik'],NULL,NULL);

  PERFORM _seed_inst('prezident-maktabi-termiz','Termiz Prezident Maktabi','Термезская президентская школа',
    'LYCEUM','termiz','+998762222080','https://prezidentmaktabi.uz',NULL,NULL,
    'Termiz, Mustakillik ko''chasi 5',37.2280,67.2820,true,4.7,
    'Termiz Prezident Maktabi — iqtidorli o''quvchilar.',
    'Термезская Президентская школа — для одарённых учащихся.',
    2021,420,62,ARRAY['uz','en'],
    ARRAY['Matematika','Fizika','Kimyo','Biologiya','Informatika','Ingliz tili'],
    ARRAY['Olimpiada tayyorgarlik'],NULL,NULL);

  -- AKADEMIK LITSEYLAR
  PERFORM _seed_inst('tdtu-akademik-litseyi','TDTU Akademik Litseyi','Академический лицей ТГТУ',
    'LYCEUM','toshkent','+998712337212','https://tdtu.uz/litsey',NULL,NULL,
    'Toshkent, Yunusobod tumani, Universitetskaya ko''chasi 2A',41.3455,69.3070,true,4.4,
    'TDTU Akademik Litseyi — texnik fanlar chuqurlashtirilgan. TDTU ga afzal qabul.',
    'Академический лицей ТГТУ — углублённые технические науки.',
    1998,600,60,ARRAY['uz','ru'],
    ARRAY['Matematika (chuqurlashtirilgan)','Fizika','Kimyo','Informatika'],
    ARRAY[]::TEXT[],300000,600000);

  PERFORM _seed_inst('tatu-akademik-litseyi','TATU Akademik Litseyi','Академический лицей ТУИТ',
    'LYCEUM','toshkent','+998712388110','https://tuit.uz/litsey',NULL,NULL,
    'Toshkent, Yunusobod tumani, Amir Temur ko''chasi 108A',41.3390,69.3055,true,4.5,
    'TATU Akademik Litseyi — IT va telekommunikatsiya yo''nalishi. TATU ga afzal qabul.',
    'Академический лицей ТУИТ — IT и телекоммуникации.',
    1997,500,50,ARRAY['uz','ru'],
    ARRAY['Informatika (chuqurlashtirilgan)','Dasturlash asoslari','Matematika','Fizika'],
    ARRAY[]::TEXT[],300000,550000);

  PERFORM _seed_inst('nuu-akademik-litseyi','NUUz Akademik Litseyi','Академический лицей НУУз',
    'LYCEUM','toshkent','+998712279700','https://nuu.uz/litsey',NULL,NULL,
    'Toshkent, Olmazor tumani, Universitet ko''chasi 4A',41.3442,69.2910,true,4.5,
    'NUUz Akademik Litseyi — tabiiy fanlar, gumanitar yo''nalishlar. NUUz ga afzal qabul.',
    'Академический лицей НУУз — естественные и гуманитарные науки.',
    1992,550,55,ARRAY['uz','ru'],
    ARRAY['Tabiiy fanlar (chuqurlashtirilgan)','Gumanitar fanlar','Matematika','Kimyo'],
    ARRAY[]::TEXT[],280000,550000);

  PERFORM _seed_inst('samdu-akademik-litseyi','SamDU Akademik Litseyi','Академический лицей СамГУ',
    'LYCEUM','samarqand','+998662339200',NULL,NULL,NULL,
    'Samarqand, Universitetski xiyoboni 15A',39.6580,66.9760,true,4.2,
    'SamDU Akademik Litseyi — tabiiy fanlar, gumanitar va ijtimoiy yo''nalishlar.',
    'Академический лицей СамГУ — естественные, гуманитарные и социальные науки.',
    1998,400,40,ARRAY['uz','ru'],
    ARRAY['Tabiiy fanlar','Gumanitar fanlar','Ijtimoiy fanlar','Informatika'],
    ARRAY[]::TEXT[],250000,500000);

  RAISE NOTICE 'Barcha muassasalar muvaffaqiyatli qo''shildi!';
END $$;

-- Funksiyani o'chirish
DROP FUNCTION IF EXISTS _seed_inst;

-- Natijani tekshirish
SELECT type, COUNT(*) AS soni FROM "Institution" GROUP BY type ORDER BY soni DESC;

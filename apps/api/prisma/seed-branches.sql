-- ============================================================
-- InstitutionBranch seed script
-- Supabase SQL Editor'da ishlatish uchun
--
-- Bu script:
-- 1. ILC, PDP Academy, Najot Ta'lim uchun filiallarni
--    InstitutionBranch jadvaliga qo'shadi
-- 2. Alohida "filial" Institution yozuvlarini o'chiradi
-- ============================================================

DO $body$
DECLARE
  -- ILC
  v_ilc_id        TEXT;
  -- PDP Academy
  v_pdp_id        TEXT;
  -- Najot Ta'lim
  v_najot_id      TEXT;

  -- City IDs
  v_toshkent_city TEXT;
  v_samarqand_city TEXT;
  v_namangan_city  TEXT;
  v_andijon_city   TEXT;
  v_fargona_city   TEXT;
  v_buxoro_city    TEXT;

  -- Region IDs
  v_toshkent_region  TEXT;
  v_samarqand_region TEXT;
  v_namangan_region  TEXT;
  v_andijon_region   TEXT;
  v_fargona_region   TEXT;
  v_buxoro_region    TEXT;

BEGIN

  -- ── City va Region ID'larini ol ──────────────────────────
  SELECT id INTO v_toshkent_city   FROM "City"   WHERE slug = 'toshkent';
  SELECT id INTO v_samarqand_city  FROM "City"   WHERE slug = 'samarqand';
  SELECT id INTO v_namangan_city   FROM "City"   WHERE slug = 'namangan';
  SELECT id INTO v_andijon_city    FROM "City"   WHERE slug = 'andijon';
  SELECT id INTO v_fargona_city    FROM "City"   WHERE slug = 'farghona';
  SELECT id INTO v_buxoro_city     FROM "City"   WHERE slug = 'buxoro';

  SELECT id INTO v_toshkent_region  FROM "Region" WHERE slug = 'toshkent-shahri';
  SELECT id INTO v_samarqand_region FROM "Region" WHERE slug = 'samarqand-viloyati';
  SELECT id INTO v_namangan_region  FROM "Region" WHERE slug = 'namangan-viloyati';
  SELECT id INTO v_andijon_region   FROM "Region" WHERE slug = 'andijon-viloyati';
  SELECT id INTO v_fargona_region   FROM "Region" WHERE slug = 'farghona-viloyati';
  SELECT id INTO v_buxoro_region    FROM "Region" WHERE slug = 'buxoro-viloyati';

  -- ── Institution ID'larini ol ─────────────────────────────
  SELECT id INTO v_ilc_id   FROM "Institution" WHERE slug = 'ilc-toshkent';
  SELECT id INTO v_pdp_id   FROM "Institution" WHERE slug = 'pdp-academy-toshkent';
  SELECT id INTO v_najot_id FROM "Institution" WHERE slug = 'najot-talim-toshkent';

  -- ════════════════════════════════════════════════════════
  -- ILC (International Language Center) — 5 filial
  -- ════════════════════════════════════════════════════════
  IF v_ilc_id IS NOT NULL THEN

    -- Bosh filial — Toshkent
    INSERT INTO "InstitutionBranch"
      (id,"institutionId","cityId","regionId","isMain","createdAt","updatedAt")
    VALUES
      (gen_random_uuid()::text, v_ilc_id, v_toshkent_city, v_toshkent_region, true, NOW(), NOW())
    ON CONFLICT DO NOTHING;

    -- Samarqand filiali
    INSERT INTO "InstitutionBranch"
      (id,"institutionId","nameUz","nameRu","cityId","regionId","isMain","createdAt","updatedAt")
    VALUES
      (gen_random_uuid()::text, v_ilc_id,
       'ILC — Samarqand filiali', 'ILC — Самаркандский филиал',
       v_samarqand_city, v_samarqand_region, false, NOW(), NOW())
    ON CONFLICT DO NOTHING;

    -- Namangan filiali
    INSERT INTO "InstitutionBranch"
      (id,"institutionId","nameUz","nameRu","cityId","regionId","isMain","createdAt","updatedAt")
    VALUES
      (gen_random_uuid()::text, v_ilc_id,
       'ILC — Namangan filiali', 'ILC — Наманганский филиал',
       v_namangan_city, v_namangan_region, false, NOW(), NOW())
    ON CONFLICT DO NOTHING;

    -- Andijon filiali
    INSERT INTO "InstitutionBranch"
      (id,"institutionId","nameUz","nameRu","cityId","regionId","isMain","createdAt","updatedAt")
    VALUES
      (gen_random_uuid()::text, v_ilc_id,
       'ILC — Andijon filiali', 'ILC — Андижанский филиал',
       v_andijon_city, v_andijon_region, false, NOW(), NOW())
    ON CONFLICT DO NOTHING;

    -- Buxoro filiali
    INSERT INTO "InstitutionBranch"
      (id,"institutionId","nameUz","nameRu","cityId","regionId","isMain","createdAt","updatedAt")
    VALUES
      (gen_random_uuid()::text, v_ilc_id,
       'ILC — Buxoro filiali', 'ILC — Бухарский филиал',
       v_buxoro_city, v_buxoro_region, false, NOW(), NOW())
    ON CONFLICT DO NOTHING;

    -- Bog'liq Subscription yozuvlarini o'chir
    DELETE FROM "Subscription"
    WHERE "institutionId" IN (
      SELECT id FROM "Institution"
      WHERE slug IN ('ilc-samarqand','ilc-namangan','ilc-andijon','ilc-buxoro')
    );
    -- Alohida yozilgan filial Institution'larni o'chir
    DELETE FROM "Institution"
    WHERE slug IN ('ilc-samarqand','ilc-namangan','ilc-andijon','ilc-buxoro');

    RAISE NOTICE 'ILC: 5 filial qo''shildi';
  ELSE
    RAISE NOTICE 'ILC topilmadi (ilc-toshkent)';
  END IF;

  -- ════════════════════════════════════════════════════════
  -- PDP Academy — 3 filial
  -- ════════════════════════════════════════════════════════
  IF v_pdp_id IS NOT NULL THEN

    -- Bosh filial — Toshkent
    INSERT INTO "InstitutionBranch"
      (id,"institutionId","cityId","regionId","isMain","createdAt","updatedAt")
    VALUES
      (gen_random_uuid()::text, v_pdp_id, v_toshkent_city, v_toshkent_region, true, NOW(), NOW())
    ON CONFLICT DO NOTHING;

    -- Samarqand filiali
    INSERT INTO "InstitutionBranch"
      (id,"institutionId","nameUz","nameRu","cityId","regionId","isMain","createdAt","updatedAt")
    VALUES
      (gen_random_uuid()::text, v_pdp_id,
       'PDP Academy — Samarqand filiali', 'PDP Academy — Самарканд',
       v_samarqand_city, v_samarqand_region, false, NOW(), NOW())
    ON CONFLICT DO NOTHING;

    -- Namangan filiali
    INSERT INTO "InstitutionBranch"
      (id,"institutionId","nameUz","nameRu","cityId","regionId","isMain","createdAt","updatedAt")
    VALUES
      (gen_random_uuid()::text, v_pdp_id,
       'PDP Academy — Namangan filiali', 'PDP Academy — Наманган',
       v_namangan_city, v_namangan_region, false, NOW(), NOW())
    ON CONFLICT DO NOTHING;

    -- Bog'liq Subscription yozuvlarini o'chir
    DELETE FROM "Subscription"
    WHERE "institutionId" IN (
      SELECT id FROM "Institution"
      WHERE slug IN ('pdp-academy-samarqand','pdp-academy-namangan')
    );
    -- Alohida filial Institution'larni o'chir
    DELETE FROM "Institution"
    WHERE slug IN ('pdp-academy-samarqand','pdp-academy-namangan');

    RAISE NOTICE 'PDP Academy: 3 filial qo''shildi';
  ELSE
    RAISE NOTICE 'PDP Academy topilmadi (pdp-academy-toshkent)';
  END IF;

  -- ════════════════════════════════════════════════════════
  -- Najot Ta'lim — 5 filial
  -- ════════════════════════════════════════════════════════
  IF v_najot_id IS NOT NULL THEN

    -- Bosh filial — Toshkent
    INSERT INTO "InstitutionBranch"
      (id,"institutionId","cityId","regionId","isMain","createdAt","updatedAt")
    VALUES
      (gen_random_uuid()::text, v_najot_id, v_toshkent_city, v_toshkent_region, true, NOW(), NOW())
    ON CONFLICT DO NOTHING;

    -- Samarqand filiali
    INSERT INTO "InstitutionBranch"
      (id,"institutionId","nameUz","nameRu","cityId","regionId","isMain","createdAt","updatedAt")
    VALUES
      (gen_random_uuid()::text, v_najot_id,
       'Najot Ta''lim — Samarqand filiali', 'Najot Ta''lim — Самарканд',
       v_samarqand_city, v_samarqand_region, false, NOW(), NOW())
    ON CONFLICT DO NOTHING;

    -- Andijon filiali
    INSERT INTO "InstitutionBranch"
      (id,"institutionId","nameUz","nameRu","cityId","regionId","isMain","createdAt","updatedAt")
    VALUES
      (gen_random_uuid()::text, v_najot_id,
       'Najot Ta''lim — Andijon filiali', 'Najot Ta''lim — Андижан',
       v_andijon_city, v_andijon_region, false, NOW(), NOW())
    ON CONFLICT DO NOTHING;

    -- Farg'ona filiali
    INSERT INTO "InstitutionBranch"
      (id,"institutionId","nameUz","nameRu","cityId","regionId","isMain","createdAt","updatedAt")
    VALUES
      (gen_random_uuid()::text, v_najot_id,
       'Najot Ta''lim — Farg''ona filiali', 'Najot Ta''lim — Фергана',
       v_fargona_city, v_fargona_region, false, NOW(), NOW())
    ON CONFLICT DO NOTHING;

    -- Buxoro filiali
    INSERT INTO "InstitutionBranch"
      (id,"institutionId","nameUz","nameRu","cityId","regionId","isMain","createdAt","updatedAt")
    VALUES
      (gen_random_uuid()::text, v_najot_id,
       'Najot Ta''lim — Buxoro filiali', 'Najot Ta''lim — Бухара',
       v_buxoro_city, v_buxoro_region, false, NOW(), NOW())
    ON CONFLICT DO NOTHING;

    -- Bog'liq Subscription yozuvlarini o'chir
    DELETE FROM "Subscription"
    WHERE "institutionId" IN (
      SELECT id FROM "Institution"
      WHERE slug IN ('najot-talim-samarqand','najot-talim-andijon','najot-talim-fargona','najot-talim-buxoro')
    );
    -- Alohida filial Institution'larni o'chir
    DELETE FROM "Institution"
    WHERE slug IN ('najot-talim-samarqand','najot-talim-andijon','najot-talim-fargona','najot-talim-buxoro');

    RAISE NOTICE 'Najot Ta''lim: 5 filial qo''shildi';
  ELSE
    RAISE NOTICE 'Najot Ta''lim topilmadi (najot-talim-toshkent)';
  END IF;

END;
$body$;

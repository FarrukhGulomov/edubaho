import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { InstitutionType, InstitutionStatus, DeliveryMode } from '@prisma/client'
import { indexInstitution, removeFromIndex } from '../../services/searchService'
import { notifyUser } from '../../services/notify'
import { logAdminAction } from '../../services/auditLog'
import { normalizeInstitutionName } from '../../utils/normalizeName'
import { mergeInstitutions } from '../../services/mergeInstitutionService'
import { isStorageConfigured, uploadImage, deleteImage, keyFromPublicUrl } from '../../services/storageService'
import { approvedClaimSelect, withVerificationLevel } from '../../utils/verification'
import sharp from 'sharp'
import { randomUUID } from 'crypto'

/**
 * `nameUz` bo'yicha (normallashtirilgan `nameKey` orqali) takroriy
 * muassasa yaratilishining oldini oladi — bir xil muassasaning turli
 * shaharlardagi filiallari alohida-alohida Institution sifatida emas,
 * InstitutionBranch orqali BITTA yozuvga bog'lanishi kerak.
 */
async function checkNameKeyConflict(prisma: PrismaClient, nameUz: string, excludeId?: string) {
  const nameKey = normalizeInstitutionName(nameUz)
  const conflict = await prisma.institution.findFirst({
    where: { nameKey, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true, nameUz: true, slug: true },
  })
  return { nameKey, conflict }
}

function nameConflictResponse(conflict: { id: string; nameUz: string; slug: string }) {
  return {
    error: `"${conflict.nameUz}" nomli muassasa allaqachon mavjud. Agar bu — shu muassasaning boshqa shahardagi filiali bo'lsa, uni alohida qo'shmang, "${conflict.nameUz}" muassasasini tahrirlab "Filiallar" bo'limiga qo'shing.`,
    existingInstitution: conflict,
  }
}

const branchInputSchema = z.object({
  // Mavjud filialni tahrirlashda beriladi — bo'lmasa yangi filial deb hisoblanadi
  id:      z.string().optional(),
  nameUz:  z.string().optional().or(z.literal('')),
  nameRu:  z.string().optional().or(z.literal('')),
  cityId:  z.string().min(1, 'Filial shahri majburiy'),
  address: z.string().optional().or(z.literal('')),
  phone:   z.string().optional().or(z.literal('')),
  lat:     z.coerce.number().min(-90).max(90).optional().or(z.literal('')),
  lng:     z.coerce.number().min(-180).max(180).optional().or(z.literal('')),
  isMain:  z.boolean().optional().default(false),
})
type BranchInput = z.infer<typeof branchInputSchema>

/**
 * Filiallar ro'yxatidagi har bir shahar haqiqatda mavjudligini tekshiradi
 * va InstitutionBranch uchun majburiy regionId'ni City'dan oladi
 * (branch formasida faqat shahar tanlanadi, viloyat avtomatik olinadi).
 */
async function resolveBranchCreateData(prisma: PrismaClient, branches: BranchInput[]) {
  const cityIds = [...new Set(branches.map((b) => b.cityId))]
  const cities = await prisma.city.findMany({ where: { id: { in: cityIds } }, select: { id: true, regionId: true } })
  const regionByCity = new Map(cities.map((c) => [c.id, c.regionId]))

  for (const b of branches) {
    if (!regionByCity.has(b.cityId)) {
      return { data: null, error: "Filiallardan biri uchun noto'g'ri shahar tanlangan" }
    }
  }

  return {
    data: branches.map((b) => ({
      // Mavjud filialni tahrirlashda beriladi (yangilashda ishlatiladi,
      // yaratishda Prisma buni e'tiborsiz qoldiradi — cuid o'zi hosil bo'ladi)
      id:       b.id,
      nameUz:   b.nameUz  || undefined,
      nameRu:   b.nameRu  || undefined,
      cityId:   b.cityId,
      regionId: regionByCity.get(b.cityId)!,
      address:  b.address || undefined,
      phone:    b.phone   || undefined,
      lat:      b.lat === '' || b.lat === undefined ? undefined : Number(b.lat),
      lng:      b.lng === '' || b.lng === undefined ? undefined : Number(b.lng),
      isMain:   b.isMain ?? false,
    })),
    error: null,
  }
}

/**
 * Admin muassasalar CRUD routes
 * Barcha endpointlar 🛡️ ADMIN roli talab qiladi
 *
 * GET    /admin/institutions           — Ro'yxat (barcha statuslar)
 * POST   /admin/institutions           — Yangi muassasa yaratish
 * GET    /admin/institutions/:id       — Bitta muassasa (tahrirlash uchun)
 * PATCH  /admin/institutions/:id       — Yangilash
 * DELETE /admin/institutions/:id       — O'chirish
 * PATCH  /admin/institutions/:id/status — Status o'zgartirish
 * PATCH  /admin/institutions/:id/verify — Tasdiqlash toggle
 */
export default async function adminInstitutionRoutes(fastify: FastifyInstance) {
  const { prisma } = fastify

  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', fastify.requireAdmin)

  // ─────────────────────────────────────────────
  // GET /admin/institutions
  // ─────────────────────────────────────────────

  const listQuerySchema = z.object({
    q:      z.string().optional(),
    type:   z.nativeEnum(InstitutionType).optional(),
    status: z.nativeEnum(InstitutionStatus).optional(),
    page:   z.coerce.number().int().min(1).optional().default(1),
    limit:  z.coerce.number().int().min(1).max(100).optional().default(20),
  })

  fastify.get('/admin/institutions', async (request, reply) => {
    const { q, type, status, page, limit } = listQuerySchema.parse(request.query)
    const skip = (page - 1) * limit

    const where = {
      ...(type && { type }),
      ...(status && { status }),
      ...(q && {
        OR: [
          { nameUz: { contains: q, mode: 'insensitive' as const } },
          { nameRu: { contains: q, mode: 'insensitive' as const } },
          { slug:   { contains: q, mode: 'insensitive' as const } },
        ],
      }),
    }

    const [institutions, total] = await Promise.all([
      prisma.institution.findMany({
        where,
        select: {
          id: true, nameUz: true, nameRu: true, slug: true,
          type: true, status: true, isVerified: true,
          claims: approvedClaimSelect,
          avgRating: true, reviewCount: true, viewCount: true,
          phone: true, telegram: true, createdAt: true,
          city: { select: { nameUz: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.institution.count({ where }),
    ])

    return reply.send({
      data: institutions.map(withVerificationLevel),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    })
  })

  // ─────────────────────────────────────────────
  // POST /admin/institutions — Yaratish
  // ─────────────────────────────────────────────

  const createSchema = z.object({
    nameUz:      z.string().min(2, "O'zbek nomi kamida 2 belgi"),
    nameRu:      z.string().optional(),
    slug:        z.string().min(2, 'Slug kamida 2 belgi').regex(/^[a-z0-9-]+$/, 'Slug faqat kichik harf, raqam va tire'),
    type:        z.nativeEnum(InstitutionType),
    status:      z.nativeEnum(InstitutionStatus).optional().default(InstitutionStatus.PENDING),
    isVerified:  z.boolean().optional().default(false),
    // UTP#2: faqat probnoy dars xizmatini taklif qiladigan muassasalarda yoqiladi
    trialLessonEnabled: z.boolean().optional().default(false),
    // EduFit moslik algoritmi: onlayn/gibrid markazlar shahar mos kelmasa ham tavsiya qilinadi
    deliveryMode: z.nativeEnum(DeliveryMode).optional().default(DeliveryMode.OFFLINE),
    phone:       z.string().optional(),
    phone2:      z.string().optional(),
    email:       z.string().email().optional().or(z.literal('')),
    website:     z.string().optional().or(z.literal('')),
    telegram:    z.string().optional(),
    instagram:   z.string().optional(),
    address:     z.string().optional(),
    cityId:      z.string().min(1).optional().or(z.literal('')),
    // Admin Import Yordamchisi (Google Places) orqali to'ldirilishi mumkin —
    // "yaqin atrofdagi muassasalar" funksiyasi uchun ishlatiladi
    lat:         z.coerce.number().min(-90).max(90).optional().or(z.literal('')),
    lng:         z.coerce.number().min(-180).max(180).optional().or(z.literal('')),
    // Details
    descriptionUz: z.string().optional(),
    descriptionRu: z.string().optional(),
    foundedYear:   z.coerce.number().int().min(1800).max(2100).optional().or(z.literal('')),
    studentCount:  z.coerce.number().int().min(0).optional().or(z.literal('')),
    teacherCount:  z.coerce.number().int().min(0).optional().or(z.literal('')),
    languages:       z.array(z.string()).optional().default([]),
    programs:        z.array(z.string()).optional().default([]),
    specializations: z.array(z.string()).optional().default([]),
    shifts:          z.array(z.string()).optional().default([]),
    achievements:    z.string().optional(),
    // EduFit Ta'lim profili: muassasa qattiq belgilagan yo'nalishlar
    // (moslik algoritmida qattiq filtr sifatida ishlatiladi)
    categories:      z.array(z.string()).optional().default([]),
    // Pricing
    monthlyMin:    z.coerce.number().int().min(0).optional().or(z.literal('')),
    monthlyMax:    z.coerce.number().int().min(0).optional().or(z.literal('')),
    paymentMethods: z.array(z.string()).optional().default([]),
    // Filiallar — barchasi shu muassasaga tegishli, alohida Institution
    // sifatida EMAS (masalan "PDP academy" Buxoro/Farg'ona/Toshkent filiallari)
    branches: z.array(branchInputSchema).optional().default([]),
  })

  fastify.post('/admin/institutions', async (request, reply) => {
    const body = createSchema.parse(request.body)

    // Slug takrorlanmasligini tekshirish
    const existing = await prisma.institution.findUnique({ where: { slug: body.slug } })
    if (existing) {
      return reply.status(409).send({ error: 'Bu slug allaqachon mavjud' })
    }

    // Nom takrorlanmasligini tekshirish (bir xil muassasa turli shaharlar
    // uchun alohida-alohida yaratilmasligi kerak — filiallar orqali bog'lanadi)
    const { nameKey, conflict } = await checkNameKeyConflict(prisma, body.nameUz)
    if (conflict) {
      return reply.status(409).send(nameConflictResponse(conflict))
    }

    const { data: branchData, error: branchError } = await resolveBranchCreateData(prisma, body.branches)
    if (branchError) {
      return reply.status(400).send({ error: branchError })
    }

    const {
      descriptionUz, descriptionRu, foundedYear, studentCount, teacherCount,
      languages, programs, specializations, shifts, achievements, categories,
      monthlyMin, monthlyMax, paymentMethods, branches,
      cityId, email, website, lat, lng, ...main
    } = body

    const institution = await prisma.institution.create({
      data: {
        ...main,
        nameKey,
        email:   email   || undefined,
        website: website || undefined,
        cityId:  cityId  || undefined,
        lat:     lat === '' || lat === undefined ? undefined : Number(lat),
        lng:     lng === '' || lng === undefined ? undefined : Number(lng),
        details: (descriptionUz || descriptionRu || foundedYear || studentCount || teacherCount
          || languages?.length || programs?.length || specializations?.length || categories?.length) ? {
          create: {
            descriptionUz:   descriptionUz   || undefined,
            descriptionRu:   descriptionRu   || undefined,
            foundedYear:     foundedYear     ? Number(foundedYear)  : undefined,
            studentCount:    studentCount    ? Number(studentCount) : undefined,
            teacherCount:    teacherCount    ? Number(teacherCount) : undefined,
            languages:       languages       ?? [],
            programs:        programs        ?? [],
            specializations: specializations ?? [],
            shifts:          shifts          ?? [],
            achievements:    achievements    || undefined,
            categories:      categories      ?? [],
          },
        } : undefined,
        pricing: (monthlyMin || monthlyMax) ? {
          create: {
            monthlyMin:     monthlyMin ? Number(monthlyMin) : undefined,
            monthlyMax:     monthlyMax ? Number(monthlyMax) : undefined,
            paymentMethods: paymentMethods ?? [],
          },
        } : undefined,
        branches: branchData && branchData.length > 0 ? { create: branchData } : undefined,
      },
      include: {
        city:    { select: { nameUz: true } },
        details: { select: { descriptionUz: true, descriptionRu: true, programs: true, specializations: true } },
        pricing: { select: { monthlyMin: true } },
      },
    })

    // Meilisearch'ga indexlaymiz (ACTIVE yoki PREMIUM bo'lsa)
    if (['ACTIVE', 'PREMIUM'].includes(institution.status)) {
      indexInstitution(institution).catch((err) => fastify.log.warn(err, 'Meilisearch indexlashda xato'))
    }

    logAdminAction(prisma, request, {
      action: 'institution.create',
      entityType: 'Institution',
      entityId: institution.id,
      entityLabel: institution.nameUz,
      after: { status: institution.status, type: institution.type },
    })

    return reply.status(201).send({ data: { id: institution.id, slug: institution.slug, nameUz: institution.nameUz }, message: 'Muassasa yaratildi' })
  })

  // ─────────────────────────────────────────────
  // GET /admin/institutions/:id — Tahrirlash uchun
  // ─────────────────────────────────────────────

  fastify.get<{ Params: { id: string } }>('/admin/institutions/:id', async (request, reply) => {
    const { id } = request.params

    const institution = await prisma.institution.findUnique({
      where: { id },
      include: {
        details:  true,
        pricing:  true,
        city:     { select: { id: true, nameUz: true } },
        branches: {
          orderBy: [{ isMain: 'desc' }, { createdAt: 'asc' }],
          include: { city: { select: { id: true, nameUz: true, nameRu: true } } },
        },
        media: {
          where: { type: 'IMAGE' },
          orderBy: { sortOrder: 'asc' },
          select: { id: true, url: true, thumbnailUrl: true },
        },
      },
    })

    if (!institution) {
      return reply.status(404).send({ error: 'Muassasa topilmadi' })
    }

    return reply.send({ data: institution })
  })

  // ─────────────────────────────────────────────
  // PATCH /admin/institutions/:id — Yangilash
  // ─────────────────────────────────────────────

  const updateSchema = createSchema.partial()

  fastify.patch<{ Params: { id: string } }>('/admin/institutions/:id', async (request, reply) => {
    const { id } = request.params
    const body = updateSchema.parse(request.body)

    const institution = await prisma.institution.findUnique({ where: { id } })
    if (!institution) {
      return reply.status(404).send({ error: 'Muassasa topilmadi' })
    }

    // Slug o'zgarsa — takrorlanishini tekshirish
    if (body.slug && body.slug !== institution.slug) {
      const existing = await prisma.institution.findUnique({ where: { slug: body.slug } })
      if (existing) {
        return reply.status(409).send({ error: 'Bu slug allaqachon mavjud' })
      }
    }

    // Nom o'zgarsa — takrorlanishini tekshirish
    let nameKey: string | undefined
    if (body.nameUz !== undefined && body.nameUz !== institution.nameUz) {
      const check = await checkNameKeyConflict(prisma, body.nameUz, id)
      if (check.conflict) {
        return reply.status(409).send(nameConflictResponse(check.conflict))
      }
      nameKey = check.nameKey
    }

    let branchData: Awaited<ReturnType<typeof resolveBranchCreateData>>['data'] | undefined
    if (body.branches !== undefined) {
      const resolved = await resolveBranchCreateData(prisma, body.branches)
      if (resolved.error) {
        return reply.status(400).send({ error: resolved.error })
      }
      branchData = resolved.data
    }

    const {
      descriptionUz, descriptionRu, foundedYear, studentCount, teacherCount,
      languages, programs, specializations, shifts, achievements, categories,
      monthlyMin, monthlyMax, paymentMethods, branches,
      cityId, email, website, lat, lng, ...main
    } = body

    // Main update
    await prisma.institution.update({
      where: { id },
      data: {
        ...main,
        nameKey,
        email:   email   !== undefined ? (email   || null) : undefined,
        website: website !== undefined ? (website || null) : undefined,
        cityId:  cityId  !== undefined ? (cityId  || null) : undefined,
        lat:     lat !== undefined ? (lat === '' ? null : Number(lat)) : undefined,
        lng:     lng !== undefined ? (lng === '' ? null : Number(lng)) : undefined,
      },
    })

    // Filiallar — butun ro'yxat "Saqlash"da almashtiriladi (formadagi
    // qatorlar bilan sinxron): o'chirilganlar o'chiriladi, id'siz yangilari
    // yaratiladi, mavjud id'lilar yangilanadi
    if (branches !== undefined && branchData) {
      const existingBranches = await prisma.institutionBranch.findMany({
        where: { institutionId: id }, select: { id: true },
      })
      const existingIds = new Set(existingBranches.map((b) => b.id))
      const incomingIds = new Set(branchData.filter((b) => b.id).map((b) => b.id!))
      const toDelete = [...existingIds].filter((bid) => !incomingIds.has(bid))

      await prisma.$transaction([
        ...(toDelete.length > 0 ? [prisma.institutionBranch.deleteMany({ where: { id: { in: toDelete } } })] : []),
        ...branchData.map(({ id: branchId, ...data }) =>
          branchId && existingIds.has(branchId)
            ? prisma.institutionBranch.update({ where: { id: branchId }, data })
            : prisma.institutionBranch.create({ data: { ...data, institutionId: id } }),
        ),
      ])
    }

    // Details upsert
    if (descriptionUz !== undefined || descriptionRu !== undefined ||
        foundedYear   !== undefined || studentCount  !== undefined ||
        teacherCount  !== undefined || languages     !== undefined ||
        programs      !== undefined || specializations !== undefined ||
        shifts        !== undefined || achievements  !== undefined ||
        categories    !== undefined) {
      await prisma.institutionDetail.upsert({
        where:  { institutionId: id },
        create: {
          institutionId:   id,
          descriptionUz:   descriptionUz   || undefined,
          descriptionRu:   descriptionRu   || undefined,
          foundedYear:     foundedYear     ? Number(foundedYear)  : undefined,
          studentCount:    studentCount    ? Number(studentCount) : undefined,
          teacherCount:    teacherCount    ? Number(teacherCount) : undefined,
          languages:       languages       ?? [],
          programs:        programs        ?? [],
          specializations: specializations ?? [],
          shifts:          shifts          ?? [],
          achievements:    achievements    || undefined,
          categories:      categories      ?? [],
        },
        update: {
          descriptionUz:   descriptionUz   !== undefined ? (descriptionUz   || null) : undefined,
          descriptionRu:   descriptionRu   !== undefined ? (descriptionRu   || null) : undefined,
          foundedYear:     foundedYear     !== undefined ? (foundedYear     ? Number(foundedYear)  : null) : undefined,
          studentCount:    studentCount    !== undefined ? (studentCount    ? Number(studentCount) : null) : undefined,
          teacherCount:    teacherCount    !== undefined ? (teacherCount    ? Number(teacherCount) : null) : undefined,
          languages:       languages       ?? undefined,
          programs:        programs        ?? undefined,
          specializations: specializations ?? undefined,
          shifts:          shifts          ?? undefined,
          achievements:    achievements    !== undefined ? (achievements    || null) : undefined,
          categories:      categories      ?? undefined,
        },
      })
    }

    // Pricing upsert
    if (monthlyMin !== undefined || monthlyMax !== undefined || paymentMethods !== undefined) {
      // UTP#4: narx tushganini aniqlash uchun eski narxni oldindan olamiz
      const oldPricing = monthlyMin !== undefined
        ? await prisma.institutionPricing.findUnique({ where: { institutionId: id }, select: { monthlyMin: true } })
        : null

      await prisma.institutionPricing.upsert({
        where:  { institutionId: id },
        create: {
          institutionId: id,
          monthlyMin:     monthlyMin ? Number(monthlyMin) : undefined,
          monthlyMax:     monthlyMax ? Number(monthlyMax) : undefined,
          paymentMethods: paymentMethods ?? [],
        },
        update: {
          monthlyMin:     monthlyMin !== undefined ? (monthlyMin ? Number(monthlyMin) : null) : undefined,
          monthlyMax:     monthlyMax !== undefined ? (monthlyMax ? Number(monthlyMax) : null) : undefined,
          paymentMethods: paymentMethods ?? undefined,
        },
      })

      // UTP#4: narx pasaysa — shu muassasani saqlagan foydalanuvchilarga proaktiv push
      const newMonthlyMin = monthlyMin ? Number(monthlyMin) : null
      if (oldPricing?.monthlyMin != null && newMonthlyMin != null && newMonthlyMin < oldPricing.monthlyMin) {
        const savers = await prisma.savedInstitution.findMany({
          where: { institutionId: id },
          select: { userId: true },
        })
        const fmtUzs = (n: number) => `${n.toLocaleString('ru-RU').replace(/,/g, ' ')} so'm`
        for (const { userId } of savers) {
          notifyUser(prisma, {
            userId,
            type: 'saved_institution_price_drop',
            title: 'Saqlangan muassasada narx tushdi!',
            body: `${institution.nameUz} — endi oyiga ${fmtUzs(newMonthlyMin)} (avval ${fmtUzs(oldPricing.monthlyMin)}).`,
            data: { institutionId: id, slug: institution.slug, oldPrice: oldPricing.monthlyMin, newPrice: newMonthlyMin },
          })
        }
      }
    }

    // Meilisearch indexini yangilaymiz
    const refreshed = await prisma.institution.findUnique({
      where: { id },
      include: {
        city:    { select: { nameUz: true } },
        details: { select: { descriptionUz: true, descriptionRu: true, programs: true, specializations: true } },
        pricing: { select: { monthlyMin: true } },
      },
    })
    if (refreshed) {
      if (['ACTIVE', 'PREMIUM'].includes(refreshed.status)) {
        indexInstitution(refreshed).catch((err) => fastify.log.warn(err, 'Meilisearch indexlashda xato'))
      } else {
        removeFromIndex(id).catch((err) => fastify.log.warn(err, 'Meilisearch o\'chirishda xato'))
      }
    }

    logAdminAction(prisma, request, {
      action: 'institution.update',
      entityType: 'Institution',
      entityId: id,
      entityLabel: institution.nameUz,
      before: { nameUz: institution.nameUz, status: institution.status, isVerified: institution.isVerified },
      after: body,
    })

    return reply.send({ message: 'Muassasa yangilandi' })
  })

  // ─────────────────────────────────────────────
  // DELETE /admin/institutions/:id
  // ─────────────────────────────────────────────

  fastify.delete<{ Params: { id: string } }>('/admin/institutions/:id', async (request, reply) => {
    const { id } = request.params

    const institution = await prisma.institution.findUnique({ where: { id } })
    if (!institution) {
      return reply.status(404).send({ error: 'Muassasa topilmadi' })
    }

    // Cascade yo'q bo'lgan bog'liq jadvallarni avval o'chiramiz
    await prisma.$transaction([
      prisma.analyticsEvent.deleteMany({ where: { institutionId: id } }),
      prisma.savedInstitution.deleteMany({ where: { institutionId: id } }),
      prisma.institutionClaim.deleteMany({ where: { institutionId: id } }),
      prisma.subscription.deleteMany({ where: { institutionId: id } }),
      prisma.review.deleteMany({ where: { institutionId: id } }),
      prisma.institution.delete({ where: { id } }),
    ])

    // Meilisearch'dan o'chiramiz
    removeFromIndex(id).catch((err) => fastify.log.warn(err, 'Meilisearch o\'chirishda xato'))

    logAdminAction(prisma, request, {
      action: 'institution.delete',
      entityType: 'Institution',
      entityId: id,
      entityLabel: institution.nameUz,
      before: { nameUz: institution.nameUz, status: institution.status },
    })

    return reply.send({ message: "Muassasa o'chirildi" })
  })

  // ─────────────────────────────────────────────
  // PATCH /admin/institutions/:id/status
  // ─────────────────────────────────────────────

  const statusSchema = z.object({
    status: z.nativeEnum(InstitutionStatus),
  })

  fastify.patch<{ Params: { id: string } }>('/admin/institutions/:id/status', async (request, reply) => {
    const { id } = request.params
    const { status } = statusSchema.parse(request.body)

    const institution = await prisma.institution.findUnique({ where: { id } })
    if (!institution) {
      return reply.status(404).send({ error: 'Muassasa topilmadi' })
    }

    const updated = await prisma.institution.update({
      where: { id },
      data: { status },
      include: {
        city:    { select: { nameUz: true } },
        details: { select: { descriptionUz: true, descriptionRu: true, programs: true, specializations: true } },
        pricing: { select: { monthlyMin: true } },
      },
    })

    // Meilisearch indexini yangilaymiz
    if (['ACTIVE', 'PREMIUM'].includes(status)) {
      indexInstitution(updated).catch((err) => fastify.log.warn(err, 'Meilisearch indexlashda xato'))
    } else {
      removeFromIndex(id).catch((err) => fastify.log.warn(err, 'Meilisearch o\'chirishda xato'))
    }

    logAdminAction(prisma, request, {
      action: 'institution.status_change',
      entityType: 'Institution',
      entityId: id,
      entityLabel: institution.nameUz,
      before: { status: institution.status },
      after: { status },
    })

    return reply.send({ message: `Status ${status} ga o'zgartirildi` })
  })

  // ─────────────────────────────────────────────
  // PATCH /admin/institutions/:id/verify
  // ─────────────────────────────────────────────

  fastify.patch<{ Params: { id: string } }>('/admin/institutions/:id/verify', async (request, reply) => {
    const { id } = request.params

    const institution = await prisma.institution.findUnique({
      where: { id },
      select: { isVerified: true, claims: approvedClaimSelect },
    })
    if (!institution) {
      return reply.status(404).send({ error: 'Muassasa topilmadi' })
    }

    const isVerified = !institution.isVerified
    await prisma.institution.update({ where: { id }, data: { isVerified } })

    logAdminAction(prisma, request, {
      action: 'institution.verify_toggle',
      entityType: 'Institution',
      entityId: id,
      before: { isVerified: institution.isVerified },
      after: { isVerified },
    })

    const { verificationLevel } = withVerificationLevel({ isVerified, claims: institution.claims })
    return reply.send({ isVerified, verificationLevel, message: isVerified ? 'Muassasa tasdiqlandi' : 'Tasdiq bekor qilindi' })
  })

  // ─────────────────────────────────────────────
  // GET /admin/institutions/search — "Birlashtirish" uchun nishonni tanlash
  // ─────────────────────────────────────────────

  const mergeSearchSchema = z.object({
    q: z.string().min(2, 'Kamida 2 belgi kiriting'),
  })

  fastify.get('/admin/institutions/search', async (request, reply) => {
    const { q } = mergeSearchSchema.parse(request.query)

    const institutions = await prisma.institution.findMany({
      where: {
        OR: [
          { nameUz: { contains: q, mode: 'insensitive' } },
          { nameRu: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, nameUz: true, nameRu: true, slug: true, type: true, city: { select: { nameUz: true } } },
      take: 10,
    })

    return reply.send({ data: institutions })
  })

  // ─────────────────────────────────────────────
  // POST /admin/institutions/:id/merge-into — takroriy yozuvni filialga aylantirish
  // ─────────────────────────────────────────────

  const mergeSchema = z.object({
    // :id (duplicate) shu asosiy muassasaga FILIAL sifatida qo'shiladi va o'chiriladi
    targetId: z.string().min(1, "Asosiy muassasa tanlanmagan"),
  })

  fastify.post<{ Params: { id: string } }>('/admin/institutions/:id/merge-into', async (request, reply) => {
    const { id } = request.params
    const { targetId } = mergeSchema.parse(request.body)

    if (id === targetId) {
      return reply.status(400).send({ error: "Muassasani o'ziga birlashtirib bo'lmaydi" })
    }

    const [duplicate, primary] = await Promise.all([
      prisma.institution.findUnique({ where: { id }, select: { nameUz: true } }),
      prisma.institution.findUnique({ where: { id: targetId }, select: { nameUz: true } }),
    ])
    if (!duplicate) return reply.status(404).send({ error: 'Birlashtiriladigan muassasa topilmadi' })
    if (!primary) return reply.status(404).send({ error: 'Asosiy muassasa topilmadi' })

    try {
      const result = await mergeInstitutions(prisma, targetId, id)

      logAdminAction(prisma, request, {
        action: 'institution.merge',
        entityType: 'Institution',
        entityId: targetId,
        entityLabel: `${duplicate.nameUz} → ${primary.nameUz}`,
        after: result,
      })

      return reply.send({
        message: `"${duplicate.nameUz}" muassasasi "${primary.nameUz}" ga filial sifatida birlashtirildi`,
        data: result,
      })
    } catch (err) {
      fastify.log.error(err, 'Muassasalarni birlashtirishda xato')
      return reply.status(500).send({ error: 'Birlashtirishda xatolik yuz berdi' })
    }
  })

  // ─────────────────────────────────────────────
  // POST /admin/institutions/:id/media — rasm yuklash
  // ─────────────────────────────────────────────

  const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
  const MAX_PHOTOS_PER_INSTITUTION = 20

  fastify.post<{ Params: { id: string } }>('/admin/institutions/:id/media', async (request, reply) => {
    const { id } = request.params

    if (!isStorageConfigured()) {
      return reply.status(503).send({
        error: "Rasm saqlash xizmati sozlanmagan (Cloudflare R2). Serverga R2_* muhit o'zgaruvchilarini qo'shing.",
      })
    }

    const institution = await prisma.institution.findUnique({ where: { id }, select: { id: true, nameUz: true } })
    if (!institution) return reply.status(404).send({ error: 'Muassasa topilmadi' })

    const existingCount = await prisma.institutionMedia.count({ where: { institutionId: id } })
    if (existingCount >= MAX_PHOTOS_PER_INSTITUTION) {
      return reply.status(400).send({ error: `Ko'pi bilan ${MAX_PHOTOS_PER_INSTITUTION} ta rasm yuklash mumkin` })
    }

    const created: { id: string; url: string; thumbnailUrl: string | null }[] = []
    const warnings: string[] = []
    let sortOrder = existingCount

    try {
      // Bir nechta fayl bitta so'rovda kelishi mumkin (multipart/form-data)
      for await (const part of request.files()) {
        if (existingCount + created.length >= MAX_PHOTOS_PER_INSTITUTION) break

        if (!ALLOWED_IMAGE_MIME.has(part.mimetype)) {
          warnings.push(`${part.filename}: qo'llab-quvvatlanmaydigan fayl turi`)
          continue
        }

        const raw = await part.toBuffer()

        // Katta original o'rniga optimallashtirilgan WebP + kichik thumbnail —
        // sahifa yuklanish tezligi (Core Web Vitals) uchun muhim: rasmsiz
        // sahifa qanchalik yomon bo'lsa, og'ir, optimallashtirilmagan
        // rasm ham xuddi shunday zarar keltiradi.
        let optimized: Buffer
        let thumb: Buffer
        try {
          optimized = await sharp(raw).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer()
          thumb = await sharp(raw).rotate().resize({ width: 480, withoutEnlargement: true }).webp({ quality: 75 }).toBuffer()
        } catch {
          warnings.push(`${part.filename}: rasm sifatida o'qib bo'lmadi`)
          continue
        }

        const uid = randomUUID()
        const [url, thumbnailUrl] = await Promise.all([
          uploadImage(optimized, `institutions/${id}/${uid}.webp`, 'image/webp'),
          uploadImage(thumb, `institutions/${id}/${uid}-thumb.webp`, 'image/webp'),
        ])

        const media = await prisma.institutionMedia.create({
          data: { institutionId: id, url, thumbnailUrl, type: 'IMAGE', sortOrder },
        })
        sortOrder++
        created.push({ id: media.id, url: media.url, thumbnailUrl: media.thumbnailUrl })
      }
    } catch (err) {
      fastify.log.error(err, 'Rasm yuklashda xato')
      return reply.status(500).send({ error: 'Rasm yuklashda xatolik yuz berdi' })
    }

    if (created.length === 0) {
      return reply.status(400).send({ error: warnings[0] ?? 'Hech qanday rasm yuklanmadi' })
    }

    logAdminAction(prisma, request, {
      action: 'institution.media_upload',
      entityType: 'Institution',
      entityId: id,
      entityLabel: institution.nameUz,
      after: { uploaded: created.length },
    })

    return reply.status(201).send({ data: created, warnings: warnings.length > 0 ? warnings : undefined })
  })

  // ─────────────────────────────────────────────
  // DELETE /admin/institutions/:id/media/:mediaId
  // ─────────────────────────────────────────────

  fastify.delete<{ Params: { id: string; mediaId: string } }>(
    '/admin/institutions/:id/media/:mediaId',
    async (request, reply) => {
      const { id, mediaId } = request.params

      const media = await prisma.institutionMedia.findUnique({ where: { id: mediaId } })
      if (!media || media.institutionId !== id) {
        return reply.status(404).send({ error: 'Rasm topilmadi' })
      }

      const key = keyFromPublicUrl(media.url)
      const thumbKey = media.thumbnailUrl ? keyFromPublicUrl(media.thumbnailUrl) : null

      await prisma.institutionMedia.delete({ where: { id: mediaId } })

      if (isStorageConfigured()) {
        await Promise.all([
          key ? deleteImage(key).catch((err) => fastify.log.warn(err, "R2 rasm o'chirishda xato")) : Promise.resolve(),
          thumbKey ? deleteImage(thumbKey).catch((err) => fastify.log.warn(err, "R2 thumbnail o'chirishda xato")) : Promise.resolve(),
        ])
      }

      logAdminAction(prisma, request, {
        action: 'institution.media_delete',
        entityType: 'Institution',
        entityId: id,
      })

      return reply.send({ message: "Rasm o'chirildi" })
    },
  )
}

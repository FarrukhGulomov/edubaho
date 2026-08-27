import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { InstitutionType, InstitutionStatus, DeliveryMode, MediaType } from '@prisma/client'
import { indexInstitution } from '../../services/searchService'
import { logAdminAction } from '../../services/auditLog'

/**
 * Muassasalar bazasini to'liq zaxiralash (backup/restore).
 *
 * Loyiha kodi o'zgartirilsa yoki qayta ishlansa ham (deploy, migratsiya,
 * server ko'chirish) muassasalar haqidagi ma'lumotlar YO'QOLIB
 * KETMASLIGI kerak — shu uchun super admin butun ro'yxatni (barcha
 * bog'liq ma'lumotlar — tafsilotlar, narxlar, rasmlar, filiallar bilan
 * birga) bitta JSON faylga export qilib, keyinchalik xuddi shu faylni
 * qayta import qilib tiklashi mumkin.
 *
 * JSON tanlandi (Excel/CSV emas) — chunki bu yerdagi ma'lumotlar
 * ierarxik (muassasa → tafsilot/narx/rasmlar/filiallar), jadval
 * formatlari bunda ma'lumot yo'qotadi yoki tushunarsiz bo'lib qoladi.
 *
 * GET  /super-admin/export/institutions — to'liq JSON faylni yuklab olish
 * POST /super-admin/import/institutions — avval export qilingan JSON
 *      faylni qayta yuklab, mavjud yozuvlarni yangilaydi (id bo'yicha)
 *      yoki yo'q bo'lsa xuddi o'sha id bilan qayta yaratadi
 */

const EXPORT_VERSION = 1

const importInstitutionSchema = z.object({
  id:      z.string(),
  nameUz:  z.string().min(1),
  nameRu:  z.string().nullable().optional(),
  nameKey: z.string().min(1),
  slug:    z.string().min(1),
  type:    z.nativeEnum(InstitutionType),
  additionalTypes: z.array(z.nativeEnum(InstitutionType)).optional().default([]),
  status:  z.nativeEnum(InstitutionStatus),
  phone:    z.string().nullable().optional(),
  phone2:   z.string().nullable().optional(),
  email:    z.string().nullable().optional(),
  website:  z.string().nullable().optional(),
  telegram: z.string().nullable().optional(),
  instagram: z.string().nullable().optional(),
  cityId:   z.string().nullable().optional(),
  regionId: z.string().nullable().optional(),
  address:  z.string().nullable().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  isVerified: z.boolean().optional().default(false),
  trialLessonEnabled: z.boolean().optional().default(false),
  deliveryMode: z.nativeEnum(DeliveryMode).optional().default(DeliveryMode.OFFLINE),
  details: z.object({
    descriptionUz: z.string().nullable().optional(),
    descriptionRu: z.string().nullable().optional(),
    foundedYear:   z.number().nullable().optional(),
    studentCount:  z.number().nullable().optional(),
    teacherCount:  z.number().nullable().optional(),
    languages:       z.array(z.string()).optional().default([]),
    programs:        z.array(z.string()).optional().default([]),
    shifts:          z.array(z.string()).optional().default([]),
    specializations: z.array(z.string()).optional().default([]),
    achievements:    z.string().nullable().optional(),
    categories:      z.array(z.string()).optional().default([]),
  }).nullable().optional(),
  pricing: z.object({
    monthlyMin:     z.number().nullable().optional(),
    monthlyMax:     z.number().nullable().optional(),
    paymentMethods: z.array(z.string()).optional().default([]),
  }).nullable().optional(),
  media: z.array(z.object({
    url:          z.string(),
    thumbnailUrl: z.string().nullable().optional(),
    type:         z.nativeEnum(MediaType).optional().default(MediaType.IMAGE),
    caption:      z.string().nullable().optional(),
    sortOrder:    z.number().optional().default(0),
  })).optional().default([]),
  branches: z.array(z.object({
    nameUz:   z.string().nullable().optional(),
    nameRu:   z.string().nullable().optional(),
    cityId:   z.string(),
    regionId: z.string(),
    address:  z.string().nullable().optional(),
    lat: z.number().nullable().optional(),
    lng: z.number().nullable().optional(),
    phone:    z.string().nullable().optional(),
    isMain:   z.boolean().optional().default(false),
  })).optional().default([]),
})

const importPayloadSchema = z.object({
  version:     z.number().optional(),
  exportedAt:  z.string().optional(),
  institutions: z.array(importInstitutionSchema),
})

type ImportInstitution = z.infer<typeof importInstitutionSchema>

/** Prisma xatolarini adminga tushunarli qisqa xabarga aylantiradi */
function friendlyImportError(err: unknown): string {
  const code = (err as { code?: string })?.code
  if (code === 'P2003') return "Bog'liq shahar/hudud (cityId/regionId) maqsad bazada topilmadi"
  if (code === 'P2002') return 'Slug yoki nom takrorlanmoqda (boshqa yozuv bilan to\'qnashuv)'
  if (err instanceof Error) {
    // Prisma xatolari ko'p qatorli bo'lib, tushunarli tavsif odatda OXIRGI qatorda bo'ladi
    const lines = err.message.split('\n').map((l) => l.trim()).filter(Boolean)
    return lines[lines.length - 1] ?? err.message
  }
  return "noma'lum xato"
}

/** Bitta muassasani (barcha bog'liq yozuvlar bilan) upsert qiladi */
async function importOne(prisma: PrismaClient, inst: ImportInstitution) {
  const {
    details, pricing, media, branches, id,
    ...scalar
  } = inst

  await prisma.$transaction(async (tx) => {
    await tx.institution.upsert({
      where: { id },
      create: { id, ...scalar },
      update: { ...scalar },
    })

    if (details) {
      await tx.institutionDetail.upsert({
        where: { institutionId: id },
        create: { institutionId: id, ...details },
        update: { ...details },
      })
    }

    if (pricing) {
      await tx.institutionPricing.upsert({
        where: { institutionId: id },
        create: { institutionId: id, ...pricing },
        update: { ...pricing },
      })
    }

    // Rasmlar va filiallar — to'liq almashtirish (aniq holatga qaytarish
    // uchun eng sodda va ishonchli usul, qisman-diff sinxronlash emas)
    await tx.institutionMedia.deleteMany({ where: { institutionId: id } })
    if (media.length > 0) {
      await tx.institutionMedia.createMany({
        data: media.map((m) => ({ ...m, institutionId: id })),
      })
    }

    await tx.institutionBranch.deleteMany({ where: { institutionId: id } })
    if (branches.length > 0) {
      await tx.institutionBranch.createMany({
        data: branches.map((b) => ({ ...b, institutionId: id })),
      })
    }
  })
}

export default async function dataExportRoutes(fastify: FastifyInstance) {
  const { prisma } = fastify

  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', fastify.requireSuperAdmin)

  // ─────────────────────────────────────────────
  // GET /super-admin/export/institutions
  // ─────────────────────────────────────────────

  fastify.get('/super-admin/export/institutions', async (_request, reply) => {
    const institutions = await prisma.institution.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        details: true,
        pricing: true,
        media:    { orderBy: { sortOrder: 'asc' } },
        branches: true,
      },
    })

    const payload = {
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      institutions: institutions.map((inst) => ({
        id: inst.id,
        nameUz: inst.nameUz,
        nameRu: inst.nameRu,
        nameKey: inst.nameKey,
        slug: inst.slug,
        type: inst.type,
        additionalTypes: inst.additionalTypes,
        status: inst.status,
        phone: inst.phone,
        phone2: inst.phone2,
        email: inst.email,
        website: inst.website,
        telegram: inst.telegram,
        instagram: inst.instagram,
        cityId: inst.cityId,
        regionId: inst.regionId,
        address: inst.address,
        lat: inst.lat,
        lng: inst.lng,
        isVerified: inst.isVerified,
        trialLessonEnabled: inst.trialLessonEnabled,
        deliveryMode: inst.deliveryMode,
        details: inst.details ? {
          descriptionUz: inst.details.descriptionUz,
          descriptionRu: inst.details.descriptionRu,
          foundedYear: inst.details.foundedYear,
          studentCount: inst.details.studentCount,
          teacherCount: inst.details.teacherCount,
          languages: inst.details.languages,
          programs: inst.details.programs,
          shifts: inst.details.shifts,
          specializations: inst.details.specializations,
          achievements: inst.details.achievements,
          categories: inst.details.categories,
        } : null,
        pricing: inst.pricing ? {
          monthlyMin: inst.pricing.monthlyMin,
          monthlyMax: inst.pricing.monthlyMax,
          paymentMethods: inst.pricing.paymentMethods,
        } : null,
        media: inst.media.map((m) => ({
          url: m.url, thumbnailUrl: m.thumbnailUrl, type: m.type,
          caption: m.caption, sortOrder: m.sortOrder,
        })),
        branches: inst.branches.map((b) => ({
          nameUz: b.nameUz, nameRu: b.nameRu, cityId: b.cityId, regionId: b.regionId,
          address: b.address, lat: b.lat, lng: b.lng, phone: b.phone, isMain: b.isMain,
        })),
      })),
    }

    logAdminAction(prisma, _request, {
      action: 'institutions.export',
      entityType: 'Institution',
      entityId: 'bulk',
      after: { count: institutions.length },
    })

    const filename = `bilimon-institutions-${new Date().toISOString().slice(0, 10)}.json`
    reply.header('Content-Type', 'application/json; charset=utf-8')
    reply.header('Content-Disposition', `attachment; filename="${filename}"`)
    return reply.send(payload)
  })

  // ─────────────────────────────────────────────
  // POST /super-admin/import/institutions
  // multipart/form-data, "file" maydonida JSON fayl
  // ─────────────────────────────────────────────

  fastify.post('/super-admin/import/institutions', async (request, reply) => {
    const part = await request.file()
    if (!part) {
      return reply.status(400).send({ error: 'Fayl yuborilmadi' })
    }

    let raw: unknown
    try {
      const buf = await part.toBuffer()
      raw = JSON.parse(buf.toString('utf-8'))
    } catch {
      return reply.status(400).send({ error: "Fayl to'g'ri JSON formatida emas" })
    }

    const parsed = importPayloadSchema.safeParse(raw)
    if (!parsed.success) {
      return reply.status(400).send({
        error: "Fayl tuzilishi noto'g'ri — export qilingan asl faylni ishlating",
        details: parsed.error.issues.slice(0, 10),
      })
    }

    const { institutions } = parsed.data
    const errors: { nameUz: string; slug: string; error: string }[] = []
    let imported = 0

    for (const inst of institutions) {
      try {
        await importOne(prisma, inst)
        imported++
        const saved = await prisma.institution.findUnique({
          where: { id: inst.id },
          include: { details: true, pricing: true, city: { select: { nameUz: true } } },
        })
        if (saved) {
          indexInstitution(saved).catch((err) => fastify.log.warn(err, 'Import: qidiruv indeksiga qo\'shishda xato'))
        }
      } catch (err: unknown) {
        errors.push({ nameUz: inst.nameUz, slug: inst.slug, error: friendlyImportError(err) })
      }
    }

    logAdminAction(prisma, request, {
      action: 'institutions.import',
      entityType: 'Institution',
      entityId: 'bulk',
      after: { imported, failed: errors.length },
    })

    return reply.send({
      imported,
      failed: errors.length,
      total: institutions.length,
      errors,
    })
  })
}

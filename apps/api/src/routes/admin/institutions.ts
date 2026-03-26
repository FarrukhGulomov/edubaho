import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { InstitutionType, InstitutionStatus } from '@prisma/client'

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
      data: institutions,
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
    phone:       z.string().optional(),
    phone2:      z.string().optional(),
    email:       z.string().email().optional().or(z.literal('')),
    website:     z.string().optional().or(z.literal('')),
    telegram:    z.string().optional(),
    instagram:   z.string().optional(),
    address:     z.string().optional(),
    cityId:      z.string().cuid().optional().or(z.literal('')),
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
    // Pricing
    monthlyMin:    z.coerce.number().int().min(0).optional().or(z.literal('')),
    monthlyMax:    z.coerce.number().int().min(0).optional().or(z.literal('')),
    paymentMethods: z.array(z.string()).optional().default([]),
  })

  fastify.post('/admin/institutions', async (request, reply) => {
    const body = createSchema.parse(request.body)

    // Slug takrorlanmasligini tekshirish
    const existing = await prisma.institution.findUnique({ where: { slug: body.slug } })
    if (existing) {
      return reply.status(409).send({ error: 'Bu slug allaqachon mavjud' })
    }

    const {
      descriptionUz, descriptionRu, foundedYear, studentCount, teacherCount,
      languages, programs, specializations, shifts, achievements,
      monthlyMin, monthlyMax, paymentMethods,
      cityId, email, website, ...main
    } = body

    const institution = await prisma.institution.create({
      data: {
        ...main,
        email:   email   || undefined,
        website: website || undefined,
        cityId:  cityId  || undefined,
        details: (descriptionUz || descriptionRu || foundedYear || studentCount || teacherCount) ? {
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
          },
        } : undefined,
        pricing: (monthlyMin || monthlyMax) ? {
          create: {
            monthlyMin:     monthlyMin ? Number(monthlyMin) : undefined,
            monthlyMax:     monthlyMax ? Number(monthlyMax) : undefined,
            paymentMethods: paymentMethods ?? [],
          },
        } : undefined,
      },
      select: { id: true, slug: true, nameUz: true },
    })

    return reply.status(201).send({ data: institution, message: 'Muassasa yaratildi' })
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

    const {
      descriptionUz, descriptionRu, foundedYear, studentCount, teacherCount,
      languages, programs, specializations, shifts, achievements,
      monthlyMin, monthlyMax, paymentMethods,
      cityId, email, website, ...main
    } = body

    // Main update
    await prisma.institution.update({
      where: { id },
      data: {
        ...main,
        email:   email   !== undefined ? (email   || null) : undefined,
        website: website !== undefined ? (website || null) : undefined,
        cityId:  cityId  !== undefined ? (cityId  || null) : undefined,
      },
    })

    // Details upsert
    if (descriptionUz !== undefined || descriptionRu !== undefined ||
        foundedYear   !== undefined || studentCount  !== undefined ||
        teacherCount  !== undefined || languages     !== undefined ||
        programs      !== undefined || specializations !== undefined ||
        shifts        !== undefined || achievements  !== undefined) {
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
        },
      })
    }

    // Pricing upsert
    if (monthlyMin !== undefined || monthlyMax !== undefined || paymentMethods !== undefined) {
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
    }

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

    await prisma.institution.update({ where: { id }, data: { status } })
    return reply.send({ message: `Status ${status} ga o'zgartirildi` })
  })

  // ─────────────────────────────────────────────
  // PATCH /admin/institutions/:id/verify
  // ─────────────────────────────────────────────

  fastify.patch<{ Params: { id: string } }>('/admin/institutions/:id/verify', async (request, reply) => {
    const { id } = request.params

    const institution = await prisma.institution.findUnique({ where: { id }, select: { isVerified: true } })
    if (!institution) {
      return reply.status(404).send({ error: 'Muassasa topilmadi' })
    }

    const isVerified = !institution.isVerified
    await prisma.institution.update({ where: { id }, data: { isVerified } })
    return reply.send({ isVerified, message: isVerified ? 'Muassasa tasdiqlandi' : 'Tasdiq bekor qilindi' })
  })
}

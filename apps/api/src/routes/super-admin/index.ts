import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

/**
 * Super Admin routes — faqat SUPER_ADMIN roli uchun
 *
 * GET    /super-admin/users            — Barcha foydalanuvchilar (paginated)
 * PATCH  /super-admin/users/:id        — Foydalanuvchini aktiv/deaktiv qilish
 * DELETE /super-admin/users/:id        — Foydalanuvchini o'chirish
 * GET    /super-admin/admins           — Adminlar ro'yxati + ruxsatlar
 * POST   /super-admin/admins           — Foydalanuvchini admin qilish
 * PATCH  /super-admin/admins/:id       — Admin ruxsatlarini yangilash
 * DELETE /super-admin/admins/:id       — Adminni foydalanuvchiga qaytarish
 */
export default async function superAdminRoutes(fastify: FastifyInstance) {
  const { prisma } = fastify

  // Barcha routelar uchun: autentifikatsiya + super admin tekshiruvi
  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', fastify.requireSuperAdmin)

  // ─────────────────────────────────────────────
  // GET /super-admin/users
  // Barcha foydalanuvchilar ro'yxati (qidirish + rol filtri)
  // ─────────────────────────────────────────────

  const usersQuerySchema = z.object({
    q:      z.string().optional(),
    role:   z.enum(['USER', 'INSTITUTION_OWNER', 'ADMIN', 'SUPER_ADMIN']).optional(),
    active: z.enum(['true', 'false']).optional(),
    page:   z.coerce.number().int().min(1).default(1),
    limit:  z.coerce.number().int().min(1).max(100).default(20),
  })

  fastify.get('/super-admin/users', async (request, reply) => {
    const { q, role, active, page, limit } = usersQuerySchema.parse(request.query)
    const skip = (page - 1) * limit
    const qTrimmed = q?.trim()

    const where = {
      ...(role && { role }),
      ...(active !== undefined && { isActive: active === 'true' }),
      ...(qTrimmed && {
        OR: [
          { phone: { contains: qTrimmed, mode: 'insensitive' as const } },
          { name:  { contains: qTrimmed, mode: 'insensitive' as const } },
          { email: { contains: qTrimmed, mode: 'insensitive' as const } },
        ],
      }),
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id:           true,
          phone:        true,
          name:         true,
          email:        true,
          role:         true,
          isVerified:   true,
          isActive:     true,
          createdAt:    true,
          lastActiveAt: true,
          city: { select: { nameUz: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ])

    return reply.send({
      data: users,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    })
  })

  // ─────────────────────────────────────────────
  // PATCH /super-admin/users/:id
  // Foydalanuvchini aktiv/deaktiv qilish
  // ─────────────────────────────────────────────

  const updateUserSchema = z.object({
    isActive: z.boolean(),
  })

  fastify.patch<{ Params: { id: string } }>('/super-admin/users/:id', async (request, reply) => {
    const { id } = request.params
    const me = (request as any).user as { id: string }

    if (id === me.id) {
      return reply.status(400).send({ error: "O'zingizni deaktiv qilib bo'lmaydi" })
    }

    const { isActive } = updateUserSchema.parse(request.body)

    const target = await prisma.user.findUnique({ where: { id }, select: { role: true } })
    if (!target) return reply.status(404).send({ error: 'Foydalanuvchi topilmadi' })
    if (target.role === 'SUPER_ADMIN') {
      return reply.status(400).send({ error: "Super adminni deaktiv qilib bo'lmaydi" })
    }

    await prisma.user.update({ where: { id }, data: { isActive } })

    return reply.send({
      message: isActive ? 'Foydalanuvchi aktivlashtirildi' : 'Foydalanuvchi deaktivlashtirildi',
    })
  })

  // ─────────────────────────────────────────────
  // DELETE /super-admin/users/:id
  // Foydalanuvchini o'chirish (SUPER_ADMIN o'chira olmaydi)
  // ─────────────────────────────────────────────

  fastify.delete<{ Params: { id: string } }>('/super-admin/users/:id', async (request, reply) => {
    const { id } = request.params
    const me = (request as any).user as { id: string }

    if (id === me.id) {
      return reply.status(400).send({ error: "O'zingizni o'chirib bo'lmaydi" })
    }

    const target = await prisma.user.findUnique({ where: { id }, select: { role: true } })
    if (!target) return reply.status(404).send({ error: 'Foydalanuvchi topilmadi' })
    if (target.role === 'SUPER_ADMIN') {
      return reply.status(400).send({ error: "Super adminni o'chirib bo'lmaydi" })
    }

    await prisma.user.delete({ where: { id } })

    return reply.send({ message: "Foydalanuvchi muvaffaqiyatli o'chirildi" })
  })

  // ─────────────────────────────────────────────
  // GET /super-admin/admins
  // ADMIN rolidagi foydalanuvchilar + ularning ruxsatlari
  // ─────────────────────────────────────────────

  fastify.get('/super-admin/admins', async (_request, reply) => {
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: {
        id:              true,
        phone:           true,
        name:            true,
        email:           true,
        createdAt:       true,
        adminPermission: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    return reply.send({ data: admins })
  })

  // ─────────────────────────────────────────────
  // POST /super-admin/admins
  // Foydalanuvchini ADMIN qilish + ruxsatlarni belgilash
  // ─────────────────────────────────────────────

  const createAdminSchema = z.object({
    userId:               z.string().optional(),
    phone:                z.string().optional(),
    canManageAll:         z.boolean().default(false),
    institutionIds:       z.array(z.string()).default([]),
    canCreateInstitutions:z.boolean().default(false),
    canEditInstitutions:  z.boolean().default(false),
    canDeleteInstitutions:z.boolean().default(false),
    canModerateReviews:   z.boolean().default(false),
    canViewUsers:         z.boolean().default(false),
  }).refine(d => d.userId || d.phone, { message: 'userId yoki phone majburiy' })

  fastify.post('/super-admin/admins', async (request, reply) => {
    const { userId, phone, ...permissions } = createAdminSchema.parse(request.body)

    // Telefon raqamini normalizatsiya qilish (bo'shliq, qavslar, tire olib tashlash)
    const normalizedPhone = phone?.replace(/[\s()\-]/g, '')

    const foundUser = await prisma.user.findFirst({
      where: userId ? { id: userId } : { phone: normalizedPhone },
      select: { id: true, role: true, phone: true },
    })

    if (!foundUser) {
      return reply.status(404).send({ error: 'Foydalanuvchi topilmadi. Avval tizimga kirgan bo\'lishi kerak.' })
    }
    if (foundUser.role === 'SUPER_ADMIN') {
      return reply.status(400).send({ error: "Super admin rolini o'zgartirib bo'lmaydi" })
    }
    if (foundUser.role === 'ADMIN') {
      return reply.status(409).send({ error: 'Foydalanuvchi allaqachon admin' })
    }

    // foundUser.id ni ishlatish — userId undefined bo'lishi mumkin!
    await prisma.$transaction([
      prisma.user.update({
        where: { id: foundUser.id },
        data:  { role: 'ADMIN' },
      }),
      prisma.adminPermission.create({
        data: { adminId: foundUser.id, ...permissions },
      }),
    ])

    return reply.status(201).send({ message: 'Admin muvaffaqiyatli tayinlandi' })
  })

  // ─────────────────────────────────────────────
  // PATCH /super-admin/admins/:id
  // Admin ruxsatlarini yangilash
  // ─────────────────────────────────────────────

  const updatePermissionsSchema = z.object({
    canManageAll:          z.boolean().optional(),
    institutionIds:        z.array(z.string()).optional(),
    canCreateInstitutions: z.boolean().optional(),
    canEditInstitutions:   z.boolean().optional(),
    canDeleteInstitutions: z.boolean().optional(),
    canModerateReviews:    z.boolean().optional(),
    canViewUsers:          z.boolean().optional(),
  })

  fastify.patch<{ Params: { id: string } }>('/super-admin/admins/:id', async (request, reply) => {
    const { id } = request.params
    const body = updatePermissionsSchema.parse(request.body)

    const admin = await prisma.user.findUnique({ where: { id }, select: { role: true } })
    if (!admin) return reply.status(404).send({ error: 'Foydalanuvchi topilmadi' })
    if (admin.role !== 'ADMIN') return reply.status(400).send({ error: 'Foydalanuvchi admin emas' })

    await prisma.adminPermission.upsert({
      where:  { adminId: id },
      create: { adminId: id, ...body },
      update: body,
    })

    return reply.send({ message: 'Ruxsatlar yangilandi' })
  })

  // ─────────────────────────────────────────────
  // DELETE /super-admin/admins/:id
  // Adminni USER ga qaytarish va ruxsatlarini o'chirish
  // ─────────────────────────────────────────────

  fastify.delete<{ Params: { id: string } }>('/super-admin/admins/:id', async (request, reply) => {
    const { id } = request.params

    const admin = await prisma.user.findUnique({ where: { id }, select: { role: true } })
    if (!admin) return reply.status(404).send({ error: 'Foydalanuvchi topilmadi' })
    if (admin.role !== 'ADMIN') return reply.status(400).send({ error: 'Foydalanuvchi admin emas' })

    await prisma.$transaction([
      prisma.adminPermission.deleteMany({ where: { adminId: id } }),
      prisma.user.update({ where: { id }, data: { role: 'USER' } }),
    ])

    return reply.send({ message: 'Admin huquqlari olib tashlandi' })
  })
}

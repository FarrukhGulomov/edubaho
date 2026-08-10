import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { InstitutionType, LeadStatus } from '@prisma/client'
import {
  queryLeads, getLatestIntent, getActivitySummary, getLeadTimeline,
  computeRegistrationMethod, computeProfileCompletion, computePriority,
  type LeadListFilters, type LeadSort,
} from '../../services/leadService'
import { exportLeads, type ExportFormat } from '../../services/leadExportService'
import { logAdminAction } from '../../services/auditLog'

/**
 * Admin Lead CRM routes
 *
 * GET   /admin/leads              — Ro'yxat (qidiruv/filtr/saralash/sahifalash)
 * GET   /admin/leads/export       — Joriy filtrlangan lidlarni yuklab olish (xlsx/csv/pdf/docx)
 * GET   /admin/leads/:id          — Batafsil lid profili
 * PATCH /admin/leads/:id/status   — Lid holatini o'zgartirish
 *
 * MUHIM: bu YANGI CRM ustki qatlami — mavjud "/super-admin/analytics/leads"
 * (anonim sessiya-asosli marketing funnel tahlili) ALMASHTIRILMAYDI, chunki
 * u boshqa vazifani bajaradi (ro'yxatdan o'tmagan mehmonlar konversiyasi).
 * Bu yerda esa RO'YXATDAN O'TGAN foydalanuvchilar (User, role=USER) — ular
 * bilan bog'lanish, holat va ustuvorlikni boshqarish uchun.
 */
export default async function adminLeadRoutes(fastify: FastifyInstance) {
  const { prisma } = fastify

  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', fastify.requireAdmin)

  const listQuerySchema = z.object({
    q: z.string().max(100).optional(),
    registrationMethod: z.enum(['TELEGRAM', 'GOOGLE', 'PHONE']).optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
    regionId: z.string().optional(),
    cityId: z.string().optional(),
    goal: z.string().max(100).optional(),
    direction: z.nativeEnum(InstitutionType).optional(),
    format: z.enum(['online', 'offline', 'hybrid']).optional(),
    selectedInstitutionId: z.string().optional(),
    status: z.nativeEnum(LeadStatus).optional(),
    priority: z.enum(['HOT', 'WARM', 'COLD']).optional(),
    hasPhone: z.enum(['true', 'false']).optional(),
    profileComplete: z.enum(['true', 'false']).optional(),
    sort: z.enum(['newest', 'oldest', 'lastActivity', 'mostActive', 'priority', 'profileCompletion', 'status']).default('newest'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })

  function parseFilters(q: z.infer<typeof listQuerySchema>): LeadListFilters {
    return {
      q: q.q,
      registrationMethod: q.registrationMethod,
      dateFrom: q.dateFrom,
      dateTo: q.dateTo,
      regionId: q.regionId,
      cityId: q.cityId,
      goal: q.goal,
      direction: q.direction,
      format: q.format,
      selectedInstitutionId: q.selectedInstitutionId,
      status: q.status,
      priority: q.priority,
      hasPhone: q.hasPhone === undefined ? undefined : q.hasPhone === 'true',
      profileComplete: q.profileComplete === undefined ? undefined : q.profileComplete === 'true',
    }
  }

  // ─────────────────────────────────────────────
  // GET /admin/leads
  // ─────────────────────────────────────────────

  fastify.get('/admin/leads', async (request, reply) => {
    const query = listQuerySchema.parse(request.query)
    const filters = parseFilters(query)

    const { items, total, truncated } = await queryLeads(
      prisma, filters, query.sort as LeadSort, query.page, query.limit,
    )

    return reply.send({
      data: items,
      meta: {
        total, page: query.page, limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
        truncated, // true bo'lsa: xavfsizlik chegarasiga yetdi, ba'zi lidlar hisoblanmagan bo'lishi mumkin
      },
    })
  })

  // ─────────────────────────────────────────────
  // GET /admin/leads/export?exportFormat=xlsx|csv|pdf|docx
  // Joriy qo'llangan filtrlar bilan BIR XIL — faqat shu lidlarni eksport qiladi
  //
  // MUHIM: query param nomi ataylab `exportFormat` (`format` emas) —
  // lidlarning "Online/Offline/Hybrid" filtri allaqachon `format` nomini
  // band qilgan, ikkalasini bitta nomga qo'shib yuborish jiddiy xatoga
  // olib kelardi (eksport turi lid filtri sifatida talqin qilinib qolardi)
  // ─────────────────────────────────────────────

  fastify.get('/admin/leads/export', async (request, reply) => {
    const query = listQuerySchema.extend({
      exportFormat: z.enum(['xlsx', 'csv', 'pdf', 'docx']),
    }).parse(request.query)
    const filters = parseFilters(query)

    const { items } = await queryLeads(prisma, filters, query.sort as LeadSort, 1, 0, true)

    const { buffer, filename, contentType } = await exportLeads(items, query.exportFormat as ExportFormat)

    reply.header('Content-Type', contentType)
    reply.header('Content-Disposition', `attachment; filename="${filename}"`)
    return reply.send(buffer)
  })

  // ─────────────────────────────────────────────
  // GET /admin/leads/:id — Batafsil lid profili
  // ─────────────────────────────────────────────

  fastify.get<{ Params: { id: string } }>('/admin/leads/:id', async (request, reply) => {
    const { id } = request.params

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, name: true, phone: true, email: true, avatarUrl: true,
        telegramId: true, telegramUsername: true, googleId: true,
        role: true, isVerified: true, isActive: true,
        createdAt: true, lastActiveAt: true,
        leadStatus: true, leadStatusUpdatedAt: true, cityId: true,
        city: { select: { id: true, nameUz: true, nameRu: true, region: { select: { nameUz: true, nameRu: true } } } },
      },
    })

    if (!user || user.role !== 'USER') {
      return reply.status(404).send({ error: 'Lid topilmadi' })
    }

    const [intent, activity, timeline] = await Promise.all([
      getLatestIntent(prisma, id),
      getActivitySummary(prisma, id),
      getLeadTimeline(prisma, id),
    ])

    const completion = computeProfileCompletion(user, !!intent)
    const priority = computePriority({
      profileComplete: completion.complete,
      hasGoal: !!intent,
      viewedCount: activity.viewedCount,
      comparedCount: activity.comparedCount,
      savedCount: activity.savedCount,
      hasSelectedCenter: activity.selected.length > 0,
      hasPhone: !!user.phone,
    })

    return reply.send({
      data: {
        ...user,
        registrationMethod: computeRegistrationMethod(user),
        profileCompletion: completion,
        priority,
        intent,
        activity,
        timeline,
      },
    })
  })

  // ─────────────────────────────────────────────
  // PATCH /admin/leads/:id/status
  // ─────────────────────────────────────────────

  fastify.patch<{ Params: { id: string } }>('/admin/leads/:id/status', async (request, reply) => {
    const { id } = request.params
    const { status } = z.object({ status: z.nativeEnum(LeadStatus) }).parse(request.body)

    const user = await prisma.user.findUnique({ where: { id }, select: { role: true, leadStatus: true } })
    if (!user || user.role !== 'USER') {
      return reply.status(404).send({ error: 'Lid topilmadi' })
    }

    await prisma.user.update({
      where: { id },
      data: { leadStatus: status, leadStatusUpdatedAt: new Date() },
    })

    logAdminAction(prisma, request, {
      action: 'lead.status_update',
      entityType: 'User',
      entityId: id,
      before: { leadStatus: user.leadStatus },
      after: { leadStatus: status },
    })

    return reply.send({ message: `Lid holati "${status}" ga o'zgartirildi` })
  })
}

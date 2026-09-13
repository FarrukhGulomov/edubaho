import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

/**
 * Super Admin Analytics routes
 *
 * GET /super-admin/analytics/summary   — Umumiy statistika
 * GET /super-admin/analytics/funnel    — Konversiya funnel
 * GET /super-admin/analytics/leads     — Lead sessiyalar ro'yxati (faqat gate ko'rganlar)
 * GET /super-admin/analytics/visitors  — BARCHA tashrifchilar ro'yxati (sahifalangan)
 * GET /super-admin/analytics/sessions/:id — Sessiya tarixi
 * GET /super-admin/analytics/events    — Oxirgi voqealar oqimi
 */
export default async function analyticsRoutes(fastify: FastifyInstance) {
  const { prisma } = fastify

  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', fastify.requireSuperAdmin)

  const rangeSchema = z.object({
    days: z.coerce.number().int().min(1).max(90).default(7),
  })

  // ─── GET /super-admin/analytics/summary ──────────────────────
  fastify.get('/super-admin/analytics/summary', async (request, reply) => {
    const { days } = rangeSchema.parse(request.query)
    const since = new Date(Date.now() - days * 86400_000)

    const [
      totalEvents,
      uniqueSessions,
      uniqueUsers,
      newRegistrations,
      totalLogins,
      institutionContacts,
      trialBookings,
      authOutcomeEvents,
      topEvents,
      gateStats,
      hourlyActivity,
    ] = await Promise.all([
      // Jami voqealar
      prisma.leadEvent.count({ where: { createdAt: { gte: since } } }),

      // Noyob sessiyalar (mehmon + auth)
      prisma.leadEvent.groupBy({
        by: ['sessionId'],
        where: { createdAt: { gte: since } },
        _count: true,
      }).then(r => r.length),

      // Auth bo'lgan noyob userlar
      prisma.leadEvent.findMany({
        where: { createdAt: { gte: since }, userId: { not: null } },
        select: { userId: true },
        distinct: ['userId'],
      }).then(r => r.length),

      // Yangi ro'yxatdan o'tganlar — FAQAT aynan shu so'rovda hisob
      // yaratilgan bo'lsa (isNewUser to'g'ri hisoblanadi, auth.ts'da
      // tuzatildi). Avval bu yerda oddiy auth_completed soni ishlatilardi
      // — bu aslida "jami muvaffaqiyatli kirishlar" edi, "yangi
      // ro'yxatdan o'tganlar" emas (UX audit topilmasi)
      prisma.leadEvent.count({
        where: {
          event: 'auth_completed',
          createdAt: { gte: since },
          properties: { path: ['isNewUser'], equals: true },
        },
      }),

      // Jami muvaffaqiyatli kirishlar (yangi + qayta) — alohida ko'rsatkich
      prisma.leadEvent.count({
        where: { event: 'auth_completed', createdAt: { gte: since } },
      }),

      // Muassasaga murojaatlar (telefon/telegram/instagram/sayt/manzil
      // bosildi) — mehmonning o'z kontaktini qoldirishi (lead_capture)
      // BUNGA kirmaydi, u alohida "Lidlar" bo'limida hisoblanadi
      prisma.leadEvent.findMany({
        where: { event: 'contact_click', createdAt: { gte: since } },
        select: { properties: true },
      }).then(rows => rows.filter(r => {
        const contactType = String((r.properties as Record<string, unknown> | null)?.contactType ?? '')
        return !['lead_capture', 'lead_capture_email'].includes(contactType)
      }).length),

      // Sinov darsiga yozilishlar — ro'yxatdan o'tish bilan bir qatorda
      // asosiy natija sifatida (mehmon akkauntsiz ham buni qila oladi)
      prisma.trialBooking.count({ where: { createdAt: { gte: since } } }),

      // Auth yakuni: muvaffaqiyat/xato usul (Google/Telegram/OTP) bo'yicha —
      // "Google/Telegram bosqichlarini o'lchash" so'raldi (UX audit topilmasi)
      prisma.leadEvent.findMany({
        where: { event: { in: ['auth_completed', 'auth_error'] }, createdAt: { gte: since } },
        select: { event: true, properties: true },
      }),

      // Top voqealar
      prisma.leadEvent.groupBy({
        by: ['event'],
        where: { createdAt: { gte: since } },
        _count: { event: true },
        orderBy: { _count: { event: 'desc' } },
        take: 10,
      }),

      // Gate statistikasi (eng muhim lead signali)
      prisma.leadEvent.groupBy({
        by: ['event'],
        where: {
          event: { in: ['gate_shown', 'gate_cta_click', 'auth_completed'] },
          createdAt: { gte: since },
        },
        _count: { event: true },
      }),

      // Soatlik faollik (oxirgi 24 soat)
      prisma.leadEvent.findMany({
        where: { createdAt: { gte: new Date(Date.now() - 86400_000) } },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }).then(events => {
        const hours: Record<number, number> = {}
        for (const e of events) {
          const h = new Date(e.createdAt).getHours()
          hours[h] = (hours[h] ?? 0) + 1
        }
        return Array.from({ length: 24 }, (_, i) => ({ hour: i, count: hours[i] ?? 0 }))
      }),
    ])

    // Konversiya hisoblash
    const gateShown   = gateStats.find(g => g.event === 'gate_shown')?._count.event ?? 0
    const gateCta     = gateStats.find(g => g.event === 'gate_cta_click')?._count.event ?? 0
    const authDone    = gateStats.find(g => g.event === 'auth_completed')?._count.event ?? 0
    const gateToAuth  = gateShown > 0 ? Math.round((gateCta / gateShown) * 100) : 0
    const ctaToReg    = gateCta > 0  ? Math.round((authDone / gateCta) * 100)  : 0

    // Usul bo'yicha yakun: har bir auth_completed/auth_error qaysi usulda
    // (google/telegram/otp) sodir bo'lganini tally qilamiz
    const authByMethod: Record<string, { completed: number; error: number }> = {}
    for (const e of authOutcomeEvents) {
      const method = String((e.properties as Record<string, unknown> | null)?.method ?? 'unknown')
      authByMethod[method] ??= { completed: 0, error: 0 }
      if (e.event === 'auth_completed') authByMethod[method].completed++
      else authByMethod[method].error++
    }

    return reply.send({
      data: {
        period: { days, since },
        totals: {
          totalEvents, uniqueSessions, uniqueUsers,
          newRegistrations, totalLogins, institutionContacts, trialBookings,
        },
        funnel: { gateShown, gateCta, authDone, gateToAuth, ctaToReg },
        authByMethod,
        topEvents: topEvents.map(e => ({ event: e.event, count: e._count.event })),
        hourlyActivity,
      },
    })
  })

  // ─── GET /super-admin/analytics/funnel ────────────────────────
  fastify.get('/super-admin/analytics/funnel', async (request, reply) => {
    const { days } = rangeSchema.parse(request.query)
    const since = new Date(Date.now() - days * 86400_000)

    // Avval bu yerda `auth_phone_entered`/`auth_otp_sent` bosqichlari ham
    // bor edi — telefon/OTP orqali kirish UI'da o'chirilgan
    // (PHONE_AUTH_ENABLED=false, apps/web/src/app/auth/page.tsx), shuning
    // uchun bu ikkisi productionda deyarli doim nolga yaqin chiqib, funnel'ni
    // chalkash ko'rsatardi (UX audit topilmasi). Google/Telegram orqali
    // yakunlanish usul bo'yicha alohida `authByMethod`da (summary endpoint)
    // ko'rsatiladi — bu yerda faqat haqiqiy ketma-ket bosqichlar qoladi.
    const steps = [
      'institution_view',
      'gate_shown',
      'gate_cta_click',
      'auth_started',
      'auth_completed',
    ]

    const counts = await Promise.all(
      steps.map(async (event) => {
        const sessions = await prisma.leadEvent.findMany({
          where: { event, createdAt: { gte: since } },
          select: { sessionId: true },
          distinct: ['sessionId'],
        })
        return { event, sessions: sessions.length }
      })
    )

    // Drop-off hisoblash
    const funnel = counts.map((step, i) => ({
      ...step,
      dropOff: i === 0 ? 0 : counts[i - 1]!.sessions - step.sessions,
      convRate: i === 0 ? 100 : counts[i - 1]!.sessions > 0
        ? Math.round((step.sessions / counts[i - 1]!.sessions) * 100)
        : 0,
    }))

    return reply.send({ data: funnel })
  })

  // ─── GET /super-admin/analytics/leads ────────────────────────
  // Gate ko'rgan lekin auth bo'lmagan sessiyalar = issiq lidlar
  fastify.get('/super-admin/analytics/leads', async (request, reply) => {
    const { days } = rangeSchema.parse(request.query)
    const since = new Date(Date.now() - days * 86400_000)

    // Gate ko'rgan sessiyalar
    const gateShownSessions = await prisma.leadEvent.findMany({
      where: { event: 'gate_shown', createdAt: { gte: since } },
      select: { sessionId: true, properties: true, institutionId: true, createdAt: true },
      distinct: ['sessionId'],
      orderBy: { createdAt: 'desc' },
      take: 200,
    })

    // Auth bo'lgan sessiyalar
    const authSessions = new Set(
      (await prisma.leadEvent.findMany({
        where: { event: 'auth_completed', createdAt: { gte: since } },
        select: { sessionId: true },
        distinct: ['sessionId'],
      })).map(s => s.sessionId)
    )

    // CTA bosgan sessiyalar
    const ctaSessions = new Set(
      (await prisma.leadEvent.findMany({
        where: { event: 'gate_cta_click', createdAt: { gte: since } },
        select: { sessionId: true },
        distinct: ['sessionId'],
      })).map(s => s.sessionId)
    )

    const leads = await Promise.all(
      gateShownSessions.map(async (s) => {
        // Sessiyaning barcha voqealari (userId va user ma'lumotlari bilan)
        const events = await prisma.leadEvent.findMany({
          where: { sessionId: s.sessionId, createdAt: { gte: since } },
          select: {
            event: true, properties: true, createdAt: true, institutionId: true,
            userId: true,
            user: { select: { phone: true, name: true } },
          },
          orderBy: { createdAt: 'asc' },
        })

        const converted = authSessions.has(s.sessionId)
        const clickedCta = ctaSessions.has(s.sessionId)

        // Autentifikatsiya qilingan user ma'lumotlari
        const userEvent = events.find(e => e.userId && e.user)
        const user = userEvent?.user ?? null

        // Mehmon tomonidan qoldirilgan kontakt (GuestLeadWidget orqali)
        type Props = Record<string, unknown>
        const captureEvent = events.find(e =>
          e.event === 'contact_click' &&
          ['lead_capture', 'lead_capture_email'].includes(String((e.properties as Props)?.contactType ?? ''))
        )
        const capturedPhone = captureEvent
          ? String((captureEvent.properties as Props).phone ?? '') || null
          : null
        const capturedEmail = captureEvent
          ? String((captureEvent.properties as Props).email ?? '') || null
          : null

        // Qidiruv so'rovlari (takrorlanmasdan, max 5 ta)
        const searchQueries = [...new Set(
          events
            .filter(e => e.event === 'search_query')
            .map(e => String((e.properties as Props).query ?? ''))
            .filter(Boolean)
        )].slice(0, 5)

        // Qiziqish ko'rsatkichi (score)
        let score = 0
        const eventTypes = new Set(events.map(e => e.event))
        if (eventTypes.has('institution_view'))  score += 1
        if (eventTypes.has('gate_shown'))         score += 2
        if (eventTypes.has('price_viewed'))       score += 2
        if (eventTypes.has('gate_cta_click'))     score += 3
        if (eventTypes.has('auth_started'))       score += 3
        if (eventTypes.has('auth_phone_entered')) score += 4
        if (eventTypes.has('auth_otp_sent'))      score += 4
        if (eventTypes.has('auth_completed'))     score += 10
        if (capturedPhone || capturedEmail)       score += 5

        // Qancha muassasa ko'rgan
        const viewedInstitutions = new Set(
          events.filter(e => e.event === 'institution_view').map(e => e.institutionId)
        ).size

        return {
          sessionId: s.sessionId,
          firstSeen: events[0]?.createdAt,
          lastSeen:  events.at(-1)?.createdAt,
          score,
          converted,
          clickedCta,
          eventsCount:       events.length,
          viewedInstitutions,
          gateReached:       events.filter(e => e.event === 'gate_shown').length,
          status: converted ? 'converted' : clickedCta ? 'warm' : 'cold',
          // Kontakt ma'lumotlari
          user,
          capturedPhone,
          capturedEmail,
          searchQueries,
        }
      })
    )

    // Score bo'yicha tartiblash
    leads.sort((a, b) => b.score - a.score)

    const summary = {
      total:     leads.length,
      converted: leads.filter(l => l.converted).length,
      warm:      leads.filter(l => l.status === 'warm').length,
      cold:      leads.filter(l => l.status === 'cold').length,
    }

    return reply.send({ data: leads.slice(0, 100), summary })
  })

  // ─── GET /super-admin/analytics/visitors ──────────────────────
  // "Lidlar"dan farqi: bu yerga FAQAT gate_shown ko'rganlar emas, shu
  // oynadagi HAR BIR sessiya kiradi — oddiy qidirib, ro'yxatdan o'tish
  // taklifini ko'rmasdan chiqib ketgan mehmon ham (UX audit topilmasi:
  // "Lidlar" barcha mehmonlarni ko'rsatmaydi).
  fastify.get('/super-admin/analytics/visitors', async (request, reply) => {
    const schema = z.object({
      days: z.coerce.number().int().min(1).max(90).default(7),
      page: z.coerce.number().int().min(1).default(1),
    })
    const { days, page } = schema.parse(request.query)
    const since = new Date(Date.now() - days * 86400_000)
    const PAGE_SIZE = 50

    const [sessionGroups, allSessionIds] = await Promise.all([
      // Har bir sessiya uchun: birinchi/oxirgi ko'rilgan vaqt + voqealar
      // soni — bitta so'rovda, sessiya boshiga alohida so'rov yubormasdan
      prisma.leadEvent.groupBy({
        by: ['sessionId'],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
        _min: { createdAt: true },
        _max: { createdAt: true },
        orderBy: { _max: { createdAt: 'desc' } },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      // Sahifalash uchun jami sessiyalar soni (summary'dagi uniqueSessions
      // bilan bir xil so'rov)
      prisma.leadEvent.groupBy({
        by: ['sessionId'],
        where: { createdAt: { gte: since } },
      }).then(r => r.length),
    ])

    const sessionIds = sessionGroups.map(s => s.sessionId)

    const [identityRows, authRows] = await Promise.all([
      // Har bir sessiyaning ENG SO'NGGI voqeasi orqali joriy identifikatsiya
      // (mehmon sifatida boshlab, keyin kirgan bo'lsa ham to'g'ri aniqlanadi)
      prisma.leadEvent.findMany({
        where: { sessionId: { in: sessionIds } },
        distinct: ['sessionId'],
        orderBy: { createdAt: 'desc' },
        select: { sessionId: true, userId: true, user: { select: { name: true, phone: true } } },
      }),
      // Auth holatini aniqlash uchun shu sessiyalarning auth voqealari
      prisma.leadEvent.findMany({
        where: { sessionId: { in: sessionIds }, event: { in: ['auth_started', 'auth_completed', 'auth_error'] } },
        select: { sessionId: true, event: true },
      }),
    ])

    const identityBySession = new Map(identityRows.map(r => [r.sessionId, r]))
    const authEventsBySession = new Map<string, Set<string>>()
    for (const r of authRows) {
      if (!authEventsBySession.has(r.sessionId)) authEventsBySession.set(r.sessionId, new Set())
      authEventsBySession.get(r.sessionId)!.add(r.event)
    }

    const visitors = sessionGroups.map((s) => {
      const identity = identityBySession.get(s.sessionId)
      const authEvents = authEventsBySession.get(s.sessionId)
      const authStatus = authEvents?.has('auth_completed') ? 'completed'
        : authEvents?.has('auth_error')     ? 'error'
        : authEvents?.has('auth_started')   ? 'started'
        : 'not_started'

      return {
        sessionId:   s.sessionId,
        firstSeen:   s._min.createdAt,
        lastSeen:    s._max.createdAt,
        eventsCount: s._count._all,
        authStatus,
        user: identity?.userId ? { name: identity.user?.name ?? null, phone: identity.user?.phone ?? null } : null,
      }
    })

    return reply.send({
      data: visitors,
      meta: {
        total: allSessionIds, page, pageSize: PAGE_SIZE,
        totalPages: Math.max(1, Math.ceil(allSessionIds / PAGE_SIZE)),
      },
    })
  })

  // ─── GET /super-admin/analytics/sessions/:id ──────────────────
  fastify.get<{ Params: { id: string } }>(
    '/super-admin/analytics/sessions/:id',
    async (request, reply) => {
      const { id } = request.params

      const events = await prisma.leadEvent.findMany({
        where: { sessionId: id },
        select: {
          event:     true,
          category:  true,
          properties:true,
          page:      true,
          createdAt: true,
          institutionId: true,
          userId:    true,
          institution: { select: { nameUz: true, slug: true } },
          user:        { select: { phone: true, name: true } },
        },
        orderBy: { createdAt: 'asc' },
        take: 500,
      })

      return reply.send({ data: events })
    }
  )

  // ─── GET /super-admin/analytics/events ────────────────────────
  fastify.get('/super-admin/analytics/events', async (request, reply) => {
    const schema = z.object({
      limit:    z.coerce.number().int().min(1).max(200).default(50),
      event:    z.string().optional(),
      category: z.string().optional(),
    })
    const { limit, event, category } = schema.parse(request.query)

    const events = await prisma.leadEvent.findMany({
      where: {
        ...(event && { event }),
        ...(category && { category }),
      },
      select: {
        id:        true,
        sessionId: true,
        event:     true,
        category:  true,
        properties:true,
        page:      true,
        createdAt: true,
        userId:    true,
        institution: { select: { nameUz: true, slug: true } },
        user:        { select: { phone: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return reply.send({ data: events })
  })
}

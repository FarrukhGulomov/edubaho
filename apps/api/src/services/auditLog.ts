import type { FastifyRequest } from 'fastify'
import type { PrismaClient } from '@prisma/client'

interface LogAdminActionParams {
  action: string
  entityType: string
  entityId?: string
  entityLabel?: string
  before?: unknown
  after?: unknown
}

/**
 * Admin panelidagi o'zgartiruvchi amalni audit jurnaliga yozish.
 * Xato bo'lsa ham asosiy amal (masalan, muassasani tasdiqlash) davom
 * etishi kerak — shuning uchun bu funksiya hech qachon xato tashlamaydi.
 */
export async function logAdminAction(
  prisma: PrismaClient,
  request: FastifyRequest,
  params: LogAdminActionParams,
): Promise<void> {
  try {
    const { id, role } = request.user as { id: string; role: string }

    const admin = await prisma.user.findUnique({
      where: { id },
      select: { name: true, phone: true },
    })
    const adminName = admin?.name ?? admin?.phone ?? "Noma'lum admin"

    await prisma.adminAuditLog.create({
      data: {
        adminId: id,
        adminName,
        adminRole: role,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        entityLabel: params.entityLabel,
        before: params.before === undefined ? undefined : (params.before as never),
        after: params.after === undefined ? undefined : (params.after as never),
        ip: request.ip,
      },
    })
  } catch (err) {
    console.error('AdminAuditLog yozishda xatolik:', err)
  }
}

import type { Role, InstitutionStatus, InstitutionType } from '@prisma/client'
import { randomBytes } from 'crypto'
import { testPrisma } from './db'

function rid(): string {
  return randomBytes(6).toString('hex')
}

let ipCounter = 1

/**
 * Har chaqiriqda YANGI, takrorlanmas soxta IP qaytaradi — testlar BITTA
 * ulashilgan Fastify app (va shu bilan ulashilgan in-memory rate-limit
 * hisoblagichi) ustida ishlagani uchun, alohida test stsenariylari
 * bir-birining rate-limit byudjetini "yeb qo'ymasligi" uchun ishlatiladi.
 * `.inject({ remoteAddress })` orqali beriladi.
 */
export function uniqueIp(): string {
  ipCounter += 1
  return `10.${(ipCounter >> 16) & 255}.${(ipCounter >> 8) & 255}.${ipCounter & 255}`
}

/** Minimal, ishonchli user fixture — kerakli maydonlarni override qilish mumkin */
export async function makeUser(overrides: Partial<{
  role: Role
  phone: string | null
  name: string | null
  email: string | null
  isActive: boolean
  phoneVerifiedAt: Date | null
  referralCode: string | null
}> = {}) {
  return testPrisma.user.create({
    data: {
      phone: overrides.phone === undefined ? `+99890${rid().slice(0, 7)}` : overrides.phone,
      name: overrides.name === undefined ? 'Test Foydalanuvchi' : overrides.name,
      role: overrides.role ?? 'USER',
      isActive: overrides.isActive ?? true,
      email: overrides.email,
      phoneVerifiedAt: overrides.phoneVerifiedAt,
      referralCode: overrides.referralCode,
    },
  })
}

/** Minimal, ishonchli muassasa fixture */
export async function makeInstitution(overrides: Partial<{
  status: InstitutionStatus
  type: InstitutionType
  nameUz: string
  phone: string | null
  telegram: string | null
  instagram: string | null
  email: string | null
}> = {}) {
  const suffix = rid()
  return testPrisma.institution.create({
    data: {
      nameUz: overrides.nameUz ?? `Test Markaz ${suffix}`,
      nameKey: `test markaz ${suffix}`,
      slug: `test-markaz-${suffix}`,
      type: overrides.type ?? 'COURSE_CENTER',
      status: overrides.status ?? 'ACTIVE',
      phone: overrides.phone === undefined ? '+998901234567' : overrides.phone,
      telegram: overrides.telegram === undefined ? 'test_markaz' : overrides.telegram,
      instagram: overrides.instagram,
      email: overrides.email,
    },
  })
}

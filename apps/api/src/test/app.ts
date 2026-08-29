import { loadTestEnv } from './loadTestEnv'

loadTestEnv()

import type { FastifyInstance } from 'fastify'
import { buildApp } from '../server'

let appPromise: Promise<FastifyInstance> | null = null

/**
 * Butun test yugurishi uchun BITTA ulashilgan Fastify instance (route-level
 * testlar `.inject()` orqali haqiqiy HTTP so'rovga o'xshab sinaydi, lekin
 * portga bog'lanmaydi). Har bir test faylida qayta qurilmaydi — chunki
 * Redis singleton va rate-limit in-memory hisoblagichi ulashiladi.
 */
export function getTestApp(): Promise<FastifyInstance> {
  if (!appPromise) appPromise = buildApp()
  return appPromise
}

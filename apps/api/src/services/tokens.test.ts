import { describe, it, expect } from 'vitest'
import jwt from 'jsonwebtoken'
import { generateTokens, verifyRefreshToken, revokeRefreshToken, revokeAllTokens } from './tokens'
import { makeUser } from '../test/fixtures'
import { testRedis } from '../test/redis'
import { env } from '../utils/env'

describe('generateTokens / verifyRefreshToken', () => {
  it('access va refresh token bir xil jti bilan yaratiladi', async () => {
    const user = await makeUser()
    const { accessToken, refreshToken } = await generateTokens(user.id, user.role)

    const accessPayload = jwt.verify(accessToken, env.JWT_SECRET) as { jti: string; id: string }
    const refreshPayload = jwt.verify(refreshToken, env.REFRESH_SECRET) as { jti: string; sub: string }

    expect(accessPayload.jti).toBe(refreshPayload.jti)
    expect(accessPayload.id).toBe(user.id)
    expect(refreshPayload.sub).toBe(user.id)
  })

  it('refresh token Redisda saqlanadi va verifyRefreshToken orqali tasdiqlanadi', async () => {
    const user = await makeUser()
    const { refreshToken } = await generateTokens(user.id, user.role)

    const payload = await verifyRefreshToken(refreshToken)
    expect(payload.sub).toBe(user.id)
  })

  it('revoke qilingandan keyin refresh token rad etiladi', async () => {
    const user = await makeUser()
    const { refreshToken } = await generateTokens(user.id, user.role)
    const { jti } = jwt.verify(refreshToken, env.REFRESH_SECRET) as { jti: string }

    await revokeRefreshToken(user.id, jti)

    await expect(verifyRefreshToken(refreshToken)).rejects.toMatchObject({ statusCode: 401 })
  })

  it('revokeAllTokens — foydalanuvchining BARCHA refresh tokenlarini bekor qiladi', async () => {
    const user = await makeUser()
    const t1 = await generateTokens(user.id, user.role)
    const t2 = await generateTokens(user.id, user.role)

    await revokeAllTokens(user.id)

    await expect(verifyRefreshToken(t1.refreshToken)).rejects.toMatchObject({ statusCode: 401 })
    await expect(verifyRefreshToken(t2.refreshToken)).rejects.toMatchObject({ statusCode: 401 })
  })

  it("boshqa foydalanuvchining refresh tokeniga ta'sir qilmaydi", async () => {
    const userA = await makeUser()
    const userB = await makeUser()
    const tokensA = await generateTokens(userA.id, userA.role)
    const tokensB = await generateTokens(userB.id, userB.role)

    await revokeAllTokens(userA.id)

    await expect(verifyRefreshToken(tokensA.refreshToken)).rejects.toMatchObject({ statusCode: 401 })
    await expect(verifyRefreshToken(tokensB.refreshToken)).resolves.toMatchObject({ sub: userB.id })
  })

  it("noto'g'ri imzo bilan tokenni rad etadi", async () => {
    const fake = jwt.sign({ sub: 'x', jti: 'y' }, 'not-the-real-secret-at-all-000000')
    await expect(verifyRefreshToken(fake)).rejects.toMatchObject({ statusCode: 401 })
  })

  it("Redisda saqlangan refresh key aynan refresh:{userId}:{jti} formatida", async () => {
    const user = await makeUser()
    const { refreshToken } = await generateTokens(user.id, user.role)
    const { jti } = jwt.verify(refreshToken, env.REFRESH_SECRET) as { jti: string }

    expect(await testRedis.exists(`refresh:${user.id}:${jti}`)).toBe(1)
  })
})

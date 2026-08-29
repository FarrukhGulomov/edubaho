import { beforeEach } from 'vitest'
import { loadTestEnv } from './loadTestEnv'

loadTestEnv()

import { resetDb } from './db'
import { flushTestRedis } from './redis'

// Har bir test'dan OLDIN DB va Redis to'liq tozalanadi — testlar bir-biriga
// bog'liq bo'lmasin va tartibdan qat'i nazar bir xil natija bersin.
beforeEach(async () => {
  await resetDb()
  await flushTestRedis()
})

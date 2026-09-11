import { describe, it, expect } from 'vitest'
import { getTestApp } from '../test/app'
import { makeInstitution } from '../test/fixtures'
import { testPrisma } from '../test/db'

/** Test uchun Viloyat + Shahar yaratadi (fixtures.ts'da hali City/Region uchun helper yo'q) */
async function makeCity(nameUz: string) {
  const region = await testPrisma.region.create({
    data: { nameUz: `${nameUz} viloyati`, nameRu: `${nameUz} область`, slug: `region-${nameUz.toLowerCase()}`, type: 'region' },
  })
  const city = await testPrisma.city.create({
    data: { nameUz, nameRu: nameUz, slug: `city-${nameUz.toLowerCase()}`, regionId: region.id },
  })
  return { region, city }
}

describe('POST /match — filial orqali topilgan moslik (P0-1)', () => {
  it('muassasa Toshkentda ro\'yxatdan o\'tgan, lekin moslik Buxoro FILIALI orqali topilsa — matchedBranch qaytadi, asosiy shahar bilan aralashtirilmaydi', async () => {
    const app = await getTestApp()
    const { city: tashkent } = await makeCity('Toshkent')
    const { region: buxoroRegion, city: buxoro } = await makeCity('Buxoro')

    const inst = await makeInstitution({ nameUz: 'IELTS Markazi' })
    await testPrisma.institution.update({
      where: { id: inst.id },
      data: { cityId: tashkent.id, regionId: tashkent.regionId, isVerified: true },
    })
    await testPrisma.institutionBranch.create({
      data: {
        institutionId: inst.id, nameUz: 'Buxoro filiali',
        cityId: buxoro.id, regionId: buxoroRegion.id, address: 'Bahovuddin ko\'chasi 5',
      },
    })
    await testPrisma.institutionDetail.create({
      data: { institutionId: inst.id, descriptionUz: 'IELTS tayyorlov kursi', categories: ['IELTS'] },
    })
    await testPrisma.institutionPricing.create({
      data: { institutionId: inst.id, monthlyMin: 500_000 },
    })

    const res = await app.inject({
      method: 'POST', url: '/api/v1/match',
      payload: { type: 'COURSE_CENTER', goal: 'IELTS', cityId: buxoro.id },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data).toHaveLength(1)
    const result = body.data[0]
    expect(result.institution.id).toBe(inst.id)
    // Asosiy shahar hamon Toshkent — o'zgarmagan
    expect(result.institution.city?.nameUz).toBe('Toshkent')
    // Lekin moslik AYNAN filial orqali topilgani alohida ko'rsatiladi
    expect(result.institution.matchedBranch).not.toBeNull()
    expect(result.institution.matchedBranch.city.nameUz).toBe('Buxoro')
    expect(body.meta.locationRelaxed).toBe(false)
  })

  it('hech qanday filial yoki asosiy manzil mos kelmasa — matchedBranch null bo\'ladi', async () => {
    const app = await getTestApp()
    const { city: tashkent } = await makeCity('Toshkent2')
    const { city: samarqand } = await makeCity('Samarqand2')

    const inst = await makeInstitution({ nameUz: 'Dasturlash Markazi' })
    await testPrisma.institution.update({ where: { id: inst.id }, data: { cityId: tashkent.id, regionId: tashkent.regionId } })
    await testPrisma.institutionDetail.create({
      data: { institutionId: inst.id, categories: ['PROGRAMMING'] },
    })

    const res = await app.inject({
      method: 'POST', url: '/api/v1/match',
      payload: { type: 'COURSE_CENTER', goal: 'dasturlash', cityId: samarqand.id },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    // Shahar/viloyat darajasida topilmagani uchun butun O'zbekiston bo'yicha
    // qidiruvga o'tiladi (locationRelaxed=true), lekin matchedBranch baribir null
    if (body.data.length > 0) {
      expect(body.data[0].institution.matchedBranch).toBeNull()
      expect(body.meta.locationRelaxed).toBe(true)
    }
  })
})

describe('GET /match/insights — filial orqali ham shahar bo\'yicha hisoblanadi', () => {
  it('cityCount muassasaning FILIALI orqali mos kelishini ham hisobga oladi', async () => {
    const app = await getTestApp()
    const { city: tashkent } = await makeCity('Toshkent3')
    const { region: buxoroRegion, city: buxoro } = await makeCity('Buxoro3')

    const inst = await makeInstitution({ nameUz: 'IELTS Markazi 3' })
    await testPrisma.institution.update({ where: { id: inst.id }, data: { cityId: tashkent.id, regionId: tashkent.regionId } })
    await testPrisma.institutionBranch.create({
      data: { institutionId: inst.id, cityId: buxoro.id, regionId: buxoroRegion.id },
    })
    await testPrisma.institutionDetail.create({
      data: { institutionId: inst.id, categories: ['IELTS'] },
    })

    const res = await app.inject({
      method: 'GET', url: `/api/v1/match/insights?type=COURSE_CENTER&goal=IELTS&cityId=${buxoro.id}`,
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().data.cityCount).toBe(1)
  })
})

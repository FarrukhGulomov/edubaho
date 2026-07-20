import { z } from 'zod'

export const listInstitutionsQuerySchema = z.object({
  /** Muassasa nomi bo'yicha qidiruv (qisman mos keladi) */
  q:          z.string().optional(),
  /** Asosiy fan bo'yicha filter: "Python", "Matematika" va h.k. */
  subject:    z.string().optional(),
  type:       z.enum([
    'KINDERGARTEN','SCHOOL','LYCEUM','COLLEGE','UNIVERSITY',
    'COURSE_CENTER','LANGUAGE_CENTER','IT_SCHOOL','TUTORING',
    'SPORTS_SCHOOL','ARTS_SCHOOL',
  ]).optional(),
  cityId:     z.string().min(1).optional(),
  regionId:   z.string().min(1).optional(),
  lat:        z.coerce.number().optional(),
  lng:        z.coerce.number().optional(),
  radius:     z.coerce.number().min(100).max(50000).optional().default(5000),
  minRating:  z.coerce.number().min(1).max(5).optional(),
  monthlyMax: z.coerce.number().positive().optional(),
  lang:       z.enum(['uz', 'ru', 'en']).optional().default('uz'),
  sortBy:     z.enum(['rating', 'price_asc', 'price_desc', 'newest', 'popular', 'value']).optional().default('rating'),
  page:       z.coerce.number().int().min(1).optional().default(1),
  limit:      z.coerce.number().int().min(1).max(50).optional().default(20),
})

export const nearbyQuerySchema = z.object({
  lat:    z.coerce.number(),
  lng:    z.coerce.number(),
  radius: z.coerce.number().min(100).max(50000).optional().default(5000),
  type:   z.enum([
    'KINDERGARTEN','SCHOOL','LYCEUM','COLLEGE','UNIVERSITY',
    'COURSE_CENTER','LANGUAGE_CENTER','IT_SCHOOL','TUTORING',
    'SPORTS_SCHOOL','ARTS_SCHOOL',
  ]).optional(),
  limit:  z.coerce.number().int().min(1).max(50).optional().default(20),
})

export const compareQuerySchema = z.object({
  ids: z.string().transform((v) => v.split(',')).pipe(
    z.array(z.string().min(1)).min(2, 'Kamida 2 ta muassasa kerak').max(3, 'Ko\'pi bilan 3 ta muassasa'),
  ),
})

export type ListInstitutionsQuery = z.infer<typeof listInstitutionsQuerySchema>
export type NearbyQuery = z.infer<typeof nearbyQuerySchema>

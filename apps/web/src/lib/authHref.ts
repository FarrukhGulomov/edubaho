/**
 * Login sahifasiga havola yasash — login'dan keyin foydalanuvchi
 * kelgan sahifasiga qaytishi uchun ?next= param bilan.
 * Faqat ichki yo'llar qabul qilinadi (open-redirect himoyasi).
 */
export function authHref(next?: string) {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/auth')) {
    return '/auth'
  }
  return `/auth?next=${encodeURIComponent(next)}`
}

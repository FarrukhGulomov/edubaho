'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, Crown, PencilLine, BookOpen, Users, BarChart2, ChevronRight } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

export default function AdminPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [verifying, setVerifying] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!loading && !token) { router.replace('/admin/login'); return }
    if (!loading && token) {
      fetch(`${API}/auth/admin-check`, {
        headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': '1' },
      })
        .then(r => r.json())
        .then(d => {
          if (!d.verified) router.replace('/admin/login')
          else setVerifying(false)
        })
        .catch(() => router.replace('/admin/login'))
    }
  }, [loading, router])

  if (loading || verifying) return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-line-2 border-t-primary-600" />
    </div>
  )

  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    router.replace('/admin/login')
    return null
  }

  const isSuperAdmin = user.role === 'SUPER_ADMIN'

  const links = [
    {
      href: '/admin/reviews',
      Icon: PencilLine,
      title: 'Sharhlarni moderatsiya',
      desc: "Kutayotgan, shikoyat qilingan va rad etilgan sharhlar",
      cls: 'border-orange-200 bg-orange-50/50 dark:border-orange-500/20 dark:bg-orange-500/5',
      iconCls: 'bg-orange-500',
    },
    {
      href: '/admin/institutions',
      Icon: BookOpen,
      title: 'Muassasalar boshqaruvi',
      desc: "Qo'shish, tahrirlash, o'chirish, status o'zgartirish",
      cls: 'border-primary-200 bg-primary-50/50 dark:border-primary-500/20 dark:bg-primary-500/5',
      iconCls: 'bg-primary-600',
    },
  ]

  if (isSuperAdmin) {
    links.push(
      {
        href: '/admin/super',
        Icon: Crown,
        title: 'Super Admin boshqaruvi',
        desc: "Adminlarni tayinlash, ruxsatlarni sozlash",
        cls: 'border-violet-200 bg-violet-50/50 dark:border-violet-500/20 dark:bg-violet-500/5',
        iconCls: 'bg-violet-600',
      },
      {
        href: '/admin/analytics',
        Icon: BarChart2,
        title: 'Statistika',
        desc: "Sayt ko'rsatkichlari va analitika",
        cls: 'border-cyan-200 bg-cyan-50/50 dark:border-cyan-500/20 dark:bg-cyan-500/5',
        iconCls: 'bg-cyan-600',
      },
      {
        href: '/admin/users',
        Icon: Users,
        title: 'Foydalanuvchilar',
        desc: "Barcha foydalanuvchilarni boshqarish",
        cls: 'border-teal-200 bg-teal-50/50 dark:border-teal-500/20 dark:bg-teal-500/5',
        iconCls: 'bg-teal-600',
      },
    )
  }

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/" className="font-semibold text-primary-600 transition-colors hover:text-primary-700">
              EDUBAHO
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-faint" aria-hidden />
            <span className="font-semibold text-ink">Admin panel</span>
          </div>
          <div className="flex items-center gap-1.5">
            {isSuperAdmin
              ? <Crown className="h-4 w-4 text-amber-500" aria-hidden />
              : <ShieldCheck className="h-4 w-4 text-primary-500" aria-hidden />
            }
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              isSuperAdmin
                ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400'
                : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
            }`}>
              {user.role}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-7">
          <div className="flex items-center gap-2.5">
            {isSuperAdmin
              ? <Crown className="h-5 w-5 text-amber-500" aria-hidden />
              : <ShieldCheck className="h-5 w-5 text-primary-600" aria-hidden />
            }
            <h1 className="text-xl font-bold text-ink">Admin panel</h1>
          </div>
          <p className="mt-1 text-sm text-mute">Xush kelibsiz, {user.name ?? user.phone}!</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {links.map(({ href, Icon, title, desc, cls, iconCls }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-4 rounded-2xl border p-5 transition-all hover:shadow-card-hover ${cls}`}
            >
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconCls}`}>
                <Icon className="h-5 w-5 text-white" aria-hidden />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-bold text-ink">{title}</h2>
                <p className="mt-0.5 text-xs text-mute">{desc}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-faint" aria-hidden />
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}

---
name: frontend-standards
description: Frontend coding standards for the EduReyting/BilimOn project — Next.js 15 App Router, TypeScript, Tailwind CSS, and plain fetch/hooks state management. Use this skill whenever writing, reviewing, or refactoring frontend code — including creating new pages/components, naming branches or commits, checking React/Next.js performance. ADAPTED from a company-wide skill originally written for a different stack (Feature-Sliced Design, styled-components, TanStack Query/Zustand/Redux Toolkit) — only the git-conventions and performance references apply here; the architecture-fsd and code-style references describe a stack this project does NOT use and should be ignored for this project.
license: Proprietary — internal company use
metadata:
  author: Frontend Guild (adapted for EduReyting/BilimOn)
  version: "1.0.0-adapted"
---

# Frontend Standards (EduReyting/BilimOn stack)

Bu skill kompaniyaning umumiy frontend-standart to'plamidan **moslashtirilgan** — asl versiya boshqa stack (Feature-Sliced Design, styled-components, TanStack Query/Zustand/Redux Toolkit) uchun yozilgan edi. EduReyting/BilimOn loyihasi bu stack'ni ishlatmaydi, shuning uchun faqat stack'dan mustaqil (universal) qismlar qo'llaniladi.

## Loyihaning haqiqiy stack'i

- **Next.js 15 App Router** — `apps/web/src/app/`, `components/`, `hooks/`, `lib/` — FSD emas
- **Tailwind CSS** — inline util-klasslar, styled-components emas
- **State**: oddiy `useState`/`useMemo`/`useEffect` + kichik custom hook'lar (`useAuth`, `useCompare` va h.k.) — TanStack Query/Zustand/Redux Toolkit ishlatilmaydi
- **API**: `lib/api.ts` orqali oddiy `fetch` wrapper'lar
- Loyihaning to'liq qoidalari — repo ildizidagi `.claude/CLAUDE.md` (UZS format, i18n, telefon format va h.k.) — bu asosiy manba, shu skill'dan ustun turadi

## Qaysi reference'lar qo'llaniladi

| Vazifa | Nima o'qiladi | Holat |
|---|---|---|
| Branch/commit nomi | `references/git-conventions.md` | ✅ To'liq qo'llaniladi — stack'dan mustaqil |
| Performance (waterfalls, keraksiz `await`, re-render, bandl) | `references/react-nextjs-performance.md` | ✅ Asosiy printsiplar qo'llaniladi. **E'tibor bering:** faylda TanStack Query/Zustand/RTK/styled-components/FSD'ga oid misollar bor — ularni e'tiborsiz qoldiring, faqat umumiy React/Next.js performance mantig'ini oling |
| Papka strukturasi, qayerga kod yozish | ~~`references/architecture-fsd.md`~~ | ❌ **QO'LLANILMAYDI** — FSD bu loyihada yo'q. Buning o'rniga mavjud `apps/web/src/` strukturasiga ergashing (yangi component → `components/<domain>/`, yangi sahifa → `app/<route>/page.tsx`, umumiy logika → `lib/` yoki `hooks/`) |
| Kod uslubi, komponent nomlash, CSS | ~~`references/code-style.md`~~ | ⚠️ **QISMAN** — umumiy TS/nomlash printsiplari (masalan `any` ishlatmaslik, aniq tip) foydali, lekin styled-components'ga oid bo'limlarni e'tiborsiz qoldiring. Tailwind/JSX uslubi uchun loyihada mavjud kod pattern'iga ergashing (masalan `CompareContent.tsx`, `auth/page.tsx`) |

## Asosiy printsip

Nostandart kod yozishdan oldin tekshiring:

1. Vazifani aynan hal qiladi — ortiqcha fича yoki aloqasiz o'zgarish yo'q
2. Mavjud `apps/web/src/` papka strukturasiga mos (FSD emas)
3. Tailwind klasslar ishlatiladi (styled-components emas)
4. `any` ishlatilmaydi, aniq TypeScript tiplari bor
5. `.claude/CLAUDE.md`dagi loyiha qoidalariga zid emas (UZS format, i18n juftlik, telefon format va h.k.)

Agar vazifa loyihaning haqiqiy stack'iga (Tailwind/Next.js App Router) zid bo'lsa — jim o'tkazmang, ziddiyatni aniq ayting.

## Definition of Done

Kod tayyor bo'ladi qachonki: aynan so'ralgan narsa amalga oshirilgan → mavjud papka strukturasiga mos → Tailwind ishlatilgan → `tsc --noEmit`/`build` xatosiz o'tadi → `any` yo'q → branch/commit nomlari `git-conventions.md`ga mos.

## Atributsiya

Asl skill — Frontend Guild (boshqa loyiha/stack uchun, Proprietary). Performance bo'limi (`references/react-nextjs-performance.md`) taksonomiyasi ochiq (MIT) Vercel Engineering `vercel-react-best-practices` skill'idan ilhomlangan ([github.com/vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills)).

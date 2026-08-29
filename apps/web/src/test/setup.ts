import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// Vitest'da `globals: true` yoqilmagani uchun testing-library'ning
// avtomatik tozalashi (afterEach cleanup) o'zi ishlamaydi — qo'lda ro'yxatdan
// o'tkazamiz, aks holda har bir test avvalgi testning DOM elementlarini
// ham ko'radi (masalan bir nechta <Probe/> render qilingan holatda)
afterEach(() => {
  cleanup()
})

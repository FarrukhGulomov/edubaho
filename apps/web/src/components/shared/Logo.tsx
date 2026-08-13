import Image from 'next/image'

interface LogoProps {
  size?: number
  inverted?: boolean
  className?: string
}

export default function Logo({ size = 40, inverted = false, className }: LogoProps) {
  const logoSrc = inverted ? '/brand/bilimon-wordmark-white.png' : '/brand/bilimon-wordmark.png'

  return (
    <Image
      src={logoSrc}
      alt="BilimOn"
      height={size}
      width={size * 2.8}
      priority
      className={className}
      style={{ display: 'block' }}
    />
  )
}

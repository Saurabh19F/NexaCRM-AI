const LOGO_ICON_SRC = '/brand/nexacrm-ai-icon.png'
const LOGO_WORDMARK_DARK_SRC = '/brand/nexacrm-ai-wordmark.png'
const LOGO_WORDMARK_LIGHT_SRC = '/brand/nexacrm-ai-wordmark-light.png'

const WORDMARK_HEIGHT = {
  sm: 'h-8',
  md: 'h-10',
  lg: 'h-12',
}

const ICON_SIZE = {
  sm: 'h-9 w-9',
  md: 'h-11 w-11',
  lg: 'h-14 w-14',
}

export default function BrandLogo({
  variant = 'wordmark',
  size = 'md',
  tone = 'auto',
  className = '',
  imageClassName = '',
}) {
  if (variant === 'icon') {
    return (
      <img
        src={LOGO_ICON_SRC}
        alt="NexaCRM AI"
        className={`${ICON_SIZE[size] ?? ICON_SIZE.md} object-contain ${className}`}
      />
    )
  }

  const baseImageClass = `${WORDMARK_HEIGHT[size] ?? WORDMARK_HEIGHT.md} w-auto max-w-full object-contain object-left ${imageClassName}`

  if (tone === 'light') {
    return (
      <div className={`min-w-0 ${className}`}>
        <img
          src={LOGO_WORDMARK_LIGHT_SRC}
          alt="NexaCRM AI"
          className={baseImageClass}
        />
      </div>
    )
  }

  if (tone === 'dark') {
    return (
      <div className={`min-w-0 ${className}`}>
        <img
          src={LOGO_WORDMARK_DARK_SRC}
          alt="NexaCRM AI"
          className={baseImageClass}
        />
      </div>
    )
  }

  return (
    <div className={`min-w-0 ${className}`}>
      <img
        src={LOGO_WORDMARK_LIGHT_SRC}
        alt="NexaCRM AI"
        className={`${baseImageClass} dark:hidden`}
      />
      <img
        src={LOGO_WORDMARK_DARK_SRC}
        alt="NexaCRM AI"
        className={`${baseImageClass} hidden dark:block`}
      />
    </div>
  )
}

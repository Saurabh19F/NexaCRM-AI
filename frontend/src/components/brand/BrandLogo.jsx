const LOGO_ICON_SRC = '/brand/nexacrm-ai-icon.png'
const LOGO_WORDMARK_SRC = '/brand/nexacrm-ai-wordmark.png'

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
  framed = false,
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

  const content = (
    <img
      src={LOGO_WORDMARK_SRC}
      alt="NexaCRM AI"
      className={`${WORDMARK_HEIGHT[size] ?? WORDMARK_HEIGHT.md} w-auto max-w-full object-contain object-left ${imageClassName}`}
    />
  )

  if (!framed) {
    return <div className={`min-w-0 ${className}`}>{content}</div>
  }

  return (
    <div className={`inline-flex min-w-0 items-center rounded-xl bg-slate-950/95 px-3 py-2 shadow-lg ring-1 ring-white/10 ${className}`}>
      {content}
    </div>
  )
}

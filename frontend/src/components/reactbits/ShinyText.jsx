export default function ShinyText({ children, className = '' }) {
  return (
    <span className={`reactbits-shiny-text ${className}`}>
      {children}
    </span>
  )
}

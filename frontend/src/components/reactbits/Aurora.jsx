export default function Aurora({ className = '' }) {
  return (
    <div className={`reactbits-aurora ${className}`} aria-hidden="true">
      <div className="reactbits-aurora__band reactbits-aurora__band--one" />
      <div className="reactbits-aurora__band reactbits-aurora__band--two" />
      <div className="reactbits-aurora__mesh" />
    </div>
  )
}

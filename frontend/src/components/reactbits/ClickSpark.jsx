import { useEffect, useState } from 'react'

export default function ClickSpark() {
  const [sparks, setSparks] = useState([])

  useEffect(() => {
    const handleClick = (event) => {
      const id = `${Date.now()}-${Math.random()}`
      setSparks((current) => [
        ...current.slice(-10),
        { id, x: event.clientX, y: event.clientY },
      ])
      window.setTimeout(() => {
        setSparks((current) => current.filter((spark) => spark.id !== id))
      }, 700)
    }

    window.addEventListener('pointerdown', handleClick)
    return () => window.removeEventListener('pointerdown', handleClick)
  }, [])

  return (
    <div className="reactbits-click-sparks" aria-hidden="true">
      {sparks.map((spark) => (
        <span
          key={spark.id}
          className="reactbits-click-spark"
          style={{ left: spark.x, top: spark.y }}
        />
      ))}
    </div>
  )
}

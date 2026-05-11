export default function PageHeading({ title, subtitle, icon = null }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
        {icon}
        {title}
      </h1>
      {subtitle ? (
        <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
      ) : null}
    </div>
  )
}


const toneStyles = {
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  slate: "bg-slate-50 text-slate-700 ring-slate-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  red: "bg-red-50 text-red-700 ring-red-200",
};

const cardStyles = {
  blue: "border-slate-200 bg-white text-slate-700",
  slate: "border-slate-200 bg-white text-slate-700",
  amber: "border-slate-200 bg-white text-slate-700",
  violet: "border-slate-200 bg-white text-slate-700",
  green: "border-slate-200 bg-white text-slate-700",
  indigo: "border-slate-200 bg-white text-slate-700",
  red: "border-slate-200 bg-white text-slate-700",
};

const icons = {
  total: "T",
  todo: "O",
  progress: "P",
  review: "R",
  done: "D",
};

export default function StatCard({ label, value, tone = "blue", icon = "total" }) {
  return (
    <article className={`rounded-2xl border p-5 shadow-sm ${cardStyles[tone] || cardStyles.blue}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold opacity-80">{label}</p>
          <p className="mt-3 text-3xl font-bold text-slate-950">{value}</p>
        </div>
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold ring-1 ${toneStyles[tone]}`}>
          {icons[icon] || icons.total}
        </span>
      </div>
      <span className={`mt-4 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${toneStyles[tone]}`}>
        Live
      </span>
    </article>
  );
}

const toneStyles = {
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  slate: "bg-slate-50 text-slate-700 ring-slate-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  green: "bg-green-50 text-green-700 ring-green-200",
};

const icons = {
  total: "T",
  todo: "O",
  progress: "P",
  done: "D",
};

export default function StatCard({ label, value, tone = "blue", icon = "total" }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-bold text-slate-950">{value}</p>
        </div>
        <span className={`flex h-11 w-11 items-center justify-center rounded-lg text-sm font-bold ring-1 ${toneStyles[tone]}`}>
          {icons[icon] || icons.total}
        </span>
      </div>
      <span className={`mt-4 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${toneStyles[tone]}`}>
        Live
      </span>
    </article>
  );
}

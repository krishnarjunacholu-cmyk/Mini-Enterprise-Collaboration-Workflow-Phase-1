const statusStyles = {
  todo: "border border-slate-200 bg-slate-100 text-slate-700",
  in_progress: "border border-amber-200 bg-amber-50 text-amber-700",
  review: "border border-violet-200 bg-violet-50 text-violet-700",
  done: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

const statusLabels = {
  todo: "Todo",
  in_progress: "In progress",
  review: "Review",
  done: "Done",
};

export default function StatusBadge({ status }) {
  return (
    <span className={`badge ring-1 ${statusStyles[status] || statusStyles.todo}`}>
      {statusLabels[status] || status}
    </span>
  );
}

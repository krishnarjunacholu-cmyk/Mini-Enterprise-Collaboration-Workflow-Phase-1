const statusStyles = {
  todo: "bg-slate-100 text-slate-700 ring-slate-200",
  in_progress: "bg-blue-50 text-blue-700 ring-blue-200",
  done: "bg-green-50 text-green-700 ring-green-200",
};

const statusLabels = {
  todo: "Todo",
  in_progress: "In progress",
  done: "Done",
};

export default function StatusBadge({ status }) {
  return (
    <span className={`badge ring-1 ${statusStyles[status] || statusStyles.todo}`}>
      {statusLabels[status] || status}
    </span>
  );
}

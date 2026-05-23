const priorityStyles = {
  low: "bg-slate-100 text-slate-700 ring-slate-200",
  medium: "bg-blue-50 text-blue-700 ring-blue-200",
  high: "bg-red-50 text-red-700 ring-red-200",
};

export default function PriorityBadge({ priority }) {
  return (
    <span className={`badge capitalize ring-1 ${priorityStyles[priority] || priorityStyles.medium}`}>
      {priority}
    </span>
  );
}

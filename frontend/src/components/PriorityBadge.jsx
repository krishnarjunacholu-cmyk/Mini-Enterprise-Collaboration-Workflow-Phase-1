const priorityStyles = {
  low: "bg-green-50 text-green-700 ring-green-200",
  medium: "bg-amber-50 text-amber-800 ring-amber-200",
  high: "bg-red-50 text-red-700 ring-red-200",
};

export default function PriorityBadge({ priority }) {
  return (
    <span className={`badge capitalize ring-1 ${priorityStyles[priority] || priorityStyles.medium}`}>
      {priority}
    </span>
  );
}

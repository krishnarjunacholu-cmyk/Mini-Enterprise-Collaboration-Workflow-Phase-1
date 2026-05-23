const statusStyles = {
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  manager_approved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  admin_approved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  rejected: "bg-red-50 text-red-700 ring-red-200",
  hold: "bg-orange-50 text-orange-700 ring-orange-200",
};

const statusLabels = {
  pending: "Pending",
  manager_approved: "Manager approved",
  admin_approved: "Admin approved",
  rejected: "Rejected",
  hold: "Hold",
};

export default function ApprovalStatusBadge({ status }) {
  return (
    <span className={`badge ring-1 ${statusStyles[status] || statusStyles.pending}`}>
      {statusLabels[status] || status}
    </span>
  );
}

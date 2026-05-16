import { Link } from "react-router-dom";

import PriorityBadge from "./PriorityBadge";
import StatusBadge from "./StatusBadge";
import { canAssignTasks, canDeleteTasks } from "../utils/auth";

export default function TaskCard({
  task,
  user,
  onDelete,
  onAssign,
  onStatusChange,
  assignValue,
  onAssignValueChange,
}) {
  const showAssign = canAssignTasks(user);
  const showDelete = canDeleteTasks(user);

  return (
    <article className="task-card">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-slate-950 sm:text-lg">{task.title}</h3>
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
          </div>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
            {task.description || "No description provided."}
          </p>
        </div>

        <dl className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2 xl:w-[28rem]">
          <Meta label="Due date" value={task.due_date ? new Date(task.due_date).toLocaleString() : "None"} />
          <Meta label="Created" value={new Date(task.created_at).toLocaleString()} />
          <Meta label="Created by" value={`User #${task.created_by_id}`} />
          <Meta label="Assigned to" value={task.assigned_to_id ? `User #${task.assigned_to_id}` : "Unassigned"} />
        </dl>
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Link className="btn-secondary" to={`/tasks/edit/${task.id}`}>
            View/Edit
          </Link>
          {showDelete && (
            <button className="btn-danger" type="button" onClick={() => onDelete(task.id)}>
              Delete
            </button>
          )}
        </div>

        <div className="grid gap-2 sm:grid-cols-[160px_1fr] xl:flex xl:items-center">
          <label className="sr-only" htmlFor={`status-${task.id}`}>
            Update status
          </label>
          <select
            className="input"
            id={`status-${task.id}`}
            value={task.status}
            onChange={(event) => onStatusChange(task.id, event.target.value)}
          >
            <option value="todo">todo</option>
            <option value="in_progress">in_progress</option>
            <option value="done">done</option>
          </select>

          {showAssign && (
            <div className="flex gap-2">
              <label className="sr-only" htmlFor={`assign-${task.id}`}>
                Assigned user id
              </label>
              <input
                className="input w-32"
                id={`assign-${task.id}`}
                min="1"
                placeholder="User ID"
                type="number"
                value={assignValue || ""}
                onChange={(event) => onAssignValueChange(task.id, event.target.value)}
              />
              <button className="btn-primary" type="button" onClick={() => onAssign(task.id)}>
                Assign
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function Meta({ label, value }) {
  return (
    <div className="rounded-md bg-slate-50 px-3 py-2">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 truncate font-medium text-slate-800">{value}</dd>
    </div>
  );
}

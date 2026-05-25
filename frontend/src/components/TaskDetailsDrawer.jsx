import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

import PriorityBadge from "./PriorityBadge";
import StatusBadge from "./StatusBadge";
import TaskActivity from "./TaskActivity";
import TaskComments from "./TaskComments";
import TaskStatusHistory from "./TaskStatusHistory";
import { canAssignTasks, canDeleteTasks } from "../utils/auth";

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "None";
}

export default function TaskDetailsDrawer({
  task,
  isOpen,
  onClose,
  currentUser,
  onStatusUpdate,
  onDelete,
  onAssign,
}) {
  const [status, setStatus] = useState(task?.status || "todo");
  const [assignedToId, setAssignedToId] = useState(task?.assigned_to_id || "");
  const canAssign = canAssignTasks(currentUser);
  const canDelete = canDeleteTasks(currentUser);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus(task?.status || "todo");
    setAssignedToId(task?.assigned_to_id || "");
  }, [task]);

  if (!isOpen || !task) return null;

  async function updateStatus(event) {
    const nextStatus = event.target.value;
    setStatus(nextStatus);
    await onStatusUpdate(task.id, nextStatus);
  }

  async function assignTask() {
    const userId = Number(assignedToId);
    if (!userId) return;
    await onAssign(task.id, userId);
  }

  async function deleteTask() {
    await onDelete(task.id);
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        aria-label="Close task details"
        className="absolute inset-0 bg-slate-950/30"
        type="button"
        onClick={onClose}
      />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl">
        <header className="border-b border-slate-200 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Task details</p>
              <h2 className="mt-2 text-xl font-bold text-slate-950">{task.title}</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusBadge status={task.status} />
                <PriorityBadge priority={task.priority} />
              </div>
            </div>
            <button className="btn-secondary px-3 py-1.5" type="button" onClick={onClose}>
              Close
            </button>
          </div>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-950">Description</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{task.description || "No description provided."}</p>
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <Meta label="Due date" value={formatDate(task.due_date)} />
            <Meta label="Created" value={formatDate(task.created_at)} />
            <Meta label="Updated" value={formatDate(task.updated_at)} />
            <Meta label="Created by" value={`User #${task.created_by_id}`} />
            <Meta label="Assigned to" value={task.assigned_to_id ? `User #${task.assigned_to_id}` : "Unassigned"} />
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-950">Workflow actions</h3>
            <div className="mt-4 grid gap-3">
              <div>
                <label className="field-label" htmlFor="drawer-status">Status</label>
                <select className="input" id="drawer-status" value={status} onChange={updateStatus}>
                  <option value="todo">todo</option>
                  <option value="in_progress">in_progress</option>
                  <option value="review">review</option>
                  <option value="done">done</option>
                </select>
              </div>

              {canAssign && (
                <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
                  <div>
                    <label className="field-label" htmlFor="drawer-assigned-to">Assigned user id</label>
                    <input
                      className="input"
                      id="drawer-assigned-to"
                      min="1"
                      type="number"
                      value={assignedToId || ""}
                      onChange={(event) => setAssignedToId(event.target.value)}
                    />
                  </div>
                  <button className="btn-secondary" type="button" onClick={assignTask}>
                    Assign
                  </button>
                </div>
              )}

              <div className="flex flex-col gap-2 sm:flex-row">
                <Link className="btn-primary" to={`/tasks/edit/${task.id}`}>
                  View/Edit
                </Link>
                {canDelete && (
                  <button className="btn-danger-outline" type="button" onClick={deleteTask}>
                    Delete
                  </button>
                )}
              </div>
            </div>
          </section>

          <TaskComments taskId={task.id} user={currentUser} />
          <TaskStatusHistory taskId={task.id} />
          <TaskActivity taskId={task.id} />
        </div>
      </aside>
    </div>
  );
}

function Meta({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 truncate text-sm font-semibold text-slate-800">{value}</dd>
    </div>
  );
}

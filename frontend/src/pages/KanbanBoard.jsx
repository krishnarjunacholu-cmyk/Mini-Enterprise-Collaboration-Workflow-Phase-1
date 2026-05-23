import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import api, { getApiError } from "../api/axios";
import Alert from "../components/Alert";
import AppLayout from "../components/AppLayout";
import LoadingSpinner from "../components/LoadingSpinner";
import PriorityBadge from "../components/PriorityBadge";
import TaskDetailsDrawer from "../components/TaskDetailsDrawer";
import { getStoredUser, saveUser } from "../utils/auth";

const columns = [
  { id: "todo", title: "TODO" },
  { id: "in_progress", title: "IN PROGRESS" },
  { id: "review", title: "REVIEW" },
  { id: "done", title: "DONE" },
];

const columnStyles = {
  todo: "border-slate-200 bg-slate-50",
  in_progress: "border-stone-200 bg-stone-50",
  review: "border-zinc-200 bg-zinc-50",
  done: "border-slate-200 bg-slate-50",
};

function normalizeBoard(data) {
  return Object.fromEntries(columns.map((column) => [column.id, data?.[column.id] || []]));
}

export default function KanbanBoard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(getStoredUser());
  const [board, setBoard] = useState(normalizeBoard());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selectedTask, setSelectedTask] = useState(null);

  const visibleCount = useMemo(
    () => columns.reduce((total, column) => total + board[column.id].length, 0),
    [board]
  );

  const loadBoard = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const [meResponse, boardResponse] = await Promise.all([
        api.get("/auth/me"),
        api.get("/tasks/kanban"),
      ]);
      saveUser(meResponse.data);
      setUser(meResponse.data);
      setBoard(normalizeBoard(boardResponse.data));
    } catch (err) {
      setError(getApiError(err));
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadBoard();
  }, [loadBoard]);

  async function onDragEnd(result) {
    const { destination, draggableId, source } = result;
    if (!destination || destination.droppableId === source.droppableId) return;

    const taskId = Number(draggableId);
    const fromStatus = source.droppableId;
    const toStatus = destination.droppableId;
    const movedTask = board[fromStatus].find((task) => task.id === taskId);
    if (!movedTask) return;

    const previousBoard = board;
    const nextBoard = normalizeBoard(previousBoard);
    nextBoard[fromStatus] = nextBoard[fromStatus].filter((task) => task.id !== taskId);
    nextBoard[toStatus] = [
      ...nextBoard[toStatus].slice(0, destination.index),
      { ...movedTask, status: toStatus },
      ...nextBoard[toStatus].slice(destination.index),
    ];
    setBoard(nextBoard);
    setError("");
    setMessage("");

    try {
      await api.patch(`/tasks/${taskId}/status`, {
        status: toStatus,
        comment: "Status updated from Kanban board",
      });
      setMessage(`Task moved from ${fromStatus} to ${toStatus}.`);
      await loadBoard();
    } catch (err) {
      setBoard(previousBoard);
      setError(getApiError(err));
    }
  }

  async function updateTaskStatus(taskId, status) {
    setError("");
    setMessage("");
    try {
      const response = await api.patch(`/tasks/${taskId}/status`, {
        status,
        comment: "Status updated from Kanban task details",
      });
      setSelectedTask(response.data);
      setMessage("Task status updated.");
      await loadBoard();
    } catch (err) {
      setError(getApiError(err));
      throw err;
    }
  }

  async function assignTask(taskId, assignedToId) {
    setError("");
    setMessage("");
    try {
      const response = await api.patch(`/tasks/${taskId}/assign`, {
        assigned_to_id: assignedToId,
      });
      setSelectedTask(response.data);
      setMessage("Task assigned successfully.");
      await loadBoard();
    } catch (err) {
      setError(getApiError(err));
      throw err;
    }
  }

  async function deleteTask(taskId) {
    setError("");
    setMessage("");
    try {
      await api.delete(`/tasks/${taskId}`);
      setSelectedTask(null);
      setMessage("Task deleted successfully.");
      await loadBoard();
    } catch (err) {
      setError(getApiError(err));
      throw err;
    }
  }

  return (
    <AppLayout user={user}>
      <section className="dashboard-header">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-indigo-700">Kanban workflow</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Kanban Board
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Drag tasks through the approved workflow: todo, in progress, review, and done.
          </p>
        </div>
        <span className="rounded-md border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
          {visibleCount} visible tasks
        </span>
      </section>

      {error && <Alert className="mt-4">{error}</Alert>}
      {message && <Alert className="mt-4" type="success">{message}</Alert>}

      {loading ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <LoadingSpinner label="Loading Kanban board..." />
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <section className="mt-6 h-[calc(100vh-220px)] min-h-[34rem] overflow-x-auto overflow-y-hidden pb-2">
            <div className="grid h-full min-w-[72rem] grid-cols-4 gap-4 xl:min-w-0">
              {columns.map((column) => (
                <Droppable droppableId={column.id} key={column.id}>
                  {(provided) => (
                    <section className={`flex h-full flex-col overflow-hidden rounded-2xl border shadow-sm ${columnStyles[column.id]}`}>
                      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
                        <h2 className="text-sm font-bold text-slate-800">{column.title}</h2>
                        <span className="badge bg-slate-100 text-slate-700">{board[column.id].length}</span>
                      </header>
                      <div
                        className="flex-1 space-y-3 overflow-y-auto p-4"
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                      >
                        {board[column.id].map((task, index) => (
                          <Draggable draggableId={String(task.id)} index={index} key={task.id}>
                            {(dragProvided, dragSnapshot) => (
                              <article
                                className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                                role="button"
                                tabIndex={0}
                                onClick={() => {
                                  if (!dragSnapshot.isDragging) setSelectedTask(task);
                                }}
                                onKeyDown={(event) => {
                                  if ((event.key === "Enter" || event.key === " ") && !dragSnapshot.isDragging) {
                                    event.preventDefault();
                                    setSelectedTask(task);
                                  }
                                }}
                              >
                                <h3 className="font-semibold text-slate-950">{task.title}</h3>
                                <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                                  {task.description || "No description."}
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <PriorityBadge priority={task.priority} />
                                  <span className="badge bg-white text-slate-700 ring-1 ring-slate-200">
                                    Assigned #{task.assigned_to_id || "none"}
                                  </span>
                                </div>
                                <p className="mt-3 text-xs text-slate-500">
                                  Due: {task.due_date ? new Date(task.due_date).toLocaleString() : "None"}
                                </p>
                              </article>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    </section>
                  )}
                </Droppable>
              ))}
            </div>
          </section>
        </DragDropContext>
      )}
      <TaskDetailsDrawer
        currentUser={user}
        isOpen={Boolean(selectedTask)}
        task={selectedTask}
        onAssign={assignTask}
        onClose={() => setSelectedTask(null)}
        onDelete={deleteTask}
        onStatusUpdate={updateTaskStatus}
      />
    </AppLayout>
  );
}

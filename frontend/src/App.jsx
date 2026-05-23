import { Navigate, Route, Routes } from "react-router-dom";

import ApprovalHistory from "./pages/ApprovalHistory";
import Approvals from "./pages/Approvals";
import CreateApproval from "./pages/CreateApproval";
import ProtectedRoute from "./components/ProtectedRoute";
import CreateTask from "./pages/CreateTask";
import Dashboard from "./pages/Dashboard";
import EditTask from "./pages/EditTask";
import KanbanBoard from "./pages/KanbanBoard";
import Login from "./pages/Login";
import Register from "./pages/Register";

function DefaultRoute() {
  return localStorage.getItem("token") ? (
    <Navigate to="/dashboard" replace />
  ) : (
    <Navigate to="/login" replace />
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<DefaultRoute />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/kanban" element={<KanbanBoard />} />
        <Route path="/tasks/create" element={<CreateTask />} />
        <Route path="/tasks/edit/:id" element={<EditTask />} />
        <Route path="/approvals" element={<Approvals />} />
        <Route path="/approvals/create" element={<CreateApproval />} />
        <Route path="/approvals/:id/history" element={<ApprovalHistory />} />
      </Route>
      <Route path="*" element={<DefaultRoute />} />
    </Routes>
  );
}

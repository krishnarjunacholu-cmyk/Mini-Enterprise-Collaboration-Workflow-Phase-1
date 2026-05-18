import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

export default function AppLayout({ user, children }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar user={user} />
      <Navbar user={user} />
      <main className="px-4 py-6 lg:ml-72 lg:px-8">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}

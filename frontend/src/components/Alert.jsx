export default function Alert({ children, type = "error", className = "" }) {
  const styles = {
    error: "border-red-200 bg-red-50 text-red-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    info: "border-sky-200 bg-sky-50 text-sky-700",
  };

  return (
    <div className={`rounded-md border px-3 py-2 text-sm font-medium ${styles[type]} ${className}`} role="alert">
      {children}
    </div>
  );
}

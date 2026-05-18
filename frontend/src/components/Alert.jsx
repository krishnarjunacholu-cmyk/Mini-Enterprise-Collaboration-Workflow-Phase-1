export default function Alert({ children, type = "error", className = "" }) {
  const styles = {
    error: "border-red-200 bg-red-50 text-red-700",
    success: "border-green-200 bg-green-50 text-green-700",
    info: "border-blue-200 bg-blue-50 text-blue-700",
  };

  return (
    <div className={`rounded-md border px-3 py-2 text-sm font-medium ${styles[type]} ${className}`} role="alert">
      {children}
    </div>
  );
}

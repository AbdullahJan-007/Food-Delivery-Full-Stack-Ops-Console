export default function FormField({ label, error, children }) {
  return (
    <div>
      {label && <label className="block text-sm font-medium mb-1.5">{label}</label>}
      {children}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

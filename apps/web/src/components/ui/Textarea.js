export default function Textarea({ className = "", ...props }) {
  return (
    <textarea
      className={`w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-950 ${className}`}
      {...props}
    />
  );
}
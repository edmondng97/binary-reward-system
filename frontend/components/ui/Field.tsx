export function Field({ label, value, onChange, type = 'text', placeholder }:
  { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="eyebrow">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-[var(--line)] bg-[#080b16] px-3 py-2 text-sm text-[#e8ecf5]
          placeholder:text-[#586079] outline-none transition
          focus:border-[#38e1ff]/60 focus:ring-2 focus:ring-[#38e1ff]/15"
      />
    </label>
  );
}

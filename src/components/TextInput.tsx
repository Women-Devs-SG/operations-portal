import type { InputHTMLAttributes } from 'react';

// Shared styling for every text-like field in the portal.
export default function TextInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, 'className'>) {
  return (
    <input
      {...props}
      className="w-full rounded-[9px] border border-field-border bg-surface px-[13px] py-[11px] text-ink outline-none transition focus:border-field-focus focus:shadow-[0_0_0_3px_rgba(81,125,61,.13)]"
    />
  );
}

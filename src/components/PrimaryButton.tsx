import type { ButtonHTMLAttributes } from 'react';

// Full-width primary action with busy/disabled styling.
export default function PrimaryButton({
  children,
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'type'>) {
  return (
    <button
      {...props}
      className="mt-[22px] w-full rounded-[9px] bg-primary px-[18px] py-[13px] font-bold text-white transition hover:-translate-y-px hover:bg-primary-dark disabled:cursor-wait disabled:bg-primary-disabled"
      type="submit"
    >
      {children}
    </button>
  );
}

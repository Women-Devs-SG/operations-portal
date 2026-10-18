import type { ReactNode } from 'react';

// The white panel every page section sits in.
export default function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`${className} rounded-[18px] border border-panel-border/12 bg-white/94 p-7 shadow-[0_18px_50px_rgba(31,50,38,.07)] max-[600px]:rounded-[14px] max-[600px]:p-[22px]`.trim()}
    >
      {children}
    </section>
  );
}

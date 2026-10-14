import { useState } from 'react';
import type { FormEvent } from 'react';
import { isDemoMode } from '../demoMode';

interface UnlockPageProps {
  checking: boolean;
  error: string;
  onUnlock: (password: string) => Promise<'success' | 'unauthorized' | 'error'>;
}

export default function UnlockPage({ checking, error, onUnlock }: UnlockPageProps) {
  const [password, setPassword] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await onUnlock(password);
    if (result === 'unauthorized') setPassword('');
  }

  return (
    <main className="mx-auto w-[min(100%-2rem,480px)] pt-[14vh] pb-[72px] max-[600px]:pt-[22px]">
      <section className="mb-5 rounded-[18px] border border-[#304537]/[.12] bg-white/[.94] p-7 shadow-[0_18px_50px_rgba(31,50,38,.07)] max-[600px]:rounded-[14px] max-[600px]:p-[22px]">
        <h1 className="mb-4 text-[1.7rem] leading-tight font-bold sm:text-[2rem]">WDS Operations Portal</h1>
        {isDemoMode && (
          <p className="mb-5 text-sm leading-relaxed text-[#5c6961]">
            <strong>Local demo mode:</strong> enter any password to continue. It uses fictional data and does not call Google Sheets, Drive, or Telegram.
          </p>
        )}
        {checking ? (
          <p className="text-sm text-[#5c6961]">Checking your session…</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <label className="mb-[7px] block text-[.84rem] font-bold" htmlFor="portalPassword">Portal Password</label>
            <input
              className="w-full rounded-[9px] border border-[#ced8d1] bg-[#fbfcfa] px-[13px] py-[11px] text-[#17201b] outline-none transition focus:border-[#517d3d] focus:shadow-[0_0_0_3px_rgba(81,125,61,.13)]"
              autoFocus
              autoComplete="current-password"
              id="portalPassword"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
            <button className="mt-[22px] w-full rounded-[9px] bg-[#295b43] px-[18px] py-[13px] font-bold text-white transition hover:-translate-y-px hover:bg-[#183d2e] disabled:cursor-wait disabled:bg-[#94a49a]" type="submit">Unlock</button>
            <p aria-live="polite" className="mt-3 min-h-[1.2em] text-sm text-[#a43b32]">{error}</p>
          </form>
        )}
      </section>
    </main>
  );
}
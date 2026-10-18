import { useState } from 'react';
import type { FormEvent } from 'react';
import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import TextInput from '../components/TextInput';
import { isDemoMode } from '../demoMode';

interface UnlockPageProps {
  checking: boolean;
  error: string;
  onUnlock: (password: string) => Promise<'success' | 'unauthorized' | 'error'>;
}

export default function UnlockPage({ checking, error, onUnlock }: UnlockPageProps) {
  const [password, setPassword] = useState('');
  const [unlocking, setUnlocking] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (unlocking) return;

    setUnlocking(true);
    try {
      const result = await onUnlock(password);
      if (result === 'unauthorized') setPassword('');
    } finally {
      setUnlocking(false);
    }
  }

  return (
    <main className="mx-auto w-[min(100%-2rem,480px)] pt-[14vh] pb-[72px] max-[600px]:pt-[22px]">
      <Card className="mb-5">
        <h1 className="mb-4 text-[1.7rem] leading-tight font-bold sm:text-[2rem]">
          WDS Operations Portal
        </h1>
        {isDemoMode && (
          <p className="mb-5 text-sm leading-relaxed text-muted">
            <strong>Local demo mode:</strong> enter any password to continue. It uses fictional data
            and does not call Google Sheets, Drive, or Telegram.
          </p>
        )}
        {checking ? (
          <p className="text-sm text-muted">Checking your session…</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <label className="mb-[7px] block text-[.84rem] font-bold" htmlFor="portalPassword">
              Portal Password
            </label>
            <TextInput
              autoFocus
              autoComplete="current-password"
              id="portalPassword"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
            <PrimaryButton disabled={unlocking}>
              {unlocking ? 'Unlocking…' : 'Unlock'}
            </PrimaryButton>
            <p aria-live="polite" className="mt-3 min-h-[1.2em] text-sm text-error">
              {error}
            </p>
          </form>
        )}
      </Card>
    </main>
  );
}

import { useCallback, useRef, useState } from 'react';
import { createTask } from './api';
import { serverErrorField } from './validation';
import type { FieldErrors } from './validation';
import type { FormStatus, TaskInput } from './types';

export function useEventCreation(
  onCreated: () => Promise<boolean>,
  onUnauthorized: (message: string) => void,
) {
  const pending = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<FormStatus>(null);

  async function submit(input: TaskInput): Promise<FieldErrors | undefined> {
    if (pending.current) return;
    pending.current = true;
    setSubmitting(true);
    setStatus(null);
    try {
      let result: Awaited<ReturnType<typeof createTask>>;
      try {
        result = await createTask({
          ...input,
          taskName: input.taskName.trim(),
          formUrl: input.formUrl.trim(),
          eventLocation: input.eventLocation.trim(),
          eventOneLiner: input.eventOneLiner.trim(),
        });
      } catch {
        setStatus({
          kind: 'error',
          message: 'Could not reach the server. Check your connection and try again.',
        });
        return;
      }
      const { response, data } = result;
      const message =
        typeof data?.message === 'string' && data.message.trim() ? data.message : undefined;
      if (response.status === 401) {
        onUnauthorized(message ?? 'Session expired. Enter the portal password again.');
        return;
      }
      if (!response.ok || data?.status !== 'success') {
        const fallback = response.ok
          ? 'The server returned an unexpected response. Please try again.'
          : `The server could not create the event (HTTP ${response.status}). Please try again.`;
        setStatus({ kind: 'error', message: message ?? fallback });
        const field = response.status === 400 && message ? serverErrorField(message) : undefined;
        return field && message ? { [field]: message } : undefined;
      }
      setStatus({ kind: 'success', message: message ?? 'Event created.' });
      let refreshed = false;
      try {
        refreshed = await onCreated();
      } catch {
        // Handled below: creation already succeeded either way.
      }
      if (!refreshed) {
        // Don't invite a duplicate creation on retry.
        setStatus({
          kind: 'success',
          message: `${message ?? 'Event created.'} The list could not be refreshed. Reload this browser page to try loading it again.`,
        });
      }
    } finally {
      pending.current = false;
      setSubmitting(false);
    }
  }

  // Success belongs to the submission that produced it; errors stay with the retained draft.
  // Stable identity: TaskCreatePage runs it from an unmount-only effect.
  const clearSuccess = useCallback(
    () => setStatus((current) => (current?.kind === 'success' ? null : current)),
    [],
  );

  return { submit, submitting, status, clearSuccess };
}

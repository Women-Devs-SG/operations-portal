import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { createTask } from '../api';
import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import TextInput from '../components/TextInput';
import { isDemoMode } from '../demoMode';
import type { FormStatus, LoadTasksResult, TaskInput } from '../types';

interface TaskCreatePageProps {
  onEventCreated: () => Promise<LoadTasksResult>;
  onSessionExpired: () => void;
}

const emptyInput: TaskInput = {
  taskName: '',
  formUrl: '',
  eventDate: '',
  eventLocation: '',
  eventOneLiner: '',
};

export default function TaskCreatePage({ onEventCreated, onSessionExpired }: TaskCreatePageProps) {
  const navigate = useNavigate();
  const [input, setInput] = useState<TaskInput>(emptyInput);
  const [status, setStatus] = useState<FormStatus>(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (field: keyof TaskInput, value: string) =>
    setInput((current) => ({ ...current, [field]: value }));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus(null);
    try {
      const { response, data } = await createTask({
        ...input,
        taskName: input.taskName.trim(),
        formUrl: input.formUrl.trim(),
        eventLocation: input.eventLocation.trim(),
        eventOneLiner: input.eventOneLiner.trim(),
      });

      if (response.status === 401) {
        onSessionExpired();
        return;
      }

      if (response.ok && data?.status === 'success') {
        setStatus({ kind: 'success', message: `✅ ${data.message ?? 'Event created.'}` });
        setInput(emptyInput);
        const refreshResult = await onEventCreated();
        if (refreshResult.kind === 'unauthorized') onSessionExpired();
      } else {
        setStatus({
          kind: 'error',
          message: `❌ ${data?.message ?? 'Failed to execute automation.'}`,
        });
      }
    } catch {
      setStatus({ kind: 'error', message: '❌ Failed to connect to the server.' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto w-[min(100%-2rem,760px)] py-12 pb-[72px] max-[600px]:pt-[22px]">
      <Card>
        <div className="mb-6 flex items-center justify-between gap-4 max-[480px]:items-start">
          <div>
            <p className="mb-[3px] text-[.76rem] font-bold tracking-[.13em] text-accent uppercase">
              01
            </p>
            <h1 className="text-[1.35rem] font-bold">Create an event</h1>
          </div>
          <button
            className="mt-0 w-auto shrink-0 rounded-[9px] border border-field-border bg-white px-3 py-2 font-bold text-primary transition hover:bg-tint"
            onClick={() => navigate('/')}
            type="button"
          >
            Back to portal
          </button>
        </div>

        {isDemoMode && (
          <p className="mb-6 text-sm leading-relaxed text-muted">
            Demo mode is for local-only testing and does not call Google Sheets, Drive, or Telegram.
          </p>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-[17px] max-[600px]:grid-cols-1">
            <div>
              <label className="mb-[7px] block text-[.84rem] font-bold" htmlFor="taskName">
                Event Name <span className="text-required">*</span>
              </label>
              <TextInput
                id="taskName"
                maxLength={120}
                onChange={(event) => update('taskName', event.target.value)}
                placeholder="e.g. MedCamp 2026"
                required
                value={input.taskName}
              />
            </div>

            <div>
              <label className="mb-[7px] block text-[.84rem] font-bold" htmlFor="eventDate">
                Event Date
              </label>
              <TextInput
                id="eventDate"
                onChange={(event) => update('eventDate', event.target.value)}
                type="date"
                value={input.eventDate}
              />
            </div>

            <div>
              <label className="mb-[7px] block text-[.84rem] font-bold" htmlFor="eventLocation">
                Event Location
              </label>
              <TextInput
                id="eventLocation"
                maxLength={120}
                onChange={(event) => update('eventLocation', event.target.value)}
                placeholder="e.g. Singapore"
                value={input.eventLocation}
              />
            </div>

            <div className="col-span-full max-[600px]:col-auto">
              <label className="mb-[7px] block text-[.84rem] font-bold" htmlFor="eventOneLiner">
                One-line Event Description
              </label>
              <TextInput
                id="eventOneLiner"
                maxLength={280}
                onChange={(event) => update('eventOneLiner', event.target.value)}
                placeholder="e.g. A community-led volunteering meetup"
                value={input.eventOneLiner}
              />
            </div>

            <div className="col-span-full max-[600px]:col-auto">
              <label className="mb-[7px] block text-[.84rem] font-bold" htmlFor="formUrl">
                Google Form Link <small className="font-medium text-muted">Optional</small>
              </label>
              <TextInput
                id="formUrl"
                maxLength={500}
                onChange={(event) => update('formUrl', event.target.value)}
                placeholder="https://forms.google.com/…"
                type="url"
                value={input.formUrl}
              />
            </div>
          </div>

          <PrimaryButton disabled={submitting}>
            {submitting
              ? 'Preparing event workspace & Telegram alert…'
              : 'Create event & run automations →'}
          </PrimaryButton>
          <p
            aria-live="polite"
            className={`mt-3 min-h-[1.2em] text-sm ${status?.kind === 'error' ? 'text-error' : status?.kind === 'success' ? 'text-success' : ''}`}
          >
            {status?.message}
          </p>
        </form>
      </Card>
    </main>
  );
}

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { createTask } from '../api';
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

  const update = (field: keyof TaskInput, value: string) => setInput((current) => ({ ...current, [field]: value }));

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
        setStatus({ kind: 'error', message: `❌ ${data?.message ?? 'Failed to execute automation.'}` });
      }
    } catch {
      setStatus({ kind: 'error', message: '❌ Failed to connect to the server.' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto w-[min(100%-2rem,760px)] py-12 pb-[72px] max-[600px]:pt-[22px]">
      <section className="rounded-[18px] border border-[#304537]/[.12] bg-white/[.94] p-7 shadow-[0_18px_50px_rgba(31,50,38,.07)] max-[600px]:rounded-[14px] max-[600px]:p-[22px]">
        <div className="mb-6 flex items-center justify-between gap-4 max-[480px]:items-start">
          <div><p className="mb-[3px] text-[.76rem] font-bold tracking-[.13em] text-[#6c8f31] uppercase">01</p><h2 className="text-[1.35rem] font-bold">Create an event</h2></div>
          <button className="mt-0 w-auto shrink-0 rounded-[9px] border border-[#ced8d1] bg-white px-3 py-2 font-bold text-[#295b43] transition hover:bg-[#edf4e6]" onClick={() => navigate('/')} type="button">Back to portal</button>
        </div>

        {isDemoMode && <p className="mb-6 text-sm leading-relaxed text-[#5c6961]">Demo mode is for local-only testing and does not call Google Sheets, Drive, or Telegram.</p>}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-[17px] max-[600px]:grid-cols-1">
            <div>
              <label className="mb-[7px] block text-[.84rem] font-bold" htmlFor="taskName">Event Name <span className="text-[#b34a3e">*</span></label>
              <input
                className="w-full rounded-[9px] border border-[#ced8d1] bg-[#fbfcfa] px-[13px] py-[11px] text-[#17201b] outline-none transition focus:border-[#517d3d] focus:shadow-[0_0_0_3px_rgba(81,125,61,.13)]"
                id="taskName"
                maxLength={120}
                onChange={(event) => update('taskName', event.target.value)}
                placeholder="e.g. MedCamp 2026"
                required
                value={input.taskName}
              />
            </div>

            <div>
              <label className="mb-[7px] block text-[.84rem] font-bold" htmlFor="eventDate">Event Date</label>
              <input className="w-full rounded-[9px] border border-[#ced8d1] bg-[#fbfcfa] px-[13px] py-[11px] text-[#17201b] outline-none transition focus:border-[#517d3d] focus:shadow-[0_0_0_3px_rgba(81,125,61,.13)]" id="eventDate" onChange={(event) => update('eventDate', event.target.value)} type="date" value={input.eventDate} />
            </div>

            <div>
              <label className="mb-[7px] block text-[.84rem] font-bold" htmlFor="eventLocation">Event Location</label>
              <input
                className="w-full rounded-[9px] border border-[#ced8d1] bg-[#fbfcfa] px-[13px] py-[11px] text-[#17201b] outline-none transition focus:border-[#517d3d] focus:shadow-[0_0_0_3px_rgba(81,125,61,.13)]"
                id="eventLocation"
                maxLength={120}
                onChange={(event) => update('eventLocation', event.target.value)}
                placeholder="e.g. Singapore"
                value={input.eventLocation}
              />
            </div>

            <div className="col-span-full max-[600px]:col-auto">
              <label className="mb-[7px] block text-[.84rem] font-bold" htmlFor="eventOneLiner">One-line Event Description</label>
              <input
                className="w-full rounded-[9px] border border-[#ced8d1] bg-[#fbfcfa] px-[13px] py-[11px] text-[#17201b] outline-none transition focus:border-[#517d3d] focus:shadow-[0_0_0_3px_rgba(81,125,61,.13)]"
                id="eventOneLiner"
                maxLength={280}
                onChange={(event) => update('eventOneLiner', event.target.value)}
                placeholder="e.g. A community-led volunteering meetup"
                value={input.eventOneLiner}
              />
            </div>

            <div className="col-span-full max-[600px]:col-auto">
              <label className="mb-[7px] block text-[.84rem] font-bold" htmlFor="formUrl">Google Form Link <small className="font-medium text-[#809087]">Optional</small></label>
              <input
                className="w-full rounded-[9px] border border-[#ced8d1] bg-[#fbfcfa] px-[13px] py-[11px] text-[#17201b] outline-none transition focus:border-[#517d3d] focus:shadow-[0_0_0_3px_rgba(81,125,61,.13)]"
                id="formUrl"
                maxLength={500}
                onChange={(event) => update('formUrl', event.target.value)}
                placeholder="https://forms.google.com/…"
                type="url"
                value={input.formUrl}
              />
            </div>
          </div>

          <button className="mt-[22px] w-full rounded-[9px] bg-[#295b43] px-[18px] py-[13px] font-bold text-white transition hover:-translate-y-px hover:bg-[#183d2e] disabled:cursor-wait disabled:bg-[#94a49a]" disabled={submitting} type="submit">
            {submitting ? 'Preparing event workspace & Telegram alert…' : 'Create event & run automations →'}
          </button>
          <p aria-live="polite" className={`mt-3 min-h-[1.2em] text-sm ${status?.kind === 'error' ? 'text-[#a43b32]' : status?.kind === 'success' ? 'text-[#28723f]' : ''}`}>{status?.message}</p>
        </form>
      </section>
    </main>
  );
}

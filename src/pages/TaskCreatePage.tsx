import Card from '../components/Card';
import EventForm from '../components/EventForm';
import type { EventFormProps } from '../components/EventForm';

interface TaskCreatePageProps extends EventFormProps {
  demoMode: boolean;
  onBack: () => void;
}

export default function TaskCreatePage({ demoMode, onBack, ...formProps }: TaskCreatePageProps) {
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
            className="mt-0 w-auto shrink-0 rounded-[9px] border border-field-border bg-white px-3 py-2 font-bold text-primary transition hover:bg-tint disabled:opacity-70"
            disabled={formProps.submitting}
            onClick={onBack}
            type="button"
          >
            Back to portal
          </button>
        </div>

        {demoMode && (
          <p className="mb-6 text-sm leading-relaxed text-muted">
            Demo mode is available in local development and authorised Netlify Deploy Previews. It
            does not call Google Sheets, Drive, or Telegram.
          </p>
        )}

        <EventForm {...formProps} />
      </Card>
    </main>
  );
}

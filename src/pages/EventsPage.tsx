import { isDemoMode } from '../demoMode';
import TaskCard from '../components/TaskCard';
import type { Task } from '../types';

interface EventsPageProps {
  listMessage: string;
  onCreateEvent: () => void;
  tasks: Task[];
}

export default function EventsPage({ listMessage, onCreateEvent, tasks }: EventsPageProps) {
  return (
    <main className="mx-auto w-[min(100%-2rem,760px)] py-12 pb-[72px] max-[600px]:pt-[22px]">
      <section className="relative mb-5 overflow-hidden rounded-[18px] bg-[#183d2e] p-[38px] text-[#f7fbf5] max-[600px]:rounded-[14px] max-[600px]:p-[22px]">
        <span
          aria-hidden="true"
          className="absolute -top-[105px] -right-[105px] size-[340px] rounded-full border-[55px] border-[#d9ee76] opacity-90 max-[600px]:opacity-35"
        />
        <p className="relative z-10 mb-[10px] text-[.76rem] font-bold tracking-[.13em] text-[#d9ee76] uppercase">
          Women Devs SG · Operations
        </p>
        <h1 className="relative z-10 max-w-[560px] text-[1.7rem] leading-[1.1] font-bold sm:text-[2.65rem]">
          Turn an event idea into an organised project.
        </h1>
        <p className="relative z-10 mt-[14px] max-w-[520px] leading-relaxed text-[#c8d8cf]">
          Create an event once, then let the portal prepare its workspace and notify the team.
        </p>
      </section>

      <section className="mb-5 rounded-[18px] border border-[#304537]/[.12] bg-white/[.94] p-7 shadow-[0_18px_50px_rgba(31,50,38,.07)] max-[600px]:rounded-[14px] max-[600px]:p-[22px]">
        <div className="mb-6 flex items-center justify-between gap-4 max-[480px]:items-start">
          <div>
            <p className="mb-[3px] text-[.76rem] font-bold tracking-[.13em] text-[#6c8f31] uppercase">
              01
            </p>
            <h2 className="text-[1.35rem] font-bold">Event setup</h2>
          </div>
          <button
            className="mt-0 w-auto shrink-0 rounded-[9px] bg-[#295b43] px-4 py-3 font-bold text-white transition hover:bg-[#183d2e]"
            onClick={onCreateEvent}
            type="button"
          >
            Create an event
          </button>
        </div>
        {isDemoMode && (
          <p className="text-sm leading-relaxed text-[#5c6961]">
            Demo mode is available locally for testing without real integrations.
          </p>
        )}
      </section>

      <section className="mb-5 rounded-[18px] border border-[#304537]/[.12] bg-white/[.94] p-7 shadow-[0_18px_50px_rgba(31,50,38,.07)] max-[600px]:rounded-[14px] max-[600px]:p-[22px]">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="mb-[3px] text-[.76rem] font-bold tracking-[.13em] text-[#6c8f31] uppercase">
              02
            </p>
            <h2 className="text-[1.35rem] font-bold">Events</h2>
          </div>
          <span className="rounded-full bg-[#edf4e6] px-[10px] py-1.5 text-xs font-bold text-[#4d682d]">
            {tasks.length} total
          </span>
        </div>
        {listMessage && (
          <p className="rounded-xl border border-dashed border-[#c8d4cc] p-7 text-center text-[#718078]">
            {listMessage}
          </p>
        )}
        <div className="grid gap-3">
          {tasks.map((task) => (
            <TaskCard key={task.taskId || `${task.taskName}-${task.createdAt}`} task={task} />
          ))}
        </div>
      </section>
    </main>
  );
}

import type { Task } from '../types';

export default function TaskCard({ task }: { task: Task }) {
  const driveUrl = /^https:\/\//i.test(task.driveUrl) ? task.driveUrl : null;

  return (
    <article className="rounded-xl border border-card-border bg-surface p-[18px]">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full bg-pill-bg px-[9px] py-1 text-[.7rem] font-extrabold tracking-[.06em] text-pill-text uppercase">
          {task.status || 'Pending'}
        </span>
        <span className="text-[.72rem] text-muted">{task.taskId}</span>
      </div>
      <h3 className="my-3 text-[1.08rem] font-bold">{task.taskName}</h3>
      <div className="grid grid-cols-2 gap-x-5 gap-y-2 max-[600px]:grid-cols-1">
        {task.eventDate && (
          <p className="m-0 text-[.84rem] text-muted">
            <strong className="mb-0.5 block text-[.7rem] text-label uppercase">Date</strong>
            {task.eventDate}
          </p>
        )}
        {task.eventLocation && (
          <p className="m-0 text-[.84rem] text-muted">
            <strong className="mb-0.5 block text-[.7rem] text-label uppercase">Location</strong>
            {task.eventLocation}
          </p>
        )}
        {task.eventOneLiner && (
          <p className="col-span-full m-0 text-[.84rem] text-muted max-[600px]:col-auto">
            <strong className="mb-0.5 block text-[.7rem] text-label uppercase">About</strong>
            {task.eventOneLiner}
          </p>
        )}
      </div>
      {driveUrl && (
        <a
          className="mt-[14px] inline-block text-[.83rem] font-bold text-link no-underline hover:underline"
          href={driveUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          Open Drive Folder ↗
        </a>
      )}
    </article>
  );
}

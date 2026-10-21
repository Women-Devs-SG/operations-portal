export default function ErrorBanner({ message }: { message?: string }) {
  return (
    <div aria-atomic="true" role="alert">
      {message && (
        <p className="mb-5 rounded-[9px] border border-error bg-error-bg p-3 text-sm text-error">
          <strong>Last submission failed.</strong> {message} Review your entries, then retry event
          creation.
        </p>
      )}
    </div>
  );
}

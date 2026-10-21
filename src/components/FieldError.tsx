export default function FieldError({ id, message }: { id: string; message?: string }) {
  return (
    <p aria-live="polite" aria-atomic="true" className="mt-1 text-sm text-error" id={id}>
      {message}
    </p>
  );
}

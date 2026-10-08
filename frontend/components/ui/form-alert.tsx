type FormAlertProps = {
  title: string;
  children?: React.ReactNode;
};

export function FormAlert({ title, children }: FormAlertProps) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-1 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm animate-fade-in"
    >
      <div className="flex items-start gap-2">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className="mt-0.5 h-4.5 w-4.5 shrink-0 text-red-500"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
          />
        </svg>
        <p className="font-medium text-red-700">{title}</p>
      </div>
      {children && <p className="pl-6 text-red-600/90">{children}</p>}
    </div>
  );
}
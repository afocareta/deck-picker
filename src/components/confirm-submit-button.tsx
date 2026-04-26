"use client";

type ConfirmSubmitButtonProps = {
  message: string;
  children: React.ReactNode;
  className: string;
  "aria-label"?: string;
  form?: string;
};

export function ConfirmSubmitButton({
  message,
  children,
  className,
  "aria-label": ariaLabel,
  form,
}: ConfirmSubmitButtonProps) {
  return (
    <button
      form={form}
      type="submit"
      aria-label={ariaLabel}
      onClick={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
      className={className}
    >
      {children}
    </button>
  );
}

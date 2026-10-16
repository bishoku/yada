import { cloneElement, forwardRef, useId, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, type ReactElement, type ReactNode, type AriaAttributes } from 'react';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className = '', ...props }, ref) {
  return <input ref={ref} className={`yada-input ${className}`} {...props} />;
});
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className = '', ...props }, ref) {
  return <textarea ref={ref} className={`yada-input yada-textarea ${className}`} {...props} />;
});
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className = '', ...props }, ref) {
  return <select ref={ref} className={`yada-input yada-select ${className}`} {...props} />;
});

type FieldControl = AriaAttributes & { id?: string; required?: boolean };
export function Field({ label, hint, error, children, className = '' }: {
  label: ReactNode; hint?: ReactNode; error?: ReactNode; children: ReactElement<FieldControl>; className?: string;
}) {
  const generated = useId();
  const id = children.props.id ?? generated;
  const description = [children.props['aria-describedby'], hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined;
  return <div className={`yada-field ${className}`}>
    <label className="yada-field-label" htmlFor={id}>{label}{children.props.required && <span aria-hidden="true"> *</span>}</label>
    {cloneElement(children, { id, 'aria-describedby': description, 'aria-invalid': error ? true : children.props['aria-invalid'] })}
    {hint && <p id={`${id}-hint`} className="yada-field-hint">{hint}</p>}
    {error && <p id={`${id}-error`} className="yada-field-error" role="alert">{error}</p>}
  </div>;
}

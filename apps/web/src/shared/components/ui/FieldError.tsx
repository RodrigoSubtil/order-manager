import { FormMessage } from './FormMessage';

type FieldErrorProps = {
  id: string;
  message?: string;
};

export function FieldError({ id, message }: FieldErrorProps) {
  if (!message) return null;
  return (
    <FormMessage id={id} role="alert" tone="error">
      {message}
    </FormMessage>
  );
}

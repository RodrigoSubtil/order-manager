import { Dialog, SuccessMessage } from '../../../shared/components/ui';

type OrderSuccessDialogProps = {
  description: string;
  message: string;
  onClose: () => void;
};

export function OrderSuccessDialog({ description, message, onClose }: OrderSuccessDialogProps) {
  return (
    <Dialog titleId="order-success-title" onClose={onClose}>
      <SuccessMessage
        actionLabel="Voltar para as encomendas"
        description={description}
        onAction={onClose}
        title={message}
        titleId="order-success-title"
      />
    </Dialog>
  );
}

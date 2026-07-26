import { Dialog, SuccessMessage } from '../../../shared/components/ui';

type OrderSuccessDialogProps = {
  message: string;
  onClose: () => void;
};

export function OrderSuccessDialog({ message, onClose }: OrderSuccessDialogProps) {
  return (
    <Dialog titleId="order-success-title" onClose={onClose}>
      <SuccessMessage
        actionLabel="Voltar para as encomendas"
        onAction={onClose}
        title={message}
        titleId="order-success-title"
      />
    </Dialog>
  );
}

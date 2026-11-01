import { Dialog, SuccessMessage } from '../../../shared/components/ui';

type OrderSuccessDialogProps = { onClose: () => void } & (
  { message: string; customerName?: never } | { customerName: string; message?: never }
);

export function OrderSuccessDialog({ message, customerName, onClose }: OrderSuccessDialogProps) {
  return (
    <Dialog titleId="order-success-title" onClose={onClose}>
      <SuccessMessage
        actionLabel="Voltar para as encomendas"
        onAction={onClose}
        title={customerName === undefined ? message : 'Encomenda de'}
        subject={customerName}
        detail={customerName === undefined ? undefined : 'apagada com sucesso.'}
        titleId="order-success-title"
      />
    </Dialog>
  );
}

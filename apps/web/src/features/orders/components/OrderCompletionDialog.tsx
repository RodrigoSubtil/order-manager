import { Dialog, SuccessMessage } from '../../../shared/components/ui';

type OrderCompletionDialogProps = {
  message: string;
  onClose: () => void;
};

export function OrderCompletionDialog({ message, onClose }: OrderCompletionDialogProps) {
  return (
    <Dialog titleId="completion-title" onClose={onClose}>
      <SuccessMessage
        actionLabel="Voltar para as encomendas"
        description="A encomenda foi concluída corretamente e retirada da lista de pedidos ativos."
        onAction={onClose}
        title={message}
        titleId="completion-title"
      />
    </Dialog>
  );
}

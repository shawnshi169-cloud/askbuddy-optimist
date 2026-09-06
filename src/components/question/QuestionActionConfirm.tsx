import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

export const QuestionActionConfirm = ({
  open,
  onOpenChange,
  title,
  description,
  pending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  pending: boolean;
  onConfirm: () => void;
}) => (
  <AlertDialog
    open={open}
    onOpenChange={(next) => {
      if (!pending) onOpenChange(next);
    }}
  >
    <AlertDialogContent className="w-[calc(100%-32px)] max-w-sm rounded-2xl">
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={pending} className="min-h-11">
          取消
        </AlertDialogCancel>
        <Button
          type="button"
          variant="action"
          disabled={pending}
          onClick={onConfirm}
          className="min-h-11"
        >
          {pending ? '处理中…' : '确认'}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

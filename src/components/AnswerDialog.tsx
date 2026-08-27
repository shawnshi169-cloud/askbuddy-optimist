
import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export interface AnswerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: { message: string }) => void;
}

export const AnswerDialog: React.FC<AnswerDialogProps> = ({
  open,
  onOpenChange,
  onSubmit
}) => {
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) setMessage("");
  }, [open]);

  const handleSubmit = () => {
    const content = message.trim();
    if (!content) return;
    onSubmit({ message: content });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[420px] animate-fade-in space-y-6">
        <DialogHeader>
          <DialogTitle className="text-left text-base font-bold">我来回答</DialogTitle>
          <DialogDescription className="text-gray-500 text-xs text-left">
            请填写与问题直接相关的回答内容。
          </DialogDescription>
        </DialogHeader>
        <div>
          <div className="text-xs text-gray-600 mb-1">回答内容</div>
          <Textarea
            placeholder="输入你的回答"
            value={message}
            onChange={e => setMessage(e.target.value)}
            className="resize-none"
            rows={3}
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" type="button">取消</Button>
          </DialogClose>
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={!message.trim()}
            onClick={handleSubmit}
          >
            提交
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AnswerDialog;

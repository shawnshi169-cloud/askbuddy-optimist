
import React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Award, Copy, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { copyTextToClipboard } from "@/utils/clipboard";

interface Option {
  id: string;
  name: string;
  icon: React.ReactNode;
}
interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: Option[];
  onShare: (optionId: string) => void | Promise<void>;
}

const ShareDialog: React.FC<ShareDialogProps> = ({
  open, onOpenChange, options, onShare
}) => {
  const { toast } = useToast();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>邀请好友回答问题</DialogTitle>
          <DialogDescription>
            分享问题给更多人，帮助提问者获得更好的回答
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-2">
          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
            <div className="flex items-center text-amber-600 text-sm mb-2">
              <Award size={16} className="mr-2 text-amber-500" />
              <span className="font-medium">积分奖励</span>
            </div>
            <p className="text-sm text-gray-700">
              成功邀请好友回答问题，您将获得 <span className="text-amber-500 font-semibold">5积分</span> 奖励
            </p>
          </div>
          <div>
            <p className="text-sm font-medium mb-3 text-gray-700">分享至</p>
            <div className="grid grid-cols-4 gap-3">
              {options.map(option => (
                <div
                  key={option.id}
                  className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => {
                    void onShare(option.id);
                  }}
                  aria-label={`通过${option.name}邀请`}
                  tabIndex={0}
                >
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-1">
                    {option.icon}
                  </div>
                  <span className="text-xs text-gray-600">{option.name}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
            <div className="flex justify-between items-center">
              <div className="text-xs text-gray-500 line-clamp-1 flex-1 mr-2">
                {window.location.href}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8"
                aria-label="复制链接"
                onClick={async () => {
                  try {
                    await copyTextToClipboard(window.location.href);
                    toast({ title: "链接已复制到剪贴板" });
                  } catch (copyError) {
                    toast({
                      title: '复制失败',
                      description: copyError instanceof Error ? copyError.message : '无法复制链接',
                      variant: 'destructive',
                    });
                  }
                }}
              >
                <Copy size={14} className="mr-1" />
                复制链接
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">关闭</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShareDialog;

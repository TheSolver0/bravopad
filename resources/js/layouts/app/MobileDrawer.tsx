import { Sheet, SheetContent } from '@/components/ui/sheet';
import Sidebar from './Sidebar';

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  onCreateBravo: () => void;
}

export default function MobileDrawer({ open, onClose, onCreateBravo }: MobileDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="left" className="p-0 w-[280px] border-r border-border bg-background">
        <Sidebar
          collapsed={false}
          onClose={onClose}
          onCreateBravo={() => { onClose(); onCreateBravo(); }}
        />
      </SheetContent>
    </Sheet>
  );
}

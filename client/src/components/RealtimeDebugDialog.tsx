"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import RealtimePanel from "./RealtimePanel";

interface CanvasUpdate {
  type: string;
  description: string;
  elementCount: number;
  timestamp: string;
}

interface RealtimeDebugDialogProps {
  isOpen: boolean;
  onClose: () => void;
  canvasUpdates?: CanvasUpdate[];
}

/**
 * Debug dialog that shows the realtime session status.
 * This is a read-only view - it doesn't control the session.
 * The session is controlled by SessionController in the main page.
 */
export default function RealtimeDebugDialog({
  isOpen,
  onClose,
  canvasUpdates = [],
}: RealtimeDebugDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="text-xl font-bold text-gray-800">
            🐛 Debug Console (Read-Only)
          </DialogTitle>
        </DialogHeader>
        <div className="h-[80vh] overflow-hidden">
          <RealtimePanel canvasUpdates={canvasUpdates} />
        </div>
      </DialogContent>
    </Dialog>
  );
}


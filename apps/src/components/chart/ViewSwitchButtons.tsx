// components/chart/ViewSwitchButtons.tsx
import { LayoutGrid, Square } from 'lucide-react';

const borderColor = 'rgba(132,130,130,0.37)';

export function SwitchToMultiButton({ onClick }: { onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="px-3 py-1 rounded-[10px] w-40 cursor-pointer border transition-all flex items-center justify-center hover:bg-gray-50"
      style={{ borderColor }}
    >
      <LayoutGrid className="h-4 w-4 opacity-70 mr-2" />
      <span className="truncate">Multi view</span>
    </div>
  );
}

export function SwitchToSingleButton({ onClick }: { onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="px-3 py-1 rounded-[10px] w-40 cursor-pointer border transition-all flex items-center justify-center hover:bg-gray-50"
      style={{ borderColor }}
    >
      <Square className="h-4 w-4 opacity-70 mr-2" />
      <span className="truncate">Single view</span>
    </div>
  );
}

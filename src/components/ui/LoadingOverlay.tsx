interface LoadingOverlayProps {
  isLoading: boolean;
  text?: string;
}

export function LoadingOverlay({ isLoading, text = 'Loading...' }: LoadingOverlayProps) {
  if (!isLoading) return null;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-auto bg-white/60 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className="w-8 h-8 border-2 border-gray-200 rounded-full" />
          <div className="absolute top-0 left-0 w-8 h-8 border-2 border-indigo-500 rounded-full border-t-transparent animate-spin" />
        </div>
        <span className="text-sm text-gray-500 font-medium">{text}</span>
      </div>
    </div>
  );
}

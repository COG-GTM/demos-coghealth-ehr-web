interface LoadingOverlayProps {
  isLoading: boolean;
  text?: string;
}

export function LoadingOverlay({ isLoading, text = 'Loading...' }: LoadingOverlayProps) {
  if (!isLoading) return null;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-auto bg-white/60 backdrop-blur-sm">
      <div className="flex flex-col items-center bg-white rounded-2xl border border-gray-200 px-8 py-6 shadow-lg">
        <div className="mb-3">
          <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-20" cx="12" cy="12" r="10" stroke="#6366f1" strokeWidth="3" />
            <path className="opacity-80" d="M12 2a10 10 0 0 1 10 10" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
        <span className="text-[14px] text-gray-600 font-medium">{text}</span>
      </div>
    </div>
  );
}

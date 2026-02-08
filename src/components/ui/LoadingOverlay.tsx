interface LoadingOverlayProps {
  isLoading: boolean;
  text?: string;
}

export function LoadingOverlay({ isLoading, text = 'Loading...' }: LoadingOverlayProps) {
  if (!isLoading) return null;

  return (
    <div 
      className="absolute inset-0 z-40 flex items-center justify-center pointer-events-auto backdrop-blur-sm"
      style={{ backgroundColor: 'rgba(255, 255, 255, 0.8)' }}
    >
      <div className="flex flex-col items-center bg-white border border-gray-200 rounded-xl px-8 py-6 shadow-lg">
        <div className="relative">
          <div className="w-10 h-10 border-4 border-gray-200 rounded-full"></div>
          <div 
            className="absolute top-0 left-0 w-10 h-10 border-4 border-primary-500 rounded-full border-t-transparent animate-spin"
          ></div>
        </div>
        <span className="mt-4 text-sm font-medium text-gray-600">{text}</span>
      </div>
    </div>
  );
}

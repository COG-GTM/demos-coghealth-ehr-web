interface LoadingOverlayProps {
  isLoading: boolean;
  text?: string;
}

export function LoadingOverlay({ isLoading, text = 'Loading...' }: LoadingOverlayProps) {
  if (!isLoading) return null;

  return (
    <div 
      className="absolute inset-0 z-40 flex items-center justify-center pointer-events-auto"
      style={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(4px)' }}
    >
      <div className="flex flex-col items-center bg-white rounded-2xl px-8 py-6 shadow-lg" style={{ boxShadow: '0 8px 28px rgba(0,0,0,0.12)' }}>
        <style>
          {`
            @keyframes airbnb-spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            @keyframes airbnb-pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.4; }
            }
          `}
        </style>
        <div className="relative w-10 h-10 mb-3">
          <div 
            className="absolute inset-0 rounded-full border-2 border-[#ebebeb]"
          />
          <div 
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#FF385C]"
            style={{ animation: 'airbnb-spin 0.8s linear infinite' }}
          />
        </div>
        <span 
          className="text-sm font-medium text-[#222222]" 
          style={{ animation: 'airbnb-pulse 1.5s ease-in-out infinite' }}
        >
          {text}
        </span>
      </div>
    </div>
  );
}

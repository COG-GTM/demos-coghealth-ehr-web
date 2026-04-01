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
      <div className="flex flex-col items-center bg-white rounded-2xl px-8 py-6 shadow-lg" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <div className="flex space-x-1.5 mb-3">
          <style>
            {`
              @keyframes pulse-dot-1 {
                0%, 100% { opacity: 0.3; transform: scale(0.8); }
                50% { opacity: 1; transform: scale(1); }
              }
            `}
          </style>
          <span 
            className="w-2.5 h-2.5 rounded-full bg-[#FF385C]" 
            style={{ animation: 'pulse-dot-1 1.2s ease-in-out infinite' }}
          />
          <span 
            className="w-2.5 h-2.5 rounded-full bg-[#FF385C]" 
            style={{ animation: 'pulse-dot-1 1.2s ease-in-out 0.2s infinite' }}
          />
          <span 
            className="w-2.5 h-2.5 rounded-full bg-[#FF385C]" 
            style={{ animation: 'pulse-dot-1 1.2s ease-in-out 0.4s infinite' }}
          />
        </div>
        <span className="text-sm text-[#717171] font-medium">{text}</span>
      </div>
    </div>
  );
}

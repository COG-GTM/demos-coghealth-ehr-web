interface LoadingOverlayProps {
  isLoading: boolean;
  text?: string;
}

export function LoadingOverlay({ isLoading, text = 'Loading...' }: LoadingOverlayProps) {
  if (!isLoading) return null;

  return (
    <div 
      className="absolute inset-0 z-40 flex items-center justify-center pointer-events-auto"
      style={{ backgroundColor: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(4px)' }}
    >
      <div className="flex flex-col items-center bg-white rounded-2xl px-8 py-6" style={{ boxShadow: '0 8px 28px rgba(0,0,0,0.12)' }}>
        <div className="relative w-10 h-10 mb-3">
          <style>
            {`
              @keyframes airbnb-spin {
                to { transform: rotate(360deg); }
              }
            `}
          </style>
          <div 
            className="absolute inset-0 rounded-full"
            style={{ borderWidth: '3px', borderStyle: 'solid', borderColor: '#EBEBEB' }}
          />
          <div 
            className="absolute inset-0 rounded-full"
            style={{ 
              borderWidth: '3px', 
              borderStyle: 'solid',
              borderColor: 'transparent',
              borderTopColor: '#FF385C',
              animation: 'airbnb-spin 0.8s linear infinite' 
            }}
          />
        </div>
        <span className="text-sm text-[#484848] font-medium" style={{ fontFamily: "'Nunito', system-ui, -apple-system, sans-serif" }}>{text}</span>
      </div>
    </div>
  );
}

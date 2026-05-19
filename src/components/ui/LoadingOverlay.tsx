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
      <div className="flex flex-col items-center bg-white rounded-2xl px-8 py-6 shadow-lg border border-[#ebebeb]">
        <div className="relative w-10 h-10 mb-3">
          <div 
            className="absolute inset-0 rounded-full border-3"
            style={{ borderColor: '#ebebeb' }}
          />
          <div 
            className="absolute inset-0 rounded-full border-3"
            style={{ 
              borderColor: 'transparent', 
              borderTopColor: '#ff385c',
              animation: 'spin 0.8s linear infinite'
            }}
          />
          <style>
            {`@keyframes spin { to { transform: rotate(360deg); } }`}
          </style>
        </div>
        <span className="text-sm font-semibold text-[#484848]">{text}</span>
      </div>
    </div>
  );
}

interface LoadingOverlayProps {
  isLoading: boolean;
  text?: string;
}

export function LoadingOverlay({ isLoading, text = 'Loading...' }: LoadingOverlayProps) {
  if (!isLoading) return null;

  return (
    <div 
      className="absolute inset-0 z-40 flex items-center justify-center pointer-events-auto"
      style={{ backgroundColor: 'rgba(128, 128, 128, 0.5)' }}
    >
      <div className="flex flex-col items-center bg-[var(--ehr-statusbar-bg)] border-2 border-gray-400 px-6 py-4 shadow-md" style={{ boxShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
        <svg
          width="32"
          height="32"
          viewBox="0 0 32 32"
          className="mb-2"
          style={{ animation: 'hourglass-flip 1.5s ease-in-out infinite' }}
        >
          <style>
            {`
              @keyframes hourglass-flip {
                0% { transform: rotate(0deg); }
                45% { transform: rotate(0deg); }
                50% { transform: rotate(180deg); }
                95% { transform: rotate(180deg); }
                100% { transform: rotate(360deg); }
              }
              @keyframes sand-fall {
                0% { transform: translateY(0); }
                100% { transform: translateY(8px); }
              }
            `}
          </style>
          {/* Hourglass frame */}
          <path
            d="M6 2 L26 2 L26 4 L24 4 L24 6 C24 10 20 14 16 16 C20 18 24 22 24 26 L24 28 L26 28 L26 30 L6 30 L6 28 L8 28 L8 26 C8 22 12 18 16 16 C12 14 8 10 8 6 L8 4 L6 4 Z"
            fill="#c0a030"
            stroke="#806020"
            strokeWidth="1"
          />
          {/* Glass outline */}
          <path
            d="M10 5 L22 5 L22 7 C22 10 19 13 16 15 C13 13 10 10 10 7 Z"
            fill="#e8e8d8"
            stroke="#a0a090"
            strokeWidth="0.5"
          />
          <path
            d="M10 27 L22 27 L22 25 C22 22 19 19 16 17 C13 19 10 22 10 25 Z"
            fill="#e8e8d8"
            stroke="#a0a090"
            strokeWidth="0.5"
          />
          {/* Sand top */}
          <path
            d="M11 6 L21 6 L21 7 C21 9 18 12 16 13 C14 12 11 9 11 7 Z"
            fill="#d4a020"
          />
          {/* Sand bottom */}
          <path
            d="M14 24 L18 24 L18 25 C18 26 17 26 16 26 C15 26 14 26 14 25 Z"
            fill="#d4a020"
          />
          {/* Falling sand stream */}
          <rect x="15" y="15" width="2" height="6" fill="#d4a020" opacity="0.8">
            <animate
              attributeName="height"
              values="6;2;6"
              dur="1.5s"
              repeatCount="indefinite"
            />
          </rect>
        </svg>
        <span className="text-[11px] text-gray-700" style={{ fontFamily: 'Tahoma, sans-serif' }}>{text}</span>
      </div>
    </div>
  );
}

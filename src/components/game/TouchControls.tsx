import React, { useRef, useEffect } from "react";

interface TouchControlsProps {
  onLeft: () => void;
  onRight: () => void;
}

const containerStyle: React.CSSProperties = {
  position: "fixed",
  bottom: 30,
  left: 0,
  right: 0,
  display: "none",
  justifyContent: "space-between",
  padding: "0 30px",
  zIndex: 30,
  pointerEvents: "none",
};

const buttonStyle: React.CSSProperties = {
  width: 72,
  height: 72,
  borderRadius: "50%",
  background: "rgba(249, 115, 22, 0.2)",
  border: "2px solid rgba(249, 115, 22, 0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  pointerEvents: "auto",
  cursor: "pointer",
  WebkitTapHighlightColor: "transparent",
  touchAction: "manipulation",
};

const arrowLeftSvg = (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const arrowRightSvg = (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 6 15 12 9 18" />
  </svg>
);

export function TouchControls({ onLeft, onRight }: TouchControlsProps) {
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const leftEl = leftRef.current;
    const rightEl = rightRef.current;
    if (!leftEl || !rightEl) return;

    const handleLeft = (e: TouchEvent) => {
      e.preventDefault();
      onLeft();
    };
    const handleRight = (e: TouchEvent) => {
      e.preventDefault();
      onRight();
    };

    leftEl.addEventListener("touchstart", handleLeft, { passive: false });
    rightEl.addEventListener("touchstart", handleRight, { passive: false });

    return () => {
      leftEl.removeEventListener("touchstart", handleLeft);
      rightEl.removeEventListener("touchstart", handleRight);
    };
  }, [onLeft, onRight]);

  return (
    <>
      {/* Inline style tag for the media query - show only on mobile */}
      <style>{`
        .touch-controls-container {
          display: none !important;
        }
        @media (max-width: 600px) {
          .touch-controls-container {
            display: flex !important;
          }
        }
      `}</style>
      <div className="touch-controls-container" style={containerStyle}>
        <div ref={leftRef} style={buttonStyle}>
          {arrowLeftSvg}
        </div>
        <div ref={rightRef} style={buttonStyle}>
          {arrowRightSvg}
        </div>
      </div>
    </>
  );
}

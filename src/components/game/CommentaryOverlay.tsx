import React, { useEffect, useState } from "react";

interface CommentaryOverlayProps {
  text: string | null;
}

const containerStyle: React.CSSProperties = {
  position: "fixed",
  bottom: 40,
  left: "50%",
  transform: "translateX(-50%)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 6,
  zIndex: 25,
  pointerEvents: "none",
  transition: "opacity 0.4s ease",
};

const badgeStyle: React.CSSProperties = {
  fontFamily: "'Orbitron', monospace",
  fontSize: 8,
  textTransform: "uppercase",
  letterSpacing: 3,
  color: "#f97316",
  opacity: 0.7,
};

const textStyle: React.CSSProperties = {
  fontFamily: "'Inter', system-ui, sans-serif",
  fontSize: 16,
  color: "#fff",
  textAlign: "center",
  maxWidth: 500,
  padding: "12px 24px",
  background: "rgba(0, 0, 0, 0.6)",
  backdropFilter: "blur(12px)",
  borderRadius: 10,
  border: "1px solid rgba(249, 115, 22, 0.2)",
  lineHeight: 1.5,
};

export function CommentaryOverlay({ text }: CommentaryOverlayProps) {
  const [visible, setVisible] = useState(false);
  const [displayText, setDisplayText] = useState<string | null>(null);

  useEffect(() => {
    if (text) {
      setDisplayText(text);
      setVisible(true);

      const timer = setTimeout(() => {
        setVisible(false);
      }, 4000);

      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [text]);

  if (!displayText) return null;

  return (
    <div style={{ ...containerStyle, opacity: visible ? 1 : 0 }}>
      <div style={badgeStyle}>AI Commentator &mdash; Workers AI</div>
      <div style={textStyle}>{displayText}</div>
    </div>
  );
}

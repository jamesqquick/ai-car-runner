import React, { useState } from "react";
import { login } from "../lib/api";

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  background: "radial-gradient(ellipse at center, #1a1020 0%, #050510 70%)",
  zIndex: 100,
};

const titleStyle: React.CSSProperties = {
  fontFamily: "'Orbitron', monospace",
  fontSize: 64,
  fontWeight: 900,
  color: "#f97316",
  letterSpacing: 8,
  textTransform: "uppercase",
  marginBottom: 8,
  textShadow: "0 0 40px rgba(249, 115, 22, 0.4)",
};

const subtitleStyle: React.CSSProperties = {
  fontFamily: "'Inter', system-ui, sans-serif",
  fontSize: 12,
  color: "#555",
  letterSpacing: 2,
  marginBottom: 48,
};

const formStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 16,
};

const inputStyle: React.CSSProperties = {
  fontFamily: "'Inter', system-ui, sans-serif",
  fontSize: 16,
  padding: "14px 20px",
  width: 320,
  background: "rgba(255, 255, 255, 0.05)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: 6,
  color: "#fff",
  outline: "none",
  transition: "border-color 0.2s",
};

const buttonStyle: React.CSSProperties = {
  fontFamily: "'Orbitron', monospace",
  fontSize: 18,
  fontWeight: 700,
  padding: "16px 0",
  width: 320,
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  letterSpacing: 3,
  textTransform: "uppercase",
  background: "#f97316",
  color: "#000",
  transition: "all 0.2s",
  marginTop: 8,
};

const buttonDisabledStyle: React.CSSProperties = {
  ...buttonStyle,
  opacity: 0.6,
  cursor: "not-allowed",
};

const errorStyle: React.CSSProperties = {
  color: "#ef4444",
  fontSize: 13,
  marginTop: 4,
  minHeight: 18,
};

interface LoginScreenProps {
  /** Where to redirect after login. Defaults to "/" */
  redirectTo?: string;
}

export function LoginScreen({ redirectTo = "/" }: LoginScreenProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName || !trimmedEmail) return;

    setLoading(true);
    setError("");

    try {
      const user = await login(trimmedName, trimmedEmail);
      localStorage.setItem("car_runner_user", JSON.stringify(user));
      window.location.href = redirectTo;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection error");
      setLoading(false);
    }
  };

  return (
    <div style={overlayStyle}>
      <h1 style={titleStyle}>Car Runner</h1>
      <p style={subtitleStyle}>Powered by Cloudflare</p>
      <form style={formStyle} onSubmit={handleSubmit}>
        <input
          style={inputStyle}
          type="text"
          placeholder="Your Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
        />
        <input
          style={inputStyle}
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <button
          type="submit"
          style={loading ? buttonDisabledStyle : buttonStyle}
          disabled={loading}
        >
          {loading ? "Loading..." : "Continue"}
        </button>
        <div style={errorStyle}>{error}</div>
      </form>
    </div>
  );
}

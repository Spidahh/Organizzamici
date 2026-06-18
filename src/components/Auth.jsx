import React, { useState } from "react";
import { supabase } from "../supabaseClient";

export default function Auth({ onAuthSuccess, redirectPath }) {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      if (isSignUp) {
        if (!displayName.trim()) {
          setErrorMsg("Il nome visualizzato è obbligatorio!");
          setLoading(false);
          return;
        }
        
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName.trim()
            }
          }
        });

        if (error) {
          setErrorMsg(error.message);
        } else {
          // Se siamo in modalità mock, la registrazione accede automaticamente
          if (supabase.isMock) {
            setSuccessMsg("Registrazione completata! Accesso in corso...");
            setTimeout(async () => {
              try {
                await supabase.auth.signInWithPassword({ email, password });
                if (onAuthSuccess) onAuthSuccess();
              } catch (err) {
                console.error(err);
              }
            }, 1000);
          } else {
            setSuccessMsg("Registrazione completata! Se richiesto, controlla la tua email per confermare l'account.");
            // Effettua subito l'accesso
            const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
            if (!signInErr) {
              if (onAuthSuccess) onAuthSuccess();
            } else {
              setIsSignUp(false); // Rimanda al login
            }
          }
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          setErrorMsg(error.message);
        } else {
          setSuccessMsg("Accesso riuscito! Reindirizzamento...");
          if (onAuthSuccess) onAuthSuccess();
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Errore imprevisto durante l'autenticazione: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ maxWidth: "420px", margin: "40px auto", textAlign: "left", padding: "30px 40px" }}>
      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        <span style={{ fontSize: "36px" }}>👥</span>
        <h2 style={{ fontSize: "24px", fontWeight: "800", color: "var(--text-primary)", marginTop: "12px", marginBottom: "4px" }}>
          {isSignUp ? "Crea Account" : "Bentornato"}
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "13px", margin: 0 }}>
          {isSignUp ? "Registrati gratis per pianificare e votare eventi" : "Accedi con il tuo account"}
        </p>
      </div>

      {errorMsg && (
        <div style={{ padding: "10px 14px", background: "var(--color-veto-bg)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "var(--radius-sm)", fontSize: "13px", color: "var(--color-veto)", marginBottom: "16px" }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {successMsg && (
        <div style={{ padding: "10px 14px", background: "var(--color-available-bg)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "var(--radius-sm)", fontSize: "13px", color: "var(--color-available)", marginBottom: "16px" }}>
          ✅ {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {isSignUp && (
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: "10px" }}>Il tuo Nome / Soprannome</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Es. Marco, Chiara..."
              required
              style={{ padding: "10px 12px", fontSize: "13px" }}
            />
          </div>
        )}

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: "10px" }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nome@esempio.com"
            required
            style={{ padding: "10px 12px", fontSize: "13px" }}
          />
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: "10px" }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimo 6 caratteri"
            required
            minLength={6}
            style={{ padding: "10px 12px", fontSize: "13px" }}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: "100%", padding: "12px", fontSize: "14px", marginTop: "8px", fontWeight: "700" }}
          disabled={loading}
        >
          {loading ? "Elaborazione..." : isSignUp ? "Registrati ➔" : "Accedi ➔"}
        </button>
      </form>

      <div style={{ textAlign: "center", marginTop: "24px", fontSize: "13px" }}>
        <span style={{ color: "var(--text-secondary)" }}>
          {isSignUp ? "Hai già un account?" : "Non hai ancora un account?"}
        </span>{" "}
        <button
          type="button"
          onClick={() => setIsSignUp(!isSignUp)}
          style={{ background: "transparent", border: "none", color: "var(--primary)", fontWeight: "700", cursor: "pointer", textDecoration: "underline" }}
        >
          {isSignUp ? "Accedi" : "Registrati ora"}
        </button>
      </div>
    </div>
  );
}

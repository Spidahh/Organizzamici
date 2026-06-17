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

  const handleGoogleLogin = async () => {
    setErrorMsg("");
    setLoading(true);
    try {
      if (!supabase.isMock && redirectPath) {
        localStorage.setItem("oauth_redirect_path", redirectPath);
      }

      // Usiamo l'URL di base (origin + pathname) senza hash per evitare conflitti con HashRouter
      const redirectUrl = supabase.isMock
        ? window.location.origin + window.location.pathname + "#/login"
        : window.location.origin + window.location.pathname;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl
        }
      });
      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }

      if (supabase.isMock) {
        // In mock mode, signInWithOAuth ha già creato la sessione.
        // I listener di auth verranno notificati con un micro-delay (50ms).
        // Aspettiamo un attimo per lasciare che React processi lo state update,
        // poi chiamiamo onAuthSuccess per feedback immediato.
        setSuccessMsg("Accesso con Google riuscito! Caricamento...");
        setTimeout(() => {
          if (onAuthSuccess) onAuthSuccess();
          setLoading(false);
        }, 150);
      } else {
        // In modalità reale Supabase, signInWithOAuth causa un redirect alla pagina Google.
        // Il browser naviga via da questa pagina, quindi questo codice non verrà mai raggiunto.
        // Quando l'utente ritorna dall'OAuth, onAuthStateChange gestisce il login.
        setLoading(false);
      }
    } catch (err) {
      setErrorMsg("Errore durante l'accesso Google: " + err.message);
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

      {/* Login Social Google */}
      <div style={{ margin: "20px 0", display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ flexGrow: 1, height: "1px", background: "var(--border-color)" }}></div>
        <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Oppure</span>
        <div style={{ flexGrow: 1, height: "1px", background: "var(--border-color)" }}></div>
      </div>

      <button
        onClick={handleGoogleLogin}
        className="btn btn-secondary"
        style={{ width: "100%", padding: "10px", fontSize: "13px", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", background: "var(--bg-inset)" }}
        disabled={loading}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" style={{ display: "block" }}>
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
        </svg>
        Accedi con Google
      </button>

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

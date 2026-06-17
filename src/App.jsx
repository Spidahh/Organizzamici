import React, { useState, useEffect } from "react";
import { HashRouter, Routes, Route, useNavigate, useParams, Link, useLocation } from "react-router-dom";
import { supabase } from "./supabaseClient";
import EventCreator from "./components/EventCreator";
import AvailabilitySelector from "./components/AvailabilitySelector";
import ResultsOptimizer from "./components/ResultsOptimizer";
import Auth from "./components/Auth";
import { optimizeDates } from "./utils/schedulerAlgorithm";
import { toast, confirmDialog, celebrate, Skeleton } from "./ui";

// Shared date formatters
const formatDateShort = (dateStr) => {
  if (!dateStr) return "";
  const options = { day: "numeric", month: "short" };
  return new Date(dateStr).toLocaleDateString("it-IT", options);
};

const formatDateIt = (dateStr) => {
  if (!dateStr) return "";
  const options = { weekday: "long", day: "numeric", month: "long", year: "numeric" };
  return new Date(dateStr).toLocaleDateString("it-IT", options);
};

// Scenario demo preconfigurato per caricamento immediato locale senza database
const DEMO_SCENARIO = {
  id: "demo",
  title: "Grigliata alla Villa (Demo)",
  description: "Cena estiva, piscina e relax in Toscana!",
  customLocation: "Villa La Novellina (Chianti)",
  location: "Firenze",
  bedsAvailable: 4,
  selectedDates: [
    "2026-06-20",
    "2026-06-21",
    "2026-06-27",
    "2026-06-28",
    "2026-07-04"
  ],
  eventType: "weekend",
  collaborativeDestination: true,
  destinationProposals: [
    { id: 1, name: "Villa La Novellina (Chianti)", description: "Casale rustico con piscina in mezzo alle vigne in Toscana.", link: "https://airbnb.com/h/chianti-villa-example", votes: { "Io (Organizzatore)": "love", "Marco": "love", "Chiara": "like", "Matteo": "like", "Elena": "love" } },
    { id: 2, name: "Campeggio Isola d'Elba", description: "Bungalow sul mare, spiaggia privata e barbeque.", link: "https://booking.com/example-elba", votes: { "Io (Organizzatore)": "like", "Marco": "no", "Chiara": "love", "Matteo": "like", "Elena": "like" } }
  ],
  resources: [
    { id: 1, title: "Sito Villa Airbnb", desc: "Dettaglio delle camere e letti", url: "https://airbnb.com/h/chianti-villa-example", category: "alloggio" },
    { id: 2, title: "Voli Low Cost Londra-Firenze", desc: "Per Elena da Skyscanner", url: "https://www.skyscanner.it", category: "voli" }
  ],
  participants: [
    { name: "Io (Organizzatore)", city: "Firenze", isEssential: true, transportMode: "auto", restDays: [6, 0], needsBed: false, hasCar: true, carSeats: 4, user_id: "demo-owner" },
    { name: "Marco", city: "Milano", isEssential: true, transportMode: "treno", restDays: [6, 0], needsBed: true, hasCar: false, carSeats: 0, user_id: "demo-u1" },
    { name: "Chiara", city: "Napoli", isEssential: false, transportMode: "treno", restDays: [6, 0], needsBed: false, hasCar: false, carSeats: 0, user_id: "demo-u2" },
    { name: "Matteo", city: "Torino", isEssential: false, transportMode: "auto", restDays: [1, 2], needsBed: true, hasCar: true, carSeats: 3, user_id: "demo-u3" },
    { name: "Elena", city: "Londra", isEssential: false, transportMode: "aereo", restDays: [6, 0], needsBed: true, hasCar: false, carSeats: 0, user_id: "demo-u4" }
  ],
  responses: {
    "Io (Organizzatore)": { "2026-06-20": 5, "2026-06-21": 3, "2026-06-27": 5, "2026-06-28": 3, "2026-07-04": 5 },
    "Marco": { "2026-06-20": 5, "2026-06-21": 5, "2026-06-27": 3, "2026-06-28": 3, "2026-07-04": 0 },
    "Chiara": { "2026-06-20": 3, "2026-06-21": 3, "2026-06-27": 5, "2026-06-28": 3, "2026-07-04": 5 },
    "Matteo": { "2026-06-20": 3, "2026-06-21": 3, "2026-06-27": 5, "2026-06-28": 5, "2026-07-04": 3 },
    "Elena": { "2026-06-20": 5, "2026-06-21": 5, "2026-06-27": 1, "2026-06-28": 1, "2026-07-04": 3 }
  },
  comments: [
    { id: 1, author: "Marco", text: "Sabato 4 Luglio ho un matrimonio, per me è impossibile!", timestamp: "14:20" },
    { id: 2, author: "Elena", text: "Preferisco Giugno. Da Londra ho voli migliori.", timestamp: "14:35" }
  ]
};

// Selettore del colore accento (tema). La scelta è dell'utente e viene
// salvata in localStorage e applicata su <html data-theme="...">.
const THEMES = [
  { id: "amber", cls: "theme-dot-amber", label: "Oro / ambra" },
  { id: "lime", cls: "theme-dot-lime", label: "Lime" },
  { id: "teal", cls: "theme-dot-teal", label: "Teal turchese" },
];

function ThemeSwitch() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem("app_theme") || "teal"; } catch { return "teal"; }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("app_theme", theme); } catch { /* no-op */ }
  }, [theme]);
  return (
    <div className="theme-switch" role="group" aria-label="Colore dell'app">
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`theme-dot ${t.cls} ${theme === t.id ? "active" : ""}`}
          aria-label={`Tema ${t.label}`}
          title={t.label}
          onClick={() => setTheme(t.id)}
        />
      ))}
    </div>
  );
}

// Componente Root principale che avvolge l'app in HashRouter
export default function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}

function AppContent() {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [myEvents, setMyEvents] = useState([]);
  const [myParticipations, setMyParticipations] = useState([]);
  const [loadingUserEvents, setLoadingUserEvents] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Monitora lo stato dell'autenticazione
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserEvents(session.user.id);
        const oauthRedirect = localStorage.getItem("oauth_redirect_path");
        if (oauthRedirect) {
          localStorage.removeItem("oauth_redirect_path");
          navigate(oauthRedirect);
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserEvents(session.user.id);
        const oauthRedirect = localStorage.getItem("oauth_redirect_path");
        if (oauthRedirect) {
          localStorage.removeItem("oauth_redirect_path");
          navigate(oauthRedirect);
        }
      } else {
        setMyEvents([]);
        setMyParticipations([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserEvents = async (userId) => {
    if (supabase.isMock) {
      // Nel mock carichiamo gli eventi locali
      try {
        const events = JSON.parse(localStorage.getItem("mock_db_events") || "[]");
        const owned = events.filter(e => e.owner_id === userId);
        
        const responses = JSON.parse(localStorage.getItem("mock_db_responses") || "[]");
        const participatedIds = responses.filter(r => r.user_id === userId).map(r => r.event_id);
        const participated = events.filter(e => participatedIds.includes(e.id) && e.owner_id !== userId);

        setMyEvents(owned);
        setMyParticipations(participated);
      } catch (e) {
        console.error(e);
      }
      return;
    }

    setLoadingUserEvents(true);
    try {
      // Eventi di proprietà
      const { data: owned } = await supabase
        .from("events")
        .select("*")
        .eq("owner_id", userId)
        .order("created_at", { ascending: false });

      // Eventi in cui l'utente partecipa
      const { data: parts } = await supabase
        .from("responses")
        .select("event_id, events(*)")
        .eq("user_id", userId);

      setMyEvents(owned || []);
      const pEvents = parts?.map(p => p.events).filter(Boolean).filter(e => e.owner_id !== userId) || [];
      setMyParticipations(pEvents);
    } catch (err) {
      console.error("Errore caricamento eventi utente:", err);
    }
    setLoadingUserEvents(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.info("A presto! 👋");
    navigate("/");
  };

  const handleDeleteEvent = async (eventId) => {
    const ok = await confirmDialog({
      title: "Eliminare l'evento?",
      message: "L'evento e tutte le risposte degli amici verranno rimossi definitivamente. L'azione non è reversibile.",
      confirmText: "Sì, elimina",
      danger: true,
    });
    if (!ok) return;

    if (supabase.isMock) {
      try {
        const events = JSON.parse(localStorage.getItem("mock_db_events") || "[]").filter((e) => e.id !== eventId);
        localStorage.setItem("mock_db_events", JSON.stringify(events));
        const responses = JSON.parse(localStorage.getItem("mock_db_responses") || "[]").filter((r) => r.event_id !== eventId);
        localStorage.setItem("mock_db_responses", JSON.stringify(responses));
        toast.success("Evento eliminato");
        fetchUserEvents(user.id);
      } catch (e) {
        toast.error("Errore durante l'eliminazione");
      }
      return;
    }

    const { error } = await supabase.from("events").delete().eq("id", eventId);
    if (error) toast.error("Errore eliminazione: " + error.message);
    else {
      toast.success("Evento eliminato");
      fetchUserEvents(user.id);
    }
  };

  return (
    <>
      {/* Testata App */}
      <header className="app-header">
        <div className="logo-container" style={{ cursor: "pointer" }} onClick={() => navigate("/")}>
          <div className="logo-icon">👥</div>
          <span className="logo-text">Organizzamici</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <ThemeSwitch />
          {user ? (
            <>
              <span style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: "600" }} className="user-email-header">
                👤 {user.user_metadata?.display_name || user.email}
              </span>
              <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: "12px" }}>
                Esci 🚪
              </button>
            </>
          ) : (
            location.pathname !== "/login" && (
              <button onClick={() => navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`)} className="btn btn-primary" style={{ padding: "6px 16px", fontSize: "12px" }}>
                Accedi 🔑
              </button>
            )
          )}
        </div>
      </header>

      {/* Area Contenuto con Router */}
      <main style={{ flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <Routes>
          <Route path="/" element={<Home user={user} myEvents={myEvents} myParticipations={myParticipations} loading={loadingUserEvents} navigate={navigate} onDeleteEvent={handleDeleteEvent} />} />
          <Route path="/login" element={<LoginPage user={user} navigate={navigate} />} />
          <Route path="/create" element={<CreateEvent user={user} navigate={navigate} />} />
          <Route path="/event/:id" element={<EventDashboard user={user} navigate={navigate} />} />
        </Routes>
      </main>

      <footer style={{ marginTop: "40px", paddingTop: "20px", borderTop: "1px solid var(--border-color)", textAlign: "center", color: "var(--text-muted)", fontSize: "12px" }}>
        <p>Organizzamici © 2026 - Piattaforma di Coordinamento Gruppo.</p>
      </footer>
    </>
  );
}

// ----------------------------------------------------
// PAGINA 1: LANDING & DASHBOARD UTENTE (HOME)
// ----------------------------------------------------
function Home({ user, myEvents, myParticipations, loading, navigate, onDeleteEvent }) {
  return (
    <div style={{ width: "100%" }}>
      {user ? (
        // DASHBOARD UTENTE LOGGATO
        <div className="glass-panel" style={{ maxWidth: "800px", margin: "0 auto", textAlign: "left", display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", borderBottom: "1px solid var(--border-color)", paddingBottom: "16px" }}>
            <div>
              <h1 style={{ fontSize: "28px", fontWeight: "800", margin: 0 }}>I tuoi Ritrovi</h1>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px", margin: "4px 0 0" }}>Gestisci i tuoi eventi o rispondi agli inviti ricevuti.</p>
            </div>
            <button onClick={() => navigate("/create")} className="btn btn-primary" style={{ padding: "10px 20px" }}>
              ➕ Crea Nuovo Evento
            </button>
          </div>

          {loading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "14px" }}>
              {[0, 1, 2].map((i) => (
                <div key={i} className="glass-panel" style={{ padding: "16px", animationDelay: `${i * 80}ms` }}>
                  <Skeleton width="35%" height={10} />
                  <Skeleton width="70%" height={18} style={{ marginTop: 14 }} />
                  <Skeleton width="50%" height={12} style={{ marginTop: 10 }} />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {/* Eventi creati come organizzatore */}
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-secondary)" }}>
                  🔧 Ritrovi Organizzati da Te ({myEvents.length})
                </h3>
                {myEvents.length === 0 ? (
                  <div style={{ padding: "20px", background: "var(--bg-inset)", borderRadius: "var(--radius-md)", border: "1px dashed var(--border-color)", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                    Non hai ancora creato nessun evento. Clicca sul pulsante in alto per iniziare!
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "14px" }}>
                    {myEvents.map(e => (
                      <div key={e.id} style={{ position: "relative" }}>
                        <button
                          onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); onDeleteEvent && onDeleteEvent(e.id); }}
                          title="Elimina evento"
                          className="btn btn-danger"
                          style={{ position: "absolute", top: "10px", right: "10px", padding: "4px 9px", fontSize: "12px", zIndex: 2, lineHeight: 1 }}
                        >
                          🗑️
                        </button>
                        <Link to={`/event/${e.id}`} className="result-card" style={{ padding: "16px", paddingRight: "48px", borderRadius: "var(--radius-md)", background: "var(--bg-inset)", border: "1px solid var(--border-color)", textDecoration: "none", display: "block" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <span className="badge chip-gradient" style={{ fontSize: "10px" }}>
                              {(e.event_type || e.eventType || "altro").toUpperCase()}
                            </span>
                            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                              {(e.selected_dates || e.selectedDates || []).length === 1 ? (
                                `📅 ${formatDateShort((e.selected_dates || e.selectedDates)[0])}`
                              ) : (
                                `${(e.selected_dates || e.selectedDates || []).length} date prop.`
                              )}
                            </span>
                          </div>
                          <h4 style={{ margin: "10px 0 4px 0", fontSize: "16px", fontWeight: "700", color: "var(--text-primary)" }}>{e.title}</h4>
                          <p style={{ margin: 0, fontSize: "12px", color: "var(--text-secondary)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                            📍 {e.custom_location || e.customLocation || e.location}
                          </p>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Eventi in cui si partecipa come invitati */}
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-secondary)" }}>
                  🟢 Inviti e Partecipazioni ({myParticipations.length})
                </h3>
                {myParticipations.length === 0 ? (
                  <div style={{ padding: "20px", background: "var(--bg-inset)", borderRadius: "var(--radius-md)", border: "1px dashed var(--border-color)", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                    Non sei registrato in altri eventi. Apri il link invito di un amico per partecipare!
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "14px" }}>
                    {myParticipations.map(e => (
                      <Link to={`/event/${e.id}`} key={e.id} className="result-card" style={{ padding: "16px", borderRadius: "var(--radius-md)", background: "var(--bg-card)", border: "1px solid var(--border-color)", textDecoration: "none", display: "block" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "99px", background: "var(--color-available-bg)", color: "var(--color-available)", fontWeight: "700" }}>
                            {(e.event_type || e.eventType || "altro").toUpperCase()}
                          </span>
                          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                            {(e.selected_dates || e.selectedDates || []).length === 1 ? (
                              `📅 ${formatDateShort((e.selected_dates || e.selectedDates)[0])}`
                            ) : (
                              `${(e.selected_dates || e.selectedDates || []).length} date prop.`
                            )}
                          </span>
                        </div>
                        <h4 style={{ margin: "10px 0 4px 0", fontSize: "16px", fontWeight: "700", color: "var(--text-primary)" }}>{e.title}</h4>
                        <p style={{ margin: 0, fontSize: "12px", color: "var(--text-secondary)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                          📍 {e.custom_location || e.customLocation || e.location}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        // HERO LANDING PER UTENTE NON LOGGATO
        <div style={{ width: "100%" }}>
          {/* HERO */}
          <div style={{ textAlign: "center", maxWidth: "760px", margin: "0 auto", padding: "16px 0 8px" }}>
            <div className="float-anim" style={{ fontSize: "66px", marginBottom: "16px", filter: "drop-shadow(0 14px 34px rgba(var(--accent-rgb),0.55))" }}>🥂</div>
            <span className="badge chip-gradient" style={{ fontSize: "12px" }}>✨ Basta mille chat di gruppo per decidere una data</span>
            <h1 style={{ fontSize: "clamp(32px, 6.2vw, 56px)", lineHeight: 1.05, margin: "18px 0 16px" }}>
              Organizza ritrovi tra amici<br /><span className="text-gradient">senza stress</span>
            </h1>
            <p style={{ fontSize: "17px", color: "var(--text-secondary)", maxWidth: "560px", margin: "0 auto 30px" }}>
              Crea l'evento e condividi un link. Gli amici votano le date in tempo reale e un algoritmo intelligente trova il giorno migliore incrociando <strong style={{ color: "var(--text-primary)" }}>viaggi, impegni e turni di lavoro</strong>.
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => navigate("/login?redirect=/create")} className="btn btn-primary" style={{ padding: "14px 32px", fontSize: "16px" }}>
                Crea il tuo Evento ➔
              </button>
              <button onClick={() => navigate("/event/demo")} className="btn btn-secondary" style={{ padding: "14px 26px", fontSize: "16px" }}>
                👀 Prova la Demo
              </button>
            </div>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "16px" }}>
              Gratis · Nessuna carta richiesta · Funziona su ogni telefono
            </p>
          </div>

          {/* FEATURE GRID */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "18px", marginTop: "44px" }}>
            {[
              { icon: "🗳️", title: "Voti in tempo reale", desc: "Gli amici scelgono le date da qualsiasi telefono. Tu vedi tutto aggiornarsi all'istante." },
              { icon: "🧠", title: "Data ottimale calcolata", desc: "L'algoritmo valuta presenze, coesione del gruppo e sforzo di viaggio per suggerire il giorno perfetto." },
              { icon: "🚗", title: "Carpooling & posti letto", desc: "Chi ha l'auto, quanti posti, chi dorme dove: la logistica si organizza da sola." },
              { icon: "🗺️", title: "Mete votate dal gruppo", desc: "Proponi destinazioni e lascia votare gli amici con ❤️ Love, 👍 Like o 👎 No." },
            ].map((f, i) => (
              <div key={i} className="glass-panel" style={{ padding: "22px", animationDelay: `${i * 90}ms` }}>
                <div style={{ width: "46px", height: "46px", borderRadius: "13px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", background: "var(--brand-grad-soft)", border: "1px solid var(--border-glow)", marginBottom: "14px" }}>{f.icon}</div>
                <h4 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "6px" }}>{f.title}</h4>
                <p style={{ color: "var(--text-secondary)", fontSize: "13px", margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>

          {/* COME FUNZIONA */}
          <div className="glass-panel" style={{ marginTop: "28px", padding: "30px" }}>
            <h3 style={{ textAlign: "center", marginBottom: "24px" }}>Come funziona, in 3 passi</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}>
              {[["1", "Crea l'evento", "Scegli tipo, luogo e date — fisse o da votare."], ["2", "Condividi il link", "Mandalo su WhatsApp: gli amici votano in 10 secondi."], ["3", "Partite insieme", "Vedi la data migliore, carpooling e logistica già pronti."]].map(([n, t, d]) => (
                <div key={n} style={{ textAlign: "center" }}>
                  <div style={{ width: "44px", height: "44px", margin: "0 auto 12px", borderRadius: "50%", background: "var(--brand-grad)", color: "#07221d", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "19px", fontFamily: "var(--font-display)", boxShadow: "0 8px 20px -6px rgba(var(--accent-rgb),0.6)" }}>{n}</div>
                  <h4 style={{ fontSize: "15px", fontWeight: "700", marginBottom: "4px" }}>{t}</h4>
                  <p style={{ color: "var(--text-secondary)", fontSize: "13px", margin: 0 }}>{d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------
// PAGINA 2: AUTHENTICATION (LOGIN / REGISTRAZIONE)
// ----------------------------------------------------
function LoginPage({ user, navigate }) {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const redirect = searchParams.get("redirect") || "/";

  useEffect(() => {
    if (user) {
      navigate(redirect);
    }
  }, [user, navigate, redirect]);

  return <Auth onAuthSuccess={() => navigate(redirect)} redirectPath={redirect} />;
}

// ----------------------------------------------------
// PAGINA 3: EVENT CREATOR WIZARD (ORGANIZZATORE)
// ----------------------------------------------------
function CreateEvent({ user, navigate }) {
  const [step, setStep] = useState(1);
  const [eventDetails, setEventDetails] = useState({
    title: "Ritrovo Amici",
    description: "Inserisci qui le note o il programma dell'evento!",
    customLocation: "Villa La Novellina (Chianti)",
    location: "Firenze",
    bedsAvailable: 4,
    eventType: "weekend",
    collaborativeDestination: false,
    trackBeds: true,
    selectedDates: []
  });

  useEffect(() => {
    // Forza login prima di creare un evento
    if (!user) {
      navigate("/login?redirect=/create");
    }
  }, [user, navigate]);

  const handleNext = async (details) => {
    const updatedDetails = { ...eventDetails, ...details };
    setEventDetails(updatedDetails);

    if (step === 1 && (!details.selectedDates || details.selectedDates.length === 0)) {
      setStep(2);
    } else {
      // Salva nel database (Supabase)
      if (supabase.isMock) {
        // Mocking
        const mockEvents = JSON.parse(localStorage.getItem("mock_db_events") || "[]");
        const newId = `evt-${Date.now()}`;
        const newEvent = {
          id: newId,
          owner_id: user.id,
          created_at: new Date().toISOString(),
          title: updatedDetails.title,
          description: updatedDetails.description,
          event_type: updatedDetails.eventType,
          location: updatedDetails.location,
          custom_location: updatedDetails.customLocation,
          beds_available: updatedDetails.bedsAvailable,
          selected_dates: updatedDetails.selectedDates,
          collaborative_destination: updatedDetails.collaborativeDestination,
          track_beds: updatedDetails.trackBeds
        };
        localStorage.setItem("mock_db_events", JSON.stringify([...mockEvents, newEvent]));

        // Inserisce risposta di default dell'organizzatore nel mock
        const mockResponses = JSON.parse(localStorage.getItem("mock_db_responses") || "[]");
        const newResponse = {
          id: `res-${Date.now()}`,
          event_id: newId,
          user_id: user.id,
          user_name: user.user_metadata?.display_name || user.email.split("@")[0],
          city: updatedDetails.location,
          transport_mode: "auto",
          needs_bed: false,
          has_car: false,
          car_seats: 0,
          rest_days: [6, 0],
          votes: updatedDetails.selectedDates.reduce((acc, date) => ({ ...acc, [date]: 5 }), {}),
          destination_votes: {}
        };
        localStorage.setItem("mock_db_responses", JSON.stringify([...mockResponses, newResponse]));

        celebrate();
        toast.success("Condividi il link con gli amici!", "Evento creato 🎉");
        navigate(`/event/${newId}`);
        return;
      }

      // Supabase reale
      const { data, error } = await supabase
        .from("events")
        .insert({
          owner_id: user.id,
          title: updatedDetails.title,
          description: updatedDetails.description,
          event_type: updatedDetails.eventType,
          location: updatedDetails.location,
          custom_location: updatedDetails.customLocation,
          beds_available: updatedDetails.bedsAvailable,
          selected_dates: updatedDetails.selectedDates,
          collaborative_destination: updatedDetails.collaborativeDestination,
          track_beds: updatedDetails.trackBeds
        })
        .select()
        .single();

      if (error) {
        toast.error("Errore nella creazione dell'evento: " + error.message);
        return;
      }

      // Registra l'organizzatore come partecipante di default
      await supabase
        .from("responses")
        .insert({
          event_id: data.id,
          user_id: user.id,
          user_name: user.user_metadata?.display_name || user.email.split("@")[0],
          city: updatedDetails.location,
          transport_mode: "auto",
          needs_bed: false,
          has_car: false,
          car_seats: 0,
          rest_days: [6, 0],
          votes: updatedDetails.selectedDates.reduce((acc, date) => ({ ...acc, [date]: 5 }), {})
        });

      celebrate();
      toast.success("Condividi il link con gli amici!", "Evento creato 🎉");
      navigate(`/event/${data.id}`);
    }
  };

  return (
    <div style={{ width: "100%" }}>
      <EventCreator
        step={step}
        initialData={eventDetails}
        onNext={handleNext}
        onPrev={() => {
          if (step === 2) setStep(1);
          else navigate("/");
        }}
      />
    </div>
  );
}

// ----------------------------------------------------
// PAGINA 4: EVENT DASHBOARD & RISOLUTORE (REALTIME)
// ----------------------------------------------------
function EventDashboard({ user, navigate }) {
  const { id } = useParams();
  const [isDemo, setIsDemo] = useState(id === "demo");
  const [loading, setLoading] = useState(true);
  const [eventData, setEventData] = useState(null);
  const [responses, setResponses] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [comments, setComments] = useState([]);
  const [resources, setResources] = useState([]);

  // Sotto-step attivi della dashboard: "control" (dashboard tabellone), "vote-guest" (scheda voto), "results" (classifica date)
  const [dashboardStep, setDashboardStep] = useState("control");

  // Nome per modifica/voto corrente
  const [editingParticipantName, setEditingParticipantName] = useState("");

  // Per conservare i dati demo in React state se stiamo provando la demo
  const [demoState, setDemoState] = useState(null);
  const [dashboardCommentText, setDashboardCommentText] = useState("");

  // Calcola il nome utente di default
  const defaultName = isDemo 
    ? "" 
    : user 
      ? (user.user_metadata?.display_name || user.email.split("@")[0]) 
      : "";

  // Caricamento e Realtime Sync
  useEffect(() => {
    if (isDemo) {
      // Inizializza i dati demo in memoria
      setDemoState(JSON.parse(JSON.stringify(DEMO_SCENARIO)));
      setLoading(false);
      return;
    }

    fetchEventDetails();

    if (supabase.isMock) return;

    // Sottoscrizione realtime su qualsiasi modifica nel database legata a questo evento
    const channel = supabase
      .channel(`db-changes-${id}`)
      .on("postgres_changes", { event: "*", schema: "public" }, () => {
        // Ricarica tutti i dettagli se c'è una modifica
        fetchEventDetails();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, isDemo]);

  // Se siamo in modalità mock e non reale, ascoltiamo l'evento storage per aggiornamenti realtime locali
  useEffect(() => {
    if (!supabase.isMock || isDemo) return;

    const handleMockSync = () => {
      fetchEventDetails();
    };

    window.addEventListener("storage", handleMockSync);
    return () => window.removeEventListener("storage", handleMockSync);
  }, [id, isDemo]);

  const fetchEventDetails = async () => {
    setLoading(true);
    try {
      // Evento
      const { data: event, error: errEvt } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .single();

      if (errEvt) {
        console.error("Evento non trovato:", errEvt);
        setLoading(false);
        return;
      }

      // Risposte
      const { data: resps } = await supabase
        .from("responses")
        .select("*")
        .eq("event_id", id);

      // Proposte destinazione
      const { data: props } = await supabase
        .from("destination_proposals")
        .select("*")
        .eq("event_id", id);

      // Risorse
      const { data: rescs } = await supabase
        .from("resources")
        .select("*")
        .eq("event_id", id);

      // Commenti
      const { data: comms } = await supabase
        .from("comments")
        .select("*")
        .eq("event_id", id)
        .order("created_at", { ascending: false });

      setEventData(event);
      setResponses(resps || []);
      setProposals(props || []);
      setResources(rescs || []);
      setComments(comms || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  // Mappa i dati Supabase nel formato originale atteso dai vecchi componenti
  const mappedData = React.useMemo(() => {
    if (isDemo && demoState) {
      return {
        event: demoState,
        participants: demoState.participants,
        responsesMap: demoState.responses,
        proposalsWithVotes: demoState.destinationProposals,
        resourcesList: demoState.resources,
        commentsList: demoState.comments
      };
    }

    if (!eventData) return null;

    const participants = responses.map(r => ({
      name: r.user_name,
      city: r.city,
      transportMode: r.transport_mode,
      needsBed: r.needs_bed,
      hasCar: r.has_car,
      carSeats: r.car_seats,
      restDays: r.rest_days,
      isEssential: r.user_id === eventData.owner_id,
      user_id: r.user_id
    }));

    const responsesMap = {};
    responses.forEach(r => {
      responsesMap[r.user_name] = r.votes;
    });

    const proposalsWithVotes = proposals.map(p => {
      const votes = {};
      responses.forEach(r => {
        if (r.destination_votes && r.destination_votes[p.id]) {
          votes[r.user_name] = r.destination_votes[p.id];
        }
      });
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        link: p.link,
        votes
      };
    });

    const resourcesList = resources.map(r => ({
      id: r.id,
      title: r.title,
      desc: r.desc_text,
      url: r.url,
      category: r.category
    }));

    return {
      event: {
        title: eventData.title,
        description: eventData.description,
        location: eventData.location,
        customLocation: eventData.custom_location || eventData.customLocation,
        selectedDates: eventData.selected_dates || eventData.selectedDates || [],
        eventType: eventData.event_type || eventData.eventType || "altro",
        bedsAvailable: eventData.beds_available !== undefined ? eventData.beds_available : eventData.bedsAvailable,
        collaborativeDestination: eventData.collaborative_destination !== undefined ? eventData.collaborative_destination : eventData.collaborativeDestination,
        trackBeds: eventData.track_beds !== undefined ? eventData.track_beds : eventData.trackBeds
      },
      participants,
      responsesMap,
      proposalsWithVotes,
      resourcesList,
      commentsList: comments
    };
  }, [eventData, responses, proposals, resources, comments, isDemo, demoState]);

  const isSingleFixedDate = mappedData?.event?.selectedDates?.length === 1;

  const confirmedPresent = React.useMemo(() => {
    if (!mappedData) return [];
    return mappedData.participants.filter(p => {
      const vote = mappedData.responsesMap[p.name]?.[mappedData.event.selectedDates[0]];
      return vote === 5 || vote === 3;
    });
  }, [mappedData]);

  const confirmedAbsent = React.useMemo(() => {
    if (!mappedData) return [];
    return mappedData.participants.filter(p => {
      const vote = mappedData.responsesMap[p.name]?.[mappedData.event.selectedDates[0]];
      return vote === 0;
    });
  }, [mappedData]);

  const confirmedDifficult = React.useMemo(() => {
    if (!mappedData) return [];
    return mappedData.participants.filter(p => {
      const vote = mappedData.responsesMap[p.name]?.[mappedData.event.selectedDates[0]];
      return vote === 1;
    });
  }, [mappedData]);

  const pendingConfirmation = React.useMemo(() => {
    if (!mappedData) return [];
    return mappedData.participants.filter(p => {
      const vote = mappedData.responsesMap[p.name]?.[mappedData.event.selectedDates[0]];
      return vote === undefined;
    });
  }, [mappedData]);

  const carpoolStats = React.useMemo(() => {
    if (!mappedData) return { drivers: [], totalSeats: 0, autoPassengers: 0, enoughSeats: true };
    let drivers = [];
    let totalSeats = 0;
    let autoPassengers = 0;
    mappedData.participants.forEach(p => {
      if (p.hasCar) {
        drivers.push(p);
        totalSeats += (p.carSeats || 0);
      } else if (p.transportMode === "auto") {
        autoPassengers++;
      }
    });
    return {
      drivers,
      totalSeats,
      autoPassengers,
      enoughSeats: totalSeats >= autoPassengers
    };
  }, [mappedData]);

  const rankedDestinations = React.useMemo(() => {
    if (!mappedData?.proposalsWithVotes) return [];
    return [...mappedData.proposalsWithVotes].map(p => {
      let score = 0;
      let loveCount = 0;
      let likeCount = 0;
      let noCount = 0;
      Object.entries(p.votes || {}).forEach(([, vote]) => {
        if (vote === "love") { score += 3; loveCount++; }
        else if (vote === "like") { score += 1; likeCount++; }
        else if (vote === "no") { score -= 2; noCount++; }
      });
      return { ...p, score, loveCount, likeCount, noCount };
    }).sort((a, b) => b.score - a.score);
  }, [mappedData]);

  const optimizedList = React.useMemo(() => {
    if (!mappedData) return [];
    return optimizeDates(mappedData.event.location, mappedData.event.selectedDates, mappedData.participants, mappedData.responsesMap);
  }, [mappedData]);

  const selectedDetails = React.useMemo(() => {
    if (!mappedData || mappedData.event.selectedDates.length === 0) return null;
    const activeDate = mappedData.event.selectedDates[0];
    return optimizedList.find((d) => d.date === activeDate);
  }, [mappedData, optimizedList]);



  const getTravelAdvice = (detailsObj, dateStr) => {
    const time = detailsObj.travelTime;
    const desc = detailsObj.travelDesc;
    const restDays = detailsObj.restDays || [6, 0];
    const eventDayOfWeek = new Date(dateStr).getDay();
    const isUserRestDay = restDays.includes(eventDayOfWeek);

    if (time === 0) {
      return "📍 Locale. Già sul posto. Nessun viaggio richiesto.";
    }
    if (desc.includes("aereo")) {
      let base = `✈️ Volo aereo (~${time}h totali con controlli).`;
      if (isUserRestDay) {
        return `${base} Giorno di riposo per te: ideale partire la sera prima per evitare stanchezza.`;
      } else {
        return `${base} Giorno lavorativo: richiede 1.5 giorni di ferie per coprire andata e imbarco diurno.`;
      }
    }
    if (desc.includes("Alta Velocità")) {
      if (isUserRestDay) {
        return `🚄 Treno Alta Velocità. Consigliato treno delle 08:30 (arrivo in ~${time}h). Sei a riposo: 0 ferie.`;
      } else {
        return `🚄 Treno Alta Velocità. È un tuo giorno lavorativo: consigliata partenza nel pomeriggio con mezza giornata di ferie.`;
      }
    }
    if (time > 4.5) {
      if (isUserRestDay) {
        return `🚗 Viaggio in auto lungo (~${time}h). Essendo a riposo, consigliata partenza il pomeriggio prima per riposarsi.`;
      } else {
        return `🚗 Auto (~${time}h). È tuo giorno lavorativo: viaggio molto pesante, richiede 1-2 giorni di ferie.`;
      }
    } else {
      if (isUserRestDay) {
        return `🚗 Auto (~${time}h). Sei a riposo: partenza ore 09:00, arrivo per pranzo. Rientro il giorno successivo.`;
      } else {
        return `🚗 Auto (~${time}h). Lavori in questo giorno: richiede ferie pomeridiane per viaggiare in sicurezza.`;
      }
    }
  };

  if (loading) {
    return (
      <div className="glass-panel" style={{ maxWidth: "900px", margin: "0 auto", width: "100%" }}>
        <Skeleton width="30%" height={12} />
        <Skeleton width="60%" height={26} style={{ marginTop: 14 }} />
        <Skeleton width="45%" height={14} style={{ marginTop: 10 }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 28 }}>
          <Skeleton height={120} radius={12} />
          <Skeleton height={120} radius={12} />
        </div>
        <Skeleton height={80} radius={12} style={{ marginTop: 16 }} />
      </div>
    );
  }

  if (!mappedData) {
    return (
      <div className="glass-panel" style={{ maxWidth: "500px", margin: "40px auto", textAlign: "center" }}>
        <h3>⚠️ Ritrovo non trovato</h3>
        <p style={{ color: "var(--text-secondary)" }}>L'evento richiesto non esiste o è stato cancellato.</p>
        <button onClick={() => navigate("/")} className="btn btn-primary" style={{ marginTop: "12px" }}>Torna in Home Page</button>
      </div>
    );
  }

  // Verifica se l'utente corrente è l'organizzatore dell'evento
  const isOrganizer = isDemo 
    ? true 
    : user && eventData && eventData.owner_id === user.id;

  // Trova se l'utente loggato ha già un profilo di voto registrato
  const loggedInParticipant = isDemo
    ? mappedData.participants.find(p => p.name === "Io (Organizzatore)")
    : user && responses.find(r => r.user_id === user.id);

  // ----------------------------------------------------
  // GESTIONE DATABASE SCRITTURA & SIMULAZIONE DEMO
  // ----------------------------------------------------

  // Aggiorna i voti di un partecipante GIÀ registrato (chiamato da AvailabilitySelector in real-time)
  const handleUpdateVotes = async (participantName, votes) => {
    if (isDemo) {
      const updatedResponses = { ...demoState.responses, [participantName]: votes };
      setDemoState({ ...demoState, responses: updatedResponses });
      return;
    }

    if (!user) return;
    const target = responses.find(r => r.user_name === participantName);
    if (!target) return;

    const { error } = await supabase
      .from("responses")
      .update({ votes })
      .eq("id", target.id);

    if (error) console.error("Errore aggiornamento voti:", error.message);
    else fetchEventDetails();
  };

  const handleRegisterGuest = async (newGuest, votes) => {
    if (isDemo) {
      const updatedParticipants = [...demoState.participants];
      const existsIdx = updatedParticipants.findIndex(p => p.name.toLowerCase() === newGuest.name.toLowerCase());
      if (existsIdx > -1) {
        updatedParticipants[existsIdx] = { ...updatedParticipants[existsIdx], ...newGuest };
      } else {
        updatedParticipants.push({ ...newGuest, user_id: `demo-usr-${Date.now()}` });
      }

      const updatedResponses = { ...demoState.responses, [newGuest.name]: votes };
      setDemoState({
        ...demoState,
        participants: updatedParticipants,
        responses: updatedResponses
      });
      return;
    }

    if (!user) return;
    const { error } = await supabase
      .from("responses")
      .upsert({
        event_id: id,
        user_id: user.id,
        user_name: newGuest.name,
        city: newGuest.city,
        transport_mode: newGuest.transportMode,
        needs_bed: newGuest.needsBed,
        has_car: newGuest.hasCar,
        car_seats: newGuest.carSeats,
        rest_days: newGuest.restDays,
        votes: votes,
        destination_votes: loggedInParticipant?.destination_votes || {}
      });

    if (error) toast.error("Errore nel salvataggio: " + error.message);
    else fetchEventDetails();
  };

  const handleUpdateParticipantInfo = async (participantName, updatedInfo) => {
    if (isDemo) {
      const updated = demoState.participants.map(p => 
        p.name === participantName ? { ...p, ...updatedInfo } : p
      );
      setDemoState({ ...demoState, participants: updated });
      return;
    }

    const target = responses.find(r => r.user_name === participantName);
    if (!target) return;

    const { error } = await supabase
      .from("responses")
      .update({
        city: updatedInfo.city,
        transport_mode: updatedInfo.transportMode,
        needs_bed: updatedInfo.needsBed,
        has_car: updatedInfo.hasCar,
        car_seats: updatedInfo.carSeats,
        rest_days: updatedInfo.restDays
      })
      .eq("id", target.id);

    if (error) toast.error("Errore nel salvataggio del profilo: " + error.message);
    else fetchEventDetails();
  };

  const handleAddComment = async (author, text) => {
    const time = new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
    if (isDemo) {
      const newComment = { id: Date.now(), author, text, timestamp: time };
      setDemoState({ ...demoState, comments: [newComment, ...demoState.comments] });
      return;
    }

    const { error } = await supabase
      .from("comments")
      .insert({
        event_id: id,
        author,
        text,
        timestamp: time
      });
    if (error) console.error(error);
    else fetchEventDetails();
  };

  const handleAddDestinationProposal = async (newProp) => {
    if (isDemo) {
      const newD = { id: Date.now(), name: newProp.name, description: newProp.description, link: newProp.link, votes: {} };
      setDemoState({ ...demoState, destinationProposals: [...demoState.destinationProposals, newD] });
      return;
    }

    const { error } = await supabase
      .from("destination_proposals")
      .insert({
        event_id: id,
        name: newProp.name,
        description: newProp.description,
        link: newProp.link
      });
    if (error) toast.error(error.message);
    else fetchEventDetails();
  };

  const handleDeleteDestinationProposal = async (propId) => {
    if (isDemo) {
      const filtered = demoState.destinationProposals.filter(p => p.id !== propId);
      setDemoState({ ...demoState, destinationProposals: filtered });
      return;
    }

    const { error } = await supabase
      .from("destination_proposals")
      .delete()
      .eq("id", propId);
    if (error) toast.error(error.message);
    else fetchEventDetails();
  };

  const handleVoteDestination = async (propId, participantName, voteValue) => {
    if (isDemo) {
      const updated = demoState.destinationProposals.map(p => {
        if (p.id === propId) {
          const votes = { ...p.votes, [participantName]: voteValue };
          return { ...p, votes };
        }
        return p;
      });
      setDemoState({ ...demoState, destinationProposals: updated });
      return;
    }

    if (!user || !loggedInParticipant) return;
    const updatedVotes = { ...(loggedInParticipant.destination_votes || {}), [propId]: voteValue };
    
    const { error } = await supabase
      .from("responses")
      .update({ destination_votes: updatedVotes })
      .eq("id", loggedInParticipant.id);

    if (error) toast.error(error.message);
    else fetchEventDetails();
  };

  const handleAddResource = async (newRes) => {
    if (isDemo) {
      const newR = { id: Date.now(), title: newRes.title, desc: newRes.desc, url: newRes.url, category: newRes.category };
      setDemoState({ ...demoState, resources: [...demoState.resources, newR] });
      return;
    }

    const { error } = await supabase
      .from("resources")
      .insert({
        event_id: id,
        title: newRes.title,
        desc_text: newRes.desc,
        url: newRes.url,
        category: newRes.category
      });
    if (error) toast.error(error.message);
    else fetchEventDetails();
  };

  const handleDeleteResource = async (resId) => {
    if (isDemo) {
      const filtered = demoState.resources.filter(r => r.id !== resId);
      setDemoState({ ...demoState, resources: filtered });
      return;
    }

    const { error } = await supabase
      .from("resources")
      .delete()
      .eq("id", resId);
    if (error) toast.error(error.message);
    else fetchEventDetails();
  };

  const handleFinalizeDate = async (finalDate) => {
    if (isDemo) {
      setDemoState({
        ...demoState,
        selectedDates: [finalDate]
      });
      setDashboardStep("control");
      return;
    }

    if (supabase.isMock) {
      const mockEvents = JSON.parse(localStorage.getItem("mock_db_events") || "[]");
      const updated = mockEvents.map(e => e.id === id ? { ...e, selected_dates: [finalDate] } : e);
      localStorage.setItem("mock_db_events", JSON.stringify(updated));
      fetchEventDetails();
      setDashboardStep("control");
      return;
    }

    const { error } = await supabase
      .from("events")
      .update({ selected_dates: [finalDate] })
      .eq("id", id);

    if (error) {
      toast.error("Errore nel fissare la data: " + error.message);
    } else {
      celebrate();
      toast.success(`Data fissata: ${formatDateIt(finalDate)}!`, "Tutto pronto 🎉");
      fetchEventDetails();
      setDashboardStep("control");
    }
  };



  // ----------------------------------------------------
  // ACCESSO EVENTO COME GUEST (SE NON LOGGATO)
  // ----------------------------------------------------
  if (!user && !isDemo) {
    return (
      <div style={{ width: "100%", maxWidth: "800px", margin: "0 auto", textAlign: "left" }}>
        <div className="glass-panel" style={{ padding: "40px", display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ textAlign: "center" }}>
            <span style={{ fontSize: "50px" }}>👋</span>
            <h1 style={{ fontSize: "28px", fontWeight: "800", marginTop: "12px" }}>Sei stato invitato a: {mappedData.event.title}</h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px", maxWidth: "500px", margin: "6px auto 0" }}>
              {mappedData.event.description}
            </p>
            <div style={{ margin: "14px 0", fontSize: "13px", color: "var(--primary)", display: "flex", flexDirection: "column", gap: "4px", alignItems: "center" }}>
              <div>📍 Destinazione: <strong>{mappedData.event.customLocation || mappedData.event.location}</strong></div>
              {isSingleFixedDate && (
                <div>📅 Data Stabilita: <strong>{formatDateIt(mappedData.event.selectedDates[0])}</strong></div>
              )}
            </div>
          </div>
          
          <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "24px", textAlign: "center" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "4px" }}>Accedi o Registrati per partecipare</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginBottom: "20px" }}>
              {isSingleFixedDate 
                ? "Per confermare la tua presenza e coordinare il viaggio abbiamo bisogno del tuo account gratuito (richiede 10 secondi)."
                : "Per inserire i tuoi orari e votare le date abbiamo bisogno del tuo account gratuito (richiede 10 secondi)."}
            </p>
            <Auth onAuthSuccess={fetchEventDetails} redirectPath={`/event/${id}`} />
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // SUB-STEP 1: REGISTRAZIONE O VOTO PERSONALE (GUEST)
  // ----------------------------------------------------
  if (dashboardStep === "vote-guest") {
    return (
      <div style={{ width: "100%" }}>
        <AvailabilitySelector
          eventLocation={mappedData.event.location}
          eventCustomLocation={mappedData.event.customLocation}
          candidateDates={mappedData.event.selectedDates}
          participants={mappedData.participants}
          activeParticipantName={editingParticipantName || defaultName}
          responses={mappedData.responsesMap}
          onSaveResponse={handleUpdateVotes}
          onUpdateParticipantInfo={handleUpdateParticipantInfo}
          comments={mappedData.commentsList}
          onAddComment={handleAddComment}
          isGuestOnlyView={!isOrganizer}
          trackBeds={mappedData.event.trackBeds}
          onRegisterGuest={handleRegisterGuest}
          eventType={mappedData.event.eventType}
          collaborativeDestination={mappedData.event.collaborativeDestination}
          destinationProposals={mappedData.proposalsWithVotes}
          onVoteDestination={handleVoteDestination}
          onAddDestinationProposal={handleAddDestinationProposal}
          onDeleteDestinationProposal={handleDeleteDestinationProposal}
          resources={mappedData.resourcesList}
          onAddResource={handleAddResource}
          onDeleteResource={handleDeleteResource}
          onBack={() => {
            setDashboardStep("control");
            setEditingParticipantName("");
          }}
        />
      </div>
    );
  }

  // ----------------------------------------------------
  // SUB-STEP 2: CLASSIFICA DATE FINALI E OTTIMIZZATORE
  // ----------------------------------------------------
  if (dashboardStep === "results") {
    return (
      <div style={{ width: "100%" }}>
        <ResultsOptimizer
          eventLocation={mappedData.event.location}
          eventCustomLocation={mappedData.event.customLocation}
          candidateDates={mappedData.event.selectedDates}
          participants={mappedData.participants}
          responses={mappedData.responsesMap}
          comments={mappedData.commentsList}
          bedsAvailable={mappedData.event.bedsAvailable}
          onBackToAvailability={() => setDashboardStep("control")}
          onReset={() => navigate("/")}
          trackBeds={mappedData.event.trackBeds}
          eventType={mappedData.event.eventType}
          collaborativeDestination={mappedData.event.collaborativeDestination}
          destinationProposals={mappedData.proposalsWithVotes}
          onVoteDestination={handleVoteDestination}
          onAddDestinationProposal={handleAddDestinationProposal}
          onDeleteDestinationProposal={handleDeleteDestinationProposal}
          resources={mappedData.resourcesList}
          onAddResource={handleAddResource}
          onDeleteResource={handleDeleteResource}
          isOrganizer={isOrganizer}
          onFinalizeDate={handleFinalizeDate}
        />
      </div>
    );
  }

  // ----------------------------------------------------
  // SUB-STEP PRINCIPALE: TABELLONE CONTROLLO EVENTO
  // ----------------------------------------------------
  const uniqueInviteLink = window.location.origin + window.location.pathname + `#/event/${id}`;

  return (
    <div className="glass-panel" style={{ maxWidth: "900px", margin: "0 auto", width: "100%", textAlign: "left" }}>
      
      {/* Intestazione Evento */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", borderBottom: "1px solid var(--border-color)", paddingBottom: "16px", marginBottom: "20px" }}>
        <div>
          <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "99px", background: "var(--color-preferred-bg)", color: "var(--color-preferred)", fontWeight: "700" }}>
            {(mappedData.event.eventType || "altro").toUpperCase()}
          </span>
          <h2 style={{ margin: "4px 0 0 0", fontSize: "24px", fontWeight: "800", color: "var(--text-primary)" }}>{mappedData.event.title}</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px", margin: "4px 0 0" }}>
            📍 Destinazione: <strong>{mappedData.event.customLocation || mappedData.event.location || "Da definire"}</strong>
            {isSingleFixedDate && (
              <span style={{ display: "block", marginTop: "4px" }}>
                📅 Data Stabilita: <strong style={{ color: "var(--text-primary)" }}>{formatDateIt(mappedData.event.selectedDates[0])}</strong>
              </span>
            )}
          </p>
        </div>
        
        <div style={{ display: "flex", gap: "8px" }}>
          {/* Mostra il pulsante di voto/partecipazione */}
          {loggedInParticipant ? (
            <button
              onClick={() => {
                setEditingParticipantName(loggedInParticipant.user_name || loggedInParticipant.name);
                setDashboardStep("vote-guest");
              }}
              className="btn btn-secondary"
              style={{ padding: "8px 16px", fontSize: "13px" }}
            >
              ✏️ Modifica la mia Presenza
            </button>
          ) : (
            <button
              onClick={() => {
                setEditingParticipantName("");
                setDashboardStep("vote-guest");
              }}
              className="btn btn-primary"
              style={{ padding: "8px 16px", fontSize: "13px" }}
            >
              🙋 Aggiungiti all'Evento
            </button>
          )}
        </div>
      </div>

      {/* Box Invito Condivisione */}
      {!isDemo && (
        <div style={{ background: "var(--bg-inset)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "16px", marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Invia questo link unico ai tuoi amici su WhatsApp per farli unire all'evento:</span>
            <div style={{ fontWeight: "700", fontSize: "13px", marginTop: "4px", color: "var(--primary)", wordBreak: "break-all" }}>
              {uniqueInviteLink}
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => {
                navigator.clipboard.writeText(uniqueInviteLink);
                toast.success("Link invito copiato negli appunti!");
              }}
              className="btn btn-secondary"
              style={{ padding: "8px 14px", fontSize: "12px" }}
            >
              📋 Copia
            </button>
            <button
              onClick={() => {
                const text = `Ciao! Entra su questo link per unirti e votare le date del ritrovo '${mappedData.event.title}': ${uniqueInviteLink}`;
                window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
              }}
              className="btn btn-secondary"
              style={{ padding: "8px 14px", fontSize: "12px", background: "var(--color-available-bg)", color: "var(--color-available)", border: "1px solid rgba(16, 185, 129, 0.2)" }}
            >
              💬 WhatsApp
            </button>
          </div>
        </div>
      )}

      {/* Layout Condizionale in base a Data Fissa o Date Multiple */}
      {isSingleFixedDate ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", marginBottom: "24px" }}>
          
          {/* Box RSVP rapido se non ha risposto */}
          {!loggedInParticipant && (
            <div className="glass-panel" style={{ background: "rgba(59, 130, 246, 0.03)", border: "1.5px dashed rgba(59, 130, 246, 0.3)", padding: "20px", borderRadius: "var(--radius-md)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: "16px", fontWeight: "700" }}>👋 Non hai ancora risposto a questo invito</h4>
                  <p style={{ color: "var(--text-secondary)", fontSize: "13px", margin: "2px 0 0 0" }}>
                    Fai sapere al gruppo se ci sarai il giorno <strong>{formatDateIt(mappedData.event.selectedDates[0])}</strong>.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingParticipantName("");
                    setDashboardStep("vote-guest");
                  }}
                  className="btn btn-primary"
                  style={{ padding: "8px 16px", fontSize: "13px" }}
                >
                  🙋 Registra Presenza
                </button>
              </div>
            </div>
          )}

          {/* Due Colonne Layout */}
          <div className="app-grid app-grid-2cols">
            
            {/* Colonna Sinistra: Partecipazioni & Guida alla Partenza */}
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              
              {/* Stato Partecipazioni */}
              <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "16px", textAlign: "left" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700" }}>👥 Stato delle Partecipazioni</h3>
                  <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginTop: "2px" }}>
                    Conferme e disponibilità per questo ritrovo.
                  </p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ padding: "10px 14px", background: "var(--color-available-bg)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "var(--radius-sm)" }}>
                    <strong style={{ color: "var(--color-available)", fontSize: "13px" }}>🟢 Confermati ({confirmedPresent.length}):</strong>
                    <div style={{ fontSize: "13px", marginTop: "4px", color: "var(--text-primary)" }}>
                      {confirmedPresent.length === 0 ? "Nessuno ancora." : confirmedPresent.map(p => p.name).join(", ")}
                    </div>
                  </div>

                  {confirmedDifficult.length > 0 && (
                    <div style={{ padding: "10px 14px", background: "var(--color-maybe-bg)", border: "1px solid rgba(245, 158, 11, 0.2)", borderRadius: "var(--radius-sm)" }}>
                      <strong style={{ color: "var(--color-maybe)", fontSize: "13px" }}>🟡 Con Fatica ({confirmedDifficult.length}):</strong>
                      <div style={{ fontSize: "13px", marginTop: "4px", color: "var(--text-primary)" }}>
                        {confirmedDifficult.map(p => p.name).join(", ")}
                      </div>
                    </div>
                  )}

                  {confirmedAbsent.length > 0 && (
                    <div style={{ padding: "10px 14px", background: "var(--color-veto-bg)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "var(--radius-sm)" }}>
                      <strong style={{ color: "var(--color-veto)", fontSize: "13px" }}>🔴 Non posso ({confirmedAbsent.length}):</strong>
                      <div style={{ fontSize: "13px", marginTop: "4px", color: "var(--text-primary)" }}>
                        {confirmedAbsent.map(p => p.name).join(", ")}
                      </div>
                    </div>
                  )}

                  {pendingConfirmation.length > 0 && (
                    <div style={{ padding: "10px 14px", background: "var(--color-pending-bg)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}>
                      <strong style={{ color: "var(--text-secondary)", fontSize: "13px" }}>⏳ In attesa di risposta ({pendingConfirmation.length}):</strong>
                      <div style={{ fontSize: "13px", marginTop: "4px", color: "var(--text-muted)" }}>
                        {pendingConfirmation.map(p => p.name).join(", ")}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Guida alla Partenza */}
              {selectedDetails && (
                <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "16px", textAlign: "left" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700" }}>🚗 Guida alla Partenza degli Invitati</h3>
                    <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginTop: "2px" }}>
                      Indicazioni e tempi di viaggio calcolati automaticamente.
                    </p>
                  </div>

                  {mappedData.event.trackBeds && selectedDetails.bedsNeededCount > 0 && (
                    <div style={{ padding: "10px 12px", background: "var(--color-preferred-bg)", border: "1px solid rgba(37, 99, 235, 0.2)", borderRadius: "var(--radius-sm)", fontSize: "12px", color: "var(--color-preferred)" }}>
                      🛏️ <strong>Richieste Alloggio:</strong> Per questo giorno, <strong>{selectedDetails.bedsNeededCount} ospiti</strong> richiedono un posto letto: {selectedDetails.details.filter(d => d.needsBed).map(d => d.name).join(", ")}.
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {selectedDetails.details.map((d) => (
                      <div key={d.name} style={{ background: "var(--bg-inset)", padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: "700" }}>
                          <span>
                            {d.name}{" "}
                            <span style={{ fontWeight: "400", color: "var(--text-secondary)", fontSize: "10px" }}>
                              (da {d.city} • {d.leaveDays > 0 ? `⚠️ Richiede ${d.leaveDays}gg ferie` : "✅ 0gg ferie"})
                            </span>
                          </span>
                          <span style={{ color: "var(--color-available)" }}>{d.travelTime === 0 ? "Locale" : `${d.travelTime}h`}</span>
                        </div>
                        <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px", margin: 0 }}>
                          {getTravelAdvice(d, selectedDetails.date)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Colonna Destra: Carpooling & Destinazioni Collaborative */}
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              
              {/* Carpooling */}
              <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "16px", textAlign: "left" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700" }}>🚗 Coordinamento Trasporti</h3>
                  <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginTop: "2px" }}>
                    Dati di viaggio e disponibilità auto per il carpooling.
                  </p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div style={{ background: "var(--bg-inset)", padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", textAlign: "center" }}>
                    <div style={{ fontSize: "18px", fontWeight: "800", color: "var(--color-preferred)" }}>
                      {carpoolStats.drivers.length}
                    </div>
                    <div style={{ fontSize: "10px", color: "var(--text-secondary)", textTransform: "uppercase", marginTop: "2px" }}>
                      Auto Disponibili
                    </div>
                  </div>
                  <div style={{ background: "var(--bg-inset)", padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", textAlign: "center" }}>
                    <div style={{ fontSize: "18px", fontWeight: "800", color: carpoolStats.totalSeats >= carpoolStats.autoPassengers ? "var(--color-available)" : "var(--color-veto)" }}>
                      {carpoolStats.totalSeats}
                    </div>
                    <div style={{ fontSize: "10px", color: "var(--text-secondary)", textTransform: "uppercase", marginTop: "2px" }}>
                      Posti Auto Totali
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px" }}>
                  {carpoolStats.drivers.length === 0 ? (
                    <div style={{ padding: "8px", background: "var(--color-veto-bg)", border: "1px solid rgba(239, 68, 68, 0.15)", borderRadius: "var(--radius-sm)", color: "var(--color-veto)" }}>
                      ⚠️ Nessuna auto offerta. Tutti viaggiano con mezzi pubblici o non hanno registrato l'auto.
                    </div>
                  ) : (
                    <>
                      <ul style={{ paddingLeft: "14px", margin: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
                        {carpoolStats.drivers.map(d => (
                          <li key={d.name}>
                            🚗 <strong>{d.name}</strong> da {d.city}: mette a disposizione {d.carSeats} posti passeggeri.
                          </li>
                        ))}
                      </ul>
                      
                      {carpoolStats.totalSeats >= carpoolStats.autoPassengers ? (
                        <div style={{ padding: "8px", background: "var(--color-available-bg)", border: "1px solid rgba(16, 185, 129, 0.15)", borderRadius: "var(--radius-sm)", color: "var(--color-available)" }}>
                          ✅ Posti auto sufficienti ({carpoolStats.totalSeats} posti per {carpoolStats.autoPassengers} passeggeri).
                        </div>
                      ) : (
                        <div style={{ padding: "8px", background: "var(--color-veto-bg)", border: "1px solid rgba(239, 68, 68, 0.15)", borderRadius: "var(--radius-sm)", color: "var(--color-veto)" }}>
                          ⚠️ Posti auto insufficienti (mancano {carpoolStats.autoPassengers - carpoolStats.totalSeats} posti).
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Destinazione Collaborativa */}
              {mappedData.event.collaborativeDestination && (
                <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "16px", textAlign: "left" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700" }}>🗺️ Graduatoria Destinazioni</h3>
                    <p style={{ color: "var(--text-secondary)", fontSize: "12px", marginTop: "2px" }}>
                      Mete proposte e votate dal gruppo (Love +3pt, Like +1pt, No -2pt).
                    </p>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {rankedDestinations.length === 0 ? (
                      <p style={{ color: "var(--text-muted)", fontSize: "12px", fontStyle: "italic", margin: 0 }}>
                        Nessuna destinazione proposta.
                      </p>
                    ) : (
                      rankedDestinations.map((dest, idx) => (
                        <div key={dest.id} style={{ padding: "8px 12px", borderRadius: "var(--radius-sm)", background: "var(--bg-inset)", border: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ textAlign: "left" }}>
                            <span style={{ fontSize: "12px", fontWeight: "800", color: "var(--text-muted)", marginRight: "6px" }}>#{idx + 1}</span>
                            <span style={{ fontSize: "13px", fontWeight: "700" }}>{dest.name}</span>
                            <div style={{ fontSize: "10px", color: "var(--text-secondary)", marginTop: "2px" }}>
                              ❤️ {dest.loveCount} | 👍 {dest.likeCount} | 👎 {dest.noCount}
                            </div>
                          </div>
                          <span style={{ fontSize: "14px", fontWeight: "800", color: "var(--color-available)" }}>{dest.score} pt</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      ) : (
        <div style={{ marginBottom: "24px" }}>
          <h3 style={{ fontSize: "16px", marginBottom: "12px", fontWeight: "700" }}>📊 Tabellone delle Disponibilità</h3>
          <div style={{ overflowX: "auto", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "center" }}>
              <thead>
                <tr style={{ background: "var(--bg-inset)" }}>
                  <th style={{ padding: "12px", textAlign: "left", minWidth: "150px" }}>Partecipante</th>
                  {mappedData.event.selectedDates.map(d => (
                    <th key={d} style={{ padding: "12px", minWidth: "90px" }}>
                      {formatDateShort(d)}
                    </th>
                  ))}
                  {isOrganizer && <th style={{ padding: "12px", minWidth: "100px" }}>Azioni</th>}
                </tr>
              </thead>
              <tbody>
                {mappedData.participants.length === 0 ? (
                  <tr>
                    <td colSpan={mappedData.event.selectedDates.length + 2} style={{ padding: "30px", color: "var(--text-muted)", fontStyle: "italic" }}>
                      Nessun partecipante iscritto. Condividi il link sopra con i tuoi amici!
                    </td>
                  </tr>
                ) : (
                  mappedData.participants.map(p => {
                    const userVotes = mappedData.responsesMap[p.name] || {};
                    return (
                      <tr key={p.name} style={{ borderBottom: "1px solid var(--border-color)" }}>
                        <td style={{ padding: "12px", textAlign: "left", fontWeight: "700" }}>
                          {p.name} {p.name === defaultName && " (Tu)"}
                          <span style={{ display: "block", fontSize: "10px", fontWeight: "normal", color: "var(--text-secondary)", marginTop: "2px" }}>
                            da {p.city} • 🚗 {p.hasCar ? `${p.carSeats}p` : "No"}
                          </span>
                        </td>
                        {mappedData.event.selectedDates.map(d => {
                          const vote = userVotes[d];
                          if (vote === 5) {
                            return (
                              <td key={d} style={{ padding: "8px" }}>
                                <span className="badge badge-preferred" style={{ fontSize: "11px", padding: "4px 8px", display: "inline-block" }}>😊 Sì</span>
                              </td>
                            );
                          }
                          if (vote === 3) {
                            return (
                              <td key={d} style={{ padding: "8px" }}>
                                <span className="badge badge-available" style={{ fontSize: "11px", padding: "4px 8px", display: "inline-block" }}>🟢 Ok</span>
                              </td>
                            );
                          }
                          if (vote === 1) {
                            return (
                              <td key={d} style={{ padding: "8px" }}>
                                <span className="badge badge-maybe" style={{ fontSize: "11px", padding: "4px 8px", display: "inline-block" }}>🤔 Fatica</span>
                              </td>
                            );
                          }
                          if (vote === 0) {
                            return (
                              <td key={d} style={{ padding: "8px" }}>
                                <span className="badge badge-veto" style={{ fontSize: "11px", padding: "4px 8px", display: "inline-block" }}>❌ No</span>
                              </td>
                            );
                          }
                          return (
                            <td key={d} style={{ padding: "8px" }}>
                              <span className="badge badge-pending" style={{ fontSize: "11px", padding: "4px 8px", display: "inline-block" }}>⏳ Attesa</span>
                            </td>
                          );
                        })}
                        
                        {isOrganizer && (
                          <td style={{ padding: "8px" }}>
                            <button
                              onClick={() => {
                                setEditingParticipantName(p.name);
                                setDashboardStep("vote-guest");
                              }}
                              className="btn btn-secondary"
                              style={{ padding: "4px 8px", fontSize: "11px" }}
                            >
                              Modifica ✏️
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bacheca Risorse */}
      <div className="glass-panel" style={{ textAlign: "left", display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700" }}>🔗 Bacheca Risorse & Prenotazioni</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "12px", marginTop: "2px" }}>
              Link utili per alloggio, trasporti e biglietti.
            </p>
          </div>
          <button
            onClick={() => {
              setEditingParticipantName(loggedInParticipant?.user_name || loggedInParticipant?.name || "");
              setDashboardStep("vote-guest");
            }}
            className="btn btn-secondary"
            style={{ padding: "5px 12px", fontSize: "11px" }}
          >
            ✏️ Gestisci Links & Bacheca
          </button>
        </div>
        {mappedData.resourcesList.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: "12px", fontStyle: "italic", margin: 0 }}>Nessun link salvato in bacheca.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "10px" }}>
            {mappedData.resourcesList.map(res => (
              <div key={res.id} style={{ padding: "10px", borderRadius: "var(--radius-sm)", background: "var(--bg-inset)", border: "1px solid var(--border-color)", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "6px" }}>
                <div>
                  <span style={{ fontSize: "9px", padding: "1px 5px", borderRadius: "99px", background: "rgba(59, 130, 246, 0.1)", color: "var(--primary)", fontWeight: "700" }}>
                    {res.category.toUpperCase()}
                  </span>
                  <h4 style={{ margin: "4px 0 2px 0", fontSize: "13px", fontWeight: "700" }}>{res.title}</h4>
                  {res.desc && <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: 0 }}>{res.desc}</p>}
                </div>
                <a href={res.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ padding: "4px", fontSize: "10px", textAlign: "center", display: "block", marginTop: "4px" }}>Visita Link ➔</a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Commenti */}
      <div className="glass-panel" style={{ textAlign: "left", display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
        <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700" }}>💬 Bacheca dei Commenti</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "180px", overflowY: "auto" }}>
          {mappedData.commentsList.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "12px", textAlign: "center", margin: "10px 0" }}>Nessun messaggio in bacheca.</p>
          ) : (
            mappedData.commentsList.map((c) => (
              <div key={c.id} style={{ padding: "8px 12px", background: "var(--bg-inset)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", fontSize: "12px" }}>
                <strong>{c.author}</strong> <span style={{ color: "var(--text-muted)", fontSize: "9px" }}>({c.timestamp})</span>: {c.text}
              </div>
            ))
          )}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!dashboardCommentText.trim()) return;
            const author = loggedInParticipant
              ? (loggedInParticipant.user_name || loggedInParticipant.name)
              : (user ? (user.user_metadata?.display_name || user.email.split("@")[0]) : "Ospite");
            handleAddComment(author, dashboardCommentText);
            setDashboardCommentText("");
          }}
          style={{ display: "flex", gap: "8px", marginTop: "8px", borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}
        >
          <input
            type="text"
            value={dashboardCommentText}
            onChange={(e) => setDashboardCommentText(e.target.value)}
            placeholder="Scrivi un commento..."
            required
            style={{
              flexGrow: 1,
              padding: "8px 12px",
              fontSize: "13px",
              background: "var(--bg-inset)",
              border: "1px solid var(--border-color)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-primary)"
            }}
          />
          <button
            type="submit"
            className="btn btn-primary"
            style={{ padding: "8px 16px", fontSize: "13px" }}
          >
            Invia ➔
          </button>
        </form>
      </div>

      {/* Pulsantiera navigazione */}
      <div style={{ display: "flex", gap: "10px", justifyContent: "space-between", flexWrap: "wrap", borderTop: "1px solid var(--border-color)", paddingTop: "20px" }}>
        <button onClick={() => navigate("/")} className="btn btn-secondary" style={{ padding: "10px 20px" }}>
          ← Torna alla Home
        </button>
        
        {!isSingleFixedDate && (
          <button
            onClick={() => setDashboardStep("results")}
            className="btn btn-primary"
            style={{ padding: "12px 30px", fontSize: "15px" }}
            disabled={mappedData.participants.length === 0}
          >
            Vedi Data Migliore & Calcoli 🏆
          </button>
        )}
      </div>

    </div>
  );
}

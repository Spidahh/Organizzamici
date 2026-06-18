import React, { useState, useEffect } from "react";
import { estimateTravelTime, CITIES, geocodeCity } from "../utils/geoData";
import { toast } from "../ui";

export default function AvailabilitySelector({
  eventLocation,
  eventCustomLocation,
  candidateDates,
  participants,
  activeParticipantName,
  responses,
  onSaveResponse,
  onUpdateParticipantInfo,
  comments,
  onAddComment,
  isGuestOnlyView,
  onBack,
  trackBeds = true,
  onRegisterGuest,
  eventType,
  collaborativeDestination,
  destinationProposals = [],
  onVoteDestination,
  onAddDestinationProposal,
  onDeleteDestinationProposal,
  resources = [],
  onAddResource,
  onDeleteResource,
  geoVersion
}) {
  const [resourceCategoryFilter, setResourceCategoryFilter] = useState("all");
  const [showAddResourceForm, setShowAddResourceForm] = useState(false);
  const [resTitle, setResTitle] = useState("");
  const [resUrl, setResUrl] = useState("");
  const [resDesc, setResDesc] = useState("");
  const [resCat, setResCat] = useState("altro");

  // Riconosce se stiamo facendo una nuova registrazione on-the-fly o modificando uno esistente
  const isNewRegistration = !activeParticipantName || !participants.some(p => p.name === activeParticipantName);

  const [regName, setRegName] = useState("");
  const [tempCity, setTempCity] = useState("Milano");
  const [tempTransport, setTempTransport] = useState("treno");
  const [tempNeedsBed, setTempNeedsBed] = useState(true);
  const [tempRestDays, setTempRestDays] = useState([6, 0]);
  const [tempHasCar, setTempHasCar] = useState(false);
  const [tempCarSeats, setTempCarSeats] = useState(0);

  const [, setGeoTick] = React.useState(0);
  React.useEffect(() => {
    if (!tempCity || !tempCity.trim()) return;
    let cancelled = false;
    const t = setTimeout(() => {
      geocodeCity(tempCity).then((coords) => { if (!cancelled && coords) setGeoTick((x) => x + 1); });
    }, 700);
    return () => { cancelled = true; clearTimeout(t); };
  }, [tempCity]);

  // Se restDays è composto da sabato (6) e domenica (0), allora ha il weekend libero
  const isStandardWeekendLibero = (days) => {
    return days.length === 2 && days.includes(0) && days.includes(6);
  };
  
  const [isShiftWorker, setIsShiftWorker] = useState(false);

  // Voti espressi correntemente in questa sessione
  const [activeVotes, setActiveVotes] = useState({});

  useEffect(() => {
    if (!isNewRegistration) {
      const activeParticipant = participants.find((p) => p.name === activeParticipantName);
      if (activeParticipant) {
        setTempCity(activeParticipant.city || "Milano");
        setTempTransport(activeParticipant.transportMode || "treno");
        setTempNeedsBed(activeParticipant.needsBed !== undefined ? activeParticipant.needsBed : true);
        setTempHasCar(activeParticipant.hasCar || false);
        setTempCarSeats(activeParticipant.carSeats || 0);
        const rest = activeParticipant.restDays || [6, 0];
        setTempRestDays(rest);
        setIsShiftWorker(!isStandardWeekendLibero(rest));
        
        // Copia i voti esistenti nello stato locale
        setActiveVotes(responses[activeParticipantName] || {});
      }
    } else {
      setRegName("");
      setTempCity("Milano");
      setTempTransport("treno");
      setTempNeedsBed(true);
      setTempHasCar(false);
      setTempCarSeats(0);
      setTempRestDays([6, 0]);
      setIsShiftWorker(false);
      setActiveVotes({});
    }
  }, [activeParticipantName, isNewRegistration]);

  const [newCommentText, setNewCommentText] = useState("");

  const formatDateIt = (dateStr) => {
    const options = { weekday: "long", day: "numeric", month: "long", year: "numeric" };
    return new Date(dateStr).toLocaleDateString("it-IT", options);
  };

  const isWeekendDay = (dateStr) => {
    const day = new Date(dateStr).getDay();
    return day === 0 || day === 6 || day === 5;
  };

  const travel = estimateTravelTime(tempCity, eventLocation, tempTransport);

  const handleVoteChange = (dateStr, score) => {
    const updatedVotes = {
      ...activeVotes,
      [dateStr]: score
    };
    setActiveVotes(updatedVotes);
    
    // Se non è una nuova registrazione, salviamo in real-time nello state globale del padre
    if (!isNewRegistration) {
      onSaveResponse(activeParticipantName, updatedVotes);
    }
  };

  const setAllTo = (score) => {
    const updatedVotes = {};
    candidateDates.forEach((d) => {
      updatedVotes[d] = score;
    });
    setActiveVotes(updatedVotes);
    
    if (!isNewRegistration) {
      onSaveResponse(activeParticipantName, updatedVotes);
    }
  };

  const handleSaveTravelOverride = (e) => {
    e.preventDefault();
    if (!isNewRegistration) {
      onUpdateParticipantInfo(activeParticipantName, {
        city: tempCity,
        transportMode: tempTransport,
        needsBed: trackBeds ? tempNeedsBed : false,
        restDays: tempRestDays,
        hasCar: tempHasCar,
        carSeats: tempHasCar ? tempCarSeats : 0
      });
      toast.success("Opzioni viaggio e lavoro salvate!");
    }
  };

  const toggleRestDay = (dayIndex) => {
    if (tempRestDays.includes(dayIndex)) {
      if (tempRestDays.length > 1) {
        setTempRestDays(tempRestDays.filter(d => d !== dayIndex));
      }
    } else {
      setTempRestDays([...tempRestDays, dayIndex].sort());
    }
  };

  const handlePostComment = (e) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    const author = isNewRegistration ? (regName.trim() || "Nuovo Invitato") : activeParticipantName;
    onAddComment(author, newCommentText);
    setNewCommentText("");
  };

  const handleFinalSubmit = () => {
    if (isNewRegistration) {
      const trimmedName = regName.trim();
      if (!trimmedName) {
        toast.error("Inserisci il tuo nome per registrarti!");
        return;
      }
      
      const nameExists = participants.some(p => p.name.toLowerCase() === trimmedName.toLowerCase());
      if (nameExists) {
        toast.error(`Il nome "${trimmedName}" è già registrato nel tabellone. Per favore usa un nome o soprannome diverso.`);
        return;
      }
      
      const newGuest = {
        name: trimmedName,
        city: tempCity,
        transportMode: tempTransport,
        needsBed: trackBeds ? tempNeedsBed : false,
        restDays: tempRestDays,
        isEssential: false,
        hasCar: tempHasCar,
        carSeats: tempHasCar ? tempCarSeats : 0
      };
      
      onRegisterGuest(newGuest, activeVotes);
      onBack();
    } else {
      onBack();
    }
  };

  const getOtherVotesSummary = (dateStr) => {
    const summary = { preferred: 0, available: 0, difficult: 0, veto: 0 };
    participants.forEach(p => {
      if (!isNewRegistration && p.name === activeParticipantName) return;
      const vote = responses[p.name]?.[dateStr];
      if (vote === undefined) return;
      if (vote === 5) summary.preferred++;
      else if (vote === 3) summary.available++;
      else if (vote === 1) summary.difficult++;
      else if (vote === 0) summary.veto++;
    });
    return summary;
  };

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: "20px" }}>
      
      {/* 1. SEZIONE INTESTAZIONE O MODULO REGISTRAZIONE */}
      {isNewRegistration ? (
        <div className="glass-panel" style={{ textAlign: "left", padding: "24px" }}>
          <h2 style={{ margin: 0, fontSize: "20px", marginBottom: "16px", fontWeight: "700" }}>👥 Partecipa all'Evento</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Il tuo Nome / Soprannome</label>
              <input
                type="text"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="Es. Marco, Chiara, Elena..."
                required
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: "10px" }}>Da dove parti?</label>
                <>
                  <input
                    list="oa-city-dl-1"
                    type="text"
                    value={tempCity}
                    onChange={(e) => setTempCity(e.target.value)}
                    placeholder="Scrivi una città qualsiasi (es. Matera, Lisbona...)"
                    style={{ padding: "6px 10px", fontSize: "13px" }}
                  />
                  <datalist id="oa-city-dl-1">{Object.keys(CITIES).map((c) => (<option key={c} value={c} />))}</datalist>
                </>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: "10px" }}>Mezzo preferito</label>
                <select value={tempTransport} onChange={(e) => setTempTransport(e.target.value)} style={{ padding: "6px 10px", fontSize: "13px" }}>
                  <option value="auto">🚗 Auto</option>
                  <option value="treno">🚄 Treno</option>
                  {eventType !== "cena" && eventType !== "gita" && (
                    <option value="aereo">✈️ Aereo</option>
                  )}
                </select>
              </div>
            </div>

            {tempTransport === "auto" && (
              <div style={{ display: "flex", gap: "12px", background: "var(--bg-main)", padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", alignItems: "center", marginTop: "10px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer", textTransform: "none", margin: 0, flexShrink: 0 }}>
                  <input
                    type="checkbox"
                    checked={tempHasCar}
                    onChange={(e) => setTempHasCar(e.target.checked)}
                    style={{ width: "16px", height: "16px" }}
                  />
                  Metto a disposizione l'auto 🚗
                </label>
                {tempHasCar && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexGrow: 1 }}>
                    <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Posti passeggeri:</span>
                    <input
                      type="number"
                      min="1"
                      max="8"
                      value={tempCarSeats}
                      onChange={(e) => setTempCarSeats(parseInt(e.target.value) || 0)}
                      style={{ padding: "4px 8px", fontSize: "12px", width: "60px", background: "var(--bg-card)" }}
                    />
                  </div>
                )}
              </div>
            )}

            {trackBeds && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="checkbox"
                  id="needs-bed-chk"
                  checked={tempNeedsBed}
                  onChange={(e) => setTempNeedsBed(e.target.checked)}
                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                />
                <label htmlFor="needs-bed-chk" style={{ cursor: "pointer", fontSize: "13px", textTransform: "none", margin: 0 }}>
                  Richiedo alloggio / posto letto condiviso 🛏️
                </label>
              </div>
            )}

            <div>
              <label style={{ fontSize: "11px", display: "block", marginBottom: "6px", fontWeight: "700" }}>Orari Lavoro / Turni:</label>
              <div style={{ display: "flex", gap: "16px", marginBottom: "8px", flexWrap: "wrap" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer", textTransform: "none", margin: 0 }}>
                  <input
                    type="radio"
                    name="lavoro-weekend-reg"
                    checked={!isShiftWorker}
                    onChange={() => {
                      setIsShiftWorker(false);
                      setTempRestDays([6, 0]);
                    }}
                    style={{ width: "16px", height: "16px" }}
                  />
                  Weekend Libero (Sabato e Domenica)
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer", textTransform: "none", margin: 0 }}>
                  <input
                    type="radio"
                    name="lavoro-weekend-reg"
                    checked={isShiftWorker}
                    onChange={() => setIsShiftWorker(true)}
                    style={{ width: "16px", height: "16px" }}
                  />
                  Lavoro su Turni / Orari particolari
                </label>
              </div>

              {isShiftWorker && (
                <div style={{ background: "var(--bg-inset)", padding: "12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", marginTop: "10px" }}>
                  <label style={{ fontSize: "11px", display: "block", marginBottom: "6px" }}>Seleziona i tuoi giorni di riposo:</label>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"].map((dayName, idx) => {
                      const isSelected = tempRestDays.includes(idx);
                      return (
                        <button
                          key={dayName}
                          type="button"
                          onClick={() => toggleRestDay(idx)}
                          className="btn"
                          style={{
                            padding: "5px 10px",
                            fontSize: "12px",
                            background: isSelected ? "var(--primary)" : "var(--bg-card)",
                            border: `1px solid ${isSelected ? "var(--primary)" : "var(--border-color)"}`,
                            color: isSelected ? "white" : "var(--text-secondary)"
                          }}
                        >
                          {dayName}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-panel" style={{ textAlign: "left", padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "22px" }}>
                📝 Modifica disponibilità per: <strong style={{ color: "var(--primary)" }}>{activeParticipantName}</strong>
              </h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px", margin: "4px 0 0" }}>
                Destinazione: <strong>{eventCustomLocation || eventLocation}</strong> • Partenza: <strong>{tempCity} ({travel.desc})</strong>
              </p>
            </div>
            <button onClick={onBack} className="btn btn-secondary" style={{ padding: "8px 16px" }}>
              ← Annulla
            </button>
          </div>

          <details style={{ width: "100%", marginTop: "16px", borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
            <summary style={{ cursor: "pointer", fontWeight: "700", fontSize: "13px", color: "var(--primary)" }}>
              ⚙️ Modifica Città Partenza e Turni di Lavoro
            </summary>
            
            <form onSubmit={handleSaveTravelOverride} style={{ marginTop: "12px", padding: "12px", background: "var(--bg-inset)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: "10px" }}>Partenza</label>
                  <>
                    <input
                      list="oa-city-dl-2"
                      type="text"
                      value={tempCity}
                      onChange={(e) => setTempCity(e.target.value)}
                      placeholder="Scrivi una città qualsiasi (es. Matera, Lisbona...)"
                      style={{ padding: "6px 10px", fontSize: "13px" }}
                    />
                    <datalist id="oa-city-dl-2">{Object.keys(CITIES).map((c) => (<option key={c} value={c} />))}</datalist>
                  </>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: "10px" }}>Mezzo</label>
                  <select value={tempTransport} onChange={(e) => setTempTransport(e.target.value)} style={{ padding: "6px 10px", fontSize: "13px" }}>
                    <option value="auto">🚗 Auto</option>
                    <option value="treno">🚄 Treno</option>
                    {eventType !== "cena" && eventType !== "gita" && (
                      <option value="aereo">✈️ Aereo</option>
                    )}
                  </select>
                </div>
              </div>

              {tempTransport === "auto" && (
                <div style={{ display: "flex", gap: "12px", background: "var(--bg-main)", padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", alignItems: "center" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer", textTransform: "none", margin: 0, flexShrink: 0 }}>
                    <input
                      type="checkbox"
                      checked={tempHasCar}
                      onChange={(e) => setTempHasCar(e.target.checked)}
                      style={{ width: "16px", height: "16px" }}
                    />
                    Metto a disposizione l'auto 🚗
                  </label>
                  {tempHasCar && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexGrow: 1 }}>
                      <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Posti passeggeri:</span>
                      <input
                        type="number"
                        min="1"
                        max="8"
                        value={tempCarSeats}
                        onChange={(e) => setTempCarSeats(parseInt(e.target.value) || 0)}
                        style={{ padding: "4px 8px", fontSize: "12px", width: "60px", background: "var(--bg-card)" }}
                      />
                    </div>
                  )}
                </div>
              )}

              {trackBeds && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="checkbox"
                    id="needs-bed-chk-edit"
                    checked={tempNeedsBed}
                    onChange={(e) => setTempNeedsBed(e.target.checked)}
                    style={{ width: "16px", height: "16px", cursor: "pointer" }}
                  />
                  <label htmlFor="needs-bed-chk-edit" style={{ cursor: "pointer", fontSize: "13px", textTransform: "none", margin: 0 }}>
                    Richiedo posto letto 🛏️
                  </label>
                </div>
              )}

              <div>
                <label style={{ fontSize: "11px", display: "block", marginBottom: "6px" }}>Turni Lavoro:</label>
                <div style={{ display: "flex", gap: "16px", marginBottom: "8px", flexWrap: "wrap" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", cursor: "pointer", textTransform: "none", margin: 0 }}>
                    <input
                      type="radio"
                      name="lavoro-weekend-edit"
                      checked={!isShiftWorker}
                      onChange={() => {
                        setIsShiftWorker(false);
                        setTempRestDays([6, 0]);
                      }}
                    />
                    Weekend Libero
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", cursor: "pointer", textTransform: "none", margin: 0 }}>
                    <input
                      type="radio"
                      name="lavoro-weekend-edit"
                      checked={isShiftWorker}
                      onChange={() => setIsShiftWorker(true)}
                    />
                    Turni particolari
                  </label>
                </div>

                {isShiftWorker && (
                  <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "6px" }}>
                    {["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"].map((dayName, idx) => {
                      const isSelected = tempRestDays.includes(idx);
                      return (
                        <button
                          key={dayName}
                          type="button"
                          onClick={() => toggleRestDay(idx)}
                          className="btn"
                          style={{ padding: "4px 8px", fontSize: "11px", background: isSelected ? "var(--primary)" : "var(--bg-card)", border: `1px solid ${isSelected ? "var(--primary)" : "var(--border-color)"}`, color: isSelected ? "white" : "var(--text-secondary)" }}
                        >
                          {dayName}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-end", padding: "6px 12px", fontSize: "12px" }}>
                Salva Modifiche Profilo
              </button>
            </form>
          </details>
        </div>
      )}

      {/* SEZIONE PROPOSTE DESTINAZIONE (Se collaborativo) */}
      {collaborativeDestination && (
        <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "16px", textAlign: "left" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700" }}>🗺️ Vota la Destinazione</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginTop: "2px" }}>
              Esprimi il tuo gradimento per le mete proposte o aggiungine una nuova.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {destinationProposals.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "13px", fontStyle: "italic" }}>
                Nessuna destinazione proposta al momento. Inserisci la prima sotto!
              </p>
            ) : (
              destinationProposals.map((prop) => {
                // Legge il voto corrente per questo partecipante
                const myVote = isNewRegistration ? "" : (prop.votes[activeParticipantName] || "");
                
                return (
                  <div
                    key={prop.id}
                    style={{
                      padding: "12px",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--bg-main)",
                      border: "1px solid var(--border-color)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <strong style={{ fontSize: "14px" }}>{prop.name}</strong>
                        {prop.description && (
                          <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                            {prop.description}
                          </p>
                        )}
                        {prop.link && (
                          <a
                            href={prop.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: "11px", color: "var(--primary)", textDecoration: "underline", display: "inline-block", marginTop: "4px" }}
                          >
                            🔗 Vedi Link Proposta
                          </a>
                        )}
                      </div>

                      {/* Azione di rimozione proposta (solo se non guest-only o per l'organizzatore) */}
                      {!isGuestOnlyView && (
                        <button
                          type="button"
                          onClick={() => onDeleteDestinationProposal(prop.id)}
                          style={{ background: "transparent", border: "none", color: "var(--color-veto)", cursor: "pointer", fontSize: "11px" }}
                        >
                          Elimina 🗑️
                        </button>
                      )}
                    </div>

                    {/* Votazione meta */}
                    <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                      <button
                        type="button"
                        onClick={() => {
                          if (isNewRegistration) {
                            toast.info("Completa prima la registrazione inserendo il tuo nome in alto per salvare i voti della destinazione!");
                            return;
                          }
                          onVoteDestination(prop.id, activeParticipantName, myVote === "love" ? "" : "love");
                        }}
                        className="btn"
                        style={{
                          padding: "4px 8px",
                          fontSize: "11px",
                          background: myVote === "love" ? "var(--color-preferred-bg)" : "var(--bg-card)",
                          border: `1px solid ${myVote === "love" ? "var(--color-preferred)" : "var(--border-color)"}`,
                          color: myVote === "love" ? "var(--color-preferred)" : "var(--text-secondary)",
                          fontWeight: myVote === "love" ? "bold" : "normal"
                        }}
                      >
                        ❤️ Love
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (isNewRegistration) {
                            toast.info("Completa prima la registrazione inserendo il tuo nome in alto per salvare i voti della destinazione!");
                            return;
                          }
                          onVoteDestination(prop.id, activeParticipantName, myVote === "like" ? "" : "like");
                        }}
                        className="btn"
                        style={{
                          padding: "4px 8px",
                          fontSize: "11px",
                          background: myVote === "like" ? "var(--color-available-bg)" : "var(--bg-card)",
                          border: `1px solid ${myVote === "like" ? "var(--color-available)" : "var(--border-color)"}`,
                          color: myVote === "like" ? "var(--color-available)" : "var(--text-secondary)",
                          fontWeight: myVote === "like" ? "bold" : "normal"
                        }}
                      >
                        👍 Like
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (isNewRegistration) {
                            toast.info("Completa prima la registrazione inserendo il tuo nome in alto per salvare i voti della destinazione!");
                            return;
                          }
                          onVoteDestination(prop.id, activeParticipantName, myVote === "no" ? "" : "no");
                        }}
                        className="btn"
                        style={{
                          padding: "4px 8px",
                          fontSize: "11px",
                          background: myVote === "no" ? "var(--color-veto-bg)" : "var(--bg-card)",
                          border: `1px solid ${myVote === "no" ? "var(--color-veto)" : "var(--border-color)"}`,
                          color: myVote === "no" ? "var(--color-veto)" : "var(--text-secondary)",
                          fontWeight: myVote === "no" ? "bold" : "normal"
                        }}
                      >
                        👎 No
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Form aggiunta proposta */}
          <details style={{ marginTop: "8px", borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
            <summary style={{ cursor: "pointer", fontWeight: "700", fontSize: "13px", color: "var(--primary)" }}>
              ➕ Proponi una nuova meta
            </summary>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
              <input
                type="text"
                id="new-dest-name"
                placeholder="Nome location (es. Isola d'Elba, Ristorante Da Gianni...)"
                style={{ padding: "6px 10px", fontSize: "13px" }}
              />
              <input
                type="text"
                id="new-dest-desc"
                placeholder="Descrizione / dettagli..."
                style={{ padding: "6px 10px", fontSize: "13px" }}
              />
              <input
                type="text"
                id="new-dest-link"
                placeholder="Link web (es. Airbnb, Booking, Google Maps)..."
                style={{ padding: "6px 10px", fontSize: "13px" }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                style={{ alignSelf: "flex-end", padding: "6px 12px", fontSize: "12px" }}
                onClick={() => {
                  const nameEl = document.getElementById("new-dest-name");
                  const descEl = document.getElementById("new-dest-desc");
                  const linkEl = document.getElementById("new-dest-link");
                  
                  if (!nameEl.value.trim()) {
                    toast.error("Inserisci almeno il nome della proposta!");
                    return;
                  }
                  
                  onAddDestinationProposal({
                    name: nameEl.value.trim(),
                    description: descEl.value.trim(),
                    link: linkEl.value.trim()
                  });
                  
                  nameEl.value = "";
                  descEl.value = "";
                  linkEl.value = "";
                }}
              >
                Aggiungi Proposta
              </button>
            </div>
          </details>
        </div>
      )}

      {/* 2. AREA ESPRESSIONE VOTI (Votazione delle date) */}
      {candidateDates.length === 1 ? (
        <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "16px", textAlign: "left" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700" }}>Conferma la tua Presenza</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginTop: "2px" }}>
              L'evento è programmato per il giorno: <strong style={{ color: "var(--text-primary)" }}>{formatDateIt(candidateDates[0])}</strong>. Confermi che potrai esserci?
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <button
              type="button"
              onClick={() => handleVoteChange(candidateDates[0], 5)}
              className="btn"
              style={{
                padding: "14px",
                fontSize: "14px",
                fontWeight: "700",
                background: activeVotes[candidateDates[0]] === 5 ? "var(--color-preferred-bg)" : "var(--bg-card)",
                border: `2px solid ${activeVotes[candidateDates[0]] === 5 ? "var(--color-preferred)" : "var(--border-color)"}`,
                color: activeVotes[candidateDates[0]] === 5 ? "var(--color-preferred)" : "var(--text-secondary)",
              }}
            >
              ✅ Sì, ci sarò!
            </button>
            <button
              type="button"
              onClick={() => handleVoteChange(candidateDates[0], 0)}
              className="btn"
              style={{
                padding: "14px",
                fontSize: "14px",
                fontWeight: "700",
                background: activeVotes[candidateDates[0]] === 0 ? "var(--color-veto-bg)" : "var(--bg-card)",
                border: `2px solid ${activeVotes[candidateDates[0]] === 0 ? "var(--color-veto)" : "var(--border-color)"}`,
                color: activeVotes[candidateDates[0]] === 0 ? "var(--color-veto)" : "var(--text-secondary)",
              }}
            >
              ❌ No, non posso
            </button>
          </div>

          <button
            onClick={handleFinalSubmit}
            className="btn btn-primary"
            style={{ width: "100%", marginTop: "10px", fontSize: "16px" }}
          >
            {isNewRegistration ? "Registrati e Conferma ✔️" : "Salva e Torna Dietro ✔️"}
          </button>
        </div>
      ) : (
        <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "16px", textAlign: "left" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700" }}>Indica le tue disponibilità</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginTop: "2px" }}>
                In quali date ci sei?
              </p>
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              <button type="button" onClick={() => setAllTo(5)} className="btn btn-secondary" style={{ padding: "5px 8px", fontSize: "11px" }}>
                Tutti Sì
              </button>
              <button type="button" onClick={() => setAllTo(0)} className="btn btn-danger" style={{ padding: "5px 8px", fontSize: "11px" }}>
                Tutti No
              </button>
            </div>
          </div>

          {/* Lista Date candidate */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {candidateDates.map((dateStr) => {
              const currentVote = activeVotes[dateStr] !== undefined ? activeVotes[dateStr] : 3;
              const isWknd = isWeekendDay(dateStr);
              const others = getOtherVotesSummary(dateStr);

              return (
                <div
                  key={dateStr}
                  style={{
                    padding: "16px",
                    borderRadius: "var(--radius-md)",
                    background: "var(--bg-inset)",
                    border: "1px solid var(--border-color)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: "15px", textTransform: "capitalize", fontWeight: "700" }}>
                        {formatDateIt(dateStr)}
                      </h4>
                      <span style={{ fontSize: "11px", color: isWknd ? "var(--primary)" : "var(--text-muted)" }}>
                        {isWknd ? "📅 Fine settimana" : "💼 Feriale"}
                      </span>
                    </div>

                    {(others.preferred > 0 || others.available > 0 || others.difficult > 0 || others.veto > 0) && (
                      <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                        Voti altri: {others.preferred > 0 && `🔵Si:${others.preferred} `}{others.available > 0 && `🟢Ok:${others.available} `}{others.difficult > 0 && `🟡Fatica:${others.difficult} `}{others.veto > 0 && `🔴No:${others.veto}`}
                      </div>
                    )}
                  </div>

                  {/* Pulsantiera di voto */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
                    <button
                      type="button"
                      onClick={() => handleVoteChange(dateStr, 5)}
                      className="btn"
                      style={{
                        padding: "8px 4px",
                        fontSize: "11px",
                        background: currentVote === 5 ? "var(--color-preferred-bg)" : "var(--bg-card)",
                        border: `1px solid ${currentVote === 5 ? "var(--color-preferred)" : "var(--border-color)"}`,
                        color: currentVote === 5 ? "var(--color-preferred)" : "var(--text-secondary)",
                        fontWeight: currentVote === 5 ? "bold" : "normal"
                      }}
                    >
                      😊 Sì, alla grande!
                    </button>
                    <button
                      type="button"
                      onClick={() => handleVoteChange(dateStr, 3)}
                      className="btn"
                      style={{
                        padding: "8px 4px",
                        fontSize: "11px",
                        background: currentVote === 3 ? "var(--color-available-bg)" : "var(--bg-card)",
                        border: `1px solid ${currentVote === 3 ? "var(--color-available)" : "var(--border-color)"}`,
                        color: currentVote === 3 ? "var(--color-available)" : "var(--text-secondary)",
                        fontWeight: currentVote === 3 ? "bold" : "normal"
                      }}
                    >
                      🟢 Ok, ci sono
                    </button>
                    <button
                      type="button"
                      onClick={() => handleVoteChange(dateStr, 1)}
                      className="btn"
                      style={{
                        padding: "8px 4px",
                        fontSize: "11px",
                        background: currentVote === 1 ? "var(--color-maybe-bg)" : "var(--bg-card)",
                        border: `1px solid ${currentVote === 1 ? "var(--color-maybe)" : "var(--border-color)"}`,
                        color: currentVote === 1 ? "var(--color-maybe)" : "var(--text-secondary)",
                        fontWeight: currentVote === 1 ? "bold" : "normal"
                      }}
                    >
                      🤔 Con fatica
                    </button>
                    <button
                      type="button"
                      onClick={() => handleVoteChange(dateStr, 0)}
                      className="btn"
                      style={{
                        padding: "8px 4px",
                        fontSize: "11px",
                        background: currentVote === 0 ? "var(--color-veto-bg)" : "var(--bg-card)",
                        border: `1px solid ${currentVote === 0 ? "var(--color-veto)" : "var(--border-color)"}`,
                        color: currentVote === 0 ? "var(--color-veto)" : "var(--text-secondary)",
                        fontWeight: currentVote === 0 ? "bold" : "normal"
                      }}
                    >
                      ❌ No, impossibile
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleFinalSubmit}
            className="btn btn-primary"
            style={{ width: "100%", marginTop: "10px", fontSize: "16px" }}
          >
            {isNewRegistration ? "Registrati e Invia Voti ✔️" : "Salva e Torna Dietro ✔️"}
          </button>
        </div>
      )}

      {/* BACHECA RISORSE & PRENOTAZIONI CONDIVISE */}
      <div className="glass-panel" style={{ textAlign: "left", display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h2 style={{ fontSize: "17px", margin: 0, fontWeight: "700" }}>🔗 Bacheca Risorse & Prenotazioni</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "12px", marginTop: "2px" }}>
              Link utili per il viaggio, alloggi, voli e biglietti condivisi dal gruppo.
            </p>
          </div>
          <button
            onClick={() => setShowAddResourceForm(!showAddResourceForm)}
            className="btn btn-secondary"
            style={{ padding: "5px 12px", fontSize: "11px", background: "rgba(59, 130, 246, 0.08)", border: "1px solid rgba(59, 130, 246, 0.2)", color: "var(--primary)" }}
          >
            {showAddResourceForm ? "Chiudi Form" : "➕ Aggiungi Link"}
          </button>
        </div>

        {/* Form Aggiungi Risorsa */}
        {showAddResourceForm && (
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (!resTitle.trim() || !resUrl.trim()) {
                toast.error("Titolo e URL sono obbligatori!");
                return;
              }
              let formattedUrl = resUrl.trim();
              if (!/^https?:\/\//i.test(formattedUrl)) {
                formattedUrl = "https://" + formattedUrl;
              }
              onAddResource({
                title: resTitle.trim(),
                url: formattedUrl,
                desc: resDesc.trim(),
                category: resCat
              });
              setResTitle("");
              setResUrl("");
              setResDesc("");
              setResCat("altro");
              setShowAddResourceForm(false);
            }}
            style={{
              padding: "14px",
              background: "var(--bg-inset)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-color)",
              display: "flex",
              flexDirection: "column",
              gap: "10px"
            }}
          >
            <h4 style={{ margin: 0, fontSize: "12px", color: "var(--text-primary)" }}>Inserisci una nuova risorsa utile</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: "9px" }}>Titolo Risorsa</label>
                <input
                  type="text"
                  value={resTitle}
                  onChange={(e) => setResTitle(e.target.value)}
                  placeholder="Es. Volo Ryanair, Booking..."
                  required
                  style={{ padding: "6px 10px", fontSize: "12px" }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: "9px" }}>Categoria</label>
                <select
                  value={resCat}
                  onChange={(e) => setResCat(e.target.value)}
                  style={{ padding: "6px 10px", fontSize: "12px" }}
                >
                  <option value="voli">✈️ Voli / Trasporti</option>
                  <option value="alloggio">🏡 Alloggi / Hotel</option>
                  <option value="biglietti">🎟️ Biglietti / Attrazioni</option>
                  <option value="altro">🔗 Altro / Link utile</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: "9px" }}>Link URL</label>
              <input
                type="text"
                value={resUrl}
                onChange={(e) => setResUrl(e.target.value)}
                placeholder="Es. booking.com..."
                required
                style={{ padding: "6px 10px", fontSize: "12px" }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: "9px" }}>Descrizione (opzionale)</label>
              <input
                type="text"
                value={resDesc}
                onChange={(e) => setResDesc(e.target.value)}
                placeholder="Es. Da prenotare prima possibile"
                style={{ padding: "6px 10px", fontSize: "12px" }}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-end", padding: "6px 12px", fontSize: "11px" }}>
              Salva in Bacheca
            </button>
          </form>
        )}

        {/* Filtri Categorie */}
        <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "4px" }}>
          {[
            { id: "all", label: "Tutti" },
            { id: "voli", label: "✈️ Voli / Trasporti" },
            { id: "alloggio", label: "🏡 Alloggi" },
            { id: "biglietti", label: "🎟️ Biglietti" },
            { id: "altro", label: "🔗 Altro" }
          ].map(tab => {
            const isSel = resourceCategoryFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setResourceCategoryFilter(tab.id)}
                className="btn"
                style={{
                  padding: "4px 8px",
                  fontSize: "10px",
                  background: isSel ? "var(--primary)" : "var(--bg-inset)",
                  border: `1px solid ${isSel ? "var(--primary)" : "var(--border-color)"}`,
                  color: isSel ? "white" : "var(--text-secondary)",
                  borderRadius: "99px"
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Elenco delle risorse */}
        <div>
          {/* Risorse Suggerite Dinamicamente in base a eventType (se non ci sono risorse caricate per quella categoria) */}
          {resources.length === 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <p style={{ color: "var(--text-muted)", fontSize: "12px", fontStyle: "italic" }}>
                Nessun link salvato. Scorciatoie per questo ritrovo a <strong>{eventLocation}</strong>:
              </p>
              
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "8px" }}>
                {(eventType === "viaggio" || eventType === "weekend") && (
                  <>
                    <a
                      href="https://www.skyscanner.it"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="result-card"
                      style={{ padding: "8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", background: "var(--bg-inset)", display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}
                    >
                      <span style={{ fontSize: "16px" }}>✈️</span>
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontWeight: "700", fontSize: "11px" }}>Cerca Voli</div>
                        <div style={{ fontSize: "9px", color: "var(--text-secondary)" }}>Skyscanner</div>
                      </div>
                    </a>

                    <a
                      href={`https://www.booking.com/searchresults.html?ss=${encodeURIComponent(eventLocation)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="result-card"
                      style={{ padding: "8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", background: "var(--bg-inset)", display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}
                    >
                      <span style={{ fontSize: "16px" }}>🏨</span>
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontWeight: "700", fontSize: "11px" }}>Hotel a {eventLocation}</div>
                        <div style={{ fontSize: "9px", color: "var(--text-secondary)" }}>Booking.com</div>
                      </div>
                    </a>
                  </>
                )}

                {eventType === "cena" && (
                  <>
                    <a
                      href={`https://www.tripadvisor.it/Search?q=${encodeURIComponent(eventLocation)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="result-card"
                      style={{ padding: "8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", background: "var(--bg-inset)", display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}
                    >
                      <span style={{ fontSize: "16px" }}>🍕</span>
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontWeight: "700", fontSize: "11px" }}>Ristoranti a {eventLocation}</div>
                        <div style={{ fontSize: "9px", color: "var(--text-secondary)" }}>TripAdvisor</div>
                      </div>
                    </a>
                  </>
                )}

                {(eventType === "gita" || eventType === "altro") && (
                  <>
                    <a
                      href={`https://www.ticketone.it/search/?searchterm=${encodeURIComponent(eventCustomLocation || eventLocation)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="result-card"
                      style={{ padding: "8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", background: "var(--bg-inset)", display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}
                    >
                      <span style={{ fontSize: "16px" }}>🎟️</span>
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontWeight: "700", fontSize: "11px" }}>Biglietti TicketOne</div>
                        <div style={{ fontSize: "9px", color: "var(--text-secondary)" }}>TicketOne</div>
                      </div>
                    </a>
                  </>
                )}

                <a
                  href={`https://www.google.it/maps/search/${encodeURIComponent(eventCustomLocation || eventLocation)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="result-card"
                  style={{ padding: "8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", background: "var(--bg-inset)", display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}
                >
                  <span style={{ fontSize: "16px" }}>🗺️</span>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontWeight: "700", fontSize: "11px" }}>Google Maps</div>
                    <div style={{ fontSize: "9px", color: "var(--text-secondary)" }}>Percorso</div>
                  </div>
                </a>
              </div>
            </div>
          )}

          {/* Elenco risorse inserite */}
          {resources.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "10px" }}>
              {resources
                .filter(res => resourceCategoryFilter === "all" || res.category === resourceCategoryFilter)
                .map(res => {
                  let badge = "🔗 Link";
                  let badgeColor = "var(--text-secondary)";
                  let badgeBg = "var(--bg-inset)";

                  if (res.category === "voli") { badge = "✈️ Volo"; badgeColor = "var(--color-preferred)"; badgeBg = "var(--color-preferred-bg)"; }
                  else if (res.category === "alloggio") { badge = "🏡 Alloggio"; badgeColor = "var(--color-available)"; badgeBg = "var(--color-available-bg)"; }
                  else if (res.category === "biglietti") { badge = "🎟️ Biglietto"; badgeColor = "var(--color-maybe)"; badgeBg = "var(--color-maybe-bg)"; }

                  return (
                    <div
                      key={res.id}
                      style={{
                        padding: "10px",
                        borderRadius: "var(--radius-sm)",
                        background: "var(--bg-inset)",
                        border: "1px solid var(--border-color)",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        gap: "8px"
                      }}
                    >
                      <div style={{ textAlign: "left" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "9px", padding: "1px 6px", borderRadius: "99px", fontWeight: "700", color: badgeColor, background: badgeBg }}>
                            {badge}
                          </span>
                          {!isGuestOnlyView && (
                            <button
                              type="button"
                              onClick={() => onDeleteResource(res.id)}
                              style={{ background: "transparent", border: "none", color: "var(--color-veto)", cursor: "pointer", fontSize: "10px" }}
                            >
                              Elimina 🗑️
                            </button>
                          )}
                        </div>
                        <h4 style={{ margin: "4px 0 2px 0", fontSize: "13px", fontWeight: "700" }}>{res.title}</h4>
                        {res.desc && (
                          <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: 0 }}>
                            {res.desc}
                          </p>
                        )}
                      </div>

                      <a
                        href={res.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                        style={{ padding: "4px", fontSize: "10px", width: "100%", textAlign: "center", display: "block" }}
                      >
                        Visita Link ➔
                      </a>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* BACHECA COMMENTI */}
      <div className="glass-panel" style={{ textAlign: "left", display: "flex", flexDirection: "column", gap: "12px" }}>
        <h3 style={{ margin: 0, fontSize: "16px" }}>💬 Bacheca dei Commenti</h3>
        
        <form onSubmit={handlePostComment} style={{ display: "flex", gap: "10px" }}>
          <input
            type="text"
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            placeholder="Scrivi una nota o commento..."
            style={{ padding: "8px 12px", fontSize: "14px", flexGrow: 1 }}
            required
          />
          <button type="submit" className="btn btn-primary" style={{ padding: "8px 16px" }}>
            Invia
          </button>
        </form>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "150px", overflowY: "auto" }}>
          {comments.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "13px", textAlign: "center" }}>Nessun messaggio in bacheca.</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} style={{ padding: "8px", background: "var(--bg-inset)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", fontSize: "13px" }}>
                <strong>{c.author}</strong> <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>({c.timestamp})</span>: {c.text}
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}

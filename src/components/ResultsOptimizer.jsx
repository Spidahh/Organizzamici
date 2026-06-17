import React, { useState, useMemo } from "react";
import { optimizeDates } from "../utils/schedulerAlgorithm";

export default function ResultsOptimizer({
  eventLocation,
  eventCustomLocation,
  candidateDates,
  participants,
  responses,
  comments,
  bedsAvailable,
  onBackToAvailability,
  onReset,
  trackBeds = true,
  eventType,
  collaborativeDestination,
  destinationProposals = [],
  onVoteDestination,
  onAddDestinationProposal,
  onDeleteDestinationProposal,
  resources = [],
  onAddResource,
  onDeleteResource,
  isOrganizer,
  onFinalizeDate
}) {
  const [resourceCategoryFilter, setResourceCategoryFilter] = useState("all");
  const [showAddResourceForm, setShowAddResourceForm] = useState(false);
  const [resTitle, setResTitle] = useState("");
  const [resUrl, setResUrl] = useState("");
  const [resDesc, setResDesc] = useState("");
  const [resCat, setResCat] = useState("altro");

  // Calcola statistiche di carpooling
  const carpoolStats = useMemo(() => {
    let drivers = [];
    let totalSeats = 0;
    let autoPassengers = 0;
    participants.forEach(p => {
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
  }, [participants]);

  // Graduatoria delle proposte di destinazione (Love = 3pt, Like = 1pt, No = -2pt)
  const rankedDestinations = useMemo(() => {
    if (!destinationProposals) return [];
    return [...destinationProposals].map(p => {
      let score = 0;
      let loveCount = 0;
      let likeCount = 0;
      let noCount = 0;
      Object.entries(p.votes || {}).forEach(([user, vote]) => {
        if (vote === "love") { score += 3; loveCount++; }
        else if (vote === "like") { score += 1; likeCount++; }
        else if (vote === "no") { score -= 2; noCount++; }
      });
      return { ...p, score, loveCount, likeCount, noCount };
    }).sort((a, b) => b.score - a.score);
  }, [destinationProposals]);
  // Esegue l'algoritmo di ottimizzazione su tutte le date candidate
  const optimizedList = useMemo(() => {
    return optimizeDates(eventLocation, candidateDates, participants, responses);
  }, [eventLocation, candidateDates, participants, responses]);

  // Confermati presenti / assenti / fatica per data singola fissa
  const confirmedPresent = useMemo(() => {
    return participants.filter(p => {
      const vote = responses[p.name]?.[candidateDates[0]];
      return vote === 5 || vote === 3;
    });
  }, [participants, responses, candidateDates]);

  const confirmedAbsent = useMemo(() => {
    return participants.filter(p => {
      const vote = responses[p.name]?.[candidateDates[0]];
      return vote === 0;
    });
  }, [participants, responses, candidateDates]);

  const confirmedDifficult = useMemo(() => {
    return participants.filter(p => {
      const vote = responses[p.name]?.[candidateDates[0]];
      return vote === 1;
    });
  }, [participants, responses, candidateDates]);

  const pendingConfirmation = useMemo(() => {
    return participants.filter(p => {
      const vote = responses[p.name]?.[candidateDates[0]];
      return vote === undefined;
    });
  }, [participants, responses, candidateDates]);

  // Seleziona la data visualizzata nei dettagli (di default la prima della classifica, se presente)
  const [selectedDate, setSelectedDate] = useState(
    optimizedList.length > 0 ? optimizedList[0].date : null
  );

  // Trova i dettagli della data attualmente selezionata
  const selectedDetails = useMemo(() => {
    if (!selectedDate) return null;
    return optimizedList.find((d) => d.date === selectedDate);
  }, [selectedDate, optimizedList]);

  // Mese ed Anno correnti per la navigazione della mappa di calore (default su giugno 2026 se presente)
  const [currentMonth, setCurrentMonth] = useState(
    candidateDates.length > 0 ? new Date(candidateDates[0]).getMonth() : 5
  );
  const [currentYear, setCurrentYear] = useState(
    candidateDates.length > 0 ? new Date(candidateDates[0]).getFullYear() : 2026
  );

  const monthNames = [
    "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
  ];

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // Formatta la data in italiano
  const formatDateIt = (dateStr) => {
    const options = { weekday: "long", day: "numeric", month: "long", year: "numeric" };
    return new Date(dateStr).toLocaleDateString("it-IT", options);
  };

  // Genera griglia del calendario
  const getDaysInMonth = (year, month) => {
    const date = new Date(year, month, 1);
    const days = [];
    const firstDayIndex = (date.getDay() + 6) % 7; // Lunedì = 0
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ dayNum: null, dateStr: null });
    }
    const lastDay = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= lastDay; d++) {
      const dayStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ dayNum: d, dateStr: dayStr });
    }
    return days;
  };

  const daysOfJuly = getDaysInMonth(currentYear, currentMonth);

  // Mappa dei voti e degli score per il calendario
  const dateScoresMap = useMemo(() => {
    const map = {};
    optimizedList.forEach((item) => {
      map[item.date] = {
        score: item.score,
        isVetoed: item.isVetoed,
        attendingCount: item.attendingCount
      };
    });
    return map;
  }, [optimizedList]);

  // Consigli logistici per la partenza
  const getTravelAdvice = (detailsObj, dateStr) => {
    const time = detailsObj.travelTime;
    const desc = detailsObj.travelDesc;
    const restDays = detailsObj.restDays || [6, 0];
    
    // Controlla se il giorno dell'evento (dateStr) cade nei giorni di riposo di questo specifico invitato
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

  // Copia negli appunti o genera link di convocazione su WhatsApp per la data vincente
  const sendWhatsAppConvocazione = (dateStr) => {
    const formattedDate = formatDateIt(dateStr);
    const locationText = eventCustomLocation || eventLocation;
    const text = `🎉 DATA TROVATA! Ragazzi, l'algoritmo di Organizzamici ha calcolato che la data ottimale per il ritrovo a '${locationText}' è: ${formattedDate}. Prepariamo i biglietti e le ferie!`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  // Verifica se la data selezionata è la migliore in graduatoria
  const isWinnerDate = optimizedList.length > 0 && selectedDate === optimizedList[0].date;

  const isSingleFixedDate = candidateDates.length === 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      
      {/* Intestazione Risultati */}
      <div className="glass-panel" style={{ textAlign: "left", padding: "24px 30px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h1 style={{ fontSize: "28px", marginBottom: "4px", fontWeight: "800" }}>
              {isSingleFixedDate ? "Riepilogo Logistico e Presenze" : "Classifica Date Ottimali"}
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px", margin: 0 }}>
              {isSingleFixedDate 
                ? <>Giorno programmato: <strong style={{ color: "var(--text-primary)" }}>{formatDateIt(candidateDates[0])}</strong></>
                : <>Location: <strong style={{ color: "var(--text-primary)" }}>{eventCustomLocation || eventLocation}</strong> (Logistica riferita a {eventLocation})</>
              }
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={onBackToAvailability} className="btn btn-secondary">
              ← Modifica Disponibilità
            </button>
            <button onClick={onReset} className="btn btn-danger" style={{ padding: "10px 20px" }}>
              Nuovo Evento 🗑️
            </button>
          </div>
        </div>
      </div>

      {optimizedList.length === 0 ? (
        <div className="glass-panel empty-state" style={{ padding: "40px", textAlign: "center" }}>
          <span style={{ fontSize: "48px" }}>📅</span>
          <h3>Nessuna data candidata disponibile</h3>
          <p style={{ color: "var(--text-secondary)" }}>Ritorna alla configurazione per inserire le date dell'evento.</p>
        </div>
      ) : (
        <div className="app-grid app-grid-2cols">
          {isSingleFixedDate ? (
            <>
              {/* Colonna Sinistra: Presenze e Dettagli Logistici */}
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                
                {/* Riepilogo Presenze */}
                <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "16px", textAlign: "left" }}>
                  <div>
                    <h2 style={{ marginBottom: "4px", fontWeight: "700" }}>👥 Stato delle Partecipazioni</h2>
                    <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
                      Chi ha confermato la presenza per il giorno del ritrovo.
                    </p>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ padding: "10px 14px", background: "var(--color-available-bg)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "var(--radius-sm)" }}>
                      <strong style={{ color: "var(--color-available)", fontSize: "14px" }}>🟢 Confermati ({confirmedPresent.length}):</strong>
                      <div style={{ fontSize: "13px", marginTop: "4px", color: "var(--text-primary)" }}>
                        {confirmedPresent.length === 0 ? "Nessuno ancora." : confirmedPresent.map(p => p.name).join(", ")}
                      </div>
                    </div>

                    {confirmedDifficult.length > 0 && (
                      <div style={{ padding: "10px 14px", background: "var(--color-maybe-bg)", border: "1px solid rgba(245, 158, 11, 0.2)", borderRadius: "var(--radius-sm)" }}>
                        <strong style={{ color: "var(--color-maybe)", fontSize: "14px" }}>🟡 Con Fatica ({confirmedDifficult.length}):</strong>
                        <div style={{ fontSize: "13px", marginTop: "4px", color: "var(--text-primary)" }}>
                          {confirmedDifficult.map(p => p.name).join(", ")}
                        </div>
                      </div>
                    )}

                    {confirmedAbsent.length > 0 && (
                      <div style={{ padding: "10px 14px", background: "var(--color-veto-bg)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "var(--radius-sm)" }}>
                        <strong style={{ color: "var(--color-veto)", fontSize: "14px" }}>🔴 Non posso ({confirmedAbsent.length}):</strong>
                        <div style={{ fontSize: "13px", marginTop: "4px", color: "var(--text-primary)" }}>
                          {confirmedAbsent.map(p => p.name).join(", ")}
                        </div>
                      </div>
                    )}

                    {pendingConfirmation.length > 0 && (
                      <div style={{ padding: "10px 14px", background: "var(--color-pending-bg)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}>
                        <strong style={{ color: "var(--text-secondary)", fontSize: "14px" }}>⏳ In attesa di risposta ({pendingConfirmation.length}):</strong>
                        <div style={{ fontSize: "13px", marginTop: "4px", color: "var(--text-muted)" }}>
                          {pendingConfirmation.map(p => p.name).join(", ")}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Dettagli Logistici & Guida alla Partenza */}
                {selectedDetails && (
                  <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "20px", textAlign: "left" }}>
                    <div>
                      <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "800" }}>🚗 Guida alla Partenza per il giorno {formatDateIt(selectedDetails.date)}</h2>
                      <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>
                        Tempi di viaggio ed indicazioni per gli invitati.
                      </p>
                    </div>

                    <button
                      onClick={() => sendWhatsAppConvocazione(selectedDetails.date)}
                      className="btn btn-primary"
                      style={{ fontSize: "14px", width: "100%" }}
                    >
                      💬 Convoca il gruppo su WhatsApp per questo giorno!
                    </button>

                    {trackBeds && selectedDetails.bedsNeededCount > 0 && (
                      <div style={{ padding: "12px 16px", background: "var(--color-preferred-bg)", border: "1px solid rgba(37, 99, 235, 0.2)", borderRadius: "var(--radius-sm)", fontSize: "13px", color: "var(--color-preferred)" }}>
                        🛏️ <strong>Richieste Alloggio:</strong> Per questo giorno, <strong>{selectedDetails.bedsNeededCount} ospiti</strong> richiedono un posto letto: {selectedDetails.details.filter(d => d.needsBed).map(d => d.name).join(", ")}.
                      </div>
                    )}

                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {selectedDetails.details.map((d) => (
                        <div key={d.name} style={{ background: "var(--bg-inset)", padding: "12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: "700" }}>
                            <span>
                              {d.name}{" "}
                              <span style={{ fontWeight: "400", color: "var(--text-secondary)", fontSize: "11px" }}>
                                (da {d.city} • {d.leaveDays > 0 ? `⚠️ Richiede ${d.leaveDays}gg ferie` : "✅ 0gg ferie"})
                              </span>
                            </span>
                            <span style={{ color: "var(--color-available)" }}>{d.travelTime === 0 ? "Locale" : `${d.travelTime}h`}</span>
                          </div>
                          <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
                            {getTravelAdvice(d, selectedDetails.date)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Graduatoria Destinazioni (se collaborativo) */}
                {collaborativeDestination && (
                  <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "16px", textAlign: "left" }}>
                    <div>
                      <h3 style={{ marginBottom: "4px", fontWeight: "700" }}>🗺️ Graduatoria Destinazioni</h3>
                      <p style={{ color: "var(--text-secondary)", fontSize: "12px" }}>
                        Mete proposte votate dal gruppo (Love +3pt, Like +1pt, No -2pt).
                      </p>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {rankedDestinations.length === 0 ? (
                        <p style={{ color: "var(--text-muted)", fontSize: "13px", fontStyle: "italic" }}>
                          Nessuna destinazione proposta.
                        </p>
                      ) : (
                        rankedDestinations.map((dest, idx) => (
                          <div key={dest.id} style={{ padding: "10px 14px", borderRadius: "var(--radius-sm)", background: "var(--bg-inset)", border: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ textAlign: "left" }}>
                              <span style={{ fontSize: "13px", fontWeight: "800", color: "var(--text-muted)", marginRight: "8px" }}>#{idx + 1}</span>
                              <span style={{ fontSize: "14px", fontWeight: "700" }}>{dest.name}</span>
                              <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
                                ❤️ {dest.loveCount} | 👍 {dest.likeCount} | 👎 {dest.noCount}
                              </div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <span style={{ fontSize: "16px", fontWeight: "800", color: "var(--color-available)" }}>{dest.score} pt</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Colonna Destra: Carpooling per la data fissa */}
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "16px", textAlign: "left" }}>
                  <div>
                    <h2 style={{ marginBottom: "4px", fontWeight: "700" }}>🚗 Coordinamento Trasporti</h2>
                    <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
                      Dati di viaggio e disponibilità auto per il carpooling.
                    </p>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div style={{ background: "var(--bg-inset)", padding: "12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", textAlign: "center" }}>
                      <div style={{ fontSize: "20px", fontWeight: "800", color: "var(--color-preferred)" }}>
                        {carpoolStats.drivers.length}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text-secondary)", textTransform: "uppercase", marginTop: "2px" }}>
                        Auto Disponibili
                      </div>
                    </div>
                    <div style={{ background: "var(--bg-inset)", padding: "12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", textAlign: "center" }}>
                      <div style={{ fontSize: "20px", fontWeight: "800", color: carpoolStats.totalSeats >= carpoolStats.autoPassengers ? "var(--color-available)" : "var(--color-veto)" }}>
                        {carpoolStats.totalSeats}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text-secondary)", textTransform: "uppercase", marginTop: "2px" }}>
                        Posti Auto Totali
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "4px" }}>
                    {carpoolStats.drivers.length === 0 ? (
                      <div style={{ padding: "10px", background: "var(--color-veto-bg)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "var(--radius-sm)", fontSize: "12px", color: "var(--color-veto)" }}>
                        ⚠️ <strong>Nessuna auto offerta!</strong> Tutti i partecipanti viaggiano con mezzi pubblici o non hanno registrato una macchina.
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                          <strong>Dettagli Auto dei Driver:</strong>
                          <ul style={{ paddingLeft: "16px", marginTop: "4px", display: "flex", flexDirection: "column", gap: "2px" }}>
                            {carpoolStats.drivers.map(d => (
                              <li key={d.name}>
                                🚗 <strong>{d.name}</strong> da {d.city}: mette a disposizione {d.carSeats} posti passeggeri.
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        {carpoolStats.totalSeats >= carpoolStats.autoPassengers ? (
                          <div style={{ padding: "10px", background: "var(--color-available-bg)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "var(--radius-sm)", fontSize: "12px", color: "var(--color-available)" }}>
                            ✅ <strong>Posti auto sufficienti!</strong> Ci sono {carpoolStats.totalSeats} posti disponibili a fronte di {carpoolStats.autoPassengers} passeggeri.
                          </div>
                        ) : (
                          <div style={{ padding: "10px", background: "var(--color-veto-bg)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "var(--radius-sm)", fontSize: "12px", color: "var(--color-veto)" }}>
                            ⚠️ <strong>Posti auto insufficienti!</strong> Mancano posti auto per {carpoolStats.autoPassengers - carpoolStats.totalSeats} passeggeri. Consigliato noleggiare o invitare altri drivers.
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Colonna Sinistra: Classifica delle Date Ottimali */}
              <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "20px", textAlign: "left" }}>
                <div>
                  <h2 style={{ marginBottom: "6px", fontWeight: "700" }}>Graduatoria Finale</h2>
                  <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
                    Le date sono ordinate per punteggio di compatibilità (presenze + preferenze + coesione - sforzo di viaggio).
                  </p>
                </div>

                <div className="results-list" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {optimizedList.map((item, idx) => {
                    const isSel = selectedDate === item.date;
                    let rankLabel = `#${idx + 1}`;
                    
                    let scoreColor = "#34d399"; 
                    if (item.isVetoed) scoreColor = "#f87171"; 
                    else if (item.score < 50) scoreColor = "#fbbf24"; 

                    return (
                      <div
                        key={item.date}
                        onClick={() => setSelectedDate(item.date)}
                        className={`result-card ${isSel ? "selected" : ""}`}
                        style={{
                          padding: "16px",
                          borderRadius: "var(--radius-md)",
                          background: isSel ? "var(--color-preferred-bg)" : "var(--bg-card)",
                          border: `1px solid ${isSel ? "var(--primary)" : "var(--border-color)"}`,
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          transition: "var(--transition-smooth)"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                          <span style={{ fontSize: "20px", fontWeight: "800", color: isSel ? "var(--primary)" : "var(--text-muted)", width: "30px" }}>{rankLabel}</span>
                          <div>
                            <div style={{ fontWeight: "700", fontSize: "15px", textTransform: "capitalize" }}>
                              {formatDateIt(item.date)}
                            </div>
                            <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
                              👥 <strong>{item.attendingCount}/{item.totalParticipants} presenti</strong>
                              {!item.isVetoed && (
                                <span style={{ display: "block", marginTop: "2px" }}>
                                  Viaggio: {item.avgTravelTime}h {trackBeds && `| Alloggio: ${item.bedsNeededCount} rich.`}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          {item.isVetoed ? (
                            <span style={{ color: "var(--color-veto)", fontWeight: "700", fontSize: "13px", background: "var(--color-veto-bg)", padding: "4px 8px", borderRadius: "4px" }}>VETO</span>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                              <span style={{ color: scoreColor, fontWeight: "800", fontSize: "20px", lineHeight: "1" }}>{item.score}</span>
                              <span style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", marginTop: "2px" }}>Punti</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: "10px", padding: "16px", background: "var(--bg-inset)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)" }}>
                  <h3 style={{ fontSize: "14px", marginBottom: "8px", fontWeight: "700" }}>📊 Come funziona il calcolo:</h3>
                  <ul style={{ fontSize: "12px", color: "var(--text-secondary)", paddingLeft: "16px", display: "flex", flexDirection: "column", gap: "4px" }}>
                    <li><strong>Presenza (50% peso)</strong>: Massimizza il numero di partecipanti.</li>
                    <li><strong>Soddisfazione (35% peso)</strong>: Valuta la comodità (es. preferito = 5pt, con fatica = 1pt).</li>
                    <li><strong>Accordo di Gruppo (15% peso)</strong>: Premia le date in cui il consenso è uniforme, penalizzando le scelte che creano scontenti sbilanciati.</li>
                    <li><strong>Penalità Logistica</strong>: Sottrae punteggio per le ore di viaggio in giorni in cui l'utente lavora (basandosi sul suo calendario turni).</li>
                  </ul>
                </div>

                {collaborativeDestination && (
                  <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid var(--border-color)" }}>
                    <h3 style={{ marginBottom: "6px", fontWeight: "700" }}>🗺️ Graduatoria Destinazioni</h3>
                    <p style={{ color: "var(--text-secondary)", fontSize: "12px", marginBottom: "12px" }}>
                      Le mete proposte votate dal gruppo (Love +3pt, Like +1pt, No -2pt).
                    </p>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {rankedDestinations.length === 0 ? (
                        <p style={{ color: "var(--text-muted)", fontSize: "13px", fontStyle: "italic" }}>
                          Nessuna destinazione proposta.
                        </p>
                      ) : (
                        rankedDestinations.map((dest, idx) => (
                          <div
                            key={dest.id}
                            style={{
                              padding: "10px 14px",
                              borderRadius: "var(--radius-sm)",
                              background: "var(--bg-inset)",
                              border: "1px solid var(--border-color)",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center"
                            }}
                          >
                            <div style={{ textAlign: "left" }}>
                              <span style={{ fontSize: "13px", fontWeight: "800", color: "var(--text-muted)", marginRight: "8px" }}>
                                #{idx + 1}
                              </span>
                              <span style={{ fontSize: "14px", fontWeight: "700" }}>{dest.name}</span>
                              <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
                                ❤️ {dest.loveCount} | 👍 {dest.likeCount} | 👎 {dest.noCount}
                              </div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <span style={{ fontSize: "16px", fontWeight: "800", color: "var(--color-available)" }}>
                                {dest.score} pt
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Colonna Destra: Heatmap Calendario + Dettaglio Risoluzione Logistica */}
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

                {/* Pannello Carpooling & Logistica Auto */}
                <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "16px", textAlign: "left" }}>
                  <div>
                    <h2 style={{ marginBottom: "4px", fontWeight: "700" }}>🚗 Coordinamento Trasporti</h2>
                    <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
                      Dati di viaggio e disponibilità auto per il carpooling.
                    </p>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div style={{ background: "var(--bg-inset)", padding: "12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", textAlign: "center" }}>
                      <div style={{ fontSize: "20px", fontWeight: "800", color: "var(--color-preferred)" }}>
                        {carpoolStats.drivers.length}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text-secondary)", textTransform: "uppercase", marginTop: "2px" }}>
                        Auto Disponibili
                      </div>
                    </div>
                    <div style={{ background: "var(--bg-inset)", padding: "12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", textAlign: "center" }}>
                      <div style={{ fontSize: "20px", fontWeight: "800", color: carpoolStats.totalSeats >= carpoolStats.autoPassengers ? "var(--color-available)" : "var(--color-veto)" }}>
                        {carpoolStats.totalSeats}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text-secondary)", textTransform: "uppercase", marginTop: "2px" }}>
                        Posti Auto Totali
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "4px" }}>
                    {carpoolStats.drivers.length === 0 ? (
                      <div style={{ padding: "10px", background: "var(--color-veto-bg)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "var(--radius-sm)", fontSize: "12px", color: "var(--color-veto)" }}>
                        ⚠️ <strong>Nessuna auto offerta!</strong> Tutti i partecipanti viaggiano con mezzi pubblici o non hanno registrano una macchina.
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                          <strong>Dettagli Auto dei Driver:</strong>
                          <ul style={{ paddingLeft: "16px", marginTop: "4px", display: "flex", flexDirection: "column", gap: "2px" }}>
                            {carpoolStats.drivers.map(d => (
                              <li key={d.name}>
                                🚗 <strong>{d.name}</strong> da {d.city}: mette a disposizione {d.carSeats} posti passeggeri.
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        {carpoolStats.totalSeats >= carpoolStats.autoPassengers ? (
                          <div style={{ padding: "10px", background: "var(--color-available-bg)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "var(--radius-sm)", fontSize: "12px", color: "var(--color-available)" }}>
                            ✅ <strong>Posti auto sufficienti!</strong> Ci sono {carpoolStats.totalSeats} posti disponibili a fronte di {carpoolStats.autoPassengers} passeggeri.
                          </div>
                        ) : (
                          <div style={{ padding: "10px", background: "var(--color-veto-bg)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "var(--radius-sm)", fontSize: "12px", color: "var(--color-veto)" }}>
                            ⚠️ <strong>Posti auto insufficienti!</strong> Mancano posti auto per {carpoolStats.autoPassengers - carpoolStats.totalSeats} passeggeri. Consigliato noleggiare o invitare altri drivers.
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Heatmap del Calendario */}
                <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div style={{ textAlign: "left" }}>
                    <h2 style={{ marginBottom: "6px", fontWeight: "700" }}>Mappa di Calore del Consenso</h2>
                    <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
                      Visualizzazione immediata del consenso del gruppo sul calendario.
                    </p>
                  </div>

                  <div className="calendar-container">
                    <div className="calendar-header-months" style={{ display: "flex", gap: "10px", justifyContent: "space-between", alignItems: "center" }}>
                      <button type="button" onClick={prevMonth} className="btn btn-secondary" style={{ padding: "4px 8px", fontSize: "11px" }}>
                        ◀ Prec
                      </button>
                      <span className="calendar-month-title" style={{ fontSize: "18px", fontWeight: "700" }}>
                        {monthNames[currentMonth]} {currentYear}
                      </span>
                      <button type="button" onClick={nextMonth} className="btn btn-secondary" style={{ padding: "4px 8px", fontSize: "11px" }}>
                        Succ ▶
                      </button>
                    </div>

                    <div className="calendar-grid">
                      {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((d) => (
                        <div className="calendar-day-header" key={d}>
                          {d}
                        </div>
                      ))}

                      {daysOfJuly.map((day, idx) => {
                        if (day.dayNum === null) {
                          return <div key={`empty-${idx}`} className="calendar-cell disabled" />;
                        }

                        const scoreData = dateScoresMap[day.dateStr];
                        const isCandidate = scoreData !== undefined;
                        const isSelected = selectedDate === day.dateStr;

                        let borderStyle = {};
                        let backgroundStyle = {};

                        if (isCandidate) {
                          if (scoreData.isVetoed) {
                            backgroundStyle = { background: "var(--color-veto-bg)" };
                            borderStyle = { borderColor: "rgba(185, 28, 28, 0.2)" };
                          } else if (scoreData.score >= 75) {
                            backgroundStyle = { background: "var(--color-available-bg)" };
                            borderStyle = { borderColor: "rgba(4, 120, 87, 0.2)" };
                          } else if (scoreData.score >= 45) {
                            backgroundStyle = { background: "var(--color-maybe-bg)" };
                            borderStyle = { borderColor: "rgba(180, 83, 9, 0.2)" };
                          } else {
                            backgroundStyle = { background: "var(--bg-main)" };
                            borderStyle = { borderColor: "var(--border-color)" };
                          }
                        }

                        const dateObj = new Date(day.dateStr);
                        const isWknd = dateObj.getDay() === 0 || dateObj.getDay() === 6;

                        return (
                          <div
                            key={day.dateStr}
                            onClick={() => isCandidate && setSelectedDate(day.dateStr)}
                            className={`calendar-cell ${isWknd ? "weekend" : ""} ${!isCandidate ? "disabled" : ""} ${isSelected ? "pref-level-5" : ""}`}
                            style={{
                              cursor: isCandidate ? "pointer" : "not-allowed",
                              ...(!isSelected && isCandidate ? backgroundStyle : {}),
                              ...(!isSelected && isCandidate ? borderStyle : {}),
                              borderWidth: isSelected ? "2px" : "1px",
                              minHeight: "60px"
                            }}
                          >
                            <span className="calendar-cell-num">{day.dayNum}</span>
                            {isCandidate && (
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px" }}>
                                {isSelected ? (
                                  <span style={{ fontSize: "8px", fontWeight: "800", color: "var(--color-preferred)" }}>ATTIVA</span>
                                ) : (
                                  <span
                                    style={{
                                      fontSize: "8px",
                                      fontWeight: "700",
                                      color: scoreData.isVetoed ? "var(--color-veto)" : scoreData.score >= 75 ? "var(--color-available)" : scoreData.score >= 45 ? "var(--color-maybe)" : "var(--text-secondary)"
                                    }}
                                  >
                                    {scoreData.isVetoed ? "VETO" : `${scoreData.score} pt`}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Dettagli della data selezionata */}
                {selectedDetails && (
                  <div 
                    className="glass-panel" 
                    style={{ 
                      display: "flex", 
                      flexDirection: "column", 
                      gap: "20px", 
                      textAlign: "left",
                      border: isWinnerDate ? "1.5px solid rgba(251, 191, 36, 0.4)" : "1px solid var(--border-color)",
                      boxShadow: isWinnerDate ? "0 0 25px rgba(251, 191, 36, 0.15)" : "var(--shadow-premium)"
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
                        <div>
                          {isWinnerDate && !selectedDetails.isVetoed && (
                            <span style={{ fontSize: "10px", background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)", color: "#0c0d14", fontWeight: "800", padding: "2px 8px", borderRadius: "99px", display: "inline-block", marginBottom: "6px" }}>
                              🏆 SCELTA RACCOMANDATA DALL'ALGORITMO
                            </span>
                          )}
                          {collaborativeDestination && rankedDestinations.length > 0 && (
                            <span style={{ fontSize: "10px", background: "linear-gradient(135deg, #3b82f6 0%, #10b981 100%)", color: "white", fontWeight: "800", padding: "2px 8px", borderRadius: "99px", display: "inline-block", marginBottom: "6px", marginLeft: (isWinnerDate && !selectedDetails.isVetoed) ? "6px" : "0" }}>
                              🗺️ META PREFERITA: {rankedDestinations[0].name.toUpperCase()} ({rankedDestinations[0].score} PT)
                            </span>
                          )}
                          <h2 style={{ margin: 0, fontSize: "20px", textTransform: "capitalize", fontWeight: "800" }}>
                            Analisi del {formatDateIt(selectedDetails.date)}
                          </h2>
                        </div>
                        {selectedDetails.isVetoed ? (
                          <span className="badge badge-veto">NON IDONEA</span>
                        ) : (
                          <span className="badge badge-available" style={{ fontWeight: "700" }}>
                            SCORE: {selectedDetails.score}/100
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>
                        Fattori logistici e dettagli di viaggio per questa data.
                      </p>
                    </div>

                    {!selectedDetails.isVetoed && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        <button
                          onClick={() => sendWhatsAppConvocazione(selectedDetails.date)}
                          className="btn btn-primary"
                          style={{ fontSize: "14px", width: "100%" }}
                        >
                          💬 Convoca il gruppo su WhatsApp per questo giorno!
                        </button>
                        {isOrganizer && !isSingleFixedDate && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Sei sicuro di voler fissare definitivamente la data dell'evento per il giorno ${formatDateIt(selectedDetails.date)}? Questo disabiliterà il tabellone di voto e attiverà il riepilogo logistico finalizzato.`)) {
                                onFinalizeDate(selectedDetails.date);
                              }
                            }}
                            className="btn btn-secondary"
                            style={{ fontSize: "14px", width: "100%", background: "var(--color-available-bg)", color: "var(--color-available)", border: "1px solid rgba(16, 185, 129, 0.3)" }}
                          >
                            🎯 Fissa questa data come definitiva
                          </button>
                        )}
                      </div>
                    )}

                    {!selectedDetails.isVetoed && trackBeds && selectedDetails.bedsNeededCount > 0 && (
                      <div style={{ padding: "12px 16px", background: "var(--color-preferred-bg)", border: "1px solid rgba(37, 99, 235, 0.2)", borderRadius: "var(--radius-sm)", fontSize: "13px", color: "var(--color-preferred)" }}>
                        🛏️ <strong>Richieste Alloggio:</strong> Per questa data, <strong>{selectedDetails.bedsNeededCount} ospiti</strong> richiedono alloggio: {selectedDetails.details.filter(d => d.needsBed).map(d => d.name).join(", ")}.
                      </div>
                    )}

                    {!selectedDetails.isVetoed && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div style={{ padding: "8px 12px", background: "var(--color-preferred-bg)", border: "1px solid rgba(37, 99, 235, 0.2)", borderRadius: "var(--radius-sm)", fontSize: "13px" }}>
                          🤝 <strong>Coesione di Gruppo: {selectedDetails.cohesionIndex}/100</strong>
                          <span style={{ fontSize: "11px", color: "var(--text-secondary)", display: "block", marginTop: "2px" }}>
                            {selectedDetails.cohesionIndex >= 80 
                              ? "La data piace in modo uniforme. Ottimo per mantenere tutti felici." 
                              : "I voti sono polarizzati: alcuni faranno grossi sacrifici."}
                          </span>
                        </div>

                        <div style={{ padding: "8px 12px", background: "var(--bg-inset)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", fontSize: "13px" }}>
                          ⚖️ <strong>Equità Viaggio:</strong> {selectedDetails.travelBalanceDesc}
                        </div>
                      </div>
                    )}

                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {selectedDetails.reasons.map((r, i) => (
                        <div
                          key={i}
                          style={{
                            padding: "8px 12px",
                            background: "var(--bg-inset)",
                            border: "1px solid var(--border-color)",
                            borderRadius: "var(--radius-sm)",
                            fontSize: "13px"
                          }}
                        >
                          {r}
                        </div>
                      ))}
                    </div>

                    {!selectedDetails.isVetoed && (
                      <div>
                        <h3 style={{ fontSize: "13px", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "12px", borderBottom: "1px solid var(--border-color)", paddingBottom: "6px", fontWeight: "700" }}>
                          🚗 Guida alla Partenza degli Invitati:
                        </h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          {selectedDetails.details.map((d) => (
                            <div key={d.name} style={{ background: "var(--bg-inset)", padding: "12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: "700" }}>
                                <span>
                                  {d.name}{" "}
                                  <span style={{ fontWeight: "400", color: "var(--text-secondary)", fontSize: "11px" }}>
                                    (da {d.city} • {d.leaveDays > 0 ? `⚠️ Richiede ${d.leaveDays}gg ferie` : "✅ 0gg ferie"})
                                  </span>
                                </span>
                                <span style={{ color: "var(--color-available)" }}>{d.travelTime === 0 ? "Locale" : `${d.travelTime}h`}</span>
                              </div>
                              <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
                                {getTravelAdvice(d, selectedDetails.date)}
                              </p>
                              {trackBeds && (
                                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                                  🛏️ Posto Letto: <strong>{d.needsBed ? "Richiesto 🛏️" : "Nessuna richiesta"}</strong>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <h3 style={{ fontSize: "13px", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "12px", borderBottom: "1px solid var(--border-color)", paddingBottom: "6px", fontWeight: "700" }}>
                        Voti singoli:
                      </h3>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {selectedDetails.details.map((d) => {
                          let prefLabel = "Impossibile (Veto)";
                          let bgStyle = { background: "var(--color-veto-bg)", color: "var(--color-veto)", border: "1px solid rgba(239, 68, 68, 0.2)" };
                          
                          if (d.preference === 5) {
                            prefLabel = "Sì, alla grande!";
                            bgStyle = { background: "var(--color-preferred-bg)", color: "var(--color-preferred)", border: "1px solid rgba(37, 99, 235, 0.2)" };
                          } else if (d.preference === 3) {
                            prefLabel = "Ok, ci sono";
                            bgStyle = { background: "var(--color-available-bg)", color: "var(--color-available)", border: "1px solid rgba(16, 185, 129, 0.2)" };
                          } else if (d.preference === 1) {
                            prefLabel = "Con fatica";
                            bgStyle = { background: "var(--color-maybe-bg)", color: "var(--color-maybe)", border: "1px solid rgba(217, 119, 6, 0.2)" };
                          }

                          return (
                            <div
                              key={d.name}
                              style={{
                                display: "flex",
                                justifySpaceBetween: "space-between",
                                alignItems: "center",
                                padding: "8px 12px",
                                background: "var(--bg-inset)",
                                borderRadius: "var(--radius-sm)",
                                borderLeft: `3px solid ${
                                  d.preference === 5 ? "var(--color-preferred)" : 
                                  d.preference === 3 ? "var(--color-available)" : 
                                  d.preference === 1 ? "var(--color-maybe)" : 
                                  "var(--color-veto)"
                                }`
                              }}
                            >
                              <span style={{ fontSize: "14px", fontWeight: "600" }}>{d.name}</span>
                              <span style={{ fontSize: "12px", padding: "4px 10px", borderRadius: "99px", fontWeight: "600", ...bgStyle }}>
                                {prefLabel}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* BACHECA RISORSE & PRENOTAZIONI CONDIVISE */}
      <div className="glass-panel" style={{ textAlign: "left", display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h2 style={{ fontSize: "18px", margin: 0, fontWeight: "700" }}>🔗 Bacheca Risorse & Prenotazioni</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginTop: "2px" }}>
              Link utili per il viaggio, alloggi, voli e biglietti condivisi dal gruppo.
            </p>
          </div>
          <button
            onClick={() => setShowAddResourceForm(!showAddResourceForm)}
            className="btn btn-secondary"
            style={{ padding: "6px 14px", fontSize: "12px", background: "rgba(59, 130, 246, 0.08)", border: "1px solid rgba(59, 130, 246, 0.2)", color: "var(--primary)" }}
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
                alert("Titolo e URL sono obbligatori!");
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
              padding: "16px",
              background: "var(--bg-inset)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-color)",
              display: "flex",
              flexDirection: "column",
              gap: "12px"
            }}
          >
            <h4 style={{ margin: 0, fontSize: "13px", color: "var(--text-primary)" }}>Inserisci una nuova risorsa utile</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: "10px" }}>Titolo Risorsa</label>
                <input
                  type="text"
                  value={resTitle}
                  onChange={(e) => setResTitle(e.target.value)}
                  placeholder="Es. Prenotazione Airbnb, Volo Ryanair..."
                  required
                  style={{ padding: "8px 12px", fontSize: "13px" }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: "10px" }}>Categoria</label>
                <select
                  value={resCat}
                  onChange={(e) => setResCat(e.target.value)}
                  style={{ padding: "8px 12px", fontSize: "13px" }}
                >
                  <option value="voli">✈️ Voli / Trasporti</option>
                  <option value="alloggio">🏡 Alloggi / Hotel</option>
                  <option value="biglietti">🎟️ Biglietti / Attrazioni</option>
                  <option value="altro">🔗 Altro / Link utile</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: "10px" }}>Link URL</label>
              <input
                type="text"
                value={resUrl}
                onChange={(e) => setResUrl(e.target.value)}
                placeholder="Es. www.airbnb.it/rooms/12345 o booking.com..."
                required
                style={{ padding: "8px 12px", fontSize: "13px" }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: "10px" }}>Descrizione (opzionale)</label>
              <input
                type="text"
                value={resDesc}
                onChange={(e) => setResDesc(e.target.value)}
                placeholder="Es. Da prenotare entro fine mese, costa 45 euro a notte"
                style={{ padding: "8px 12px", fontSize: "13px" }}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-end", padding: "8px 16px", fontSize: "12px" }}>
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
                  padding: "4px 10px",
                  fontSize: "11px",
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
          {/* Sezione Risorse Suggerite Dinamicamente in base a eventType (se non ci sono risorse caricate per quella categoria) */}
          {resources.length === 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <p style={{ color: "var(--text-muted)", fontSize: "13px", fontStyle: "italic" }}>
                Nessun link salvato in bacheca. Ecco alcune scorciatoie di ricerca per questo evento a <strong>{eventLocation}</strong>:
              </p>
              
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginTop: "4px" }}>
                {(eventType === "viaggio" || eventType === "weekend") && (
                  <>
                    <a
                      href="https://www.skyscanner.it"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="result-card"
                      style={{ padding: "12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", background: "var(--bg-inset)", display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}
                    >
                      <span style={{ fontSize: "20px" }}>✈️</span>
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontWeight: "700", fontSize: "12px" }}>Cerca Voli</div>
                        <div style={{ fontSize: "10px", color: "var(--text-secondary)" }}>Skyscanner.it</div>
                      </div>
                    </a>

                    <a
                      href={`https://www.booking.com/searchresults.html?ss=${encodeURIComponent(eventLocation)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="result-card"
                      style={{ padding: "12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", background: "var(--bg-inset)", display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}
                    >
                      <span style={{ fontSize: "20px" }}>🏨</span>
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontWeight: "700", fontSize: "12px" }}>Cerca Alloggi a {eventLocation}</div>
                        <div style={{ fontSize: "10px", color: "var(--text-secondary)" }}>Booking.com</div>
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
                      style={{ padding: "12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", background: "var(--bg-inset)", display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}
                    >
                      <span style={{ fontSize: "20px" }}>🍕</span>
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontWeight: "700", fontSize: "12px" }}>Ristoranti a {eventLocation}</div>
                        <div style={{ fontSize: "10px", color: "var(--text-secondary)" }}>TripAdvisor</div>
                      </div>
                    </a>

                    <a
                      href={`https://www.thefork.it/search?city=${encodeURIComponent(eventLocation)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="result-card"
                      style={{ padding: "12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", background: "var(--bg-inset)", display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}
                    >
                      <span style={{ fontSize: "20px" }}>🍷</span>
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontWeight: "700", fontSize: "12px" }}>Prenota su TheFork</div>
                        <div style={{ fontSize: "10px", color: "var(--text-secondary)" }}>TheFork.it</div>
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
                      style={{ padding: "12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", background: "var(--bg-inset)", display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}
                    >
                      <span style={{ fontSize: "20px" }}>🎟️</span>
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontWeight: "700", fontSize: "12px" }}>Biglietti e Concerti</div>
                        <div style={{ fontSize: "10px", color: "var(--text-secondary)" }}>TicketOne.it</div>
                      </div>
                    </a>
                  </>
                )}

                <a
                  href={`https://www.google.it/maps/search/${encodeURIComponent(eventCustomLocation || eventLocation)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="result-card"
                  style={{ padding: "12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", background: "var(--bg-inset)", display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}
                >
                  <span style={{ fontSize: "20px" }}>🗺️</span>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontWeight: "700", fontSize: "12px" }}>Mappa e Indicazioni</div>
                    <div style={{ fontSize: "10px", color: "var(--text-secondary)" }}>Google Maps</div>
                  </div>
                </a>
              </div>
            </div>
          )}

          {/* Elenco risorse inserite */}
          {resources.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
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
                        padding: "14px",
                        borderRadius: "var(--radius-md)",
                        background: "var(--bg-inset)",
                        border: "1px solid var(--border-color)",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        gap: "10px"
                      }}
                    >
                      <div style={{ textAlign: "left" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "99px", fontWeight: "700", color: badgeColor, background: badgeBg }}>
                            {badge}
                          </span>
                          <button
                            type="button"
                            onClick={() => onDeleteResource(res.id)}
                            style={{ background: "transparent", border: "none", color: "var(--color-veto)", cursor: "pointer", fontSize: "11px" }}
                          >
                            Elimina 🗑️
                          </button>
                        </div>
                        <h4 style={{ margin: "8px 0 2px 0", fontSize: "14px", fontWeight: "700" }}>{res.title}</h4>
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
                        style={{ padding: "6px", fontSize: "11px", width: "100%", textAlign: "center", display: "block" }}
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

      {/* RIEPILOGO DEI COMMENTI IN BACHECA IN BASSO AI RISULTATI */}
      <div className="glass-panel" style={{ textAlign: "left", display: "flex", flexDirection: "column", gap: "12px" }}>
        <h2 style={{ fontSize: "18px", margin: 0, fontWeight: "700" }}>💬 Nota di coordinamento della Bacheca ({comments.length})</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "200px", overflowY: "auto" }}>
          {comments.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>Nessun commento inserito dagli invitati.</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} style={{ fontSize: "13px", padding: "6px 10px", background: "var(--bg-inset)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}>
                <strong>{c.author}</strong> <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>({c.timestamp})</span>: {c.text}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

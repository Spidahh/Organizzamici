import React, { useState } from "react";
import { CITIES } from "../utils/geoData";
import { toast } from "../ui";

export default function EventCreator({ step, initialData, onNext, onPrev }) {
  const [eventType, setEventType] = useState(initialData?.eventType || "weekend");
  const [trackBeds, setTrackBeds] = useState(initialData?.trackBeds !== undefined ? initialData?.trackBeds : true);
  const [collaborativeDestination, setCollaborativeDestination] = useState(
    initialData?.collaborativeDestination || false
  );

  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [customLocation, setCustomLocation] = useState(initialData?.customLocation || "");
  const [location, setLocation] = useState(initialData?.location || "Firenze");
  const [bedsAvailable, setBedsAvailable] = useState(initialData?.bedsAvailable || 4);
  
  // Date candidate selezionate (salvate in formato AAAA-MM-GG)
  const [selectedDates, setSelectedDates] = useState(initialData?.selectedDates || []);
  const [dateMode, setDateMode] = useState(initialData?.selectedDates?.length === 1 ? "fissa" : "voto");
  const [fixedDate, setFixedDate] = useState(initialData?.selectedDates?.length === 1 ? initialData.selectedDates[0] : "");

  // Mese/Anno di navigazione calendario (Default a Giugno 2026 per allineamento demo)
  const [currentMonth, setCurrentMonth] = useState(5); // Giugno
  const [currentYear, setCurrentYear] = useState(2026);

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

  const calendarDays = getDaysInMonth(currentYear, currentMonth);

  const toggleDate = (dateStr) => {
    if (!dateStr) return;
    if (selectedDates.includes(dateStr)) {
      setSelectedDates(selectedDates.filter((d) => d !== dateStr));
    } else {
      setSelectedDates([...selectedDates, dateStr].sort());
    }
  };

  const handleNextStep = (e) => {
    e.preventDefault();
    if (step === 1) {
      if (dateMode === "fissa") {
        if (!fixedDate) {
          toast.error("Seleziona la data dell'evento!");
          return;
        }
        onNext({ 
          eventType, 
          trackBeds, 
          title, 
          description, 
          customLocation, 
          location, 
          collaborativeDestination,
          bedsAvailable: trackBeds ? bedsAvailable : 0,
          selectedDates: [fixedDate],
          participants: initialData?.participants || []
        });
      } else {
        onNext({ 
          eventType, 
          trackBeds, 
          title, 
          description, 
          customLocation, 
          location, 
          collaborativeDestination,
          bedsAvailable: trackBeds ? bedsAvailable : 0 
        });
      }
    } else if (step === 2) {
      if (selectedDates.length === 0) {
        toast.error("Seleziona almeno una data sul calendario!");
        return;
      }
      onNext({ selectedDates, participants: initialData?.participants || [] });
    }
  };

  const formatDateIt = (dateStr) => {
    const options = { weekday: "short", day: "numeric", month: "short" };
    return new Date(dateStr).toLocaleDateString("it-IT", options);
  };

  return (
    <div className="glass-panel" style={{ maxWidth: "600px", margin: "0 auto", width: "100%", textAlign: "left" }}>
      
      {/* STEP 1: DETTAGLI EVENTO */}
      {step === 1 && (
        <form onSubmit={handleNextStep} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "24px" }}>Passo 1: Cosa stai organizzando?</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "4px" }}>
              Compila le informazioni generali del ritrovo.
            </p>
          </div>

          <div className="form-group">
            <label>Tipo di Evento</label>
            <select 
              value={eventType} 
              onChange={(e) => {
                const val = e.target.value;
                setEventType(val);
                if (val === "cena" || val === "gita") {
                  setTrackBeds(false);
                } else if (val === "weekend") {
                  setTrackBeds(true);
                }
              }}
            >
              <option value="cena">🍽️ Cena / Aperitivo / Serata (No alloggio)</option>
              <option value="gita">🚗 Gita in Giornata (No alloggio)</option>
              <option value="weekend">🏡 Weekend fuori / Soggiorno (Gestisci letti/camere)</option>
              <option value="viaggio">✈️ Viaggio / Vacanza (Pernottamento autonomo o condiviso)</option>
              <option value="altro">👥 Ritrovo Generico</option>
            </select>
          </div>

          <div className="form-group">
            <label>Pianificazione Date</label>
            <select
              value={dateMode}
              onChange={(e) => setDateMode(e.target.value)}
            >
              <option value="voto">🗓️ Date da votare nel gruppo (Più date candidate)</option>
              <option value="fissa">📅 Data fissa già stabilita (Una data specifica)</option>
            </select>
          </div>

          {dateMode === "fissa" && (
            <div className="form-group">
              <label>Data dell'Evento</label>
              <input
                type="date"
                value={fixedDate}
                onChange={(e) => setFixedDate(e.target.value)}
                required
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-primary)",
                  padding: "10px 14px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "14px",
                  width: "100%"
                }}
              />
            </div>
          )}

          <div className="form-group">
            <label>Titolo del Ritrovo</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Es. Vacanza al mare, Aperitivo di gruppo, Gita in montagna"
              required
            />
          </div>

          <div className="form-group">
            <label>Descrizione / Dettagli per gli amici</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Scrivi qui i dettagli importanti (es. programma, cosa portare...)"
              rows="3"
            />
          </div>

          <div className="form-group">
            <label>Nome Location / Destinazione</label>
            <input
              type="text"
              value={customLocation}
              onChange={(e) => setCustomLocation(e.target.value)}
              placeholder="Es. Casa di Marco, Londra Centro, Ristorante da Mario"
              required
            />
          </div>

          <div className="form-group">
            <label>Città di Riferimento Logistico</label>
            <select value={location} onChange={(e) => setLocation(e.target.value)}>
              {Object.keys(CITIES).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {(eventType === "viaggio" || eventType === "altro") && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.02)", padding: "10px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
              <input
                type="checkbox"
                id="track-beds-chk"
                checked={trackBeds}
                onChange={(e) => setTrackBeds(e.target.checked)}
                style={{ width: "16px", height: "16px", cursor: "pointer" }}
              />
              <label htmlFor="track-beds-chk" style={{ cursor: "pointer", fontSize: "13px", textTransform: "none", margin: 0 }}>
                Gestisci la capienza dei posti letto condivisi
              </label>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--bg-inset)", padding: "10px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
            <input
              type="checkbox"
              id="collab-dest-chk"
              checked={collaborativeDestination}
              onChange={(e) => {
                setCollaborativeDestination(e.target.checked);
                if (e.target.checked) {
                  setCustomLocation("Destinazione da decidere insieme 🗺️");
                } else {
                  setCustomLocation(initialData?.customLocation || "");
                }
              }}
              style={{ width: "16px", height: "16px", cursor: "pointer" }}
            />
            <label htmlFor="collab-dest-chk" style={{ cursor: "pointer", fontSize: "13px", textTransform: "none", margin: 0 }}>
              <strong>Destinazione Collaborativa:</strong> Decidiamo e votiamo la destinazione insieme al gruppo 🗺️
            </label>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-color)", paddingTop: "20px", marginTop: "10px" }}>
            <button type="button" onClick={onPrev} className="btn btn-secondary">
              ← Annulla
            </button>
            <button type="submit" className="btn btn-primary" style={{ padding: "12px 28px" }}>
              Continua ➔
            </button>
          </div>
        </form>
      )}

      {/* STEP 2: SELEZIONE DATE LIBERA SUL CALENDARIO */}
      {step === 2 && (
        <form onSubmit={handleNextStep} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "24px" }}>Passo 2: In quali date proponi il ritrovo?</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "4px" }}>
              Clicca sui giorni del calendario per selezionare liberamente le date da proporre.
            </p>
          </div>

          <div className="calendar-container" style={{ background: "var(--bg-inset)", padding: "16px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
            <div className="calendar-header-months" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <button type="button" onClick={prevMonth} className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: "12px" }}>
                ◀ Prec
              </button>
              <span className="calendar-month-title" style={{ fontSize: "18px", fontWeight: "700" }}>
                {monthNames[currentMonth]} {currentYear}
              </span>
              <button type="button" onClick={nextMonth} className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: "12px" }}>
                Succ ▶
              </button>
            </div>

            <div className="calendar-grid">
              {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((d) => (
                <div className="calendar-day-header" key={d}>{d}</div>
              ))}

              {calendarDays.map((day, idx) => {
                if (day.dayNum === null) {
                  return <div key={`empty-${idx}`} className="calendar-cell disabled" />;
                }

                const isSelected = selectedDates.includes(day.dateStr);
                const isWknd = new Date(day.dateStr).getDay() === 0 || new Date(day.dateStr).getDay() === 6;

                return (
                  <div
                    key={day.dateStr}
                    onClick={() => toggleDate(day.dateStr)}
                    className={`calendar-cell ${isWknd ? "weekend" : ""} ${isSelected ? "pref-level-5" : ""}`}
                    style={{ minHeight: "55px", padding: "4px", cursor: "pointer" }}
                  >
                    <span className="calendar-cell-num">{day.dayNum}</span>
                    {isSelected && (
                      <span style={{ fontSize: "8px", fontWeight: "800", color: "white", background: "var(--primary)", padding: "1px 3px", borderRadius: "3px", alignSelf: "flex-end" }}>
                        PROPOSTA
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ fontSize: "13px", color: "var(--text-secondary)", background: "var(--bg-inset)", padding: "12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
            <strong>Date candidate proposte:</strong> {selectedDates.length === 0 ? "Nessuna data. Clicca sui giorni del calendario per selezionare." : selectedDates.map(d => formatDateIt(d)).join(", ")}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-color)", paddingTop: "20px", marginTop: "10px" }}>
            <button type="button" onClick={onPrev} className="btn btn-secondary">
              ← Indietro
            </button>
            <button type="submit" className="btn btn-primary" style={{ padding: "12px 28px" }}>
              Crea Evento ➔
            </button>
          </div>
        </form>
      )}

    </div>
  );
}

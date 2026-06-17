import { estimateTravelTime } from "./geoData";

/**
 * Calcola il giorno della settimana (0 = Domenica, 6 = Sabato)
 */
function getDayOfWeek(dateStr) {
  const date = new Date(dateStr);
  return date.getDay();
}

/**
 * Calcola i giorni di ferie richiesti basandosi sul calendario di lavoro
 * PERSONALIZZATO di ciascun ospite.
 * 
 * @param {string} dateStr - Data dell'evento (AAAA-MM-GG)
 * @param {number} travelTime - Tempo di viaggio stimato in ore
 * @param {Array<number>} restDays - Giorni di riposo settimanali dell'ospite (0 = Dom, 6 = Sab)
 */
export function calculateLeaveDays(dateStr, travelTime, restDays = [6, 0]) {
  if (travelTime === 0) return 0;
  const dateObj = new Date(dateStr);
  const day = dateObj.getDay(); // 0 = Dom, 1 = Lun, ..., 6 = Sab
  
  const isRestDay = restDays.includes(day);

  if (isRestDay) {
    // Il giorno dell'evento è un giorno di riposo per questo amico
    return travelTime > 6.5 ? 1 : 0; // Solo viaggi lunghissimi/estero richiedono ferie
  } else {
    // Il giorno dell'evento è un giorno lavorativo per questo amico
    if (travelTime <= 2) return 0.5; // Può partire dopo il lavoro prendendo solo mezza giornata
    if (travelTime <= 5) return 1;   // Richiede un giorno intero
    return 1.5;                      // Viaggio lungo: richiede andata e riposo
  }
}

/**
 * Calcola la varianza dei voti per determinare l'indice di coesione/accordo.
 * Evita situazioni polarizzate (metà gruppo felicissimo, metà scontento).
 */
function calculateCohesionIndex(preferences) {
  if (preferences.length <= 1) return 100;
  const mean = preferences.reduce((a, b) => a + b, 0) / preferences.length;
  const variance = preferences.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / preferences.length;
  
  // Più la varianza è bassa, più c'è coesione.
  // Massimo scarto teorico di varianza con voti da 0 a 5 è circa 6.25.
  // Trasformiamo in un indice da 0 (polarizzato) a 100 (accordo unanime)
  const score = 100 - (variance / 6.25) * 100;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Algoritmo principale per calcolare l'ottimizzazione delle date
 */
export function optimizeDates(eventLocation, candidateDates, participants, responses) {
  if (!candidateDates || candidateDates.length === 0 || !participants || participants.length === 0) {
    return [];
  }

  const results = candidateDates.map((dateStr) => {
    let isVetoed = false;
    let attendingCount = 0;
    let totalUtility = 0;
    const activePreferences = [];
    
    const individualDetails = [];
    let totalTravelTime = 0;
    let travelPenalties = 0;
    let totalLeaveDays = 0;
    let bedsNeededCount = 0;

    participants.forEach((p) => {
      const pref = responses[p.name]?.[dateStr] !== undefined ? responses[p.name][dateStr] : 3; // default 3 = Disponibile
      
      const isAttending = pref > 0;
      if (isAttending) {
        attendingCount++;
        totalUtility += pref;
        activePreferences.push(pref);
        
        // Controlla se ha bisogno di un letto (default true per chi viene da fuori, impostabile dal guest)
        const needsBed = p.needsBed !== undefined ? p.needsBed : (p.city !== eventLocation);
        if (needsBed) {
          bedsNeededCount++;
        }
      }

      if (p.isEssential && pref === 0) {
        isVetoed = true;
      }

      const travel = estimateTravelTime(p.city, eventLocation, p.transportMode || "auto");
      
      // Usa i giorni di riposo dell'utente (standard [6,0] = sab/dom)
      const guestRestDays = p.restDays || [6, 0];
      const leaveDays = isAttending ? calculateLeaveDays(dateStr, travel.time, guestRestDays) : 0;
      
      if (isAttending) {
        totalTravelTime += travel.time;
        totalLeaveDays += leaveDays;
        
        const dateObj = new Date(dateStr);
        const day = dateObj.getDay();
        const isRestDay = guestRestDays.includes(day);

        // Penalità di viaggio personalizzata in base all'orario lavorativo dell'utente
        let penalty = 0;
        if (travel.time > 1) {
          if (!isRestDay) {
            penalty = travel.time * 2.8 + leaveDays * 18; // penalità pesante se lavora quel giorno
          } else {
            penalty = travel.time * 0.8 + leaveDays * 5;  // penalità leggera se è a riposo
          }
        }
        travelPenalties += penalty;
      }

      individualDetails.push({
        name: p.name,
        city: p.city,
        preference: pref,
        travelTime: travel.time,
        travelDesc: travel.desc,
        leaveDays,
        restDays: guestRestDays,
        needsBed: p.needsBed !== undefined ? p.needsBed : (p.city !== eventLocation),
        isAttending
      });
    });

    const attendanceRate = attendingCount / participants.length;
    const maxPossibleUtility = participants.length * 5;
    const utilityRate = totalUtility / maxPossibleUtility;

    // Calcolo Coesione Sociale (Accordo omogeneo)
    const cohesionIndex = calculateCohesionIndex(activePreferences);

    // Punteggio base (0-100) basato su presenze, utilità e coesione
    let baseScore = (attendanceRate * 50) + (utilityRate * 35) + ((cohesionIndex / 100) * 15);
    const avgTravelPenalty = participants.length > 0 ? (travelPenalties / participants.length) : 0;
    
    let finalScore = baseScore - avgTravelPenalty;

    if (isVetoed || attendingCount === 0) {
      finalScore = 0;
    }

    finalScore = Math.max(0, Math.min(100, Math.round(finalScore)));

    // Motivazioni intelligenti dettagliate
    const reasons = [];
    if (isVetoed) {
      reasons.push("🔴 ESCLUSA: Un partecipante essenziale ha inserito un veto.");
    } else {
      if (attendingCount === participants.length) {
        reasons.push("🟢 Presenza massima: 100% degli invitati presenti.");
      } else if (attendanceRate >= 0.75) {
        reasons.push(`🟢 Alta partecipazione: ${attendingCount} su ${participants.length} presenti.`);
      }

      if (cohesionIndex >= 85) {
        reasons.push("🤝 Alto accordo di gruppo: la data piace in modo uniforme a tutti, senza scontenti.");
      } else if (cohesionIndex < 50 && attendingCount > 2) {
        reasons.push("⚠️ Data polarizzata: piace molto ad alcuni ma costringe altri a grossi sacrifici.");
      }

      // Evidenzia chi deve prendere più ferie
      const highLeaveUsers = individualDetails.filter(d => d.isAttending && d.leaveDays >= 1);
      if (highLeaveUsers.length > 0) {
        const names = highLeaveUsers.map(t => `${t.name} (${t.leaveDays}gg)`).join(", ");
        reasons.push(`⚠️ Ferie necessarie per: ${names}.`);
      }
      
      // Controlla se qualcuno lavora durante il weekend standard ma è libero qui
      const shiftWorkersFree = individualDetails.filter(d => d.isAttending && !d.restDays.includes(6) && new Date(dateStr).getDay() === 6);
      if (shiftWorkersFree.length > 0) {
        // ad es. chi lavora di sabato ma in questa data ha ferie o riposo
      }
    }

    // Calcolo bilancio/equità del viaggio
    const travelTimesList = individualDetails.filter(d => d.isAttending).map(d => d.travelTime);
    let travelBalanceDesc = "Sforzo bilanciato.";
    if (travelTimesList.length > 0) {
      const maxTravel = Math.max(...travelTimesList);
      const minTravel = Math.min(...travelTimesList);
      if (maxTravel - minTravel > 4.5) {
        const longestTraveler = individualDetails.find(d => d.travelTime === maxTravel)?.name || "";
        travelBalanceDesc = `⚠️ Sforzo sbilanciato: ${longestTraveler} deve viaggiare per ${maxTravel} ore, mentre altri sono locali.`;
      } else {
        travelBalanceDesc = "🟢 Sforzo distribuito equamente nel gruppo.";
      }
    }

    return {
      date: dateStr,
      score: finalScore,
      attendingCount,
      totalParticipants: participants.length,
      attendanceRate,
      totalUtility,
      isVetoed,
      reasons,
      cohesionIndex,
      bedsNeededCount,
      avgTravelTime: attendingCount > 0 ? Math.round((totalTravelTime / attendingCount) * 10) / 10 : 0,
      totalLeaveDays: Math.round(totalLeaveDays * 10) / 10,
      travelBalanceDesc,
      details: individualDetails
    };
  });

  return results.sort((a, b) => b.score - a.score);
}

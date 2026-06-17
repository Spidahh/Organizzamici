import { estimateTravelTime } from "./geoData";

const norm = (s) => (s || "").trim().toLowerCase();

/**
 * Giorni di ferie necessari, in base al calendario di lavoro dell'ospite.
 * @param {string} dateStr  Data evento (AAAA-MM-GG)
 * @param {number} travelTime  Ore di viaggio stimate
 * @param {Array<number>} restDays  Giorni di riposo (0=Dom ... 6=Sab)
 */
export function calculateLeaveDays(dateStr, travelTime, restDays = [6, 0]) {
  if (!travelTime || travelTime === 0) return 0;
  const day = new Date(dateStr).getDay();
  const isRestDay = restDays.includes(day);

  if (isRestDay) {
    // Giorno di riposo: solo viaggi lunghissimi richiedono ferie
    return travelTime > 6.5 ? 1 : 0;
  }
  // Giorno lavorativo
  if (travelTime <= 2) return 0.5; // mezza giornata
  if (travelTime <= 5) return 1;
  return 1.5;
}

/**
 * Indice di coesione (0-100): quanto è uniforme l'entusiasmo del gruppo.
 * Bassa varianza dei voti = alto accordo.
 */
function calculateCohesionIndex(preferences) {
  if (preferences.length <= 1) return 100;
  const mean = preferences.reduce((a, b) => a + b, 0) / preferences.length;
  const variance = preferences.reduce((a, b) => a + (b - mean) ** 2, 0) / preferences.length;
  const score = 100 - (variance / 6.25) * 100; // 6.25 = varianza max teorica (voti 0-5)
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Ottimizzazione delle date candidate.
 * Chi non ha ancora votato è "in attesa": NON viene contato come presente
 * (così il punteggio riflette le disponibilità reali, non presunte).
 */
export function optimizeDates(eventLocation, candidateDates, participants, responses) {
  if (!candidateDates || candidateDates.length === 0 || !participants || participants.length === 0) {
    return [];
  }

  const results = candidateDates.map((dateStr) => {
    const day = new Date(dateStr).getDay();

    let isVetoed = false;
    let attendingCount = 0;
    let pendingCount = 0;
    let totalUtility = 0;
    let totalTravelTime = 0;
    let travelPenalties = 0;
    let totalLeaveDays = 0;
    let bedsNeededCount = 0;
    const activePreferences = [];
    const pendingNames = [];
    const essentialPending = [];
    const individualDetails = [];

    participants.forEach((p) => {
      const raw = responses[p.name]?.[dateStr];
      const hasVoted = raw !== undefined && raw !== null;
      const pref = hasVoted ? raw : null;
      const isAttending = hasVoted && pref > 0;
      const isLocal = norm(p.city) === norm(eventLocation);

      const travel = estimateTravelTime(p.city, eventLocation, p.transportMode || "auto");
      const restDays = p.restDays || [6, 0];
      const leaveDays = isAttending ? calculateLeaveDays(dateStr, travel.time, restDays) : 0;
      const needsBed = p.needsBed !== undefined ? p.needsBed : (!isLocal && travel.time > 0);

      // Veto solo se un essenziale ha votato esplicitamente "non posso"
      if (p.isEssential && hasVoted && pref === 0) isVetoed = true;

      if (!hasVoted) {
        pendingCount++;
        pendingNames.push(p.name);
        if (p.isEssential) essentialPending.push(p.name);
      } else if (isAttending) {
        attendingCount++;
        totalUtility += pref;
        activePreferences.push(pref);
        if (needsBed) bedsNeededCount++;

        totalTravelTime += travel.time;
        totalLeaveDays += leaveDays;

        const isRestDay = restDays.includes(day);
        let penalty = 0;
        if (travel.time > 1) {
          penalty = isRestDay
            ? travel.time * 0.8 + leaveDays * 5    // a riposo: viaggio leggero
            : travel.time * 2.8 + leaveDays * 18;  // lavora quel giorno: pesante
        }
        travelPenalties += penalty;
      }

      individualDetails.push({
        name: p.name,
        city: p.city,
        preference: pref,
        hasVoted,
        isAttending,
        isLocal,
        transportMode: p.transportMode || null,
        hasCar: !!p.hasCar,
        carSeats: p.carSeats || 0,
        travelTime: travel.time,
        travelDesc: travel.desc,
        leaveDays,
        restDays,
        needsBed,
      });
    });

    const invited = participants.length;
    const attendanceRate = invited > 0 ? attendingCount / invited : 0;
    const maxUtility = invited * 5;
    const utilityRate = maxUtility > 0 ? totalUtility / maxUtility : 0;
    const cohesionIndex = calculateCohesionIndex(activePreferences);

    const baseScore = attendanceRate * 50 + utilityRate * 35 + (cohesionIndex / 100) * 15;
    const avgTravelPenalty = attendingCount > 0 ? travelPenalties / attendingCount : 0;
    let finalScore = baseScore - avgTravelPenalty;
    if (isVetoed || attendingCount === 0) finalScore = 0;
    finalScore = Math.max(0, Math.min(100, Math.round(finalScore)));

    const reasons = [];
    if (isVetoed) {
      reasons.push("🔴 ESCLUSA: un partecipante essenziale non può in questa data.");
    } else {
      if (attendingCount === invited) {
        reasons.push("🟢 Presenza massima: tutti gli invitati possono.");
      } else if (attendanceRate >= 0.75) {
        reasons.push(`🟢 Alta partecipazione: ${attendingCount} su ${invited} possono.`);
      }
      if (cohesionIndex >= 85 && attendingCount > 1) {
        reasons.push("🤝 Accordo uniforme: la data piace a tutti senza scontenti.");
      } else if (cohesionIndex < 50 && attendingCount > 2) {
        reasons.push("⚠️ Data polarizzata: entusiasma alcuni ma è un sacrificio per altri.");
      }
      const highLeave = individualDetails.filter((d) => d.isAttending && d.leaveDays >= 1);
      if (highLeave.length > 0) {
        reasons.push(`⚠️ Ferie necessarie: ${highLeave.map((t) => `${t.name} (${t.leaveDays}gg)`).join(", ")}.`);
      }
      if (essentialPending.length > 0) {
        reasons.push(`⏳ Manca il voto di chi è indispensabile: ${essentialPending.join(", ")}.`);
      } else if (pendingCount > 0) {
        reasons.push(`⏳ In attesa di ${pendingCount} ${pendingCount === 1 ? "voto" : "voti"}.`);
      }
    }

    // Equità dello sforzo di viaggio (solo tra chi viaggia davvero)
    const travelTimes = individualDetails.filter((d) => d.isAttending && d.travelTime > 0).map((d) => d.travelTime);
    let travelBalanceDesc = travelTimes.length === 0 ? "🟢 Tutti vicini o già sul posto." : "🟢 Sforzo di viaggio distribuito.";
    if (travelTimes.length > 0) {
      const maxT = Math.max(...travelTimes);
      const minT = Math.min(...travelTimes);
      if (maxT - minT > 4.5) {
        const who = individualDetails.find((d) => d.travelTime === maxT)?.name || "";
        travelBalanceDesc = `⚠️ Sforzo sbilanciato: ${who} viaggia ~${maxT}h, gli altri molto meno.`;
      }
    }

    return {
      date: dateStr,
      score: finalScore,
      attendingCount,
      pendingCount,
      pendingNames,
      totalParticipants: invited,
      attendanceRate,
      totalUtility,
      isVetoed,
      reasons,
      cohesionIndex,
      bedsNeededCount,
      avgTravelTime: attendingCount > 0 ? Math.round((totalTravelTime / attendingCount) * 10) / 10 : 0,
      totalLeaveDays: Math.round(totalLeaveDays * 10) / 10,
      travelBalanceDesc,
      details: individualDetails,
    };
  });

  return results.sort((a, b) => b.score - a.score);
}

/**
 * Logica carpooling CONDIVISA e coerente in tutta l'app.
 * L'auto compare SOLO quando serve davvero: si considerano unicamente i
 * partecipanti presenti che si spostano in auto e non sono già sul posto.
 *
 * - driver  : va in auto, ha l'auto e offre posti (carSeats > 0)
 * - rider   : va in auto ma senza auto propria → gli serve un passaggio
 * Chi va in treno/aereo o è locale NON entra nel carpooling.
 */
export function computeCarpool(participants, responses, dateStr, eventLocation) {
  const relevant = (participants || []).filter((p) => {
    // se c'è una data, considera solo chi è presente quel giorno
    if (dateStr && responses) {
      const v = responses[p.name]?.[dateStr];
      if (!(v > 0)) return false;
    }
    // i locali (stessa città dell'evento) sono già sul posto: niente carpooling
    if (eventLocation && norm(p.city) === norm(eventLocation)) return false;
    return true;
  });

  const drivers = [];
  const riders = [];
  let totalSeats = 0;

  relevant.forEach((p) => {
    if (p.transportMode !== "auto") return; // solo chi si muove in auto
    if (p.hasCar && (p.carSeats || 0) > 0) {
      drivers.push(p);
      totalSeats += p.carSeats || 0;
    } else if (p.hasCar) {
      drivers.push(p); // ha l'auto ma 0 posti dichiarati
    } else {
      riders.push(p); // gli serve un passaggio
    }
  });

  const relevantToCar = drivers.length > 0 || riders.length > 0;
  return {
    drivers,
    riders,
    totalSeats,
    ridersCount: riders.length,
    enoughSeats: totalSeats >= riders.length,
    relevant: relevantToCar, // se false, NON mostrare la sezione auto
  };
}

/**
 * Consiglio di viaggio per una persona, inquadrato sul MEZZO REALE che usa
 * (non si assume mai l'auto). Per l'aereo/treno cita il tragitto locale.
 * @param {object} d  oggetto details (travelTime, travelDesc, transportMode, restDays, isLocal)
 * @param {string} dateStr  data dell'evento
 */
export function getTravelAdvice(d, dateStr) {
  const t = d.travelTime;
  if (!t || t === 0 || d.isLocal) {
    return "📍 Già sul posto: nessun viaggio necessario.";
  }
  const restDays = d.restDays || [6, 0];
  const isRest = restDays.includes(new Date(dateStr).getDay());
  const desc = (d.travelDesc || "").toLowerCase();
  const isFlight = d.transportMode === "aereo" || desc.includes("volo");
  const isTrain = d.transportMode === "treno" || desc.includes("treno");

  if (isFlight) {
    const base = `✈️ Volo (~${t}h inclusi i controlli). Raggiungi l'aeroporto in auto o coi mezzi.`;
    return isRest
      ? `${base} Sei a riposo: conviene partire la sera prima.`
      : `${base} Giorno lavorativo: metti in conto ~1 giorno di ferie.`;
  }
  if (isTrain) {
    const hs = desc.includes("alta velocità");
    const base = hs ? `🚄 Treno Alta Velocità (~${t}h).` : `🚆 Treno (~${t}h).`;
    return isRest
      ? `${base} Sei a riposo: 0 ferie, parti la mattina.`
      : `${base} Giorno lavorativo: mezza/una giornata di ferie.`;
  }
  // Auto
  if (t > 4.5) {
    return isRest
      ? `🚗 Auto (~${t}h, viaggio lungo). A riposo: meglio partire il pomeriggio prima.`
      : `🚗 Auto (~${t}h, viaggio lungo). Giorno lavorativo: serve ~1 giorno di ferie.`;
  }
  return isRest
    ? `🚗 Auto (~${t}h). A riposo: parti la mattina, arrivi per pranzo.`
    : `🚗 Auto (~${t}h). Giorno lavorativo: serve mezza giornata di ferie.`;
}

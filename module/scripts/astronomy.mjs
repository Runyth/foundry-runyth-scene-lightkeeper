// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import {
  IMPERIAL_WATCHES,
  MOON_PHASES,
  SEASON_PROFILES,
  SEASONS
} from "./constants.mjs";

export function clamp(value, min, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return min;
  return Math.min(max, Math.max(min, numeric));
}

export function round(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function normalizeMinutes(value) {
  const minutes = Math.round(Number(value) || 0);
  return ((minutes % 1440) + 1440) % 1440;
}

export function formatClock(minutes) {
  const safe = normalizeMinutes(minutes);
  const hours = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${String(hours).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export function moonIllumination(index) {
  const phase = MOON_PHASES[clamp(Math.round(index), 0, MOON_PHASES.length - 1)];
  return phase?.illumination ?? 0;
}

export function seasonForOrdinaryMonth(month) {
  const safe = clamp(Math.round(month), 1, 12);
  if (safe === 12 || safe <= 2) return "winter";
  if (safe <= 5) return "spring";
  if (safe <= 8) return "summer";
  return "autumn";
}

export function seasonForImperialMonth(month) {
  const safe = clamp(Math.round(month), 1, 33);
  if (safe <= 8) return "winter";
  if (safe <= 16) return "spring";
  if (safe <= 24) return "summer";
  return "autumn";
}

export function getSeasonProfile(season) {
  return SEASON_PROFILES[SEASONS.includes(season) ? season : "spring"];
}

export function phaseToMinutes(phase, season) {
  const p = clamp(phase, 0, 100) / 100;
  const { sunrise, sunset } = getSeasonProfile(season);
  const morningEnd = Math.min(sunrise + 180, 720);
  const eveningEnd = Math.min(sunset + 180, 1439);

  if (p <= 0.2) return Math.round(sunrise + (morningEnd - sunrise) * (p / 0.2));
  if (p <= 0.55) return Math.round(morningEnd + (720 - morningEnd) * ((p - 0.2) / 0.35));
  if (p <= 0.78) return Math.round(720 + (sunset - 720) * ((p - 0.55) / 0.23));
  return Math.round(sunset + (eveningEnd - sunset) * ((p - 0.78) / 0.22));
}

function twilightDarkness(minutes, sunrise, sunset) {
  const dawnStart = sunrise - 90;
  const dawnEnd = sunrise + 45;
  const duskStart = sunset - 45;
  const duskEnd = sunset + 90;

  if (minutes >= dawnEnd && minutes <= duskStart) {
    const noonDistance = Math.abs(minutes - 720) / Math.max(1, (sunset - sunrise) / 2);
    return clamp(0.02 + noonDistance * 0.06, 0.02, 0.1);
  }

  if (minutes >= dawnStart && minutes < dawnEnd) {
    const progress = (minutes - dawnStart) / (dawnEnd - dawnStart);
    return 0.92 - (0.84 * progress);
  }

  if (minutes > duskStart && minutes <= duskEnd) {
    const progress = (minutes - duskStart) / (duskEnd - duskStart);
    return 0.08 + (0.84 * progress);
  }

  return 0.92;
}

export function darknessForClock(minutes, {
  season = "spring",
  moonIndex = 0,
  seasonalEnabled = true
} = {}) {
  const safeMinutes = normalizeMinutes(minutes);
  const profile = seasonalEnabled ? getSeasonProfile(season) : getSeasonProfile("spring");
  const darkness = twilightDarkness(safeMinutes, profile.sunrise, profile.sunset);
  const isNight = safeMinutes < profile.sunrise - 45 || safeMinutes > profile.sunset + 45;
  const moonReduction = isNight ? moonIllumination(moonIndex) * 0.24 : 0;
  return round(clamp(darkness - moonReduction, 0, 1));
}

export function darknessForFeel(feel) {
  return round(clamp(feel, 0, 100) / 100);
}

export function imperialBellToMinutes(bell) {
  const safe = clamp(Math.round(bell), 1, 33);
  return Math.round(((safe - 0.5) / 33) * 1440);
}

export function minutesToImperialBell(minutes) {
  const safe = normalizeMinutes(minutes);
  return clamp(Math.floor((safe / 1440) * 33) + 1, 1, 33);
}

export function imperialWatchForBell(bell) {
  const safe = clamp(Math.round(bell), 1, 33);
  const watch = IMPERIAL_WATCHES.find((candidate) => safe >= candidate.first && safe <= candidate.last)
    ?? IMPERIAL_WATCHES[0];
  return {
    ...watch,
    bellInWatch: safe - watch.first + 1
  };
}

export function imperialUmgangForDay(day) {
  const safe = clamp(Math.round(day), 1, 33);
  return {
    umgang: Math.floor((safe - 1) / 11) + 1,
    dayInUmgang: ((safe - 1) % 11) + 1
  };
}

export function descriptiveBand(darkness) {
  const value = clamp(darkness, 0, 1);
  if (value <= 0.08) return "bright";
  if (value <= 0.28) return "daylight";
  if (value <= 0.5) return "twilight";
  if (value <= 0.72) return "dim";
  if (value <= 0.9) return "night";
  return "pitch";
}

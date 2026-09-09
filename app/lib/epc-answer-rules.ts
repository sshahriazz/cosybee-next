/**
 * Cross-answer plausibility rules for the refine flow — the web half of
 * mobile's `lib/features/epc/domain/epc_answer_rules.dart`.
 *
 * Answers in that flow are not independent: what a home *is* — its type and
 * its age — determines what is physically possible for the questions that
 * follow. Without these rules a resident can describe a home that cannot
 * exist, and the estimate that comes back is nonsense they can't diagnose.
 *
 * Two strengths, and the distinction is the whole design:
 *
 *   • the `*BlockReason` functions — the combination is **impossible**. The
 *     option is disabled and cannot be chosen. Reserved for cases with no
 *     genuine exception: a boiler cannot predate the house it heats.
 *   • the `*WarnReason` functions — the combination is **improbable but
 *     real**. The resident confirms and continues. UK housing stock has
 *     exceptions everywhere, so rejecting on statistical grounds alone
 *     would lock out real homes.
 *
 * ### Two things that are easy to get wrong
 *
 * **Blocks do not run during onboarding.** Only in the refine flow. Every
 * answer but the era is a server-side default there, not something the
 * resident asserted — validating them once rejected every "2003 or later"
 * signup, and told people their windows were wrong when they had never been
 * asked about windows.
 *
 * **Only the blocks are mirrored server-side**, by
 * `findImplausibleCombination()` in eb-auth's `epc-estimator.engine.ts`.
 * That guards the API; this guards the UI. The warnings are advisory and
 * client-only, so dropping them here drops them entirely.
 *
 * Grounded in UK EPC (RdSAP) conventions, Building Regulations Part L and
 * English Housing Survey 2018-19 floor areas. Full derivation lives in the
 * mobile repo's `docs/epc-refine-question-dependencies.md`.
 */

import type {
  BuiltForm,
  ConstructionEra,
  GlazingType,
  HeatingType,
  HotWater,
  LoftInsulation,
  PropertyType,
  WallInsulation,
} from "./epc-field-options";

// ── Shared predicates ────────────────────────────────────────────────────

/**
 * Flats and maisonettes. RdSAP makes no calculation distinction between
 * them, and treats the ceiling of a dwelling with another above it as
 * "another dwelling above" — no roof of its own to assess.
 */
export function hasNoOwnRoof(
  propertyType: PropertyType | null | undefined,
): boolean {
  return propertyType === "flat" || propertyType === "maisonette";
}

function isNewBuild(era: ConstructionEra | null | undefined): boolean {
  return era === "2003_onwards";
}

/**
 * What to call this home in copy addressed to the resident.
 *
 * Every rule keyed on {@link hasNoOwnRoof} covers maisonettes as well as
 * flats, but the messages used to hard-code "flat" — so a maisonette owner
 * was told their home was something it isn't. Use their own property type.
 */
function dwellingNoun(propertyType: PropertyType | null | undefined): string {
  return propertyType === "maisonette" ? "maisonette" : "flat";
}

// ── Blocks — impossible combinations ─────────────────────────────────────

/**
 * Why [glazing] cannot be chosen given [era], or null if it can.
 */
export function glazingBlockReason(
  era: ConstructionEra | null | undefined,
  glazing: GlazingType,
): string | null {
  if (isNewBuild(era) && glazing === "single") {
    return "Single glazing was not allowed in new homes after 1994, so a home built in 2003 or later cannot have been built with it.";
  }
  return null;
}

/**
 * Why [heating] cannot be chosen given [era], or null if it can.
 */
export function heatingBlockReason(
  era: ConstructionEra | null | undefined,
  heating: HeatingType,
): string | null {
  if (isNewBuild(era) && heating === "old_boiler") {
    // Cites the era the resident actually picked. Older copy said "built
    // after 2000" — a date taken from the OPTION label ("pre-2000 boiler")
    // rather than from their answer, so it read as if we had misheard them.
    //
    // It also claimed a boiler "cannot be older than the house", which is
    // untrue: salvaged and relocated boilers exist. The conflict is between
    // two answers, not a law of physics, so say that instead.
    return "You told us your home was built in 2003 or later — a pre-2000 boiler would be older than the house itself.";
  }
  return null;
}

/**
 * Why [loft] cannot be chosen given [propertyType], or null if it can.
 *
 * In practice the option is withheld before it can be picked (see
 * `loftOptionsFor`), so this is the backstop for a saved answer that
 * contradicts a property type changed later in the same session.
 */
export function loftBlockReason(
  propertyType: PropertyType | null | undefined,
  loft: LoftInsulation,
): string | null {
  if (loft === "dwelling_above" && propertyType != null && !hasNoOwnRoof(propertyType)) {
    return "A house is the whole building — nothing sits above it.";
  }
  return null;
}

// ── Warnings — improbable but possible ───────────────────────────────────

/** Why [wall] is unusual for [era], or null if it is unremarkable. */
export function wallWarnReason(
  era: ConstructionEra | null | undefined,
  wall: WallInsulation,
): string | null {
  const uninsulated = wall === "none_cavity" || wall === "none_solid";
  if (isNewBuild(era) && uninsulated) {
    return "Wall insulation has been required in new homes since 1995, so a home built after 2003 is very unlikely to be uninsulated.";
  }
  const isSolid = wall === "none_solid" || wall === "solid_insulated";
  const isCavity = wall === "none_cavity" || wall === "cavity_filled";
  if (era === "pre_1930" && isCavity) {
    return "Homes built before 1930 were usually built with solid walls — cavity walls only became common from the 1930s.";
  }
  if (
    isSolid &&
    (era === "1967_1982" || era === "1983_2002" || era === "2003_onwards")
  ) {
    return "Solid wall construction had largely stopped by the time your home was built.";
  }
  return null;
}

/** Why [loft] is unusual for [era], or null. */
export function loftWarnReason(
  era: ConstructionEra | null | undefined,
  loft: LoftInsulation,
): string | null {
  if (isNewBuild(era) && (loft === "none" || loft === "partial")) {
    return "Substantial loft insulation has been required in new homes since 2002, so a home built after 2003 is unlikely to have little or none.";
  }
  return null;
}

/** Why [heating] is unusual for [propertyType], or null. */
export function heatingWarnReason(
  propertyType: PropertyType | null | undefined,
  heating: HeatingType,
): string | null {
  if (!hasNoOwnRoof(propertyType)) return null;
  const noun = dwellingNoun(propertyType);
  if (heating === "oil_boiler") {
    return `Oil heating needs an outdoor storage tank, which ${noun}s almost never have.`;
  }
  if (heating === "lpg_boiler") {
    return `LPG heating needs tank storage, which ${noun}s almost never have.`;
  }
  if (heating === "heat_pump" && propertyType === "flat") {
    return "A heat pump needs an outdoor unit and permission to fit it, which is uncommon for a flat.";
  }
  return null;
}

/**
 * Why [hotWater] is unusual given the heating and era answers, or null.
 *
 * A warning, never a block. Both cases have genuine exceptions: a heat pump
 * can be paired with a separate instantaneous water heater, and a new-build
 * flat can legitimately be immersion-only.
 */
export function hotWaterWarnReason(
  heating: HeatingType | null | undefined,
  era: ConstructionEra | null | undefined,
  hotWater: HotWater,
): string | null {
  // A heat pump cannot run a combi system — it works at too low a flow
  // temperature to heat water on demand, so it needs a stored cylinder.
  // This contradicts an answer already given, which makes it the stronger
  // of the two checks.
  if (heating === "heat_pump" && hotWater === "combi") {
    return "Heat pumps run at too low a temperature to heat water on demand, so they normally need a hot water cylinder.";
  }
  if (isNewBuild(era) && hotWater === "immersion") {
    return "Immersion heaters as the only source of hot water are unusual in a home built in 2003 or later.";
  }
  return null;
}

/**
 * Why answering "yes" to solar is unusual, or null.
 *
 * [loftIsNotApplicable] is true once the resident has told us another
 * dwelling sits above them — claiming panels then contradicts an answer
 * they have already given, which is the strongest check in the flow.
 */
export function solarWarnReason(
  propertyType: PropertyType | null | undefined,
  options: { hasSolar: boolean; loftIsNotApplicable: boolean },
): string | null {
  if (!options.hasSolar) return null;
  if (options.loftIsNotApplicable) {
    return "You told us there is another home above yours, so the roof is not yours to fit panels on.";
  }
  if (hasNoOwnRoof(propertyType)) {
    return "The roof of a block of flats is usually communal, so residents rarely own panels on it.";
  }
  return null;
}

/** Why selecting "detached" is unusual for [propertyType], or null. */
export function builtFormWarnReason(
  propertyType: PropertyType | null | undefined,
  builtForm: BuiltForm,
): string | null {
  if (builtForm === "detached" && hasNoOwnRoof(propertyType)) {
    return `A ${dwellingNoun(propertyType)} is not itself detached, though the building it sits in may be.`;
  }
  return null;
}

// ── Floor area ───────────────────────────────────────────────────────────

export interface Range {
  readonly min: number;
  readonly max: number;
}

/**
 * Plausible floor-area span in m², from English Housing Survey 2018-19
 * averages (detached 149, semi 97, terraced 88, bungalow 77, purpose-built
 * flat 58, converted flat 65).
 *
 * Deliberately much wider than those averages — this catches a slipped
 * decimal or a mistyped digit, not an unusually large home.
 */
export function floorAreaRange(
  propertyType: PropertyType | null | undefined,
  builtForm: BuiltForm | null | undefined,
): Range {
  if (hasNoOwnRoof(propertyType)) return { min: 20, max: 150 };
  if (propertyType === "bungalow") return { min: 40, max: 200 };
  if (builtForm === "detached") return { min: 70, max: 400 };
  if (builtForm === "semi_detached") return { min: 50, max: 250 };
  if (builtForm === "mid_terrace" || builtForm === "end_terrace") {
    return { min: 40, max: 220 };
  }
  return { min: 40, max: 400 }; // unknown form — widest house span
}

/** Why [area] looks wrong for this property, or null. */
export function floorAreaWarnReason(
  propertyType: PropertyType | null | undefined,
  builtForm: BuiltForm | null | undefined,
  area: number,
): string | null {
  const range = floorAreaRange(propertyType, builtForm);
  if (area >= range.min && area <= range.max) return null;
  const label = hasNoOwnRoof(propertyType) ? "flats" : "homes like yours";
  return `Most ${label} are between ${range.min} and ${range.max} m². Is that right?`;
}

// ── Bedrooms ─────────────────────────────────────────────────────────────

/**
 * Plausible **total floor area** in m² for a home with [bedrooms] bedrooms.
 *
 * Total floor area, not bedroom space. The two are far apart — bedrooms are
 * only about a third of a UK home, the rest being kitchen, bathrooms,
 * circulation and living rooms — which is why this compares whole-home
 * figures rather than dividing by bedroom count. A per-bedroom average
 * would have to assume what share is bedroom, and that share swings from
 * nearly all of a studio to under 30% of a large detached house.
 *
 * Ranges widen with each bedroom but do not scale linearly: kitchen,
 * bathroom and hallway are largely fixed costs that a one-bed carries in
 * full. A flat per-bedroom threshold missed that and flagged ordinary small
 * flats — the English Housing Survey mean for a converted flat is 65 m²,
 * which a 60 m²-per-bedroom limit rejects outright.
 */
export function areaRangeForBedrooms(bedrooms: number): Range {
  switch (bedrooms) {
    case 1:
      return { min: 30, max: 90 };
    case 2:
      return { min: 45, max: 130 };
    case 3:
      return { min: 60, max: 180 };
    case 4:
      return { min: 80, max: 250 };
    default:
      return { min: 100, max: 400 };
  }
}

/**
 * Why [bedrooms] looks inconsistent with the floor area, or null.
 *
 * The only check comparing two answers against each other, so it catches a
 * mistyped floor area after the fact — from either direction, since the
 * resident may equally have mistyped the bedroom count.
 */
export function bedroomsWarnReason(input: {
  bedrooms: number;
  area: number | null | undefined;
  propertyType?: PropertyType | null | undefined;
}): string | null {
  const { bedrooms, area, propertyType } = input;
  if (bedrooms <= 0) return null;
  if (hasNoOwnRoof(propertyType) && bedrooms >= 6) {
    return "Six or more bedrooms is unusual for a flat.";
  }
  if (area === null || area === undefined) return null;

  const range = areaRangeForBedrooms(bedrooms);
  if (area >= range.min && area <= range.max) return null;

  // No formatting helper here, unlike mobile: Dart's `double` stringifies
  // 85 as "85.0" and needs the trailing zero trimmed, while JS numbers
  // already render whole values without it. Fractions survive either way —
  // the field accepts one decimal place.
  return `Most ${bedrooms}-bedroom homes are between ${range.min} and ${range.max} m². Your floor area is ${area} m² — worth double-checking.`;
}

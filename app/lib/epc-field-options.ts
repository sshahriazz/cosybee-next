/**
 * Option lists for the synthetic-EPC questions — the web half of mobile's
 * `lib/features/epc/domain/epc_field_options.dart`.
 *
 * Values are the API enums the backend validates against; labels are the
 * copy shown to the resident. Both are copied from mobile verbatim: the two
 * clients talk to the same eb-auth backend, so wording that drifts between
 * them is exactly what confuses a user who switches device mid-signup. That
 * includes the punctuation — the en dashes and em dash below are the ones
 * mobile ships.
 *
 * Single source of truth for both flows that ask these questions:
 *
 *   • **Onboarding** asks one — construction era. Everything else is filled
 *     server-side from era-typical values.
 *   • **Refine** asks all {@link REFINE_STEP_COUNT}.
 *
 * The flow is specified in the mobile repo's `docs/no-epc-flow.md` (branch
 * `phase1-v2`). Worth reading before changing anything here: several of
 * these options carry constraints not visible from the enum alone, and the
 * cross-answer rules live next door in `epc-answer-rules.ts`.
 */

// ── API value types ──────────────────────────────────────────────────────
// Literal unions rather than bare `string`, so a typo in a rule or a step
// is a compile error instead of an answer that silently never matches.

export type PropertyType = "house" | "flat" | "bungalow" | "maisonette";

export type BuiltForm =
  | "detached"
  | "semi_detached"
  | "mid_terrace"
  | "end_terrace";

export type ConstructionEra =
  | "pre_1930"
  | "1930_1966"
  | "1967_1982"
  | "1983_2002"
  | "2003_onwards";

export type WallInsulation =
  | "none_cavity"
  | "none_solid"
  | "cavity_filled"
  | "solid_insulated";

export type LoftInsulation =
  | "none"
  | "partial"
  | "well_insulated"
  | "dwelling_above";

export type GlazingType = "single" | "double" | "triple";

export type HeatingType =
  | "old_boiler"
  | "modern_condensing_boiler"
  | "heat_pump"
  | "electric_heaters"
  | "oil_boiler"
  | "lpg_boiler";

export type HotWater = "combi" | "cylinder" | "immersion";

export interface EpcOption<T extends string = string> {
  /** Enum value the backend validates. Never shown to the user. */
  readonly value: T;
  /** Copy shown to the resident. */
  readonly label: string;
}

/**
 * Questions in the refine flow, for copy that advertises the count.
 *
 * Shared so the prompt that promises a number and the flow that renders it
 * can't disagree — on mobile they drifted once already, when the flow grew
 * from 8 questions to 10 and the copy kept saying "8".
 */
export const REFINE_STEP_COUNT = 11;

// ── The building ─────────────────────────────────────────────────────────

export const PROPERTY_TYPES: readonly EpcOption<PropertyType>[] = [
  { value: "house", label: "House" },
  { value: "flat", label: "Flat / apartment" },
  { value: "bungalow", label: "Bungalow" },
  { value: "maisonette", label: "Maisonette" },
];

export const BUILT_FORMS: readonly EpcOption<BuiltForm>[] = [
  { value: "detached", label: "Detached" },
  { value: "semi_detached", label: "Semi-detached" },
  { value: "mid_terrace", label: "Mid-terrace" },
  { value: "end_terrace", label: "End-terrace" },
];

/**
 * When the home was built.
 *
 * The only question onboarding asks, and the only one the backend requires,
 * because it is what the estimator keys off to fill in the eight answers the
 * resident was never asked — walls, loft, glazing and heating all get
 * era-typical values server-side.
 *
 * Five buckets, not ten: the scale is ours rather than inherited, and the
 * spread it produces (−12 to +15 points) is documented as the estimator's
 * largest known source of error. Don't add granularity here expecting more
 * accuracy — the fix belongs in the scoring table.
 */
export const CONSTRUCTION_ERAS: readonly EpcOption<ConstructionEra>[] = [
  { value: "pre_1930", label: "Before 1930" },
  { value: "1930_1966", label: "1930 – 1966" },
  { value: "1967_1982", label: "1967 – 1982" },
  { value: "1983_2002", label: "1983 – 2002" },
  { value: "2003_onwards", label: "2003 or later" },
];

// ── The fabric ───────────────────────────────────────────────────────────

/**
 * A *cavity* wall is two skins with a gap that can be filled with
 * insulation; a *solid* wall has no gap and is far harder to improve, which
 * is why an insulated solid wall still scores below a filled cavity.
 */
export const WALL_INSULATIONS: readonly EpcOption<WallInsulation>[] = [
  { value: "none_cavity", label: "Cavity walls – no insulation" },
  { value: "none_solid", label: "Solid walls – no insulation" },
  { value: "cavity_filled", label: "Cavity walls – filled" },
  { value: "solid_insulated", label: "Solid walls – insulated" },
];

/**
 * `dwelling_above` is offered only to flats and maisonettes — see
 * {@link loftOptionsFor}. Never render this list raw in a question; go
 * through the filter.
 */
export const LOFT_INSULATIONS: readonly EpcOption<LoftInsulation>[] = [
  { value: "none", label: "No loft insulation" },
  { value: "partial", label: "Some insulation (< 100 mm)" },
  { value: "well_insulated", label: "Well insulated (100 mm+)" },
  { value: "dwelling_above", label: "Another home sits above mine" },
];

export const GLAZING_TYPES: readonly EpcOption<GlazingType>[] = [
  { value: "single", label: "Single glazing" },
  { value: "double", label: "Double glazing" },
  { value: "triple", label: "Triple glazing" },
];

// ── The systems ──────────────────────────────────────────────────────────

export const HEATING_TYPES: readonly EpcOption<HeatingType>[] = [
  { value: "old_boiler", label: "Old gas boiler (pre-2000)" },
  { value: "modern_condensing_boiler", label: "Modern condensing boiler" },
  { value: "heat_pump", label: "Heat pump" },
  { value: "electric_heaters", label: "Electric storage heaters" },
  { value: "oil_boiler", label: "Oil boiler" },
  { value: "lpg_boiler", label: "LPG boiler" },
];

/**
 * How the home heats its water, asked separately from space heating.
 *
 * Labels lead with what the resident can see rather than the system name —
 * most people know whether they have a tank in a cupboard, far fewer would
 * pick "combi" unprompted.
 *
 * Worth its place: measured against 367 real certificates this single
 * question moved band accuracy further than any other addition tested,
 * almost entirely because `immersion` identifies poor homes the estimate
 * was otherwise over-rating.
 */
export const HOT_WATER_TYPES: readonly EpcOption<HotWater>[] = [
  { value: "combi", label: "No tank — heated on demand (combi)" },
  { value: "cylinder", label: "Hot water tank / cylinder" },
  { value: "immersion", label: "Immersion heater" },
];

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Loft options valid for [propertyType].
 *
 * Flats and maisonettes get the full list: most have a home above them, but
 * a top-floor flat owns its roof and can genuinely insulate it — which is
 * why this is an answer rather than something inferred from the property
 * type. Houses and bungalows never have a dwelling above, so the option is
 * **withheld rather than shown-and-rejected**: the backend refuses the
 * combination, so offering it would only produce a failed submit.
 *
 * With no property type answered yet, assume no neighbour above. The
 * conservative direction — a resident who later says "flat" gets the option
 * back, whereas offering it up front to a house owner earns a rejection.
 */
export function loftOptionsFor(
  propertyType: PropertyType | null | undefined,
): readonly EpcOption<LoftInsulation>[] {
  const hasNeighbourAbove =
    propertyType === "flat" || propertyType === "maisonette";
  if (hasNeighbourAbove) return LOFT_INSULATIONS;
  return LOFT_INSULATIONS.filter((o) => o.value !== "dwelling_above");
}

/**
 * The label for an API value, for pre-selecting a saved answer or naming
 * one back to the user. Returns null for an unset or unrecognised value —
 * the caller decides whether that's "not answered yet" or a real problem.
 */
export function labelFor<T extends string>(
  options: readonly EpcOption<T>[],
  value: T | null | undefined,
): string | null {
  if (value === null || value === undefined) return null;
  return options.find((o) => o.value === value)?.label ?? null;
}

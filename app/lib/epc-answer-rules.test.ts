import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  areaRangeForBedrooms,
  bedroomsWarnReason,
  builtFormWarnReason,
  floorAreaRange,
  floorAreaWarnReason,
  glazingBlockReason,
  hasNoOwnRoof,
  heatingBlockReason,
  heatingWarnReason,
  hotWaterWarnReason,
  loftBlockReason,
  loftWarnReason,
  solarWarnReason,
  wallWarnReason,
} from "./epc-answer-rules.ts";

/**
 * These rules encode regulatory and statistical facts (Part L, RdSAP,
 * English Housing Survey) that nothing else in the codebase restates, so a
 * wrong edit here fails silently — the flow still runs, it just stops
 * catching impossible homes or starts flagging ordinary ones.
 *
 * Each block below asserts both directions: that the rule fires when it
 * should, and stays quiet when it shouldn't. The second half is what stops
 * a rule from creeping into flagging every answer.
 */

describe("hasNoOwnRoof", () => {
  test("covers maisonettes as well as flats", () => {
    assert.equal(hasNoOwnRoof("flat"), true);
    assert.equal(hasNoOwnRoof("maisonette"), true);
    assert.equal(hasNoOwnRoof("house"), false);
    assert.equal(hasNoOwnRoof("bungalow"), false);
    assert.equal(hasNoOwnRoof(null), false);
  });
});

// ── Blocks ───────────────────────────────────────────────────────────────

describe("glazingBlockReason", () => {
  test("blocks single glazing in a post-2003 build", () => {
    assert.match(
      glazingBlockReason("2003_onwards", "single") ?? "",
      /1994/,
    );
  });

  test("allows single glazing in every older era", () => {
    for (const era of ["pre_1930", "1930_1966", "1967_1982", "1983_2002"] as const) {
      assert.equal(glazingBlockReason(era, "single"), null, era);
    }
  });

  test("allows double and triple in a new build", () => {
    assert.equal(glazingBlockReason("2003_onwards", "double"), null);
    assert.equal(glazingBlockReason("2003_onwards", "triple"), null);
  });

  test("stays quiet when the era isn't answered yet", () => {
    assert.equal(glazingBlockReason(null, "single"), null);
  });
});

describe("heatingBlockReason", () => {
  test("blocks a pre-2000 boiler in a post-2003 build", () => {
    const reason = heatingBlockReason("2003_onwards", "old_boiler");
    assert.match(reason ?? "", /2003 or later/);
    // Must cite the era the resident picked, not the option's own label —
    // quoting "pre-2000" back at them reads as if we misheard the answer.
    assert.doesNotMatch(reason ?? "", /built after 2000/);
  });

  test("allows every other heating system in a new build", () => {
    for (const h of [
      "modern_condensing_boiler",
      "heat_pump",
      "electric_heaters",
      "oil_boiler",
      "lpg_boiler",
    ] as const) {
      assert.equal(heatingBlockReason("2003_onwards", h), null, h);
    }
  });

  test("allows an old boiler in an older home", () => {
    assert.equal(heatingBlockReason("1930_1966", "old_boiler"), null);
  });
});

describe("loftBlockReason", () => {
  test("blocks 'another home above' for a house or bungalow", () => {
    assert.ok(loftBlockReason("house", "dwelling_above"));
    assert.ok(loftBlockReason("bungalow", "dwelling_above"));
  });

  test("allows it for a flat or maisonette", () => {
    assert.equal(loftBlockReason("flat", "dwelling_above"), null);
    assert.equal(loftBlockReason("maisonette", "dwelling_above"), null);
  });

  test("stays quiet before a property type is chosen", () => {
    assert.equal(loftBlockReason(null, "dwelling_above"), null);
  });

  test("never blocks the ordinary loft answers", () => {
    for (const l of ["none", "partial", "well_insulated"] as const) {
      assert.equal(loftBlockReason("house", l), null, l);
    }
  });
});

// ── Warnings ─────────────────────────────────────────────────────────────

describe("wallWarnReason", () => {
  test("flags an uninsulated new build", () => {
    assert.match(wallWarnReason("2003_onwards", "none_cavity") ?? "", /1995/);
    assert.match(wallWarnReason("2003_onwards", "none_solid") ?? "", /1995/);
  });

  test("flags cavity walls before 1930", () => {
    assert.match(wallWarnReason("pre_1930", "cavity_filled") ?? "", /solid walls/);
    assert.match(wallWarnReason("pre_1930", "none_cavity") ?? "", /solid walls/);
  });

  test("flags solid walls from 1967 onwards", () => {
    for (const era of ["1967_1982", "1983_2002", "2003_onwards"] as const) {
      assert.ok(wallWarnReason(era, "none_solid"), era);
    }
  });

  test("says nothing about a solid pre-1930 wall — the typical case", () => {
    assert.equal(wallWarnReason("pre_1930", "none_solid"), null);
    assert.equal(wallWarnReason("pre_1930", "solid_insulated"), null);
  });

  test("says nothing about a filled cavity in a mid-century home", () => {
    assert.equal(wallWarnReason("1930_1966", "cavity_filled"), null);
  });
});

describe("loftWarnReason", () => {
  test("flags little or no insulation in a new build", () => {
    assert.match(loftWarnReason("2003_onwards", "none") ?? "", /2002/);
    assert.ok(loftWarnReason("2003_onwards", "partial"));
  });

  test("accepts a well-insulated new build and any older home", () => {
    assert.equal(loftWarnReason("2003_onwards", "well_insulated"), null);
    assert.equal(loftWarnReason("pre_1930", "none"), null);
  });
});

describe("heatingWarnReason", () => {
  test("flags tank-fed heating in a flat", () => {
    assert.match(heatingWarnReason("flat", "oil_boiler") ?? "", /storage/);
    assert.match(heatingWarnReason("flat", "lpg_boiler") ?? "", /tank storage/);
  });

  test("flags a heat pump in a flat, but not in a maisonette", () => {
    assert.ok(heatingWarnReason("flat", "heat_pump"));
    assert.equal(heatingWarnReason("maisonette", "heat_pump"), null);
  });

  test("calls a maisonette a maisonette", () => {
    // The rule fires for both, but the copy used to hard-code "flat" and
    // told maisonette owners their home was something it isn't.
    const reason = heatingWarnReason("maisonette", "oil_boiler") ?? "";
    assert.match(reason, /maisonettes/);
    assert.doesNotMatch(reason, /flats/);
  });

  test("says nothing for a house, whatever the system", () => {
    for (const h of ["oil_boiler", "lpg_boiler", "heat_pump"] as const) {
      assert.equal(heatingWarnReason("house", h), null, h);
    }
  });
});

describe("hotWaterWarnReason", () => {
  test("flags a heat pump paired with a combi", () => {
    assert.match(
      hotWaterWarnReason("heat_pump", "1983_2002", "combi") ?? "",
      /cylinder/,
    );
  });

  test("flags immersion-only hot water in a new build", () => {
    assert.ok(hotWaterWarnReason("modern_condensing_boiler", "2003_onwards", "immersion"));
  });

  test("accepts a heat pump with a cylinder", () => {
    assert.equal(hotWaterWarnReason("heat_pump", "1983_2002", "cylinder"), null);
  });

  test("accepts a combi on a normal boiler", () => {
    assert.equal(
      hotWaterWarnReason("modern_condensing_boiler", "1983_2002", "combi"),
      null,
    );
  });
});

describe("solarWarnReason", () => {
  test("says nothing when the answer is no", () => {
    assert.equal(
      solarWarnReason("flat", { hasSolar: false, loftIsNotApplicable: true }),
      null,
    );
  });

  test("leads with the contradiction when a home sits above", () => {
    // The strongest check in the flow: it contradicts an answer they have
    // already given, so it outranks the generic "flats have communal roofs".
    assert.match(
      solarWarnReason("flat", { hasSolar: true, loftIsNotApplicable: true }) ?? "",
      /another home above yours/,
    );
  });

  test("falls back to the communal-roof warning for a flat", () => {
    assert.match(
      solarWarnReason("flat", { hasSolar: true, loftIsNotApplicable: false }) ?? "",
      /communal/,
    );
  });

  test("says nothing for a house with panels", () => {
    assert.equal(
      solarWarnReason("house", { hasSolar: true, loftIsNotApplicable: false }),
      null,
    );
  });
});

describe("builtFormWarnReason", () => {
  test("flags a flat described as detached", () => {
    assert.match(builtFormWarnReason("flat", "detached") ?? "", /not itself detached/);
  });

  test("accepts a detached house and a mid-terrace flat", () => {
    assert.equal(builtFormWarnReason("house", "detached"), null);
    assert.equal(builtFormWarnReason("flat", "mid_terrace"), null);
  });
});

// ── Plausibility ranges ──────────────────────────────────────────────────

describe("floorAreaRange", () => {
  test("keys on property type before built form", () => {
    // A flat is a flat whatever the block's form — checking built form
    // first would hand a "detached" flat the 70-400 house span.
    assert.deepEqual(floorAreaRange("flat", "detached"), { min: 20, max: 150 });
    assert.deepEqual(floorAreaRange("bungalow", "detached"), { min: 40, max: 200 });
  });

  test("falls back to the widest house span when form is unknown", () => {
    assert.deepEqual(floorAreaRange("house", null), { min: 40, max: 400 });
  });
});

describe("floorAreaWarnReason", () => {
  test("accepts an ordinary home", () => {
    assert.equal(floorAreaWarnReason("house", "semi_detached", 97), null);
    assert.equal(floorAreaWarnReason("flat", null, 58), null);
  });

  test("accepts the exact boundaries", () => {
    assert.equal(floorAreaWarnReason("flat", null, 20), null);
    assert.equal(floorAreaWarnReason("flat", null, 150), null);
  });

  test("catches a slipped decimal", () => {
    assert.ok(floorAreaWarnReason("house", "semi_detached", 970));
    assert.ok(floorAreaWarnReason("house", "semi_detached", 9));
  });

  test("says 'flats' to a flat and 'homes like yours' otherwise", () => {
    assert.match(floorAreaWarnReason("flat", null, 500) ?? "", /Most flats/);
    assert.match(
      floorAreaWarnReason("house", "detached", 5) ?? "",
      /homes like yours/,
    );
  });
});

describe("areaRangeForBedrooms", () => {
  test("widens with each bedroom but not linearly", () => {
    // Kitchen, bathroom and hallway are fixed costs a one-bed carries in
    // full, so the per-bedroom allowance shrinks as the count grows.
    const one = areaRangeForBedrooms(1);
    const four = areaRangeForBedrooms(4);
    assert.ok(four.min > one.min);
    assert.ok(four.min / 4 < one.min);
  });

  test("treats 5+ bedrooms as one open band", () => {
    assert.deepEqual(areaRangeForBedrooms(5), areaRangeForBedrooms(9));
  });
});

describe("bedroomsWarnReason", () => {
  test("accepts a consistent pair", () => {
    assert.equal(
      bedroomsWarnReason({ bedrooms: 3, area: 95, propertyType: "house" }),
      null,
    );
  });

  test("accepts an ordinary small flat", () => {
    // The EHS mean for a converted flat is 65 m². A flat per-bedroom
    // threshold used to reject this outright.
    assert.equal(
      bedroomsWarnReason({ bedrooms: 1, area: 65, propertyType: "flat" }),
      null,
    );
  });

  test("flags a mismatch and quotes both figures", () => {
    const reason = bedroomsWarnReason({ bedrooms: 2, area: 850 }) ?? "";
    assert.match(reason, /2-bedroom/);
    assert.match(reason, /850 m²/);
  });

  test("renders a whole-number area without a trailing zero", () => {
    assert.match(bedroomsWarnReason({ bedrooms: 1, area: 300 }) ?? "", /300 m²/);
  });

  test("flags six bedrooms in a flat even with no floor area", () => {
    assert.match(
      bedroomsWarnReason({ bedrooms: 6, area: null, propertyType: "flat" }) ?? "",
      /unusual for a flat/,
    );
  });

  test("stays quiet without a floor area to compare against", () => {
    assert.equal(bedroomsWarnReason({ bedrooms: 3, area: null }), null);
    assert.equal(bedroomsWarnReason({ bedrooms: 3, area: undefined }), null);
  });

  test("stays quiet on an unanswered bedroom count", () => {
    assert.equal(bedroomsWarnReason({ bedrooms: 0, area: 95 }), null);
  });
});

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  CONSTRUCTION_ERAS,
  HEATING_TYPES,
  LOFT_INSULATIONS,
  labelFor,
  loftOptionsFor,
} from "./epc-field-options.ts";

/**
 * The option filter is the one piece of this module with behaviour rather
 * than data, and it guards a combination the backend rejects outright — so
 * getting it wrong produces a failed submit, not a cosmetic slip.
 */
describe("loftOptionsFor", () => {
  const values = (t: Parameters<typeof loftOptionsFor>[0]) =>
    loftOptionsFor(t).map((o) => o.value);

  test("offers 'another home above' to flats and maisonettes", () => {
    assert.ok(values("flat").includes("dwelling_above"));
    assert.ok(values("maisonette").includes("dwelling_above"));
  });

  test("withholds it from houses and bungalows — the backend rejects it", () => {
    assert.ok(!values("house").includes("dwelling_above"));
    assert.ok(!values("bungalow").includes("dwelling_above"));
  });

  test("withholds it when the property type isn't known yet", () => {
    // Conservative direction: answering "flat" later restores the option,
    // whereas offering it up front to a house owner earns a rejection.
    assert.ok(!values(null).includes("dwelling_above"));
    assert.ok(!values(undefined).includes("dwelling_above"));
  });

  test("keeps every other option in both cases", () => {
    assert.equal(values("flat").length, LOFT_INSULATIONS.length);
    assert.equal(values("house").length, LOFT_INSULATIONS.length - 1);
    for (const v of ["none", "partial", "well_insulated"]) {
      assert.ok(values("house").includes(v as never), `${v} missing`);
    }
  });

  test("does not mutate the source list", () => {
    loftOptionsFor("house");
    assert.equal(LOFT_INSULATIONS.length, 4);
  });
});

describe("labelFor", () => {
  test("resolves a saved answer to its label", () => {
    assert.equal(labelFor(CONSTRUCTION_ERAS, "pre_1930"), "Before 1930");
    assert.equal(labelFor(HEATING_TYPES, "heat_pump"), "Heat pump");
  });

  test("returns null for an unanswered question", () => {
    assert.equal(labelFor(CONSTRUCTION_ERAS, null), null);
    assert.equal(labelFor(CONSTRUCTION_ERAS, undefined), null);
  });

  test("returns null for a value the list doesn't carry", () => {
    // A stored answer from a future backend enum reaches us as a string we
    // don't know. Better an unlabelled question than a crash.
    assert.equal(labelFor(CONSTRUCTION_ERAS, "victorian" as never), null);
  });
});

describe("option lists", () => {
  test("every value is unique within its list", () => {
    for (const list of [CONSTRUCTION_ERAS, HEATING_TYPES, LOFT_INSULATIONS]) {
      const values = list.map((o) => o.value);
      assert.equal(new Set(values).size, values.length);
    }
  });

  test("no label is blank", () => {
    for (const list of [CONSTRUCTION_ERAS, HEATING_TYPES, LOFT_INSULATIONS]) {
      for (const o of list) assert.ok(o.label.trim().length > 0, o.value);
    }
  });
});

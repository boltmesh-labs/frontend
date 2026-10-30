import { describe, expect, it } from "vitest";

import {
  AWG_FORM_FIELDS,
  buildAwgParams,
  generateAwgParams,
  mapAwgParamsToForm,
  toOptionalNumber,
} from "./awg";

const blankAwgForm = () =>
  Object.fromEntries(AWG_FORM_FIELDS.map((field) => [field.name, ""]));

describe("toOptionalNumber", () => {
  it("treats every empty form value as unset", () => {
    expect(toOptionalNumber("")).toBeNull();
    expect(toOptionalNumber(null)).toBeNull();
    expect(toOptionalNumber(undefined)).toBeNull();
  });

  it("keeps 0, which is a real value", () => {
    expect(toOptionalNumber(0)).toBe(0);
    expect(toOptionalNumber("0")).toBe(0);
  });
});

describe("mapAwgParamsToForm", () => {
  it("splits each magic header pair into its low and high fields", () => {
    const form = mapAwgParamsToForm({ h1: [10, 20], h4: [30, 40] });

    expect(form.h1_lo).toBe(10);
    expect(form.h1_hi).toBe(20);
    expect(form.h4_lo).toBe(30);
    expect(form.h4_hi).toBe(40);
  });

  it("blanks every field when the server has no parameter set", () => {
    expect(mapAwgParamsToForm(null)).toEqual(blankAwgForm());
  });

  it("keeps a stored 0 rather than blanking it", () => {
    expect(mapAwgParamsToForm({ jc: 0 }).jc).toBe(0);
  });
});

describe("buildAwgParams", () => {
  it("sends null when the rung is disabled, whatever the fields hold", () => {
    expect(
      buildAwgParams({ ...blankAwgForm(), awg_enabled: false, jc: 5 }),
    ).toBeNull();
  });

  it("omits the params when every field is blank, so the backend generates one", () => {
    expect(
      buildAwgParams({ ...blankAwgForm(), awg_enabled: true }),
    ).toBeUndefined();
  });

  it("pairs the header fields back into [low, high] ranges", () => {
    const params = buildAwgParams({
      ...blankAwgForm(),
      awg_enabled: true,
      jc: "5",
      h1_lo: "100",
      h1_hi: "200",
    });

    expect(params.jc).toBe(5);
    expect(params.h1).toEqual([100, 200]);
    expect(params.h2).toEqual([null, null]);
  });

  it("treats a partially filled set as set, leaving the blank fields null", () => {
    const params = buildAwgParams({
      ...blankAwgForm(),
      awg_enabled: true,
      jmin: "10",
    });

    expect(params.jmin).toBe(10);
    expect(params.jc).toBeNull();
  });
});

describe("generateAwgParams", () => {
  it("produces a value for every field the form edits", () => {
    const generated = generateAwgParams();

    expect(Object.keys(generated).sort()).toEqual(
      AWG_FORM_FIELDS.map((field) => field.name).sort(),
    );
  });

  it("stays inside the ranges the form accepts", () => {
    const generated = generateAwgParams();

    expect(generated.jc).toBeGreaterThanOrEqual(3);
    expect(generated.jc).toBeLessThanOrEqual(10);
    expect(generated.jmax).toBeGreaterThanOrEqual(600);
    expect(generated.jmax).toBeLessThanOrEqual(1000);
    for (const field of AWG_FORM_FIELDS) {
      expect(Number.isInteger(generated[field.name])).toBe(true);
      expect(generated[field.name]).toBeGreaterThanOrEqual(0);
    }
  });

  it("keeps the four magic-header ranges pairwise disjoint", () => {
    // The invariant the AmneziaWG device requires, checked over many draws
    // because the spread is random within each slot.
    for (let run = 0; run < 200; run += 1) {
      const { h1_lo, h1_hi, h2_lo, h2_hi, h3_lo, h3_hi, h4_lo, h4_hi } =
        generateAwgParams();
      const ranges = [
        [h1_lo, h1_hi],
        [h2_lo, h2_hi],
        [h3_lo, h3_hi],
        [h4_lo, h4_hi],
      ];

      for (const [lo, hi] of ranges) expect(lo).toBeLessThanOrEqual(hi);
      for (let a = 0; a < ranges.length; a += 1) {
        for (let b = a + 1; b < ranges.length; b += 1) {
          const disjoint =
            ranges[a][1] < ranges[b][0] || ranges[b][1] < ranges[a][0];
          expect(disjoint).toBe(true);
        }
      }
    }
  });
});

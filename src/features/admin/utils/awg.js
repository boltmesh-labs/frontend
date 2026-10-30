// AmneziaWG (obfuscated rung) parameter handling for the VPN server form.
//
// Pure and DOM-free on purpose: the server stores the parameter set flat (the
// mode itself is `awg_enabled`), and the form edits it flat too, so the two
// halves of the mapping live together and are tested without rendering.

// The flat AWG parameter field names, in render order. Kept as data so the form
// is one map instead of eleven near-identical JSX blocks.
export const AWG_PARAM_FIELDS = [
  { label: "Junk Count (Jc)", name: "jc", max: 128 },
  { label: "Junk Min (Jmin)", name: "jmin", max: 1500 },
  { label: "Junk Max (Jmax)", name: "jmax", max: 1500 },
  { label: "Init Padding S1", name: "s1", max: 1500 },
  { label: "Init Padding S2", name: "s2", max: 1500 },
  { label: "Init Padding S3", name: "s3", max: 1500 },
  { label: "Init Padding S4", name: "s4", max: 1500 },
];

export const AWG_HEADER_FIELDS = [1, 2, 3, 4].flatMap((index) => [
  { label: `Magic Header H${index} low`, name: `h${index}_lo` },
  { label: `Magic Header H${index} high`, name: `h${index}_hi` },
]);

export const AWG_FORM_FIELDS = [...AWG_PARAM_FIELDS, ...AWG_HEADER_FIELDS];

// Blank numeric inputs are "not set" rather than 0.
export const toOptionalNumber = (value) =>
  value === "" || value === null || value === undefined ? null : Number(value);

export const mapAwgParamsToForm = (params) => {
  const p = params || {};
  return {
    jc: p.jc ?? "",
    jmin: p.jmin ?? "",
    jmax: p.jmax ?? "",
    s1: p.s1 ?? "",
    s2: p.s2 ?? "",
    s3: p.s3 ?? "",
    s4: p.s4 ?? "",
    h1_lo: p.h1?.[0] ?? "",
    h1_hi: p.h1?.[1] ?? "",
    h2_lo: p.h2?.[0] ?? "",
    h2_hi: p.h2?.[1] ?? "",
    h3_lo: p.h3?.[0] ?? "",
    h3_hi: p.h3?.[1] ?? "",
    h4_lo: p.h4?.[0] ?? "",
    h4_hi: p.h4?.[1] ?? "",
  };
};

// Null when the rung is off (the backend forbids params on a disabled rung);
// undefined when every field is blank, which lets the backend generate one per
// server on create and leaves the stored set untouched on edit.
export const buildAwgParams = (formData) => {
  if (!formData.awg_enabled) return null;
  if (
    AWG_FORM_FIELDS.every(
      (f) => formData[f.name] === "" || formData[f.name] == null,
    )
  ) {
    return undefined;
  }
  return {
    jc: toOptionalNumber(formData.jc),
    jmin: toOptionalNumber(formData.jmin),
    jmax: toOptionalNumber(formData.jmax),
    s1: toOptionalNumber(formData.s1),
    s2: toOptionalNumber(formData.s2),
    s3: toOptionalNumber(formData.s3),
    s4: toOptionalNumber(formData.s4),
    h1: [toOptionalNumber(formData.h1_lo), toOptionalNumber(formData.h1_hi)],
    h2: [toOptionalNumber(formData.h2_lo), toOptionalNumber(formData.h2_hi)],
    h3: [toOptionalNumber(formData.h3_lo), toOptionalNumber(formData.h3_hi)],
    h4: [toOptionalNumber(formData.h4_lo), toOptionalNumber(formData.h4_hi)],
  };
};

const randomInt = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));

// A well-formed starting point, not a policy: which parameters actually evade a
// given censor is an operator decision, so this only guarantees the shape the
// AmneziaWG device requires — in-range junk and padding, and four
// pairwise-disjoint magic-header ranges drawn well above the standard WireGuard
// message types. Each range sits in its own slot, so it can never overlap a
// neighbour.
export const generateAwgParams = () => {
  const headerBase = 0x40000000;
  const headerStep = 0x10000000;
  const headerSpread = 0x00ffffff;
  const headers = {};
  for (let i = 1; i <= 4; i += 1) {
    const lo = headerBase + i * headerStep;
    headers[`h${i}_lo`] = lo;
    headers[`h${i}_hi`] = lo + randomInt(0, headerSpread);
  }
  return {
    jc: randomInt(3, 10),
    jmin: randomInt(10, 50),
    jmax: randomInt(600, 1000),
    s1: randomInt(10, 100),
    s2: randomInt(10, 100),
    s3: randomInt(10, 100),
    s4: randomInt(10, 100),
    ...headers,
  };
};

/**
 * Strips structured identifiers from text before it leaves Google Cloud for a
 * third-party model. It cannot find names: a person or a client named in the
 * sentence still goes through, which is why third-party use also stays behind
 * the data-class gate in providers.ts.
 */
const PATTERNS: ReadonlyArray<readonly [RegExp, string]> = [
  // A GSTIN has the holder's PAN inside it; \b keeps the PAN pattern from matching there.
  [/\b\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]\b/g, "[GSTIN]"],
  [/\b[A-Z]{5}\d{4}[A-Z]\b/g, "[PAN]"],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g, "[EMAIL]"],
  // Indian mobile number, with or without +91.
  [/(?<!\d)(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}(?!\d)/g, "[PHONE]"],
  // Any other number written with a country code.
  [/\+\d{1,3}(?:[\s-]?\d){7,11}(?!\d)/g, "[PHONE]"],
  // Aadhaar: 12 digits, usually in groups of four.
  [/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, "[ID NUMBER]"],
];

export function redactForThirdParty(text: string): { text: string; redactions: number } {
  let redactions = 0;
  let result = text;
  for (const [pattern, label] of PATTERNS) {
    result = result.replace(pattern, () => {
      redactions += 1;
      return label;
    });
  }
  return { text: result, redactions };
}

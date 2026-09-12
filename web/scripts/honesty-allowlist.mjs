/**
 * Documented exceptions to the honesty rule for the web app. Keep this SHORT.
 *
 * Every entry needs a one-line `why` saying why the match is not a
 * fabrication. Add `contains` to narrow an entry to particular lines.
 * See docs/HONESTY_RULE.md, "Requesting an allowlist entry".
 *
 * There are currently none.
 */
export const ALLOWLIST = [];

export function isAllowed(file, rule, line) {
  return ALLOWLIST.some(
    (e) =>
      e.rule === rule &&
      (e.file === file || (e.dir && file.startsWith(e.dir))) &&
      (!e.contains || line.includes(e.contains)),
  );
}

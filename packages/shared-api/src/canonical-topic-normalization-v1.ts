/** Mirrors deployed ec3_topic_private.normalize_term: C whitespace and ASCII case only. */
export function normalizeCanonicalTopicTermV1(value: string): string {
  return value.replace(/[\t\n\v\f\r ]+/g, " ").replace(/^ | $/g, "")
    .replace(/[A-Z]/g, (letter) => letter.toLowerCase());
}

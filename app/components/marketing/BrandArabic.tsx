const ZWJ = "\u200D";

/**
 * هندسها as one shaping run: هندس solid, ها outlined.
 * ZWJ on both sides of the split keeps س joined to ه.
 */
export default function BrandArabic() {
  return (
    <span className="brand-ar" lang="ar">
      <span className="brand-ar-solid">هندس{ZWJ}</span>
      <span className="brand-ar-hollow">{ZWJ}ها</span>
    </span>
  );
}

/** Replace a leading هندسها in a CTA, leaving the rest of the phrase. */
export function BrandPhrase({ text }: { text: string }) {
  const word = "هندسها";
  const at = text.indexOf(word);
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <BrandArabic />
      {text.slice(at + word.length)}
    </>
  );
}

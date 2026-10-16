/** Cropped trace of the original transparent wordmark. */
export default function Wordmark({ decorative = false }: { decorative?: boolean }) {
  return (
    <img
      className="wordmark"
      src="/wordmark.svg"
      alt={decorative ? "" : "engineer it"}
      width={817}
      height={176}
    />
  );
}

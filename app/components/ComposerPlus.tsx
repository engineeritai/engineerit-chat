/** Bare plus for composer attach controls. The stroke stays #333 on a transparent target. */
export default function ComposerPlus() {
  return (
    <svg className="composer-plus" width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <path d="M11 4.25v13.5M4.25 11h13.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

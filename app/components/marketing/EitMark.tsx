/** Brand chat mark: "eit" inside a rounded bubble, with an AI spark, on a 36px circle. */

export default function EitMark({ size = 36, title }: { size?: number; title?: string }) {
  return (
    <svg
      className="eit-mark"
      width={size}
      height={size}
      viewBox="0 0 36 36"
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <circle cx="18" cy="18" r="18" fill="#1a56ff" />
      <path
        fill="#ffffff"
        d="M7.2 12.2h20.2c1.5 0 2.6 1.1 2.6 2.6v5.6c0 1.5-1.1 2.6-2.6 2.6H15.2l-2.6 2.4v-2.4H7.2c-1.5 0-2.6-1.1-2.6-2.6v-5.6c0-1.5 1.1-2.6 2.6-2.6z"
      />
      <path
        fill="#1a56ff"
        d="M9.47 13.7h1.04v1.04h-1.04z M10.59 13.7h1.04v1.04h-1.04z M11.71 13.7h1.04v1.04h-1.04z M8.35 14.82h1.04v1.04h-1.04z M12.83 14.82h1.04v1.04h-1.04z M8.35 15.94h1.04v1.04h-1.04z M9.47 15.94h1.04v1.04h-1.04z M10.59 15.94h1.04v1.04h-1.04z M11.71 15.94h1.04v1.04h-1.04z M12.83 15.94h1.04v1.04h-1.04z M8.35 17.06h1.04v1.04h-1.04z M9.47 18.18h1.04v1.04h-1.04z M10.59 18.18h1.04v1.04h-1.04z M11.71 18.18h1.04v1.04h-1.04z M17.09 13.7h1.04v1.04h-1.04z M17.09 15.94h1.04v1.04h-1.04z M17.09 17.06h1.04v1.04h-1.04z M17.09 18.18h1.04v1.04h-1.04z M22.47 13.7h1.04v1.04h-1.04z M23.59 13.7h1.04v1.04h-1.04z M24.71 13.7h1.04v1.04h-1.04z M23.59 14.82h1.04v1.04h-1.04z M21.35 15.94h1.04v1.04h-1.04z M22.47 15.94h1.04v1.04h-1.04z M23.59 15.94h1.04v1.04h-1.04z M24.71 15.94h1.04v1.04h-1.04z M25.83 15.94h1.04v1.04h-1.04z M23.59 17.06h1.04v1.04h-1.04z M22.47 18.18h1.04v1.04h-1.04z M23.59 18.18h1.04v1.04h-1.04z M24.71 18.18h1.04v1.04h-1.04z"
      />
      <title>eit</title>
      <path
        fill="#ffffff"
        d="M27.4 5.4 28.45 7.85 31 8.85 28.45 9.85 27.4 12.3 26.35 9.85 23.8 8.85 26.35 7.85Z"
      />
      <circle cx="31.15" cy="5.55" r="0.75" fill="#ffffff" />
    </svg>
  );
}

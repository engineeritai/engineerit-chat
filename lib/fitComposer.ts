export const COMPOSER_MIN_PX = 44;
export const COMPOSER_LINE_PX = 22;

/** Six lines, and never more than about a third of the visible viewport. */
export function composerMaxHeight(viewportHeight: number) {
  const sixLines = COMPOSER_MIN_PX + 5 * COMPOSER_LINE_PX;
  const share = Math.round(Math.max(0, viewportHeight) * 0.32);
  if (!share) return sixLines;
  return Math.max(COMPOSER_MIN_PX, Math.min(sixLines, share));
}

export function measureComposer(scrollHeight: number, viewportHeight: number) {
  const max = composerMaxHeight(viewportHeight);
  const needed = Math.max(COMPOSER_MIN_PX, scrollHeight);
  return {
    height: Math.min(needed, max),
    scroll: needed > max + 1,
  };
}

export function applyComposerHeight(el: HTMLTextAreaElement) {
  const viewport = window.visualViewport?.height || window.innerHeight;
  el.style.height = `${COMPOSER_MIN_PX}px`;
  const next = measureComposer(el.scrollHeight, viewport);
  el.style.height = `${next.height}px`;
  el.style.overflowY = next.scroll ? "auto" : "hidden";
}

export function resetComposerHeight(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = `${COMPOSER_MIN_PX}px`;
  el.style.overflowY = "hidden";
}

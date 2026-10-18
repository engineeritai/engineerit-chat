/** Let a vertical swipe on a horizontal scroller move the chat instead. */
export function bindVerticalPass(scroll: HTMLElement) {
  const scrollerOf = () => scroll.closest(".conversation") as HTMLElement | null;
  const onWheel = (event: WheelEvent) => {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    const scroller = scrollerOf();
    if (!scroller) return;
    scroller.scrollTop += event.deltaY;
    event.preventDefault();
  };
  let lastY = 0;
  let startX = 0;
  let startY = 0;
  let axis: "x" | "y" | null = null;
  const onStart = (event: TouchEvent) => {
    startX = event.touches[0]?.clientX ?? 0;
    startY = event.touches[0]?.clientY ?? 0;
    lastY = startY;
    axis = null;
  };
  const onMove = (event: TouchEvent) => {
    const touch = event.touches[0];
    if (!touch) return;
    const dy = touch.clientY - lastY;
    lastY = touch.clientY;
    if (!axis) {
      const dx = touch.clientX - startX;
      const travelY = touch.clientY - startY;
      if (Math.abs(dx) < 8 && Math.abs(travelY) < 8) return;
      axis = Math.abs(travelY) >= Math.abs(dx) ? "y" : "x";
    }
    if (axis !== "y") return;
    const scroller = scrollerOf();
    if (!scroller) return;
    scroller.scrollTop -= dy;
    event.preventDefault();
  };
  scroll.addEventListener("wheel", onWheel, { passive: false });
  scroll.addEventListener("touchstart", onStart, { passive: true });
  scroll.addEventListener("touchmove", onMove, { passive: false });
  return () => {
    scroll.removeEventListener("wheel", onWheel);
    scroll.removeEventListener("touchstart", onStart);
    scroll.removeEventListener("touchmove", onMove);
  };
}

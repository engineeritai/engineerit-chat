/** True when the user is asking for a quantity take-off or a bill of quantities. */
export function isTakeoffRequest(question: string | null | undefined): boolean {
  const text = question || "";
  if (/\b(boq|b\.o\.q\.?|bill of quantit\w*|quantity take[-\s]?off|take[-\s]?off)\b/i.test(text)) {
    return true;
  }
  if (/حصر|(?:جدول|جداول)\s+(?:ال)?كميات/.test(text)) return true;
  return false;
}

/** Moyasar's hosted form ships this English typo when save_card is on. */
export const MOYASAR_SAVE_NOTICE_EN = "You card data will be saved upon submit.";

/** Moyasar's Arabic line only says the card data will be stored. It does not say who stores it. */
export const MOYASAR_SAVE_NOTICE_AR = "سيتم حفظ بيانات البطاقة عند إتمام العملية.";

export function isMoyasarSaveNotice(text: string) {
  const value = text.replace(/\s+/g, " ").trim();
  if (!value) return false;
  if (value.includes("You card data") || value.includes(MOYASAR_SAVE_NOTICE_EN)) return true;
  return value.includes("بيانات البطاقة") && value.includes("إتمام");
}

export function replaceMoyasarSaveNotice(text: string, replacement: string) {
  if (!isMoyasarSaveNotice(text)) return text;
  return replacement;
}

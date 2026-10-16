/** Checkout returns here after Moyasar confirms a payment. */
export function paymentSuccessPath(checkoutId: string, pay = "") {
  const next = new URLSearchParams({ checkout: checkoutId });
  if (pay) next.set("pay", pay);
  return `/payment/success?${next.toString()}`;
}

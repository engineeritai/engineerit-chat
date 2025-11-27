import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { priceId, userId } = await req.json();

    const checkoutRes = await fetch(
      "https://api.paddle.com/checkout/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.PADDLE_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer_id: userId,
          items: [
            {
              price_id: priceId,
              quantity: 1,
            },
          ],
          success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?success=1`,
          cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?canceled=1`,
        }),
      }
    );

    const data = await checkoutRes.json();
    return NextResponse.json({ url: data.data.checkout_url });
  } catch (error) {
    return NextResponse.json(
      { error: "Checkout error" },
      { status: 500 }
    );
  }
}

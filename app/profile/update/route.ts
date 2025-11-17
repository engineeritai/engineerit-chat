import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  const body = await req.json();

  const { id, full_name, email, avatar_url } = body;

  const { data, error } = await supabase
    .from("profiles")
    .upsert({
      id,
      full_name,
      email,
      avatar_url,
      updated_at: new Date().toISOString()
    });

  if (error) {
    console.error(error);
    return new Response(JSON.stringify({ success: false, error }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true, data }), { status: 200 });
}

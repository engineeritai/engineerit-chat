import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  GENERATED_FILE_TTL_HOURS,
  CHAT_TTL_DAYS,
} from "@/lib/retention";

export const runtime = "nodejs";

export async function GET() {
  try {
    const now = new Date();

    // 1) حذف الملفات المنتهية
    const filesToDelete = await supabaseAdmin
      .from("generated_files")
      .select("id, storage_bucket, storage_path, created_at, expires_at")
      .lte("expires_at", now.toISOString())
      .limit(1000); // دفعة واحدة

    if (filesToDelete.error) {
      console.error("Error selecting expired files:", filesToDelete.error);
    } else if (filesToDelete.data && filesToDelete.data.length > 0) {
      // نجمع حسب البكت
      const byBucket: Record<string, string[]> = {};
      for (const f of filesToDelete.data) {
        if (!byBucket[f.storage_bucket]) byBucket[f.storage_bucket] = [];
        byBucket[f.storage_bucket].push(f.storage_path);
      }

      // حذف من الـ Storage
      for (const bucket of Object.keys(byBucket)) {
        const paths = byBucket[bucket];
        const res = await supabaseAdmin.storage.from(bucket).remove(paths);
        if (res.error) {
          console.error(`Error deleting from bucket ${bucket}:`, res.error);
        }
      }

      // حذف من جدول generated_files
      const ids = filesToDelete.data.map((f) => f.id);
      const delMeta = await supabaseAdmin
        .from("generated_files")
        .delete()
        .in("id", ids);
      if (delMeta.error) {
        console.error("Error deleting file metadata:", delMeta.error);
      }
    }

    // 2) حذف رسائل الشات المنتهية (لو حاب، خليها soft-delete بحذف قديم فقط)
    const chatsToDelete = await supabaseAdmin
      .from("chat_messages")
      .delete()
      .lte(
        "expires_at",
        new Date(
          now.getTime() - CHAT_TTL_DAYS * 24 * 60 * 60 * 1000
        ).toISOString()
      );

    if (chatsToDelete.error) {
      console.error("Error deleting old chat messages:", chatsToDelete.error);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Cleanup error:", err);
    return new NextResponse("Cleanup failed", { status: 500 });
  }
}

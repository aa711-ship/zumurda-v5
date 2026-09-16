const SUPABASE_URL = "https://ujvlypfbqaaprannkwoq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_7ov6wh3yRCr6c846L6T6Sw_WWJ4QmLy";

if (!window.supabase) {
  alert("❌ مكتبة Supabase لم يتم تحميلها.");
  throw new Error("Supabase library is missing");
}

window.supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

console.log("✅ Supabase library:", window.supabase);
console.log("✅ Supabase client:", window.supabaseClient);
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://rhzgtkbimzumqtvsewpq.supabase.co",
  "sb_publishable__0doeoTRx_n8x2_OB5yzug_1ED425jT"
);

async function testLogin() {
  console.log("Attempting login...");
  const { data, error } = await supabase.auth.signInWithPassword({
    email: "admin@flowstock.com",
    password: "password123"
  });

  if (error) {
    console.error("Login failed:", error.message);
  } else {
    console.log("Login success! User ID:", data.user?.id);
  }
}
testLogin();

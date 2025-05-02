import { createClient } from "@supabase/supabase-js";

// Get environment variables with proper error handling
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if environment variables are set
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Supabase environment variables are missing. Please check your .env file."
  );
}

export const supabase = createClient(
  supabaseUrl || "",
  supabaseAnonKey || "",
);

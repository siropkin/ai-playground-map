import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export default async function PrivatePage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect("/");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-4">
      <p>Hello {data.user.email}</p>
    </div>
  );
}

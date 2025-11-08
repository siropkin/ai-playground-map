"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { LogIn } from "lucide-react";

export default function LoginPage() {
  const { user, signIn, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && !isLoading) {
      router.push("/profile");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-3xl font-bold">Admin Login</h1>
        <p className="text-muted-foreground max-w-md">
          This page is for administrators only. Sign in with your authorized
          Google account.
        </p>
        <Button onClick={signIn} size="lg" className="mt-4">
          <LogIn className="mr-2 h-4 w-4" />
          Sign in with Google
        </Button>
      </div>
    </div>
  );
}

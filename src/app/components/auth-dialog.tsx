"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoginForm } from "@/components/login-form";
import { SignupForm } from "@/components/signup-form";
import { useAuth } from "@/contexts/auth-context";

export function AuthDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      setIsOpen(false);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (user) {
    return (
      <Button variant="outline" onClick={handleSignOut}>
        Sign out
      </Button>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Sign in</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {activeTab === "login"
              ? "Sign in to your account"
              : "Create an account"}
          </DialogTitle>
          <DialogDescription></DialogDescription>
        </DialogHeader>
        <div className="mb-4 flex border-b">
          <Button
            variant="ghost"
            className={`rounded-none px-4 py-2 ${
              activeTab === "login"
                ? "border-primary border-b-2 font-semibold"
                : "text-muted-foreground"
            }`}
            onClick={() => setActiveTab("login")}
          >
            Sign in
          </Button>
          <Button
            variant="ghost"
            className={`rounded-none px-4 py-2 ${
              activeTab === "signup"
                ? "border-primary border-b-2 font-semibold"
                : "text-muted-foreground"
            }`}
            onClick={() => setActiveTab("signup")}
          >
            Sign up
          </Button>
        </div>
        {activeTab === "login" ? <LoginForm /> : <SignupForm />}
      </DialogContent>
    </Dialog>
  );
}

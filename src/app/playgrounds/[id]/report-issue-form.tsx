"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { reportIssue } from "./actions";

interface ReportIssueFormProps {
  playgroundId: string;
}

export default function ReportIssueForm({
  playgroundId,
}: ReportIssueFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const description = formData.get("description") as string;
    const contact = formData.get("contact") as string;

    try {
      await reportIssue({
        playgroundId,
        description,
        contact: contact || null,
      });
      setIsSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        setIsSuccess(false);
      }, 3000);
    } catch (error) {
      console.error("[ReportIssueForm] ❌ Failed to report issue:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="text-amber-800 hover:bg-amber-100 hover:text-amber-900 dark:text-amber-400 dark:hover:bg-amber-950 dark:hover:text-amber-300"
      >
        Report an issue
      </Button>
    );
  }

  return (
    <div className="mt-3 w-full rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/50">
      {isSuccess ? (
        <div className="text-center text-green-700 dark:text-green-400">
          <p>Thank you for your report! We&apos;ll look into it.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label
              htmlFor="description"
              className="text-amber-800 dark:text-amber-400"
            >
              Description
            </Label>
            <Textarea
              id="description"
              name="description"
              placeholder="If you see something, say something. Describe the issue you've noticed."
              required
              className="mt-1 w-full bg-white dark:bg-zinc-900"
              rows={3}
            />
          </div>
          <div>
            <Label
              htmlFor="contact"
              className="text-amber-800 dark:text-amber-400"
            >
              Contact (optional)
            </Label>
            <Input
              id="contact"
              name="contact"
              type="text"
              placeholder="Email or phone number"
              className="mt-1 w-full bg-white dark:bg-zinc-900"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-grow bg-amber-600 text-white hover:bg-amber-700 sm:flex-grow-0 dark:bg-amber-700 dark:hover:bg-amber-600"
            >
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-grow border-amber-300 text-amber-800 hover:bg-amber-100 sm:flex-grow-0 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950"
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

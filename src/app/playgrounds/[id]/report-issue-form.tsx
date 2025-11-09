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
  const [issueType, setIssueType] = useState<"wrong-location" | "incorrect-info" | "inappropriate-content" | "other">("incorrect-info");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const description = formData.get("description") as string;
    const userEmail = formData.get("userEmail") as string;

    try {
      await reportIssue({
        playgroundId,
        issueType,
        description,
        userEmail: userEmail || null,
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
              htmlFor="issueType"
              className="text-amber-800 dark:text-amber-400"
            >
              Issue Type
            </Label>
            <select
              id="issueType"
              value={issueType}
              onChange={(e) => setIssueType(e.target.value as typeof issueType)}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="incorrect-info">Incorrect Information</option>
              <option value="wrong-location">Wrong Location</option>
              <option value="inappropriate-content">Inappropriate Content</option>
              <option value="other">Other</option>
            </select>
          </div>
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
              htmlFor="userEmail"
              className="text-amber-800 dark:text-amber-400"
            >
              Email (optional)
            </Label>
            <Input
              id="userEmail"
              name="userEmail"
              type="email"
              placeholder="your@email.com"
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

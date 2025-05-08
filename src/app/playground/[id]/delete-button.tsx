"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DeletePlaygroundButtonProps {
  id: string;
}

export default function DeletePlaygroundButton({
  id,
}: DeletePlaygroundButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    // Show confirmation dialog
    const confirmed = confirm(
      "Are you sure you want to delete this playground? This action cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    try {
      setIsDeleting(true);

      // Call the DELETE API endpoint
      const response = await fetch(`/api/playgrounds?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete playground");
      }

      // Redirect to home page on success
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Error deleting playground:", error);
      alert("Failed to delete playground. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
      <Trash2 className="h-4 w-4" />
      <span className="hidden sm:block">
        {isDeleting ? "Deleting..." : "Delete"}
      </span>
    </Button>
  );
}

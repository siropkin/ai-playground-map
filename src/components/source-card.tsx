import Image from "next/image";
import Link from "next/link";
import { Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { extractDomain } from "@/lib/utils";

export default function SourceCard({ url }: { url: string }) {
  const domain = extractDomain(url);
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  return (
    <Link href={url} target="_blank" rel="noopener noreferrer">
      <Button variant="outline">
        <div className="flex-shrink-0">
          <Image
            src={faviconUrl}
            alt={domain}
            className="h-4 w-4 rounded-sm"
            width={32}
            height={32}
            unoptimized={true}
          />
        </div>
        <div className="flex-1 overflow-hidden">
          <p className="truncate text-sm">{domain}</p>
        </div>
        <LinkIcon className="text-muted-foreground ml-4 h-4 w-4 flex-shrink-0" />
      </Button>
    </Link>
  );
}

import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading } from "@/components/Loading";
import { getPlaygroundById } from "@/data/playgrounds";

type PlaygroundDetailParams = { id: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<PlaygroundDetailParams>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const playground = await getPlaygroundById(resolvedParams.id);
  if (!playground) {
    return {
      title: "Playground Not Found | Good Playground Map",
      description: "The requested playground was not found.",
    };
  }
  return {
    title: `${playground.name} | Good Playground Map`,
    description: playground.description,
  };
}

export default function PlaygroundLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <Suspense fallback={<Loading />}>{children}</Suspense>;
}

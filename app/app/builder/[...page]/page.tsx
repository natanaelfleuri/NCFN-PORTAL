// @ts-nocheck
import { fetchOneEntry, isPreviewing } from "@builder.io/sdk-react/server";
import { notFound } from "next/navigation";
import { BUILDER_API_KEY } from "@/lib/builder";
import BuilderSection from "@/app/components/BuilderSection";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { page: string[] };
}

export default async function BuilderPage({ params }: PageProps) {
  const urlPath = "/" + (params?.page?.join("/") ?? "");

  const content = await fetchOneEntry({
    model: "page",
    apiKey: BUILDER_API_KEY,
    userAttributes: { urlPath },
  });

  if (!content && !isPreviewing()) {
    notFound();
  }

  return <BuilderSection model="page" content={content} />;
}

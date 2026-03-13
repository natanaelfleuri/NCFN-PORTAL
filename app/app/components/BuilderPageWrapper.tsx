// @ts-nocheck
import { fetchOneEntry } from "@builder.io/sdk-react";
import { BUILDER_API_KEY } from "@/lib/builder";
import BuilderSection from "./BuilderSection";

interface Props {
  urlPath: string;
  children: React.ReactNode;
}

export default async function BuilderPageWrapper({ urlPath, children }: Props) {
  if (!BUILDER_API_KEY) return <>{children}</>;

  const content = await fetchOneEntry({
    model: "page",
    apiKey: BUILDER_API_KEY,
    userAttributes: { urlPath },
  }).catch(() => null);

  if (content) return <BuilderSection model="page" content={content} />;

  return <>{children}</>;
}

"use client";
import { BuilderComponent, useIsPreviewing } from "@builder.io/sdk-react";
import { BUILDER_API_KEY } from "@/lib/builder";

interface BuilderSectionProps {
  model: string;
  content: any;
}

export default function BuilderSection({ model, content }: BuilderSectionProps) {
  const isPreviewing = useIsPreviewing();
  if (!content && !isPreviewing) return null;
  return <BuilderComponent model={model} content={content} apiKey={BUILDER_API_KEY} />;
}

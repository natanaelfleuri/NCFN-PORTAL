"use client";
import { RenderBuilderContent } from "@builder.io/sdk-react";
import { BUILDER_API_KEY } from "@/lib/builder";

interface BuilderSectionProps {
  model: string;
  content: any;
}

export default function BuilderSection({ model, content }: BuilderSectionProps) {
  return (
    <RenderBuilderContent
      model={model}
      content={content}
      apiKey={BUILDER_API_KEY}
    />
  );
}

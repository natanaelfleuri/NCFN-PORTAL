"use client";
import { Content } from "@builder.io/sdk-react";
import { BUILDER_API_KEY } from "@/lib/builder";
import { BUILDER_CUSTOM_COMPONENTS } from "@/app/lib/builder-components";

interface BuilderSectionProps {
  model: string;
  content: any;
}

export default function BuilderSection({ model, content }: BuilderSectionProps) {
  return (
    <Content
      model={model}
      content={content}
      apiKey={BUILDER_API_KEY}
      customComponents={BUILDER_CUSTOM_COMPONENTS}
    />
  );
}

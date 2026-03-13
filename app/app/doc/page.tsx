// @ts-nocheck
export const dynamic = "force-dynamic";
import BuilderPageWrapper from "@/app/components/BuilderPageWrapper";
import DocClient from "@/app/components/DocClient";

export default function DocPage() {
  return (
    <BuilderPageWrapper urlPath="/doc">
      <DocClient />
    </BuilderPageWrapper>
  );
}

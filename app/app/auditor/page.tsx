// @ts-nocheck
export const dynamic = "force-dynamic";
import BuilderPageWrapper from "@/app/components/BuilderPageWrapper";
import AuditorClient from "@/app/components/AuditorClient";

export default function AuditorPage() {
  return (
    <BuilderPageWrapper urlPath="/auditor">
      <AuditorClient />
    </BuilderPageWrapper>
  );
}

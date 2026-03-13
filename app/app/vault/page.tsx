// @ts-nocheck
export const dynamic = "force-dynamic";
import BuilderPageWrapper from "@/app/components/BuilderPageWrapper";
import VaultClient from "@/app/components/VaultClient";

export default function VaultPage() {
  return (
    <BuilderPageWrapper urlPath="/vault">
      <VaultClient />
    </BuilderPageWrapper>
  );
}

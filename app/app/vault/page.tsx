// @ts-nocheck
export const dynamic = "force-dynamic";
import { Suspense } from "react";
import BuilderPageWrapper from "@/app/components/BuilderPageWrapper";
import VaultClient from "@/app/components/VaultClient";

export default function VaultPage() {
  return (
    <BuilderPageWrapper urlPath="/vault">
      <Suspense fallback={null}>
        <VaultClient />
      </Suspense>
    </BuilderPageWrapper>
  );
}

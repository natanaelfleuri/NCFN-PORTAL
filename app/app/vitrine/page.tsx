// @ts-nocheck
export const dynamic = "force-dynamic";
import BuilderPageWrapper from "@/app/components/BuilderPageWrapper";
import VitrineClient from "@/app/components/VitrineClient";

export default function VitrinePage() {
  return (
    <BuilderPageWrapper urlPath="/vitrine">
      <VitrineClient />
    </BuilderPageWrapper>
  );
}

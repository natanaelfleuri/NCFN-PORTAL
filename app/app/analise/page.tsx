// @ts-nocheck
export const dynamic = "force-dynamic";
import AnaliseClient from "@/app/components/AnaliseClient";

export const metadata = {
  title: "Análise Forense | NCFN",
  description: "Envie um arquivo para análise forense digital com cálculo de SHA-256, detecção de Magic Bytes e orçamento instantâneo.",
};

export default function AnalisePage() {
  return <AnaliseClient />;
}

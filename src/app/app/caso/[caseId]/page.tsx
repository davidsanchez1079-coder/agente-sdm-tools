import { CaseDetail } from "@/components/workspace/case-detail";

export default async function CasoDetallePage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  return <CaseDetail caseId={caseId} />;
}

import { notFound } from "next/navigation";
import { getCustomerById } from "@/lib/customers/customers";
import { CustomerDetail } from "@/components/customers/customer-detail";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  const customer = getCustomerById(customerId);
  if (!customer) notFound();
  return <CustomerDetail customer={customer} />;
}

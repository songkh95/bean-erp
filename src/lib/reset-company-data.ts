import { fetchCurrentCompanyId } from "@/lib/current-company";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

type AppSupabase = SupabaseClient<Database>;

/**
 * Deletes all tenant operational data for the current user's company via RLS-scoped deletes.
 * Order respects FKs. `customer_price_history` is removed by ON DELETE CASCADE when customers are deleted.
 * Not a single DB transaction; on partial failure, an error is thrown and some rows may already be deleted.
 */
export async function resetCompanyDataClient(supabase: AppSupabase): Promise<void> {
  const companyId = await fetchCurrentCompanyId();
  if (!companyId) {
    throw new Error("회사 정보를 확인할 수 없습니다.");
  }

  const fail = (step: string, message: string) => new Error(`${step}: ${message}`);

  {
    const { error } = await supabase.from("sales_daily").delete().eq("company_id", companyId);
    if (error) throw fail("판매 데이터 삭제", error.message);
  }
  {
    const { error } = await supabase.from("deposits").delete().eq("company_id", companyId);
    if (error) throw fail("입금 데이터 삭제", error.message);
  }
  {
    const { error } = await supabase.from("payments").delete().eq("company_id", companyId);
    if (error) throw fail("결제 데이터 삭제", error.message);
  }
  {
    const { error } = await supabase.from("monthly_settlements").delete().eq("company_id", companyId);
    if (error) throw fail("월 정산 데이터 삭제", error.message);
  }
  {
    const { error } = await supabase.from("inventory_transactions").delete().eq("company_id", companyId);
    if (error) throw fail("재고 이력 삭제", error.message);
  }
  {
    const { error } = await supabase.from("delivery_drivers").delete().eq("company_id", companyId);
    if (error) throw fail("배송기사 삭제", error.message);
  }
  {
    const { error } = await supabase.from("customer_prices").delete().eq("company_id", companyId);
    if (error) throw fail("거래처 단가 삭제", error.message);
  }
  {
    const { error } = await supabase.from("customers").delete().eq("company_id", companyId);
    if (error) throw fail("거래처 삭제", error.message);
  }
  {
    const { error } = await supabase.from("products").delete().eq("company_id", companyId);
    if (error) throw fail("품목 삭제", error.message);
  }
  {
    const { error } = await supabase.from("regions").delete().eq("company_id", companyId);
    if (error) throw fail("지역 삭제", error.message);
  }

  const { error: companyErr } = await supabase.from("companies").update({
    bank_accounts: [],
    business_number: null,
    ceo_name: null,
    phone: null,
    address: null,
  }).eq("id", companyId);

  if (companyErr) {
    throw fail("회사 프로필 초기화", companyErr.message);
  }
}

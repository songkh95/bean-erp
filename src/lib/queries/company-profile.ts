import { supabase } from "@/lib/supabase/client";

export const companyProfileQueryKey = ["company", "profile"] as const;

export type CompanyProfileQueryData = {
  companyId: string;
  name: string;
  business_number: string | null;
  ceo_name: string | null;
  phone: string | null;
  address: string | null;
};

export async function fetchCompanyProfileForUser(): Promise<CompanyProfileQueryData | null> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(authError.message);
  const user = auth.user;
  if (!user) {
    return null;
  }

  const { data: membership, error: membershipError } = await supabase
    .from("company_users")
    .select("company_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipError) throw new Error(membershipError.message);
  if (!membership?.company_id) {
    return null;
  }

  const { data: company, error: cError } = await supabase
    .from("companies")
    .select("id, name, business_number, ceo_name, phone, address")
    .eq("id", membership.company_id)
    .single();

  if (cError) throw new Error(cError.message);

  return {
    companyId: company.id,
    name: company.name,
    business_number: company.business_number,
    ceo_name: company.ceo_name,
    phone: company.phone,
    address: company.address,
  };
}

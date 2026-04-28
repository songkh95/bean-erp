import { supabase } from "@/lib/supabase/client";

export const companyProfileQueryKey = ["company", "profile"] as const;

export type CompanyProfileQueryData = {
  bank_accounts: { bank_name: string; account_number: string; account_holder: string }[];
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
    .select("id, name, business_number, ceo_name, phone, address, bank_accounts")
    .eq("id", membership.company_id)
    .single();

  if (cError) throw new Error(cError.message);

  return {
    bank_accounts: Array.isArray(company.bank_accounts)
      ? company.bank_accounts
          .map((item) => {
            if (!item || typeof item !== "object") {
              return null;
            }
            const bankName = typeof item.bank_name === "string" ? item.bank_name : "";
            const accountNumber = typeof item.account_number === "string" ? item.account_number : "";
            const accountHolder = typeof item.account_holder === "string" ? item.account_holder : "";
            if (!bankName && !accountNumber && !accountHolder) {
              return null;
            }
            return {
              bank_name: bankName,
              account_number: accountNumber,
              account_holder: accountHolder,
            };
          })
          .filter((item): item is { bank_name: string; account_number: string; account_holder: string } => item !== null)
      : [],
    companyId: company.id,
    name: company.name,
    business_number: company.business_number,
    ceo_name: company.ceo_name,
    phone: company.phone,
    address: company.address,
  };
}

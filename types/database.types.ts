export type BillingType = "monthly" | "biannual" | "annual" | "lifetime";
export type SubscriptionStatus = "active" | "expired" | "cancelled";
export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";
export type AffiliateStatus = "pending" | "settled" | "rejected";
export type SettlementStatus = "pending" | "approved" | "rejected";

export interface MemberGrade {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  sort_order: number;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  grade_id: string | null;
  is_admin: boolean;
  affiliate_code: string | null;
  referred_by: string | null;
  created_at: string;
  // joined
  grade?: MemberGrade | null;
}

export interface Category {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  sort_order: number;
  // joined
  children?: Category[];
}

export interface Program {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  short_desc: string | null;
  description: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  images: string[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // joined
  category?: Category | null;
  pricing_plans?: PricingPlan[];
}

export interface PricingPlan {
  id: string;
  program_id: string;
  name: string;
  billing_type: BillingType;
  price: number;
  original_price: number | null;
  is_active: boolean;
  sort_order: number;
}

export interface Subscription {
  id: string;
  user_id: string;
  program_id: string;
  pricing_plan_id: string;
  status: SubscriptionStatus;
  started_at: string;
  expires_at: string | null;
  payapp_order_id: string | null;
  created_at: string;
  // joined
  program?: Program;
  pricing_plan?: PricingPlan;
}

export interface PaymentRecord {
  id: string;
  user_id: string;
  subscription_id: string | null;
  amount: number;
  status: PaymentStatus;
  payapp_order_id: string | null;
  payapp_data: Record<string, unknown> | null;
  paid_at: string | null;
  created_at: string;
}

export interface AffiliateClick {
  id: string;
  affiliate_code: string;
  referrer_id: string;
  ip_address: string | null;
  user_agent: string | null;
  page_url: string | null;
  created_at: string;
}

export interface GradeProgramAccess {
  id: string;
  grade_id: string;
  program_id: string;
  created_at: string;
  // joined
  grade?: MemberGrade;
  program?: Program;
}

export interface AffiliateRate {
  program_id: string;
  rate: number;
}

export interface AffiliateEarning {
  id: string;
  referrer_id: string;
  payment_record_id: string;
  program_id: string;
  commission_rate: number;
  commission_amount: number;
  status: AffiliateStatus;
  created_at: string;
  // joined
  program?: Program;
  payment_record?: PaymentRecord;
}

export interface SettlementRequest {
  id: string;
  user_id: string;
  amount: number;
  bank_name: string | null;
  account_number: string | null;
  account_holder: string | null;
  status: SettlementStatus;
  admin_note: string | null;
  requested_at: string;
  processed_at: string | null;
}

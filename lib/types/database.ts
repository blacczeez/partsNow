export type UserType = 'mechanic' | 'car_owner' | 'runner' | 'rider' | 'admin';
export type LoyaltyTier = 'new' | 'verified' | 'trusted' | 'partner';
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'sourcing'
  | 'picked'
  | 'dispatched'
  | 'delivered'
  | 'cancelled'
  | 'rejected'
  | 'failed';
export type PaymentMethod = 'wallet' | 'card' | 'bank_transfer' | 'cod';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
export type SourceChannel = 'whatsapp' | 'web' | 'app';
export type DeliveryType = 'express' | 'standard';
export type AssignmentRole = 'runner' | 'rider';
export type AssignmentStatus = 'assigned' | 'accepted' | 'in_progress' | 'completed' | 'failed';
export type WalletTransactionType = 'credit' | 'debit' | 'hold' | 'release';
export type CreditTier = 'starter' | 'standard' | 'premium';

export interface Cluster {
  id: string;
  name: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  delivery_radius_km: number;
  is_active: boolean;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  phone: string;
  email: string | null;
  full_name: string;
  user_type: UserType;
  cluster_id: string | null;
  profile: Record<string, unknown>;
  loyalty_tier: LoyaltyTier;
  total_orders: number;
  lifetime_spend: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  held_balance: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  type: WalletTransactionType;
  amount: number;
  balance_before: number;
  balance_after: number;
  reference: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface RunnerFloat {
  id: string;
  runner_id: string;
  balance: number;
  daily_limit: number;
  last_topped_up: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreditProfile {
  id: string;
  user_id: string;
  credit_tier: CreditTier;
  credit_limit: number;
  credit_used: number;
  credit_available: number;
  repayment_window_hours: number;
  late_fee_percentage: number;
  credit_score: number;
  total_credit_extended: number;
  total_repaid_on_time: number;
  total_repaid_late: number;
  total_written_off: number;
  is_enabled: boolean;
  last_reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreditEvent {
  id: string;
  credit_profile_id: string;
  type: string;
  amount: number;
  order_id: string | null;
  due_at: string | null;
  repaid_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface Vendor {
  id: string;
  cluster_id: string;
  name: string;
  contact_phone: string;
  contact_name: string | null;
  location_in_market: string | null;
  specializations: string[];
  payment_terms: string;
  reliability_score: number;
  total_orders: number;
  quality_issues: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VendorIncident {
  id: string;
  vendor_id: string;
  order_id: string | null;
  type: string;
  description: string | null;
  resolution: string | null;
  created_at: string;
}

export interface Part {
  id: string;
  oem_code: string | null;
  name: string;
  category: string;
  subcategory: string | null;
  compatible_vehicles: Array<{
    make: string;
    model: string;
    year_start: number;
    year_end: number;
    spec?: string;
  }>;
  average_price: number | null;
  weight_kg: number | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  user_id: string;
  make: string;
  model: string;
  year: number;
  spec: string | null;
  nickname: string | null;
  is_primary: boolean;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  cluster_id: string;
  vehicle_id: string | null;
  status: OrderStatus;
  clarification_status: string | null;
  clarification_thread: unknown[];
  delivery_address: string;
  delivery_latitude: number | null;
  delivery_longitude: number | null;
  delivery_type: DeliveryType;
  delivery_notes: string | null;
  subtotal: number;
  markup_amount: number;
  delivery_fee: number;
  discount_amount: number;
  total: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  payment_reference: string | null;
  payment_hold_expires_at: string | null;
  source_channel: SourceChannel;
  whatsapp_conversation_id: string | null;
  customer_notes: string | null;
  internal_notes: string | null;
  price_review_status: string;
  original_total: number | null;
  price_topup_amount: number;
  revised_total: number | null;
  created_at: string;
  confirmed_at: string | null;
  sourcing_started_at: string | null;
  picked_at: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  promised_delivery_minutes: number | null;
  actual_delivery_minutes: number | null;
  rating: number | null;
  rating_comment: string | null;
  delivery_resolution: string | null;
  delivery_retry_after: string | null;
  parts_custody: string | null;
  settlement_status: string | null;
  settlement_fault: string | null;
  parts_recovery_rate: number | null;
  return_handling_fee: number | null;
  settlement_refund_amount: number | null;
  settlement_breakdown: Record<string, unknown> | null;
  settlement_completed_at: string | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  part_id: string | null;
  vendor_id: string | null;
  description: string;
  oem_code: string | null;
  quantity: number;
  vendor_price: number | null;
  selling_price: number;
  expected_vendor_price: number | null;
  max_vendor_price: number | null;
  price_review_status: string | null;
  customer_image_url: string | null;
  qc_image_url: string | null;
  is_found: boolean;
  is_unavailable: boolean;
  unavailable_reason: string | null;
  created_at: string;
}

export interface OrderAssignment {
  id: string;
  order_id: string;
  assignee_id: string;
  role: AssignmentRole;
  status: AssignmentStatus;
  assigned_at: string;
  accepted_at: string | null;
  completed_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  pickup_confirmed_at: string | null;
  pickup_photo_url: string | null;
}

export interface DeliveryTracking {
  id: string;
  order_id: string;
  rider_id: string;
  current_latitude: number | null;
  current_longitude: number | null;
  eta_minutes: number | null;
  partner_tracking_url: string | null;
  partner_reference: string | null;
  updated_at: string;
}

export interface DeliveryAttempt {
  id: string;
  order_id: string;
  rider_id: string;
  attempt_number: number;
  status: string;
  failure_reason: string | null;
  photo_url: string | null;
  notes: string | null;
  attempted_at: string;
}

export interface PaymentEvent {
  id: string;
  order_id: string | null;
  wallet_id: string | null;
  type: string;
  amount: number;
  provider: string | null;
  provider_reference: string | null;
  status: string;
  raw_response: Record<string, unknown>;
  created_at: string;
}

export interface RunnerShift {
  id: string;
  runner_id: string;
  cluster_id: string;
  started_at: string;
  ended_at: string | null;
  starting_float: number;
  ending_float: number | null;
  orders_completed: number;
  total_sourced: number;
  commission_earned: number;
  is_reconciled: boolean;
  reconciled_at: string | null;
  reconciled_by: string | null;
  discrepancy_amount: number;
  discrepancy_notes: string | null;
}

export interface SystemConfig {
  key: string;
  value: unknown;
  description: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface VendorPart {
  id: string;
  vendor_id: string;
  part_id: string;
  last_price: number;
  price_count: number;
  average_price: number;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

// Joined types for common queries
export interface OrderWithItems extends Order {
  order_items: OrderItem[];
}

export interface UserWithWallet extends User {
  wallets: Wallet[];
}

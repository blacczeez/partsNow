import type {
  User,
  Wallet,
  Order,
  OrderItem,
  Vendor,
  Cluster,
} from '@/lib/types/database';

let counter = 0;
function uuid(): string {
  counter++;
  return `00000000-0000-0000-0000-${String(counter).padStart(12, '0')}`;
}

export function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: uuid(),
    phone: '2348012345678',
    email: null,
    full_name: 'Test User',
    user_type: 'car_owner',
    cluster_id: null,
    profile: {},
    loyalty_tier: 'new',
    total_orders: 0,
    lifetime_spend: 0,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

export function buildWallet(overrides: Partial<Wallet> = {}): Wallet {
  return {
    id: uuid(),
    user_id: uuid(),
    balance: 10000,
    held_balance: 0,
    currency: 'NGN',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

export function buildOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: uuid(),
    order_number: 'ORD-20240115-001',
    customer_id: uuid(),
    cluster_id: uuid(),
    vehicle_id: null,
    status: 'pending',
    clarification_status: null,
    clarification_thread: [],
    delivery_address: '123 Test Street, Ikeja, Lagos',
    delivery_latitude: null,
    delivery_longitude: null,
    delivery_type: 'express',
    delivery_notes: null,
    subtotal: 10000,
    markup_amount: 1500,
    delivery_fee: 1500,
    discount_amount: 0,
    total: 13000,
    payment_method: 'wallet',
    payment_status: 'pending',
    payment_reference: null,
    payment_hold_expires_at: null,
    source_channel: 'web',
    whatsapp_conversation_id: null,
    customer_notes: null,
    internal_notes: null,
    created_at: new Date().toISOString(),
    confirmed_at: null,
    sourcing_started_at: null,
    picked_at: null,
    dispatched_at: null,
    delivered_at: null,
    cancelled_at: null,
    promised_delivery_minutes: 45,
    actual_delivery_minutes: null,
    rating: null,
    rating_comment: null,
    ...overrides,
  };
}

export function buildOrderItem(overrides: Partial<OrderItem> = {}): OrderItem {
  return {
    id: uuid(),
    order_id: uuid(),
    part_id: null,
    vendor_id: null,
    description: 'Brake pad',
    oem_code: null,
    quantity: 1,
    vendor_price: null,
    selling_price: 5750,
    customer_image_url: null,
    qc_image_url: null,
    is_found: false,
    is_unavailable: false,
    unavailable_reason: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function buildVendor(overrides: Partial<Vendor> = {}): Vendor {
  return {
    id: uuid(),
    cluster_id: uuid(),
    name: 'Test Vendor',
    contact_phone: '2348012345678',
    contact_name: 'Vendor Contact',
    location_in_market: 'Line 5, Shop 23',
    specializations: ['Toyota', 'Honda'],
    payment_terms: 'cash',
    reliability_score: 100,
    total_orders: 0,
    quality_issues: 0,
    notes: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

export function buildCluster(overrides: Partial<Cluster> = {}): Cluster {
  return {
    id: uuid(),
    name: 'Lagos-Ladipo',
    city: 'Lagos',
    state: 'Lagos',
    latitude: 6.5244,
    longitude: 3.3792,
    delivery_radius_km: 15,
    is_active: true,
    config: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

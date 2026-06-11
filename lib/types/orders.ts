import type { OrderStatus, PaymentMethod, SourceChannel, DeliveryType } from './database';

export interface CreateOrderInput {
  items: Array<{
    partId?: string;
    description: string;
    quantity: number;
    price: number;
    imageUrl?: string;
  }>;
  vehicleId?: string;
  deliveryAddress: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  deliveryNotes?: string;
  paymentMethod: PaymentMethod;
  sourceChannel: SourceChannel;
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  total: number;
  itemCount: number;
  deliveryType: DeliveryType;
  createdAt: string;
  deliveredAt: string | null;
}

export interface OrderTracking {
  orderId: string;
  status: OrderStatus;
  riderLatitude: number | null;
  riderLongitude: number | null;
  etaMinutes: number | null;
  partnerTrackingUrl: string | null;
}

export interface PricingBreakdown {
  subtotal: number;
  markupAmount: number;
  deliveryFee: number;
  discountAmount: number;
  total: number;
  totalWeightKg?: number;
  deliveryTierLabel?: string;
  deliveryTierId?: string;
  deliveryType?: 'express' | 'standard';
  freeDeliveryApplied?: boolean;
  deliveryFeeLabel?: string;
}

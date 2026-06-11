# Weight-Based Delivery Design

## Summary

Parts catalogue weight drives Lagos delivery fee tiers, order snapshots, checkout visibility, and rider vehicle routing.

## Rules

- Order weight = Σ (part `weight_kg` × quantity)
- Free delivery when parts subtotal ≥ threshold **and** tier is light or medium (configurable)
- Heavy/oversized tiers always pay configured delivery fee
- Tier config stored in `system_config.delivery_weight_tiers`

## Data

- `orders`: `total_weight_kg`, `delivery_tier`, `delivery_vehicle_type`, `delivery_fee_breakdown`
- `order_items.weight_kg` snapshot at checkout
- Parts require `weight_kg` for catalogue orders

## Admin

- **Settings → Manage tiers** (`/admin/settings/delivery`)

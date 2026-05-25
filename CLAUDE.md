# CLAUDE.md — Spare Parts Delivery Platform

> **Project Codename:** PartsNow (placeholder — rename as needed)
> **Version:** 1.0.0
> **Last Updated:** May 24, 2026

## Executive Summary

This is a comprehensive implementation specification for an on-demand, instant-delivery spare parts platform targeting mechanics and car owners in Lagos, Nigeria. The platform promises 45-minute delivery of automotive spare parts from Ladipo and ASPAMDA markets.

**Primary User:** Mechanics (via WhatsApp)
**Secondary User:** Car Owners (via Web App)
**Business Model:** Marketplace with 15% markup on vendor prices

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [System Architecture](#3-system-architecture)
4. [Database Schema](#4-database-schema)
5. [Environment Variables & Feature Flags](#5-environment-variables--feature-flags)
6. [API Structure](#6-api-structure)
7. [User Flows & Workflows](#7-user-flows--workflows)
8. [Design System](#8-design-system)
9. [Component Specifications](#9-component-specifications)
10. [Third-Party Integrations](#10-third-party-integrations)
11. [Edge Cases & Error Handling](#11-edge-cases--error-handling)
12. [Security Considerations](#12-security-considerations)
13. [Development Phases](#13-development-phases)

---

## 1. Project Overview

### 1.1 Problem Statement

Mechanics in Lagos waste 2-4 hours daily sending apprentices to Ladipo/ASPAMDA markets for spare parts. This results in:
- Lost revenue (can't complete jobs while waiting)
- Frustrated customers
- Inefficient cash flow

### 1.2 Solution

A platform that enables mechanics to order parts via WhatsApp voice note and receive delivery within 45 minutes. On-ground runners source parts from vetted vendors, and dispatch riders deliver to workshops.

### 1.3 User Segments

| Segment | Primary Channel | Key Needs |
|---------|----------------|-----------|
| **Mechanics** | WhatsApp | Speed, voice-first, credit access |
| **Car Owners** | Web App (PWA) | Guided selection, transparency, tracking |
| **Runners** | PWA | Clear orders, easy QC, fast handoff |
| **Riders** | PWA / Partner App | Navigation, delivery confirmation |
| **Admins** | Web Dashboard | Monitoring, intervention, analytics |

### 1.4 Business Model

```
Revenue = (Vendor Price × Markup %) + Delivery Fee
```

| Parameter | Value | Configurable |
|-----------|-------|--------------|
| Default Markup | 15% | Yes |
| Delivery Fee | ₦1,500 | Yes |
| Free Delivery Threshold | ₦50,000 | Yes |

### 1.5 Key Metrics (Targets)

- Order-to-delivery time: <45 minutes (express zone)
- Sourcing time: <30 minutes
- Customer satisfaction: >4.5/5
- Part accuracy rate: >98%

---

## 2. Tech Stack

### 2.1 Core Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Frontend** | Next.js 14+ (App Router) | SSR, API routes, single codebase |
| **Styling** | Tailwind CSS | Rapid development, consistent design |
| **Database** | Supabase (PostgreSQL) | Real-time, auth, storage, edge functions |
| **Hosting** | Vercel | Seamless Next.js integration, edge network |
| **Auth** | Supabase Auth | Phone OTP, email magic links |
| **Real-time** | Supabase Realtime | Order status, rider tracking |
| **Storage** | Supabase Storage | Part images, QC photos, receipts |
| **Payments** | Paystack | Nigerian market standard |
| **WhatsApp** | Wati (or Twilio) | Bot flows, voice note handling |
| **SMS Fallback** | Termii | Backup notifications |
| **Dispatch Partner** | Kwik / MAX API | Overflow delivery capacity |
| **Background Jobs** | Inngest (when needed) | Complex workflows, retries |

### 2.2 Package Dependencies

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@supabase/supabase-js": "^2.39.0",
    "@supabase/ssr": "^0.1.0",
    "tailwindcss": "^3.4.0",
    "lucide-react": "^0.300.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    "zod": "^3.22.0",
    "date-fns": "^3.0.0",
    "react-hook-form": "^7.49.0",
    "@hookform/resolvers": "^3.3.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/react": "^18.2.0",
    "@types/node": "^20.10.0",
    "eslint": "^8.56.0",
    "eslint-config-next": "^14.0.0",
    "prettier": "^3.2.0",
    "prettier-plugin-tailwindcss": "^0.5.0"
  }
}
```

### 2.3 Project Structure

```
/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── verify/
│   ├── (customer)/
│   │   ├── page.tsx                 # Home
│   │   ├── search/
│   │   ├── orders/
│   │   ├── order/[id]/
│   │   ├── cart/
│   │   ├── checkout/
│   │   ├── wallet/
│   │   └── account/
│   ├── (runner)/
│   │   ├── dashboard/
│   │   ├── order/[id]/
│   │   └── shift/
│   ├── (rider)/
│   │   ├── dashboard/
│   │   ├── delivery/[id]/
│   │   └── history/
│   ├── (admin)/
│   │   ├── dashboard/
│   │   ├── orders/
│   │   ├── runners/
│   │   ├── riders/
│   │   ├── vendors/
│   │   ├── customers/
│   │   ├── payments/
│   │   ├── analytics/
│   │   └── settings/
│   ├── api/
│   │   ├── auth/
│   │   ├── orders/
│   │   ├── users/
│   │   ├── wallet/
│   │   ├── inventory/
│   │   ├── dispatch/
│   │   ├── webhooks/
│   │   │   ├── paystack/
│   │   │   ├── whatsapp/
│   │   │   └── dispatch/
│   │   └── admin/
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                          # Base components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   ├── modal.tsx
│   │   ├── bottom-sheet.tsx
│   │   ├── toast.tsx
│   │   └── ...
│   ├── forms/                       # Form components
│   ├── layout/                      # Layout components
│   │   ├── bottom-nav.tsx
│   │   ├── admin-sidebar.tsx
│   │   └── header.tsx
│   ├── orders/                      # Order-specific components
│   ├── tracking/                    # Tracking components
│   └── ...
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── services/                    # Business logic
│   │   ├── orders.ts
│   │   ├── users.ts
│   │   ├── wallet.ts
│   │   ├── inventory.ts
│   │   ├── dispatch.ts
│   │   ├── notifications.ts
│   │   └── credit.ts
│   ├── utils/
│   │   ├── cn.ts                    # className utility
│   │   ├── format.ts                # Formatting helpers
│   │   └── validation.ts
│   ├── hooks/
│   │   ├── use-realtime-order.ts
│   │   ├── use-wallet.ts
│   │   └── ...
│   ├── constants/
│   │   ├── order-status.ts
│   │   └── ...
│   └── types/
│       ├── database.ts              # Generated from Supabase
│       ├── orders.ts
│       └── ...
├── public/
│   ├── icons/
│   └── images/
├── supabase/
│   ├── migrations/
│   └── seed.sql
├── .env.local
├── .env.example
├── tailwind.config.ts
├── next.config.js
├── tsconfig.json
└── CLAUDE.md                        # This file
```

---

## 3. System Architecture

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                   CLIENTS                                        │
├─────────────────┬─────────────────┬──────────────────┬─────────────────────────┤
│  WhatsApp Bot   │   Web App       │   Admin Dashboard │   Runner/Rider PWA     │
│  (Mechanics)    │   (Car Owners)  │   (Ops Team)      │   (Field Staff)        │
│                 │                 │                   │                         │
│  Wati/Twilio    │   Next.js PWA   │   Next.js         │   Next.js PWA          │
│  Webhooks       │   Tailwind      │   Tailwind        │   Lightweight          │
└────────┬────────┴────────┬────────┴─────────┬─────────┴────────────┬────────────┘
         │                 │                  │                      │
         └─────────────────┴──────────────────┴──────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              NEXT.JS API ROUTES                                  │
│                                                                                  │
│  /api/orders/*        - Create, update, cancel orders                           │
│  /api/users/*         - Auth, profiles, wallet                                  │
│  /api/inventory/*     - Part search, availability                               │
│  /api/dispatch/*      - Rider assignment, tracking                              │
│  /api/webhooks/*      - Paystack, WhatsApp, logistics partners                  │
│  /api/admin/*         - Dashboard operations                                    │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                  SUPABASE                                        │
├─────────────────┬─────────────────┬─────────────────┬───────────────────────────┤
│   PostgreSQL    │   Auth          │   Storage       │   Realtime                │
│                 │                 │                 │                           │
│  - Users        │   - Phone OTP   │   - Part images │   - Order status updates  │
│  - Orders       │   - Email/Magic │   - Receipts    │   - Rider location        │
│  - Inventory    │   - Role-based  │   - QC photos   │   - Runner pings          │
│  - Wallets      │                 │                 │                           │
│  - Clusters     │                 │                 │                           │
│  - Credit       │                 │                 │                           │
└─────────────────┴─────────────────┴─────────────────┴───────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            EXTERNAL SERVICES                                     │
├─────────────────┬─────────────────┬─────────────────┬───────────────────────────┤
│   Paystack      │   Wati/Twilio   │   Kwik/MAX      │   Termii                  │
│                 │                 │                 │                           │
│  - Payments     │   - WhatsApp    │   - Overflow    │   - SMS Fallback          │
│  - Transfers    │   - Voice trans │     dispatch    │                           │
│  - Webhooks     │   - Bot flows   │   - Tracking    │                           │
└─────────────────┴─────────────────┴─────────────────┴───────────────────────────┘
```

### 3.2 Data Flow: Order Lifecycle

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   PENDING    │────▶│  CONFIRMED   │────▶│   SOURCING   │────▶│    PICKED    │
│              │     │              │     │              │     │              │
│ Order placed │     │ Payment done │     │ Runner       │     │ Parts ready  │
│ Awaiting pay │     │ Runner pinged│     │ at market    │     │ At gate      │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                                                       │
       ┌───────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐
│  DISPATCHED  │────▶│  DELIVERED   │
│              │     │              │
│ Rider en     │     │ Customer     │
│ route        │     │ received     │
└──────────────┘     └──────────────┘

FAILURE STATES:
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  CANCELLED   │     │   REJECTED   │     │    FAILED    │
│              │     │              │     │              │
│ By customer  │     │ Customer     │     │ Delivery     │
│ or system    │     │ refused part │     │ failed       │
└──────────────┘     └──────────────┘     └──────────────┘
```

---

## 4. Database Schema

### 4.1 Core Tables

```sql
-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE user_type AS ENUM ('mechanic', 'car_owner', 'runner', 'rider', 'admin');
CREATE TYPE loyalty_tier AS ENUM ('new', 'verified', 'trusted', 'partner');
CREATE TYPE order_status AS ENUM (
  'pending', 'confirmed', 'sourcing', 'picked', 
  'dispatched', 'delivered', 'cancelled', 'rejected', 'failed'
);
CREATE TYPE payment_method AS ENUM ('wallet', 'card', 'bank_transfer', 'cod');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
CREATE TYPE source_channel AS ENUM ('whatsapp', 'web', 'app');
CREATE TYPE delivery_type AS ENUM ('express', 'standard');
CREATE TYPE assignment_role AS ENUM ('runner', 'rider');
CREATE TYPE assignment_status AS ENUM ('assigned', 'accepted', 'in_progress', 'completed', 'failed');
CREATE TYPE wallet_transaction_type AS ENUM ('credit', 'debit', 'hold', 'release');
CREATE TYPE credit_tier AS ENUM ('starter', 'standard', 'premium');

-- ============================================
-- MARKET CLUSTERS (Multi-tenancy foundation)
-- ============================================

CREATE TABLE clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                           -- "Lagos-Ladipo", "Lagos-ASPAMDA", "Abuja-Apo"
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  delivery_radius_km INTEGER NOT NULL DEFAULT 15,
  is_active BOOLEAN NOT NULL DEFAULT true,
  config JSONB DEFAULT '{}',                    -- Cluster-specific overrides
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- USERS (Polymorphic)
-- ============================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE NOT NULL,
  email TEXT,
  full_name TEXT NOT NULL,
  user_type user_type NOT NULL,
  cluster_id UUID REFERENCES clusters(id),      -- For runners/riders
  profile JSONB DEFAULT '{}',                   -- Flexible: workshop_address, vehicle_info, etc.
  loyalty_tier loyalty_tier NOT NULL DEFAULT 'new',
  total_orders INTEGER NOT NULL DEFAULT 0,
  lifetime_spend DECIMAL(12, 2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_type ON users(user_type);
CREATE INDEX idx_users_cluster ON users(cluster_id);

-- ============================================
-- WALLETS
-- ============================================

CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
  held_balance DECIMAL(12, 2) NOT NULL DEFAULT 0,  -- For pending orders
  currency TEXT NOT NULL DEFAULT 'NGN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT positive_balance CHECK (balance >= 0),
  CONSTRAINT positive_held CHECK (held_balance >= 0)
);

CREATE UNIQUE INDEX idx_wallets_user ON wallets(user_id);

-- ============================================
-- WALLET TRANSACTIONS (Ledger)
-- ============================================

CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallets(id),
  type wallet_transaction_type NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  balance_before DECIMAL(12, 2) NOT NULL,
  balance_after DECIMAL(12, 2) NOT NULL,
  reference TEXT,                                -- order_id, topup_ref, etc.
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wallet_tx_wallet ON wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_tx_reference ON wallet_transactions(reference);
CREATE INDEX idx_wallet_tx_created ON wallet_transactions(created_at);

-- ============================================
-- RUNNER FLOATS
-- ============================================

CREATE TABLE runner_floats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  runner_id UUID NOT NULL REFERENCES users(id),
  balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
  daily_limit DECIMAL(12, 2) NOT NULL DEFAULT 200000,
  last_topped_up TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT positive_float CHECK (balance >= 0)
);

CREATE UNIQUE INDEX idx_runner_floats_runner ON runner_floats(runner_id);

-- ============================================
-- CREDIT PROFILES (Feature Flag Controlled)
-- ============================================

CREATE TABLE credit_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  credit_tier credit_tier NOT NULL DEFAULT 'starter',
  credit_limit DECIMAL(12, 2) NOT NULL DEFAULT 30000,
  credit_used DECIMAL(12, 2) NOT NULL DEFAULT 0,
  credit_available DECIMAL(12, 2) GENERATED ALWAYS AS (credit_limit - credit_used) STORED,
  repayment_window_hours INTEGER NOT NULL DEFAULT 48,
  late_fee_percentage DECIMAL(5, 2) NOT NULL DEFAULT 2,
  credit_score INTEGER NOT NULL DEFAULT 100,
  total_credit_extended DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_repaid_on_time DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_repaid_late DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_written_off DECIMAL(12, 2) NOT NULL DEFAULT 0,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  last_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_credit_profiles_user ON credit_profiles(user_id);

-- ============================================
-- CREDIT EVENTS (Ledger for credit)
-- ============================================

CREATE TABLE credit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_profile_id UUID NOT NULL REFERENCES credit_profiles(id),
  type TEXT NOT NULL,                           -- 'extended', 'repaid', 'late_fee', 'limit_change', 'written_off'
  amount DECIMAL(12, 2) NOT NULL,
  order_id UUID,
  due_at TIMESTAMPTZ,
  repaid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_credit_events_profile ON credit_events(credit_profile_id);

-- ============================================
-- VENDORS
-- ============================================

CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID NOT NULL REFERENCES clusters(id),
  name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_name TEXT,
  location_in_market TEXT,                      -- "Line 5, Shop 23"
  specializations TEXT[] DEFAULT '{}',          -- ["Toyota", "Honda", "German"]
  payment_terms TEXT DEFAULT 'cash',            -- 'cash', 'float', 'invoice'
  reliability_score INTEGER NOT NULL DEFAULT 100,
  total_orders INTEGER NOT NULL DEFAULT 0,
  quality_issues INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vendors_cluster ON vendors(cluster_id);
CREATE INDEX idx_vendors_active ON vendors(is_active);

-- ============================================
-- VENDOR INCIDENTS
-- ============================================

CREATE TABLE vendor_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  order_id UUID,
  type TEXT NOT NULL,                           -- 'out_of_stock', 'price_discrepancy', 'quality_issue', 'payment_issue'
  description TEXT,
  resolution TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vendor_incidents_vendor ON vendor_incidents(vendor_id);

-- ============================================
-- PARTS CATALOG
-- ============================================

CREATE TABLE parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  oem_code TEXT,                                -- Standard part number
  name TEXT NOT NULL,
  category TEXT NOT NULL,                       -- "Brakes", "Engine", "Suspension"
  subcategory TEXT,
  compatible_vehicles JSONB DEFAULT '[]',       -- [{make, model, year_start, year_end, spec}]
  average_price DECIMAL(12, 2),                 -- Baseline, updated periodically
  weight_kg DECIMAL(6, 2),                      -- For dispatch routing
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_parts_category ON parts(category);
CREATE INDEX idx_parts_oem ON parts(oem_code);
CREATE INDEX idx_parts_name ON parts USING gin(to_tsvector('english', name));

-- ============================================
-- VEHICLES (Customer's saved vehicles)
-- ============================================

CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  spec TEXT,                                    -- "American", "European", "Nigerian"
  nickname TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vehicles_user ON vehicles(user_id);

-- ============================================
-- ORDERS
-- ============================================

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,            -- Human-readable: "ORD-20240115-001"
  customer_id UUID NOT NULL REFERENCES users(id),
  cluster_id UUID NOT NULL REFERENCES clusters(id),
  vehicle_id UUID REFERENCES vehicles(id),
  
  -- Status
  status order_status NOT NULL DEFAULT 'pending',
  clarification_status TEXT,                    -- null, 'requested', 'responded', 'resolved'
  clarification_thread JSONB DEFAULT '[]',
  
  -- Delivery
  delivery_address TEXT NOT NULL,
  delivery_latitude DECIMAL(10, 8),
  delivery_longitude DECIMAL(11, 8),
  delivery_type delivery_type NOT NULL DEFAULT 'express',
  delivery_notes TEXT,
  
  -- Pricing
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,   -- Parts cost (vendor price)
  markup_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  delivery_fee DECIMAL(12, 2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total DECIMAL(12, 2) NOT NULL DEFAULT 0,
  
  -- Payment
  payment_method payment_method NOT NULL,
  payment_status payment_status NOT NULL DEFAULT 'pending',
  payment_reference TEXT,
  payment_hold_expires_at TIMESTAMPTZ,
  
  -- Source
  source_channel source_channel NOT NULL,
  whatsapp_conversation_id TEXT,
  
  -- Notes
  customer_notes TEXT,                          -- Voice note transcription, special instructions
  internal_notes TEXT,                          -- Admin notes
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  sourcing_started_at TIMESTAMPTZ,
  picked_at TIMESTAMPTZ,
  dispatched_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  
  -- Metrics
  promised_delivery_minutes INTEGER,
  actual_delivery_minutes INTEGER,
  rating INTEGER,                               -- 1-5
  rating_comment TEXT
);

CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_cluster ON orders(cluster_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at);
CREATE INDEX idx_orders_number ON orders(order_number);

-- ============================================
-- ORDER ITEMS
-- ============================================

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  part_id UUID REFERENCES parts(id),            -- Nullable if custom part
  vendor_id UUID REFERENCES vendors(id),
  
  -- Part details (denormalized for history)
  description TEXT NOT NULL,
  oem_code TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  
  -- Pricing
  vendor_price DECIMAL(12, 2),                  -- What runner paid
  selling_price DECIMAL(12, 2) NOT NULL,        -- What customer pays
  
  -- Verification
  customer_image_url TEXT,                      -- Customer's uploaded photo
  qc_image_url TEXT,                            -- Runner's verification photo
  
  -- Status
  is_found BOOLEAN NOT NULL DEFAULT false,
  is_unavailable BOOLEAN NOT NULL DEFAULT false,
  unavailable_reason TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);

-- ============================================
-- ORDER ASSIGNMENTS (Runners + Riders)
-- ============================================

CREATE TABLE order_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  assignee_id UUID NOT NULL REFERENCES users(id),
  role assignment_role NOT NULL,
  status assignment_status NOT NULL DEFAULT 'assigned',
  
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  rejection_reason TEXT,
  notes TEXT,
  
  -- For riders
  pickup_confirmed_at TIMESTAMPTZ,
  pickup_photo_url TEXT
);

CREATE INDEX idx_assignments_order ON order_assignments(order_id);
CREATE INDEX idx_assignments_assignee ON order_assignments(assignee_id);

-- ============================================
-- DELIVERY TRACKING
-- ============================================

CREATE TABLE delivery_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  rider_id UUID NOT NULL REFERENCES users(id),
  
  current_latitude DECIMAL(10, 8),
  current_longitude DECIMAL(11, 8),
  eta_minutes INTEGER,
  
  partner_tracking_url TEXT,                    -- If using Kwik/MAX
  partner_reference TEXT,
  
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tracking_order ON delivery_tracking(order_id);

-- ============================================
-- DELIVERY ATTEMPTS
-- ============================================

CREATE TABLE delivery_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  rider_id UUID NOT NULL REFERENCES users(id),
  attempt_number INTEGER NOT NULL DEFAULT 1,
  
  status TEXT NOT NULL,                         -- 'completed', 'failed_no_answer', 'failed_wrong_address', 'failed_customer_refused'
  failure_reason TEXT,
  photo_url TEXT,
  notes TEXT,
  
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_delivery_attempts_order ON delivery_attempts(order_id);

-- ============================================
-- PAYMENT EVENTS
-- ============================================

CREATE TABLE payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  wallet_id UUID REFERENCES wallets(id),
  
  type TEXT NOT NULL,                           -- 'charge_attempted', 'charge_succeeded', 'charge_failed', 'refund_initiated', 'refund_completed'
  amount DECIMAL(12, 2) NOT NULL,
  provider TEXT,                                -- 'paystack', 'wallet'
  provider_reference TEXT,
  status TEXT NOT NULL,
  
  raw_response JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_events_order ON payment_events(order_id);
CREATE INDEX idx_payment_events_reference ON payment_events(provider_reference);

-- ============================================
-- RUNNER SHIFTS
-- ============================================

CREATE TABLE runner_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  runner_id UUID NOT NULL REFERENCES users(id),
  cluster_id UUID NOT NULL REFERENCES clusters(id),
  
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  
  starting_float DECIMAL(12, 2) NOT NULL,
  ending_float DECIMAL(12, 2),
  
  orders_completed INTEGER NOT NULL DEFAULT 0,
  total_sourced DECIMAL(12, 2) NOT NULL DEFAULT 0,
  commission_earned DECIMAL(12, 2) NOT NULL DEFAULT 0,
  
  is_reconciled BOOLEAN NOT NULL DEFAULT false,
  reconciled_at TIMESTAMPTZ,
  reconciled_by UUID REFERENCES users(id),
  discrepancy_amount DECIMAL(12, 2) DEFAULT 0,
  discrepancy_notes TEXT
);

CREATE INDEX idx_shifts_runner ON runner_shifts(runner_id);
CREATE INDEX idx_shifts_date ON runner_shifts(started_at);

-- ============================================
-- SYSTEM CONFIG
-- ============================================

CREATE TABLE system_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

-- ============================================
-- AUDIT LOG
-- ============================================

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_created ON audit_log(created_at);
```

### 4.2 Row Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
-- ... (enable on all tables)

-- Users can read their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Wallet policies
CREATE POLICY "Users can view own wallet" ON wallets
  FOR SELECT USING (auth.uid() = user_id);

-- Orders policies
CREATE POLICY "Customers can view own orders" ON orders
  FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Runners can view assigned orders" ON orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM order_assignments 
      WHERE order_assignments.order_id = orders.id 
      AND order_assignments.assignee_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all orders" ON orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.user_type = 'admin'
    )
  );

-- Add similar policies for other tables...
```

### 4.3 Database Functions

```sql
-- Generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  today_count INTEGER;
  date_part TEXT;
BEGIN
  date_part := TO_CHAR(NOW(), 'YYYYMMDD');
  
  SELECT COUNT(*) + 1 INTO today_count
  FROM orders
  WHERE order_number LIKE 'ORD-' || date_part || '-%';
  
  RETURN 'ORD-' || date_part || '-' || LPAD(today_count::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Wallet debit with validation
CREATE OR REPLACE FUNCTION debit_wallet(
  p_wallet_id UUID,
  p_amount DECIMAL,
  p_reference TEXT,
  p_description TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_balance DECIMAL;
BEGIN
  -- Lock the wallet row
  SELECT balance INTO v_current_balance
  FROM wallets
  WHERE id = p_wallet_id
  FOR UPDATE;
  
  -- Check sufficient balance
  IF v_current_balance < p_amount THEN
    RETURN FALSE;
  END IF;
  
  -- Debit wallet
  UPDATE wallets
  SET balance = balance - p_amount,
      updated_at = NOW()
  WHERE id = p_wallet_id;
  
  -- Log transaction
  INSERT INTO wallet_transactions (wallet_id, type, amount, balance_before, balance_after, reference, description)
  VALUES (p_wallet_id, 'debit', p_amount, v_current_balance, v_current_balance - p_amount, p_reference, p_description);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Update loyalty tier based on order history
CREATE OR REPLACE FUNCTION update_loyalty_tier()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users
  SET loyalty_tier = CASE
    WHEN total_orders >= 50 AND lifetime_spend >= 500000 THEN 'partner'
    WHEN total_orders >= 20 THEN 'trusted'
    WHEN total_orders >= 5 THEN 'verified'
    ELSE 'new'
  END,
  updated_at = NOW()
  WHERE id = NEW.customer_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_order_delivered
AFTER UPDATE OF status ON orders
FOR EACH ROW
WHEN (NEW.status = 'delivered' AND OLD.status != 'delivered')
EXECUTE FUNCTION update_loyalty_tier();
```

---

## 5. Environment Variables & Feature Flags

### 5.1 Environment Variables

Create `.env.local` with these variables:

```env
# ============================================
# APP
# ============================================
NEXT_PUBLIC_APP_NAME="PartsNow"
NEXT_PUBLIC_APP_URL="https://partsnow.ng"
NEXT_PUBLIC_APP_ENV="development"  # development | staging | production

# ============================================
# SUPABASE
# ============================================
NEXT_PUBLIC_SUPABASE_URL="https://xxxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJxxx..."
SUPABASE_SERVICE_ROLE_KEY="eyJxxx..."
SUPABASE_JWT_SECRET="your-jwt-secret"

# ============================================
# BUSINESS MODEL
# ============================================
DEFAULT_MARKUP_PERCENTAGE=15
FREE_DELIVERY_THRESHOLD=50000
STANDARD_DELIVERY_FEE=1500

# ============================================
# DELIVERY
# ============================================
EXPRESS_DELIVERY_RADIUS_KM=10
EXPRESS_DELIVERY_PROMISE_MINUTES=45
STANDARD_DELIVERY_PROMISE_MINUTES=120

# ============================================
# LOYALTY TIERS
# ============================================
TIER_VERIFIED_MIN_ORDERS=5
TIER_TRUSTED_MIN_ORDERS=20
TIER_TRUSTED_DISCOUNT_PERCENTAGE=5
TIER_PARTNER_MIN_ORDERS=50
TIER_PARTNER_MIN_LIFETIME_SPEND=500000
TIER_PARTNER_DISCOUNT_PERCENTAGE=8

# ============================================
# CREDIT SYSTEM
# ============================================
CREDIT_SYSTEM_ENABLED=false
CREDIT_STARTER_LIMIT=30000
CREDIT_STARTER_REPAYMENT_HOURS=48
CREDIT_STANDARD_LIMIT=75000
CREDIT_STANDARD_REPAYMENT_HOURS=72
CREDIT_PREMIUM_LIMIT=150000
CREDIT_PREMIUM_REPAYMENT_HOURS=168
CREDIT_LATE_FEE_PERCENTAGE=2
CREDIT_REMINDER_HOURS_BEFORE_DUE=24
CREDIT_LATE_FEE_APPLIED_AFTER_HOURS=24
CREDIT_LIMIT_REDUCED_AFTER_DAYS=7
CREDIT_ACCOUNT_SUSPENDED_AFTER_DAYS=14
CREDIT_AUTO_DEBIT_ENABLED=true

# ============================================
# PAYMENTS (Paystack)
# ============================================
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY="pk_test_xxx"
PAYSTACK_SECRET_KEY="sk_test_xxx"
PAYSTACK_WEBHOOK_SECRET="whsec_xxx"
COD_ENABLED=true
COD_MAX_ORDER_VALUE=100000
COD_REFUSAL_LIMIT_BEFORE_DISABLE=2
PAYMENT_HOLD_EXPIRY_MINUTES=10
PAYMENT_WEBHOOK_POLL_INTERVAL_MINUTES=5

# ============================================
# WHATSAPP (Wati)
# ============================================
WHATSAPP_PROVIDER="wati"  # wati | twilio | 360dialog
WATI_API_URL="https://live-server-xxxxx.wati.io"
WATI_API_KEY="xxx"
WATI_WEBHOOK_SECRET="xxx"

# For Twilio (alternative)
# TWILIO_ACCOUNT_SID="ACxxx"
# TWILIO_AUTH_TOKEN="xxx"
# TWILIO_WHATSAPP_NUMBER="+14155238886"

# ============================================
# SMS FALLBACK (Termii)
# ============================================
FALLBACK_SMS_ENABLED=true
SMS_PROVIDER="termii"
TERMII_API_KEY="xxx"
TERMII_SENDER_ID="PartsNow"

# ============================================
# DISPATCH
# ============================================
DISPATCH_PARTNER="kwik"  # kwik | max | internal_only
KWIK_API_URL="https://api.kwik.delivery"
KWIK_API_KEY="xxx"
KWIK_WEBHOOK_SECRET="xxx"

# For MAX (alternative)
# MAX_API_URL="https://api.max.ng"
# MAX_API_KEY="xxx"

INTERNAL_DISPATCH_ENABLED=true
OVERFLOW_TO_PARTNER_THRESHOLD_MINUTES=15
RIDER_WAIT_TIME_MINUTES=10
RIDER_MAX_CALL_ATTEMPTS=2
RIDER_MAX_CONCURRENT_DELIVERIES=3
FREE_RESCHEDULE_WINDOW_HOURS=24
RESTOCKING_FEE_PERCENTAGE=10
HIGH_VALUE_ORDER_THRESHOLD=100000
HIGH_VALUE_REQUIRES_PHOTO_CONFIRMATION=true

# ============================================
# RUNNERS
# ============================================
RUNNER_ACCEPT_TIMEOUT_MINUTES=5
RUNNER_MAX_CONCURRENT_ORDERS=3
RUNNER_DAILY_FLOAT_LIMIT=200000
RUNNER_MIN_FLOAT_TO_CLOCK_IN=50000
RUNNER_MIN_FLOAT_FOR_ASSIGNMENT=50000
RUNNER_AUTO_REASSIGN_ENABLED=true
RUNNER_COMMISSION_PER_ORDER=600
REQUIRE_GPS_ON_CLOCK_IN=true
CLOCK_IN_RADIUS_METERS=500
REQUIRE_RECEIPT_UPLOAD=true

# ============================================
# SOURCING
# ============================================
SOURCING_TIMEOUT_MINUTES=45
SOURCING_SLA_MINUTES=30
DISPATCH_SLA_MINUTES=15
DELIVERY_SLA_MINUTES=60
REQUIRE_QC_PHOTO=true
VENDOR_PRICE_TOLERANCE_PERCENTAGE=10
AUTO_ESCALATE_PRICE_DISCREPANCY=true

# ============================================
# VENDORS
# ============================================
VENDOR_MIN_RELIABILITY_SCORE=70
VENDOR_QUALITY_ISSUE_LIMIT_BEFORE_REMOVAL=3
VENDOR_AUTO_DEACTIVATE_ON_SCORE_DROP=true

# ============================================
# NOTIFICATIONS
# ============================================
NOTIFY_ON_SOURCING=true
NOTIFY_ON_PICKED=true
NOTIFY_ON_DISPATCHED=true
NOTIFY_WHEN_NEAR=true
NEAR_THRESHOLD_MINUTES=5
REQUEST_RATING_ON_DELIVERY=true
ALERT_SOUND_ON_SLA_BREACH=true

# ============================================
# WALLET
# ============================================
MIN_TOPUP_AMOUNT=5000
MAX_TOPUP_AMOUNT=500000
TOPUP_LINK_EXPIRY_MINUTES=30

# ============================================
# RECONCILIATION
# ============================================
RECONCILIATION_AUTO_RUN_TIME="18:00"
DISCREPANCY_THRESHOLD_BEFORE_FLAG=1000

# ============================================
# FEATURE FLAGS
# ============================================
FEATURE_CAR_OWNER_WEB_APP=true
FEATURE_MECHANIC_WEB_APP=false
FEATURE_CREDIT_SYSTEM=false
FEATURE_LOYALTY_DISCOUNTS=true
FEATURE_VOICE_NOTE_TRANSCRIPTION=false
MAINTENANCE_MODE=false
MAINTENANCE_MESSAGE="We're currently experiencing issues. Please try again in 30 minutes."
```

### 5.2 Config Service

Create a type-safe config service:

```typescript
// lib/config.ts

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key] ?? defaultValue;
  if (value === undefined) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

const getEnvNumber = (key: string, defaultValue?: number): number => {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) return defaultValue;
    throw new Error(`Missing environment variable: ${key}`);
  }
  return parseInt(value, 10);
};

const getEnvBoolean = (key: string, defaultValue?: boolean): boolean => {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) return defaultValue;
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value === 'true';
};

export const config = {
  app: {
    name: getEnvVar('NEXT_PUBLIC_APP_NAME', 'PartsNow'),
    url: getEnvVar('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
    env: getEnvVar('NEXT_PUBLIC_APP_ENV', 'development'),
  },
  
  business: {
    defaultMarkupPercentage: getEnvNumber('DEFAULT_MARKUP_PERCENTAGE', 15),
    freeDeliveryThreshold: getEnvNumber('FREE_DELIVERY_THRESHOLD', 50000),
    standardDeliveryFee: getEnvNumber('STANDARD_DELIVERY_FEE', 1500),
  },
  
  delivery: {
    expressRadiusKm: getEnvNumber('EXPRESS_DELIVERY_RADIUS_KM', 10),
    expressPromiseMinutes: getEnvNumber('EXPRESS_DELIVERY_PROMISE_MINUTES', 45),
    standardPromiseMinutes: getEnvNumber('STANDARD_DELIVERY_PROMISE_MINUTES', 120),
  },
  
  loyalty: {
    verifiedMinOrders: getEnvNumber('TIER_VERIFIED_MIN_ORDERS', 5),
    trustedMinOrders: getEnvNumber('TIER_TRUSTED_MIN_ORDERS', 20),
    trustedDiscountPercentage: getEnvNumber('TIER_TRUSTED_DISCOUNT_PERCENTAGE', 5),
    partnerMinOrders: getEnvNumber('TIER_PARTNER_MIN_ORDERS', 50),
    partnerMinLifetimeSpend: getEnvNumber('TIER_PARTNER_MIN_LIFETIME_SPEND', 500000),
    partnerDiscountPercentage: getEnvNumber('TIER_PARTNER_DISCOUNT_PERCENTAGE', 8),
  },
  
  credit: {
    enabled: getEnvBoolean('CREDIT_SYSTEM_ENABLED', false),
    starterLimit: getEnvNumber('CREDIT_STARTER_LIMIT', 30000),
    starterRepaymentHours: getEnvNumber('CREDIT_STARTER_REPAYMENT_HOURS', 48),
    standardLimit: getEnvNumber('CREDIT_STANDARD_LIMIT', 75000),
    standardRepaymentHours: getEnvNumber('CREDIT_STANDARD_REPAYMENT_HOURS', 72),
    premiumLimit: getEnvNumber('CREDIT_PREMIUM_LIMIT', 150000),
    premiumRepaymentHours: getEnvNumber('CREDIT_PREMIUM_REPAYMENT_HOURS', 168),
    lateFeePercentage: getEnvNumber('CREDIT_LATE_FEE_PERCENTAGE', 2),
    reminderHoursBeforeDue: getEnvNumber('CREDIT_REMINDER_HOURS_BEFORE_DUE', 24),
    lateFeeAppliedAfterHours: getEnvNumber('CREDIT_LATE_FEE_APPLIED_AFTER_HOURS', 24),
    limitReducedAfterDays: getEnvNumber('CREDIT_LIMIT_REDUCED_AFTER_DAYS', 7),
    accountSuspendedAfterDays: getEnvNumber('CREDIT_ACCOUNT_SUSPENDED_AFTER_DAYS', 14),
    autoDebitEnabled: getEnvBoolean('CREDIT_AUTO_DEBIT_ENABLED', true),
  },
  
  payments: {
    paystackPublicKey: getEnvVar('NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY'),
    paystackSecretKey: getEnvVar('PAYSTACK_SECRET_KEY'),
    codEnabled: getEnvBoolean('COD_ENABLED', true),
    codMaxOrderValue: getEnvNumber('COD_MAX_ORDER_VALUE', 100000),
    codRefusalLimitBeforeDisable: getEnvNumber('COD_REFUSAL_LIMIT_BEFORE_DISABLE', 2),
    paymentHoldExpiryMinutes: getEnvNumber('PAYMENT_HOLD_EXPIRY_MINUTES', 10),
  },
  
  runner: {
    acceptTimeoutMinutes: getEnvNumber('RUNNER_ACCEPT_TIMEOUT_MINUTES', 5),
    maxConcurrentOrders: getEnvNumber('RUNNER_MAX_CONCURRENT_ORDERS', 3),
    dailyFloatLimit: getEnvNumber('RUNNER_DAILY_FLOAT_LIMIT', 200000),
    minFloatToClockIn: getEnvNumber('RUNNER_MIN_FLOAT_TO_CLOCK_IN', 50000),
    autoReassignEnabled: getEnvBoolean('RUNNER_AUTO_REASSIGN_ENABLED', true),
    commissionPerOrder: getEnvNumber('RUNNER_COMMISSION_PER_ORDER', 600),
  },
  
  sourcing: {
    timeoutMinutes: getEnvNumber('SOURCING_TIMEOUT_MINUTES', 45),
    slaMinutes: getEnvNumber('SOURCING_SLA_MINUTES', 30),
    requireQcPhoto: getEnvBoolean('REQUIRE_QC_PHOTO', true),
    priceTolerancePercentage: getEnvNumber('VENDOR_PRICE_TOLERANCE_PERCENTAGE', 10),
  },
  
  dispatch: {
    partner: getEnvVar('DISPATCH_PARTNER', 'kwik'),
    internalEnabled: getEnvBoolean('INTERNAL_DISPATCH_ENABLED', true),
    overflowThresholdMinutes: getEnvNumber('OVERFLOW_TO_PARTNER_THRESHOLD_MINUTES', 15),
    riderWaitTimeMinutes: getEnvNumber('RIDER_WAIT_TIME_MINUTES', 10),
    riderMaxCallAttempts: getEnvNumber('RIDER_MAX_CALL_ATTEMPTS', 2),
    highValueThreshold: getEnvNumber('HIGH_VALUE_ORDER_THRESHOLD', 100000),
    highValueRequiresPhoto: getEnvBoolean('HIGH_VALUE_REQUIRES_PHOTO_CONFIRMATION', true),
  },
  
  vendor: {
    minReliabilityScore: getEnvNumber('VENDOR_MIN_RELIABILITY_SCORE', 70),
    qualityIssueLimitBeforeRemoval: getEnvNumber('VENDOR_QUALITY_ISSUE_LIMIT_BEFORE_REMOVAL', 3),
  },
  
  features: {
    carOwnerWebApp: getEnvBoolean('FEATURE_CAR_OWNER_WEB_APP', true),
    mechanicWebApp: getEnvBoolean('FEATURE_MECHANIC_WEB_APP', false),
    creditSystem: getEnvBoolean('FEATURE_CREDIT_SYSTEM', false),
    loyaltyDiscounts: getEnvBoolean('FEATURE_LOYALTY_DISCOUNTS', true),
    voiceNoteTranscription: getEnvBoolean('FEATURE_VOICE_NOTE_TRANSCRIPTION', false),
    maintenanceMode: getEnvBoolean('MAINTENANCE_MODE', false),
  },
} as const;

export type Config = typeof config;
```

---

## 6. API Structure

### 6.1 API Routes Overview

```
/api
├── /auth
│   ├── /send-otp          POST   - Send OTP to phone
│   ├── /verify-otp        POST   - Verify OTP and create session
│   └── /logout            POST   - End session
│
├── /users
│   ├── /me                GET    - Get current user profile
│   ├── /me                PATCH  - Update current user profile
│   ├── /me/vehicles       GET    - Get user's saved vehicles
│   └── /me/vehicles       POST   - Add a vehicle
│
├── /wallet
│   ├── /balance           GET    - Get wallet balance
│   ├── /transactions      GET    - Get transaction history
│   ├── /topup             POST   - Initiate top-up (returns Paystack URL)
│   └── /topup/verify      POST   - Verify top-up after payment
│
├── /orders
│   ├── /                  GET    - List orders (paginated, filtered)
│   ├── /                  POST   - Create new order
│   ├── /[id]              GET    - Get order details
│   ├── /[id]/cancel       POST   - Cancel order
│   ├── /[id]/track        GET    - Get real-time tracking data
│   └── /[id]/rate         POST   - Submit rating
│
├── /inventory
│   ├── /search            GET    - Search parts
│   ├── /categories        GET    - Get part categories
│   └── /parts/[id]        GET    - Get part details
│
├── /runner
│   ├── /shift/start       POST   - Clock in
│   ├── /shift/end         POST   - Clock out
│   ├── /orders            GET    - Get assigned orders
│   ├── /orders/[id]/accept    POST   - Accept order
│   ├── /orders/[id]/reject    POST   - Reject order
│   ├── /orders/[id]/item/[itemId]/found       POST   - Mark item found
│   ├── /orders/[id]/item/[itemId]/unavailable POST   - Mark item unavailable
│   ├── /orders/[id]/clarify   POST   - Request clarification
│   ├── /orders/[id]/complete  POST   - Complete and hand to rider
│   └── /float             GET    - Get float balance
│
├── /rider
│   ├── /orders            GET    - Get assigned deliveries
│   ├── /orders/[id]/pickup    POST   - Confirm pickup
│   ├── /orders/[id]/deliver   POST   - Confirm delivery
│   ├── /orders/[id]/fail      POST   - Report delivery failure
│   └── /orders/[id]/location  POST   - Update location (called frequently)
│
├── /admin
│   ├── /dashboard         GET    - Dashboard stats
│   ├── /orders            GET    - All orders (admin view)
│   ├── /orders/[id]       GET    - Order details (admin view)
│   ├── /orders/[id]/reassign  POST   - Reassign order
│   ├── /orders/[id]/cancel    POST   - Admin cancel
│   ├── /orders/[id]/refund    POST   - Process refund
│   ├── /runners           GET    - List runners
│   ├── /runners/[id]      GET    - Runner details
│   ├── /runners/[id]/float    POST   - Top up runner float
│   ├── /vendors           GET    - List vendors
│   ├── /vendors           POST   - Add vendor
│   ├── /vendors/[id]      PATCH  - Update vendor
│   └── /reconciliation    GET    - Daily reconciliation data
│
└── /webhooks
    ├── /paystack          POST   - Paystack payment webhooks
    ├── /whatsapp          POST   - WhatsApp message webhooks
    └── /dispatch          POST   - Dispatch partner webhooks
```

### 6.2 Example API Route Implementation

```typescript
// app/api/orders/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createOrder } from '@/lib/services/orders';
import { z } from 'zod';

const createOrderSchema = z.object({
  items: z.array(z.object({
    partId: z.string().uuid().optional(),
    description: z.string(),
    quantity: z.number().int().positive().default(1),
    price: z.number().positive(),
    imageUrl: z.string().url().optional(),
  })).min(1),
  vehicleId: z.string().uuid().optional(),
  deliveryAddress: z.string().min(10),
  deliveryLatitude: z.number().optional(),
  deliveryLongitude: z.number().optional(),
  deliveryNotes: z.string().optional(),
  paymentMethod: z.enum(['wallet', 'card', 'cod']),
  sourceChannel: z.enum(['whatsapp', 'web', 'app']).default('web'),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse and validate body
    const body = await request.json();
    const validationResult = createOrderSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }
    
    // Create order
    const order = await createOrder({
      customerId: user.id,
      ...validationResult.data,
    });
    
    return NextResponse.json(order, { status: 201 });
    
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    
    let query = supabase
      .from('orders')
      .select('*, order_items(*)', { count: 'exact' })
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error, count } = await query;
    
    if (error) throw error;
    
    return NextResponse.json({
      orders: data,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
    
  } catch (error) {
    console.error('List orders error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
```

### 6.3 Business Logic Services

```typescript
// lib/services/orders.ts

import { createClient } from '@/lib/supabase/server';
import { config } from '@/lib/config';
import { debitWallet, holdWalletFunds } from './wallet';
import { assignRunner } from './dispatch';
import { sendWhatsAppMessage } from './notifications';

interface CreateOrderInput {
  customerId: string;
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
  paymentMethod: 'wallet' | 'card' | 'cod';
  sourceChannel: 'whatsapp' | 'web' | 'app';
}

export async function createOrder(input: CreateOrderInput) {
  const supabase = createClient();
  
  // Get customer details
  const { data: customer, error: customerError } = await supabase
    .from('users')
    .select('*, wallets(*)')
    .eq('id', input.customerId)
    .single();
  
  if (customerError || !customer) {
    throw new Error('Customer not found');
  }
  
  // Determine cluster based on delivery location
  const clusterId = await findNearestCluster(
    input.deliveryLatitude,
    input.deliveryLongitude
  );
  
  // Calculate pricing
  const subtotal = input.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  
  const markupPercentage = getMarkupForCustomer(customer.loyalty_tier);
  const markupAmount = subtotal * (markupPercentage / 100);
  
  const deliveryFee = subtotal >= config.business.freeDeliveryThreshold
    ? 0
    : config.business.standardDeliveryFee;
  
  const discountAmount = calculateLoyaltyDiscount(customer.loyalty_tier, subtotal);
  
  const total = subtotal + markupAmount + deliveryFee - discountAmount;
  
  // Generate order number
  const { data: orderNumber } = await supabase.rpc('generate_order_number');
  
  // Start transaction
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      order_number: orderNumber,
      customer_id: input.customerId,
      cluster_id: clusterId,
      vehicle_id: input.vehicleId,
      status: 'pending',
      delivery_address: input.deliveryAddress,
      delivery_latitude: input.deliveryLatitude,
      delivery_longitude: input.deliveryLongitude,
      delivery_notes: input.deliveryNotes,
      delivery_type: 'express',
      subtotal,
      markup_amount: markupAmount,
      delivery_fee: deliveryFee,
      discount_amount: discountAmount,
      total,
      payment_method: input.paymentMethod,
      payment_status: 'pending',
      source_channel: input.sourceChannel,
      promised_delivery_minutes: config.delivery.expressPromiseMinutes,
      payment_hold_expires_at: new Date(
        Date.now() + config.payments.paymentHoldExpiryMinutes * 60 * 1000
      ).toISOString(),
    })
    .select()
    .single();
  
  if (orderError) throw orderError;
  
  // Insert order items
  const orderItems = input.items.map(item => ({
    order_id: order.id,
    part_id: item.partId,
    description: item.description,
    quantity: item.quantity,
    selling_price: item.price * (1 + markupPercentage / 100),
    customer_image_url: item.imageUrl,
  }));
  
  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems);
  
  if (itemsError) throw itemsError;
  
  // Process payment based on method
  if (input.paymentMethod === 'wallet') {
    const wallet = customer.wallets[0];
    
    if (wallet.balance >= total) {
      // Debit wallet immediately
      const debited = await debitWallet(wallet.id, total, order.id, `Order ${orderNumber}`);
      
      if (debited) {
        // Update order status to confirmed
        await supabase
          .from('orders')
          .update({
            status: 'confirmed',
            payment_status: 'paid',
            confirmed_at: new Date().toISOString(),
          })
          .eq('id', order.id);
        
        // Assign runner
        await assignRunner(order.id, clusterId);
        
        // Notify customer
        await sendWhatsAppMessage(customer.phone, 'order_confirmed', {
          orderNumber,
          total,
          eta: config.delivery.expressPromiseMinutes,
        });
      } else {
        throw new Error('Insufficient wallet balance');
      }
    } else {
      throw new Error('Insufficient wallet balance');
    }
  } else if (input.paymentMethod === 'card') {
    // Return order with payment URL (Paystack)
    const paymentUrl = await initiatePaystackPayment(order.id, total, customer.email);
    return { ...order, paymentUrl };
  } else if (input.paymentMethod === 'cod') {
    // COD - confirm order directly
    await supabase
      .from('orders')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', order.id);
    
    await assignRunner(order.id, clusterId);
    
    await sendWhatsAppMessage(customer.phone, 'order_confirmed_cod', {
      orderNumber,
      total,
      eta: config.delivery.expressPromiseMinutes,
    });
  }
  
  return order;
}

function getMarkupForCustomer(loyaltyTier: string): number {
  const baseMarkup = config.business.defaultMarkupPercentage;
  
  if (!config.features.loyaltyDiscounts) {
    return baseMarkup;
  }
  
  switch (loyaltyTier) {
    case 'partner':
      return baseMarkup - config.loyalty.partnerDiscountPercentage;
    case 'trusted':
      return baseMarkup - config.loyalty.trustedDiscountPercentage;
    default:
      return baseMarkup;
  }
}

function calculateLoyaltyDiscount(loyaltyTier: string, subtotal: number): number {
  // Loyalty discount is already factored into markup reduction
  // This function is for additional promotional discounts if needed
  return 0;
}

async function findNearestCluster(lat?: number, lng?: number): Promise<string> {
  const supabase = createClient();
  
  // Default to Lagos-Ladipo if no coordinates
  if (!lat || !lng) {
    const { data } = await supabase
      .from('clusters')
      .select('id')
      .eq('name', 'Lagos-Ladipo')
      .single();
    return data?.id;
  }
  
  // Find nearest active cluster
  const { data: clusters } = await supabase
    .from('clusters')
    .select('*')
    .eq('is_active', true);
  
  if (!clusters || clusters.length === 0) {
    throw new Error('No active clusters available');
  }
  
  // Calculate distance to each cluster
  let nearestCluster = clusters[0];
  let minDistance = calculateDistance(lat, lng, clusters[0].latitude, clusters[0].longitude);
  
  for (const cluster of clusters) {
    const distance = calculateDistance(lat, lng, cluster.latitude, cluster.longitude);
    if (distance < minDistance) {
      minDistance = distance;
      nearestCluster = cluster;
    }
  }
  
  // Check if within delivery radius
  if (minDistance > nearestCluster.delivery_radius_km) {
    throw new Error('Delivery address outside service area');
  }
  
  return nearestCluster.id;
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  // Haversine formula
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
```

---

## 7. User Flows & Workflows

### 7.1 Mechanic Flow (WhatsApp)

#### Registration
1. Mechanic messages WhatsApp number for the first time
2. Bot detects new number, initiates registration
3. Collect: Name, Workshop Address
4. Create user record (type: mechanic), wallet, set tier: 'new'
5. Continue to order flow

#### Order Placement
1. Mechanic sends voice note describing part(s) needed
2. System acknowledges receipt
3. Voice note transcribed (manually at launch, AI later)
4. System extracts: Part(s), Vehicle, Spec, Location
5. System responds with quote:
   - Parts list with prices
   - Subtotal, delivery fee, total
   - ETA
   - Options: 1 = Confirm Wallet, 2 = Confirm COD, 3 = Change

#### Payment (Wallet)
1. Mechanic selects option 1 (Wallet)
2. System checks balance
3. If sufficient: Debit, confirm, assign runner
4. If insufficient: Offer top-up link or COD

#### Order Updates
- Sourcing started: "Your order is being sourced!"
- Parts collected: "Parts collected! Waiting for rider."
- Dispatched: "Rider on the way! ETA X mins. Track: [link]"
- Near arrival: "Almost there! X mins away."
- Delivered: "Delivered! Rate your experience."

### 7.2 Car Owner Flow (Web App)

#### Registration
1. User lands on web app, clicks "Get Started"
2. Enter phone number, receive OTP
3. Enter OTP, verify
4. Enter: Name, Email (optional), Delivery Address
5. Add first vehicle (Make, Model, Year, Spec)
6. Redirect to home

#### Order Placement
1. Select vehicle (or add new)
2. Search or browse parts by category
3. View part details, add to cart
4. View cart, adjust quantities
5. Checkout:
   - Confirm delivery address
   - Select payment method
   - See total with breakdown
   - Confirm and pay
6. Order confirmed, redirect to tracking

#### Order Tracking
- Live map showing rider location
- Progress timeline
- Call rider button
- Report issue button

### 7.3 Runner Flow (PWA)

#### Clock In
1. Open app, tap "Start Shift"
2. System checks: Float balance ≥ minimum
3. System checks: GPS location (must be near market)
4. Set is_active = true
5. Runner now receives order pings

#### Receive Order
1. Push notification: "New order! X items"
2. View order details:
   - Parts list with descriptions
   - Customer photos
   - Budget per item
   - Suggested vendor
3. Accept or Reject (with reason)
4. Auto-reassign timer starts (5 min default)

#### Sourcing
1. Navigate to vendor
2. For each item:
   - Find part
   - Compare to customer photo
   - Enter actual price
   - Take QC photo
   - Mark as "Found"
   - OR Mark as "Unavailable" (with reason)
3. If price > budget + tolerance: Escalate to admin
4. If clarification needed: Send question to customer

#### Handoff
1. All items found
2. Navigate to pickup gate
3. Meet rider, hand over parts
4. Tap "Complete & Hand to Rider"
5. System: Update order status, deduct float, log transaction

#### Clock Out
1. Tap "End Shift"
2. If active orders: Must complete first
3. If no active orders: Show summary
4. Confirm end shift

### 7.4 Rider Flow (PWA)

#### Receive Assignment
1. Push notification: "New pickup at Gate X"
2. View: Order details, pickup location, delivery address
3. Navigate to pickup gate

#### Pickup
1. Meet runner, verify items
2. For high-value orders: Take photo of package
3. Tap "Confirm Pickup"
4. System: Update status to 'dispatched', start tracking

#### Delivery
1. Navigate to delivery address
2. Update location every 30 seconds
3. System sends customer ETA updates

#### Successful Delivery
1. Hand over parts to customer
2. For COD: Collect payment, confirm amount
3. Tap "Complete Delivery"
4. Optional: Take delivery photo
5. System: Update status, trigger rating request

#### Failed Delivery
1. If customer unavailable:
   - Tap "Customer Unavailable"
   - Call customer (max 2 attempts)
   - Wait 10 minutes
   - If no show: "Return to Hub"
2. If customer refuses:
   - Tap "Customer Rejected"
   - Select reason
   - Take photo if applicable
   - System flags for admin review

### 7.5 Admin Flow (Dashboard)

#### Live Monitoring
- Dashboard shows: Today's metrics, SLA breaches, orders requiring attention
- Real-time order list with filters
- Click order for details

#### Interventions
- Reassign order to different runner
- Approve/reject price discrepancies
- Cancel order with refund
- Contact customer directly

#### Runner Management
- View runner list with status, float, performance
- Top up runner float
- Review daily reconciliation
- Flag discrepancies

#### Vendor Management
- Add/edit vendors
- View performance scores
- Deactivate underperforming vendors

---

## 8. Design System

### 8.1 Design Principles

1. **Readability Over Aesthetics** - High contrast, large text, works in sunlight
2. **Touch Targets for Real Hands** - Minimum 48x48px, prefer 56x56px
3. **Offline-Aware** - Show cached data, queue actions
4. **Progressive Disclosure** - Primary action visible, secondary on demand
5. **Speed Is a Feature** - Skeleton loaders, optimistic UI

### 8.2 Color Tokens

```css
/* tailwind.config.ts */
colors: {
  primary: {
    DEFAULT: '#1E40AF',  /* Deep Blue */
    light: '#3B82F6',
    dark: '#1E3A8A',
  },
  secondary: {
    DEFAULT: '#F97316',  /* Vibrant Orange */
    light: '#FB923C',
    dark: '#EA580C',
  },
  success: {
    DEFAULT: '#16A34A',
    light: '#DCFCE7',
  },
  warning: {
    DEFAULT: '#CA8A04',
    light: '#FEF9C3',
  },
  error: {
    DEFAULT: '#DC2626',
    light: '#FEE2E2',
  },
  info: {
    DEFAULT: '#0284C7',
    light: '#E0F2FE',
  },
  /* Order Status Colors */
  status: {
    pending: '#CA8A04',
    confirmed: '#0284C7',
    sourcing: '#7C3AED',
    picked: '#0891B2',
    dispatched: '#2563EB',
    delivered: '#16A34A',
    cancelled: '#DC2626',
  },
}
```

### 8.3 Typography

```css
fontFamily: {
  sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
}

/* Scale */
text-xs:   12px / 16px  /* Fine print only */
text-sm:   14px / 20px  /* Captions, metadata */
text-base: 16px / 24px  /* Body text (DEFAULT) */
text-lg:   18px / 28px  /* Emphasized body */
text-xl:   20px / 28px  /* Card titles */
text-2xl:  24px / 32px  /* Section headers */
text-3xl:  30px / 36px  /* Page titles */
text-4xl:  36px / 40px  /* Hero text */
```

### 8.4 Spacing

8px base unit. Everything is multiples of 4 or 8.

```css
space-1:  4px   /* Tight gaps */
space-2:  8px   /* Default small gap */
space-3:  12px  /* Between related elements */
space-4:  16px  /* Standard padding */
space-5:  20px  /* Card padding */
space-6:  24px  /* Section gaps */
space-8:  32px  /* Major section breaks */
space-10: 40px  /* Page margins */
space-12: 48px  /* Hero spacing */
```

### 8.5 Border Radius

```css
borderRadius: {
  card: '12px',
  button: '8px',
  input: '8px',
  pill: '9999px',
}
```

### 8.6 Shadows

```css
boxShadow: {
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  DEFAULT: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px rgba(0, 0, 0, 0.15)',
}
```

### 8.7 Icons

Use **Lucide React** for all icons.

```bash
npm install lucide-react
```

Icon mapping:
- Navigation: Home, Search, Package, User, Settings, LogOut
- Order Status: Clock, CheckCircle, Search, Package, Truck, XCircle
- Actions: Plus, Camera, Mic, Send, Phone, MapPin, ChevronRight
- Admin: BarChart3, Users, Store, Bike, Wallet, TrendingUp

Sizes:
- icon-sm: 16x16 (w-4 h-4) - Inline with text
- icon-base: 20x20 (w-5 h-5) - Buttons, inputs
- icon-md: 24x24 (w-6 h-6) - Navigation, cards
- icon-lg: 32x32 (w-8 h-8) - Empty states
- icon-xl: 48x48 (w-12 h-12) - Hero sections

### 8.8 Responsive Breakpoints

```css
Mobile:  0 - 639px    (sm)
Tablet:  640 - 1023px (md)
Desktop: 1024 - 1279px (lg)
Wide:    1280px+      (xl)
```

---

## 9. Component Specifications

### 9.1 Button Component

```tsx
// components/ui/button.tsx

import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-button font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-white hover:bg-primary-dark active:bg-primary-dark',
        secondary: 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50',
        destructive: 'bg-error text-white hover:bg-red-700',
        ghost: 'text-primary hover:bg-primary-light/10',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-11 px-4 text-base',
        lg: 'h-12 px-6 text-lg',
        icon: 'h-10 w-10',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, fullWidth, isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
```

### 9.2 Status Badge Component

```tsx
// components/ui/status-badge.tsx

import { cn } from '@/lib/utils';

type OrderStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'sourcing' 
  | 'picked' 
  | 'dispatched' 
  | 'delivered' 
  | 'cancelled'
  | 'rejected'
  | 'failed';

const statusConfig: Record<OrderStatus, { bg: string; text: string; dot: string; label: string }> = {
  pending: { bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500', label: 'Pending' },
  confirmed: { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500', label: 'Confirmed' },
  sourcing: { bg: 'bg-purple-100', text: 'text-purple-800', dot: 'bg-purple-500', label: 'Sourcing' },
  picked: { bg: 'bg-cyan-100', text: 'text-cyan-800', dot: 'bg-cyan-500', label: 'Picked' },
  dispatched: { bg: 'bg-indigo-100', text: 'text-indigo-800', dot: 'bg-indigo-500', label: 'Dispatched' },
  delivered: { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500', label: 'Delivered' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500', label: 'Cancelled' },
  rejected: { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500', label: 'Rejected' },
  failed: { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500', label: 'Failed' },
};

interface StatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-pill text-sm font-medium',
        config.bg,
        config.text,
        className
      )}
    >
      <span className={cn('w-2 h-2 rounded-full', config.dot)} />
      {config.label}
    </span>
  );
}
```

### 9.3 Bottom Navigation Component

```tsx
// components/layout/bottom-nav.tsx

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Package, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/search', icon: Search, label: 'Search' },
  { href: '/orders', icon: Package, label: 'Orders' },
  { href: '/account', icon: User, label: 'Account' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 pb-safe z-50">
      <div className="flex items-center justify-around h-16">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || 
            (href !== '/' && pathname.startsWith(href));
          
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center w-full h-full gap-1',
                isActive ? 'text-primary' : 'text-slate-400'
              )}
            >
              <Icon 
                className="w-6 h-6" 
                strokeWidth={isActive ? 2 : 1.5} 
              />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

### 9.4 Order Card Component

```tsx
// components/orders/order-card.tsx

import { Package, ChevronRight, Clock } from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatCurrency, formatRelativeTime } from '@/lib/utils/format';
import Link from 'next/link';

interface OrderCardProps {
  order: {
    id: string;
    order_number: string;
    status: string;
    total: number;
    created_at: string;
    delivery_address: string;
    order_items: Array<{
      description: string;
      quantity: number;
    }>;
  };
}

export function OrderCard({ order }: OrderCardProps) {
  const itemsSummary = order.order_items
    .map(item => `${item.quantity}× ${item.description}`)
    .join(', ');

  return (
    <Link href={`/orders/${order.id}`}>
      <div className="bg-white rounded-card border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm text-slate-500">{order.order_number}</p>
            <p className="font-semibold text-slate-900 mt-0.5">
              {formatCurrency(order.total)}
            </p>
          </div>
          <StatusBadge status={order.status as any} />
        </div>

        <p className="text-sm text-slate-600 line-clamp-2 mb-3">
          {itemsSummary}
        </p>

        <div className="flex items-center justify-between text-sm text-slate-500">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{formatRelativeTime(order.created_at)}</span>
          </div>
          <ChevronRight className="w-5 h-5" />
        </div>
      </div>
    </Link>
  );
}
```

---

## 10. Third-Party Integrations

### 10.1 Paystack

```typescript
// lib/integrations/paystack.ts

import { config } from '@/lib/config';

const PAYSTACK_API = 'https://api.paystack.co';

interface InitializePaymentParams {
  email: string;
  amount: number; // In kobo
  reference: string;
  callback_url?: string;
  metadata?: Record<string, any>;
}

export async function initializePayment(params: InitializePaymentParams) {
  const response = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.payments.paystackSecretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: params.email,
      amount: params.amount * 100, // Convert to kobo
      reference: params.reference,
      callback_url: params.callback_url,
      metadata: params.metadata,
    }),
  });

  const data = await response.json();

  if (!data.status) {
    throw new Error(data.message || 'Failed to initialize payment');
  }

  return {
    authorizationUrl: data.data.authorization_url,
    reference: data.data.reference,
    accessCode: data.data.access_code,
  };
}

export async function verifyPayment(reference: string) {
  const response = await fetch(`${PAYSTACK_API}/transaction/verify/${reference}`, {
    headers: {
      Authorization: `Bearer ${config.payments.paystackSecretKey}`,
    },
  });

  const data = await response.json();

  if (!data.status) {
    throw new Error(data.message || 'Failed to verify payment');
  }

  return {
    status: data.data.status, // 'success' | 'failed' | 'abandoned'
    amount: data.data.amount / 100, // Convert from kobo
    reference: data.data.reference,
    paidAt: data.data.paid_at,
    channel: data.data.channel,
    metadata: data.data.metadata,
  };
}

// Webhook handler
export async function handlePaystackWebhook(payload: any, signature: string) {
  // Verify signature
  const crypto = require('crypto');
  const hash = crypto
    .createHmac('sha512', config.payments.paystackWebhookSecret)
    .update(JSON.stringify(payload))
    .digest('hex');

  if (hash !== signature) {
    throw new Error('Invalid webhook signature');
  }

  const { event, data } = payload;

  switch (event) {
    case 'charge.success':
      await handleSuccessfulCharge(data);
      break;
    case 'transfer.success':
      await handleSuccessfulTransfer(data);
      break;
    case 'transfer.failed':
      await handleFailedTransfer(data);
      break;
    default:
      console.log(`Unhandled Paystack event: ${event}`);
  }
}

async function handleSuccessfulCharge(data: any) {
  // Extract metadata to determine if this is wallet top-up or order payment
  const { metadata, reference, amount } = data;

  if (metadata?.type === 'wallet_topup') {
    // Credit wallet
    await creditWallet(metadata.wallet_id, amount / 100, reference);
  } else if (metadata?.type === 'order_payment') {
    // Confirm order
    await confirmOrderPayment(metadata.order_id, reference);
  }
}
```

### 10.2 Wati (WhatsApp)

```typescript
// lib/integrations/wati.ts

const WATI_API = process.env.WATI_API_URL;
const WATI_API_KEY = process.env.WATI_API_KEY;

interface SendMessageParams {
  phone: string;
  templateName: string;
  parameters: Record<string, string>;
}

export async function sendTemplateMessage(params: SendMessageParams) {
  const response = await fetch(
    `${WATI_API}/api/v1/sendTemplateMessage?whatsappNumber=${params.phone}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WATI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        template_name: params.templateName,
        broadcast_name: 'order_update',
        parameters: Object.entries(params.parameters).map(([name, value]) => ({
          name,
          value,
        })),
      }),
    }
  );

  const data = await response.json();
  return data;
}

export async function sendTextMessage(phone: string, message: string) {
  const response = await fetch(
    `${WATI_API}/api/v1/sendSessionMessage/${phone}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WATI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messageText: message,
      }),
    }
  );

  const data = await response.json();
  return data;
}

export async function sendInteractiveButtons(
  phone: string,
  message: string,
  buttons: Array<{ id: string; title: string }>
) {
  const response = await fetch(
    `${WATI_API}/api/v1/sendInteractiveButtonsMessage?whatsappNumber=${phone}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WATI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        body: message,
        buttons: buttons.map(b => ({
          type: 'reply',
          reply: {
            id: b.id,
            title: b.title,
          },
        })),
      }),
    }
  );

  const data = await response.json();
  return data;
}

// Webhook handler
export async function handleWatiWebhook(payload: any) {
  const { waId, text, type, timestamp, media } = payload;

  // Normalize phone number
  const phone = normalizePhone(waId);

  // Check if user exists
  const user = await getUserByPhone(phone);

  if (!user) {
    // New user - start registration
    await handleNewUser(phone, text);
    return;
  }

  // Check for active conversation context
  const context = await getConversationContext(phone);

  if (type === 'audio') {
    // Voice note - queue for transcription
    await queueVoiceNoteForTranscription(phone, media.url, context);
    await sendTextMessage(phone, 'Got it! 🎧 Processing your request...');
    return;
  }

  if (type === 'image') {
    // Part image
    await handlePartImage(phone, media.url, context);
    return;
  }

  // Text message
  await handleTextMessage(phone, text, context, user);
}
```

### 10.3 Kwik Delivery

```typescript
// lib/integrations/kwik.ts

const KWIK_API = process.env.KWIK_API_URL;
const KWIK_API_KEY = process.env.KWIK_API_KEY;

interface CreateDeliveryParams {
  pickupAddress: string;
  pickupLatitude: number;
  pickupLongitude: number;
  pickupContactName: string;
  pickupContactPhone: string;
  deliveryAddress: string;
  deliveryLatitude: number;
  deliveryLongitude: number;
  deliveryContactName: string;
  deliveryContactPhone: string;
  packageDescription: string;
  orderId: string;
}

export async function createDelivery(params: CreateDeliveryParams) {
  const response = await fetch(`${KWIK_API}/deliveries`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KWIK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      pickup: {
        address: params.pickupAddress,
        latitude: params.pickupLatitude,
        longitude: params.pickupLongitude,
        contact_name: params.pickupContactName,
        contact_phone: params.pickupContactPhone,
      },
      delivery: {
        address: params.deliveryAddress,
        latitude: params.deliveryLatitude,
        longitude: params.deliveryLongitude,
        contact_name: params.deliveryContactName,
        contact_phone: params.deliveryContactPhone,
      },
      package_description: params.packageDescription,
      reference: params.orderId,
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/dispatch`,
    }),
  });

  const data = await response.json();

  return {
    deliveryId: data.id,
    trackingUrl: data.tracking_url,
    estimatedPickup: data.estimated_pickup,
    estimatedDelivery: data.estimated_delivery,
    price: data.price,
  };
}

export async function getDeliveryStatus(deliveryId: string) {
  const response = await fetch(`${KWIK_API}/deliveries/${deliveryId}`, {
    headers: {
      Authorization: `Bearer ${KWIK_API_KEY}`,
    },
  });

  const data = await response.json();

  return {
    status: data.status,
    riderName: data.rider?.name,
    riderPhone: data.rider?.phone,
    currentLatitude: data.rider?.latitude,
    currentLongitude: data.rider?.longitude,
    eta: data.eta,
  };
}

export async function cancelDelivery(deliveryId: string, reason: string) {
  const response = await fetch(`${KWIK_API}/deliveries/${deliveryId}/cancel`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KWIK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reason }),
  });

  return response.json();
}
```

---

## 11. Edge Cases & Error Handling

### 11.1 Order Creation Failures

| Failure Point | Handling |
|---------------|----------|
| Webhook down | Wati retries. Alert if 3x failure in 5 mins. |
| Supabase unreachable | Return error to WhatsApp. Log for investigation. |
| Wallet debit fails | Set status to `payment_pending`. Send follow-up with top-up link. |
| Confirmation message fails | Order proceeds. Fallback to SMS. |

### 11.2 Runner Failures

| Failure Point | Handling |
|---------------|----------|
| No response in 5 mins | Auto-reassign to next runner. Log timeout. |
| Part unavailable | Mark unavailable with reason. Admin notified. Customer gets options. |
| Price exceeds tolerance | Escalate to admin. Admin approves/rejects/contacts customer. |
| Runner disappears | Daily reconciliation catches discrepancy. Investigate. |

### 11.3 Delivery Failures

| Failure Point | Handling |
|---------------|----------|
| Customer unavailable | Wait 10 mins, 2 call attempts. Then return to hub. |
| Customer refuses | Log reason, take photo. Admin reviews. Process refund if applicable. |
| Wrong part delivered | Immediate re-dispatch. Investigate runner QC failure. |
| Part damaged | Customer reports with photo. Replacement sent. Investigate cause. |

### 11.4 Payment Failures

| Failure Point | Handling |
|---------------|----------|
| Paystack error | Show error, offer retry or bank transfer alternative. |
| Webhook delayed | Background job polls Paystack every 5 mins for pending transactions. |
| COD refusal | Customer blacklisted from COD after 2 refusals. |
| Refund fails | Log failure, alert admin. Manual resolution within 24 hours. |

### 11.5 System Failures

| Failure Point | Handling |
|---------------|----------|
| Supabase outage | Show maintenance message. No mitigation for MVP. |
| WhatsApp API down | Fallback to SMS for critical notifications. |
| Paystack outage | Show error, offer bank transfer. Hold orders. |

---

## 12. Security Considerations

### 12.1 Authentication

- Phone OTP via Supabase Auth (6-digit, 5-minute expiry)
- Session tokens with 7-day expiry, refresh on activity
- Rate limiting: 5 OTP requests per phone per hour

### 12.2 Authorization

- Row Level Security (RLS) on all tables
- Role-based access: customer, runner, rider, admin
- API routes verify auth and role before processing

### 12.3 Data Protection

- PII encrypted at rest (Supabase default)
- HTTPS only (Vercel default)
- Webhook signature verification (Paystack, Wati)
- Environment variables for secrets (never in code)

### 12.4 Input Validation

- Zod schemas for all API inputs
- Sanitize user-generated content before storage
- File upload restrictions (images only, max 5MB)

### 12.5 Rate Limiting

- API routes: 100 requests per minute per user
- Auth endpoints: 10 requests per minute per IP
- Webhook endpoints: Verified by signature, no rate limit

---

## 13. Development Phases

### Phase 1: Foundation (Week 1-2)

- [ ] Project setup (Next.js, Supabase, Tailwind)
- [ ] Database schema and migrations
- [ ] Auth flow (phone OTP)
- [ ] Basic UI components
- [ ] Environment configuration

### Phase 2: Core Customer Flow (Week 3-4)

- [ ] User registration and profile
- [ ] Vehicle management
- [ ] Part search and catalog
- [ ] Cart and checkout
- [ ] Wallet system
- [ ] Paystack integration
- [ ] Order creation

### Phase 3: Operations (Week 5-6)

- [ ] Runner PWA
- [ ] Order assignment logic
- [ ] Sourcing workflow
- [ ] QC photo upload
- [ ] Runner float management

### Phase 4: Delivery (Week 7-8)

- [ ] Rider PWA (or partner integration)
- [ ] Dispatch logic
- [ ] Real-time tracking
- [ ] Delivery confirmation
- [ ] Rating system

### Phase 5: Admin & WhatsApp (Week 9-10)

- [ ] Admin dashboard
- [ ] Order monitoring
- [ ] Manual interventions
- [ ] Vendor management
- [ ] Wati integration
- [ ] WhatsApp bot flows

### Phase 6: Polish & Launch (Week 11-12)

- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Error handling refinement
- [ ] Documentation
- [ ] Beta launch with selected mechanics

---

## Appendix A: Utility Functions

```typescript
// lib/utils/cn.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// lib/utils/format.ts
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return then.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
  });
}

export function formatPhone(phone: string): string {
  // Format Nigerian phone number
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('234')) {
    return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
  }
  return phone;
}

export function normalizePhone(phone: string): string {
  // Normalize to international format without +
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '234' + cleaned.slice(1);
  }
  if (!cleaned.startsWith('234')) {
    cleaned = '234' + cleaned;
  }
  return cleaned;
}
```

---

## Appendix B: WhatsApp Message Templates

```
Template: order_confirmed
---
✅ Order Confirmed!

Order: {{1}}
Total: ₦{{2}}
ETA: {{3}} minutes

We'll update you when your parts are on the way.

---

Template: order_dispatched
---
🛵 Your order is on the way!

Order: {{1}}
Rider: {{2}}
ETA: {{3}} minutes

📍 Track: {{4}}
📞 Call rider: {{5}}

---

Template: order_delivered
---
✅ Delivered!

Order: {{1}}
Thank you for using PartsNow!

How was your experience?
Reply with a number (1-5):
1 ⭐ — 2 ⭐⭐ — 3 ⭐⭐⭐ — 4 ⭐⭐⭐⭐ — 5 ⭐⭐⭐⭐⭐

---

Template: wallet_topup_success
---
💰 Wallet Top-Up Successful!

Amount: ₦{{1}}
New Balance: ₦{{2}}

You're ready to order parts!

---

Template: credit_reminder
---
⏰ Credit Reminder

Your credit of ₦{{1}} is due in {{2}} hours.

Please ensure your wallet has sufficient funds for auto-debit, or pay manually to avoid late fees.

Current wallet balance: ₦{{3}}
[Top Up Wallet]

---
```

---

## Appendix C: Testing Checklist

### Customer Flow
- [ ] Register with new phone number
- [ ] Add vehicle
- [ ] Search for parts
- [ ] Add to cart
- [ ] Checkout with wallet (sufficient balance)
- [ ] Checkout with wallet (insufficient balance → top-up)
- [ ] Checkout with card
- [ ] Checkout with COD
- [ ] Track order in real-time
- [ ] Receive delivery
- [ ] Rate order

### Runner Flow
- [ ] Clock in (with sufficient float)
- [ ] Clock in (with insufficient float → blocked)
- [ ] Receive order notification
- [ ] Accept order
- [ ] Reject order
- [ ] Mark item as found (with QC photo)
- [ ] Mark item as unavailable
- [ ] Request clarification
- [ ] Report price discrepancy
- [ ] Complete and hand to rider
- [ ] Clock out

### Rider Flow
- [ ] Receive pickup assignment
- [ ] Confirm pickup
- [ ] Update location during transit
- [ ] Complete delivery (prepaid)
- [ ] Complete delivery (COD)
- [ ] Handle customer unavailable
- [ ] Handle customer rejection

### Admin Flow
- [ ] View dashboard metrics
- [ ] Monitor live orders
- [ ] Reassign order
- [ ] Approve price discrepancy
- [ ] Cancel and refund order
- [ ] Top up runner float
- [ ] View reconciliation report
- [ ] Add/edit vendor

### WhatsApp Flow
- [ ] New user registration
- [ ] Place order via voice note
- [ ] Place order via text
- [ ] Receive order confirmations
- [ ] Receive delivery updates
- [ ] Top up wallet
- [ ] Check wallet balance

---

*End of CLAUDE.md*

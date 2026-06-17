--
-- PostgreSQL database dump
--

\restrict 6GL7rXmFk2J7PEOYcow0WqRqcyxlmTp6faT136mswtEOv0oVO3AywebV2Ft9cuI

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3 (Debian 18.3-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: mbgadmin
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO mbgadmin;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: mbgadmin
--

COMMENT ON SCHEMA public IS '';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _sqlx_migrations; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public._sqlx_migrations (
    version bigint NOT NULL,
    description text NOT NULL,
    installed_on timestamp with time zone DEFAULT now() NOT NULL,
    success boolean NOT NULL,
    checksum bytea NOT NULL,
    execution_time bigint NOT NULL
);


ALTER TABLE public._sqlx_migrations OWNER TO mbgadmin;

--
-- Name: attendance_daily; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public.attendance_daily (
    tenant_id uuid NOT NULL,
    staff_id uuid NOT NULL,
    work_date date NOT NULL,
    shift_id uuid,
    minutes_worked integer DEFAULT 0 NOT NULL,
    late_minutes integer DEFAULT 0 NOT NULL,
    overtime_minutes integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'PRESENT'::text NOT NULL,
    note text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.attendance_daily OWNER TO mbgadmin;

--
-- Name: attendance_events; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public.attendance_events (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    staff_id uuid NOT NULL,
    event_type text NOT NULL,
    occurred_at timestamp with time zone NOT NULL,
    source text DEFAULT 'manual'::text NOT NULL,
    note text,
    meta_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.attendance_events OWNER TO mbgadmin;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public.audit_logs (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    user_id uuid,
    action text NOT NULL,
    resource text NOT NULL,
    details jsonb,
    ip_address text,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO mbgadmin;

--
-- Name: batch_checklist; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public.batch_checklist (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    batch_id uuid NOT NULL,
    description text NOT NULL,
    done boolean DEFAULT false NOT NULL,
    scheduled_start timestamp with time zone,
    scheduled_end timestamp with time zone,
    photo_url text,
    checked_at timestamp with time zone,
    checked_by uuid,
    target_role text
);


ALTER TABLE public.batch_checklist OWNER TO mbgadmin;

--
-- Name: delivery_waves; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public.delivery_waves (
    id uuid NOT NULL,
    plan_id uuid NOT NULL,
    wave_number integer NOT NULL,
    target_time timestamp with time zone NOT NULL,
    portion_count integer NOT NULL,
    driver_id uuid,
    tenant_id uuid
);


ALTER TABLE public.delivery_waves OWNER TO mbgadmin;

--
-- Name: divisions; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public.divisions (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    capacity_per_batch integer NOT NULL,
    max_parallel_batches integer NOT NULL
);


ALTER TABLE public.divisions OWNER TO mbgadmin;

--
-- Name: finance_coa; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public.finance_coa (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    account_code text NOT NULL,
    account_name text NOT NULL,
    account_group text DEFAULT 'asset'::text NOT NULL,
    normal_balance text DEFAULT 'debit'::text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.finance_coa OWNER TO mbgadmin;

--
-- Name: finance_journal_lines; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public.finance_journal_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    journal_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    account_code text NOT NULL,
    description text DEFAULT ''::text,
    debit double precision DEFAULT 0,
    credit double precision DEFAULT 0
);


ALTER TABLE public.finance_journal_lines OWNER TO mbgadmin;

--
-- Name: finance_journals; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public.finance_journals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    journal_no text NOT NULL,
    journal_date date DEFAULT CURRENT_DATE NOT NULL,
    description text DEFAULT ''::text,
    status text DEFAULT 'draft'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    posted_at timestamp with time zone
);


ALTER TABLE public.finance_journals OWNER TO mbgadmin;

--
-- Name: finance_setup; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public.finance_setup (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    key text NOT NULL,
    value text DEFAULT ''::text,
    source_row integer DEFAULT 0,
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.finance_setup OWNER TO mbgadmin;

--
-- Name: finance_sheets; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public.finance_sheets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    sheet_name text NOT NULL,
    row_no integer NOT NULL,
    cells jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.finance_sheets OWNER TO mbgadmin;

--
-- Name: finance_transactions; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public.finance_transactions (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    category text NOT NULL,
    amount double precision NOT NULL,
    currency text NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    description text,
    staff_id uuid,
    payroll_period_id uuid
);


ALTER TABLE public.finance_transactions OWNER TO mbgadmin;

--
-- Name: food_menu_items; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public.food_menu_items (
    food_id uuid NOT NULL,
    menu_item_id uuid NOT NULL
);


ALTER TABLE public.food_menu_items OWNER TO mbgadmin;

--
-- Name: foods; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public.foods (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    date_served timestamp with time zone DEFAULT now(),
    packaging_type text DEFAULT 'ompreng'::text
);


ALTER TABLE public.foods OWNER TO mbgadmin;

--
-- Name: ingredient_prices; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public.ingredient_prices (
    tenant_id uuid NOT NULL,
    ingredient_id uuid NOT NULL,
    price_per_unit double precision NOT NULL,
    currency text NOT NULL,
    fetched_at timestamp with time zone NOT NULL,
    source text NOT NULL
);


ALTER TABLE public.ingredient_prices OWNER TO mbgadmin;

--
-- Name: ingredients; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public.ingredients (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    unit text NOT NULL,
    nutrition_info jsonb DEFAULT '{}'::jsonb,
    nutr_code text,
    estimated_price double precision DEFAULT 0 NOT NULL
);


ALTER TABLE public.ingredients OWNER TO mbgadmin;

--
-- Name: inventory; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public.inventory (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    ingredient_id uuid NOT NULL,
    quantity double precision NOT NULL,
    unit text NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.inventory OWNER TO mbgadmin;

--
-- Name: invoices; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public.invoices (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    subscription_id uuid,
    invoice_number text NOT NULL,
    amount bigint NOT NULL,
    currency text DEFAULT 'IDR'::text NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    due_at timestamp with time zone NOT NULL,
    paid_at timestamp with time zone,
    payment_method text,
    external_id text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.invoices OWNER TO mbgadmin;

--
-- Name: kitchen_resources; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public.kitchen_resources (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    resource_type text NOT NULL,
    capacity integer DEFAULT 1,
    status text DEFAULT 'READY'::text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.kitchen_resources OWNER TO mbgadmin;

--
-- Name: license_keys; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public.license_keys (
    key_code text NOT NULL,
    plan_duration_days integer NOT NULL,
    generated_by uuid NOT NULL,
    generated_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'UNUSED'::text NOT NULL,
    used_by_tenant_id uuid,
    used_at timestamp with time zone
);


ALTER TABLE public.license_keys OWNER TO mbgadmin;

--
-- Name: menu_ingredient_prep; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public.menu_ingredient_prep (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    menu_item_id uuid NOT NULL,
    ingredient_id uuid NOT NULL,
    action_type text NOT NULL,
    duration_per_kg_minutes integer DEFAULT 10,
    is_enabled boolean DEFAULT true
);


ALTER TABLE public.menu_ingredient_prep OWNER TO mbgadmin;

--
-- Name: menu_items; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public.menu_items (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    recipe_id uuid NOT NULL,
    food_id uuid,
    extra_packing_json jsonb
);


ALTER TABLE public.menu_items OWNER TO mbgadmin;

--
-- Name: nutr_calc_runs; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public.nutr_calc_runs (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    menu_id uuid NOT NULL,
    menu_name text NOT NULL,
    at timestamp with time zone DEFAULT now() NOT NULL,
    actor_email text,
    target_set text,
    nutrient_codes text NOT NULL,
    totals jsonb NOT NULL,
    detail jsonb NOT NULL,
    missing_count integer DEFAULT 0 NOT NULL,
    energy_kcal double precision,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.nutr_calc_runs OWNER TO mbgadmin;

--
-- Name: nutr_foods; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public.nutr_foods (
    code text NOT NULL,
    name text,
    nutr_values bytea
);


ALTER TABLE public.nutr_foods OWNER TO mbgadmin;

--
-- Name: nutr_meta; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public.nutr_meta (
    key text NOT NULL,
    value text
);


ALTER TABLE public.nutr_meta OWNER TO mbgadmin;

--
-- Name: nutr_nutrients; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public.nutr_nutrients (
    code text NOT NULL,
    name text,
    label text,
    unit text,
    decimals integer DEFAULT 0 NOT NULL,
    idx integer NOT NULL
);


ALTER TABLE public.nutr_nutrients OWNER TO mbgadmin;

--
-- Name: nutr_targets; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public.nutr_targets (
    id uuid NOT NULL,
    target_set text NOT NULL,
    label text NOT NULL,
    min double precision,
    max double precision
);


ALTER TABLE public.nutr_targets OWNER TO mbgadmin;

--
-- Name: operational_materials; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public.operational_materials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    unit text DEFAULT 'pcs'::text NOT NULL,
    qty_per_portion double precision DEFAULT 0 NOT NULL,
    estimated_price double precision DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.operational_materials OWNER TO mbgadmin;

--
-- Name: payroll_items; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public.payroll_items (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    period_id uuid NOT NULL,
    staff_id uuid NOT NULL,
    pay_type text NOT NULL,
    rate double precision NOT NULL,
    minutes_worked integer DEFAULT 0 NOT NULL,
    gross double precision NOT NULL,
    deductions double precision DEFAULT 0 NOT NULL,
    net double precision NOT NULL,
    currency text DEFAULT 'IDR'::text NOT NULL,
    breakdown_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.payroll_items OWNER TO mbgadmin;

--
-- Name: payroll_periods; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public.payroll_periods (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    status text DEFAULT 'DRAFT'::text NOT NULL,
    created_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    posted_at timestamp with time zone
);


ALTER TABLE public.payroll_periods OWNER TO mbgadmin;

--
-- Name: plan_materials; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public.plan_materials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    ingredient_id uuid,
    material_name text NOT NULL,
    material_type text DEFAULT 'ingredient'::text NOT NULL,
    quantity_needed double precision DEFAULT 0 NOT NULL,
    unit text DEFAULT ''::text NOT NULL,
    estimated_price_per_unit double precision DEFAULT 0 NOT NULL,
    estimated_total double precision DEFAULT 0 NOT NULL,
    price_source text DEFAULT 'manual'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    received_qty double precision DEFAULT 0,
    received_at timestamp with time zone,
    received_by text
);


ALTER TABLE public.plan_materials OWNER TO mbgadmin;

--
-- Name: platform_users; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public.platform_users (
    id uuid NOT NULL,
    email text NOT NULL,
    name text NOT NULL,
    role text DEFAULT 'admin'::text NOT NULL,
    password_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_login_at timestamp with time zone,
    disabled_at timestamp with time zone,
    tenant_id uuid
);


ALTER TABLE public.platform_users OWNER TO mbgadmin;

--
-- Name: production_batches; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public.production_batches (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    division_id uuid NOT NULL,
    menu_item_id uuid NOT NULL,
    batch_size integer NOT NULL,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    current_status text DEFAULT 'pending'::text
);


ALTER TABLE public.production_batches OWNER TO mbgadmin;

--
-- Name: production_drafts; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public.production_drafts (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    plan_date date NOT NULL,
    data_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'DRAFT'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.production_drafts OWNER TO mbgadmin;

--
-- Name: production_plans; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public.production_plans (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    status text NOT NULL,
    target_portions integer NOT NULL,
    target_delivery_time timestamp with time zone NOT NULL,
    feasible boolean NOT NULL,
    generated_at timestamp with time zone NOT NULL,
    lateness_minutes bigint DEFAULT 0 NOT NULL,
    bottleneck_rate double precision DEFAULT 0.0 NOT NULL,
    plan_data jsonb,
    material_total double precision DEFAULT 0
);


ALTER TABLE public.production_plans OWNER TO mbgadmin;

--
-- Name: purchase_orders; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public.purchase_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    po_number text,
    visibility text DEFAULT 'public'::text NOT NULL,
    target_supplier_ids uuid[] DEFAULT '{}'::uuid[],
    fixed_total_price double precision,
    status text DEFAULT 'open'::text NOT NULL,
    delivery_deadline timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.purchase_orders OWNER TO mbgadmin;

--
-- Name: recipe_ingredients; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public.recipe_ingredients (
    recipe_id uuid NOT NULL,
    ingredient_id uuid NOT NULL,
    quantity_per_portion double precision NOT NULL,
    cutting_enabled boolean DEFAULT false,
    cutting_duration_minutes double precision DEFAULT 0,
    cutting_output_per_duration double precision DEFAULT 0,
    washing_enabled boolean DEFAULT false,
    washing_duration_minutes double precision DEFAULT 0,
    washing_output_per_duration double precision DEFAULT 0,
    peeling_enabled boolean DEFAULT false,
    peeling_duration_minutes double precision DEFAULT 0,
    peeling_output_per_duration double precision DEFAULT 0
);


ALTER TABLE public.recipe_ingredients OWNER TO mbgadmin;

--
-- Name: recipe_step_requirements; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public.recipe_step_requirements (
    id uuid NOT NULL,
    step_id uuid NOT NULL,
    resource_type text NOT NULL,
    quantity_needed integer DEFAULT 1
);


ALTER TABLE public.recipe_step_requirements OWNER TO mbgadmin;

--
-- Name: recipe_steps; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public.recipe_steps (
    id uuid NOT NULL,
    recipe_id uuid NOT NULL,
    step_order integer NOT NULL,
    description text NOT NULL,
    division_type text NOT NULL,
    estimated_duration_minutes integer DEFAULT 15,
    required_resource_type text,
    batch_capacity double precision,
    batch_duration_minutes integer
);


ALTER TABLE public.recipe_steps OWNER TO mbgadmin;

--
-- Name: recipe_tools; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public.recipe_tools (
    recipe_id uuid NOT NULL,
    tool_id uuid NOT NULL,
    batch_capacity double precision NOT NULL,
    batch_duration_minutes double precision NOT NULL
);


ALTER TABLE public.recipe_tools OWNER TO mbgadmin;

--
-- Name: recipes; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public.recipes (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    instructions text NOT NULL,
    portion_size double precision DEFAULT 1.0,
    extra_packing_json jsonb DEFAULT '{}'::jsonb,
    packaging_type text
);


ALTER TABLE public.recipes OWNER TO mbgadmin;

--
-- Name: shifts; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public.shifts (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    start_time text NOT NULL,
    end_time text NOT NULL,
    division_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.shifts OWNER TO mbgadmin;

--
-- Name: staff; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public.staff (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    role text NOT NULL,
    skills_json jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    user_id uuid,
    email text DEFAULT ''::text,
    division text DEFAULT ''::text,
    phone text DEFAULT ''::text,
    staff_code text,
    pin_hash text,
    face_registered boolean DEFAULT false,
    face_updated_at timestamp with time zone
);


ALTER TABLE public.staff OWNER TO mbgadmin;

--
-- Name: staff_compensation; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public.staff_compensation (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    staff_id uuid NOT NULL,
    pay_type text NOT NULL,
    rate double precision NOT NULL,
    currency text DEFAULT 'IDR'::text NOT NULL,
    effective_from date DEFAULT CURRENT_DATE NOT NULL,
    meta_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.staff_compensation OWNER TO mbgadmin;

--
-- Name: staff_shift_assignments; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public.staff_shift_assignments (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    staff_id uuid NOT NULL,
    shift_id uuid NOT NULL,
    work_date date NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.staff_shift_assignments OWNER TO mbgadmin;

--
-- Name: stock_movements; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public.stock_movements (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    ingredient_id uuid NOT NULL,
    movement_type text NOT NULL,
    quantity double precision NOT NULL,
    occurred_at timestamp with time zone NOT NULL,
    qty_before double precision DEFAULT 0,
    qty_after double precision DEFAULT 0,
    delta double precision DEFAULT 0,
    note text DEFAULT ''::text
);


ALTER TABLE public.stock_movements OWNER TO mbgadmin;

--
-- Name: subscription_plans; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public.subscription_plans (
    code text NOT NULL,
    name text NOT NULL,
    price_monthly bigint DEFAULT 0 NOT NULL,
    currency text DEFAULT 'IDR'::text NOT NULL,
    features jsonb DEFAULT '{}'::jsonb NOT NULL,
    limits jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.subscription_plans OWNER TO mbgadmin;

--
-- Name: supplier_bid_items; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public.supplier_bid_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bid_id uuid NOT NULL,
    material_id uuid NOT NULL,
    offered_qty double precision DEFAULT 0 NOT NULL,
    offered_price_per_unit double precision DEFAULT 0 NOT NULL,
    notes text
);


ALTER TABLE public.supplier_bid_items OWNER TO mbgadmin;

--
-- Name: supplier_bids; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public.supplier_bids (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    po_id uuid NOT NULL,
    supplier_id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    total_amount double precision DEFAULT 0 NOT NULL,
    notes text,
    submitted_at timestamp with time zone,
    reviewed_at timestamp with time zone,
    reviewed_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.supplier_bids OWNER TO mbgadmin;

--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public.suppliers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    name text NOT NULL,
    company_name text,
    contact_phone text,
    address text,
    password_hash text DEFAULT ''::text NOT NULL,
    subscription_tier text DEFAULT 'free'::text NOT NULL,
    subscription_expires_at timestamp with time zone,
    orders_taken_this_period integer DEFAULT 0 NOT NULL,
    period_reset_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.suppliers OWNER TO mbgadmin;

--
-- Name: tasks; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public.tasks (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    title text NOT NULL,
    division text NOT NULL,
    due_date date,
    status text DEFAULT 'open'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.tasks OWNER TO mbgadmin;

--
-- Name: tenant_settings; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public.tenant_settings (
    tenant_id uuid NOT NULL,
    key text NOT NULL,
    value jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.tenant_settings OWNER TO mbgadmin;

--
-- Name: tenant_subscriptions; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public.tenant_subscriptions (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    plan_code text NOT NULL,
    status text DEFAULT 'TRIALING'::text NOT NULL,
    current_period_start timestamp with time zone DEFAULT now() NOT NULL,
    current_period_end timestamp with time zone NOT NULL,
    cancel_at_period_end boolean DEFAULT false NOT NULL,
    canceled_at timestamp with time zone,
    grace_end_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.tenant_subscriptions OWNER TO mbgadmin;

--
-- Name: tenants; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public.tenants (
    id uuid NOT NULL,
    name text NOT NULL,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    subscription_plan text DEFAULT 'FREE'::text NOT NULL,
    address text DEFAULT ''::text NOT NULL,
    contact_email text DEFAULT ''::text NOT NULL,
    contact_phone text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    plan_type text DEFAULT 'TRIAL'::text NOT NULL,
    subscription_end_at timestamp with time zone DEFAULT (now() + '30 days'::interval) NOT NULL,
    is_trial boolean DEFAULT true NOT NULL
);


ALTER TABLE public.tenants OWNER TO mbgadmin;

--
-- Name: tools; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public.tools (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL
);


ALTER TABLE public.tools OWNER TO mbgadmin;

--
-- Name: users; Type: TABLE; Schema: public; Owner: mbgadmin
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    email text NOT NULL,
    name text NOT NULL,
    role text NOT NULL,
    password_hash text DEFAULT ''::text NOT NULL,
    pin_hash text,
    staff_code text
);


ALTER TABLE public.users OWNER TO mbgadmin;

--
-- Data for Name: _sqlx_migrations; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public._sqlx_migrations (version, description, installed_on, success, checksum, execution_time) FROM stdin;
1	init	2026-03-24 05:38:06.16325+00	t	\\x880113b042bcb222b1d0f48cee128aa8d10de9b5c99effcaf91cca69ce04ed66bf9bd7bba63b3409d58f9bedb83f14ec	4269302
2	auth	2026-03-24 05:39:48.229096+00	t	\\x93f5483a587e4af1de4bf3fd23fe691896eba19289c54ac80e9c72ae20f15392582beabb624b99a3ba3f88375cc95c1e	18321583
3	tenants comprehensive	2026-03-24 05:39:48.255631+00	t	\\x76717d8977890935e4bfe5a19b668885f04cedfb2ae927cd380ae8bd3505c73c95c994ef81bc63b36d2b0feb449ca6d1	8096424
4	subscription	2026-03-24 05:39:48.272424+00	t	\\x5fa7d11fa91e48c6cdf100cf35899a882821a8bfd853939fdefbbd33fdc8aa97b5d3efde27885f2aa97f449d4d040636	7877842
5	scheduler metrics	2026-03-24 05:41:45.286598+00	t	\\x88e016ae75c78fec370337a485c3f6cff628a9ce514a1e38f3c4349a4b531d934ed3572dc758d38e82a5cdbf6fcce0bf	38343153
6	roles and audit	2026-03-24 05:41:45.339563+00	t	\\x668c9c7fd8ae382b00134f7398673e982c3d530e55c26575cad85e5f590320c41597178df5774464946c8ef0192a29d7	100003002
7	recipe steps	2026-03-24 05:41:45.478374+00	t	\\x64ec4a319bd7effad8c825a08773139509a3c9e46d02a2cdf57c01b77abd71593f46f2ba037ca7e130a407af8307e1e7	121926483
8	nutrisurvey	2026-03-24 05:41:45.698438+00	t	\\x17e00f5c22eb9cfecf599805f7aebf1bb8dd4393616e85dec02db535a1535fc53cc735148fe812459ee04c5e116955db	116297180
9	nutrisurvey history	2026-03-24 05:41:45.896079+00	t	\\x205456bd10bb4b8f838871411952e176af5a2957ef2d129cb0b792db824b935ac88bb855d23e93049b2972d0ba7b87ee	109278382
10	foods	2026-03-24 05:41:46.106378+00	t	\\xc420a31fc60063c261a7e23ea34db721c7e777de103dafa4dc9d2499e67346ea350e0ed57055b682b15d19b4d19b16d8	93096609
11	food management	2026-03-24 05:41:46.27013+00	t	\\x3963972bb9d6a682cc0c7c9cac0c8ed3b02d2698ac9db78a8f42d38b31e0a5397eb6177f08d299d480854c44d89f4aa6	132592601
12	kitchen resources	2026-03-24 05:45:41.617127+00	t	\\x52b4834f294c8ba095bcc30ed7df0deec6c0e19d6e87f9c2b1ae2a45fd507d9c766916498c96e06c6442fd77998eff56	16276033
14	tasks	2026-03-24 05:45:41.658456+00	t	\\x8e65377b73f42492fc2d1cb04fb56b4be285f52c32ccfe6ca63649f85279c802122fd30040c751abe4294611a2bbb9fc	8269135
15	finance description	2026-03-24 05:45:41.675428+00	t	\\xb4fd0ec5ac99ee5679f340f280461ee77de7e29dcf0f80373b0c136ec0cd91b7ca22870e75c91411f617256158db4017	32756219
16	attendance payroll	2026-03-24 05:45:41.847547+00	t	\\x7b7c605bbc031210491e4851de56f248945cd6f9f19a045405fa13445fc6dff68e6f5cbdbac523e9bd403ccd85253e82	160786539
17	platform auth	2026-03-24 05:45:42.041932+00	t	\\x081b76d7dc4093eb9fce69413dde745fd1c2d82e1b41936507ab0658df867d14e54b91d63e65a8e9992c5031e277267d	83015201
18	billing system	2026-03-24 05:45:42.133903+00	t	\\xd7fb98ea1dca75dba96c2e0f44c448a6e0234f481b918bb26a29f7752d54527f4d09c408004eec4ebd19787986285b40	68205281
19	billing bigint	2026-03-24 05:45:42.208684+00	t	\\x2025b4f14deea8dc4760b257bfa7b09763f02050d1d4bf16322829b60a809ee56ba76cc96a44b7f51ea0095960ffd83f	387101455
20	procurement	2026-03-24 05:45:42.60336+00	t	\\x661bd043e08abf740f0f483107e200b53e9f138ca37f1e26fe0e565470baf2bea443098f6553b7c3584e17447d567bc0	8346020
21	inventory upgrade	2026-03-24 05:45:42.620115+00	t	\\x1400c881673dbdcb3b8faf33c9f5b9ec02958fcdfb5619c48f97b30869b76715ab3fac5d41164cc6dcf33af34d0d6ce5	8080449
22	fundamental fixes	2026-03-24 05:45:42.636584+00	t	\\xe079b91a53c95e6a14d0ba955f4df666c7dc01816c191e69a89828315e01711b13be1730994539ecc6ca8b39f036ee6c	33430223
23	finance foundation	2026-03-24 05:45:42.678513+00	t	\\x0d182dc54a6be92954bb58de4445f72e0570c9fca533f327248b08e56f4540a5a095e4e8ccd8d0ba17ed129cf81aa9bd	8012153
24	staff portal login	2026-03-24 05:45:42.695209+00	t	\\xf581939cd6085b7c8959a7387448b9b6b7f28a2d8fc61cebb37e5ac176bea788fd6a1383aebe3ca2caeb8defd9af58a4	8035113
25	ingredients estimated price	2026-03-24 05:45:42.712014+00	t	\\x1671b7d6a34e544ef7ed7f343c0e979bc4cf87b7a5881f9e92cd8ea69f177990afcec3a80a34283eb6aa41f7075bdc7b	7742079
26	schema fixes	2026-03-24 05:45:42.728546+00	t	\\xdb5ee5294e47ca0e638069ca3aaaef01dbab6b699909889deaca599a82e9f9c201812d944686cb5872e84a8ab568c737	8077191
27	staff face recognition	2026-03-25 05:52:21.858982+00	t	\\x7846de8a11d18aedbef353abe824cc24cf7d2e6090566f68ad7c4b2a41ee5eb5a0eec551effcb20165ef0791e00c2bbe	652629278
13	staff shifts init	2026-03-28 02:33:02.543502+00	t	\\xffa44c1dc8a77b022f7301e79427fa7ecebb44c0e39d37040a7ab97df7cfb8cdce69a6603ea71815fdddbf6cb5e7da5c	18291564
28	v7 planner	2026-03-28 04:23:57.615358+00	t	\\xcb40ff66797739ed0f4f1d153577fb9aae947a3863b98e352437004a91665e89cdc74b4e71d3d16cf1f852d40c4d0eaa	89733559
\.


--
-- Data for Name: attendance_daily; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public.attendance_daily (tenant_id, staff_id, work_date, shift_id, minutes_worked, late_minutes, overtime_minutes, status, note, updated_at) FROM stdin;
\.


--
-- Data for Name: attendance_events; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public.attendance_events (id, tenant_id, staff_id, event_type, occurred_at, source, note, meta_json, created_at) FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public.audit_logs (id, tenant_id, user_id, action, resource, details, ip_address, occurred_at) FROM stdin;
\.


--
-- Data for Name: batch_checklist; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public.batch_checklist (id, tenant_id, batch_id, description, done, scheduled_start, scheduled_end, photo_url, checked_at, checked_by, target_role) FROM stdin;
\.


--
-- Data for Name: delivery_waves; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public.delivery_waves (id, plan_id, wave_number, target_time, portion_count, driver_id, tenant_id) FROM stdin;
\.


--
-- Data for Name: divisions; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public.divisions (id, tenant_id, name, capacity_per_batch, max_parallel_batches) FROM stdin;
\.


--
-- Data for Name: finance_coa; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public.finance_coa (id, tenant_id, account_code, account_name, account_group, normal_balance, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: finance_journal_lines; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public.finance_journal_lines (id, journal_id, tenant_id, account_code, description, debit, credit) FROM stdin;
\.


--
-- Data for Name: finance_journals; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public.finance_journals (id, tenant_id, journal_no, journal_date, description, status, created_at, posted_at) FROM stdin;
\.


--
-- Data for Name: finance_setup; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public.finance_setup (id, tenant_id, key, value, source_row, updated_at) FROM stdin;
\.


--
-- Data for Name: finance_sheets; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public.finance_sheets (id, tenant_id, sheet_name, row_no, cells, updated_at) FROM stdin;
\.


--
-- Data for Name: finance_transactions; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public.finance_transactions (id, tenant_id, category, amount, currency, occurred_at, description, staff_id, payroll_period_id) FROM stdin;
\.


--
-- Data for Name: food_menu_items; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public.food_menu_items (food_id, menu_item_id) FROM stdin;
\.


--
-- Data for Name: foods; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public.foods (id, tenant_id, name, created_at, date_served, packaging_type) FROM stdin;
\.


--
-- Data for Name: ingredient_prices; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public.ingredient_prices (tenant_id, ingredient_id, price_per_unit, currency, fetched_at, source) FROM stdin;
\.


--
-- Data for Name: ingredients; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public.ingredients (id, tenant_id, name, unit, nutrition_info, nutr_code, estimated_price) FROM stdin;
\.


--
-- Data for Name: inventory; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public.inventory (id, tenant_id, ingredient_id, quantity, unit, updated_at) FROM stdin;
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public.invoices (id, tenant_id, subscription_id, invoice_number, amount, currency, status, due_at, paid_at, payment_method, external_id, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: kitchen_resources; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public.kitchen_resources (id, tenant_id, name, resource_type, capacity, status, created_at) FROM stdin;
\.


--
-- Data for Name: license_keys; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public.license_keys (key_code, plan_duration_days, generated_by, generated_at, status, used_by_tenant_id, used_at) FROM stdin;
\.


--
-- Data for Name: menu_ingredient_prep; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public.menu_ingredient_prep (id, tenant_id, menu_item_id, ingredient_id, action_type, duration_per_kg_minutes, is_enabled) FROM stdin;
\.


--
-- Data for Name: menu_items; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public.menu_items (id, tenant_id, name, recipe_id, food_id, extra_packing_json) FROM stdin;
\.


--
-- Data for Name: nutr_calc_runs; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public.nutr_calc_runs (id, tenant_id, menu_id, menu_name, at, actor_email, target_set, nutrient_codes, totals, detail, missing_count, energy_kcal, created_at) FROM stdin;
\.


--
-- Data for Name: nutr_foods; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public.nutr_foods (code, name, nutr_values) FROM stdin;
\.


--
-- Data for Name: nutr_meta; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public.nutr_meta (key, value) FROM stdin;
\.


--
-- Data for Name: nutr_nutrients; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public.nutr_nutrients (code, name, label, unit, decimals, idx) FROM stdin;
\.


--
-- Data for Name: nutr_targets; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public.nutr_targets (id, target_set, label, min, max) FROM stdin;
\.


--
-- Data for Name: operational_materials; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public.operational_materials (id, tenant_id, name, unit, qty_per_portion, estimated_price, created_at) FROM stdin;
\.


--
-- Data for Name: payroll_items; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public.payroll_items (id, tenant_id, period_id, staff_id, pay_type, rate, minutes_worked, gross, deductions, net, currency, breakdown_json, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: payroll_periods; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public.payroll_periods (id, tenant_id, start_date, end_date, status, created_by, created_at, posted_at) FROM stdin;
\.


--
-- Data for Name: plan_materials; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public.plan_materials (id, tenant_id, plan_id, ingredient_id, material_name, material_type, quantity_needed, unit, estimated_price_per_unit, estimated_total, price_source, created_at, received_qty, received_at, received_by) FROM stdin;
\.


--
-- Data for Name: platform_users; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public.platform_users (id, email, name, role, password_hash, created_at, last_login_at, disabled_at, tenant_id) FROM stdin;
\.


--
-- Data for Name: production_batches; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public.production_batches (id, tenant_id, plan_id, division_id, menu_item_id, batch_size, start_time, end_time, current_status) FROM stdin;
\.


--
-- Data for Name: production_drafts; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public.production_drafts (id, tenant_id, plan_date, data_json, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: production_plans; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public.production_plans (id, tenant_id, status, target_portions, target_delivery_time, feasible, generated_at, lateness_minutes, bottleneck_rate, plan_data, material_total) FROM stdin;
\.


--
-- Data for Name: purchase_orders; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public.purchase_orders (id, tenant_id, plan_id, po_number, visibility, target_supplier_ids, fixed_total_price, status, delivery_deadline, notes, created_at) FROM stdin;
\.


--
-- Data for Name: recipe_ingredients; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public.recipe_ingredients (recipe_id, ingredient_id, quantity_per_portion, cutting_enabled, cutting_duration_minutes, cutting_output_per_duration, washing_enabled, washing_duration_minutes, washing_output_per_duration, peeling_enabled, peeling_duration_minutes, peeling_output_per_duration) FROM stdin;
\.


--
-- Data for Name: recipe_step_requirements; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public.recipe_step_requirements (id, step_id, resource_type, quantity_needed) FROM stdin;
\.


--
-- Data for Name: recipe_steps; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public.recipe_steps (id, recipe_id, step_order, description, division_type, estimated_duration_minutes, required_resource_type, batch_capacity, batch_duration_minutes) FROM stdin;
\.


--
-- Data for Name: recipe_tools; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public.recipe_tools (recipe_id, tool_id, batch_capacity, batch_duration_minutes) FROM stdin;
\.


--
-- Data for Name: recipes; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public.recipes (id, tenant_id, name, instructions, portion_size, extra_packing_json, packaging_type) FROM stdin;
\.


--
-- Data for Name: shifts; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public.shifts (id, tenant_id, name, start_time, end_time, division_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: staff; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public.staff (id, tenant_id, name, role, skills_json, created_at, updated_at, user_id, email, division, phone, staff_code, pin_hash, face_registered, face_updated_at) FROM stdin;
\.


--
-- Data for Name: staff_compensation; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public.staff_compensation (id, tenant_id, staff_id, pay_type, rate, currency, effective_from, meta_json, created_at) FROM stdin;
\.


--
-- Data for Name: staff_shift_assignments; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public.staff_shift_assignments (id, tenant_id, staff_id, shift_id, work_date, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: stock_movements; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public.stock_movements (id, tenant_id, ingredient_id, movement_type, quantity, occurred_at, qty_before, qty_after, delta, note) FROM stdin;
\.


--
-- Data for Name: subscription_plans; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public.subscription_plans (code, name, price_monthly, currency, features, limits, is_active, created_at) FROM stdin;
TRIAL	Uji Coba	0	IDR	{"modules": ["all"]}	{"days": 14, "max_users": 3}	t	2026-03-24 04:09:01.391441+00
BASIC	Dasar	150000	IDR	{"modules": ["inventory", "finance"]}	{"max_users": 10}	t	2026-03-24 04:09:01.391441+00
PRO	Profesional	500000	IDR	{"modules": ["all"]}	{"max_users": 50}	t	2026-03-24 04:09:01.391441+00
\.


--
-- Data for Name: supplier_bid_items; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public.supplier_bid_items (id, bid_id, material_id, offered_qty, offered_price_per_unit, notes) FROM stdin;
\.


--
-- Data for Name: supplier_bids; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public.supplier_bids (id, po_id, supplier_id, status, total_amount, notes, submitted_at, reviewed_at, reviewed_by, created_at) FROM stdin;
\.


--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public.suppliers (id, email, name, company_name, contact_phone, address, password_hash, subscription_tier, subscription_expires_at, orders_taken_this_period, period_reset_at, is_active, created_at) FROM stdin;
0f752860-9fc1-4a5e-ac29-65b893d1f258	jokodua@gmail.com	adi	PT Berkah Mandiri	08123456789	Ponorogo	$argon2id$v=19$m=19456,t=2,p=1$WgaBR+7xIyXqefySarGayg$CPbIlx5LTeiOj/1yAzwexVjtUyx2ABqlZVQovpealog	free	\N	0	2026-03-24 05:51:37.151045+00	t	2026-03-24 05:51:37.151045+00
5459b465-c124-419e-8f6d-6389f5a8c2e8	jokotiga@gmail.com	adi	PT Berkah Mandiri	08123456789	Ponorogo	$argon2id$v=19$m=19456,t=2,p=1$fsJ3lYYTm/E2QB7h/SWjug$s6Lpm2yNiwqzPfn4hCtvsLSUpxMDmp4T2ThEOPwXALQ	free	\N	0	2026-03-24 06:23:20.410456+00	t	2026-03-24 06:23:20.410456+00
\.


--
-- Data for Name: tasks; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public.tasks (id, tenant_id, title, division, due_date, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: tenant_settings; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public.tenant_settings (tenant_id, key, value, updated_at) FROM stdin;
\.


--
-- Data for Name: tenant_subscriptions; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public.tenant_subscriptions (id, tenant_id, plan_code, status, current_period_start, current_period_end, cancel_at_period_end, canceled_at, grace_end_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: tenants; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public.tenants (id, name, status, subscription_plan, address, contact_email, contact_phone, created_at, updated_at, plan_type, subscription_end_at, is_trial) FROM stdin;
a2c70290-f78d-4d69-8db9-1769e2d2cc27	SPPG Ngraket	ACTIVE	FREE				2026-03-26 06:11:15.105336+00	2026-03-26 06:11:15.105336+00	PRO	2026-04-25 06:11:15.105336+00	t
\.


--
-- Data for Name: tools; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public.tools (id, tenant_id, name) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: mbgadmin
--

COPY public.users (id, tenant_id, email, name, role, password_hash, pin_hash, staff_code) FROM stdin;
\.


--
-- Name: _sqlx_migrations _sqlx_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public._sqlx_migrations
    ADD CONSTRAINT _sqlx_migrations_pkey PRIMARY KEY (version);


--
-- Name: attendance_daily attendance_daily_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.attendance_daily
    ADD CONSTRAINT attendance_daily_pkey PRIMARY KEY (tenant_id, staff_id, work_date);


--
-- Name: attendance_events attendance_events_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.attendance_events
    ADD CONSTRAINT attendance_events_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: batch_checklist batch_checklist_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.batch_checklist
    ADD CONSTRAINT batch_checklist_pkey PRIMARY KEY (id);


--
-- Name: delivery_waves delivery_waves_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.delivery_waves
    ADD CONSTRAINT delivery_waves_pkey PRIMARY KEY (id);


--
-- Name: divisions divisions_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.divisions
    ADD CONSTRAINT divisions_pkey PRIMARY KEY (id);


--
-- Name: divisions divisions_tenant_id_name_key; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.divisions
    ADD CONSTRAINT divisions_tenant_id_name_key UNIQUE (tenant_id, name);


--
-- Name: finance_coa finance_coa_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.finance_coa
    ADD CONSTRAINT finance_coa_pkey PRIMARY KEY (id);


--
-- Name: finance_coa finance_coa_tenant_id_account_code_key; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.finance_coa
    ADD CONSTRAINT finance_coa_tenant_id_account_code_key UNIQUE (tenant_id, account_code);


--
-- Name: finance_journal_lines finance_journal_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.finance_journal_lines
    ADD CONSTRAINT finance_journal_lines_pkey PRIMARY KEY (id);


--
-- Name: finance_journals finance_journals_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.finance_journals
    ADD CONSTRAINT finance_journals_pkey PRIMARY KEY (id);


--
-- Name: finance_setup finance_setup_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.finance_setup
    ADD CONSTRAINT finance_setup_pkey PRIMARY KEY (id);


--
-- Name: finance_setup finance_setup_tenant_id_key_key; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.finance_setup
    ADD CONSTRAINT finance_setup_tenant_id_key_key UNIQUE (tenant_id, key);


--
-- Name: finance_sheets finance_sheets_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.finance_sheets
    ADD CONSTRAINT finance_sheets_pkey PRIMARY KEY (id);


--
-- Name: finance_sheets finance_sheets_tenant_id_sheet_name_row_no_key; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.finance_sheets
    ADD CONSTRAINT finance_sheets_tenant_id_sheet_name_row_no_key UNIQUE (tenant_id, sheet_name, row_no);


--
-- Name: finance_transactions finance_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.finance_transactions
    ADD CONSTRAINT finance_transactions_pkey PRIMARY KEY (id);


--
-- Name: food_menu_items food_menu_items_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.food_menu_items
    ADD CONSTRAINT food_menu_items_pkey PRIMARY KEY (food_id, menu_item_id);


--
-- Name: foods foods_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.foods
    ADD CONSTRAINT foods_pkey PRIMARY KEY (id);


--
-- Name: foods foods_tenant_id_name_key; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.foods
    ADD CONSTRAINT foods_tenant_id_name_key UNIQUE (tenant_id, name);


--
-- Name: ingredient_prices ingredient_prices_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.ingredient_prices
    ADD CONSTRAINT ingredient_prices_pkey PRIMARY KEY (tenant_id, ingredient_id, fetched_at);


--
-- Name: ingredients ingredients_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.ingredients
    ADD CONSTRAINT ingredients_pkey PRIMARY KEY (id);


--
-- Name: ingredients ingredients_tenant_id_name_key; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.ingredients
    ADD CONSTRAINT ingredients_tenant_id_name_key UNIQUE (tenant_id, name);


--
-- Name: inventory inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_pkey PRIMARY KEY (id);


--
-- Name: inventory inventory_tenant_id_ingredient_id_key; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_tenant_id_ingredient_id_key UNIQUE (tenant_id, ingredient_id);


--
-- Name: invoices invoices_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_invoice_number_key UNIQUE (invoice_number);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: kitchen_resources kitchen_resources_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.kitchen_resources
    ADD CONSTRAINT kitchen_resources_pkey PRIMARY KEY (id);


--
-- Name: license_keys license_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.license_keys
    ADD CONSTRAINT license_keys_pkey PRIMARY KEY (key_code);


--
-- Name: menu_ingredient_prep menu_ingredient_prep_menu_item_id_ingredient_id_action_type_key; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.menu_ingredient_prep
    ADD CONSTRAINT menu_ingredient_prep_menu_item_id_ingredient_id_action_type_key UNIQUE (menu_item_id, ingredient_id, action_type);


--
-- Name: menu_ingredient_prep menu_ingredient_prep_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.menu_ingredient_prep
    ADD CONSTRAINT menu_ingredient_prep_pkey PRIMARY KEY (id);


--
-- Name: menu_items menu_items_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_pkey PRIMARY KEY (id);


--
-- Name: menu_items menu_items_tenant_id_name_key; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_tenant_id_name_key UNIQUE (tenant_id, name);


--
-- Name: nutr_calc_runs nutr_calc_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.nutr_calc_runs
    ADD CONSTRAINT nutr_calc_runs_pkey PRIMARY KEY (id);


--
-- Name: nutr_foods nutr_foods_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.nutr_foods
    ADD CONSTRAINT nutr_foods_pkey PRIMARY KEY (code);


--
-- Name: nutr_meta nutr_meta_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.nutr_meta
    ADD CONSTRAINT nutr_meta_pkey PRIMARY KEY (key);


--
-- Name: nutr_nutrients nutr_nutrients_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.nutr_nutrients
    ADD CONSTRAINT nutr_nutrients_pkey PRIMARY KEY (code);


--
-- Name: nutr_targets nutr_targets_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.nutr_targets
    ADD CONSTRAINT nutr_targets_pkey PRIMARY KEY (id);


--
-- Name: operational_materials operational_materials_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.operational_materials
    ADD CONSTRAINT operational_materials_pkey PRIMARY KEY (id);


--
-- Name: operational_materials operational_materials_tenant_id_name_key; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.operational_materials
    ADD CONSTRAINT operational_materials_tenant_id_name_key UNIQUE (tenant_id, name);


--
-- Name: payroll_items payroll_items_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.payroll_items
    ADD CONSTRAINT payroll_items_pkey PRIMARY KEY (id);


--
-- Name: payroll_items payroll_items_tenant_id_period_id_staff_id_key; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.payroll_items
    ADD CONSTRAINT payroll_items_tenant_id_period_id_staff_id_key UNIQUE (tenant_id, period_id, staff_id);


--
-- Name: payroll_periods payroll_periods_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.payroll_periods
    ADD CONSTRAINT payroll_periods_pkey PRIMARY KEY (id);


--
-- Name: payroll_periods payroll_periods_tenant_id_start_date_end_date_key; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.payroll_periods
    ADD CONSTRAINT payroll_periods_tenant_id_start_date_end_date_key UNIQUE (tenant_id, start_date, end_date);


--
-- Name: plan_materials plan_materials_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.plan_materials
    ADD CONSTRAINT plan_materials_pkey PRIMARY KEY (id);


--
-- Name: platform_users platform_users_email_key; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.platform_users
    ADD CONSTRAINT platform_users_email_key UNIQUE (email);


--
-- Name: platform_users platform_users_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.platform_users
    ADD CONSTRAINT platform_users_pkey PRIMARY KEY (id);


--
-- Name: production_batches production_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.production_batches
    ADD CONSTRAINT production_batches_pkey PRIMARY KEY (id);


--
-- Name: production_drafts production_drafts_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.production_drafts
    ADD CONSTRAINT production_drafts_pkey PRIMARY KEY (id);


--
-- Name: production_plans production_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.production_plans
    ADD CONSTRAINT production_plans_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: recipe_ingredients recipe_ingredients_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.recipe_ingredients
    ADD CONSTRAINT recipe_ingredients_pkey PRIMARY KEY (recipe_id, ingredient_id);


--
-- Name: recipe_step_requirements recipe_step_requirements_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.recipe_step_requirements
    ADD CONSTRAINT recipe_step_requirements_pkey PRIMARY KEY (id);


--
-- Name: recipe_step_requirements recipe_step_requirements_step_id_resource_type_key; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.recipe_step_requirements
    ADD CONSTRAINT recipe_step_requirements_step_id_resource_type_key UNIQUE (step_id, resource_type);


--
-- Name: recipe_steps recipe_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.recipe_steps
    ADD CONSTRAINT recipe_steps_pkey PRIMARY KEY (id);


--
-- Name: recipe_steps recipe_steps_recipe_id_step_order_key; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.recipe_steps
    ADD CONSTRAINT recipe_steps_recipe_id_step_order_key UNIQUE (recipe_id, step_order);


--
-- Name: recipe_tools recipe_tools_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.recipe_tools
    ADD CONSTRAINT recipe_tools_pkey PRIMARY KEY (recipe_id, tool_id);


--
-- Name: recipes recipes_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.recipes
    ADD CONSTRAINT recipes_pkey PRIMARY KEY (id);


--
-- Name: recipes recipes_tenant_id_name_key; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.recipes
    ADD CONSTRAINT recipes_tenant_id_name_key UNIQUE (tenant_id, name);


--
-- Name: shifts shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT shifts_pkey PRIMARY KEY (id);


--
-- Name: staff_compensation staff_compensation_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.staff_compensation
    ADD CONSTRAINT staff_compensation_pkey PRIMARY KEY (id);


--
-- Name: staff_compensation staff_compensation_tenant_id_staff_id_effective_from_key; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.staff_compensation
    ADD CONSTRAINT staff_compensation_tenant_id_staff_id_effective_from_key UNIQUE (tenant_id, staff_id, effective_from);


--
-- Name: staff staff_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_pkey PRIMARY KEY (id);


--
-- Name: staff_shift_assignments staff_shift_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.staff_shift_assignments
    ADD CONSTRAINT staff_shift_assignments_pkey PRIMARY KEY (id);


--
-- Name: staff_shift_assignments staff_shift_assignments_tenant_id_staff_id_work_date_key; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.staff_shift_assignments
    ADD CONSTRAINT staff_shift_assignments_tenant_id_staff_id_work_date_key UNIQUE (tenant_id, staff_id, work_date);


--
-- Name: stock_movements stock_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_pkey PRIMARY KEY (id);


--
-- Name: subscription_plans subscription_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_pkey PRIMARY KEY (code);


--
-- Name: supplier_bid_items supplier_bid_items_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.supplier_bid_items
    ADD CONSTRAINT supplier_bid_items_pkey PRIMARY KEY (id);


--
-- Name: supplier_bids supplier_bids_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.supplier_bids
    ADD CONSTRAINT supplier_bids_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_email_key; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_email_key UNIQUE (email);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: tenant_settings tenant_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.tenant_settings
    ADD CONSTRAINT tenant_settings_pkey PRIMARY KEY (tenant_id, key);


--
-- Name: tenant_subscriptions tenant_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.tenant_subscriptions
    ADD CONSTRAINT tenant_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: tools tools_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.tools
    ADD CONSTRAINT tools_pkey PRIMARY KEY (id);


--
-- Name: tools tools_tenant_id_name_key; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.tools
    ADD CONSTRAINT tools_tenant_id_name_key UNIQUE (tenant_id, name);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_tenant_id_email_key; Type: CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_tenant_id_email_key UNIQUE (tenant_id, email);


--
-- Name: idx_attendance_daily_tenant_date; Type: INDEX; Schema: public; Owner: mbgadmin
--

CREATE INDEX idx_attendance_daily_tenant_date ON public.attendance_daily USING btree (tenant_id, work_date);


--
-- Name: idx_attendance_events_tenant_staff_time; Type: INDEX; Schema: public; Owner: mbgadmin
--

CREATE INDEX idx_attendance_events_tenant_staff_time ON public.attendance_events USING btree (tenant_id, staff_id, occurred_at);


--
-- Name: idx_audit_logs_tenant_occurred; Type: INDEX; Schema: public; Owner: mbgadmin
--

CREATE INDEX idx_audit_logs_tenant_occurred ON public.audit_logs USING btree (tenant_id, occurred_at DESC);


--
-- Name: idx_batch_checklist_batch; Type: INDEX; Schema: public; Owner: mbgadmin
--

CREATE INDEX idx_batch_checklist_batch ON public.batch_checklist USING btree (batch_id);


--
-- Name: idx_delivery_waves_plan; Type: INDEX; Schema: public; Owner: mbgadmin
--

CREATE INDEX idx_delivery_waves_plan ON public.delivery_waves USING btree (plan_id);


--
-- Name: idx_finance_coa_tenant; Type: INDEX; Schema: public; Owner: mbgadmin
--

CREATE INDEX idx_finance_coa_tenant ON public.finance_coa USING btree (tenant_id);


--
-- Name: idx_finance_journals_tenant; Type: INDEX; Schema: public; Owner: mbgadmin
--

CREATE INDEX idx_finance_journals_tenant ON public.finance_journals USING btree (tenant_id, journal_date DESC);


--
-- Name: idx_finance_setup_tenant; Type: INDEX; Schema: public; Owner: mbgadmin
--

CREATE INDEX idx_finance_setup_tenant ON public.finance_setup USING btree (tenant_id);


--
-- Name: idx_finance_sheets_tenant_sheet; Type: INDEX; Schema: public; Owner: mbgadmin
--

CREATE INDEX idx_finance_sheets_tenant_sheet ON public.finance_sheets USING btree (tenant_id, sheet_name);


--
-- Name: idx_finance_transactions_category; Type: INDEX; Schema: public; Owner: mbgadmin
--

CREATE INDEX idx_finance_transactions_category ON public.finance_transactions USING btree (tenant_id, category);


--
-- Name: idx_finance_transactions_tenant_occurred; Type: INDEX; Schema: public; Owner: mbgadmin
--

CREATE INDEX idx_finance_transactions_tenant_occurred ON public.finance_transactions USING btree (tenant_id, occurred_at DESC);


--
-- Name: idx_journal_lines_journal; Type: INDEX; Schema: public; Owner: mbgadmin
--

CREATE INDEX idx_journal_lines_journal ON public.finance_journal_lines USING btree (journal_id);


--
-- Name: idx_kitchen_resources_tenant; Type: INDEX; Schema: public; Owner: mbgadmin
--

CREATE INDEX idx_kitchen_resources_tenant ON public.kitchen_resources USING btree (tenant_id);


--
-- Name: idx_menu_ingredient_prep_menu; Type: INDEX; Schema: public; Owner: mbgadmin
--

CREATE INDEX idx_menu_ingredient_prep_menu ON public.menu_ingredient_prep USING btree (menu_item_id);


--
-- Name: idx_nutr_calc_runs_menu_at; Type: INDEX; Schema: public; Owner: mbgadmin
--

CREATE INDEX idx_nutr_calc_runs_menu_at ON public.nutr_calc_runs USING btree (menu_id, at DESC);


--
-- Name: idx_nutr_calc_runs_tenant_at; Type: INDEX; Schema: public; Owner: mbgadmin
--

CREATE INDEX idx_nutr_calc_runs_tenant_at ON public.nutr_calc_runs USING btree (tenant_id, at DESC);


--
-- Name: idx_payroll_items_period; Type: INDEX; Schema: public; Owner: mbgadmin
--

CREATE INDEX idx_payroll_items_period ON public.payroll_items USING btree (period_id);


--
-- Name: idx_payroll_periods_tenant_dates; Type: INDEX; Schema: public; Owner: mbgadmin
--

CREATE INDEX idx_payroll_periods_tenant_dates ON public.payroll_periods USING btree (tenant_id, start_date, end_date);


--
-- Name: idx_plan_materials_plan; Type: INDEX; Schema: public; Owner: mbgadmin
--

CREATE INDEX idx_plan_materials_plan ON public.plan_materials USING btree (plan_id);


--
-- Name: idx_production_batches_division; Type: INDEX; Schema: public; Owner: mbgadmin
--

CREATE INDEX idx_production_batches_division ON public.production_batches USING btree (division_id);


--
-- Name: idx_production_batches_plan; Type: INDEX; Schema: public; Owner: mbgadmin
--

CREATE INDEX idx_production_batches_plan ON public.production_batches USING btree (plan_id);


--
-- Name: idx_production_drafts_tenant_date; Type: INDEX; Schema: public; Owner: mbgadmin
--

CREATE INDEX idx_production_drafts_tenant_date ON public.production_drafts USING btree (tenant_id, plan_date);


--
-- Name: idx_production_plans_tenant_status; Type: INDEX; Schema: public; Owner: mbgadmin
--

CREATE INDEX idx_production_plans_tenant_status ON public.production_plans USING btree (tenant_id, status);


--
-- Name: idx_purchase_orders_plan; Type: INDEX; Schema: public; Owner: mbgadmin
--

CREATE INDEX idx_purchase_orders_plan ON public.purchase_orders USING btree (plan_id);


--
-- Name: idx_purchase_orders_status; Type: INDEX; Schema: public; Owner: mbgadmin
--

CREATE INDEX idx_purchase_orders_status ON public.purchase_orders USING btree (status);


--
-- Name: idx_recipe_ingredients_ingredient; Type: INDEX; Schema: public; Owner: mbgadmin
--

CREATE INDEX idx_recipe_ingredients_ingredient ON public.recipe_ingredients USING btree (ingredient_id);


--
-- Name: idx_shifts_tenant; Type: INDEX; Schema: public; Owner: mbgadmin
--

CREATE INDEX idx_shifts_tenant ON public.shifts USING btree (tenant_id);


--
-- Name: idx_staff_compensation_staff_effective; Type: INDEX; Schema: public; Owner: mbgadmin
--

CREATE INDEX idx_staff_compensation_staff_effective ON public.staff_compensation USING btree (staff_id, effective_from);


--
-- Name: idx_staff_face_registered; Type: INDEX; Schema: public; Owner: mbgadmin
--

CREATE INDEX idx_staff_face_registered ON public.staff USING btree (face_registered) WHERE (face_registered = true);


--
-- Name: idx_staff_shift_assignments_staff_date; Type: INDEX; Schema: public; Owner: mbgadmin
--

CREATE INDEX idx_staff_shift_assignments_staff_date ON public.staff_shift_assignments USING btree (staff_id, work_date);


--
-- Name: idx_staff_shift_assignments_tenant_date; Type: INDEX; Schema: public; Owner: mbgadmin
--

CREATE INDEX idx_staff_shift_assignments_tenant_date ON public.staff_shift_assignments USING btree (tenant_id, work_date);


--
-- Name: idx_staff_tenant; Type: INDEX; Schema: public; Owner: mbgadmin
--

CREATE INDEX idx_staff_tenant ON public.staff USING btree (tenant_id);


--
-- Name: idx_staff_tenant_staff_code; Type: INDEX; Schema: public; Owner: mbgadmin
--

CREATE UNIQUE INDEX idx_staff_tenant_staff_code ON public.staff USING btree (tenant_id, staff_code) WHERE ((staff_code IS NOT NULL) AND (btrim(staff_code) <> ''::text));


--
-- Name: idx_staff_user_id; Type: INDEX; Schema: public; Owner: mbgadmin
--

CREATE INDEX idx_staff_user_id ON public.staff USING btree (user_id) WHERE (user_id IS NOT NULL);


--
-- Name: idx_step_requirements_step; Type: INDEX; Schema: public; Owner: mbgadmin
--

CREATE INDEX idx_step_requirements_step ON public.recipe_step_requirements USING btree (step_id);


--
-- Name: idx_stock_movements_ingredient; Type: INDEX; Schema: public; Owner: mbgadmin
--

CREATE INDEX idx_stock_movements_ingredient ON public.stock_movements USING btree (tenant_id, ingredient_id, occurred_at DESC);


--
-- Name: idx_stock_movements_tenant_occurred; Type: INDEX; Schema: public; Owner: mbgadmin
--

CREATE INDEX idx_stock_movements_tenant_occurred ON public.stock_movements USING btree (tenant_id, occurred_at DESC);


--
-- Name: idx_supplier_bid_items_bid; Type: INDEX; Schema: public; Owner: mbgadmin
--

CREATE INDEX idx_supplier_bid_items_bid ON public.supplier_bid_items USING btree (bid_id);


--
-- Name: idx_supplier_bids_po; Type: INDEX; Schema: public; Owner: mbgadmin
--

CREATE INDEX idx_supplier_bids_po ON public.supplier_bids USING btree (po_id);


--
-- Name: idx_supplier_bids_supplier; Type: INDEX; Schema: public; Owner: mbgadmin
--

CREATE INDEX idx_supplier_bids_supplier ON public.supplier_bids USING btree (supplier_id);


--
-- Name: idx_tasks_tenant_created; Type: INDEX; Schema: public; Owner: mbgadmin
--

CREATE INDEX idx_tasks_tenant_created ON public.tasks USING btree (tenant_id, created_at DESC);


--
-- Name: idx_users_staff_code; Type: INDEX; Schema: public; Owner: mbgadmin
--

CREATE INDEX idx_users_staff_code ON public.users USING btree (tenant_id, staff_code);


--
-- Name: attendance_daily attendance_daily_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.attendance_daily
    ADD CONSTRAINT attendance_daily_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: attendance_events attendance_events_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.attendance_events
    ADD CONSTRAINT attendance_events_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: batch_checklist batch_checklist_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.batch_checklist
    ADD CONSTRAINT batch_checklist_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.production_batches(id) ON DELETE CASCADE;


--
-- Name: batch_checklist batch_checklist_checked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.batch_checklist
    ADD CONSTRAINT batch_checklist_checked_by_fkey FOREIGN KEY (checked_by) REFERENCES public.users(id);


--
-- Name: batch_checklist batch_checklist_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.batch_checklist
    ADD CONSTRAINT batch_checklist_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: delivery_waves delivery_waves_driver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.delivery_waves
    ADD CONSTRAINT delivery_waves_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: delivery_waves delivery_waves_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.delivery_waves
    ADD CONSTRAINT delivery_waves_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.production_plans(id) ON DELETE CASCADE;


--
-- Name: delivery_waves delivery_waves_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.delivery_waves
    ADD CONSTRAINT delivery_waves_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: divisions divisions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.divisions
    ADD CONSTRAINT divisions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: finance_coa finance_coa_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.finance_coa
    ADD CONSTRAINT finance_coa_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: finance_journal_lines finance_journal_lines_journal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.finance_journal_lines
    ADD CONSTRAINT finance_journal_lines_journal_id_fkey FOREIGN KEY (journal_id) REFERENCES public.finance_journals(id) ON DELETE CASCADE;


--
-- Name: finance_journal_lines finance_journal_lines_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.finance_journal_lines
    ADD CONSTRAINT finance_journal_lines_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: finance_journals finance_journals_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.finance_journals
    ADD CONSTRAINT finance_journals_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: finance_setup finance_setup_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.finance_setup
    ADD CONSTRAINT finance_setup_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: finance_sheets finance_sheets_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.finance_sheets
    ADD CONSTRAINT finance_sheets_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: finance_transactions finance_transactions_payroll_period_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.finance_transactions
    ADD CONSTRAINT finance_transactions_payroll_period_id_fkey FOREIGN KEY (payroll_period_id) REFERENCES public.payroll_periods(id) ON DELETE SET NULL;


--
-- Name: finance_transactions finance_transactions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.finance_transactions
    ADD CONSTRAINT finance_transactions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: food_menu_items food_menu_items_food_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.food_menu_items
    ADD CONSTRAINT food_menu_items_food_id_fkey FOREIGN KEY (food_id) REFERENCES public.foods(id) ON DELETE CASCADE;


--
-- Name: food_menu_items food_menu_items_menu_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.food_menu_items
    ADD CONSTRAINT food_menu_items_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;


--
-- Name: foods foods_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.foods
    ADD CONSTRAINT foods_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: ingredient_prices ingredient_prices_ingredient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.ingredient_prices
    ADD CONSTRAINT ingredient_prices_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES public.ingredients(id);


--
-- Name: ingredient_prices ingredient_prices_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.ingredient_prices
    ADD CONSTRAINT ingredient_prices_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: ingredients ingredients_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.ingredients
    ADD CONSTRAINT ingredients_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: inventory inventory_ingredient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES public.ingredients(id);


--
-- Name: inventory inventory_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: invoices invoices_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.tenant_subscriptions(id);


--
-- Name: invoices invoices_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: kitchen_resources kitchen_resources_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.kitchen_resources
    ADD CONSTRAINT kitchen_resources_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: menu_ingredient_prep menu_ingredient_prep_ingredient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.menu_ingredient_prep
    ADD CONSTRAINT menu_ingredient_prep_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES public.ingredients(id) ON DELETE CASCADE;


--
-- Name: menu_ingredient_prep menu_ingredient_prep_menu_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.menu_ingredient_prep
    ADD CONSTRAINT menu_ingredient_prep_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;


--
-- Name: menu_ingredient_prep menu_ingredient_prep_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.menu_ingredient_prep
    ADD CONSTRAINT menu_ingredient_prep_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: menu_items menu_items_food_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_food_id_fkey FOREIGN KEY (food_id) REFERENCES public.foods(id) ON DELETE SET NULL;


--
-- Name: menu_items menu_items_recipe_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipes(id);


--
-- Name: menu_items menu_items_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: nutr_calc_runs nutr_calc_runs_menu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.nutr_calc_runs
    ADD CONSTRAINT nutr_calc_runs_menu_id_fkey FOREIGN KEY (menu_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;


--
-- Name: nutr_calc_runs nutr_calc_runs_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.nutr_calc_runs
    ADD CONSTRAINT nutr_calc_runs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: operational_materials operational_materials_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.operational_materials
    ADD CONSTRAINT operational_materials_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: payroll_items payroll_items_period_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.payroll_items
    ADD CONSTRAINT payroll_items_period_id_fkey FOREIGN KEY (period_id) REFERENCES public.payroll_periods(id) ON DELETE CASCADE;


--
-- Name: payroll_items payroll_items_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.payroll_items
    ADD CONSTRAINT payroll_items_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: payroll_periods payroll_periods_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.payroll_periods
    ADD CONSTRAINT payroll_periods_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: plan_materials plan_materials_ingredient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.plan_materials
    ADD CONSTRAINT plan_materials_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES public.ingredients(id);


--
-- Name: plan_materials plan_materials_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.plan_materials
    ADD CONSTRAINT plan_materials_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.production_plans(id) ON DELETE CASCADE;


--
-- Name: plan_materials plan_materials_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.plan_materials
    ADD CONSTRAINT plan_materials_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: platform_users platform_users_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.platform_users
    ADD CONSTRAINT platform_users_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;


--
-- Name: production_batches production_batches_division_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.production_batches
    ADD CONSTRAINT production_batches_division_id_fkey FOREIGN KEY (division_id) REFERENCES public.divisions(id);


--
-- Name: production_batches production_batches_menu_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.production_batches
    ADD CONSTRAINT production_batches_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id);


--
-- Name: production_batches production_batches_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.production_batches
    ADD CONSTRAINT production_batches_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.production_plans(id) ON DELETE CASCADE;


--
-- Name: production_batches production_batches_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.production_batches
    ADD CONSTRAINT production_batches_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: production_drafts production_drafts_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.production_drafts
    ADD CONSTRAINT production_drafts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: production_plans production_plans_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.production_plans
    ADD CONSTRAINT production_plans_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: purchase_orders purchase_orders_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.production_plans(id) ON DELETE CASCADE;


--
-- Name: purchase_orders purchase_orders_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: recipe_ingredients recipe_ingredients_ingredient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.recipe_ingredients
    ADD CONSTRAINT recipe_ingredients_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES public.ingredients(id);


--
-- Name: recipe_ingredients recipe_ingredients_recipe_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.recipe_ingredients
    ADD CONSTRAINT recipe_ingredients_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON DELETE CASCADE;


--
-- Name: recipe_step_requirements recipe_step_requirements_step_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.recipe_step_requirements
    ADD CONSTRAINT recipe_step_requirements_step_id_fkey FOREIGN KEY (step_id) REFERENCES public.recipe_steps(id) ON DELETE CASCADE;


--
-- Name: recipe_steps recipe_steps_recipe_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.recipe_steps
    ADD CONSTRAINT recipe_steps_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON DELETE CASCADE;


--
-- Name: recipe_tools recipe_tools_recipe_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.recipe_tools
    ADD CONSTRAINT recipe_tools_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON DELETE CASCADE;


--
-- Name: recipe_tools recipe_tools_tool_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.recipe_tools
    ADD CONSTRAINT recipe_tools_tool_id_fkey FOREIGN KEY (tool_id) REFERENCES public.tools(id) ON DELETE CASCADE;


--
-- Name: recipes recipes_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.recipes
    ADD CONSTRAINT recipes_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: shifts shifts_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT shifts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: staff_compensation staff_compensation_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.staff_compensation
    ADD CONSTRAINT staff_compensation_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: staff_shift_assignments staff_shift_assignments_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.staff_shift_assignments
    ADD CONSTRAINT staff_shift_assignments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: staff staff_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: staff staff_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: stock_movements stock_movements_ingredient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES public.ingredients(id);


--
-- Name: stock_movements stock_movements_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: supplier_bid_items supplier_bid_items_bid_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.supplier_bid_items
    ADD CONSTRAINT supplier_bid_items_bid_id_fkey FOREIGN KEY (bid_id) REFERENCES public.supplier_bids(id) ON DELETE CASCADE;


--
-- Name: supplier_bid_items supplier_bid_items_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.supplier_bid_items
    ADD CONSTRAINT supplier_bid_items_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.plan_materials(id) ON DELETE CASCADE;


--
-- Name: supplier_bids supplier_bids_po_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.supplier_bids
    ADD CONSTRAINT supplier_bids_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE;


--
-- Name: supplier_bids supplier_bids_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.supplier_bids
    ADD CONSTRAINT supplier_bids_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: tenant_settings tenant_settings_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.tenant_settings
    ADD CONSTRAINT tenant_settings_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: tenant_subscriptions tenant_subscriptions_plan_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.tenant_subscriptions
    ADD CONSTRAINT tenant_subscriptions_plan_code_fkey FOREIGN KEY (plan_code) REFERENCES public.subscription_plans(code);


--
-- Name: tenant_subscriptions tenant_subscriptions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.tenant_subscriptions
    ADD CONSTRAINT tenant_subscriptions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: tools tools_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.tools
    ADD CONSTRAINT tools_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: users users_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mbgadmin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


\unrestrict 6GL7rXmFk2J7PEOYcow0WqRqcyxlmTp6faT136mswtEOv0oVO3AywebV2Ft9cuI


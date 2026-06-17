use std::env;

use argon2::{
    password_hash::{rand_core::OsRng, PasswordHasher, SaltString},
    Argon2,
};
use sqlx::{PgPool, Row};
use uuid::Uuid;

fn must_env(name: &str) -> String {
    env::var(name).unwrap_or_else(|_| panic!("{name} must be set"))
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();
    let database_url = must_env("DATABASE_URL");
    let pool = PgPool::connect(&database_url).await?;
    sqlx::migrate!("./migrations").run(&pool).await?;

    let tenant_id = Uuid::parse_str("11111111-1111-1111-1111-111111111111")?;
    let user_id = Uuid::parse_str("22222222-2222-2222-2222-222222222222")?;
    let division_id = Uuid::parse_str("33333333-3333-3333-3333-333333333333")?;
    let ingredient_id = Uuid::parse_str("44444444-4444-4444-4444-444444444444")?;
    let recipe_id = Uuid::parse_str("55555555-5555-5555-5555-555555555555")?;
    let menu_id = Uuid::parse_str("66666666-6666-6666-6666-666666666666")?;
    let step_id = Uuid::parse_str("77777777-7777-7777-7777-777777777777")?;
    let resource_id = Uuid::parse_str("88888888-8888-8888-8888-888888888888")?;

    let pw = env::var("DEMO_OWNER_PASSWORD").unwrap_or_else(|_| "Owner12345!".to_string());
    let salt = SaltString::generate(&mut OsRng);
    let password_hash = Argon2::default()
        .hash_password(pw.as_bytes(), &salt)
        .map_err(|e| anyhow::anyhow!(e.to_string()))?
        .to_string();

    sqlx::query("INSERT INTO tenants (id, name) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name")
        .bind(tenant_id)
        .bind("Kitchen Demo")
        .execute(&pool)
        .await?;

    sqlx::query(
        "INSERT INTO users (id, tenant_id, email, name, role, password_hash) VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (tenant_id, email) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role, password_hash = EXCLUDED.password_hash",
    )
    .bind(user_id)
    .bind(tenant_id)
    .bind("owner@demo.local")
    .bind("Owner Demo")
    .bind("owner")
    .bind(password_hash)
    .execute(&pool)
    .await?;

    sqlx::query(
        "INSERT INTO divisions (id, tenant_id, name, capacity_per_batch, max_parallel_batches)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (tenant_id, name) DO UPDATE SET capacity_per_batch = EXCLUDED.capacity_per_batch, max_parallel_batches = EXCLUDED.max_parallel_batches",
    )
    .bind(division_id)
    .bind(tenant_id)
    .bind("Production")
    .bind(1000i32)
    .bind(4i32)
    .execute(&pool)
    .await?;

    sqlx::query(
        "INSERT INTO ingredients (id, tenant_id, name, unit, estimated_price)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (tenant_id, name) DO UPDATE SET unit = EXCLUDED.unit, estimated_price = EXCLUDED.estimated_price",
    )
    .bind(ingredient_id)
    .bind(tenant_id)
    .bind("Rice")
    .bind("g")
    .bind(0.0f64)
    .execute(&pool)
    .await?;

    sqlx::query(
        "INSERT INTO recipes (id, tenant_id, name, instructions)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (tenant_id, name) DO UPDATE SET instructions = EXCLUDED.instructions",
    )
    .bind(recipe_id)
    .bind(tenant_id)
    .bind("Demo Recipe")
    .bind("Cook and serve.")
    .execute(&pool)
    .await?;

    sqlx::query(
        "INSERT INTO menu_items (id, tenant_id, name, recipe_id)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (tenant_id, name) DO UPDATE SET recipe_id = EXCLUDED.recipe_id",
    )
    .bind(menu_id)
    .bind(tenant_id)
    .bind("Demo Menu")
    .bind(recipe_id)
    .execute(&pool)
    .await?;

    sqlx::query(
        "INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity_per_portion)
         VALUES ($1,$2,$3)
         ON CONFLICT (recipe_id, ingredient_id) DO UPDATE SET quantity_per_portion = EXCLUDED.quantity_per_portion",
    )
    .bind(recipe_id)
    .bind(ingredient_id)
    .bind(100.0f64)
    .execute(&pool)
    .await?;

    sqlx::query(
        "INSERT INTO recipe_steps (id, recipe_id, step_order, description, division_type, estimated_duration_minutes)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (recipe_id, step_order) DO UPDATE SET description = EXCLUDED.description, division_type = EXCLUDED.division_type, estimated_duration_minutes = EXCLUDED.estimated_duration_minutes",
    )
    .bind(step_id)
    .bind(recipe_id)
    .bind(1i32)
    .bind("Cook")
    .bind("processing")
    .bind(30i32)
    .execute(&pool)
    .await?;

    sqlx::query(
        "INSERT INTO kitchen_resources (id, tenant_id, name, resource_type, capacity, status)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, resource_type = EXCLUDED.resource_type, capacity = EXCLUDED.capacity, status = EXCLUDED.status",
    )
    .bind(resource_id)
    .bind(tenant_id)
    .bind("Stove A")
    .bind("STOVE")
    .bind(1i32)
    .bind("READY")
    .execute(&pool)
    .await?;

    sqlx::query(
        "INSERT INTO recipe_step_requirements (id, step_id, resource_type, quantity_needed)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (step_id, resource_type) DO UPDATE SET quantity_needed = EXCLUDED.quantity_needed",
    )
    .bind(Uuid::new_v4())
    .bind(step_id)
    .bind("STOVE")
    .bind(1i32)
    .execute(&pool)
    .await?;

    let has_tasks = sqlx::query("SELECT to_regclass('public.tasks') AS t")
        .fetch_one(&pool)
        .await?
        .try_get::<Option<String>, _>("t")
        .unwrap_or(None)
        .is_some();
    if has_tasks {
        sqlx::query("INSERT INTO tasks (id, tenant_id, title, division, status) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING")
            .bind(Uuid::parse_str("99999999-9999-9999-9999-999999999999")?)
            .bind(tenant_id)
            .bind("E2E Manual Task - Kitchen Prep")
            .bind("Production")
            .bind("open")
            .execute(&pool)
            .await
            .ok();
    }

    let has_fin_desc = sqlx::query(
        "SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema='public' AND table_name='finance_transactions' AND column_name='description'
        ) AS ok",
    )
    .fetch_one(&pool)
    .await?
    .try_get::<bool, _>("ok")
    .unwrap_or(false);

    if has_fin_desc {
        sqlx::query(
            "INSERT INTO finance_transactions (id, tenant_id, category, amount, currency, description)
             VALUES ($1,$2,$3,$4,$5,$6)
             ON CONFLICT (id) DO NOTHING",
        )
        .bind(Uuid::new_v4())
        .bind(tenant_id)
        .bind("Supplies")
        .bind(25.50f64)
        .bind("IDR")
        .bind("Packaging supplies")
        .execute(&pool)
        .await
        .ok();
    }

    println!("seed_demo_ok tenant_id={} email=owner@demo.local password={}", tenant_id, pw);
    Ok(())
}

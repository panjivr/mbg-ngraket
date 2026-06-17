use sqlx::postgres::PgPoolOptions;
use uuid::Uuid;
use dotenvy::dotenv;
use std::env;
use argon2::{
    password_hash::{
        rand_core::OsRng, PasswordHasher, SaltString
    },
    Argon2
};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenv().ok();
    
    let db_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await?;

    println!("Connected to DB. Seeding...");

    // 1. Create Tenant
    let tenant_id = Uuid::new_v4();
    let tenant_name = "Bismillah Kitchen";
    
    // Check if tenant exists (mock check, just insert new for seed)
    // For idempotency, let's delete existing users with these emails first?
    // Nah, let's just create a new tenant every time or use a fixed UUID if we wanted stability.
    // Let's use a fixed UUID for the main tenant so we don't spam.
    let fixed_tenant_id = Uuid::parse_str("11111111-1111-1111-1111-111111111111").unwrap();
    
    sqlx::query!(
        "INSERT INTO tenants (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING",
        fixed_tenant_id,
        tenant_name
    )
    .execute(&pool)
    .await?;

    println!("Tenant ensured: {}", fixed_tenant_id);

    // 2. Users to Seed
    let users = vec![
        ("manager@mbg.com", "Kepala SPPG", "Kepala SPPG"),
        ("gizi@mbg.com", "Ahli Gizi", "Ahli Gizi"),
        ("asisten@mbg.com", "Asisten Lapangan", "Asisten Lapangan"),
        ("coord@mbg.com", "Koordinator Divisi", "Koordinator"), // Frontend sends 'koordinator' value? Check app.html
        ("driver@mbg.com", "Driver", "Driver"),
    ];

    // Check app.html select values:
    // kepala_sppg, ahli_gizi, asisten_lapangan, koordinator, driver
    // The backend stores the display name or the value?
    // In auth.rs: if user.role.to_lowercase() != req.role.to_lowercase()
    // So case doesn't matter. But the string content does.
    // app.html values: 'kepala_sppg', 'ahli_gizi', 'asisten_lapangan', 'koordinator', 'driver'
    
    let users_data = vec![
        ("manager@mbg.com", "kepala_sppg", "Manager Bismillah"),
        ("gizi@mbg.com", "ahli_gizi", "Dr. Nutrition"),
        ("asisten@mbg.com", "asisten_lapangan", "Asisten 01"),
        ("coord@mbg.com", "koordinator", "Koordinator 01"),
        ("driver@mbg.com", "driver", "Driver 01"),
    ];

    let password = env::var("SEED_USER_PASSWORD").unwrap_or_else(|_| "password123".to_string());
    if password == "password123" {
        println!("WARNING: Using default password 'password123'. Set SEED_USER_PASSWORD for better security.");
    }
    let salt = SaltString::generate(&mut OsRng);
    let password_hash = Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .expect("Hash failed")
        .to_string();

    for (email, role, name) in users_data {
        let user_id = Uuid::new_v4();
        
        // Upsert user
        sqlx::query!(
            "INSERT INTO users (id, tenant_id, email, name, role, password_hash) 
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (tenant_id, email) DO UPDATE 
             SET role = $5, password_hash = $6",
            user_id,
            fixed_tenant_id,
            email,
            name,
            role,
            password_hash
        )
        .execute(&pool)
        .await?;
        
        println!("Seeded user: {} ({}) - Pass: {}", email, role, password);
    }

    println!("Seeding Complete!");
    Ok(())
}

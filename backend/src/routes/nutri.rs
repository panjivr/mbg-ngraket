use axum::{
    extract::{Query, State},
    http::{HeaderMap, StatusCode},
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use std::{collections::HashMap, path::PathBuf};
use time::OffsetDateTime;
use tokio::fs;
use uuid::Uuid;

use crate::routes::{auth, require_auth, require_tenant, TenantId};
use crate::state::AppState;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/nutri/status", get(status))
        .route("/nutri/nutrients", get(list_nutrients))
        .route("/nutri/foods", get(search_foods))
        .route("/nutri/targets/sets", get(list_target_sets))
        .route("/nutri/targets", get(list_targets))
        .route("/nutri/link-ingredient", post(link_ingredient))
        .route("/nutri/unlink-ingredient", post(unlink_ingredient))
        .route("/nutri/ingredient/manual-values", post(set_manual_values))
        .route("/nutri/calc/menu", post(calc_menu))
        .route("/nutri/history", get(list_history))
        .route("/nutri/history/:id", get(get_history))
        .route("/nutri/menu/update-ingredients", post(update_menu_ingredients))
}

async fn require_nutri_access(headers: &HeaderMap, tenant: TenantId) -> Result<auth::Claims, StatusCode> {
    let claims = require_auth(headers)?;
    if claims.tenant_id != Some(tenant.0) {
        return Err(StatusCode::FORBIDDEN);
    }
    let role = claims.role.to_lowercase();
    let ok = role == "ahli_gizi" || role == "kepala_sppg" || role.contains("koordinator") || role == "admin" || role == "owner";
    if !ok {
        return Err(StatusCode::FORBIDDEN);
    }
    Ok(claims)
}

#[derive(Serialize)]
struct NutriStatus {
    nutrient_count: i64,
    foods: i64,
    foods_with_values: i64,
    imported_at: Option<String>,
    importing: bool,
    import_error: Option<String>,
}

async fn status(headers: HeaderMap, State(pool): State<PgPool>) -> Result<Json<NutriStatus>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let _claims = require_nutri_access(&headers, tenant).await?;

    ensure_imported(&pool).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let nutrient_count = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM nutr_nutrients")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);
    let foods = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM nutr_foods")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);
    let foods_with_values = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM nutr_foods WHERE nutr_values IS NOT NULL")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    let imported_at = sqlx::query_scalar::<_, Option<String>>("SELECT value FROM nutr_meta WHERE key = 'nutri_imported_at'")
        .fetch_optional(&pool)
        .await
        .ok()
        .flatten()
        .flatten();

    let importing = sqlx::query_scalar::<_, Option<String>>("SELECT value FROM nutr_meta WHERE key = 'nutri_importing'")
        .fetch_optional(&pool)
        .await
        .ok()
        .flatten()
        .flatten()
        .map(|v| v == "1")
        .unwrap_or(false);

    let import_error = sqlx::query_scalar::<_, Option<String>>("SELECT value FROM nutr_meta WHERE key = 'nutri_import_error'")
        .fetch_optional(&pool)
        .await
        .ok()
        .flatten()
        .flatten();

    Ok(Json(NutriStatus {
        nutrient_count,
        foods,
        foods_with_values,
        imported_at,
        importing,
        import_error,
    }))
}

#[derive(Serialize)]
struct NutrientRow {
    code: String,
    name: Option<String>,
    label: Option<String>,
    unit: Option<String>,
    decimals: i32,
    idx: i32,
}

async fn list_nutrients(headers: HeaderMap, State(pool): State<PgPool>) -> Result<Json<Vec<NutrientRow>>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let _claims = require_nutri_access(&headers, tenant).await?;
    ensure_imported(&pool).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let rows = sqlx::query!(
        "SELECT code, name, label, unit, decimals, idx FROM nutr_nutrients ORDER BY idx ASC"
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    Ok(Json(
        rows.into_iter()
            .map(|r| NutrientRow {
                code: r.code,
                name: r.name,
                label: r.label,
                unit: r.unit,
                decimals: r.decimals,
                idx: r.idx,
            })
            .collect(),
    ))
}

#[derive(Deserialize)]
struct FoodSearchQuery {
    query: Option<String>,
    limit: Option<i64>,
}

#[derive(Serialize)]
struct FoodRow {
    code: String,
    name: String,
}

async fn search_foods(headers: HeaderMap, State(pool): State<PgPool>, Query(q): Query<FoodSearchQuery>) -> Result<Json<Vec<FoodRow>>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let _claims = require_nutri_access(&headers, tenant).await?;
    ensure_imported(&pool).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let limit = q.limit.unwrap_or(20).clamp(1, 50) as i64;
    let query = q.query.unwrap_or_default().trim().to_string();

    let rows = if query.is_empty() {
        sqlx::query_as::<_, (String, String)>("SELECT code, name FROM nutr_foods ORDER BY code ASC LIMIT $1")
            .bind(limit)
            .fetch_all(&pool)
            .await
            .unwrap_or_default()
    } else {
        let like = format!("%{}%", query);
        sqlx::query_as::<_, (String, String)>("SELECT code, name FROM nutr_foods WHERE code ILIKE $1 OR name ILIKE $1 ORDER BY name ASC LIMIT $2")
            .bind(&like)
            .bind(limit)
            .fetch_all(&pool)
            .await
            .unwrap_or_default()
    };

    Ok(Json(rows.into_iter().map(|r| FoodRow { code: r.0, name: r.1 }).collect()))
}

#[derive(Serialize)]
struct TargetRow {
    target_set: String,
    label: String,
    min: Option<f64>,
    max: Option<f64>,
}

#[derive(Deserialize)]
struct TargetsQuery {
    set: Option<String>,
}

async fn list_target_sets(headers: HeaderMap, State(pool): State<PgPool>) -> Result<Json<Vec<String>>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let _claims = require_nutri_access(&headers, tenant).await?;
    ensure_imported(&pool).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let rows = sqlx::query!("SELECT DISTINCT target_set FROM nutr_targets ORDER BY target_set ASC")
        .fetch_all(&pool)
        .await
        .unwrap_or_default();
    Ok(Json(rows.into_iter().map(|r| r.target_set).collect()))
}

async fn list_targets(headers: HeaderMap, State(pool): State<PgPool>, Query(q): Query<TargetsQuery>) -> Result<Json<Vec<TargetRow>>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let _claims = require_nutri_access(&headers, tenant).await?;
    ensure_imported(&pool).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let set = q.set.unwrap_or_default().trim().to_string();
    let rows = if set.is_empty() {
        sqlx::query_as::<_, (String, String, Option<f64>, Option<f64>)>("SELECT target_set, label, min, max FROM nutr_targets ORDER BY target_set ASC, label ASC")
            .fetch_all(&pool)
            .await
            .unwrap_or_default()
    } else {
        sqlx::query_as::<_, (String, String, Option<f64>, Option<f64>)>("SELECT target_set, label, min, max FROM nutr_targets WHERE target_set = $1 ORDER BY label ASC")
            .bind(&set)
            .fetch_all(&pool)
            .await
            .unwrap_or_default()
    };

    Ok(Json(
        rows.into_iter()
            .map(|r| TargetRow {
                target_set: r.0,
                label: r.1,
                min: r.2,
                max: r.3,
            })
            .collect(),
    ))
}

#[derive(Deserialize)]
struct LinkIngredientReq {
    ingredient_id: Uuid,
    nutr_code: String,
}

#[derive(Serialize)]
struct LinkIngredientResp {
    success: bool,
    ingredient_id: Uuid,
    nutr_code: String,
    nutr_name: Option<String>,
}

async fn link_ingredient(
    headers: HeaderMap,
    State(pool): State<PgPool>,
    Json(req): Json<LinkIngredientReq>,
) -> Result<Json<LinkIngredientResp>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let _claims = require_nutri_access(&headers, tenant).await?;
    ensure_imported(&pool).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let nutr_code = req.nutr_code.trim().to_string();
    if nutr_code.is_empty() {
        return Err(StatusCode::BAD_REQUEST);
    }

    let food = sqlx::query!("SELECT name FROM nutr_foods WHERE code = $1", nutr_code)
        .fetch_optional(&pool)
        .await
        .unwrap_or(None);
    if food.is_none() {
        return Err(StatusCode::NOT_FOUND);
    }

    let updated = sqlx::query(
        "UPDATE ingredients SET nutr_code = $1, nutrition_info = COALESCE(nutrition_info,'{}'::jsonb) || jsonb_build_object('nutr_code',$1,'nutr_name',$2) WHERE id = $3 AND tenant_id = $4"
    )
    .bind(&nutr_code)
    .bind(food.as_ref().and_then(|f| f.name.as_deref()).unwrap_or(""))
    .bind(req.ingredient_id)
    .bind(tenant.0)
    .execute(&pool)
    .await
    .ok()
    .map(|r| r.rows_affected())
    .unwrap_or(0);

    if updated == 0 {
        return Err(StatusCode::NOT_FOUND);
    }

    Ok(Json(LinkIngredientResp {
        success: true,
        ingredient_id: req.ingredient_id,
        nutr_code,
        nutr_name: food.and_then(|f| f.name),
    }))
}

async fn ensure_imported(pool: &PgPool) -> anyhow::Result<()> {
    let importing = sqlx::query_scalar::<_, Option<String>>("SELECT value FROM nutr_meta WHERE key = 'nutri_importing'")
        .fetch_optional(pool)
        .await
        .ok()
        .flatten()
        .flatten()
        .unwrap_or_default();
    if importing == "1" {
        return Ok(());
    }

    let with_values = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM nutr_foods WHERE nutr_values IS NOT NULL")
        .fetch_one(pool)
        .await
        .unwrap_or(0);
    if with_values > 0 {
        return Ok(());
    }

    let candidates = [PathBuf::from("Nutr"), PathBuf::from("../Nutr")];
    let mut nutr_dir: Option<PathBuf> = None;
    for c in candidates.into_iter() {
        if fs::metadata(&c).await.is_ok() {
            nutr_dir = Some(c);
            break;
        }
    }
    let nutr_dir = match nutr_dir {
        Some(p) => p,
        None => return Ok(()),
    };

    sqlx::query!("INSERT INTO nutr_meta (key, value) VALUES ('nutri_importing','1') ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value")
        .execute(pool)
        .await
        .ok();

    match import_from_dir(pool, nutr_dir).await {
        Ok(_) => {
            sqlx::query!(
                "INSERT INTO nutr_meta (key, value) VALUES ('nutri_imported_at',$1) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value",
                OffsetDateTime::now_utc().unix_timestamp().to_string()
            )
            .execute(pool)
            .await
            .ok();
            sqlx::query!("INSERT INTO nutr_meta (key, value) VALUES ('nutri_importing','0') ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value")
                .execute(pool)
                .await
                .ok();
            Ok(())
        }
        Err(e) => {
            sqlx::query!(
                "INSERT INTO nutr_meta (key, value) VALUES ('nutri_import_error',$1) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value",
                format!("{}", e).chars().take(4000).collect::<String>()
            )
            .execute(pool)
            .await
            .ok();
            sqlx::query!("INSERT INTO nutr_meta (key, value) VALUES ('nutri_importing','0') ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value")
                .execute(pool)
                .await
                .ok();
            Err(e)
        }
    }
}

async fn import_from_dir(pool: &PgPool, dir: PathBuf) -> anyhow::Result<()> {
    let sprache = fs::read_to_string(dir.join("sprache.dat")).await?;
    let nutrients = parse_sprache(&sprache);
    if nutrients.is_empty() {
        return Ok(());
    }

    let lp = fs::read_to_string(dir.join("lp.lpf")).await.unwrap_or_default();
    let foods_from_lp = parse_lpf(&lp);

    let t6 = fs::read_to_string(dir.join("fao-who6-8m.lpr")).await.unwrap_or_default();
    let t9 = fs::read_to_string(dir.join("fao-who9-11m.lpr")).await.unwrap_or_default();
    let t12 = fs::read_to_string(dir.join("fao-who12-23m.lpr")).await.unwrap_or_default();
    let targets = [
        parse_targets(&t6, "fao-who6-8m"),
        parse_targets(&t9, "fao-who9-11m"),
        parse_targets(&t12, "fao-who12-23m"),
    ]
    .concat();

    let bls = fs::read(dir.join("bls.dat")).await?;
    let starts = find_record_offsets(&bls);
    let float_count = nutrients.len();

    let mut tx = pool.begin().await?;
    sqlx::query!("TRUNCATE nutr_nutrients").execute(&mut *tx).await.ok();
    for n in nutrients.iter() {
        sqlx::query!(
            "INSERT INTO nutr_nutrients (code, name, label, unit, decimals, idx) VALUES ($1,$2,$3,$4,$5,$6)
             ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name,label=EXCLUDED.label,unit=EXCLUDED.unit,decimals=EXCLUDED.decimals,idx=EXCLUDED.idx",
            n.code,
            n.name,
            n.label,
            n.unit,
            n.decimals,
            n.idx
        )
        .execute(&mut *tx)
        .await?;
    }

    sqlx::query!("INSERT INTO nutr_meta (key, value) VALUES ('nutrient_count',$1) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", float_count as i64)
        .execute(&mut *tx)
        .await
        .ok();

    for f in foods_from_lp.iter() {
        sqlx::query!(
            "INSERT INTO nutr_foods (code, name, nutr_values) VALUES ($1,$2,NULL) ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name",
            f.code,
            f.name
        )
        .execute(&mut *tx)
        .await
        .ok();
    }

    sqlx::query!("TRUNCATE nutr_targets").execute(&mut *tx).await.ok();
    for t in targets.iter() {
        sqlx::query!(
            "INSERT INTO nutr_targets (id, target_set, label, min, max) VALUES ($1,$2,$3,$4,$5)",
            Uuid::new_v4(),
            t.target_set,
            t.label,
            t.min,
            t.max
        )
        .execute(&mut *tx)
        .await
        .ok();
    }

    for (idx, s) in starts.iter().enumerate() {
        let e = if idx + 1 < starts.len() { starts[idx + 1] } else { bls.len() };
        if let Some(rec) = parse_bls_record(&bls, *s, e) {
            if !rec.code.starts_with('Z') {
                continue;
            }
            let floats = slice_to_floats(&bls, rec.values_offset, e);
            let mut out = vec![0u8; float_count * 4];
            for k in 0..float_count {
                let v = if k < floats.len() { floats[k] } else { f32::NAN };
                out[(k * 4)..(k * 4 + 4)].copy_from_slice(&v.to_le_bytes());
            }
            sqlx::query!(
                "INSERT INTO nutr_foods (code, name, nutr_values) VALUES ($1,$2,$3) ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name,nutr_values=EXCLUDED.nutr_values",
                rec.code,
                rec.name,
                out
            )
            .execute(&mut *tx)
            .await
            .ok();
        }
    }

    tx.commit().await?;
    Ok(())
}

#[derive(Clone)]
struct NutrientDef {
    code: String,
    name: Option<String>,
    label: Option<String>,
    unit: Option<String>,
    decimals: i32,
    idx: i32,
}

fn parse_sprache(s: &str) -> Vec<NutrientDef> {
    let lines: Vec<String> = s
        .lines()
        .map(|l| l.trim_end_matches('\r').to_string())
        .filter(|l| !l.is_empty())
        .collect();
    let mut out = Vec::new();
    let mut i = 0usize;
    while i + 4 < lines.len() {
        let name = lines[i].clone();
        let label = lines[i + 1].clone();
        let unit = lines[i + 2].clone();
        let code = lines[i + 3].clone();
        let decimals = lines[i + 4].parse::<i32>().unwrap_or(0);
        if !code.trim().is_empty() {
            out.push(NutrientDef {
                code: code.trim().to_string(),
                name: Some(name),
                label: Some(label),
                unit: Some(unit),
                decimals,
                idx: out.len() as i32,
            });
        }
        i += 5;
    }
    out
}

#[derive(Clone)]
struct FoodDef {
    code: String,
    name: String,
}

fn parse_lpf(s: &str) -> Vec<FoodDef> {
    s.lines()
        .filter_map(|l| {
            let t = l.trim();
            if t.is_empty() {
                return None;
            }
            let mut parts = t.splitn(2, char::is_whitespace);
            let code = parts.next()?.trim();
            let name = parts.next()?.trim();
            if !code.starts_with('Z') {
                return None;
            }
            Some(FoodDef {
                code: code.to_string(),
                name: name.to_string(),
            })
        })
        .collect()
}

#[derive(Clone)]
struct TargetDef {
    target_set: String,
    label: String,
    min: Option<f64>,
    max: Option<f64>,
}

fn parse_targets(s: &str, set: &str) -> Vec<TargetDef> {
    let mut out = Vec::new();
    for line in s.lines() {
        let parts: Vec<&str> = line.split('\t').map(|p| p.trim()).filter(|p| !p.is_empty()).collect();
        if parts.is_empty() {
            continue;
        }
        let label = parts[0].to_string();
        let min = if parts.len() >= 2 { parts[1].parse::<f64>().ok() } else { None };
        let max = if parts.len() >= 3 { parts[2].parse::<f64>().ok() } else { None };
        out.push(TargetDef {
            target_set: set.to_string(),
            label,
            min,
            max,
        });
    }
    out
}

fn find_record_offsets(buf: &[u8]) -> Vec<usize> {
    let mut out = Vec::new();
    let mut i = 0usize;
    while i + 8 < buf.len() {
        if buf[i] == 7 && buf[i + 1] == b'Z' && buf[i + 2] == b'0' {
            out.push(i);
        }
        i += 1;
    }
    out
}

struct BlsRec {
    code: String,
    name: String,
    values_offset: usize,
}

fn parse_bls_record(buf: &[u8], start: usize, end: usize) -> Option<BlsRec> {
    if start + 3 >= end {
        return None;
    }
    let mut i = start;
    let code_len = *buf.get(i)? as usize;
    i += 1;
    if i + code_len + 1 >= end {
        return None;
    }
    let code = String::from_utf8_lossy(&buf[i..(i + code_len)]).to_string();
    i += code_len;
    let name_len = *buf.get(i)? as usize;
    i += 1;
    if i + name_len >= end {
        return None;
    }
    let name = String::from_utf8_lossy(&buf[i..(i + name_len)]).to_string();
    i += name_len;
    while i + 4 <= end && buf[i] == 0 {
        i += 1;
    }
    Some(BlsRec {
        code,
        name,
        values_offset: i,
    })
}

fn slice_to_floats(buf: &[u8], start: usize, end: usize) -> Vec<f32> {
    let byte_len = end.saturating_sub(start);
    let usable = (byte_len / 4) * 4;
    let mut out = Vec::with_capacity(usable / 4);
    let mut i = 0usize;
    while i < usable {
        let off = start + i;
        let b = [buf[off], buf[off + 1], buf[off + 2], buf[off + 3]];
        out.push(f32::from_le_bytes(b));
        i += 4;
    }
    out
}

#[derive(Deserialize)]
struct CalcMenuReq {
    menu_id: Uuid,
    nutrient_codes: Option<Vec<String>>,
    target_set: Option<String>,
}

#[derive(Serialize, Clone)]
struct CalcNutrient {
    code: String,
    name: Option<String>,
    label: Option<String>,
    unit: Option<String>,
    decimals: i32,
    idx: i32,
}

#[derive(Serialize, Clone)]
struct CalcRow {
    ingredient_id: Uuid,
    ingredient_name: String,
    qty_g: f64,
    nutr_code: Option<String>,
    values: HashMap<String, Option<f64>>,
    source: String,
}

#[derive(Serialize)]
struct TargetObj {
    min: Option<f64>,
    max: Option<f64>,
    label: String,
}

#[derive(Serialize)]
struct CalcMenuResp {
    menu_id: Uuid,
    menu_name: String,
    nutrient_codes: Vec<String>,
    nutrients: Vec<CalcNutrient>,
    detail: Vec<CalcRow>,
    totals: HashMap<String, f64>,
    totals_derived: HashMap<String, f64>,
    target_set: Option<String>,
    targets: Option<HashMap<String, Option<TargetObj>>>,
    missing_count: i32,
}

fn read_f32_from_bytea(buf: Option<&[u8]>, idx: usize) -> Option<f64> {
    let b = buf?;
    let off = idx.checked_mul(4)?;
    if off + 4 > b.len() {
        return None;
    }
    let f = f32::from_le_bytes([b[off], b[off + 1], b[off + 2], b[off + 3]]);
    if f.is_finite() {
        Some(f as f64)
    } else {
        None
    }
}

fn norm_label(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for ch in s.chars() {
        if ch.is_ascii_alphanumeric() {
            out.push(ch.to_ascii_lowercase());
        }
    }
    out
}

async fn calc_menu(
    headers: HeaderMap,
    State(pool): State<PgPool>,
    Json(req): Json<CalcMenuReq>,
) -> Result<Json<CalcMenuResp>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let claims = require_nutri_access(&headers, tenant).await?;
    ensure_imported(&pool).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let menu = sqlx::query!(
        "SELECT id, tenant_id, name, recipe_id FROM menu_items WHERE id = $1 AND tenant_id = $2",
        req.menu_id,
        tenant.0
    )
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::NOT_FOUND)?;

    let nutrients = sqlx::query!(
        "SELECT code, name, label, unit, decimals, idx FROM nutr_nutrients ORDER BY idx ASC"
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(|r| CalcNutrient {
        code: r.code,
        name: r.name,
        label: r.label,
        unit: r.unit,
        decimals: r.decimals,
        idx: r.idx,
    })
    .collect::<Vec<_>>();

    let mut idx_map: HashMap<String, usize> = HashMap::new();
    for n in nutrients.iter() {
        idx_map.insert(n.code.clone(), n.idx as usize);
    }

    let default_codes = vec!["GJ".to_string(), "ZE".to_string(), "ZK".to_string(), "ZF".to_string()];
    let want_codes = req
        .nutrient_codes
        .unwrap_or(default_codes)
        .into_iter()
        .filter(|c| idx_map.contains_key(c))
        .collect::<Vec<_>>();

    let rec_rows = sqlx::query!(
        r#"
        SELECT ri.ingredient_id, ri.quantity_per_portion, i.name as ingredient_name, i.nutr_code, i.nutrition_info
        FROM recipe_ingredients ri
        JOIN ingredients i ON i.id = ri.ingredient_id AND i.tenant_id = $2
        WHERE ri.recipe_id = $1
        "#,
        menu.recipe_id,
        tenant.0
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let mut nutr_codes = Vec::new();
    for r in rec_rows.iter() {
        if let Some(c) = &r.nutr_code {
            if !c.is_empty() {
                nutr_codes.push(c.clone());
            }
        }
    }
    nutr_codes.sort();
    nutr_codes.dedup();

    let foods = if nutr_codes.is_empty() {
        Vec::new()
    } else {
        sqlx::query!(
            "SELECT code, nutr_values FROM nutr_foods WHERE code = ANY($1)",
            &nutr_codes
        )
        .fetch_all(&pool)
        .await
        .unwrap_or_default()
    };
    let mut food_map: HashMap<String, Vec<u8>> = HashMap::new();
    for f in foods.into_iter() {
        if let Some(v) = f.nutr_values {
            food_map.insert(f.code, v);
        }
    }

    let mut totals: HashMap<String, f64> = HashMap::new();
    for c in want_codes.iter() {
        totals.insert(c.clone(), 0.0);
    }
    let mut missing_count = 0i32;
    let mut detail = Vec::new();

    for r in rec_rows.into_iter() {
        let qty = r.quantity_per_portion.max(0.0);
        let nutr_code = r.nutr_code.clone().filter(|s| !s.trim().is_empty());
        let mut values: HashMap<String, Option<f64>> = HashMap::new();
        let mut source = "unlinked".to_string();

        let manual_map = r.nutrition_info.as_ref().and_then(|v| v.get("manual_nutrients")).and_then(|v| v.as_object());

        if let Some(code) = &nutr_code {
            if let Some(buf) = food_map.get(code) {
                source = "nutrisurvey".to_string();
                for c in want_codes.iter() {
                    let idx = *idx_map.get(c).unwrap_or(&0usize);
                    let per100 = read_f32_from_bytea(Some(buf.as_slice()), idx);
                    let val = per100.map(|p| p * (qty / 100.0));
                    values.insert(c.clone(), val);
                    if let Some(v) = val {
                        if let Some(t) = totals.get_mut(c) {
                            *t += v;
                        }
                    }
                }
            }
        }

        if source == "unlinked" {
            if let Some(obj) = manual_map {
                source = "manual".to_string();
                for c in want_codes.iter() {
                    let per100 = obj
                        .get(c)
                        .and_then(|x| x.as_f64())
                        .or_else(|| obj.get(c).and_then(|x| x.as_i64().map(|n| n as f64)));
                    let val = per100.map(|p| p * (qty / 100.0));
                    values.insert(c.clone(), val);
                    if let Some(v) = val {
                        if let Some(t) = totals.get_mut(c) {
                            *t += v;
                        }
                    }
                }
            } else {
                missing_count += 1;
                for c in want_codes.iter() {
                    values.insert(c.clone(), None);
                }
            }
        }

        detail.push(CalcRow {
            ingredient_id: r.ingredient_id,
            ingredient_name: r.ingredient_name,
            qty_g: qty,
            nutr_code,
            values,
            source,
        });
    }

    let mut totals_derived = HashMap::new();
    if let Some(gj) = totals.get("GJ").copied() {
        totals_derived.insert("energy_kcal".to_string(), gj / 4.184);
    }

    let targets = if let Some(set) = req.target_set.clone().filter(|s| !s.trim().is_empty()) {
        let trows = sqlx::query!(
            "SELECT target_set, label, min, max FROM nutr_targets WHERE target_set = $1",
            set
        )
        .fetch_all(&pool)
        .await
        .unwrap_or_default();

        let mut by_norm: HashMap<String, (Option<f64>, Option<f64>, String)> = HashMap::new();
        for t in trows.into_iter() {
            by_norm.insert(norm_label(&t.label), (t.min, t.max, t.label));
        }

        let mut out: HashMap<String, Option<TargetObj>> = HashMap::new();
        for c in want_codes.iter() {
            if let Some(n) = nutrients.iter().find(|n| &n.code == c) {
                let key = norm_label(n.label.as_deref().unwrap_or(n.name.as_deref().unwrap_or("")));
                if let Some((min, max, label)) = by_norm.get(&key) {
                    out.insert(
                        c.clone(),
                        Some(TargetObj {
                            min: *min,
                            max: *max,
                            label: label.clone(),
                        }),
                    );
                } else {
                    out.insert(c.clone(), None);
                }
            }
        }

        if totals_derived.contains_key("energy_kcal") {
            if let Some((min, max, label)) = by_norm.get("energy") {
                out.insert(
                    "energy_kcal".to_string(),
                    Some(TargetObj {
                        min: *min,
                        max: *max,
                        label: label.clone(),
                    }),
                );
            }
        }

        Some(out)
    } else {
        None
    };

    let resp = CalcMenuResp {
        menu_id: menu.id,
        menu_name: menu.name.clone(),
        nutrient_codes: want_codes.clone(),
        nutrients: nutrients.into_iter().filter(|n| want_codes.contains(&n.code)).collect(),
        detail: detail.clone(),
        totals: totals.clone(),
        totals_derived: totals_derived.clone(),
        target_set: req.target_set.clone().filter(|s| !s.trim().is_empty()),
        targets,
        missing_count,
    };

    let _ = sqlx::query!(
        "INSERT INTO nutr_calc_runs (id, tenant_id, menu_id, menu_name, at, actor_email, target_set, nutrient_codes, totals, detail, missing_count, energy_kcal)
         VALUES ($1,$2,$3,$4,NOW(),$5,$6,$7,$8,$9,$10,$11)",
        Uuid::new_v4(),
        tenant.0,
        menu.id,
        menu.name,
        claims.email,
        resp.target_set.clone(),
        want_codes.join(","),
        serde_json::to_value(&resp.totals).unwrap_or_else(|_| serde_json::json!({})),
        serde_json::to_value(&resp).unwrap_or_else(|_| serde_json::json!({})),
        resp.missing_count,
        totals_derived.get("energy_kcal").copied()
    )
    .execute(&pool)
    .await;

    Ok(Json(resp))
}

#[derive(Deserialize)]
struct UnlinkReq {
    ingredient_id: Uuid,
    clear_manual: Option<bool>,
}

#[derive(Serialize)]
struct UnlinkResp {
    success: bool,
}

async fn unlink_ingredient(headers: HeaderMap, State(pool): State<PgPool>, Json(req): Json<UnlinkReq>) -> Result<Json<UnlinkResp>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let _claims = require_nutri_access(&headers, tenant).await?;
    ensure_imported(&pool).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if req.clear_manual.unwrap_or(false) {
        let rows = sqlx::query!(
            "UPDATE ingredients SET nutr_code = NULL, nutrition_info = COALESCE(nutrition_info,'{}'::jsonb) - 'manual_nutrients' WHERE id = $1 AND tenant_id = $2",
            req.ingredient_id,
            tenant.0
        )
        .execute(&pool)
        .await
        .ok()
        .map(|r| r.rows_affected())
        .unwrap_or(0);
        if rows == 0 { return Err(StatusCode::NOT_FOUND); }
        return Ok(Json(UnlinkResp { success: true }));
    }

    let rows = sqlx::query!(
        "UPDATE ingredients SET nutr_code = NULL WHERE id = $1 AND tenant_id = $2",
        req.ingredient_id,
        tenant.0
    )
    .execute(&pool)
    .await
    .ok()
    .map(|r| r.rows_affected())
    .unwrap_or(0);
    if rows == 0 { return Err(StatusCode::NOT_FOUND); }
    Ok(Json(UnlinkResp { success: true }))
}

#[derive(Deserialize)]
struct ManualValuesReq {
    ingredient_id: Uuid,
    per100: HashMap<String, f64>,
}

#[derive(Serialize)]
struct ManualValuesResp {
    success: bool,
}

async fn set_manual_values(
    headers: HeaderMap,
    State(pool): State<PgPool>,
    Json(req): Json<ManualValuesReq>,
) -> Result<Json<ManualValuesResp>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let _claims = require_nutri_access(&headers, tenant).await?;
    ensure_imported(&pool).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let v = serde_json::to_value(&req.per100).map_err(|_| StatusCode::BAD_REQUEST)?;
    let rows = sqlx::query(
        "UPDATE ingredients SET nutrition_info = COALESCE(nutrition_info,'{}'::jsonb) || jsonb_build_object('manual_nutrients',$1) WHERE id = $2 AND tenant_id = $3"
    )
    .bind(&v)
    .bind(req.ingredient_id)
    .bind(tenant.0)
    .execute(&pool)
    .await
    .ok()
    .map(|r| r.rows_affected())
    .unwrap_or(0);
    if rows == 0 { return Err(StatusCode::NOT_FOUND); }
    Ok(Json(ManualValuesResp { success: true }))
}

#[derive(Deserialize)]
struct UpdateMenuIngredientsReq {
    menu_id: Uuid,
    items: Vec<UpdateMenuIngredientItem>,
}

#[derive(Deserialize)]
struct UpdateMenuIngredientItem {
    ingredient_id: Uuid,
    qty_g: f64,
}

#[derive(Serialize)]
struct UpdateMenuIngredientsResp {
    success: bool,
}

async fn update_menu_ingredients(
    headers: HeaderMap,
    State(pool): State<PgPool>,
    Json(req): Json<UpdateMenuIngredientsReq>,
) -> Result<Json<UpdateMenuIngredientsResp>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let _claims = require_nutri_access(&headers, tenant).await?;

    let menu = sqlx::query!(
        "SELECT id, tenant_id, recipe_id FROM menu_items WHERE id = $1 AND tenant_id = $2",
        req.menu_id,
        tenant.0
    )
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::NOT_FOUND)?;

    let mut tx = pool.begin().await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let _ = sqlx::query!("DELETE FROM recipe_ingredients WHERE recipe_id = $1", menu.recipe_id)
        .execute(&mut *tx)
        .await;

    for it in req.items.iter() {
        let qty = it.qty_g.max(0.0);
        if qty == 0.0 {
            continue;
        }
        let _ = sqlx::query!(
            "INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity_per_portion) VALUES ($1,$2,$3) ON CONFLICT (recipe_id, ingredient_id) DO UPDATE SET quantity_per_portion = EXCLUDED.quantity_per_portion",
            menu.recipe_id,
            it.ingredient_id,
            qty
        )
        .execute(&mut *tx)
        .await;
    }
    tx.commit().await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(UpdateMenuIngredientsResp { success: true }))
}

#[derive(Deserialize)]
struct HistoryQuery {
    menu_id: Option<Uuid>,
    limit: Option<i64>,
}

#[derive(Serialize)]
struct HistoryRow {
    id: Uuid,
    at: String,
    menu_id: Uuid,
    menu_name: String,
    target_set: Option<String>,
    nutrient_codes: String,
    missing_count: i32,
    energy_kcal: Option<f64>,
}

async fn list_history(headers: HeaderMap, State(pool): State<PgPool>, Query(q): Query<HistoryQuery>) -> Result<Json<Vec<HistoryRow>>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let _claims = require_nutri_access(&headers, tenant).await?;
    let limit = q.limit.unwrap_or(50).clamp(1, 200);

    let rows = if let Some(menu_id) = q.menu_id {
        sqlx::query_as::<_, (Uuid, OffsetDateTime, Uuid, String, Option<String>, String, Option<i32>, Option<f64>)>(
            "SELECT id, at, menu_id, menu_name, target_set, nutrient_codes, missing_count, energy_kcal FROM nutr_calc_runs WHERE tenant_id = $1 AND menu_id = $2 ORDER BY at DESC LIMIT $3"
        )
        .bind(tenant.0)
        .bind(menu_id)
        .bind(limit)
        .fetch_all(&pool)
        .await
        .unwrap_or_default()
    } else {
        sqlx::query_as::<_, (Uuid, OffsetDateTime, Uuid, String, Option<String>, String, Option<i32>, Option<f64>)>(
            "SELECT id, at, menu_id, menu_name, target_set, nutrient_codes, missing_count, energy_kcal FROM nutr_calc_runs WHERE tenant_id = $1 ORDER BY at DESC LIMIT $2"
        )
        .bind(tenant.0)
        .bind(limit)
        .fetch_all(&pool)
        .await
        .unwrap_or_default()
    };

    Ok(Json(
        rows.into_iter()
            .map(|r| HistoryRow {
                id: r.0,
                at: r.1.to_string(),
                menu_id: r.2,
                menu_name: r.3,
                target_set: r.4,
                nutrient_codes: r.5,
                missing_count: r.6.unwrap_or(0),
                energy_kcal: r.7,
            })
            .collect(),
    ))
}

async fn get_history(
    headers: HeaderMap,
    State(pool): State<PgPool>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let _claims = require_nutri_access(&headers, tenant).await?;
    let row = sqlx::query!(
        "SELECT detail FROM nutr_calc_runs WHERE tenant_id = $1 AND id = $2",
        tenant.0,
        id
    )
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::NOT_FOUND)?;

    Ok(Json(row.detail))
}

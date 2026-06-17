# API Documentation

## 1. Production Library (Resep, Workflow, Menu) — Model Baru

Modul "Produksi" sekarang dipecah menjadi tiga library independen: **Resep**, **Workflow Pengolahan**, dan **Menu**. Menu merujuk `recipe_id` + `workflow_id` dan menyimpan `packaging_stack_json`.

### Resep (Recipes Library)
- `GET /api/recipes` — daftar resep (BOM + waktu masak + kapasitas batch + alat).
- `POST /api/recipes` — buat resep baru. Body: `{ name, instructions, cooking_time, batch_capacity, portion_size, ingredients: [{ingredient_id, quantity, unit}], tools: [{tool_id, batch_capacity, batch_duration_minutes}] }`.
- `GET /api/recipes/:id` — detail resep (+ ingredients + tools).
- `PUT /api/recipes/:id` — update (nama, instruksi, BOM, tools).
- `DELETE /api/recipes/:id` — hapus resep.

### Workflow Pengolahan (Workflows Library)
- `GET /api/workflows` — daftar workflow.
- `POST /api/workflows` — buat workflow. Body: `{ name, category, description }`.
- `GET /api/workflows/:id` — detail workflow.
- `PUT /api/workflows/:id` — update workflow.
- `DELETE /api/workflows/:id` — hapus workflow (juga menghapus `workflow_steps`-nya).

### Workflow Steps (DAG)
- `GET /api/workflows/:id/steps` — daftar step terurut. Tiap step:
  - `id, step_order, title, description`
  - `activity_type` (cook|prep|pack|qc|sortir|chill|delivery|custom)
  - `duration_minutes_per_batch, batch_capacity`
  - `required_resource_type, required_skill_level`
  - `depends_on_step_ids[]` — **DAG** (bisa bercabang & merge)
  - `parallelizable, qc_required, temperature_celsius, hygiene_level`
  - `ingredient_refs[], ingredient_group (main|extra), notes`
- `PUT /api/workflows/:id/steps` — replace semua step (validasi DAG: no cycle, min 1 root).

### Menu
- `GET /api/menu` — daftar menu (join dengan recipes untuk legacy info).
- `POST /api/menu` — buat menu. Body: `{ name, food_id?, recipe_id, workflow_id, packaging_stack_json: { main: [...], extra: [...] } }`.
- `PUT /api/menu/:id` — update menu.
- `DELETE /api/menu/:id` — hapus menu.

**Struktur `packaging_stack_json`:**
```
{
  "main":  [ { "material": "Box M", "quantity": 1, "duration_minutes": 2 } ],
  "extra": [ { "material": "Buah", "quantity": 1, "duration_minutes": 1 } ]
}
```
- `main` = packaging makanan utama (wave cooking).
- `extra` = packaging yang **skip cooking** (langsung dari prep → pack).

---

## 2. AI Kitchen Planner (War Room)

### `POST /api/plans/draft/plan-ai`
Memanggil Kitchen Planner Engine (rule-v1) untuk menjadwalkan produksi 1 menu per 1+ wave delivery.

**Body:**
```
{
  "menu_id": "<uuid>",
  "plan_draft_id": "<optional>",
  "plan_date": "YYYY-MM-DD",
  "production_start_time": "HH:MM" | null,
  "waves": [ { "wave_number": 1, "delivery_time": "11:00", "portion_count": 500 } ],
  "engineVersion": "rule-v1"
}
```

**Return:**
```
{
  "feasibility": { "status": "FEASIBLE|NOT_FEASIBLE", "slackMinutes": N },
  "warnings": [...],
  "proposals": [ { "type": "SHIFT_EARLIER|REDUCE_PORTIONS|...", "description": "...", "params": {...} } ],
  "timeline": [ { "stepId, stepTitle, divisionId, divisionName, batchIndex, waveNumber, startTime, endTime" } ],
  "totalPortions": N,
  "engineVersion": "rule-v1"
}
```

**Fitur Engine:**
- **Hybrid scheduling**: backward dari `delivery_time`, divalidasi terhadap `production_start_time`.
- **Pipeline batch-level**: batch siap → step berikut langsung jalan (tidak menunggu seluruh divisi sebelumnya selesai).
- **Shift gating & accumulation**: batch yang siap di luar shift akan terakumulasi dan diproses saat shift dibuka, menghormati `max_parallel_batches`.
- **DAG scheduling**: mendukung percabangan & merge; virtual pack steps otomatis dibentuk dari `menu.packaging_stack_json`.
- **Proposals**: jika infeasible, engine mengeluarkan opsi (mis. majukan jam masuk shift, kurangi porsi, tambah batch paralel).

Setiap invocation dicatat di tabel `planner_decisions` (input, output, engine_version).

---

## 3. Kitchen Config (Division Scope Editor)
- `GET /api/kitchen/config` — mengembalikan konfigurasi dapur (divisions dengan `capabilities`, `max_parallel_batches`, `notes`, `custom_capabilities[]`).
- `PUT /api/kitchen/config` — update seluruh konfigurasi dapur.
- `GET /api/kitchen/vocabulary` — daftar activity_type & capabilities (default + custom).

---

## 4. Commit Plan → Distribution
- `POST /api/plans/draft/:id/commit` — saat commit, WarRoom memasukkan 1 row ke `order_deliveries` per wave dengan:
  - `lokasi_id = NULL` (diisi pada flow distribusi)
  - `wave_number`, `plan_id`

---

## 5. Migrasi Legacy
- `POST /api/admin/legacy-migrate` — trigger manual (idempotent). Migrasi:
  1. `recipe_steps` → `workflow_steps` (linear DAG) + set `menu.workflow_id`.
  2. `recipes.packaging_type + recipes.extra_packing_json` → `menu.packaging_stack_json`.
  3. `food_menus + food_menu_ingredients` → `recipes + menu` baru (jika belum ada).
- Auto-trigger via `GET /api/menu` sekali saja (flag `legacy_production_migration_v1` di tabel `migration_meta`).

---

## 6. Unit Normalization (gram|pcs)
- Semua bahan & ekuipmen dinormalisasi ke satuan canonical `gram` atau `pcs`.
- Migration otomatis di endpoint `GET|POST /api/ingredients`.
- Helper client: `window.formatUnitDisplay(qty, unit)` menampilkan `1200 gram → 1.2 kg`.

---

## 7. Endpoint Lain (Ringkas)

### Authentication & Users
- `POST /auth/login` · `POST /auth/register` · `POST /auth/staff/login`
- `GET|POST /api/users`

### Tenants & Subscription
- `GET /api/tenants` · `POST /api/tenants/activate`
- `GET /api/subscription/me` · `GET /api/admin/licenses`

### Kitchen & Inventory
- `GET /api/kitchen/config` · `GET /api/kitchen/equipment`
- `GET|POST /api/ingredients` · `GET /api/tools`

### Nutrition (NutriSurvey)
- `GET /api/nutri/foods` · `GET /api/nutri/nutrients`
- `POST /api/nutri/calc/menu` · `GET /api/nutri/diary/day`
- `POST /api/nutri/link-ingredient`

### Production (General)
- `GET|POST /api/production/orders` · `GET /api/production/foods`
- `GET /api/tasks/v2/generate`

### Dashboard
- `GET /api/dashboard/stats`

---

## 8. Deprecated Endpoints

- `POST /api/plans/v2` — digantikan oleh `POST /api/plans/draft/plan-ai`.
- Duplicate routes `PUT /api/menu/:id`, `POST /api/menu`, `GET|POST /api/recipes/:id/steps` di region akhir `server.js` dibungkus blok `/* DEPRECATED_BEGIN_DUPLICATE_ROUTES ... */` dan akan dihapus pada rilis berikutnya.
- Tabel legacy `food_menus`, `food_menu_ingredients`, `recipe_steps` masih ada untuk kompatibilitas; sumber kebenaran baru adalah `menu`, `recipes`, `workflows`, `workflow_steps`.

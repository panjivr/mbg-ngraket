# Testing

## 1) Unit Test

Target saat ini:
- Scheduler engine memiliki unit test dasar: [scheduler/lib.rs](file:///c:/ADMIN/New%20folder/Bismillah%20Software%20MBG/scheduler/src/lib.rs)
- Auth memiliki unit test dasar (hash + verify token): [auth.rs](file:///c:/ADMIN/New%20folder/Bismillah%20Software%20MBG/backend/src/routes/auth.rs)

Jalankan:
- `cargo test --workspace`

Catatan Windows:
- Compile Rust membutuhkan MSVC linker (`link.exe`). Install Build Tools for Visual Studio (C++ workload).

## 2) Integration Test (Rencana)

Untuk coverage tinggi dan menjaga fungsionalitas inti, integration test idealnya mencakup:
- Login → akses halaman `/app` (cookie session)
- Generate plan → verify `production_plans` dan `production_batches` tersimpan
- Inventory opname → verify `stock_movements` dan `inventory` ter-update

Catatan:
- Karena sistem menggunakan Postgres, integration test membutuhkan database test.

## 3) Frontend E2E (Testsprite)

Test plan ada di: [testsprite_frontend_test_plan.json](file:///c:/ADMIN/New%20folder/Bismillah%20Software%20MBG/testsprite_tests/testsprite_frontend_test_plan.json)

Fokus yang divalidasi:
- Production Plans: Create Plan → Plan Details → Generate Documents
- Tasks: Create Task + validasi required fields
- Inventory: Ingredient Management + validasi qty/name + Movements
- Finance: Add Expense + validasi amount/category + Preview Report
- Nutrition: Food search + details + Link Ingredient + cancel (Escape)

## 3) Coverage

Tools:
- `cargo tarpaulin` (Linux) atau alternatif coverage untuk Windows.

Target:
- ≥ 80% coverage pada module core (auth, scheduler, plan, inventory).

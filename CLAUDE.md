# CLAUDE.md

Panduan untuk Claude Code saat bekerja di repo ini.

## Aturan Desain Web / Frontend (WAJIB)

Untuk **semua** pekerjaan UI / frontend / web di repo ini (membuat halaman baru,
landing page, dashboard, komponen, atau merombak tampilan yang sudah ada),
**selalu pakai "taste skills"** yang sudah terpasang di `.claude/skills/`.
Tujuannya: hasil tidak terlihat seperti template AI generik ("anti-slop") —
layout, tipografi, spacing, dan motion yang rapi dan terlihat mahal.

Cara pakai: panggil skill yang relevan lewat tool Skill sebelum menulis kode UI.

| Kebutuhan | Skill yang dipakai |
|-----------|--------------------|
| Default untuk halaman/landing/portfolio baru | `design-taste-frontend` |
| Merombak / mempercantik tampilan yang sudah ada | `redesign-existing-projects` |
| Gaya minimalis editorial (ala Notion/Linear) | `minimalist-ui` |
| Gaya premium/halus dengan motion lembut | `high-end-visual-design` |
| Gaya brutalist / Swiss / industrial | `industrial-brutalist-ui` |
| Mulai dari gambar/desain referensi lalu jadi kode | `image-to-code` |
| Bikin referensi desain web (image gen) | `imagegen-frontend-web` |
| Bikin referensi desain mobile (image gen) | `imagegen-frontend-mobile` |
| Brand kit / identity board | `brandkit` |
| Aturan kompatibel Google Stitch | `stitch-design-taste` |
| Cegah output kode terpotong/placeholder | `full-output-enforcement` |
| Varian ketat ala GPT/Codex | `gpt-taste` |
| Versi lama taste-skill | `design-taste-frontend-v1` |

Sumber skill: https://github.com/leonxlnx/taste-skill (di-vendor ke repo).

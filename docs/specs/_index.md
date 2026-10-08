---
id: FEATURE-REGISTRY
title: Feature Registry
status: active
owner: Developer
last_updated: 2026-10-05
---

# Feature Registry

This file is the durable navigation registry for feature specifications.

Mutable execution status, active task, blockers, and commits belong in `docs/context/state.yaml`.

| Feature ID | Feature | Spec path | Product priority | Lifecycle gate | Related milestone |
|---|---|---|---|---|---|
| `F-001` | Master Pasien & Kasir | `docs/specs/F-001-master-pasien-kasir/` | P1 | implemented | MVP |
| `F-002` | Rekam Medis Dokter | `docs/specs/F-002-rekam-medis-dokter/` | P1 | implemented | MVP |
| `F-003` | Buku Kas & Kapitasi BPJS | `docs/specs/F-003-buku-kas-operasional/` | P1 | implemented | MVP |
| `F-004` | Dashboard & Ekspor Excel | `docs/specs/F-004-dashboard-laporan/` | P1 | implemented | MVP |
| `F-005` | Migrasi 7,493 Data CSV | `docs/specs/F-005-migrasi-data-lama/` | P2 | implemented | MVP |
| `F-006` | Register Program Khusus | `docs/specs/F-006-program-khusus/` | P2 | implemented | MVP |
| `F-007` | Fitur Klinis & Administrasi Pasien | `docs/specs/F-007-fitur-klinis-administrasi-pasien/` | P2 | implemented | Post-MVP Extension |
| `F-008` | RM Baru, RBAC 2 Role, Laporan Kesehatan, Piutang | `docs/specs/F-008-rm-rbac-kesehatan-piutang/` | P1 | implemented | Change Request |
| `F-009` | Kelengkapan Data, Pemantauan Rujukan Bidan, Filter Periode, Laporan Puskesmas | `docs/specs/F-009-kelengkapan-data-pemantauan-bidan/` | P1 | in_progress | Change Request |
| `F-010` | Sumber Identitas No RM dari DATAPASIEN | `docs/specs/F-010-sumber-identitas-rm-datapasien/` | P1 | draft | Change Request |
| `F-011` | Hak Akses dan Alur Kategorisasi Program | `docs/specs/F-011-hak-akses-alur-kategorisasi/` | P1 | draft | Change Request |
| `F-012` | Paket Terapi | `docs/specs/F-012-paket-terapi/` | P2 | pending | Post-MVP Extension (ditahan) |
| `F-013` | Surat Keterangan Sakit - Alamat Tambahan | `docs/specs/F-013-surat-keterangan-sakit/` | P2 | draft | Change Request |

## Lifecycle gate meaning

- `draft`: specification is being written;
- `review`: awaiting product or architecture review;
- `approved`: contract is approved and may enter execution planning;
- `requirements`: requirements gathered;
- `pending`: waiting for prerequisites;
- `in_progress`: development active;
- `implemented`: accepted implementation exists;
- `superseded`: replaced by another feature contract.

Do not update this file for every task transition. The context system owns mutable progress.

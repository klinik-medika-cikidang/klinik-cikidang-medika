---
id: F-024-TSK
title: "Implementation Tasks: F-024 Isian UK dan TP"
status: draft
owner: Developer
last_updated: 2026-10-31
---

# Implementation Tasks — F-024

- [x] **Task 1: Helper with tests** (`src/lib/pregnancy.ts`, `src/lib/pregnancy.test.ts`, 12 tests). _REQ-024-02, REQ-024-04, REQ-024-08_
- [x] **Task 2: UK and TP inputs in `NewPublicHealthModal`**. _REQ-024-01 to 05, REQ-024-08_
- [x] **Task 3: Show UK and TP in `PublicHealthRegistry` and its Excel download**. _REQ-024-06, REQ-024-07_
- [x] **Task 4: Verify** (2026-10-31): `npx tsc --noEmit` clean; `npx vitest run` 219 passed. On old staging with a fictitious patient: exam 2026-10-27 + UK 33w3d computed TP 2026-12-12 (equal to the clinic's ultrasound EDD); a hand-typed TP stayed when UK changed; "Hitung dari UK" restored the computed date; TP 0026-12-12 was rejected with the error linked to the input; the saved row held `uk = 33 minggu 3 hari`, `tp = 12/12/2026`. No horizontal overflow and 44px inputs at 360, 768, 1024px. Test row deleted.
- [x] Code review (code-reviewer agent): nothing blocking; the registry Excel gap, TP plausibility, design drift and error linking it raised are fixed above.
- [ ] Production release after the user approves (code only, no migration).

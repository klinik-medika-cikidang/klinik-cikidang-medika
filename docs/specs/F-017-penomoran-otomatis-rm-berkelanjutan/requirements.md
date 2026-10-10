# Feature Specification: F-017 Penomoran Otomatis RM Berkelanjutan (9-Digit Seamless Sequence)

## 1. Executive Summary

Klinik Pratama Cikidang Medika previously recorded patient registrations in Google Sheets (`DATAPASIEN`), with 3,750 historical patients assigned canonical 9-digit medical record numbers (`no_rm`): `[2-digit Gender Code][2-digit Village Code][5-digit Global Sequence Number]` (e.g. `010100001` through `010103740`).

However, the existing web registration form (`src/components/pendaftaran/NewPatientModal.tsx`) contained an outdated prototype algorithm from F-008 that outputted hyphenated numbers (`01-01-000001`) and reset the sequence number back to `1`. This alarmed clinic directors (dr. Ovan & dr. Neneng) who feared collisions with 5 years of physical and electronic patient records.

This specification formalizes **F-017: Penomoran Otomatis RM Berkelanjutan**, ensuring that:
1. All newly generated medical record numbers strictly follow the canonical 9-digit format without hyphens.
2. The sequence number seamlessly continues from the highest historical sequence in the database (currently `3740`, so next is `3741`, `3742`, etc.).
3. The registration modal dynamically updates the gender and village prefix while preserving sequential integrity, and allows manual overrides for edge cases with strict anti-duplicate validation.

---

## 2. User Stories

- **US-001 (Registration Staff / Kasir)**: As a clinic registration receptionist, I want the new patient form to automatically suggest the next official No RM (starting from 3741) in the exact 9-digit format, so that I don't have to check Google Sheets or worry about conflicting with existing records.
- **US-002 (Clinic Director / Owner)**: As dr. Ovan and dr. Neneng, I want all new medical record numbers to seamlessly extend our 3,750 historical patients without hyphens or sequence resets, so that our physical archive and digital records remain 100% harmonized.
- **US-003 (Special Cases / Manual Override)**: As a receptionist, when an existing patient visits who previously held a physical paper card or special legacy number, I want to be able to edit the suggested No RM, provided the number is not already taken by another patient.

---

## 3. RFC 2119 Acceptance Criteria

### 3.1 Format and Sequence Integrity
- **AC-001.1**: The generated No RM SHALL consist of exactly 9 numeric digits matching the pattern `^[0-9]{9}$`.
- **AC-001.2**: The first 2 digits SHALL represent the gender code (`01` for Laki-laki, `02` for Perempuan) according to `JENIS_KELAMIN_RM_CODE`.
- **AC-001.3**: Digits 3 and 4 SHALL represent the village code according to `DESA_RM_CODE` (e.g., `01` for Cikidang, `02` for Pangkalan, `13` for Luar Daerah).
- **AC-001.4**: Digits 5 through 9 SHALL represent the global sequence number, formatted as a 5-digit zero-padded integer (`03741`, `03742`, etc.).
- **AC-001.5**: The sequence number SHALL continue from the maximum 5-digit sequence currently present in `public.patients.no_rm` (with a minimum baseline of `3741`).
- **AC-001.6**: The generated No RM SHALL NOT contain hyphens (`-`), spaces, or letters.

### 3.2 Reactive UI Generation
- **AC-002.1**: WHEN `NewPatientModal` opens, the system SHALL asynchronously compute and populate the `noRm` input field with the next sequential No RM.
- **AC-002.2**: WHEN the user changes the Gender or Village dropdowns in `NewPatientModal`, the system SHALL update the 4-digit prefix while maintaining the computed next sequence number without triggering infinite loops or form resets.
- **AC-002.3**: IF the user clicks the "Generate Ulang" icon button, the system SHALL re-query the latest sequence from the database and refresh the `noRm` field.

### 3.3 Manual Override & Validation
- **AC-003.1**: The `noRm` input field SHALL remain editable by the user.
- **AC-003.2**: WHEN a user inputs or edits `noRm`, the form SHALL validate that `noRm` contains only digits and is between 8 and 12 characters (standardizing on 9 digits).
- **AC-003.3**: WHEN the form is submitted, the system SHALL verify that `noRm` does not already exist in `public.patients`. If duplicate, submission SHALL be aborted with a clear error: `"Nomor RM [no_rm] sudah terdaftar atas nama pasien lain."`

---

## 4. Non-Regression Invariants

- **INV-001**: None of the existing 3,750 patient records in `public.patients` shall be altered or renumbered.
- **INV-002**: Patient registration submission payload to `public.patients` must remain compatible with all downstream modules (kunjungan, rekam medis, billing, and laporan Puskesmas).
- **INV-003**: The fix in `NewPatientModal.tsx` preventing reset loops when selecting `Nn.` or `Ny.` must remain intact.

---

## 5. Out of Scope

- Live two-way synchronization to Google Sheets API (Google Sheets is retired; web Supabase is the sole source of truth).
- Per-village sequence resets (the clinic's historical dataset established that sequence is global across all villages and genders).

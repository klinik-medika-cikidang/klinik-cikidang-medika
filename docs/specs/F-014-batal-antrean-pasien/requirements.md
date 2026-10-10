# Requirements Specification — F-014: Batal & Pulihkan Antrean Pasien

## 1. Executive Summary

In current clinic operations, patients who register at the front desk (Loket Pendaftaran) enter the waiting queue (`visits.status_pembayaran = 'Menunggu Dokter'`). Under various real-world scenarios, registered patients may choose to leave before being examined, fail to respond when called by the polyclinic doctor, be registered mistakenly as duplicates, or require immediate emergency hospital transfer. Previously, the system lacked a mechanism to cancel an active queue token, resulting in phantom queues lingering in doctor workstations and pending cashier registries.

This specification introduces a medical-legally compliant **Soft Cancellation** mechanism (`status_pembayaran = 'Batal'`) with pre-categorized cancellation reasons, cross-module access (Front Desk & Doctor Workstation), dedicated queue filtering, and an instant **Restore (Pulihkan)** capability if a patient returns.

---

## 2. Glossary & Domain Definitions

- **Soft Cancellation**: Updating the visit state to `'Batal'` with recorded rationale, without deleting the row from the PostgreSQL database (`DELETE FROM visits` is strictly prohibited to preserve auditability under Permenkes 24/2022).
- **Physical Token Stability**: Queue token numbers (`nomor_antrian`) are immutable and sequential. Canceling an earlier token (e.g. `#03`) SHALL NOT renumber subsequent tokens (e.g. `#04`, `#05`), preventing paper-token desynchronization.
- **Restoration (Pulihkan)**: The state transition reverting a cancelled visit back to `'Menunggu Dokter'`, restoring the patient to the active waiting queue without requiring re-entry of patient demographics.

---

## 3. User Stories

### US-001: Polyclinic Doctor Handling Absent Patient
> **As a** Polyclinic Doctor (`dokter_admin`),  
> **I want to** cancel the active queue for a patient who does not respond after 3 calls,  
> **So that** my active queue list remains clean and only reflects patients actually present in the waiting room.

### US-002: Front-Desk Receptionist Handling Patient Cancellation
> **As a** Front-Desk Receptionist / Paramedic (`dokter_admin` / `owner`),  
> **I want to** mark a patient's visit as cancelled when they inform the clinic they cannot wait,  
> **So that** the doctor and cashier do not expect or process the patient.

### US-003: Patient Returns After Initial Cancellation
> **As a** Clinic Staff Member,  
> **I want to** restore a previously cancelled queue token with one click,  
> **So that** a patient who stepped out temporarily can resume their spot without registering as a new visit.

---

## 4. Acceptance Criteria (RFC 2119 & EARS)

### 4.1 Data Integrity & Non-Destructive Cancellation
- **AC-001**: The system SHALL NOT execute a hard `DELETE` operation against the `visits` table when an antrean cancellation is triggered.
- **AC-002**: WHEN a clinic user confirms queue cancellation, the system SHALL update `status_pembayaran` to `'Batal'`, record `alasan_batal` (reason string), and record `dibatalkan_pada` (timestamp).
- **AC-003**: The system SHALL NOT alter or decrement existing or subsequent `nomor_antrian` values when an antrean token is cancelled.
- **AC-004**: Any existing related records (`post_cares`, `referral_commissions`, `public_health_records`, `visit_therapy_packages`) SHALL remain intact and associated with the visit.

### 4.2 Cancellation Reason Taxonomy
- **AC-005**: The cancellation interface SHALL present four pre-defined quick-select reason chips:
  1. `Pasien Pulang / Batal Sendiri`
  2. `Tidak Hadir saat Dipanggil Poli`
  3. `Salah Input / Pendaftaran Dobel`
  4. `Rujukan Darurat ke RS`
- **AC-006**: The interface SHALL provide an optional text field (`catatan_tambahan`) allowing users to add custom contextual notes up to 255 characters.

### 4.3 Workstation Visibility & Queue Segregation
- **AC-007**: In `QueueList` (`/rekam-medis`), visits with `status_pembayaran = 'Batal'` SHALL NOT appear under the `"Menunggu"` tab or `"Selesai"` tab.
- **AC-008**: `QueueList` SHALL display a dedicated `"Batal"` tab with a numerical badge indicating the count of cancelled visits for the selected date.
- **AC-009**: Under the `"Semua"` tab, cancelled visits SHALL display a distinct soft rose/slate badge (`Batal`) alongside their recorded reason.
- **AC-010**: In the Front Desk (`/pendaftaran`), cancelled visits SHALL NOT appear in the Cashier POS pending payment queue (`isWaitingPayment`).
- **AC-011**: In `MasterPatientTable`, cancelled visits SHALL be filterable under a dedicated `"Batal"` tab and display status badge `'Batal'`.

### 4.4 Restoration (Pulihkan) Lifecycle
- **AC-012**: WHEN an authorized user clicks `"Pulihkan Antrean"` on a cancelled visit, the system SHALL update `status_pembayaran` back to `'Menunggu Dokter'` and clear `alasan_batal` and `dibatalkan_pada`.
- **AC-013**: Upon restoration, the visit SHALL immediately re-appear in the active `"Menunggu"` queue across both `/rekam-medis` and `/pendaftaran` without requiring a full page reload.

---

## 5. Out of Scope

- Automated SMS or WhatsApp notifications to patients regarding cancellation.
- Re-ordering or shifting paper queue token numbers.
- Hard-deleting medical records or patient entries.

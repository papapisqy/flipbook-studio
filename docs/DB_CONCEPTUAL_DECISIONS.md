# CONCEPTUAL DATABASE DECISIONS — FLIPBOOK STUDIO

## DBD-00 — Identity and Governance

- **Project:** Flipbook Studio (`FS-CORE`)
- **Document type:** Supporting Decision Record for FS-DOC-06
- **Decision reference:** `CR-DB-001 — CONCEPTUAL DATABASE ARCHITECTURE APPROVAL`
- **Version:** `v0.1.1-approved-locked`
- **Decision status:** **APPROVED & LOCKED — CONTROLLED SUPPORTING RECORD**
- **Document status:** **CONTROLLED SUPPORTING RECORD — NOT FS-DOC-06 LOCK**
- **Approval basis:** Explicit owner approval after Revision 06A-2 review.
- **Scope:** conceptual data architecture only; not a physical database design, implementation, test result, or approval/lock of FS-DOC-06.

This record fixes only the owner-approved conceptual direction. It does not define tables, columns, PostgreSQL types, indexes, SQL, migrations, Storage object names, RLS policy syntax, or transaction implementation.

### Controlled Revision History

| CR | Date | Administrative impact | Version |
|---|---|---|---|
| CR-IA-001 | 18 November 2026 | Records IA-Q-001 through IA-Q-004 as owner decisions without changing CR-DB-001, DB-Q decisions, DB-REQ, model data, phases, or physical design. | `v0.1.0-owner-approved-conceptual` → `v0.1.1-revised-cr-ia-001` |
| CR-IA-001-RELOCK | 18 November 2026 | Re-lock after consistency audit without changing CR-DB-001, DB-Q decisions, DB-REQ, model data, phases, or physical design. | `v0.1.1-revised-cr-ia-001` → `v0.1.1-approved-locked` |

## DBD-01 — Baseline References

| Baseline | Status used by this record | Relevant scope |
|---|---|---|
| FS-DOC-01 `PRODUCT_REQUIREMENTS.md` | APPROVED & LOCKED | Stable UUID, JSONB snapshot, lifecycle, activities, media, RLS, backup, quota. |
| FS-DOC-02 `APP_FLOW.md` | APPROVED & LOCKED | Autosave, publish, lifecycle, QR, attempt, backup, and privileged-operation flows. |
| FS-DOC-03 `INFORMATION_ARCHITECTURE.md` | `v1.0.2-approved-locked`, APPROVED & LOCKED | Public/admin information boundaries; IA-Q statuses; one QR-management area. |
| FS-DOC-04 `CORE_FEATURES.md` | `v1.0.1-approved-locked`, APPROVED & LOCKED | CF-003 through CF-014 and CF-AC-004 through CF-AC-026. |
| FS-DOC-05 `UI_UX_SPEC.md` | `v1.0.1-approved-locked`, APPROVED & LOCKED | UI traceability, privacy boundary, and approved design context. |

Key baseline evidence includes stable UUIDs (FR-BOK-002), CAS revision handling (FR-EDT-007), immutable `content_snapshot JSONB` (FR-PUB-003), atomic active-version activation (FR-PUB-004), hybrid immutable media (FR-MED-001/003), server-authoritative activity processing (FR-ACT-005/006), and RLS default-deny (NFR-SEC-001).

## DBD-02 — Owner-Approved Conceptual Decisions

### DB-Q-001 — Draft and Snapshot Architecture

**DECIDED/CLOSED — CONCEPTUAL SCOPE ONLY**

- Draft uses a relational data model that supports stable identity, structure, and validation.
- Publication snapshot uses immutable JSONB.
- Snapshot is produced only from a validated draft.
- Draft changes after publication do not alter historical snapshots.
- The final JSONB form and physical relation structure remain open.

**Traceability:** DB-REQ-003 through DB-010; FR-BOK-002, FR-EDT-007, FR-PUB-003/004; CF-003, CF-004, CF-008, CF-009; CF-AC-004, CF-AC-006/007, CF-AC-015/016.

### DB-Q-002 — Archive and Delete

**DECIDED/CLOSED — CONCEPTUAL SCOPE ONLY**

- Soft archive hides or deactivates a book without removing necessary history.
- Hard delete is allowed only after dependency examination.
- Required snapshots, results, media, and audit evidence must not be deleted unsafely.
- No numeric retention period is decided.

**Traceability:** DB-REQ-003, DB-REQ-007, DB-REQ-019, DB-REQ-021, DB-REQ-025; FR-PUB-003, FR-MED-003; AC-PUB-006, AC-MED-001; CF-005, CF-009.

### DB-Q-003 — CAS Granularity

**DECIDED/CLOSED — CONCEPTUAL SCOPE ONLY**

- MVP has one revision-CAS boundary at book-draft level.
- Each mutation requires an expected revision.
- Stale mutations are rejected.
- Structural conflicts must not be resolved by silent overwrite.
- Per-entity revision granularity is not an MVP requirement.

**Traceability:** DB-REQ-008; FR-EDT-007; AC-EDT-002/003; CF-004; CF-AC-006/007; AF-02-010.

### DB-Q-004 — Idempotency Scope

**DECIDED/CLOSED — CONCEPTUAL SCOPE ONLY**

- An idempotency key is scoped by attempt and operation type.
- Answer submission and finalization must not duplicate outcomes during retry.
- Repeated responses must remain consistent with the earlier operation result.
- Numeric retention duration is not decided.
- Exact uniqueness and constraint mechanics remain for logical design.

**Traceability:** DB-REQ-018/019; FR-ACT-005/006; AC-ACT-005; CF-006; CF-AC-010/011; AF-01-010 through AF-01-012.

### DB-Q-005 — Media Integrity

**DECIDED/CLOSED — CONCEPTUAL SCOPE ONLY**

- Draft media is private.
- Publication media is hash-verified and treated as immutable.
- Media references prevent deletion of assets still required.
- Deduplication follows hash integrity and references.
- Storage object naming and reference-count mechanics remain open.

**Traceability:** DB-REQ-007/009/025; FR-MED-001/003; FR-PUB-003; AC-MED-001; CF-005; CF-AC-008/009; AF-02-011, AF-02-015.

### DB-Q-006 — RLS and Trusted Operations

**DECIDED/CLOSED — CONCEPTUAL SCOPE ONLY**

- RLS follows default-deny.
- Private data is not anonymously accessible.
- Scoring, publish, rollback, revoke, and other privileged operations cross a trusted server boundary.
- Service-role secrets must not be available in the browser.
- Policy matrix and function implementation remain for the next stage.

**Traceability:** DB-REQ-001, DB-REQ-010/011, DB-REQ-017 through DB-022; NFR-SEC-001 through NFR-SEC-007; CF-013; CF-AC-024; AF-03-001, AF-03-002, AF-03-014, AF-03-024/025.

## DBD-03 — Conceptual Model Corrections

### AUD-DB-001 — Answer State Persistence

`A`/`B`/`C` is a UI and synchronization-status contract. Status `B` pending/offline may be client-local. This record does not require server persistence of `B` as a durable database fact.

**Effect:** server-side persistent facts remain valid accepted answers, server rejection/finalization outcomes, and idempotent operation results. This correction avoids over-modeling a transient client state.

### AUD-DB-002 — Result Disclosure Projection

A persistent result is required. Disclosure may be a server-filtered projection of that result and related permitted context. It is not automatically a separate persistent conceptual entity.

**Effect:** no independent disclosure store is implied; server-only scoring and output filtering remain mandatory.

### AUD-DB-003 — Revision and Conflict Context

The current draft revision is mandatory for CAS. Persistent full revision history and persistent conflict context are not automatic requirements.

**Effect:** current revision, audit evidence, and transient conflict state must remain conceptually distinct. This record does not require a full version-history store for every draft mutation.

## DBD-04 — Data Integrity Invariants

1. Stable UUID remains unchanged by reordering, reparenting, or sequence-number changes.
2. A published snapshot remains immutable after activation.
3. An active-version transition, its required audit evidence, and failure recovery form one atomic conceptual operation.
4. A failed publish cannot expose a partial snapshot or replace the prior active version.
5. A rollback verifies target media before atomically changing the active pointer.
6. An unpublish/revoke action preserves required historic records; revoke does not assign a zero score automatically.
7. A stale draft mutation cannot overwrite a valid newer mutation.
8. A finalization or answer retry with the same scoped idempotency key cannot create duplicate outcome data.
9. Server UTC, rather than client clock, determines deadline validity.
10. Media needed by retained snapshots or active attempts cannot be removed unsafely.
11. Dynamic QR cannot resolve to an external, cyclic, inactive, unpublished, or revoked target.
12. Anonymous access cannot read or mutate private data; privileged operations remain trusted-server operations.

## DBD-05 — MVP and Phase 2 Boundary

| Scope | MVP | Phase 2 |
|---|---|---|
| Draft / snapshot / lifecycle | Relational draft, book-level CAS, immutable snapshot, publish/rollback/unpublish/revoke. | Per-entity revision is not required. |
| Media | Private draft media, verified immutable publication media, dependency protection. | Implementation refinements remain open. |
| Activities | Minimum identity, hashed session token, single attempt, server deadline, idempotent result. | Multi-attempt and retry grant. |
| QR | Static QR export for valid public book URL. | Dynamic QR, short-code resolution, target audit, daily non-PII aggregate analytics. |
| Operations | Audit, quota warning, backup/restore requirement. | Provider-specific optimization and deferred operational choices. |

No Phase 2 capability becomes a mandatory MVP data path through this record.

## DBD-06 — Remaining Open Decisions

### Database Decisions

| ID | Status | Open scope |
|---|---|---|
| DB-Q-001 through DB-Q-006 | DECIDED/CLOSED — conceptual scope only | Their physical/logical-detail derivatives remain open. |
| DB-Q-007 | OPEN | Publish-latency instrumentation boundary and events. |
| DB-Q-008 | OPEN | Client-local answer-queue persistence and reconciliation. |
| DB-Q-009 | OPEN | Backup schedule, retention, and provider-capability verification. |
| DB-Q-010 | OPEN | Quota metric source and aggregation cadence. |

### Explicitly Undecided Derivatives

- Data and audit retention periods.
- Idempotency-key retention duration.
- Final JSONB snapshot shape.
- Physical relation structure.
- Storage object naming.
- Deduplication and reference-count detail.
- RLS policy matrix.
- Privileged-function boundary and transaction mechanics.

### IA Decisions

- `IA-Q-001` through `IA-Q-004` are **DECIDED/CLOSED through CR-IA-001**: hierarchical admin sidebar with stable URLs, contextual breadcrumb, safe two-level publish information, and answer-queue indicator near save/submit with detail through a panel or dialog.
- Browser persistence, expiry, retry, recovery, telemetry, and provider capability remain open technical details; CR-IA-001 does not close DB-Q-007 through DB-Q-010 or related implementation decisions.
- `IA-Q-005` remains **DECIDED/CLOSED**: one `P-ADM-013` management area, static QR in MVP, dynamic QR in Phase 2, no additional route.

## DBD-07 — Traceability to DB-REQ and Baselines

| Conceptual decision / correction | DB requirements | Baseline anchors |
|---|---|---|
| Relational draft + immutable JSONB snapshot | DB-REQ-003—010 | FR-BOK-002, FR-EDT-007, FR-PUB-003/004; CF-003/004/008/009. |
| Archive/delete protection | DB-REQ-003, 007, 019, 021, 025 | FR-MED-003, FR-PUB-003; AC-MED-001, AC-PUB-006; CF-005/009. |
| Book-level CAS | DB-REQ-008 | FR-EDT-007; AC-EDT-002/003; CF-AC-006/007. |
| Attempt-scoped idempotency | DB-REQ-018/019 | FR-ACT-005/006; AC-ACT-005; CF-AC-010/011. |
| Media integrity | DB-REQ-007, 009, 025 | FR-MED-001/003; FR-PUB-003; CF-AC-008/009. |
| RLS/trusted operations | DB-REQ-001, 010/011, 017—022 | NFR-SEC-001—007; CF-013; CF-AC-024. |
| A/B/C correction | DB-REQ-018 | FR-ACT-005/006; CF-006; UI/UX status contract. |
| Disclosure correction | DB-REQ-019 | FR-ACT-007; CF-012; CF-AC-023. |
| Revision correction | DB-REQ-008, 021 | FR-EDT-007; CF-004; CF-AC-006/007. |

## DBD-08 — Change Control and Approval Record

- **CR-DB-001:** `CONCEPTUAL DATABASE ARCHITECTURE APPROVAL` — **APPROVED BY OWNER**.
- **CR-IA-001:** administrative alignment of IA-Q-001 through IA-Q-004; **implemented and re-locked after consistency audit**.
- **Decision scope:** DB-Q-001 through DB-Q-006 at conceptual scope only, plus AUD-DB-001 through AUD-DB-003.
- **Out of scope:** FS-DOC-06 creation, physical data design, SQL, migrations, RLS policy syntax, provider configuration, and implementation/testing claims.
- **Change control:** any substantive expansion beyond this record requires a new change request, impact analysis against FS-DOC-01 through FS-DOC-05, owner approval, and controlled versioning.
- **Record status:** controlled supporting record; revision `v0.1.1-approved-locked` is approved and locked in its limited scope and does not approve, lock, or replace FS-DOC-06.

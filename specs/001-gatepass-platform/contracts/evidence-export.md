# Contract: Evidence Export & Questionnaire Drafting (Scale tier)

## Control mapping

`packages/evidence` ships a versioned control map (`control_map_version`):

| Posture check (from scan results) | SOC 2 | ISO 27001 |
|---|---|---|
| No exposed secrets in default branch | CC6.1 | A.8.24 |
| Tenant isolation rules present (RLS/security rules) | CC6.3 | A.8.3 |
| Dependencies pinned, no hallucinated packages | CC8.1 | A.8.28 |
| MCP transports authenticated | CC6.6 | A.8.21 |
| Tool parameters bounded + schema-validated | CC8.1 | A.8.28 |
| Continuous scanning enabled | CC7.1 | A.8.16 |
| CI gate active on protected branches | CC8.1 | A.8.32 |

(Mapping expands with ruleset; each mapped item derives from `Scan.posture_snapshot`.)

## Export flow (FR-021, FR-023)

1. Scan completes → posture snapshot evaluated against control map.
2. Evidence items pushed to connected Vanta/Drata via their public evidence APIs;
   external IDs stored on `EvidenceExport.items`.
3. Every item embeds `scan_id` + `ruleset_version` (traceability, SC-008).
4. **No scan data ⇒ no export**: attempting an export without a completed scan returns
   `409 no_posture_data`; nothing is fabricated.

## Questionnaire drafting (FR-022)

- Input formats: CSV, XLSX, SIG-lite subset.
- Each question is matched to posture facts; the draft answer cites `scan_id`s and control
  map entries. Questions with no posture backing are returned **unanswered** and flagged
  `needs_human_input` — never guessed.
- Drafts sit in `review_status=draft` until a human marks `reviewed`; export before review
  is blocked (constitution: human review before external use).

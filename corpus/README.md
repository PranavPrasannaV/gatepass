# Gatepass Corpus

Versioned, labeled fixtures used for precision measurement (Constitution Principles I & V)
and the public benchmark. Versions are tagged immutably as `corpus-vN`.

## Case format

Each case is a directory:

```
corpus/cases/<tier>/<class-id>/<case-name>/
├── case.json      # metadata (schema: corpus/schema/case.schema.json)
└── tree/          # the repository fixture the scanner runs against
```

`case.json`:

```jsonc
{
  "id": "verified/exposed-secret/vuln-aws-in-bundle",
  "classId": "exposed-secret",
  "label": "vulnerable",     // "vulnerable" | "clean"
  "public": true,             // included in the open public-subset mirror
  "note": "AWS key shipped in a client bundle"
}
```

## Labels & measurement

- **vulnerable** cases MUST produce ≥1 finding of `classId` (else a false negative).
- **clean** cases MUST produce 0 findings of `classId` (else a false positive).
- Per class: `tpRate = TP / (TP + FN)` over vulnerable cases;
  `fpRate = FP / (clean case count)`.
- **Reproduction verification (SC-002)**: for every verified-tier finding, the harness
  confirms the cited location exists within the fixture and is within file bounds. A
  non-confirmable reproduction fails the run.

Run: `pnpm corpus:measure --corpus corpus-v1`

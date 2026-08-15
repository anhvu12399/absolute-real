# Clone checklist

1. Back up database and uploads. Export `/absolute-asia/v1/import/export` in batches and keep the JSON plus checksum outside WordPress.
2. Install this ZIP on both source and target. Keep the target profile `generic` for Vietnam, Thailand and sister brands. Select `absolute` only on Absolute Asia when branded seed actions are intentionally required.
3. Configure Source site, Frontend URL and every legacy hostname. Never store an Application Password in WordPress options, source control or command logs.
4. Run Compatibility Check. Stop if a source CPT is unhandled, pagination totals differ, the bridge cannot read a record, or any non-empty field is unmapped without a documented skip reason.
5. Run `/import/audit` with `limit: 0`, then `/import/reconcile` with `dry_run: true` and a stable `run_id`. Review every create/update/error action.
6. Re-run reconcile with `dry_run: false` in batches. Resume with the returned offset and the same run ID. Re-running is idempotent by source ID and slug; editor-modified values are preserved.
7. Run the relationship pass, compare post/taxonomy/media counts and export checksums, then crawl the complete `/paths` manifest.
8. Trigger frontend revalidation, run the production build and `npm run lighthouse`. Do not change DNS until the crawl has no unintended 404s or legacy-host links and all performance budgets pass on stable staging.
9. Cleanup is always preview-first. Applying cleanup requires the unchanged approval token returned by preview and only permits fields marked `deprecated` in the contract.
10. Rotate the Application Password after migration and retain the source snapshots and audit log for rollback/remapping.

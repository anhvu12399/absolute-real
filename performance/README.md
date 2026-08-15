# Lighthouse evidence

`lighthouse-local-after.json` is the production-mode local median from three
mobile runs per representative URL. Raw Lighthouse artifacts are deliberately
ignored because they are large and machine-specific.

There is no comparable production baseline in this repository. The first
available pre-change capture used the development server, so it is not recorded
as a before result. The CI budgets in `../lighthouserc.json` remain strict and
currently fail until every representative page reaches the agreed thresholds.

Run `npm run lighthouse` against a stable staging/prod data source and retain
the generated CI artifact outside Git when performing final acceptance.

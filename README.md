# Absolute Asia Tours — Headless WordPress frontend

Next.js frontend for Vercel with WordPress retained as the content system.

The first migration stage uses the WordPress-rendered `dsmart`/`dsmart-child`
HTML as the compatibility layer. This preserves the live visual design and SEO
while individual templates are progressively converted to native Next.js
components. Set `WORDPRESS_RENDER_ORIGIN` to a dedicated origin hostname before
the public domain is pointed at Vercel; otherwise the renderer would call back
into itself after DNS cutover.

## Local setup

1. Copy `.env.example` to `.env.local` and configure the WordPress origin.
2. Install dependencies with `npm install` and run `npm run dev`.
3. For lead storage, run `database/001_create_leads.sql` on the configured PostgreSQL database.
4. Install the bridge in `wordpress-plugin/absolute-asia-headless` only after taking a WordPress backup and testing on staging.

## Deployment order

1. Create a dedicated HTTPS origin hostname that points to the existing WordPress server.
2. Deploy this project to a Vercel staging domain with `VERCEL_ENV=preview` so it remains `noindex`.
3. Configure environment variables, database, email domain, and signed webhook.
4. Crawl and compare staging against production before changing DNS.
5. Point the public domain to Vercel only after `/wp-admin`, `/wp-json`, media, forms, sitemap, canonical URLs and redirects pass acceptance tests.

The current Vercel preview remains protected and `noindex`. Do not attach the
production domain until the dedicated WordPress origin hostname is working.

Never commit WordPress application passwords or production secrets. Rotate the temporary application password used for the audit.

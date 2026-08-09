# Absolute Asia Headless Bridge

Install `absolute-asia-headless` as a WordPress plugin. Add these constants to `wp-config.php`:

```php
define('AAT_REVALIDATE_URL', 'https://staging.example.com/api/revalidate');
define('AAT_REVALIDATE_SECRET', 'the-same-long-secret-used-on-vercel');
```

The plugin exposes only published content from the explicit public-type allowlist. It also disables public REST/query access for `orders` and `booking`; verify these types are not used by an existing private workflow before activation.

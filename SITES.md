# Chuyển giữa các backend

Mỗi site giữ cấu hình riêng trong `sites/`. Không trộn lẫn, không sửa tay `.env`.

```bash
npm run site              # đang chạy site nào
npm run site absolute     # → Absolute Asia Tours
npm run site vietnam      # → Vietnam Tailor Made
npm run site mywaytravel  # → My Way Travel
```

Lệnh này chép `sites/<tên>.env` sang `.env.local` — file Next.js đọc, và git bỏ qua.
**Khởi động lại dev server** sau khi đổi, vì Next chỉ đọc env lúc chạy lên.

## Thêm site mới

Chép một file có sẵn rồi sửa:

```bash
cp sites/absolute.env sites/tenmoi.env
npm run site tenmoi
```

## Mỗi file có gì

| Nhóm | Biến |
|---|---|
| Nhận diện | `NEXT_PUBLIC_BRAND_NAME`, `_SHORT`, `_TAGLINE`, `SITE_TITLE`, `SITE_DESCRIPTION` |
| Tên miền | `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_LEGACY_HOSTS` |
| WordPress | `NEXT_PUBLIC_WP_URL`, `WORDPRESS_API_URL`, `WORDPRESS_ORIGIN` |
| Khác | `NEXT_PUBLIC_SOCIALS`, `NEXT_PUBLIC_SHOW_EDIT_LINKS` |

`NEXT_PUBLIC_SHOW_EDIT_LINKS=1` bật nút Edit góc phải. **Để trống khi chạy thật.**

## Lưu ý

`sites/mywaytravel.env` mới là khung — địa chỉ backend còn là phỏng đoán, sửa lại trước khi dùng.

Backend Vietnam (`backend.vietnamtailormade.com`) hiện trả **404 ở mọi endpoint `/wp-json/`** — chưa bật REST API hoặc chưa cài plugin. Phải xử lý trước khi import.

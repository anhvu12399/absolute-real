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
| Logo | `NEXT_PUBLIC_BRAND_LOGO` — `vector` dùng dấu hiệu vẽ sẵn trong mã (chỉ Absolute Asia có), `wordpress` lấy logo từ CMS. Mặc định `vector`, nên site mới phải đặt `wordpress`. |
| Tên miền | `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_LEGACY_HOSTS` |
| WordPress | `NEXT_PUBLIC_WP_URL`, `WORDPRESS_API_URL`, `WORDPRESS_ORIGIN` |
| Khác | `NEXT_PUBLIC_SOCIALS`, `WORDPRESS_REVALIDATE_SECRET` |

## Nút Edit và đăng phát lên ngay

Nút Edit ở góc phải **chỉ hiện với người đã đăng nhập WordPress** có quyền sửa bài —
không còn cờ bật/tắt nào trong env. Trang hỏi backend qua `/absolute-asia/v1/me`,
gửi kèm cookie đăng nhập.

Điều kiện để nó hoạt động: ô **Frontend URL** trong `admin.php?page=aat-import` phải
khớp *chính xác* `NEXT_PUBLIC_SITE_URL` — kể cả `www` và `https`. Trình duyệt chỉ gửi
cookie khi CORS gọi đúng tên địa chỉ, nên sai một ký tự là nút không bao giờ hiện.

Để lưu bài xong web cập nhật ngay (không cần build lại), đặt ba giá trị khớp nhau:

| Nơi đặt | Biến |
|---|---|
| `sites/<site>.env` + Vercel | `WORDPRESS_REVALIDATE_SECRET` |
| `wp-config.php` | `AAT_REVALIDATE_SECRET` — cùng giá trị |
| `wp-config.php` | `AAT_REVALIDATE_URL` = `<NEXT_PUBLIC_SITE_URL>/api/revalidate` |

Màn hình Import hiện trạng thái: đã cấu hình chưa, và lần đẩy gần nhất thành công hay
thất bại. Bỏ trống thì mọi thứ vẫn chạy, chỉ là nội dung mới lên chậm theo cache.

## Lưu ý

`sites/mywaytravel.env` mới là khung — địa chỉ backend còn là phỏng đoán, sửa lại trước khi dùng.

Backend Vietnam (`backend.vietnamtailormade.com`) hiện trả **404 ở mọi endpoint `/wp-json/`** — chưa bật REST API hoặc chưa cài plugin. Phải xử lý trước khi import.

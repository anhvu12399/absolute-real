# Dựng site thứ hai từ bộ này

Toàn bộ frontend + plugin là **một bộ khung dùng chung**. Làm site mới (ví dụ site Vietnam) không phải sửa code — chỉ đổi cấu hình và trỏ sang WordPress khác.

Kiến trúc: WordPress cũ → *(plugin import)* → WordPress mới → *(REST)* → Next.js. Site mới lặp lại đúng chuỗi đó với dữ liệu của nó.

---

## 1. WordPress mới

1. Cài WordPress sạch + **ACF** (bản free là đủ — plugin tự xử lý phần repeater).
2. Cài `absolute-asia.zip`, kích hoạt.
3. Vào **Absolute Asia Import**:
   - **Nguồn import** → dán địa chỉ WordPress **cũ** của site đó.
   - **Kiểm tra tương thích** → bấm trước khi import. Nó hỏi thẳng web cũ và báo:
     kiểu bài nào có / thiếu và mỗi loại bao nhiêu bài, taxonomy nào có, và
     **trường ACF nào có dữ liệu mà bảng ánh xạ chưa biết**. Chỉ đọc, không ghi gì.
   - **Tên công ty khác** → nếu web cũ có link sang một hãng khác, khai ở đây.
     Mặc định là của Absolute; site khác thì phải sửa, không thì plugin đi tìm
     nhầm tên và bỏ sót tên thật.
   - **Năm thành lập** → của chính công ty đó. Vài câu trong nội dung tự soạn
     đếm từ năm này ("36 years planning Asia"); để trống thì plugin lấy năm sớm
     nhất mà bài About của site nhắc tới, không mượn số của site khác.
   - **Logo** → dán link ảnh logo từ Media Library.

Đọc bản báo cáo tương thích thế nào:

| Kết quả | Nghĩa là |
|---|---|
| Kiểu bài **có** đủ 7 dòng | Import chạy được nguyên vẹn |
| Thiếu một kiểu bài | Loại nội dung đó không có bên web cũ — bình thường nếu site nhỏ hơn |
| Taxonomy thiếu | Bài vẫn import, chỉ không được gán nhãn đó |
| **Chưa map N trường** | Dữ liệu vẫn được lưu vào `source_*` (không mất), nhưng frontend chưa hiện. Muốn hiện thì thêm vào `includes/field-map.php` |

4. Bấm **Import everything**. Chạy xong bấm thêm:
   - *Sửa nước, bản trùng & ảnh gán sai*
   - *Viết mô tả khách sạn*

Plugin không chứa dữ liệu riêng của Absolute. Chỗ nào cần tên thương hiệu thì lấy từ **Cài đặt → Tiêu đề trang** của chính WordPress đó.

## 2. Frontend

```bash
cp .env.example .env.local
```

Sửa khối **Identity** — đây là thứ duy nhất bắt buộc đổi:

| Biến | Ý nghĩa |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Tên miền site mới |
| `NEXT_PUBLIC_BRAND_NAME` / `_SHORT` | Tên hiện ở breadcrumb, tiêu đề trang |
| `NEXT_PUBLIC_BRAND_TAGLINE` | Dòng nhỏ dưới logo |
| `NEXT_PUBLIC_LEGACY_HOSTS` | Tên miền cũ còn bị link trong bài — sẽ tự kéo về link nội bộ |
| `NEXT_PUBLIC_SOCIALS` | `Nhãn\|URL`, cách nhau bởi dấu phẩy. Để trống thì không hiện hàng mạng xã hội |
| `WORDPRESS_API_URL` | `/wp-json` của WordPress mới |

Rồi `npm install && npm run build`.

## 3. Kiểm tra trước khi phát hành

```bash
grep -rn "tên-brand-cũ" app components lib
```

Không ra kết quả nào là sạch. Trong `lib/site.ts` còn giá trị mặc định của Absolute — đó là fallback khi thiếu biến môi trường, `.env.local` sẽ đè lên.

---

## Cái gì dùng lại được, cái gì không

**Dùng lại nguyên vẹn** — router, toàn bộ template (trang chủ, quốc gia, tour, khách sạn, bài viết, lưu trữ), map, CSS, và plugin.

**Cần xem lại nếu web cũ có cấu trúc khác:**

| Chỗ | File | Khi nào phải sửa |
|---|---|---|
| Bảng ánh xạ trường dữ liệu | `wordpress-plugin/absolute-asia/includes/field-map.php` | Web cũ dùng tên trường ACF khác |
| Kiểu bài nguồn → kiểu bài mới | `includes/importer.php` → `aat_import_type_map()` | Web cũ có CPT khác (`hotels`, `places-to-go`…) |
| Nước thuộc vùng nào | `includes/importer.php` → `aat_country_regions()` | Danh sách quốc gia khác |
| Bảng toạ độ cho map | `components/destination/RealMapComponent.tsx` → `CITY_COORDS` | Có địa danh chưa nằm trong bảng |
| Mô tả khách sạn viết tay | `includes/seed-hotels.php` | Chỉ áp cho đúng slug của Absolute; slug khác sẽ dùng câu mô tả tự sinh từ dữ liệu bài |

### Nội dung tự soạn — cái nào theo site, cái nào không

Các nút *Soạn nội dung trang chủ* / *Soạn trang Our Story* **không** chép lịch sử
của site này sang site khác. Plugin nhận biết bằng tên site + tên miền + nguồn import:

| | Site Absolute | Site khác |
|---|---|---|
| Mốc thời gian Our Story | Đủ 5 mốc từ 1989 | Chỉ các **năm mà chính bài About của site đó nhắc tới**; tiêu đề để trống |
| Người sáng lập | Ken Fish | **để trống** — bạn tự nhập |
| "890 Traveler Reviews" | giữ | đổi thành "What travelers tell us" |
| Số năm hoạt động | 36 | theo *Năm thành lập*; chưa khai thì **bỏ hẳn mệnh đề đó**, không ghi "0 years" |

Màn hình **Đối chiếu từng trường** trong admin chính là để trả lời câu hỏi này: nó so từng trường của web cũ với web mới và đánh dấu **CHƯA MAP** cho trường nào bên cũ có dữ liệu mà chưa được ánh xạ.

## Lưu ý

Namespace REST vẫn là `/absolute-asia/v1/`, tiền tố hàm vẫn là `aat_`. Đây chỉ là tên nội bộ, không hiện ra cho người dùng, và **không nên đổi** — đổi thì phải sửa cả 27 chỗ ở frontend lẫn plugin mà chẳng được gì. Mỗi WordPress chỉ cài một bản plugin nên không có xung đột.

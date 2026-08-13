const OLD_API_URL = 'https://www.absoluteasiatours.com/wp-json/wp/v2';
const NEW_API_URL = 'https://backend.absoluteasiatours.com/wp-json/wp/v2';
const NEW_USERNAME = 'absolute';
const NEW_PASSWORD = '93sy uV1C dpth J0s2 D1zx PN7d';

async function uploadImage(imageUrl, headers) {
    if (!imageUrl) return null;
    try {
        console.log(`      📸 Đang tải ảnh: ${imageUrl.split('/').pop()}...`);
        const filename = imageUrl.split('/').pop();
        const imageRes = await fetch(imageUrl);
        const arrayBuffer = await imageRes.arrayBuffer();
        
        const uploadHeaders = {
            ...headers,
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Type': imageRes.headers.get('content-type') || 'image/jpeg'
        };
        
        const newMediaRes = await fetch(`${NEW_API_URL}/media`, {
            method: 'POST',
            headers: uploadHeaders,
            body: Buffer.from(arrayBuffer)
        });
        
        if (newMediaRes.ok) {
            const newMedia = await newMediaRes.json();
            return { id: newMedia.id, url: newMedia.source_url };
        }
        return null;
    } catch (e) {
        console.error(`      ❌ Lỗi xử lý ảnh: ${e.message}`);
        return null;
    }
}

async function migrateHome() {
    console.log('🚀 Bắt đầu dò và đẩy dữ liệu cho riêng HOMEPAGE...\n');
    const authString = Buffer.from(`${NEW_USERNAME}:${NEW_PASSWORD}`).toString('base64');
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${authString}`
    };
    const imageHeaders = { 'Authorization': `Basic ${authString}` };

    try {
        // 1. Tải Homepage cũ
        console.log(`⏳ Đang tải Homepage từ web cũ...`);
        const oldResponse = await fetch(`${OLD_API_URL}/pages?slug=home`);
        const oldPages = await oldResponse.json();
        
        if (!oldPages || oldPages.length === 0) {
            console.error("❌ Không tìm thấy Homepage cũ.");
            return;
        }

        const oldHome = oldPages[0];
        const oldHtml = oldHome.content.rendered;

        // 2. Dò tìm ảnh trong HTML cũ (ví dụ ảnh Banner, ảnh Tour)
        // Tìm tất cả các thẻ img và trích xuất src
        const imgRegex = /<img[^>]*src="([^"]+)"/g;
        let match;
        const imageUrls = new Set();
        while ((match = imgRegex.exec(oldHtml)) !== null) {
            // Lọc ra các ảnh thuộc absoluteasiatours.com và không phải icon
            if (match[1].includes('absoluteasiatours.com/wp-content/uploads')) {
                // Loại bỏ các ảnh thu nhỏ (có đuôi -150x150.jpg, v.v.)
                if (!match[1].match(/-\d+x\d+\.\w+$/)) {
                    imageUrls.add(match[1]);
                }
            }
        }

        const urls = Array.from(imageUrls).slice(0, 5); // Lấy 5 ảnh đầu tiên làm Banner
        console.log(`🔍 Tìm thấy ${urls.length} ảnh đẹp để làm Banner Homepage mới.`);

        // 3. Upload ảnh lên backend mới
        const bannerSliderData = [];
        for (const url of urls) {
            const newMedia = await uploadImage(url, imageHeaders);
            if (newMedia) {
                // Theo cấu trúc ACF của bạn, home_banner_slider là JSON array
                bannerSliderData.push({
                    "image": newMedia.url,
                    "title": "Welcome to Absolute Asia",
                    "subtitle": "Discover luxury journeys tailored just for you"
                });
            }
        }

        // 4. Đẩy Homepage sang Backend mới
        console.log(`\n   -> Đang đẩy Homepage lên backend mới...`);
        const newPostData = {
            title: oldHome.title.rendered,
            status: 'publish',
            slug: 'home',
            acf: {
                home_banner_slider: JSON.stringify(bannerSliderData)
            }
        };

        const newResponse = await fetch(`${NEW_API_URL}/pages`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(newPostData)
        });

        if (newResponse.ok) {
            console.log(`      ✅ Thành công! Homepage đã được đẩy sang với Banner hoàn chỉnh.`);
        } else {
            console.error(`      ❌ Thất bại: ${await newResponse.text()}`);
        }
    } catch (e) {
        console.error(`❌ Lỗi: ${e.message}`);
    }
}

migrateHome();

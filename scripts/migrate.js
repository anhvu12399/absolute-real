const OLD_API_URL = 'https://www.absoluteasiatours.com/wp-json/wp/v2';
const NEW_API_URL = 'https://backend.absoluteasiatours.com/wp-json/wp/v2';
const NEW_USERNAME = 'absolute';
const NEW_PASSWORD = '93sy uV1C dpth J0s2 D1zx PN7d';

const MAPPINGS = [
  { old: 'posts', new: 'tour', name: 'Tours' },
  { old: 'pages', new: 'pages', name: 'Pages' },
  { old: 'travel-guides', new: 'travel_guide', name: 'Travel Guides' },
  { old: 'hotels', new: 'hotel', name: 'Hotels' },
  { old: 'places-to-go', new: 'place_to_go', name: 'Destinations' },
  { old: 'things-to-do', new: 'thing_to_do', name: 'Things to Do' },
  { old: 'blogs', new: 'blog', name: 'Blogs' }
];

async function uploadImage(oldMediaId, headers) {
  if (!oldMediaId || oldMediaId === 0) return null;
  try {
      // 1. Get image info from old site
      const mediaMeta = await fetch(`${OLD_API_URL}/media/${oldMediaId}`).then(res => res.json());
      const imageUrl = mediaMeta.source_url;
      if (!imageUrl) return null;
      
      console.log(`      📸 Đang tải ảnh: ${imageUrl.split('/').pop()}...`);
      
      // 2. Download image buffer
      const filename = imageUrl.split('/').pop();
      const imageRes = await fetch(imageUrl);
      const arrayBuffer = await imageRes.arrayBuffer();
      
      // 3. Upload to new site
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
          return newMedia.id;
      } else {
          console.error(`      ❌ Lỗi up ảnh: ${await newMediaRes.text()}`);
      }
      return null;
  } catch (e) {
      console.error(`      ❌ Lỗi xử lý ảnh: ${e.message}`);
      return null;
  }
}

async function migrateAll() {
  console.log('🚀 Bắt đầu quá trình Migration FULL dữ liệu (Bao gồm Ảnh & Itinerary)...\n');
  const authString = Buffer.from(`${NEW_USERNAME}:${NEW_PASSWORD}`).toString('base64');
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Basic ${authString}`
  };

  let totalMigrated = 0;

  for (const mapping of MAPPINGS) {
    console.log(`\n======================================================`);
    console.log(`📦 Đang xử lý: ${mapping.name} (${mapping.old} -> ${mapping.new})`);
    console.log(`======================================================`);
    
    let page = 1;
    let hasMore = true;
    let typeSuccessCount = 0;
    
    while (hasMore) {
      try {
        console.log(`⏳ Đang tải ${mapping.name} trang ${page} từ web cũ...`);
        const oldResponse = await fetch(`${OLD_API_URL}/${mapping.old}?per_page=10&page=${page}`); // Giảm per_page xuống 10 vì có tải ảnh
        
        if (!oldResponse.ok) {
          if (oldResponse.status === 400 || oldResponse.status === 404) {
            hasMore = false;
            break;
          }
          throw new Error(`Lỗi tải dữ liệu: ${oldResponse.statusText}`);
        }
        
        const posts = await oldResponse.json();
        if (posts.length === 0) {
          hasMore = false;
          break;
        }

        for (const post of posts) {
          let targetCpt = mapping.new;

          // BỎ QUA TRANG CHỦ (HOME) THEO YÊU CẦU CỦA BẠN (SẼ LÀM BẰNG TAY HOẶC SCRIPT RIÊNG)
          if (mapping.old === 'pages' && (post.slug === 'home' || post.slug === 'homepage')) {
              console.log(`   ⏭️ Bỏ qua trang chủ (Homepage) vì cấu trúc mới khác cũ...`);
              continue;
          }

          console.log(`   -> Đang đẩy: ${post.title.rendered}...`);
          
          let newContent = post.content.rendered;
          let acfData = {};

          // Nếu là Tour, thực hiện parse nội dung HTML cũ để tách Itinerary
          if (targetCpt === 'tour') {
            const itinerary = [];
            const itinRegex = /<li class="itin-day">[\s\S]*?<button[^>]*itin-toggle-title[^>]*>([\s\S]*?)<\/button>[\s\S]*?<div class="itin-day__text">([\s\S]*?)<\/div>[\s\S]*?<\/li>/g;
            let match;
            
            while ((match = itinRegex.exec(post.content.rendered)) !== null) {
              itinerary.push({
                title: match[1].replace(/(<([^>]+)>)/gi, "").trim(),
                content: match[2].trim()
              });
            }

            if (itinerary.length > 0) {
              acfData.itinerary = itinerary;
              acfData.duration_days = itinerary.length;
            }

            // Cắt bỏ phần Itinerary
            const itinIndex = newContent.indexOf('<section class="sec-itinerary">');
            if (itinIndex !== -1) {
              newContent = newContent.substring(0, itinIndex).trim();
            }
          }

          // Xử lý Ảnh Đại Diện (Featured Image)
          let newFeaturedMediaId = null;
          if (post.featured_media) {
             const imageHeaders = { 'Authorization': `Basic ${authString}` }; // Không có Content-Type JSON
             newFeaturedMediaId = await uploadImage(post.featured_media, imageHeaders);
          }

          const newPostData = {
            title: post.title.rendered,
            content: newContent,
            status: 'publish',
            slug: post.slug,
            acf: Object.keys(acfData).length > 0 ? acfData : undefined,
            featured_media: newFeaturedMediaId
          };

          try {
            const newResponse = await fetch(`${NEW_API_URL}/${targetCpt}`, {
              method: 'POST',
              headers: headers,
              body: JSON.stringify(newPostData)
            });

            if (newResponse.ok) {
              console.log(`      ✅ Thành công!`);
              typeSuccessCount++;
              totalMigrated++;
            } else {
              console.error(`      ❌ Thất bại: ${await newResponse.text()}`);
            }
          } catch (err) {
            console.error(`      ❌ Lỗi khi gửi: ${err.message}`);
          }
          
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        page++;
      } catch (err) {
        console.error(`❌ Lỗi quá trình tải ${mapping.name}: ${err.message}`);
        hasMore = false;
      }
    }
    console.log(`✅ Hoàn tất ${mapping.name}: Copy thành công ${typeSuccessCount} bài.`);
  }

  console.log(`\n🎉 MIGRATION HOÀN TẤT TỔNG CỘNG! Đã copy thành công ${totalMigrated} bài viết (Bao gồm ảnh).`);
}

migrateAll();

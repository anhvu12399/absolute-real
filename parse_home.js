const fs = require('fs');
const html = fs.readFileSync('/Users/mac/.gemini/antigravity-ide/brain/186dc967-e170-40a1-86fd-2564ed295b55/.system_generated/steps/4388/content.md', 'utf8');

// Banner images
const banners = [];
const bannerRegex = /class="home-banner[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"/g;
let bMatch;
while ((bMatch = bannerRegex.exec(html)) !== null) {
  banners.push(bMatch[1]);
}

console.log("Banners:", banners);

// Also look for tours
const toursRegex = /class="item tour-item"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[\s\S]*?<span>([^<]+)<\/span>/g;
let tMatch;
while ((tMatch = toursRegex.exec(html)) !== null) {
  console.log("Tour:", tMatch[2], "Image:", tMatch[1]);
}


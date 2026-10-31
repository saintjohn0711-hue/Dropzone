import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { statSync } from 'fs';

const MEDIA_DIR = '/cursor/stores/bc-01a18ee1-120f-70d8-9b04-731b2bfdae3b/media';
const BASE_URL = 'https://dropzone-seven-ecru.vercel.app';

async function main() {
  // Ensure media directory exists
  await mkdir(MEDIA_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: true
  });
  
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }
  });
  
  const page = await context.newPage();

  console.log('1. Capturing inventory-live.png...');
  await page.goto(BASE_URL + '/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('.section-title', { timeout: 10000 });
  await page.screenshot({ 
    path: `${MEDIA_DIR}/inventory-live.png`,
    fullPage: false
  });
  console.log('✓ inventory-live.png captured');

  console.log('2. Capturing driver-login.png...');
  await page.goto(BASE_URL + '/driver/login', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.screenshot({ 
    path: `${MEDIA_DIR}/driver-login.png`,
    fullPage: false
  });
  console.log('✓ driver-login.png captured');

  console.log('3. Setting up checkout screenshot...');
  // Go to home and add first product to cart
  await page.goto(BASE_URL + '/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('.product-card', { timeout: 10000 });
  
  // Click on the first product
  await page.click('.product-card:first-of-type');
  await page.waitForSelector('button:has-text("Add to Drop")', { timeout: 10000 });
  
  // Click "Add to Drop" button
  await page.click('button:has-text("Add to Drop")');
  await page.waitForTimeout(1000); // Brief wait for cart update
  
  // Navigate to checkout
  await page.goto(BASE_URL + '/checkout', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('input', { timeout: 10000 });
  
  // Fill contact field - try multiple selectors
  try {
    await page.fill('input[placeholder*="contact" i]', 'Mike on site');
  } catch {
    try {
      await page.fill('input[placeholder*="name" i]', 'Mike on site');
    } catch {
      const inputs = await page.$$('input[type="text"]');
      if (inputs.length > 0) await inputs[0].fill('Mike on site');
    }
  }
  
  // Fill address field
  try {
    await page.fill('input[placeholder*="address" i]', 'Jobsite – 1234 Construction Way');
  } catch {
    try {
      await page.fill('textarea', 'Jobsite – 1234 Construction Way');
    } catch {
      const inputs = await page.$$('input[type="text"], textarea');
      if (inputs.length > 1) await inputs[1].fill('Jobsite – 1234 Construction Way');
    }
  }
  
  await page.waitForTimeout(500);
  await page.screenshot({ 
    path: `${MEDIA_DIR}/checkout.png`,
    fullPage: false
  });
  console.log('✓ checkout.png captured');

  await browser.close();
  
  // Check file sizes
  console.log('\nFile sizes:');
  const files = ['inventory-live.png', 'driver-login.png', 'checkout.png'];
  for (const file of files) {
    const stats = statSync(`${MEDIA_DIR}/${file}`);
    console.log(`  ${file}: ${(stats.size / 1024).toFixed(2)} KB`);
  }
  
  console.log('\nAll screenshots saved to:', MEDIA_DIR);
}

main().catch(console.error);

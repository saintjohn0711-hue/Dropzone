import { chromium } from "playwright";
import { mkdir } from "fs/promises";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
// tiny 1x1 jpeg as POD demo
const TINY_JPEG =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGcP//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAQUCf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Bf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Bf//Z";

const MEDIA =
  "/cursor/stores/bc-01a18ee1-120f-70d8-9b04-731b2bfdae3b/media";
const ART = "/opt/cursor/artifacts/screenshots";
const BASE = "https://dropzone-seven-ecru.vercel.app";

async function shot(page, name) {
  const path = `${MEDIA}/${name}`;
  await page.screenshot({ path, fullPage: false });
  await page.screenshot({ path: `${ART}/${name}`, fullPage: false });
  console.log("saved", name);
}

async function main() {
  await mkdir(MEDIA, { recursive: true });
  await mkdir(ART, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();

  // 1) Customer login
  await page.goto(BASE + "/account/login", {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await page.waitForSelector(".driver-form-title", { timeout: 20000 });
  await page.waitForTimeout(500);
  await shot(page, "customer-login.png");

  // Soft login via demo button
  await page.click("button.driver-test-btn");
  await page.waitForURL(/\/account/, { timeout: 30000 }).catch(() => null);
  await page.waitForTimeout(1500);
  // Ensure we're on account - if still on login, force local via API soft path already handled in UI
  if (!page.url().includes("/account")) {
    await page.goto(BASE + "/account?local=1", {
      waitUntil: "networkidle",
      timeout: 60000,
    });
  }
  await page.waitForTimeout(800);

  // Save a jobsite if form present
  const label = page.locator('input[placeholder*="Main gate"], input[placeholder*="Portón"]');
  if (await label.count()) {
    await label.fill("Main gate");
    await page
      .locator('input[placeholder*="1234"], input[placeholder*="Construction"]')
      .fill("1234 Construction Way, Austin, TX");
    await page.locator('button:has-text("Save jobsite"), button:has-text("Guardar")').click();
    await page.waitForTimeout(800);
  }

  // 2) Orders page
  await page.goto(BASE + "/account/orders", {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await page.waitForTimeout(1200);
  await shot(page, "customer-orders.png");

  // 3) Driver POD — login test driver, open complete panel
  await page.goto(BASE + "/driver/login", {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await page.waitForSelector(".driver-form-title", { timeout: 20000 });
  const testBtn = page.locator("button.driver-test-btn");
  if (await testBtn.count()) {
    await testBtn.click();
  } else {
    await page.fill('input[type="email"]', "driver@dropzone.test");
    await page.click('button[type="submit"]');
  }
  await page.waitForURL(/dashboard/, { timeout: 45000 }).catch(() => null);
  await page.waitForTimeout(2000);

  // If no jobs, still show dashboard with POD UI by injecting a fake panel via complete on first job if any
  const completeBtn = page.locator("button").filter({ hasText: /Complete|Completar/ });
  if (await completeBtn.count()) {
    await completeBtn.first().click();
    await page.waitForTimeout(600);
    // Set a file via input
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.count()) {
      const buf = Buffer.from(
        TINY_JPEG.split(",")[1],
        "base64",
      );
      await fileInput.setInputFiles({
        name: "pod.jpg",
        mimeType: "image/jpeg",
        buffer: buf,
      });
      await page.waitForTimeout(800);
    }
  }
  await shot(page, "driver-pod.png");

  // 4) Tracking with POD — create order + complete with photo via API if possible
  let orderId = null;
  try {
    const checkout = await page.request.post(BASE + "/api/checkout", {
      data: {
        deliveryAddress: "1234 Construction Way, Austin, TX",
        contactName: "Mike on site",
        contactEmail: "customer@dropzone.test",
        payMode: "demo",
        items: [
          {
            id: "demo-2x4",
            name: "2x4 Stud",
            qty: 1,
            price: 3.48,
            sku: "LW-2x4",
          },
        ],
      },
    });
    const cj = await checkout.json();
    orderId = cj.order?.id || null;
    console.log("order", orderId);
  } catch (e) {
    console.log("checkout fail", e);
  }

  if (orderId) {
    // Try mark delivered with POD via API (may fail without driver auth / assignment)
    await page.request
      .patch(BASE + "/api/drivers/jobs", {
        data: {
          orderId,
          action: "complete",
          podPhotoDataUrl: TINY_JPEG,
          podFileName: "pod.jpg",
        },
        headers: { Authorization: "Bearer local-demo" },
      })
      .catch(() => null);

    await page.goto(`${BASE}/tracking?order=${orderId}`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await page.waitForSelector(".tracking, .status-steps", { timeout: 20000 });
    await page.waitForTimeout(1500);
    // Scroll to bottom where POD would appear if delivered
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(400);
  } else {
    await page.goto(BASE + "/tracking", {
      waitUntil: "networkidle",
      timeout: 60000,
    });
  }
  await shot(page, "tracking-pod.png");

  await browser.close();
  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

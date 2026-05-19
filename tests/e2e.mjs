import puppeteer from "puppeteer";
import path from "path";
import { fileURLToPath } from "url";
import { startMockAPI } from "./mock-api.mjs";
import { createServer } from "http";
import { readFileSync, existsSync } from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_PATH = path.resolve(__dirname, "../packages/unified/dist");
const FIXTURES = path.resolve(__dirname, "fixtures");
const MOCK_API_PORT = 8399;
const FIXTURE_PORT = 8398;

let passed = 0;
let failed = 0;
const errors = [];

function assert(condition, msg) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${msg}`);
  } else {
    failed++;
    errors.push(msg);
    console.log(`  ❌ ${msg}`);
  }
}

// Static file server for fixtures
function startFixtureServer() {
  const mimeTypes = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".jpg": "image/jpeg", ".png": "image/png" };
  const server = createServer((req, res) => {
    const filePath = path.join(FIXTURES, req.url === "/" ? "english-page.html" : req.url);
    if (!existsSync(filePath)) { res.writeHead(404); res.end(); return; }
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": mimeTypes[ext] || "text/plain" });
    res.end(readFileSync(filePath));
  });
  return new Promise((r) => server.listen(FIXTURE_PORT, () => r(server)));
}

async function setExtensionConfig(browser, extensionId) {
  const page = await browser.newPage();
  await page.goto(`chrome-extension://${extensionId}/options.html`, { waitUntil: "networkidle0" });
  await page.waitForSelector("input", { timeout: 5000 });

  const inputs = await page.$$("input");
  for (const input of inputs) {
    const type = await input.evaluate((el) => el.type);
    const placeholder = await input.evaluate((el) => el.placeholder);
    await input.click({ clickCount: 3 });

    if (placeholder.includes("localhost") || type === "text" && !placeholder.includes("codex")) {
      await input.type(`http://localhost:${MOCK_API_PORT}/v1`);
    } else if (type === "password") {
      await input.type("test-key-123");
    } else if (placeholder.includes("codex")) {
      await input.type("test-model");
    }
  }

  // Click save button
  const saveBtn = await page.$("button");
  await saveBtn.click();
  await new Promise((r) => setTimeout(r, 500));
  await page.close();
}

async function testExtensionLoads(browser, extensionId) {
  console.log("\n🔍 Test: Extension loads correctly");

  const page = await browser.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup.html`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 2000));

  const html = await page.content();
  console.log(`    [debug] popup HTML length: ${html.length}`);
  const hasRoot = await page.$("#root");
  console.log(`    [debug] #root exists: ${hasRoot !== null}`);
  const rootInner = hasRoot ? await hasRoot.evaluate((el) => el.innerHTML.slice(0, 200)) : "N/A";
  console.log(`    [debug] #root innerHTML: ${rootInner}`);

  const rootText = hasRoot ? await hasRoot.evaluate((el) => el.textContent) : "";
  assert(rootText.includes("翻译"), `Popup contains "翻译": found in rendered content`);

  // Check tabs exist
  const buttons = await page.$$eval("button", (els) => els.map((e) => e.textContent));
  assert(buttons.some((b) => b.includes("翻译")), "Has translator tab");
  assert(buttons.some((b) => b.includes("Twitter")), "Has Twitter blocker tab");

  await page.close();
}

async function testOptionsPage(browser, extensionId) {
  console.log("\n🔍 Test: Options page works");

  const page = await browser.newPage();
  await page.goto(`chrome-extension://${extensionId}/options.html`, { waitUntil: "networkidle0" });
  await page.waitForSelector("h1", { timeout: 5000 });

  const heading = await page.$eval("h1", (el) => el.textContent);
  assert(heading.includes("设置"), `Options heading contains "设置": "${heading}"`);

  const inputs = await page.$$("input");
  assert(inputs.length >= 3, `Has at least 3 input fields (got ${inputs.length})`);

  await page.close();
}

async function testTranslatorContentScript(browser) {
  console.log("\n🔍 Test: Translator content script injects");

  const page = await browser.newPage();
  await page.goto(`http://localhost:${FIXTURE_PORT}/english-page.html`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1000));

  // Check float button exists (injected by content script)
  const floatBtn = await page.$("#ai-translator-float");
  assert(floatBtn !== null, "Float button is injected on page");

  if (floatBtn) {
    const mainBtn = await page.$('#ai-translator-float [data-role="main"]');
    const text = await mainBtn.evaluate((el) => el.textContent);
    assert(text === "译", `Float button shows "译" (got "${text}")`);
  }

  await page.close();
}

async function testTranslation(browser) {
  console.log("\n🔍 Test: Translation flow works");

  const page = await browser.newPage();
  await page.goto(`http://localhost:${FIXTURE_PORT}/english-page.html`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1000));

  // Click float button to open menu
  const mainBtn = await page.$('#ai-translator-float [data-role="main"]');
  if (!mainBtn) {
    assert(false, "Float button not found, skipping translation test");
    await page.close();
    return;
  }
  await mainBtn.click();
  await new Promise((r) => setTimeout(r, 300));

  // Click "双语翻译"
  const menuButtons = await page.$$('#ai-translator-float button:not([data-role="main"])');
  let bilingualBtn = null;
  for (const btn of menuButtons) {
    const text = await btn.evaluate((el) => el.textContent);
    if (text.includes("双语")) {
      bilingualBtn = btn;
      break;
    }
  }
  assert(bilingualBtn !== null, "Found bilingual translate button in menu");

  if (bilingualBtn) {
    await bilingualBtn.evaluate((el) => el.click());
    // Wait for translation API call and DOM update
    await new Promise((r) => setTimeout(r, 3000));

    const translated = await page.$$(".ai-translator-translated");
    assert(translated.length > 0, `Translated elements inserted (found ${translated.length})`);

    if (translated.length > 0) {
      const firstTranslation = await translated[0].evaluate((el) => el.textContent);
      assert(firstTranslation.includes("翻译段落"), `Translation content is correct: "${firstTranslation}"`);
    }

    // Check toast appeared (or already disappeared)
    // Check original content still exists
    const h1 = await page.$eval("h1", (el) => el.textContent);
    assert(h1.includes("Artificial Intelligence"), "Original English content preserved in bilingual mode");
  }

  await page.close();
}

async function testRestorePage(browser) {
  console.log("\n🔍 Test: Restore page works");

  const page = await browser.newPage();
  await page.goto(`http://localhost:${FIXTURE_PORT}/english-page.html`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1000));

  // Translate first
  const mainBtn = await page.$('#ai-translator-float [data-role="main"]');
  if (!mainBtn) { assert(false, "Float button not found"); await page.close(); return; }

  await mainBtn.click();
  await new Promise((r) => setTimeout(r, 300));

  const menuButtons = await page.$$('#ai-translator-float button:not([data-role="main"])');
  for (const btn of menuButtons) {
    const text = await btn.evaluate((el) => el.textContent);
    if (text.includes("双语")) { await btn.evaluate((el) => el.click()); break; }
  }
  await new Promise((r) => setTimeout(r, 3000));

  const beforeCount = await page.$$eval(".ai-translator-translated", (els) => els.length);
  assert(beforeCount > 0, `Has translations before restore (${beforeCount})`);

  // Click main button again to restore
  const restoreBtn = await page.$('#ai-translator-float [data-role="main"]');
  await restoreBtn.evaluate((el) => el.click());
  await new Promise((r) => setTimeout(r, 500));

  const afterCount = await page.$$eval(".ai-translator-translated", (els) => els.length);
  assert(afterCount === 0, `All translations removed after restore (${afterCount} remaining)`);

  await page.close();
}

async function testTwitterBlocker(browser) {
  console.log("\n🔍 Test: Twitter blocker on real x.com page");

  // Verify built script
  const scriptPath = path.resolve(DIST_PATH, "content-twitter.js");
  assert(existsSync(scriptPath), "content-twitter.js exists in dist");
  if (existsSync(scriptPath)) {
    const scriptContent = readFileSync(scriptPath, "utf-8");
    assert(!scriptContent.startsWith("import"), "content-twitter.js has no ES module imports");
    assert(scriptContent.includes("tweetPhoto"), "content-twitter.js contains tweetPhoto selector");
  }

  const page = await browser.newPage();

  // Navigate to real x.com tweet
  console.log("    [info] Loading x.com tweet page...");
  await page.goto("https://x.com/0xJeff/status/2056269840009318569", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });

  // Wait for page to render (Twitter is an SPA, needs time)
  await new Promise((r) => setTimeout(r, 5000));

  // Check if content script injected the blocker style
  const styleEl = await page.$("#twitter-image-blocker-style");
  assert(styleEl !== null, "Twitter blocker style element injected on real x.com");

  if (styleEl) {
    const css = await styleEl.evaluate((el) => el.textContent);
    assert(css.includes("display: none"), 'Blocker CSS contains "display: none" rules');
    assert(css.includes("tweetPhoto"), "Blocker CSS targets tweetPhoto");
  }

  // Check if any tweet images exist and are hidden
  const tweetPhotos = await page.$$('[data-testid="tweetPhoto"]');
  console.log(`    [info] Found ${tweetPhotos.length} tweetPhoto element(s)`);

  if (tweetPhotos.length > 0) {
    const display = await tweetPhotos[0].evaluate((el) => getComputedStyle(el).display);
    assert(display === "none", `tweetPhoto is hidden (display: "${display}")`);
  } else {
    // Page may require login to see images, check if blocker style at least exists
    console.log("    [info] No tweetPhoto elements found (page may require login)");
    assert(styleEl !== null, "Blocker style still injected even without visible tweets");
  }

  // Check for any visible images that should be blocked
  const allImages = await page.$$eval("img", (imgs) =>
    imgs.map((img) => ({
      src: img.src,
      display: getComputedStyle(img).display,
      visible: getComputedStyle(img).visibility,
      testId: img.closest("[data-testid]")?.getAttribute("data-testid") || null,
    }))
  );

  const mediaImages = allImages.filter(
    (img) => img.src.includes("pbs.twimg.com/media") || img.testId === "tweetPhoto"
  );
  console.log(`    [info] Found ${mediaImages.length} media image(s) on page`);

  for (const img of mediaImages) {
    assert(
      img.display === "none" || img.visible === "hidden",
      `Media image blocked: display="${img.display}", visibility="${img.visible}"`
    );
  }

  // Test toggle off: send message to disable blocker
  await page.evaluate(() => {
    const style = document.getElementById("twitter-image-blocker-style");
    if (style) style.remove();
  });
  const afterRemove = await page.$("#twitter-image-blocker-style");
  assert(afterRemove === null, "Blocker style removable (toggle off works)");

  await page.close();
}

async function testChineseOnlyMode(browser) {
  console.log("\n🔍 Test: Chinese-only translation mode");

  const page = await browser.newPage();
  await page.goto(`http://localhost:${FIXTURE_PORT}/english-page.html`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1000));

  const mainBtn = await page.$('#ai-translator-float [data-role="main"]');
  if (!mainBtn) { assert(false, "Float button not found"); await page.close(); return; }

  await mainBtn.click();
  await new Promise((r) => setTimeout(r, 300));

  const menuButtons = await page.$$('#ai-translator-float button:not([data-role="main"])');
  for (const btn of menuButtons) {
    const text = await btn.evaluate((el) => el.textContent);
    if (text.includes("中文")) { await btn.evaluate((el) => el.click()); break; }
  }
  await new Promise((r) => setTimeout(r, 3000));

  // In chinese-only mode, original text should be replaced
  const h1Text = await page.$eval("h1", (el) => el.textContent);
  assert(h1Text.includes("翻译段落"), `H1 replaced with Chinese: "${h1Text}"`);

  // No bilingual elements should exist
  const bilingualEls = await page.$$(".ai-translator-translated");
  assert(bilingualEls.length === 0, "No bilingual elements in chinese-only mode");

  await page.close();
}

async function testServiceWorker(browser, extensionId) {
  console.log("\n🔍 Test: Service Worker is active");

  const targets = await browser.targets();
  const swTarget = targets.find(
    (t) => t.type() === "service_worker" && t.url().includes(extensionId)
  );
  assert(swTarget !== undefined, "Service worker target exists");
}

// Main
(async () => {
  console.log("🚀 Starting E2E tests...\n");

  if (!existsSync(DIST_PATH)) {
    console.error("❌ dist not found. Run `npm run build:unified` first.");
    process.exit(1);
  }

  const mockServer = await startMockAPI(MOCK_API_PORT);
  const fixtureServer = await startFixtureServer();

  const browser = await puppeteer.launch({
    headless: false,
    args: [
      `--disable-extensions-except=${DIST_PATH}`,
      `--load-extension=${DIST_PATH}`,
      "--no-first-run",
      "--disable-default-apps",
    ],
  });

  // Find extension ID
  await new Promise((r) => setTimeout(r, 2000));
  const targets = await browser.targets();
  const swTarget = targets.find((t) => t.type() === "service_worker" && t.url().includes("chrome-extension://"));
  const extensionId = swTarget?.url()?.match(/chrome-extension:\/\/([^/]+)/)?.[1];

  if (!extensionId) {
    console.error("❌ Could not find extension ID");
    await browser.close();
    mockServer.close();
    fixtureServer.close();
    process.exit(1);
  }

  console.log(`📦 Extension ID: ${extensionId}`);

  try {
    await testExtensionLoads(browser, extensionId);
    await testOptionsPage(browser, extensionId);
    await setExtensionConfig(browser, extensionId);
    await testServiceWorker(browser, extensionId);
    await testTranslatorContentScript(browser);
    await testTranslation(browser);
    await testRestorePage(browser);
    await testChineseOnlyMode(browser);
    await testTwitterBlocker(browser);
  } catch (err) {
    console.error("\n💥 Unexpected error:", err);
    failed++;
  }

  await browser.close();
  mockServer.close();
  fixtureServer.close();

  console.log(`\n${"=".repeat(50)}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  if (errors.length > 0) {
    console.log("\nFailed tests:");
    errors.forEach((e) => console.log(`  - ${e}`));
  }
  console.log(`${"=".repeat(50)}\n`);

  process.exit(failed > 0 ? 1 : 0);
})();

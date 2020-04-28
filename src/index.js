const fs = require("fs");
const https = require("https");
const puppeteer = require("puppeteer");
const notifier = require("node-notifier");

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto(
    "https://www.esselungaacasa.it/ecommerce/nav/welcome/index.html"
  );

  const login = await page.$('[aria-label="Accedi come utente registrato"]');
  await login.click();

  await page.waitForNavigation({ waitUntil: "load" });

  await page.type("#gw_username", process.env.EMAIL);
  await page.type("#gw_password", process.env.PASSW);

  await page.click('button[type="submit"]');

  await page.waitForNavigation({ waitUntil: "networkidle0" });

  await page.waitForSelector(".delivery-label");

  await page.on("response", async (response) => {
    if (
      response.url() ==
      "https://www.esselungaacasa.it/ecommerce/resources/auth/slot/status"
    ) {
      response.json().then(function (data) {
        fs.writeFileSync("availability.json", JSON.stringify(data));

        const availables = data.slots.filter(
          (slot) => slot.viewStatus !== "ESAURITA"
        ).length;

        if (availables) {
          https.get(
            `https://maker.ifttt.com/trigger/availability/with/key/${process.env.IFTTT}`
          );
          notifier.notify(`🛒✅ Esselunga: ${availables} slots availables`);
        } else {
          notifier.notify(`🛒❌ Esselunga: No slots availables`);
        }
      });
    }
  });

  const delivery = await page.$('[aria-labelledby="deliveryTabPanelLabel"]');
  await delivery.click();

  await page.waitForSelector('[aria-label^="Fascia oraria dalle"]');

  await browser.close();
})();

const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

const isProduction = process.env.NODE_ENV === "production";
const mockPng = fs
	.readFileSync(path.join(__dirname, "mock.png"))
	.toString("base64");
(async () => {
	const browser = isProduction
		? await puppeteer.connect({ browserWSEndpoint: "ws://127.0.0.1:3000" })
		: await puppeteer.launch({
				devtools: true,
				headless: false,
		  });
	const page = await browser.newPage();
	await Promise.all([
		page._client.send("Console.disable"),
		page._client.send("Page.setBypassCSP", { enabled: true }),
	]);
	await page._client.send("Network.setBlockedURLs", {
		urls: ["ga-audiences"],
	});

	await page._client.send("Fetch.enable", {
		patterns: [
			{
				resourceType: "Image",
				requestStage: "Request",
			},
		],
	});
	page._client.on("Fetch.requestPaused", async (e) => {
		page._client.send("Fetch.fulfillRequest", {
			requestId: e.requestId,
			responseCode: 200,
			body: mockPng,
		});
	});

	await page.goto("https://www.trendyol.com", { waitUntil: "networkidle2" });
	const pageContents = await page.content();
	if (isProduction) await browser.disconnect();
	console.log(pageContents);
})();

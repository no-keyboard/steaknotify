const discord = require('discord.js');
const bot = new discord.Client();
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const discordApi = process.env.DISCORD_API;
const channel = process.env.CHANNEL;
const errorLog = process.env.ERROR_CHANNEL;
const tagUser = process.env.TAG_USER;
const url = process.env.URL;
const urlList = url.split(";");
const storesToCheck = ["Brooklyn, NY", "Long Island, NY"];

const createEmbed = (name, url, stores) => {
	const inventoryFields = []

	stores.forEach(el => {
		inventoryFields.push({
			name: el.store,
			value: el.inventory,
			inline: true
		});
	});

	return {
		embed: {
			title: name,
			url,
			fields: inventoryFields,
			timestamp: new Date()
		}
	}
}

const urlListEmbed = urls => {
	let fields = [];

	urlList.forEach((url, i) => {
		fields.push({
			name: `URL ${i + 1}`,
			value: url
		});
	});

	return fields;
}

bot.login(discordApi);
bot.on('ready', () => {
	console.info("Logged into Discord!");
	bot.channels.cache.get(channel).send({
		embed: {
			title: "Checking pages!",
			fields: urlListEmbed(urlList),
			timestamp: new Date()
		}
	});
});

puppeteer.launch({
	args: ['--no-sandbox'],
	headless: true,
	// executablePath: 'chromium-browser'
})
.then(async browser => {
	const page = await browser.newPage();

	for(let url of urlList) {
		try {
			await page.goto(url);
			await page.waitForSelector("a.range-revamp-stockcheck__available-for-delivery-link");

			await page.evaluate(() => {
				const storeListOpen = Array.from(document.querySelectorAll('a')).find(el => el.innerText === "Check in-store stock");
				storeListOpen.click();
			});

			await page.waitForSelector("div.range-revamp-header-section__title--big");
			await page.waitForSelector("span.range-revamp-header-section__description-text");
			await page.waitForSelector("div.range-revamp-change-store__stores");

			result = await page.evaluate(storesToCheck => {
				const productTitle = document.querySelector("div.range-revamp-header-section__title--big").innerText;
				const productDesc = document.querySelector("span.range-revamp-header-section__description-text").innerText;
				const productMeasure = document.querySelector("span.range-revamp-header-section__description-measurement").innerText;
				const product = {
					product: productTitle.concat(" ", productDesc, ", ", productMeasure),
					url: window.location.href,
					stores: []
				}
				let storesChecked = [];
				const storeList = document.querySelector("div.range-revamp-change-store__stores").children;

				for(store of storeList) {
					const storeName = store.querySelector("div.range-revamp-change-store__store-info").innerText;
					const storeInventory = store.querySelector("span.range-revamp-stockcheck__store-text").innerText;
				
					if(storesToCheck.includes(storeName)) {
						product.stores.push({
							store: storeName,
							inventory: storeInventory
						});
					}

					if(storesChecked.length === storesToCheck.length) {
						break;
					}
				}

				return product;
			}, storesToCheck);

			// console.log(result);

			for(let store of result.stores) {
				if(store.inventory != "Out of stock") {
					bot.channels.cache.get(channel).send(createEmbed(result.product, result.url, result.stores));
					break;
				}
			}
		} catch(err) {
			bot.channels.cache.get(errorLog).send(err);
		}
	}

	await browser.close();
});

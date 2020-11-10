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

bot.login(discordApi);
bot.on('ready', () => {
	console.info("Logged into Discord!");
});

puppeteer.launch({
	args: ['--no-sandbox'],
	headless: true,
	// executablePath: 'chromium-browser'
})
.then(async browser => {
	const page = await browser.newPage();
	
	urlList.forEach(url => async () => {
		try {
			await page.goto(url);
			await page.waitForTimeout("div.js-stockcheck-section");
			await page.evaluate(() => {
				const storeListOpen = Array.from(document.querySelectorAll('a')).find(el => el.innerText === "Check another IKEA store");
				storeListOpen.click();
			}

			await page.waitForTimeout("range-revamp-change-store");

			result = await page.evaluate(() => {
				const storesToCheck = ["Brooklyn, NY", "Long Island, NY"];
				let storesChecked = [];
				const storeList = document.querySelector("div.range-revamp-change-store__stores").children;

				for(store of storeList) {
					const storeName = store.querySelector("div.range-revamp-change-store__store-info").innerText;
					const storeInventory = store.querySelector("span.range-revamp-stockcheck__store-text").innerText;
				
					if(storesToCheck.includes(storeName)) {
						storesChecked.push({
							store: storeName,
							inventory: storeInventory
						});
					}

					if(storesChecked.length === storesToCheck.length) {
						break;
					}
				}

				return storesChecked;
			});

			console.log(result);

			// if(!stockLabels.includes(result)) {
			// 	console.info(result)
			// 	bot.channels.cache.get(channel).send(`<@${tagUser}>, ${result}`);
			// } else {
			// 	console.info(result)
			// 	bot.channels.cache.get(channel).send(result);
			// }
		} catch(err) {
			bot.channels.cache.get(errorLog).send(err);
		}
	});
	
	await browser.close();
});

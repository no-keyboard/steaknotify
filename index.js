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

const createEmbed = (name, url) => {
	return {
		embed: {
			title: name,
			url,
			timestamp: new Date()
		}
	}
}

bot.login(discordApi);
bot.on('ready', () => {
	console.info("Logged into Discord!");
	// bot.channels.cache.get(channel).send({
	// 	embed: {
	// 		title: "Checking pages!",
	// 		fields: urlListEmbed(urlList),
	// 		timestamp: new Date()
	// 	}
	// });
});

puppeteer.launch({
	args: ['--no-sandbox'],
	headless: true,
	// executablePath: 'chromium-browser'
})
.then(async browser => {
	const page = await browser.newPage();
	const context = browser.defaultBrowserContext();
	await context.overridePermissions(url, ['geolocation'])
	await page.setGeolocation({latitude: 41.308273, longitude: -72.927879})

	try {
		console.log(`Going to ${url}`);
		await page.goto(url);
		console.log(`Successfully navigated to ${url}`);
		await page.waitForSelector("div.reservations-container");
		await page.waitForSelector("#js-location");

		result = await page.evaluate(() => {
			const locations = document.querySelector("#js-location").options;
			let locationFound = false;

			for(location of locations) {
				console.log(location.dataset.address);
				if(location.dataset.address.includes("11373")) {
					locationFound = true;
					break;
				}
			}

			return locationFound;
		});

		console.log(result);

		if(result) {
			bot.channels.cache.get(channel).send(createEmbed(`Restaurant found!`, url));
			break;
		}
	} catch(err) {
		console.error(err);
		// bot.channels.cache.get(errorLog).send(err);
	}

	await browser.close();
});

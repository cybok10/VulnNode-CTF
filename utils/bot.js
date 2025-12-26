const puppeteer = require('puppeteer');
const secrets = require('../config/secrets');

const visitUrl = async (url) => {
    console.log(`[Bot] Visiting URL: ${url}`);
    let browser;
    try {
        browser = await puppeteer.launch({
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--ignore-certificate-errors'
            ],
            headless: 'new'
        });

        const page = await browser.newPage();

        // 1. Simulate Admin Login (Set the Flag as a Cookie)
        await page.setCookie({
            name: 'flag',
            value: secrets.flagXSS,
            domain: 'localhost',
            path: '/',
            httpOnly: false // Vulnerability: Allow JS to read this cookie
        });

        // 2. Set the Admin Session Token (for Broken Access Control exploits)
        await page.setCookie({
            name: 'session',
            value: secrets.adminToken,
            domain: 'localhost',
            path: '/',
            httpOnly: true
        });

        // 3. Visit the attacker's URL
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 5000
        });

        console.log(`[Bot] Successfully visited ${url}`);

    } catch (e) {
        console.error(`[Bot] Error visiting ${url}:`, e.message);
    } finally {
        if (browser) await browser.close();
    }
};

module.exports = { visitUrl };
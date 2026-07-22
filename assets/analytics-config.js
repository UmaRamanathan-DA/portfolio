/**
 * GoatCounter analytics — privacy-friendly page views (no login, no cookies).
 *
 * Setup (one-time):
 * 1. Create a free site at https://www.goatcounter.com
 * 2. Set goatcounterCode below to your site code (e.g. "umaramanathan"
 *    → https://umaramanathan.goatcounter.com)
 * 3. In GoatCounter: Settings → Sites → enable
 *    "Allow adding visitor counts on your website"
 * 4. Settings → Tracking → Ignore IPs: add your home/office IP
 * 5. On your live site, open once with #toggle-goatcounter in the URL
 *    (e.g. …/portfolio/#toggle-goatcounter) to block this browser
 *
 * Localhost / private networks are ignored by GoatCounter by default.
 */
window.PORTFOLIO_ANALYTICS = {
  // Required: your GoatCounter site code (subdomain)
  goatcounterCode: "",

  // Show a quiet “N views” line at the bottom of each page
  showViewCount: true,

  // Only send hits from these hosts (GitHub Pages). Edit if you add a custom domain.
  productionHosts: ["umaramanathan-da.github.io"],
};

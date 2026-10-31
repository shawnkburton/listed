# Listed

Responsive real-estate discovery prototype with a dark home feed, filters, saved homes, local browsing preferences a rule-based virtual-agent demo, and Firebase Authentication. Google and Microsoft sign-in are configured; Apple needs its provider registration. See [authentication setup](AUTHENTICATION.md).

- `index.html`: desktop and mobile website.
- `mobile-preview.html`: interactive phone-frame preview.
- Flyover: each home's detail view has a Flyover button that flies a satellite map in to the home, circles it, then hands control to the viewer on first input. Home coordinates are stored in the listing data.
- Drive-by: each home's detail view also has a Drive-by button that drives Google Street View along the street past the home, facing it as it passes, then hands control to the viewer on first input. It needs a Google Maps API key pasted into GOOGLE_MAPS_API_KEY in index.html (Google Cloud Console → Maps JavaScript API, with billing enabled); without one the dialog explains what is needed instead of loading.
- Listing snapshot: September 25, 2026.

Property facts and linked photos are attributed to REALTOR.ca, Victoria Real Estate Board and the listing brokerages. Assessed values and recent-sale records come from BC Assessment. Annual property taxes are listing-reported, not municipal tax bills. Source differences are identified in the property details.

This is a prototype, not a live listing service, native app, or live AI agent. Photos require internet access. Browsing preferences and saved homes are stored locally in the browser.

Third-party photos and data retain their original rights. This repository grants no license to reuse that content. Commercial use requires appropriate listing/photo permissions and BC Assessment authorization.

To publish with GitHub Pages, select Settings → Pages → Deploy from a branch → main → / (root).

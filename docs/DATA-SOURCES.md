# Crescent Road listing snapshot

Collected September 28, 2026. This is a local research snapshot, not licensed live inventory.

- Origin: 1920 Crescent Rd, Oak Bay, BC; BC Address Geocoder civic-number match (score 98; Victoria is an alias), latitude 48.4118258, longitude -123.3257722.
- Survey: all 29 cards in [Gonzales, Victoria](https://www.realtor.ca/bc/victoria/gonzales/real-estate), plus all 111 cards in [Oak Bay](https://www.realtor.ca/bc/oak-bay/real-estate), across 14 result pages. 65 surrounding non-unit house candidates were geocoded; the 20 closest all had their detail pages checked and Building Type = House. This is nearest among the surveyed candidates, not a guarantee of every available listing. Strata houses are included. Apartments, townhomes, vacant land and unit-address entries were not house candidates. The manor at 515 Foul Bay is classified House but is a multi-residence restoration project; the UI identifies this.
- Distance: haversine straight-line distance between civic geocoder coordinates, rounded to metres. Selected homes span 233–631 m. No driving/walking time is inferred. [BC Address Geocoder](https://www2.gov.bc.ca/gov/content/data/geographic-data-services/location-services/geocoder).
- REALTOR.ca: asking price, beds/baths, area, title, construction year, lot, annual taxes, listing age at collection, brokerage, MLS identifier, rooms/spaces, and five actual listing photo URLs per home. Every record retains its detail URL and observed date. Descriptions are original concise summaries. Styles and tags are editorial interpretations.
- BC Assessment: all 20 records matched by civic address, retaining parcel ID, property URL, 2026 total/land/building values (valuation date July 1, 2025), prior-year value where shown, construction year, beds/baths and land description. Floor areas are retained separately and are not treated as equivalent to MLS finished area.
- Sales: the source's last-three-full-calendar-years section only. 342 Foul Bay shows May 17, 2023 at C$1,453,000; the other captured records show no sales within that coverage. That is not a claim that they never sold. Older sale history is not invented or copied from stale legacy records.
- Tax year: not displayed in these listing summaries, stored as null and shown as unstated. Annual taxes are listing-supplied, not independently verified municipal bills.
- Rooms: counts include bathrooms, storage and outdoor spaces, as labeled. Dimensions were not captured in the initial rendered data for most rows; the UI says so rather than inventing them.
- Exception: 30 Beach Drive's asking price includes 40 Beach Drive, whereas its matched assessment is only for 30 Beach. Percentage comparison is suppressed. Combined assessment is not known.
- Missing prior assessment at 515 Foul Bay is null, never zero. Disagreements in year/bed/bath counts are preserved and highlighted.

`lib/nearby-properties.json` is the normalized app dataset. The local `work/real-properties` research directory outside the app retains source captures, geocoding responses, candidate inventory and a repeatable normalization script for inspection; raw listing prose is not shipped in the application.

## Rights and freshness

Images are remotely referenced with REALTOR.ca and brokerage attribution; there is no implied image license. BC Assessment's public site states that commercial use requires prior written authority. Obtain appropriate listing/photo and assessment rights before publishing or operating a marketplace. Neither direct site access nor public visibility supplies redistribution rights. This work made no paid purchases and published no data externally.

OSM tiles are loaded on demand with visible attribution and normal browser caching, without prefetching or offline bulk downloads. Follow the [tile policy](https://operations.osmfoundation.org/policies/tiles/) and choose suitable map hosting for production traffic.

A production feed needs licensed refresh/withdrawal handling, status timestamps, provenance per field and an authoritative geographic query. A stale snapshot must never be advertised as current availability.

### Optional seller-form assessment import

The seller may paste an individual assessment record for a new address and review extracted bedrooms, baths, year built and explicit lot area. This import is not limited to the 20 research homes. It runs locally without requesting a third-party service or retaining the pasted text. Assessed value is informational and never sets asking price. The server sanitizes the saved `assessmentImport` reference and marks its meaning as seller-provided; it does not accept client-supplied verified assessment objects.

Automatic address lookup is deferred as a nice-to-have. Public assessment search is available, but its commercial-reuse notice requires prior written authorization. A paid API is not established as the only option; investigate an authorized integration or licensed extract before implementing province-wide automatic prefill. Official sources: [Assessment Search](https://www.bcassessment.ca/Property/AssessmentSearch), [business data options](https://info.bcassessment.ca/services-and-products/Pages/Data-For-Business.aspx).


### Neighbourhood research (September 30, 2026)

The first seller-agent research pack covers Gonzales. Descriptions are short original paraphrases of public area information; park views are not presented as home views. Sources:

- CRD Gonzales Hill Regional Park: https://www.crd.ca/parks-recreation/find-park-or-trail/gonzales-hill-regional-park
- Destination Greater Victoria Gonzales Beach: https://www.tourismvictoria.com/things-to-do/beaches-lakes/gonzales-beach

Research is versioned in lib/neighbourhood.ts. The app does not run a live search or verify seller edits. It does not infer school catchments, journey times, safety claims, property views, or waterfront status. Sellers approve text and location applicability before adding it to their listing. Broader automatic research will need a configured retrieval service and address-to-neighbourhood resolution.

# Listed authentication

Firebase project: `dwell-d6c55` (Spark plan). The website uses Firebase's modular JavaScript SDK 12.19.0 and Google/Microsoft OAuth popup sign-in. The public Firebase web configuration is embedded in `index.html` in `auth-config`.

Google and Microsoft are enabled. Apple has client integration code but remains disabled until its provider registration is configured. No OAuth client secret, Apple private key, service-account key, or user token belongs in this repository.

## Provider setup still needed

### Microsoft — configured

- App display name: Listed.
- Application (client) ID: `4abd304e-688f-436b-930d-77e65e971c17`.
- Account types: personal Microsoft accounts and organizational accounts. Organizations may require administrator approval because the publisher is not verified.
- Web redirect URI: `https://dwell-d6c55.firebaseapp.com/__/auth/handler`.
- The secret is stored only in Firebase Authentication, never in the website or repository.
- The current secret expires **March 26, 2027**. Before expiry, create a replacement in Microsoft Entra and update the Microsoft provider in Firebase Authentication. Verify sign-in before retiring the previous credential.
- Entra Free and Firebase Spark remain selected; no paid upgrade or content storage was enabled. Free-tier quotas still apply.
- Only the basic sign-in profile is requested; there are no mail, calendar, or file scopes.

[Microsoft-provider documentation](https://firebase.google.com/docs/auth/web/microsoft-oauth)

### Apple

An Apple Developer Program membership and Sign in with Apple configuration are required. Configure the primary App ID, web Services ID, domain `dwell-d6c55.firebaseapp.com`, and return URL:

`https://dwell-d6c55.firebaseapp.com/__/auth/handler`

Supply the Services ID, Apple Team ID, key ID and private key in the Firebase Apple provider configuration, following Apple's requirements. Keep the private key out of this repository. Enable the provider, set `providers.apple` to `true`, and test the flow, including Hide My Email.

[Official Apple-provider setup](https://firebase.google.com/docs/auth/web/apple)

## Behavior and limits

- GitHub Pages domain `shawnkburton.github.io` is authorized in Firebase. `localhost` is also authorized for development.
- Firebase manages session persistence. Only Firebase auth-state callbacks change the signed-in UI.
- Favorites, criteria and browsing history remain in browser storage, separated by Firebase user ID. Guest data stays separate. There is no cloud sync or private listing API.
- Clearing site data removes local favorites/history. Signing out restores the guest's local list.
- The phone-frame preview directs sign-in to the full website. Use Safari, Chrome, or another supported browser with pop-ups enabled.
- If private data is added later, protect it with server-side authorization or Firebase security rules. Hiding controls in this static page is not authorization.
- Full end-to-end provider sign-in must be verified with a real account before treating this as a production authentication system.

## Verification

Local checks covered guest/account separation, switching accounts, restoring guest data on sign-out, rendering names as text, and rejecting malformed saved preferences. The mobile account dialog was reviewed at 390px. Firebase configuration and SDK initialization were checked in the browser.

## Next.js marketplace integration (September 28, 2026)

The new app uses the same Firebase project and SDK version through `lib/auth.ts` and `components/Account.tsx`. Google and Microsoft are enabled in the client. Apple remains disabled, reflecting the original provider configuration. Set `NEXT_PUBLIC_APPLE_AUTH_ENABLED=true` only after completing the Apple configuration above, then rebuild.

Facebook is implemented with Firebase's `FacebookAuthProvider` but disabled pending a Meta app registration. Add Facebook Login to the Meta app, register `https://dwell-d6c55.firebaseapp.com/__/auth/handler`, and enter the app ID and secret in the Firebase Facebook provider (never in this repository). Configure the required privacy/data-deletion information and complete Meta's applicable review/live-mode requirements before general use. Set `NEXT_PUBLIC_FACEBOOK_AUTH_ENABLED=true` and rebuild only after provider setup. No paid authentication intermediary or subscription was added.

The original Spark plan remains unchanged. [Firebase pricing](https://firebase.google.com/pricing) includes no-cost non-phone authentication; Identity Platform has separate quotas. [Facebook provider setup](https://firebase.google.com/docs/auth/web/facebook-login). Apple's setup requires its Developer Program; [Apple lists US$99/year, with local pricing at enrollment](https://developer.apple.com/programs/enroll/). No membership was purchased.

Instagram is intentionally not a buyer login button. [Meta's official Instagram documentation](https://www.postman.com/meta/instagram/folder/6raa77c/instagram-api-with-instagram-login) limits this API to professional business/creator accounts. It may fit a later optional seller marketing connection, not general consumer identity.

Local preview: use `http://localhost:3000`, which the original project documents as authorized. `127.0.0.1` is not assumed authorized. Other deployment domains must be registered in Firebase. Embedded browsers may not support OAuth popups fully; use a supported system browser for real-account testing.

New storage namespace: `listed-marketplace:v1:guest` or `listed-marketplace:v1:user:<encoded UID>`. Identity changes remount the marketplace and load only the matching store. Legacy `dwell-v1` favourites are not migrated. This is local separation, not server authorization. Firebase manages its auth session; the app does not log tokens, store OAuth credentials itself, or infer login from button clicks. Only `onAuthStateChanged` changes the account UI.

Verification: 35 automated checks, production build, sign-in dialog rendering and cancellation recovery checked. The user confirmed Microsoft sign-in works in the MVP on September 28, 2026. Google login, Apple Hide My Email, and Facebook login remain real-account acceptance checks. Microsoft sign-out/session restoration and cross-device data synchronization are not established by this sign-in confirmation.

Seller/contact APIs now verify Firebase credentials server-side and enforce owner/participant access. See [seller/contact storage](docs/SELLER-AND-CONTACT.md). The browser-storage paragraph above applies to buyer preferences and engagement, not private server resources. No test identity bypass is shipped.

Seller phone verification is deferred until hosting setup, per the user's September 28, 2026 request. It is not required by the current local app. See the [hosting and launch checklist](docs/LAUNCH-CHECKLIST.md) for the planned SMS verification requirement before publishing and the provider setup/testing work.


### Microsoft profile changes

Listed synchronizes the name returned by Microsoft after each Microsoft sign-in. Existing sessions can use **Account → Refresh profile from Microsoft** (the account button displays the user's first name). This reauthenticates the same account and updates Firebase's display name; it does not create another account. Microsoft changes are not pushed into an existing Listed session automatically, and Microsoft may take time to return recent changes. Missing name fields never erase an existing name. Authenticated marketplace reads/writes refresh existing seller and conversation labels while preserving account IDs and ownership.


### Direct provider profile refresh follow-up

After the user reported that the previous name refresh still returned a cached name, the Microsoft flow was changed to read `https://graph.microsoft.com/v1.0/me?$select=displayName` with a freshly issued provider access token and delegated `User.Read`. Explicit refresh uses `prompt=login` and reauthenticates the existing account. An optional `/me/photos/96x96/$value` read supplies a small avatar; missing photos do not prevent name refresh. Tokens are not stored or logged, redirected token requests are rejected, and lookup failure keeps the current profile with an explicit message. Only available HTTPS photos are synced to Firebase; Microsoft binary photos are cached privately per account in this browser. UI messaging shows the name actually returned. Live Microsoft name-change behavior is pending user validation; do not claim Microsoft propagation delays or cached values are resolved without that check.

Google, Apple and Facebook profile normalization also runs after sign-in/refresh. Apple and Facebook remain disabled until activated. Email comes from Firebase's authenticated user rather than raw profile data. Name/photo fields omitted by the provider do not erase an existing account name. The previous focus-triggered Firebase reload was removed to avoid racing a profile update; auth token changes and explicit completed refreshes update the UI.

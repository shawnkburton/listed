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

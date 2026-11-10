# Hosting and launch checklist

## Deferred seller phone verification

Requested September 28, 2026. Revisit when preparing the GitHub/hosting release. This is deferred work, not an enabled requirement in the local preview.

- [ ] Require sellers to verify a private phone number with an SMS code before publishing. Allow creating and saving drafts before verification.
- [ ] Associate verification with the seller's existing account; do not create a separate account or require a new code for every listing. Keep phone numbers out of public listings and buyer-facing responses.
- [ ] Enforce verified status on the server before publishing, using trusted identity-provider data rather than a browser-supplied flag. Define the transition for existing published listings before activation.
- [ ] Configure Firebase phone authentication, an authorized hosted domain, SMS destination restrictions, consent wording, and abuse controls. Review current SMS costs and obtain approval before activating paid services.
- [ ] Test delivery and code verification on real phones, incorrect/expired codes, resends, account linking, draft preservation, and attempts to publish without verification.

Uploading source code to GitHub alone does not provide the hosted application this needs. Choose hosting that supports the app's server routes and durable private data/media storage; GitHub Pages alone cannot run the current server. Firebase's phone-auth documentation currently excludes localhost as a hosted domain; recheck requirements during deployment: https://firebase.google.com/docs/auth/web/phone-auth.

Phone verification confirms access to the number. Property ownership/authority verification remains a separate item.

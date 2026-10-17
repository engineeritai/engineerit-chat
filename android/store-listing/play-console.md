# What to click in Play Console

Account: personal developer account "engineer it". App package: ai.engineerit.app.

1. Open the app in Play Console.
2. Test and release > Internal testing > Create new release.
3. Upload the Android App Bundle `engineerit-1.0.0.aab`. App signing: let Play App Signing hold the app signing key. The file you upload is signed with the upload key only.
4. Release name: 1.0.0. Add a short note that this is the Trusted Web Activity for https://engineerit.ai.
5. Save, review, and roll out the internal release.
6. Internal testing > Testers. Create an email list and add the testers. Copy the opt-in link.
7. Grow > Store presence > Main store listing. Paste the English name, short description, and full description from `en.md`. Upload the 512 icon, the 1024x500 feature graphic, and the English phone screenshots.
8. Store presence > Custom store listings or the Arabic translation: add Arabic from `ar.md`. The app name stays "engineer it". Upload the Arabic phone screenshots.
9. Policy > App content > Privacy policy. URL: https://engineerit.ai/legal/privacy
10. Policy > App content > Data safety. Use `data-safety.md`.
11. Policy > App content > Content rating. Fill the questionnaire from `content-rating.md` and submit it.
12. After the first upload, open Test and release > App integrity > App signing. Copy the App signing key certificate SHA-256. Add it to `public/.well-known/assetlinks.json` next to the upload-key fingerprint, deploy, and confirm https://engineerit.ai/.well-known/assetlinks.json still returns application/json. Until that fingerprint is listed, the app can show the browser URL bar.

The upload keystore and its password are not in git.

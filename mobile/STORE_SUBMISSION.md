# Store submission — engineerit AI

App id `ai.engineerit.app`. Display name **engineerit AI**. The binary is a native shell around https://engineerit.ai. This file is the listing, the screenshot list, the privacy and data-safety answers, and the accounts and secrets the owner has to provide. Nothing in here is a committed secret.

Support email already used on the site: info@engineerit.ai. Privacy URL: https://engineerit.ai/legal/privacy. Marketing URL: https://engineerit.ai.

## App Store Guideline 3.1

Apple’s [Guideline 3.1.1](https://developer.apple.com/app-store/review/guidelines/#payments) says digital subscriptions sold inside an iOS app must use In-App Purchase. engineerit.ai sells Engineer, Professional, and Consultant plans on the web through Moyasar. Shipping those buy buttons, prices, or a Moyasar checkout inside the iOS binary is a rejection risk.

**What this iOS build does**

- Sign-in, registration, and use of an account that already has a plan stay in the app.
- Links and buttons whose job is to sell a plan (`/pricing`, `/subscription`, Upgrade, Subscribe, View pricing, View plans & subscribe) are hidden.
- Plan cards and marketing price lines are hidden.
- Navigation to `moyasar.com` or `paddle.com` is cancelled. The in-app browser is not opened for a purchase.
- A notice says the iOS app is for an existing account and that subscriptions are not sold in the app. It has no “buy on the web” button and no URL.

That is the reader-style shape (sign in, then use what you already paid for on the web). It matches the narrow reader pattern in Guideline 3.1.3(a): no purchase button and no external purchase link.

**The risk that remains**

3.1.3(a) is written for magazines, newspapers, books, audio, music, and video. An engineering assistant is not in that list. A reviewer can still reject the app under 3.1.1 even with the purchase UI removed, or under 4.2 if they treat the shell as a website wrapper.

If Apple rejects it, the compliant paths are:

1. Sell the same digital plans with Apple In-App Purchase, and keep Moyasar on the website only.
2. Use the multiplatform rule in 3.1.3(b): people who bought on the web can sign in, and the same plans are also available as In-App Purchases.
3. Where Apple has granted an external-purchase entitlement (some storefronts only), follow that entitlement’s rules. Do not add a checkout link until the entitlement is approved.

Do not submit the iOS screenshots or the review build with prices, “Upgrade”, or “Subscribe” visible.

Android opens Moyasar in Chrome Custom Tabs because this project keeps payments on the web. Google Play’s payments policy can still require Play Billing for digital plans. If Play rejects the Custom Tab checkout, hide the purchase UI on Android the same way iOS already does, or add Play Billing. Card numbers never enter the native code.

## Accounts the owner must provide

Create these before the first store upload. Do not send passwords or keys in git.

| Account | What to create |
| --- | --- |
| Apple Developer Program | Organization membership. Note the 10-character Team ID. |
| App Store Connect | New iOS app, bundle id `ai.engineerit.app`, name `engineerit AI`, SKU `ai.engineerit.app`. |
| Apple App ID | Bundle id `ai.engineerit.app`. Enable **Push Notifications** and **Associated Domains**. |
| Apple distribution certificate | “Apple Distribution” certificate, exported as a password-protected `.p12`. |
| Apple provisioning profile | App Store profile for `ai.engineerit.app`, including push and associated domains. |
| APNs Auth Key | A `.p8` key for the future push sender. The archive workflow does not read it. Store it with the key id and the Team ID. |
| Google Play Console | Developer account. Create the app `engineerit AI`, package `ai.engineerit.app`. |
| Play App Signing | Let Google sign the app. Register the upload key from the keystore below. Copy the **App signing** SHA-256 into `well-known/assetlinks.json`. |
| Android upload keystore | One `.jks` created by the owner. Its first upload becomes the upload key. |
| Firebase project | Android app `ai.engineerit.app`. Download `google-services.json`. Cloud Messaging is what Android push uses. iOS push uses APNs, not this file. |
| App Review demo account | An engineerit.ai user that already has a paid plan bought on the website. Put the email and password in App Review notes. The iOS app cannot complete a purchase. |
| DNS / website owner | Ability to host the two files in `mobile/well-known/` at `https://engineerit.ai/.well-known/` and on `www.engineerit.ai`. |
| Support contact | info@engineerit.ai, and a phone number if App Store Connect requires one. |

## GitHub Actions secrets

Add these in the repository settings. The workflows read them at build time. They are not files in git. If a signing secret is missing, Android produces an unsigned AAB and iOS produces an unsigned archive. Those artifacts compile, and the stores will not accept them.

| Secret | Format | Workflow |
| --- | --- | --- |
| `ANDROID_KEYSTORE_BASE64` | `base64 -w 0 upload-keystore.jks` | `mobile-android-aab.yml` |
| `ANDROID_KEYSTORE_PASSWORD` | keystore password | same |
| `ANDROID_KEY_ALIAS` | key alias, for example `upload` | same |
| `ANDROID_KEY_PASSWORD` | key password | same |
| `ANDROID_GOOGLE_SERVICES_JSON_BASE64` | `base64 -w 0 google-services.json` | same. Optional for the build. Required for Android push. |
| `IOS_DISTRIBUTION_CERTIFICATE_BASE64` | `base64 -w 0 distribution.p12` | `mobile-ios-archive.yml` |
| `IOS_DISTRIBUTION_CERTIFICATE_PASSWORD` | password for the `.p12` | same |
| `IOS_PROVISIONING_PROFILE_BASE64` | `base64 -w 0 profile.mobileprovision` | same |
| `APPLE_TEAM_ID` | 10-character Team ID | same, required when the certificate and profile are set |

Local Android signing can use `mobile/android/keystore.properties` copied from `keystore.properties.example` instead of the GitHub secrets. That file is gitignored.

Suggested upload key, created once and then backed up offline:

```bash
keytool -genkeypair -v \
  -keystore upload-keystore.jks \
  -alias upload \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storetype JKS
```

## Listing copy

Category: Productivity. Secondary: Business. Age rating: 4+. Not a general web browser. No ads. Price: free to download. Paid plans are not sold inside the iOS app.

### English — Apple

- **Name:** engineerit AI
- **Subtitle:** Engineering assistant
- **Promotional text:** Ask engineering questions, attach a drawing or a document, and review a structured answer from your engineerit.ai account.
- **Keywords:** engineering,drawings,PID,design,civil,QA,documents,calculations
- **Description:**

engineerit AI is the iPhone and iPad app for engineerit.ai.

Sign in with the account you already use on the web. Ask a question in your discipline, attach a photo from the camera or your library, or attach a PDF, Word, or Excel file. The assistant returns a structured answer you can review.

The app is for people who already have an engineerit.ai account. Subscriptions are managed on the website, not in this app.

What you can do:

- Open the engineerit.ai chat
- Attach a camera photo, a saved image, or a document
- Pick a discipline and use the engineer tools your plan already includes
- Read answers in English or Arabic
- Open links that point at engineerit.ai

engineerit.ai is listed with the Saudi Business Center, authentication number 0000204877.

Support: info@engineerit.ai
Privacy: https://engineerit.ai/legal/privacy

- **What’s new:** First release. Sign in, attach drawings and documents, and use your engineerit.ai account.

### English — Google Play

- **App name:** engineerit AI
- **Short description:** Engineering chat for drawings, documents, and design checks.
- **Full description:**

engineerit AI is the Android app for engineerit.ai.

Sign in, ask an engineering question, and attach a photo or a file. Use the camera, your photos, or a PDF, Word, or Excel document. Answers follow the discipline and the tools on your account.

Plans are billed on the engineerit.ai website through Moyasar. The app opens that checkout in the in-app browser. The app does not collect your card number.

What you can do:

- Chat with the engineerit.ai assistant
- Photograph a drawing or pick one from your photos
- Upload PDF, Word, Excel, and image files
- Use the engineer tools included in your plan
- Read answers in English or Arabic

engineerit.ai is listed with the Saudi Business Center, authentication number 0000204877.

Support: info@engineerit.ai
Privacy: https://engineerit.ai/legal/privacy

### Arabic — Apple

- **Name:** engineerit AI
- **Subtitle:** مساعد هندسي
- **Promotional text:** اسأل سؤالاً هندسياً، أرفق رسماً أو مستنداً، وراجع إجابة منظمة من حسابك في engineerit.ai.
- **Keywords:** هندسة,مخططات,تصميم,مستندات,مدني,جودة,حسابات,PID
- **Description:**

engineerit AI هو تطبيق آيفون وآيباد لموقع engineerit.ai.

سجّل الدخول بالحساب الذي تستخدمه على الويب. اسأل في تخصصك، أو أرفق صورة من الكاميرا أو من الصور، أو أرفق ملف PDF أو Word أو Excel. يعود المساعد بإجابة منظمة يمكنك مراجعتها.

التطبيق لمن لديه حساب engineerit.ai. تُدار الاشتراكات على الموقع، وليس داخل هذا التطبيق.

يمكنك:

- فتح محادثة engineerit.ai
- إرفاق صورة من الكاميرا أو من الاستوديو أو مستند
- اختيار التخصص واستخدام أدوات المهندس المتاحة في خطتك
- قراءة الإجابات بالعربية أو بالإنجليزية
- فتح الروابط التي تشير إلى engineerit.ai

engineerit.ai مسجّل في المركز السعودي للأعمال، رقم التوثيق 0000204877.

الدعم: info@engineerit.ai
الخصوصية: https://engineerit.ai/legal/privacy

### Arabic — Google Play

- **App name:** engineerit AI
- **Short description:** محادثة هندسية للمخططات والمستندات ومراجعة التصميم.
- **Full description:**

engineerit AI هو تطبيق أندرويد لموقع engineerit.ai.

سجّل الدخول، اسأل سؤالاً هندسياً، وأرفق صورة أو ملفاً. يمكنك استخدام الكاميرا أو الصور أو ملف PDF أو Word أو Excel. تأتي الإجابة وفق التخصص والأدوات في حسابك.

تُحاسب الخطط على موقع engineerit.ai عبر ميسر. يفتح التطبيق صفحة الدفع في المتصفح الداخلي. التطبيق لا يجمع رقم البطاقة.

يمكنك:

- المحادثة مع مساعد engineerit.ai
- تصوير مخطط أو اختياره من الصور
- رفع ملفات PDF وWord وExcel والصور
- استخدام أدوات المهندس ضمن خطتك
- قراءة الإجابات بالعربية أو بالإنجليزية

engineerit.ai مسجّل في المركز السعودي للأعمال، رقم التوثيق 0000204877.

الدعم: info@engineerit.ai
الخصوصية: https://engineerit.ai/legal/privacy

## Screenshots

Capture these on a signed-in demo account that already has a plan. For the App Store set, do not show `/pricing`, `/subscription`, a price in SAR or USD, or the words Upgrade, Subscribe, or View pricing.

Take each store’s set in English and a second set in Arabic (the chat lays out right to left when the text is Arabic).

| # | Screen | What to show |
| --- | --- | --- |
| 1 | Chat, empty | engineerit.ai chat, discipline control, message field. No upgrade banner. |
| 2 | Chat, answer | A short technical answer in English. |
| 3 | Chat, Arabic | The same kind of answer in Arabic, right to left. |
| 4 | Attach | The photo and document actions, then the system camera / photos / files sheet. |
| 5 | Sign in | The email and password form. |
| 6 | Profile | The signed-in name and current plan name. Crop out any upgrade control. |
| 7 | Engineer tools | The tool list for a plan that can open them. |
| 8 | Offline | Airplane mode, the in-app offline screen with the logo and Try again. |

Sizes to export:

| Store slot | Pixels |
| --- | --- |
| App Store iPhone 6.9-inch | 1320 × 2868 or 1290 × 2796, portrait |
| App Store iPhone 6.5-inch | 1284 × 2778 or 1242 × 2688, portrait |
| App Store iPad 13-inch | 2064 × 2752, portrait |
| Play phone | 1080 × 1920, PNG or JPEG |
| Play 7-inch tablet (optional) | 1200 × 1920 |
| Play feature graphic | 1024 × 500 |
| Play icon | 512 × 512, from `npm run assets` |
| App Store icon | 1024 × 1024, no transparency, from `npm run assets` |

Confirm the required slots in App Store Connect and Play Console. Apple changes the required device sizes.

## Privacy policy text to publish

The live page https://engineerit.ai/legal/privacy points at the privacy section of the terms. Before review, add this mobile section to that policy so the URL covers the native app. This folder does not change the website.

> The engineerit AI apps for iOS and Android (app id ai.engineerit.app) load engineerit.ai. They can use the camera and the photo library when you attach an image, and the document picker when you attach a PDF, Word, Excel, or other file you choose. Files are sent to engineerit.ai as part of your chat. The apps may request permission to send push notifications and, if you allow it, store a device token for your account. The apps do not sell personal information. Payments for paid plans are handled on the engineerit.ai website by Moyasar. The iOS app does not offer in-app purchases. Contact info@engineerit.ai.

## Data safety and privacy nutrition

Answer from the product as it ships today. The shell does not add advertising SDKs. The website loaded inside the app includes the existing HubSpot script. Confirm in the HubSpot account that it is product analytics and not cross-app advertising before you submit. If it is used for ads, change the tracking answers to yes.

**Both stores**

- Data is collected by engineerit.ai when the account is used.
- Data is not sold.
- Data is encrypted in transit (HTTPS).
- Users can request deletion through info@engineerit.ai.
- The app does not ask for location, contacts, SMS, or microphone.
- Card numbers are typed on Moyasar’s page, not in native fields. Do not declare that the app collects credit card numbers.
- Account plan and payment status can appear on the profile because the website stores them.

| Data type | Collected | Linked to the user | Purpose | Shared |
| --- | --- | --- | --- | --- |
| Name | Yes, if the profile has one | Yes | Account management | No |
| Email address | Yes | Yes | Account management, support | No |
| Chats and other content the user types | Yes | Yes | App functionality | No |
| Photos and files the user attaches | Yes | Yes | App functionality | No |
| App interactions (HubSpot on the site) | Yes | Yes | Analytics | No, unless HubSpot ads are enabled |
| Device token for push | Only after the user allows notifications | Yes | App functionality | The push provider (FCM on Android, APNs on iOS) |
| Purchase history | The website stores the plan. The iOS app does not sell. | Yes | Account management | Moyasar processes the web payment |

**Apple privacy nutrition**

- Contact info: email, name. Used for app functionality. Linked to the user. Not used for tracking.
- User content: customer support and other user content (chats and files). App functionality. Linked. Not tracking.
- Identifiers: device ID (push token). App functionality. Linked. Not tracking.
- Purchases: purchase history only if you keep it. App functionality. Not collected as a card number.
- Diagnostics: leave off unless you add a crash SDK. This project does not.
- Tracking: No, after you confirm HubSpot is not used for tracking.

**Google Play Data safety**

- Does the app collect or share any of the required user data types? Yes.
- Is all of the user data collected by your app encrypted in transit? Yes.
- Do you provide a way for users to request that their data be deleted? Yes. Email info@engineerit.ai.
- Committed to the Play Families policy? No.
- Independent security review? No.

**Permissions to declare**

| Platform | Permission | Reason shown to the user |
| --- | --- | --- |
| iOS | Camera | Attach a photo of a drawing, diagram, or site. |
| iOS | Photo library | Attach an image the user selects. The app does not write to the library. |
| iOS | Push notifications | Optional account and product updates. |
| Android | Camera | Same attach flow. Not required to install. |
| Android | Notifications | Optional. Android 13 and later prompt at runtime. |
| Android | Internet | Load engineerit.ai. |

## Review notes to paste

iOS:

> This app signs in to an existing engineerit.ai account. It does not sell subscriptions and does not link to an external checkout. Demo account: REPLACE_EMAIL / REPLACE_PASSWORD. The account already has an active plan purchased on the website. Camera and photo access are used only when the reviewer attaches a file. Push notifications are optional.

Android:

> Payments for digital plans open the existing Moyasar checkout in Chrome Custom Tabs. Card data is collected by Moyasar, not by the app. Demo account: REPLACE_EMAIL / REPLACE_PASSWORD.

## Release checklist

1. Publish the mobile privacy paragraph at https://engineerit.ai/legal/privacy.
2. Host `mobile/well-known/assetlinks.json` and `mobile/well-known/apple-app-site-association` with the real Team ID and Play signing SHA-256.
3. Add the GitHub secrets in the table above.
4. Run the two workflows and download the AAB and the xcarchive.
5. Upload the AAB to Play and the IPA (or the archive via Xcode) to App Store Connect.
6. Attach the screenshot sets. Recheck the iOS set for prices and purchase buttons.
7. Set the demo account in App Review notes.

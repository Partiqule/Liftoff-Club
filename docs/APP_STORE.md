# Put Liftoff Club on the App Store

The iPhone project is already in `ios/`. You build it on a Mac. This machine cannot compile it. Nothing in git is a signing key. If a file named `AuthKey_something.p8` lands in this folder, do not commit it. `.gitignore` already ignores `*.p8`.

You need a Mac with Xcode 16 or newer, and the Apple Developer account for team `39AMCG49RK`.

The app id is `app.liftoffclub`. The widget id is `app.liftoffclub.widget`. The shared group is `group.app.liftoffclub`.

## 1. Apple Developer

1. Open https://developer.apple.com/account and sign in.
2. If it asks for a team, choose the team whose id is `39AMCG49RK`.
3. Click **Certificates, Identifiers & Profiles**.
4. Click **Identifiers**.
5. Click the blue **+** button.
6. Select **App IDs** and click **Continue**.
7. Select **App** and click **Continue**.
8. Description: `Liftoff Club`. Bundle ID: select **Explicit** and type `app.liftoffclub`.
9. In Capabilities, turn on **Push Notifications** and **App Groups**. Leave the rest off.
10. Click **Continue**, then **Register**.
11. Click **Identifiers** again, then the blue **+**.
12. Select **App IDs**, **Continue**, **App**, **Continue**.
13. Description: `Liftoff Club Widget`. Bundle ID: `app.liftoffclub.widget`.
14. Turn on **App Groups** only. Click **Continue**, then **Register**.
15. In the left sidebar, click **Identifiers**, then open the filter and choose **App Groups**. If the filter is a dropdown at the top right, set it to **App Groups**.
16. Click the blue **+**. Description: `Liftoff Club`. Identifier: `group.app.liftoffclub`. Click **Continue**, then **Register**.
17. Go back to **Identifiers**, set the filter to **App IDs**, and open `app.liftoffclub`.
18. Click **App Groups**, then **Configure** or **Edit**. Check `group.app.liftoffclub`. Click **Save**, then **Save** on the app id.
19. Open `app.liftoffclub.widget` and attach the same group the same way.
20. In the left sidebar, click **Keys**.
21. Click the blue **+**. Key name: `Liftoff Club Push`. Check **Apple Push Notifications service (APNs)**. Click **Continue**, then **Register**.
22. Click **Download**. You get one `.p8` file. Apple will not offer it again. Store it in a password manager or a folder outside this repo. Do not put it in Xcode. Do not commit it.
23. On that key page, copy the **Key ID**. It is 10 letters and numbers. You will paste it into Vercel as `APNS_KEY_ID`.
24. Open https://developer.apple.com/account and confirm Membership shows team id `39AMCG49RK`. That value is `APNS_TEAM_ID`.

## 2. Vercel, where the push key lives

The phone asks `https://liftoffclub.app` to remember its push token. The site sends the alert. The private key stays in Vercel, not in the app.

1. Open the Vercel project **liftoff-club**.
2. Click **Settings**, then **Environment Variables**.
3. Add these for Production (and Preview only if you want alerts from a preview build):

| Name | Value |
| --- | --- |
| `APNS_KEY_ID` | The 10 character Key ID from the key page |
| `APNS_TEAM_ID` | `39AMCG49RK` |
| `APNS_BUNDLE_ID` | `app.liftoffclub` |
| `APNS_PRIVATE_KEY` | The whole `.p8` file, including `BEGIN PRIVATE KEY` and `END PRIVATE KEY` |
| `APNS_ENV` | Leave empty for the App Store. Type `sandbox` only while you run the app from Xcode on a phone |

4. If the Vercel form flattens the key onto one line, keep the line breaks by writing `\n` between lines. The server turns those into real line breaks.
5. Save. Redeploy production so the new variables load.
6. The same Redis store the site already uses for web alerts also stores iPhone tokens. If `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are already set, you do not add them again.
7. The every 10 minute GitHub check, and the once daily Vercel check, both call `/api/push/cron`. That route sends the iPhone note when the key is present. A missing or wrong cron token is still rejected.

## 3. Xcode

1. On the Mac, clone the repo and check out the branch that contains `ios/`.
2. In Terminal, from the repo root, run `npm install` and then `npm run ios:sync`. That refreshes plugins and writes team `39AMCG49RK` back if a sync dropped it.
3. Open `ios/App/App.xcodeproj` in Xcode. Use the `.xcodeproj` file. Capacitor uses Swift packages, not CocoaPods.
4. Wait until the package resolution spinner finishes. If it asks to trust the packages, click **Trust**.
5. In the left project navigator, click the blue **App** project, then the **App** target.
6. Open the **Signing & Capabilities** tab.
7. Check **Automatically manage signing**.
8. Team: choose the team for `39AMCG49RK`.
9. Bundle Identifier must read `app.liftoffclub`.
10. Confirm these capabilities are listed. If one is missing, click **+ Capability** and add it:
    - Push Notifications
    - App Groups, with `group.app.liftoffclub` checked
    - Background Modes, with **Remote notifications** checked
11. If the App Group shows a red error, click the refresh arrow next to it, or click **+** and type `group.app.liftoffclub` so Xcode creates the portal record you made in step 1.
12. Select the **LiftoffWidget** target. Team is the same. Bundle Identifier is `app.liftoffclub.widget`. App Groups includes `group.app.liftoffclub`. It does not need Push Notifications.
13. Debug builds use `ios/App/App/App.entitlements`, where `aps-environment` is `development`. Archive builds use `AppRelease.entitlements`, where it is `production`. Do not swap those by hand.
14. Plug in an iPhone, select it in the toolbar device menu, and press the Run button. The first launch asks you to trust the developer in the phone's Settings, General, VPN & Device Management.
15. Allow notifications when the app asks. Follow a launch under **For parents**. The token is sent to `/api/push/apns`.
16. Leave the app. Touch and hold the home screen, tap **+**, search **Liftoff Club**, and add **Next launch**.
17. Turn on airplane mode. The live pages fail closed to the offline list. The widget still shows the last saved launch.
18. Open a launch and tap **Share this launch**. The system share sheet opens. A light tap is felt when the phone supports it.
19. The Simulator does not receive Apple push. Use a real phone for that test. While you run from Xcode, set `APNS_ENV` to `sandbox` and redeploy. Before you ship, clear `APNS_ENV` and redeploy again.

## 4. App Store Connect

1. Open https://appstoreconnect.apple.com and sign in.
2. Click **Apps**.
3. Click the blue **+**, then **New App**.
4. Platform: **iOS**. Name: `Liftoff Club`. Primary language: **English (U.S.)**. Bundle ID: `app.liftoffclub`. SKU: `liftoff-club`. User Access: **Full Access**. Click **Create**.
5. Open the new app. In the left sidebar, click the iOS version (1.0).
6. Paste the fields from `store/listing.txt`. The description, subtitle, keywords, support URL, and privacy URL are in that file.
7. Under **Screenshots**, choose the **6.7 inch** iPhone set and drag in, in this order:
    - `store/screenshots/iphone-6.7-home.png`
    - `store/screenshots/iphone-6.7-launch.png`
    - `store/screenshots/iphone-6.7-sky.png`
8. Choose the **6.5 inch** iPhone set and drag in:
    - `store/screenshots/iphone-6.5-home.png`
    - `store/screenshots/iphone-6.5-launch.png`
    - `store/screenshots/iphone-6.5-sky.png`
9. Those files are 1290 by 2796 and 1284 by 2778. They are the live site at phone size, which is what the app shows.
10. Scroll to **App Review Information**. Check **Sign in required** off. Paste the review notes from `store/listing.txt`.
11. Copyright: `2026 Paul Miller`.
12. Click **Save**.
13. In the left sidebar, click **App Privacy**.
14. Click **Get Started** or **Edit**.
15. Tracking: **No**, we do not track across other companies' apps.
16. Data types to match the privacy page:
    - **Device ID**: used for App Functionality (the push token). Not linked to identity. Not used for tracking. Collect it only if alerts are on.
    - **Product Interaction**: used for Analytics (Vercel page counts on the live site). Not linked to identity. Not used for tracking.
    - **Contact Info, Email Address**: used for App Functionality, only if someone requests Pro early access inside the site. Linked to identity. Not used for tracking.
17. Publish the privacy answers.
18. Age rating: answer that there are no unrestricted web pages beyond the app's own site, no ads, no user content, and no made up violence. Kids mode is the default. The questionnaire should land at 4+.
19. Back on the version page, set the build after the upload below finishes processing. Processing often takes 10 to 30 minutes.

## 5. Upload the build

1. In Xcode, set the run destination to **Any iOS Device (arm64)**. A phone destination also works, but Archive wants a generic device.
2. Menu **Product**, then **Archive**. Wait until the Organizer window opens.
3. Select the new archive. Click **Distribute App**.
4. Choose **App Store Connect**, then **Upload**. Click **Next** through the defaults (strip symbols, upload symbols, manage version automatically).
5. When signing asks, leave automatic signing on the team `39AMCG49RK`.
6. Click **Upload**. Fix any red signing error by opening the target and checking the team and the app group, then archive again.
7. When the upload succeeds, return to App Store Connect, refresh the version page, and choose the build under **Build**.
8. Click **Add for Review**, then **Submit to App Review**.

## What the app does

- It opens https://liftoffclub.app. Links on that host stay in the app. Other links open in Safari.
- If the site cannot load, `mobile/offline.html` shows the last schedule saved in the app group.
- The website also saves that schedule in the phone browser storage, so `/offline` can list it.
- The widget reads `https://liftoffclub.app/api/ios/schedule` and the app group. It needs iOS 17. The app itself runs on iOS 15.
- Share uses the system sheet from a launch page. On the website in a normal browser, the same button uses the browser share sheet or copies the link.
- Push uses Apple's token. The server signs each send with the `.p8` key. No key file ships inside the app.

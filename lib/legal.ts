export const PRIVACY_EMAIL = 'privacy@liftoffclub.app'

export const PRIVACY = {
  title: 'Privacy',
  lede: 'Liftoff Club keeps as little as it can. The family site has no accounts. This page says what is stored, who handles it, and how to ask for a deletion.',
  kidsTitle: 'Kids',
  kids: 'The family side has no accounts and collects no personal data from kids. It does not ask a child for a name, an email address, or a photo. A town and a time zone, if a grown up sets them, stay on that device.',
  collectTitle: 'What is collected',
  collect: [
    'Pro early access stores the name, email, company, and role you type, so we can send a reply.',
    'Business early access also stores company size and an optional note about what you track.',
    'Phone alerts, if a grown up turns them on, store the browser address that receives the alert. There is no name and no email on that record.',
    'The iPhone app, if you install it, stores a push token and a cached launch list on that phone so alerts and the home screen widget can work offline.',
    'A town and a time zone are saved in the browser on the device. They are not sent to an account.',
    'Vercel Web Analytics counts pages. Query strings are stripped. The family site does not require a cookie for that count.',
  ],
  processorsTitle: 'Who handles it',
  processors: 'Vercel hosts the site and counts pages. Upstash stores early access notes and phone alert addresses when those features are turned on. Resend sends email for Pro when mail is turned on.',
  retentionTitle: 'How long it stays',
  retention: 'A town and a time zone stay in the browser until you clear the site data. Early access notes and phone alert addresses stay in our store until you ask us to delete them. We do not set a separate clock on the page counts.',
  deleteTitle: 'How to delete it',
  delete: `Email ${PRIVACY_EMAIL} from the address you want removed. Say whether the note is an early access sign up, a phone alert, an iPhone push token, or all of them. We delete the records we hold.`,
} as const

export const SUPPORT = {
  title: 'Support',
  lede: 'Questions about a launch time, a phone alert, or your early access note can come to the same mailbox.',
  body: `Email ${PRIVACY_EMAIL}. The family site is free and has no account to reset. Pro is free during early access.`,
} as const

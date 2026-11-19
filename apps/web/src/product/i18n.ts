// Interface copy. Everyday Taglish first (user testing: formal Tagalog was harder to read than English), English
// as the alternative. Plain words, sentence case, no filler.
// Cebuano is offered for the cloud explanation (generated), not for the interface itself.
export type UiLang = "tl" | "en";

export const T = {
  tagline: { tl: "I-check ang contract mo bago ka pumirma.", en: "Check your contract before you sign." },
  intro: {
    tl: "Para sa mga magtatrabaho abroad. Ikukumpara ng Kontrata ang contract o offer ng recruiter sa rules ng DMW, at sasabihin kung ano ang dapat mong itanong.",
    en: "For anyone going to work abroad. Kontrata compares a contract or a recruiter's offer with DMW rules, and tells you what to ask.",
  },
  inputLabel: { tl: "Contract o message ng recruiter", en: "Contract or recruiter message" },
  placeholder: {
    tl: "I-paste dito ang buong text ng contract, o ang post o chat ng recruiter.",
    en: "Paste the full text of the contract, or the recruiter's post or chat.",
  },
  useSample: { tl: "Subukan ang sample contract", en: "Use a sample contract" },
  useSamplePost: { tl: "Subukan ang sample post", en: "Use a sample post" },
  privacyTitle: { tl: "Sa device mo lang ang personal details mo.", en: "Your personal details stay on your device." },
  privacyBody: {
    tl: "Bago i-check sa cloud, tinatakpan muna dito sa device mo ang mga pangalan, passport number, phone number, at address. Wala kaming sine-save.",
    en: "Before any cloud check, names, passport numbers, phone numbers and addresses are covered here on your device. Nothing is stored.",
  },
  check: { tl: "I-check", en: "Check" },
  emptyInput: { tl: "Mag-paste muna ng contract o message.", en: "Paste the contract or message text first." },

  step1: { tl: "Hinahanap ang personal details sa device mo", en: "Finding personal details on your device" },
  step2: { tl: "Tinatakpan ang mga ito", en: "Covering them up" },
  step3: { tl: "Kinukumpara sa rules ng DMW", en: "Comparing with DMW rules" },

  resultsRed: { tl: (n: number) => (n === 1 ? "1 part ang labag sa rules" : `${n} parts ang labag sa rules`), en: (n: number) => (n === 1 ? "1 part goes against the rules" : `${n} parts go against the rules`) },
  resultsAmber: { tl: (n: number) => `Walang labag sa rules, pero may ${n} na dapat mong itanong`, en: (n: number) => `Nothing against the rules, but ${n} to ask about` },
  resultsClear: { tl: "Walang nakitang problema sa mga na-check namin", en: "No problems found in what we checked" },
  resultsSub: {
    tl: "Basahin isa-isa. Ipakita ito sa agency at magtanong bago pumirma.",
    en: "Read each one. Show this to your agency and ask before you sign.",
  },
  resultsClearSub: {
    tl: "Hindi ibig sabihin na safe na ang buong contract. Basahin pa rin lahat, at itanong ang hindi malinaw.",
    en: "This doesn't mean the whole contract is safe. Still read all of it, and ask about anything unclear.",
  },
  sevLabel: {
    red: { tl: "Labag sa rules", en: "Against the rules" },
    amber: { tl: "Itanong ito", en: "Ask about this" },
    green: { tl: "OK", en: "In order" },
  },
  inContract: { tl: "Nakasulat sa contract", en: "In the contract" },
  basis: { tl: "Source", en: "Source" },

  airlockTitle: { tl: "Ito lang ang makikita ng cloud", en: "What the cloud will see" },
  airlockBody: {
    tl: "Ito lang ang ipapadala kung gusto mo ng mas detalyadong paliwanag. Ang mga natakpang details ay nasa device mo lang.",
    en: "Only this is sent if you ask for a detailed explanation. The covered details stay on your device.",
  },
  localOnly: { tl: "Sa device mo lang", en: "Only on your device" },
  nothingCovered: { tl: "Walang nakitang personal details.", en: "No personal details found." },
  modelOk: { tl: (s: string) => `Hinanap ng AI sa device mo ang mga pangalan (${s} seconds).`, en: (s: string) => `On-device AI looked for names (${s} seconds).` },
  modelOff: {
    tl: "Walang AI sa device na ito, kaya ibang paraan ang ginamit para hanapin ang mga pangalan. Paki-check muna ang ipapadala.",
    en: "This device has no on-device AI, so names were found another way. Please check what will be sent.",
  },

  reviewTitle: { tl: "Paki-check muna bago ipadala", en: "Please check before sending" },
  reviewSuspects: { tl: "Mukhang pangalan o lugar ang mga ito at hindi pa natatakpan:", en: "These look like names that are not covered yet:" },
  coverThese: { tl: "Takpan din ang mga ito", en: "Cover these too" },
  confirmReview: {
    tl: "Na-check ko na ang ipapadala sa taas, at walang personal details dito.",
    en: "I checked what will be sent above, and it has no personal details.",
  },
  blocked: {
    tl: "Hindi ito pwedeng ipadala: may personal details na hindi natakpan.",
    en: "This can't be sent: some personal details are not covered.",
  },

  deepTitle: { tl: "Detalyadong paliwanag", en: "Detailed explanation" },
  deepBody: {
    tl: "Ipapadala sa cloud ang natakpang text para ipaliwanag ang bawat part ng contract, gamit lang ang rules ng DMW.",
    en: "The covered text is sent to the cloud to explain each part of the contract, using only DMW rules.",
  },
  deepLang: { tl: "Language ng paliwanag", en: "Explanation language" },
  explain: { tl: "Ipaliwanag", en: "Explain" },
  explaining: { tl: "Ipinapaliwanag…", en: "Explaining…" },
  deepFailed: {
    tl: "Hindi natapos ang paliwanag. Subukan ulit. Nandiyan pa rin ang results sa taas.",
    en: "The explanation didn't finish. Try again. The results above still stand.",
  },
  clause: {
    violates: { tl: "Labag sa rules", en: "Against the rules" },
    unclear: { tl: "Hindi malinaw", en: "Unclear" },
    ok: { tl: "OK", en: "In order" },
  },
  questionsTitle: { tl: "Itanong sa agency bago pumirma", en: "Ask your agency before signing" },
  copyQuestions: { tl: "I-copy ang mga tanong", en: "Copy the questions" },
  copied: { tl: "Na-copy na", en: "Copied" },
  sentDetails: { tl: "Tingnan kung ano mismo ang ipinadala", en: "See exactly what was sent" },

  checkAnother: { tl: "Mag-check ng iba", en: "Check another" },
  helpTitle: { tl: "Kailangan ng tulong?", en: "Need help?" },
  helpBody: {
    tl: "Tumawag sa DMW hotline 1348. Para mag-report ng illegal recruitment: 8721-0619 o airtipinfo@dmw.gov.ph.",
    en: "Call the DMW hotline 1348. To report illegal recruitment: 8721-0619 or airtipinfo@dmw.gov.ph.",
  },
  disclaimer: {
    tl: "Hindi ito legal advice. Para sa official na sagot, kontakin ang DMW.",
    en: "This is not legal advice. For an official answer, contact the DMW.",
  },
  chip: {
    PERSON: { tl: "Tao", en: "Person" },
    ADDRESS: { tl: "Address", en: "Address" },
    PHONE: { tl: "Phone", en: "Phone" },
    PASSPORT: { tl: "Passport", en: "Passport" },
    EMAIL: { tl: "Email", en: "Email" },
    GOV_ID: { tl: "ID", en: "ID" },
    ID_NUMBER: { tl: "Numero", en: "Number" },
    BANK: { tl: "Bangko", en: "Bank" },
    DOB: { tl: "Birthday", en: "Birthday" },
  } as Record<string, Record<UiLang, string>>,
} as const;

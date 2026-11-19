// Interface copy. Tagalog first; English as the alternative. Plain words, sentence case, no filler.
// Cebuano is offered for the cloud explanation (generated), not for the interface itself.
export type UiLang = "tl" | "en";

export const T = {
  tagline: { tl: "Suriin ang kontrata mo bago ka pumirma.", en: "Check your contract before you sign." },
  intro: {
    tl: "Para sa mga papunta sa trabaho abroad. Ikinukumpara ng Kontrata ang kontrata o alok ng recruiter sa mga patakaran ng DMW, at sinasabi kung ano ang dapat mong itanong.",
    en: "For anyone going to work abroad. Kontrata compares a contract or a recruiter's offer with DMW rules, and tells you what to ask.",
  },
  inputLabel: { tl: "Kontrata o mensahe ng recruiter", en: "Contract or recruiter message" },
  placeholder: {
    tl: "Idikit dito ang buong teksto ng kontrata, o ang post o chat ng recruiter.",
    en: "Paste the full text of the contract, or the recruiter's post or chat.",
  },
  useSample: { tl: "Gamitin ang halimbawang kontrata", en: "Use a sample contract" },
  useSamplePost: { tl: "Gamitin ang halimbawang post", en: "Use a sample post" },
  privacyTitle: { tl: "Nananatili sa device mo ang mga personal na detalye.", en: "Your personal details stay on your device." },
  privacyBody: {
    tl: "Bago ang anumang pagsusuri sa cloud, tinatakpan muna dito sa device mo ang mga pangalan, numero ng pasaporte, telepono, at address. Wala kaming iniimbak.",
    en: "Before any cloud check, names, passport numbers, phone numbers and addresses are covered here on your device. Nothing is stored.",
  },
  check: { tl: "Suriin", en: "Check" },
  emptyInput: { tl: "Idikit muna ang teksto ng kontrata o mensahe.", en: "Paste the contract or message text first." },

  step1: { tl: "Hinahanap ang mga personal na detalye sa device mo", en: "Finding personal details on your device" },
  step2: { tl: "Tinatakpan ang mga ito", en: "Covering them up" },
  step3: { tl: "Ikinukumpara sa mga patakaran ng DMW", en: "Comparing with DMW rules" },

  resultsRed: { tl: (n: number) => (n === 1 ? "1 bahagi ang labag sa patakaran" : `${n} bahagi ang labag sa patakaran`), en: (n: number) => (n === 1 ? "1 part goes against the rules" : `${n} parts go against the rules`) },
  resultsAmber: { tl: (n: number) => `Walang labag sa patakaran, pero ${n} ang dapat itanong`, en: (n: number) => `Nothing against the rules, but ${n} to ask about` },
  resultsClear: { tl: "Walang nakitang problema sa mga sinuri namin", en: "No problems found in what we checked" },
  resultsSub: {
    tl: "Basahin ang bawat isa. Ipakita ito sa agency at itanong bago ka pumirma.",
    en: "Read each one. Show this to your agency and ask before you sign.",
  },
  resultsClearSub: {
    tl: "Hindi nito sinasabing ligtas ang buong kontrata. Basahin pa rin ito nang buo, at itanong ang hindi malinaw.",
    en: "This doesn't mean the whole contract is safe. Still read all of it, and ask about anything unclear.",
  },
  sevLabel: {
    red: { tl: "Labag sa patakaran", en: "Against the rules" },
    amber: { tl: "Dapat itanong", en: "Ask about this" },
    green: { tl: "Maayos", en: "In order" },
  },
  inContract: { tl: "Nakasulat sa kontrata", en: "In the contract" },
  basis: { tl: "Batayan", en: "Source" },

  airlockTitle: { tl: "Ano ang makikita ng cloud", en: "What the cloud will see" },
  airlockBody: {
    tl: "Ito lang ang ipapadala kung hihingi ka ng mas malalim na paliwanag. Ang mga natakpang detalye ay nasa device mo lang.",
    en: "Only this is sent if you ask for a detailed explanation. The covered details stay on your device.",
  },
  localOnly: { tl: "Nasa device mo lang", en: "Only on your device" },
  nothingCovered: { tl: "Walang personal na detalyeng nakita.", en: "No personal details found." },
  modelOk: { tl: (s: string) => `Hinanap ng AI sa device mo ang mga pangalan (${s} segundo).`, en: (s: string) => `On-device AI looked for names (${s} seconds).` },
  modelOff: {
    tl: "Walang AI sa device na ito, kaya ibang paraan ang ginamit sa paghahanap ng pangalan. Pakisuri muna ang ipapadala.",
    en: "This device has no on-device AI, so names were found another way. Please check what will be sent.",
  },

  reviewTitle: { tl: "Pakisuri muna bago ipadala", en: "Please check before sending" },
  reviewSuspects: { tl: "Mukhang pangalan ang mga ito at hindi pa natatakpan:", en: "These look like names that are not covered yet:" },
  coverThese: { tl: "Takpan din ang mga ito", en: "Cover these too" },
  confirmReview: {
    tl: "Nasuri ko ang ipapadala sa itaas at walang personal na detalye rito.",
    en: "I checked what will be sent above, and it has no personal details.",
  },
  blocked: {
    tl: "Hindi ito maipapadala: may personal na detalyeng hindi natakpan.",
    en: "This can't be sent: some personal details are not covered.",
  },

  deepTitle: { tl: "Mas malalim na paliwanag", en: "Detailed explanation" },
  deepBody: {
    tl: "Ipapadala sa cloud ang natakpang teksto para ipaliwanag ang bawat bahagi ng kontrata, gamit lang ang mga patakaran ng DMW.",
    en: "The covered text is sent to the cloud to explain each part of the contract, using only DMW rules.",
  },
  deepLang: { tl: "Wika ng paliwanag", en: "Explanation language" },
  explain: { tl: "Ipaliwanag", en: "Explain" },
  explaining: { tl: "Ipinapaliwanag…", en: "Explaining…" },
  deepFailed: {
    tl: "Hindi natapos ang paliwanag. Subukang muli. Nananatili ang mga resulta sa itaas.",
    en: "The explanation didn't finish. Try again. The results above still stand.",
  },
  clause: {
    violates: { tl: "Labag", en: "Against the rules" },
    unclear: { tl: "Hindi malinaw", en: "Unclear" },
    ok: { tl: "Maayos", en: "In order" },
  },
  questionsTitle: { tl: "Itanong sa agency bago pumirma", en: "Ask your agency before signing" },
  copyQuestions: { tl: "Kopyahin ang mga tanong", en: "Copy the questions" },
  copied: { tl: "Nakopya na", en: "Copied" },
  sentDetails: { tl: "Tingnan ang eksaktong ipinadala", en: "See exactly what was sent" },

  checkAnother: { tl: "Suriin ang iba", en: "Check another" },
  helpTitle: { tl: "Kailangan ng tulong?", en: "Need help?" },
  helpBody: {
    tl: "Tumawag sa DMW hotline 1348. Para mag-report ng illegal recruitment: 8721-0619 o airtipinfo@dmw.gov.ph.",
    en: "Call the DMW hotline 1348. To report illegal recruitment: 8721-0619 or airtipinfo@dmw.gov.ph.",
  },
  disclaimer: {
    tl: "Hindi ito legal na payo. Para sa opisyal na sagot, makipag-ugnayan sa DMW.",
    en: "This is not legal advice. For an official answer, contact the DMW.",
  },
  chip: {
    PERSON: { tl: "Tao", en: "Person" },
    ADDRESS: { tl: "Address", en: "Address" },
    PHONE: { tl: "Telepono", en: "Phone" },
    PASSPORT: { tl: "Pasaporte", en: "Passport" },
    EMAIL: { tl: "Email", en: "Email" },
    GOV_ID: { tl: "ID", en: "ID" },
    ID_NUMBER: { tl: "Numero", en: "Number" },
    BANK: { tl: "Bangko", en: "Bank" },
    DOB: { tl: "Kaarawan", en: "Birthday" },
  } as Record<string, Record<UiLang, string>>,
} as const;

// Golden corpus: hand-written, tricky, realistic. Each case says what MUST disappear
// and what MUST survive (facts needed for the contract analysis).
// All people, numbers, and addresses here are fictional.
export interface Case {
  name: string;
  input: string;
  mustRedact: string[];
  mustKeep?: string[];
}

export const CASES: Case[] = [
  {
    name: "standard contract header (form fields)",
    input: `STANDARD EMPLOYMENT CONTRACT FOR HOUSEHOLD SERVICE WORKERS
Name of Employer: Khalid Al-Mutairi
Employer's Address: Villa 12, Al Olaya District, Riyadh
Name of Worker: Maria Luz Santos
Passport No.: P1234567A
Contact No.: +966 55 123 4567`,
    mustRedact: ["Khalid Al-Mutairi", "Villa 12, Al Olaya District, Riyadh", "Maria Luz Santos", "P1234567A", "+966 55 123 4567"],
    mustKeep: ["STANDARD EMPLOYMENT CONTRACT", "HOUSEHOLD SERVICE WORKERS"],
  },
  {
    name: "salary, currency, duration must survive",
    input: "Monthly salary: USD 400 (SAR 1,500). Contract duration: 24 months. Working hours: 8 hours per day.",
    mustRedact: [],
    mustKeep: ["USD 400", "SAR 1,500", "24 months", "8 hours per day"],
  },
  {
    name: "name reused later in free text (surname only)",
    input: "Name of Worker: Josefina Dela Cruz\n...\n7. Ms. Dela Cruz shall be entitled to one rest day per week. Josefina may not be transferred.",
    mustRedact: ["Josefina Dela Cruz", "Josefina"],
    mustKeep: ["rest day per week", "may not be transferred"],
  },
  {
    name: "PH mobile formats",
    input: "Call me at 0917-123-4567 or 09181234567 or +63 919 765 4321 or +639201112222.",
    mustRedact: ["0917-123-4567", "09181234567", "+63 919 765 4321", "+639201112222"],
  },
  {
    name: "Gulf and Asia phones",
    input: "Kuwait +965 9988 7766, UAE +971-50-123-4567, Qatar +974 3312 4455, HK +852 9123 4567, SG +65 8123 4567.",
    mustRedact: ["+965 9988 7766", "+971-50-123-4567", "+974 3312 4455", "+852 9123 4567", "+65 8123 4567"],
  },
  {
    name: "old-format passport and lowercase label",
    input: "passport number: EB7654321, issued Manila.",
    mustRedact: ["EB7654321"],
    mustKeep: ["issued Manila"],
  },
  {
    name: "PH government IDs",
    input: "SSS 34-1234567-8, PhilHealth 12-345678901-2, TIN 123-456-789-000, Pag-IBIG 1234-5678-9012, UMID 0111-1234567-8",
    mustRedact: ["34-1234567-8", "12-345678901-2", "123-456-789-000", "1234-5678-9012", "0111-1234567-8"],
  },
  {
    name: "Iqama and civil ID (long numbers)",
    input: "Iqama No: 2456789012. Civil ID: 287051512345.",
    mustRedact: ["2456789012", "287051512345"],
  },
  {
    name: "email",
    input: "Send documents to maria.santos1990@gmail.com and copy hr@goldenhands-recruit.ph",
    mustRedact: ["maria.santos1990@gmail.com", "hr@goldenhands-recruit.ph"],
  },
  {
    name: "IBAN",
    input: "Salary will be deposited to IBAN SA03 8000 0000 6080 1016 7519.",
    mustRedact: ["SA03 8000 0000 6080 1016 7519"],
    mustKeep: ["Salary will be deposited"],
  },
  {
    name: "date of birth + birthplace",
    input: "Date of Birth: March 3, 1994\nPlace of Birth: Brgy. San Isidro, Tacloban City",
    mustRedact: ["March 3, 1994", "Brgy. San Isidro, Tacloban City"],
  },
  {
    name: "agency / company name is NOT personal data (needed for license check)",
    input: "Agency Name: Golden Hands Manpower Services Inc.\nCompany Name: Al Noor Cleaning Co.",
    mustRedact: [],
    mustKeep: ["Golden Hands Manpower Services Inc.", "Al Noor Cleaning Co."],
  },
  {
    name: "blank form fields are left alone",
    input: "Name of Worker: ____________\nPassport No.: __________",
    mustRedact: [],
    mustKeep: ["____________"],
  },
  {
    name: "Tagalog labels",
    input: "Pangalan: Rowena Bautista\nTirahan: 45 Rizal St., Brgy. Poblacion, Dumaguete\nKaarawan: 12/05/1990",
    mustRedact: ["Rowena Bautista", "45 Rizal St., Brgy. Poblacion, Dumaguete", "12/05/1990"],
  },
  {
    name: "two fields on one line",
    input: "Name: Ana Reyes    Age: 29    Civil Status: Single",
    mustRedact: ["Ana Reyes"],
    mustKeep: ["Age: 29", "Civil Status: Single"],
  },
  {
    name: "recruiter chat (no labels, phone + amount)",
    input: "Hi ma'am! Placement fee 35,000 lang po, GCash to 0927 555 1234. Alis agad next month, tourist visa muna.",
    mustRedact: ["0927 555 1234"],
    mustKeep: ["35,000", "tourist visa", "Placement fee"],
  },
  {
    name: "legal citations are not IDs",
    input: "Pursuant to RA 8042 as amended by RA 10022 and DMW MC No. 09-2022, Section 3.",
    mustRedact: [],
    mustKeep: ["RA 8042", "RA 10022", "09-2022"],
  },
  {
    name: "dates and money are not IDs",
    input: "Effective 2026-11-19 until 2028-11-18. Total: PHP 1,250,000.00",
    mustRedact: [],
    mustKeep: ["2026-11-19", "2028-11-18", "1,250,000.00"],
  },
  {
    name: "sponsor/kafeel (Gulf)",
    input: "Sponsor's Name: Abdullah bin Saeed Al-Harbi\nThe sponsor Abdullah shall provide food and lodging.",
    mustRedact: ["Abdullah bin Saeed Al-Harbi", "Abdullah"],
    mustKeep: ["food and lodging"],
  },
  {
    name: "signature block",
    input: "Signature over Printed Name: Lorna P. Villanueva\nWitness: ____",
    mustRedact: ["Lorna P. Villanueva"],
  },
  {
    name: "next of kin with relationship",
    input: "Next of Kin: Pedro Santos (husband), +63 917 000 1111",
    mustRedact: ["Pedro Santos", "+63 917 000 1111"],
    mustKeep: ["husband"],
  },
  {
    name: "landline",
    input: "Agency office: (02) 8123-4567",
    mustRedact: ["(02) 8123-4567"],
  },
  {
    name: "curly apostrophe label",
    input: "Employer’s Name: Fatima Al-Sabah",
    mustRedact: ["Fatima Al-Sabah"],
  },
  {
    name: "visa and OEC numbers",
    input: "Visa No: 1123456789\nOEC No.: 2026-PH-778812",
    mustRedact: ["1123456789", "2026-PH-778812"],
  },
  {
    name: "bank account label",
    input: "Account No.: 0012-3456-78  Bank: BDO",
    mustRedact: ["0012-3456-78"],
    mustKeep: ["BDO"],
  },
  {
    name: "common words that are also names must not be over-redacted",
    input: "Name of Worker: Joy May Grace Hope\nThe employer may terminate. Workers hope for fair treatment.",
    mustRedact: ["Joy May Grace Hope"],
    mustKeep: ["The employer may terminate", "hope for fair treatment"],
  },
  {
    name: "contract clause text survives intact",
    input: "The employer shall not withhold the worker's passport or travel documents. The worker shall have at least eight (8) hours of continuous rest daily.",
    mustRedact: [],
    mustKeep: ["shall not withhold the worker's passport", "eight (8) hours of continuous rest"],
  },
  {
    name: "address label with employer variant",
    input: "Present Address: Blk 5 Lot 7, Camella Homes, Bacoor, Cavite\nEmployer's Address: Block 3, Salmiya, Kuwait",
    mustRedact: ["Blk 5 Lot 7, Camella Homes, Bacoor, Cavite", "Block 3, Salmiya, Kuwait"],
  },
  {
    name: "existing placeholders are untouched (idempotence)",
    input: "Name of Worker: [[PERSON_1]]\nPassport No.: [[PASSPORT_1]]",
    mustRedact: [],
    mustKeep: ["[[PERSON_1]]", "[[PASSPORT_1]]"],
  },
  {
    name: "ñ and accented names",
    input: "Name of Worker: Ma. Teresa Peñaflor\nPeñaflor shall report to the employer.",
    mustRedact: ["Ma. Teresa Peñaflor", "Peñaflor"],
  },
];

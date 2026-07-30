import type { TermsSection } from './terms-sections.types';

export type { TermsSection, TermsSubsection } from './terms-sections.types';

export const TERMS_EFFECTIVE_DATE = '11 June 2026';

export const TERMS_SECTIONS: TermsSection[] = [
  {
    id: 'intro',
    title: 'Terms and Conditions',
    paragraphs: [
      'Please read these Terms and Conditions carefully before using the Platform. By creating an account, accessing the Platform, or using any of its services, you agree to be bound by these Terms and Conditions.',
    ],
  },
  {
    id: '1',
    title: '1. Acceptance of Terms',
    intro: 'By registering on the Platform, you confirm that:',
    bullets: [
      'You are at least 18 years of age.',
      'You are legally eligible to marry under the laws applicable to you.',
      'All information provided by you is true, accurate, current, and complete.',
      'You agree to comply with these Terms and Conditions.',
    ],
  },
  {
    id: '2',
    title: '2. Purpose of the Platform',
    intro: 'The Platform is intended solely for individuals and families seeking lawful matrimonial alliances.',
    paragraphs: ['The Platform:'],
    bullets: [
      'Is not a dating application.',
      'Is not intended for casual relationships.',
      'Does not guarantee a successful match or marriage.',
      'Acts only as an intermediary to facilitate introductions.',
    ],
  },
  {
    id: '3',
    title: '3. Account Registration',
    intro: 'You agree that:',
    bullets: [
      'You will create only one account for yourself or for a family member with their knowledge and consent.',
      'You will not impersonate another person.',
      'You will maintain the confidentiality of your login credentials.',
      'You are responsible for all activities conducted through your account.',
    ],
  },
  {
    id: '4',
    title: '4. Accuracy of Information',
    intro: 'You represent and warrant that:',
    bullets: [
      'Your age and marital status are accurate.',
      'Educational qualifications are genuine.',
      'Professional information is truthful.',
      'Family details are accurate to the best of your knowledge.',
      'Any verification documents submitted are authentic.',
    ],
    paragraphs: [
      'Providing false information may result in suspension or permanent termination of your account.',
    ],
  },
  {
    id: '5',
    title: '5. Progressive Privacy and Information Disclosure',
    intro:
      'The Platform operates using a Mutual Consent Information Disclosure System.',
    subsections: [
      {
        title: 'Level 0 – Public Discovery',
        paragraphs: [
          'Users may only view limited information, including:',
          'No identifying information will be disclosed.',
        ],
        bullets: [
          'Age',
          'Religion',
          'Marital status',
          'Education level',
          'Profession category',
          'District',
          'Verification badges',
          'Profile introduction',
        ],
      },
      {
        title: 'Level 1 – Mutual Interest',
        paragraphs: [
          'When both parties mutually agree, users may access expanded profile details and communicate through in-platform messaging.',
          'Users agree that they shall not attempt to identify, contact, or investigate the other party outside the Platform.',
        ],
      },
      {
        title: 'Level 2 – Compatibility Review',
        paragraphs: ['Upon mutual consent, additional information, including photographs and family background information, may be disclosed.'],
        bullets: [
          'Photos shall not be downloaded, copied, or shared.',
          'Family information shall remain confidential.',
          'Information obtained shall only be used for matrimonial purposes.',
        ],
      },
      {
        title: 'Level 3 – Serious Marriage Consideration',
        paragraphs: [
          'Upon mutual consent, further biodata and family-identifying information may be disclosed.',
          'Users may participate in voice calls, participate in video calls, and request marriage consultant services.',
          'Even at this level, the Platform shall not disclose users\' phone numbers or email addresses.',
        ],
      },
    ],
  },
  {
    id: '6',
    title: '6. Confidentiality Obligations',
    intro: 'Users agree that they shall not:',
    bullets: [
      'Screenshot profiles for distribution.',
      'Share profile information with unauthorized persons.',
      'Publish photos or biodata on social media.',
      'Circulate any information obtained through the Platform.',
    ],
    paragraphs: [
      'Any breach may result in legal action and account termination.',
    ],
  },
  {
    id: '7',
    title: '7. Prohibited Activities',
    intro: 'Users shall not:',
    bullets: [
      'Harass, threaten, abuse, or intimidate other users.',
      'Solicit money or financial assistance.',
      'Request gifts, loans, or investments.',
      'Promote businesses or unrelated services.',
      'Use the Platform for fraudulent activities.',
      'Upload offensive, obscene, or unlawful content.',
      'Misrepresent their identity or marital status.',
    ],
  },
  {
    id: '8',
    title: '8. Communication Rules',
    intro: 'All communication shall remain within the Platform.',
    paragraphs: ['Users acknowledge that:'],
    bullets: [
      'Phone numbers will never be disclosed by the Platform.',
      'Email addresses will never be disclosed by the Platform.',
      'Attempts to circumvent the Platform\'s privacy controls are prohibited.',
    ],
  },
  {
    id: '9',
    title: '9. Verification',
    intro: 'The Platform may require:',
    bullets: [
      'Mobile verification.',
      'Email verification.',
      'National ID verification.',
      'Facial verification.',
      'Educational verification.',
      'Professional verification.',
    ],
    paragraphs: [
      'Verification badges indicate that certain information has been reviewed; however, they do not constitute a guarantee of suitability.',
    ],
  },
  {
    id: '10',
    title: '10. Marriage Consultant Services',
    intro: 'Marriage consultants are facilitators only.',
    paragraphs: ['Users acknowledge that:'],
    bullets: [
      'Consultants do not make decisions on behalf of users.',
      'Consultants do not guarantee compatibility or marriage outcomes.',
      'Users remain solely responsible for their decisions.',
    ],
  },
  {
    id: '11',
    title: '11. Subscription and Payments',
    intro: 'Users agree that:',
    bullets: [
      'Subscription fees are payable in advance.',
      'Services are digital and service-based unless a separate item is explicitly stated; there is no physical product shipping by default.',
      'Paid membership activation is typically instant to 24 hours after payment confirmation, depending on payment gateway status (see Service Delivery / Activation Timeline on the website).',
      'Fees are generally non-refundable once services are activated.',
      'Promotional offers may be subject to separate conditions.',
      'Premium features may change from time to time.',
    ],
    paragraphs: [
      'Refunds, if applicable, shall be governed by the Platform\'s Refund and Cancellation Policy.',
      'Delivery and activation timelines for registration, biodata review, verification, interest, and family contact are set out in the Service Delivery / Activation Timeline policy on the website.',
    ],
  },
  {
    id: '12',
    title: '12. Safety Disclaimer',
    paragraphs: ['The Platform undertakes reasonable efforts to verify users.', 'However:'],
    bullets: [
      'The Platform cannot guarantee the authenticity of every user.',
      'Users should exercise independent judgment.',
      'Families are encouraged to conduct their own due diligence before marriage decisions.',
    ],
  },
  {
    id: '13',
    title: '13. Reporting and Complaints',
    intro: 'Users may report:',
    bullets: [
      'Fraudulent profiles.',
      'Harassment.',
      'Misrepresentation.',
      'Inappropriate conduct.',
    ],
    paragraphs: [
      'The Platform reserves the right to investigate complaints and take appropriate action.',
    ],
  },
  {
    id: '14',
    title: '14. Suspension and Termination',
    intro: 'The Platform may suspend or terminate accounts that:',
    bullets: [
      'Violate these Terms.',
      'Provide false information.',
      'Engage in abusive conduct.',
      'Attempt to bypass privacy protections.',
      'Misuse Platform services.',
    ],
    paragraphs: [
      'No compensation shall be payable upon termination for such violations.',
    ],
  },
  {
    id: '15',
    title: '15. Limitation of Liability',
    intro: 'The Platform shall not be liable for:',
    bullets: [
      'Decisions made by users.',
      'Marriage outcomes.',
      'Losses arising from user interactions.',
      'Misrepresentations made by users.',
      'Indirect or consequential damages.',
    ],
    paragraphs: [
      'The Platform\'s liability, if any, shall be limited to the subscription amount paid by the user.',
    ],
  },
  {
    id: '16',
    title: '16. Privacy',
    paragraphs: [
      'The Platform will process personal information in accordance with its Privacy Policy.',
      'Users consent to the collection, processing, storage, and use of their information for matrimonial services.',
    ],
  },
  {
    id: '17',
    title: '17. Governing Law',
    paragraphs: [
      'These Terms and Conditions shall be governed by the laws of the People\'s Republic of Bangladesh.',
      'Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts of Bangladesh.',
    ],
  },
  {
    id: '18',
    title: '18. Changes to Terms',
    paragraphs: [
      'The Platform reserves the right to amend these Terms from time to time.',
      'Continued use of the Platform following such changes constitutes acceptance of the revised Terms.',
    ],
  },
  {
    id: '19',
    title: '19. Declaration',
    intro: 'By selecting "I Agree," I confirm that:',
    bullets: [
      'I have read and understood these Terms and Conditions.',
      'I agree to comply with them.',
      'I am legally eligible to marry.',
      'I understand the Platform\'s progressive privacy model.',
      'I will use the Platform solely for lawful matrimonial purposes.',
    ],
  },
];

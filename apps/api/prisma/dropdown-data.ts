export type DropdownSeedOption = {
  value: string;
  label: string;
  labelBn: string;
};

export const DROPDOWN_SEED: {
  category: string;
  options: DropdownSeedOption[];
}[] = [
  {
    category: 'gender',
    options: [
      { value: 'male', label: 'Male', labelBn: 'পুরুষ' },
      { value: 'female', label: 'Female', labelBn: 'মহিলা' },
    ],
  },
  {
    category: 'marital_status',
    options: [
      { value: 'never_married', label: 'Never Married', labelBn: 'অবিবাহিত' },
      { value: 'married', label: 'Married', labelBn: 'বিবাহিত' },
      { value: 'divorced', label: 'Divorced', labelBn: 'তালাকপ্রাপ্ত' },
      { value: 'widowed', label: 'Widowed', labelBn: 'বিধবা/বিপত্নীক' },
    ],
  },
  {
    category: 'religion',
    options: [
      { value: 'islam', label: 'Islam', labelBn: 'ইসলাম' },
      { value: 'hinduism', label: 'Hinduism', labelBn: 'হিন্দু' },
      { value: 'buddhism', label: 'Buddhism', labelBn: 'বৌদ্ধ' },
      { value: 'christianity', label: 'Christianity', labelBn: 'খ্রিস্টান' },
      { value: 'other', label: 'Other', labelBn: 'অন্যান্য' },
    ],
  },
  {
    category: 'complexion',
    options: [
      { value: 'fair', label: 'Fair', labelBn: 'ফর্সা' },
      { value: 'wheatish', label: 'Wheatish', labelBn: 'শ্যামলা' },
      { value: 'medium', label: 'Medium', labelBn: 'মাঝারি' },
      { value: 'dark', label: 'Dark', labelBn: 'কালো' },
    ],
  },
  {
    category: 'education',
    options: [
      { value: 'ssc', label: 'SSC', labelBn: 'এসএসসি' },
      { value: 'hsc', label: 'HSC', labelBn: 'এইচএসসি' },
      { value: 'bachelors', label: "Bachelor's", labelBn: 'স্নাতক' },
      { value: 'masters', label: "Master's", labelBn: 'স্নাতকোত্তর' },
      { value: 'phd', label: 'PhD', labelBn: 'পিএইচডি' },
      { value: 'other', label: 'Other', labelBn: 'অন্যান্য' },
    ],
  },
  {
    category: 'education_medium',
    options: [
      {
        value: 'bangla_medium_nctb',
        label: 'Bangla Medium (NCTB)',
        labelBn: 'বাংলা মাধ্যম (এনসিটিবি)',
      },
      {
        value: 'english_medium_nctb',
        label: 'English Medium (NCTB)',
        labelBn: 'ইংরেজি মাধ্যম (এনসিটিবি)',
      },
      {
        value: 'international_english_medium',
        label: 'International English Medium',
        labelBn: 'আন্তর্জাতিক ইংরেজি মাধ্যম',
      },
      {
        value: 'alia_madrasha',
        label: 'Alia Madrasha',
        labelBn: 'আলিয়া মাদ্রাসা',
      },
      {
        value: 'qawmi_madrasha',
        label: 'Qawmi Madrasha',
        labelBn: 'কওমি মাদ্রাসা',
      },
    ],
  },
  {
    category: 'education_subject',
    options: [
      { value: 'science', label: 'Science', labelBn: 'বিজ্ঞান' },
      { value: 'arts', label: 'Arts', labelBn: 'মানবিক' },
      { value: 'commerce', label: 'Commerce', labelBn: 'বাণিজ্য' },
    ],
  },
  {
    category: 'occupation',
    options: [
      { value: 'government', label: 'Government Service', labelBn: 'সরকারি চাকরি' },
      { value: 'private', label: 'Private Job', labelBn: 'বেসরকারি চাকরি' },
      { value: 'business', label: 'Business', labelBn: 'ব্যবসা' },
      { value: 'doctor', label: 'Doctor', labelBn: 'ডাক্তার' },
      { value: 'engineer', label: 'Engineer', labelBn: 'প্রকৌশলী' },
      { value: 'teacher', label: 'Teacher', labelBn: 'শিক্ষক' },
      { value: 'student', label: 'Student', labelBn: 'শিক্ষার্থী' },
      { value: 'homemaker', label: 'Homemaker', labelBn: 'গৃহিণী' },
      { value: 'other', label: 'Other', labelBn: 'অন্যান্য' },
    ],
  },
  {
    category: 'income_range',
    options: [
      { value: 'below_25k', label: 'Below ৳25,000', labelBn: '৳২৫,০০০ এর নিচে' },
      { value: '25k_50k', label: '৳25,000 – ৳50,000', labelBn: '৳২৫,০০০ – ৳৫০,০০০' },
      { value: '50k_100k', label: '৳50,000 – ৳1,00,000', labelBn: '৳৫০,০০০ – ৳১,০০,০০০' },
      { value: '100k_200k', label: '৳1,00,000 – ৳2,00,000', labelBn: '৳১,০০,০০০ – ৳২,০০,০০০' },
      { value: 'above_200k', label: 'Above ৳2,00,000', labelBn: '৳২,০০,০০০ এর উপরে' },
    ],
  },
  {
    category: 'division',
    options: [
      { value: 'dhaka', label: 'Dhaka', labelBn: 'ঢাকা' },
      { value: 'chattogram', label: 'Chattogram', labelBn: 'চট্টগ্রাম' },
      { value: 'rajshahi', label: 'Rajshahi', labelBn: 'রাজশাহী' },
      { value: 'khulna', label: 'Khulna', labelBn: 'খুলনা' },
      { value: 'barishal', label: 'Barishal', labelBn: 'বরিশাল' },
      { value: 'sylhet', label: 'Sylhet', labelBn: 'সিলেট' },
      { value: 'rangpur', label: 'Rangpur', labelBn: 'রংপুর' },
      { value: 'mymensingh', label: 'Mymensingh', labelBn: 'ময়মনসিংহ' },
    ],
  },
  {
    category: 'family_type',
    options: [
      { value: 'nuclear', label: 'Nuclear', labelBn: 'একক পরিবার' },
      { value: 'joint', label: 'Joint', labelBn: 'যৌথ পরিবার' },
      { value: 'extended', label: 'Extended', labelBn: 'বর্ধিত পরিবার' },
    ],
  },
  {
    category: 'family_status',
    options: [
      { value: 'middle_class', label: 'Middle Class', labelBn: 'মধ্যবিত্ত' },
      { value: 'upper_middle', label: 'Upper Middle Class', labelBn: 'উচ্চ মধ্যবিত্ত' },
      { value: 'affluent', label: 'Affluent', labelBn: 'আধুনিক/সচ্ছল' },
    ],
  },
  {
    category: 'sibling_relationship',
    options: [
      { value: 'brother', label: 'Brother', labelBn: 'ভাই' },
      { value: 'sister', label: 'Sister', labelBn: 'বোন' },
    ],
  },
  {
    category: 'has_beard',
    options: [
      { value: 'yes', label: 'Yes', labelBn: 'হ্যাঁ' },
      { value: 'no', label: 'No', labelBn: 'না' },
      {
        value: 'prefer_not_to_say',
        label: 'Do not want to say',
        labelBn: 'বলতে চাই না',
      },
    ],
  },
  {
    category: 'smoking_habit',
    options: [
      { value: 'yes', label: 'Yes', labelBn: 'হ্যাঁ' },
      { value: 'no', label: 'No', labelBn: 'না' },
      {
        value: 'prefer_not_to_share',
        label: 'Do not want to share',
        labelBn: 'শেয়ার করতে চাই না',
      },
    ],
  },
  {
    category: 'prayer_practice',
    options: [
      {
        value: 'five_times_regularly',
        label: 'Pray 5 times regularly',
        labelBn: 'নিয়মিত দিনে ৫ ওয়াক্ত নামাজ',
      },
      {
        value: 'occasionally',
        label: 'Pray occasionally',
        labelBn: 'মাঝে মাঝে নামাজ',
      },
      {
        value: 'friday_only',
        label: 'Pray only on Friday',
        labelBn: 'শুধু জুমার নামাজ',
      },
      { value: 'never', label: 'Never pray', labelBn: 'নামাজ পড়ি না' },
      {
        value: 'prefer_not_to_say',
        label: 'Do not want to share',
        labelBn: 'শেয়ার করতে চাই না',
      },
    ],
  },
  {
    category: 'is_alive',
    options: [
      { value: 'yes', label: 'Yes', labelBn: 'হ্যাঁ' },
      { value: 'no', label: 'No', labelBn: 'না' },
      {
        value: 'prefer_not_to_say',
        label: 'Do not want to share',
        labelBn: 'শেয়ার করতে চাই না',
      },
    ],
  },
  {
    category: 'beard_preference',
    options: [
      { value: 'yes', label: 'Yes', labelBn: 'হ্যাঁ' },
      { value: 'no', label: 'No', labelBn: 'না' },
      { value: 'no_opinion', label: 'No opinion', labelBn: 'কোনো মতামত নেই' },
    ],
  },
  {
    category: 'prayer_preference',
    options: [
      {
        value: 'regular_five_times',
        label: 'Regular 5 times',
        labelBn: 'নিয়মিত ৫ ওয়াক্ত',
      },
      { value: 'no_opinion', label: 'No opinion', labelBn: 'কোনো মতামত নেই' },
      {
        value: 'modestly_practicing',
        label: 'Modestly practicing',
        labelBn: 'মাঝারি অনুশীলন',
      },
    ],
  },
  {
    category: 'hijab_practice',
    options: [
      {
        value: 'wear_regularly',
        label: 'I wear Hijab regularly',
        labelBn: 'নিয়মিত হিজাব পরি',
      },
      {
        value: 'wear_occasionally',
        label: 'I wear Hijab occasionally',
        labelBn: 'মাঝে মাঝে হিজাব পরি',
      },
      {
        value: 'never_wear',
        label: 'I never wear Hijab',
        labelBn: 'হিজাব পরি না',
      },
      {
        value: 'intend_to_wear',
        label: 'I intend to wear Hijab',
        labelBn: 'হিজাব পরার ইচ্ছা আছে',
      },
    ],
  },
  {
    category: 'hijab_preference',
    options: [
      {
        value: 'regular_hijabi_partner',
        label: 'Want regular Hijabi partner',
        labelBn: 'নিয়মিত হিজাব পরা সঙ্গী চাই',
      },
      {
        value: 'irregular_hijabi_ok',
        label: 'Irregular Hijabi partner is ok',
        labelBn: 'অনিয়মিত হিজাব পরা সঙ্গী গ্রহণযোগ্য',
      },
      {
        value: 'no_hijab_needed',
        label: 'No need to wear Hijab',
        labelBn: 'হিজাব পরার প্রয়োজন নেই',
      },
      {
        value: 'intention_to_wear_hijab',
        label: 'Should have intention to wear Hijab',
        labelBn: 'হিজাব পরার ইচ্ছা থাকা উচিত',
      },
    ],
  },
  {
    category: 'expected_marriage_timeline',
    options: [
      { value: 'one_year', label: '1 Year', labelBn: '১ বছর' },
      { value: 'two_years', label: '2 Years', labelBn: '২ বছর' },
      {
        value: 'as_soon_as_possible',
        label: 'As soon as possible',
        labelBn: 'যত তাড়াতাড়ি সম্ভব',
      },
    ],
  },
  {
    category: 'dowry_expectation',
    options: [
      { value: 'yes', label: 'Yes', labelBn: 'হ্যাঁ' },
      { value: 'no', label: 'No', labelBn: 'না' },
      {
        value: 'can_be_discussed',
        label: 'Can be discussed and negotiated',
        labelBn: 'আলোচনা ও negotiation করা যাবে',
      },
      {
        value: 'prefer_not_to_share',
        label: 'Not willing to share now',
        labelBn: 'এখন শেয়ার করতে ইচ্ছুক নই',
      },
    ],
  },
  {
    category: 'wedding_ceremony_preference',
    options: [
      { value: 'simple', label: 'Simple', labelBn: 'সাদামাটা' },
      { value: 'modest', label: 'Modest', labelBn: 'মাঝারি' },
      { value: 'grand', label: 'Grand', labelBn: 'বড় আয়োজন' },
      {
        value: 'can_be_discussed_later',
        label: 'Can be discussed later',
        labelBn: 'পরে আলোচনা করা যাবে',
      },
    ],
  },
  {
    category: 'expected_parenthood_timeline',
    options: [
      {
        value: 'within_one_year',
        label: 'Within a year',
        labelBn: '১ বছরের মধ্যে',
      },
      {
        value: 'within_two_years',
        label: 'Within 2 years',
        labelBn: '২ বছরের মধ্যে',
      },
      {
        value: 'within_three_four_years',
        label: 'Within 3–4 years',
        labelBn: '৩–৪ বছরের মধ্যে',
      },
      {
        value: 'can_be_agreed_later',
        label: 'Can be agreed later',
        labelBn: 'পরে সিদ্ধান্ত নেওয়া যাবে',
      },
    ],
  },
  {
    category: 'living_arrangements_male',
    options: [
      {
        value: 'live_with_my_family',
        label: 'Live with my family',
        labelBn: 'আমার পরিবারের সাথে থাকব',
      },
      {
        value: 'live_away_from_my_family',
        label: 'Live away from my family',
        labelBn: 'আমার পরিবার থেকে আলাদা থাকব',
      },
      {
        value: 'can_be_discussed_later',
        label: 'Can be discussed and agreed later',
        labelBn: 'পরে আলোচনা করে সিদ্ধান্ত নেওয়া যাবে',
      },
      {
        value: 'live_with_family_2_3_years',
        label: 'Live with my family for 2–3 years',
        labelBn: '২–৩ বছর আমার পরিবারের সাথে থাকব',
      },
      {
        value: 'other_arrangements',
        label: 'Other arrangements',
        labelBn: 'অন্যান্য ব্যবস্থা',
      },
    ],
  },
  {
    category: 'living_arrangements_female',
    options: [
      {
        value: 'dont_intend_live_with_in_laws',
        label: "I don't intend to live with in-laws",
        labelBn: 'শ্বশুরবাড়িতে থাকার ইচ্ছা নেই',
      },
      {
        value: 'intend_live_with_in_laws',
        label: 'I intend to live with in-laws',
        labelBn: 'শ্বশুরবাড়িতে থাকার ইচ্ছা আছে',
      },
      {
        value: 'no_preference',
        label: 'I have no preference',
        labelBn: 'কোনো পছন্দ নেই',
      },
      {
        value: 'live_separately_after_2_3_years',
        label: 'Intend to live separately away from in-laws after 2–3 years',
        labelBn: '২–৩ বছর পর শ্বশুরবাড়ি থেকে আলাদা থাকার ইচ্ছা',
      },
    ],
  },
];

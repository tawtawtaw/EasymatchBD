"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DROPDOWN_SEED = void 0;
exports.DROPDOWN_SEED = [
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
];
//# sourceMappingURL=dropdown-data.js.map
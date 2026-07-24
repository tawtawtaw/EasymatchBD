import type { DropdownSeedOption } from './dropdown-data';

export type DistrictSeedOption = DropdownSeedOption & {
  parentValue: string;
};

export const DISTRICT_SEED: DistrictSeedOption[] = [
  // Dhaka
  { value: 'dhaka', label: 'Dhaka', labelBn: 'ঢাকা', parentValue: 'dhaka' },
  { value: 'gazipur', label: 'Gazipur', labelBn: 'গাজীপুর', parentValue: 'dhaka' },
  { value: 'kishoreganj', label: 'Kishoreganj', labelBn: 'কিশোরগঞ', parentValue: 'dhaka' },
  { value: 'manikganj', label: 'Manikganj', labelBn: 'মানিকগঞ্জ', parentValue: 'dhaka' },
  { value: 'munshiganj', label: 'Munshiganj', labelBn: 'মুন্সিগঞ্জ', parentValue: 'dhaka' },
  { value: 'narayanganj', label: 'Narayanganj', labelBn: 'নারায়ণগঞ্জ', parentValue: 'dhaka' },
  { value: 'narsingdi', label: 'Narsingdi', labelBn: 'নরসিংদী', parentValue: 'dhaka' },
  { value: 'tangail', label: 'Tangail', labelBn: 'টাঙ্গাইল', parentValue: 'dhaka' },
  { value: 'faridpur', label: 'Faridpur', labelBn: 'ফরিদপুর', parentValue: 'dhaka' },
  { value: 'gopalganj', label: 'Gopalganj', labelBn: 'গোপালগঞ্জ', parentValue: 'dhaka' },
  { value: 'madaripur', label: 'Madaripur', labelBn: 'মাদারীপুর', parentValue: 'dhaka' },
  { value: 'rajbari', label: 'Rajbari', labelBn: 'রাজবাড়ী', parentValue: 'dhaka' },
  { value: 'shariatpur', label: 'Shariatpur', labelBn: 'শরীয়তপুর', parentValue: 'dhaka' },
  // Chattogram
  { value: 'chattogram', label: 'Chattogram', labelBn: 'চট্টগ্রাম', parentValue: 'chattogram' },
  { value: 'bandarban', label: 'Bandarban', labelBn: 'বান্দরবান', parentValue: 'chattogram' },
  { value: 'brahmanbaria', label: 'Brahmanbaria', labelBn: 'ব্রাহ্মণবাড়িয়া', parentValue: 'chattogram' },
  { value: 'chandpur', label: 'Chandpur', labelBn: 'চাঁদপুর', parentValue: 'chattogram' },
  { value: 'coxs_bazar', label: "Cox's Bazar", labelBn: 'কক্সবাজার', parentValue: 'chattogram' },
  { value: 'cumilla', label: 'Cumilla', labelBn: 'কুমিল্লা', parentValue: 'chattogram' },
  { value: 'feni', label: 'Feni', labelBn: 'ফেনী', parentValue: 'chattogram' },
  { value: 'khagrachhari', label: 'Khagrachhari', labelBn: 'খাগড়াছড়ি', parentValue: 'chattogram' },
  { value: 'lakshmipur', label: 'Lakshmipur', labelBn: 'লক্ষ্মীপুর', parentValue: 'chattogram' },
  { value: 'noakhali', label: 'Noakhali', labelBn: 'নোয়াখালী', parentValue: 'chattogram' },
  { value: 'rangamati', label: 'Rangamati', labelBn: 'রাঙ্গামাটি', parentValue: 'chattogram' },
  // Rajshahi
  { value: 'rajshahi', label: 'Rajshahi', labelBn: 'রাজশাহী', parentValue: 'rajshahi' },
  { value: 'bogura', label: 'Bogura', labelBn: 'বগুড়া', parentValue: 'rajshahi' },
  { value: 'joypurhat', label: 'Joypurhat', labelBn: 'জয়পুরহাট', parentValue: 'rajshahi' },
  { value: 'naogaon', label: 'Naogaon', labelBn: 'নওগাঁ', parentValue: 'rajshahi' },
  { value: 'natore', label: 'Natore', labelBn: 'নাটোর', parentValue: 'rajshahi' },
  { value: 'chapainawabganj', label: 'Chapainawabganj', labelBn: 'চাঁপাইনবাবগঞ্জ', parentValue: 'rajshahi' },
  { value: 'pabna', label: 'Pabna', labelBn: 'পাবনা', parentValue: 'rajshahi' },
  { value: 'sirajganj', label: 'Sirajganj', labelBn: 'সিরাজগঞ্জ', parentValue: 'rajshahi' },
  // Khulna
  { value: 'khulna', label: 'Khulna', labelBn: 'খুলনা', parentValue: 'khulna' },
  { value: 'bagerhat', label: 'Bagerhat', labelBn: 'বাগেরহাট', parentValue: 'khulna' },
  { value: 'chuadanga', label: 'Chuadanga', labelBn: 'চুয়াডাঙ্গা', parentValue: 'khulna' },
  { value: 'jashore', label: 'Jashore', labelBn: 'যশোর', parentValue: 'khulna' },
  { value: 'jhenaidah', label: 'Jhenaidah', labelBn: 'ঝিনাইদহ', parentValue: 'khulna' },
  { value: 'kushtia', label: 'Kushtia', labelBn: 'কুষ্টিয়া', parentValue: 'khulna' },
  { value: 'magura', label: 'Magura', labelBn: 'মাগুরা', parentValue: 'khulna' },
  { value: 'meherpur', label: 'Meherpur', labelBn: 'মেহেরপুর', parentValue: 'khulna' },
  { value: 'narail', label: 'Narail', labelBn: 'নড়াইল', parentValue: 'khulna' },
  { value: 'satkhira', label: 'Satkhira', labelBn: 'সাতক্ষীরা', parentValue: 'khulna' },
  // Barishal
  { value: 'barishal', label: 'Barishal', labelBn: 'বরিশাল', parentValue: 'barishal' },
  { value: 'barguna', label: 'Barguna', labelBn: 'বরগুনা', parentValue: 'barishal' },
  { value: 'bhola', label: 'Bhola', labelBn: 'ভোলা', parentValue: 'barishal' },
  { value: 'jhalokati', label: 'Jhalokati', labelBn: 'ঝালকাঠি', parentValue: 'barishal' },
  { value: 'patuakhali', label: 'Patuakhali', labelBn: 'পটুয়াখালী', parentValue: 'barishal' },
  { value: 'pirojpur', label: 'Pirojpur', labelBn: 'পিরোজপুর', parentValue: 'barishal' },
  // Sylhet
  { value: 'sylhet', label: 'Sylhet', labelBn: 'সিলেট', parentValue: 'sylhet' },
  { value: 'habiganj', label: 'Habiganj', labelBn: 'হবিগঞ্জ', parentValue: 'sylhet' },
  { value: 'moulvibazar', label: 'Moulvibazar', labelBn: 'মৌলভীবাজার', parentValue: 'sylhet' },
  { value: 'sunamganj', label: 'Sunamganj', labelBn: 'সুনামগঞ্জ', parentValue: 'sylhet' },
  // Rangpur
  { value: 'rangpur', label: 'Rangpur', labelBn: 'রংপুর', parentValue: 'rangpur' },
  { value: 'dinajpur', label: 'Dinajpur', labelBn: 'দিনাজপুর', parentValue: 'rangpur' },
  { value: 'gaibandha', label: 'Gaibandha', labelBn: 'গাইবান্ধা', parentValue: 'rangpur' },
  { value: 'kurigram', label: 'Kurigram', labelBn: 'কুড়িগ্রাম', parentValue: 'rangpur' },
  { value: 'lalmonirhat', label: 'Lalmonirhat', labelBn: 'লালমনিরহাট', parentValue: 'rangpur' },
  { value: 'nilphamari', label: 'Nilphamari', labelBn: 'নীলফামারী', parentValue: 'rangpur' },
  { value: 'panchagarh', label: 'Panchagarh', labelBn: 'পঞ্চগড়', parentValue: 'rangpur' },
  { value: 'thakurgaon', label: 'Thakurgaon', labelBn: 'ঠাকুরগাঁও', parentValue: 'rangpur' },
  // Mymensingh
  { value: 'mymensingh', label: 'Mymensingh', labelBn: 'ময়মনসিংহ', parentValue: 'mymensingh' },
  { value: 'jamalpur', label: 'Jamalpur', labelBn: 'জামালপুর', parentValue: 'mymensingh' },
  { value: 'netrokona', label: 'Netrokona', labelBn: 'নেত্রকোণা', parentValue: 'mymensingh' },
  { value: 'sherpur', label: 'Sherpur', labelBn: 'শেরপুর', parentValue: 'mymensingh' },
];

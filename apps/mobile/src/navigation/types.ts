import type { ConsultantServiceType } from "@easymatch/shared";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { NavigatorScreenParams } from "@react-navigation/native";

export type AuthStackParamList = {
  OtpLogin: undefined;
  OtpVerify: { phone: string; devOtp?: string };
};

export type DiscoveryStackParamList = {
  DiscoveryList: undefined;
  DiscoveryProfile: { profileId: string; profileCode: string };
  DiscoveryCompare: { profileId: string; profileCode: string };
  SavedProfiles: undefined;
};

export type MessagesStackParamList = {
  MessagesList: undefined;
  VideoCalls: undefined;
  ChatThread: {
    connectionId: string;
    memberName: string;
    profileCode: string | null;
  };
  VideoCallRoom: {
    connectionId: string;
    callId: string;
    memberName: string;
    autoJoin?: boolean;
  };
};

export type ConnectionsTabKey = "incoming" | "outgoing" | "connected";

export type ProfileStackParamList = {
  ProfileHome: undefined;
  EditPersonal: undefined;
  EditFamily: undefined;
  EditMarital: undefined;
  EditPartner: undefined;
  ProfileMedia: undefined;
  BiodataExport: undefined;
  Membership: undefined;
  Settings: undefined;
  Complaints: { profileCode?: string; openForm?: boolean } | undefined;
  ComplaintDetail: { complaintId: string };
};

export type MainTabParamList = {
  Home: undefined;
  Discovery: NavigatorScreenParams<DiscoveryStackParamList>;
  Connections: { initialTab?: ConnectionsTabKey } | undefined;
  Messages: NavigatorScreenParams<MessagesStackParamList>;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
};

export type RootStackParamList = {
  Auth: undefined;
  Onboarding: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  MembershipCheckout: undefined;
  ConsultantCheckout: {
    connectionId: string;
    serviceType: ConsultantServiceType;
    memberNotes?: string;
  };
  ConsultantCase: { caseId: string };
};

export type OnboardingStackParamList = {
  TermsAcceptance: undefined;
  TermsDeclined: undefined;
  ProfileSetup: undefined;
  EditPersonal: undefined;
  EditFamily: undefined;
  EditMarital: undefined;
  EditPartner: undefined;
  ProfileMedia: undefined;
};

export type TermsAcceptanceScreenProps = NativeStackScreenProps<
  OnboardingStackParamList,
  "TermsAcceptance"
>;
export type TermsDeclinedScreenProps = NativeStackScreenProps<
  OnboardingStackParamList,
  "TermsDeclined"
>;
export type ProfileSetupScreenProps = NativeStackScreenProps<
  OnboardingStackParamList,
  "ProfileSetup"
>;

export type OtpLoginScreenProps = NativeStackScreenProps<AuthStackParamList, "OtpLogin">;
export type OtpVerifyScreenProps = NativeStackScreenProps<AuthStackParamList, "OtpVerify">;
export type DiscoveryListScreenProps = NativeStackScreenProps<
  DiscoveryStackParamList,
  "DiscoveryList"
>;
export type DiscoveryProfileScreenProps = NativeStackScreenProps<
  DiscoveryStackParamList,
  "DiscoveryProfile"
>;
export type ProfileCompareScreenProps = NativeStackScreenProps<
  DiscoveryStackParamList,
  "DiscoveryCompare"
>;
export type SavedProfilesScreenProps = NativeStackScreenProps<
  DiscoveryStackParamList,
  "SavedProfiles"
>;
export type MessagesListScreenProps = NativeStackScreenProps<
  MessagesStackParamList,
  "MessagesList"
>;
export type ChatThreadScreenProps = NativeStackScreenProps<
  MessagesStackParamList,
  "ChatThread"
>;
export type VideoCallsScreenProps = NativeStackScreenProps<
  MessagesStackParamList,
  "VideoCalls"
>;
export type VideoCallRoomScreenProps = NativeStackScreenProps<
  MessagesStackParamList,
  "VideoCallRoom"
>;
export type ProfileHomeScreenProps = NativeStackScreenProps<
  ProfileStackParamList,
  "ProfileHome"
>;
export type EditPersonalScreenProps = NativeStackScreenProps<
  ProfileStackParamList,
  "EditPersonal"
>;
export type EditFamilyScreenProps = NativeStackScreenProps<
  ProfileStackParamList,
  "EditFamily"
>;
export type EditMaritalScreenProps = NativeStackScreenProps<
  ProfileStackParamList,
  "EditMarital"
>;
export type EditPartnerScreenProps = NativeStackScreenProps<
  ProfileStackParamList,
  "EditPartner"
>;
export type ProfileMediaScreenProps = NativeStackScreenProps<
  ProfileStackParamList,
  "ProfileMedia"
>;
export type BiodataExportScreenProps = NativeStackScreenProps<
  ProfileStackParamList,
  "BiodataExport"
>;
export type MembershipScreenProps = NativeStackScreenProps<
  ProfileStackParamList,
  "Membership"
>;
export type SettingsScreenProps = NativeStackScreenProps<
  ProfileStackParamList,
  "Settings"
>;
export type ComplaintsScreenProps = NativeStackScreenProps<
  ProfileStackParamList,
  "Complaints"
>;
export type ComplaintDetailScreenProps = NativeStackScreenProps<
  ProfileStackParamList,
  "ComplaintDetail"
>;
export type MembershipCheckoutScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "MembershipCheckout"
>;
export type ConsultantCheckoutScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "ConsultantCheckout"
>;
export type ConsultantCaseScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "ConsultantCase"
>;

export type BiodataExportPayload = {
  profileCode: string;
  privacyLevel: number;
  generatedAt: string;
  personal: Record<string, unknown>;
  marital: Record<string, unknown> | null;
  family: Record<string, unknown> | null;
  siblings: Record<string, unknown>[] | null;
  paternalRelatives: Record<string, unknown>[] | null;
  maternalRelatives: Record<string, unknown>[] | null;
  partner: Record<string, unknown> | null;
  media: {
    primaryPhotoId: string | null;
    galleryPhotoIds: string[];
    isVerified: boolean;
    verifiedOnBehalf?: boolean;
    memberNidVerified?: boolean;
    phone: string | null;
  };
  hiddenFieldCount: number;
};

export type BiodataBootstrap = {
  termsAccepted: boolean;
  export: BiodataExportPayload | null;
  dropdowns: import("./dropdowns").DropdownMap | null;
};

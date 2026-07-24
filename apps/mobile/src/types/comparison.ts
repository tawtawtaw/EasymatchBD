import type {
  ComparisonCriterionKey,
  ComparisonDirectionResult,
  ComparisonRow,
  ComparisonStatus,
  MaritalAlignmentResult,
} from "@easymatch/shared";
import type { DiscoveryRelationship } from "./discovery";

export type ProfileComparison = {
  viewer: {
    profileId: string;
    profileCode: string;
    fullName: string | null;
  };
  other: {
    profileId: string;
    profileCode: string;
    fullName: string | null;
    isVerified: boolean;
  };
  relationship: DiscoveryRelationship;
  viewerPrivacyLevelToOther: number;
  otherPreferencesVisible: boolean;
  mutualScore: number;
  viewerToOther: ComparisonDirectionResult;
  otherToViewer: ComparisonDirectionResult;
  maritalAlignment: MaritalAlignmentResult;
};

export type { ComparisonCriterionKey, ComparisonRow, ComparisonStatus };

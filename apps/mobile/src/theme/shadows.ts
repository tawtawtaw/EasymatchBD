import { Platform, type ViewStyle } from "react-native";
import { colors } from "./colors";

/**
 * Soft lift shared by cards. Android draws shadows from elevation alone, while
 * iOS needs the shadow* set; tinting it rose stops the lift reading grey
 * against the rose background.
 */
export const cardShadow: ViewStyle =
  Platform.OS === "android"
    ? { elevation: 2 }
    : {
        shadowColor: colors.rose900,
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
      };

import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { colors } from "../theme/colors";

export const appStackScreenOptions: NativeStackNavigationOptions = {
  headerStyle: { backgroundColor: colors.rose900 },
  headerTintColor: colors.white,
  headerTitleStyle: { fontWeight: "700" },
  headerBackVisible: true,
  headerTitleAlign: "center",
};

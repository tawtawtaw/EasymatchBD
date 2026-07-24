import { createNativeStackNavigator } from "@react-navigation/native-stack";
import OtpLoginScreen from "../screens/auth/OtpLoginScreen";
import OtpVerifyScreen from "../screens/auth/OtpVerifyScreen";
import type { AuthStackParamList } from "./types";

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="OtpLogin" component={OtpLoginScreen} />
      <Stack.Screen name="OtpVerify" component={OtpVerifyScreen} />
    </Stack.Navigator>
  );
}

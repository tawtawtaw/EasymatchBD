import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AccountMenuButton } from "../components/AccountMenuButton";
import { tNavigation } from "../i18n/messages";
import { tVideoCalls } from "../i18n/video-calls";
import ChatThreadScreen from "../screens/messages/ChatThreadScreen";
import MessagesScreen from "../screens/messages/MessagesScreen";
import VideoCallRoomScreen from "../screens/messages/VideoCallRoomScreen";
import VideoCallsScreen from "../screens/messages/VideoCallsScreen";
import { useLocaleStore } from "../store/localeStore";
import type { MessagesStackParamList } from "./types";
import { appStackScreenOptions } from "./stackOptions";

const Stack = createNativeStackNavigator<MessagesStackParamList>();

export function MessagesStack() {
  const locale = useLocaleStore((s) => s.locale);
  const nav = tNavigation(locale);
  const videoCopy = tVideoCalls(locale);

  return (
    <Stack.Navigator screenOptions={appStackScreenOptions}>
      <Stack.Screen
        name="MessagesList"
        component={MessagesScreen}
        options={{
          title: nav.stacks.messages,
          headerRight: () => <AccountMenuButton />,
        }}
      />
      <Stack.Screen
        name="VideoCalls"
        component={VideoCallsScreen}
        options={{ title: nav.stacks.videoCalls }}
      />
      <Stack.Screen
        name="ChatThread"
        component={ChatThreadScreen}
        options={({ route }) => ({
          title: route.params.memberName,
        })}
      />
      <Stack.Screen
        name="VideoCallRoom"
        component={VideoCallRoomScreen}
        options={{
          title: videoCopy.title,
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}

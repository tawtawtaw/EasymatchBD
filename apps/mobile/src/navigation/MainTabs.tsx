import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AccountMenuButton } from "../components/AccountMenuButton";
import { TabBarIcon } from "../components/TabBarIcon";
import { tNavigation } from "../i18n/messages";
import ConnectionsScreen from "../screens/connections/ConnectionsScreen";
import HomeScreen from "../screens/home/HomeScreen";
import { useLocaleStore } from "../store/localeStore";
import { useMemberAlertsStore } from "../store/memberAlertsStore";
import { colors } from "../theme/colors";
import { DiscoveryStack } from "./DiscoveryStack";
import { MessagesStack } from "./MessagesStack";
import { ProfileStack } from "./ProfileStack";
import type { MainTabParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_BAR_CONTENT_HEIGHT = 56;

function TabLabel({
  label,
  focused,
  activeColor = colors.rose800,
}: {
  label: string;
  focused: boolean;
  activeColor?: string;
}) {
  return (
    <Text
      style={{
        fontSize: 11,
        fontWeight: focused ? "700" : "500",
        color: focused ? activeColor : colors.rose200,
      }}
    >
      {label}
    </Text>
  );
}

function TabLabelWithBadge({
  label,
  focused,
  badge,
  activeColor = colors.rose800,
}: {
  label: string;
  focused: boolean;
  badge: number;
  activeColor?: string;
}) {
  return (
    <View style={tabBadgeStyles.wrap}>
      <TabLabel label={label} focused={focused} activeColor={activeColor} />
      {badge > 0 ? (
        <View style={tabBadgeStyles.badge}>
          <Text style={tabBadgeStyles.badgeText}>{badge > 99 ? "99+" : badge}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function MainTabs({
  initialRouteName = "Home",
}: {
  initialRouteName?: keyof MainTabParamList;
}) {
  const locale = useLocaleStore((s) => s.locale);
  const nav = tNavigation(locale);
  const unreadCount = useMemberAlertsStore((s) => s.unreadMessages);
  const incomingInterests = useMemberAlertsStore((s) => s.incomingInterests);
  const insets = useSafeAreaInsets();
  const tabBarBottomInset = Math.max(insets.bottom, Platform.OS === "android" ? 24 : 0);

  return (
    <Tab.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerStyle: { backgroundColor: colors.rose900 },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: "700" },
        tabBarActiveTintColor: colors.white,
        tabBarInactiveTintColor: colors.rose200,
        tabBarStyle: {
          borderTopColor: colors.rose800,
          backgroundColor: colors.rose900,
          paddingTop: 6,
          paddingBottom: tabBarBottomInset,
          height: TAB_BAR_CONTENT_HEIGHT + tabBarBottomInset,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: nav.tabs.home,
          headerRight: () => <AccountMenuButton />,
          tabBarIcon: ({ focused }) => <TabBarIcon name="home" focused={focused} />,
          tabBarLabel: ({ focused }) => (
            <TabLabel label={nav.tabs.home} focused={focused} activeColor={colors.tabHome} />
          ),
        }}
      />
      <Tab.Screen
        name="Discovery"
        component={DiscoveryStack}
        options={{
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabBarIcon name="discovery" focused={focused} />,
          tabBarLabel: ({ focused }) => (
            <TabLabel label={nav.tabs.discover} focused={focused} activeColor={colors.tabDiscovery} />
          ),
        }}
      />
      <Tab.Screen
        name="Connections"
        component={ConnectionsScreen}
        options={{
          title: nav.stacks.connections,
          headerRight: () => <AccountMenuButton />,
          tabBarIcon: ({ focused }) => <TabBarIcon name="connections" focused={focused} />,
          tabBarLabel: ({ focused }) => (
            <TabLabelWithBadge
              label={nav.tabs.connect}
              focused={focused}
              badge={incomingInterests}
              activeColor={colors.tabConnections}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesStack}
        options={{
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabBarIcon name="messages" focused={focused} />,
          tabBarLabel: ({ focused }) => (
            <TabLabelWithBadge
              label={nav.tabs.messages}
              focused={focused}
              badge={unreadCount}
              activeColor={colors.tabMessages}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabBarIcon name="account" focused={focused} />,
          tabBarLabel: ({ focused }) => (
            <TabLabel label={nav.tabs.profile} focused={focused} activeColor={colors.tabAccount} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const tabBadgeStyles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -12,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: colors.rose900,
    fontSize: 9,
    fontWeight: "800",
  },
});

import { BackHandler, Modal, View } from "react-native";
import { useI18n } from "./src/i18n";
import React, { useEffect, useRef } from "react";
import { StatusBar } from "expo-status-bar";
import {
  NavigationContainer,
  DefaultTheme,
  useIsFocused,
} from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { GymsScreen } from "./src/screens/GymsScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { TrainingScreen } from "./src/screens/TrainingScreen";
import { MyPageScreen } from "./src/screens/LifestyleScreens";
import { DietScreen } from "./src/screens/DietScreen";
import { FitnessProvider } from "./src/state";
import { DiscoveryProvider, useDiscovery } from "./src/discoveryState";
import {
  MapScreen,
  SearchMenuScreen,
  FavoritesScreen,
  GymDetailScreen,
  ComparisonScreen,
  EquipmentSearchScreen,
  RecommendationsScreen,
} from "./src/screens/TravelScreens";
import { colors } from "./src/components/ui";
import { TravelIcon } from "./src/components/TravelIcon";
export type TabParams = {
  Explore: undefined;
  Map: undefined;
  Menu: undefined;
  Favorites: undefined;
  MyPage: undefined;
};
const Tab = createBottomTabNavigator<TabParams>();
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: "#ffffff",
    text: colors.text,
    border: colors.border,
  },
};
const icons = {
  Explore: "home",
  Map: "map",
  Menu: "menu",
  Favorites: "heart",
  MyPage: "person",
};
export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.background }}
        edges={["top", "left", "right"]}
      >
        <FitnessProvider>
          <DiscoveryProvider>
            <AppNavigator />
          </DiscoveryProvider>
        </FitnessProvider>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
function Route({ name }: { name: keyof TabParams }) {
  const d = useDiscovery()!,
    focused = useIsFocused();
  const lastGuideId = useRef(d.guideId);
  if (d.guideId) lastGuideId.current = d.guideId;
  useEffect(() => {
    if (!focused) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (d.tool) {
        d.setTool(null);
        return true;
      }
      if (name === "Explore" && d.page !== "home") {
        d.setPage(d.page === "detail" ? "results" : "home");
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [focused, d.tool, d.page, name]);
  const guideOpen = focused && d.guideId !== null;
  return (
    <>
      <View
        style={{ flex: 1 }}
        accessibilityElementsHidden={guideOpen}
        importantForAccessibility={guideOpen ? "no-hide-descendants" : "auto"}
      >
        <RouteContent name={name} focused={focused} />
      </View>
      <Modal
        visible={guideOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={d.closeGuide}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <TrainingScreen
            key={lastGuideId.current ?? "guide"}
            initialEquipmentId={lastGuideId.current ?? undefined}
            onBack={d.closeGuide}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}
function RouteContent({
  name,
  focused,
}: {
  name: keyof TabParams;
  focused: boolean;
}) {
  const d = useDiscovery()!;
  if (d.tool && focused)
    return d.tool === "training" ? (
      <TrainingScreen />
    ) : d.tool === "home" ? (
      <HomeScreen />
    ) : (
      <DietScreen />
    );
  if (name === "Explore") {
    if (d.page === "detail") return <GymDetailScreen />;
    if (d.page === "compare") return <ComparisonScreen />;
    if (d.page === "equipment") return <EquipmentSearchScreen />;
    if (d.page === "recommendations") return <RecommendationsScreen />;
    return <GymsScreen />;
  }
  return name === "Map" ? (
    <MapScreen />
  ) : name === "Menu" ? (
    <SearchMenuScreen />
  ) : name === "Favorites" ? (
    <FavoritesScreen />
  ) : (
    <MyPageScreen />
  );
}
const Explore = () => <Route name="Explore" />,
  Map = () => <Route name="Map" />,
  Menu = () => <Route name="Menu" />,
  Favorites = () => <Route name="Favorites" />,
  MyPage = () => <Route name="MyPage" />;
function AppNavigator() {
  const { t } = useI18n(),
    d = useDiscovery()!,
    insets = useSafeAreaInsets();
  return (
    <NavigationContainer theme={theme}>
      <Tab.Navigator
        screenListeners={({ route }) => ({
          tabPress: () => {
            d.setTool(null);
            if (route.name === "Explore") d.setPage("home");
          },
        })}
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.muted,
          tabBarStyle: {
            backgroundColor: "#fff",
            borderTopColor: colors.border,
            height: 64 + insets.bottom,
            paddingBottom: insets.bottom + 4,
            paddingTop: 4,
          },
          tabBarItemStyle: { minHeight: 48 },
          tabBarLabelStyle: { fontSize: 10, fontWeight: "500" },
          tabBarIcon: ({ color }) => (
            <TravelIcon name={icons[route.name]} color={color} />
          ),
        })}
      >
        <Tab.Screen
          name="Explore"
          component={Explore}
          options={{
            title: t("travel.nav.explore"),
            tabBarLabel: t("travel.nav.explore"),
            tabBarAccessibilityLabel: t("travel.nav.explore"),
          }}
        />
        <Tab.Screen
          name="Map"
          component={Map}
          options={{
            title: t("travel.nav.map"),
            tabBarLabel: t("travel.nav.map"),
            tabBarAccessibilityLabel: t("travel.nav.map"),
          }}
        />
        <Tab.Screen
          name="Menu"
          component={Menu}
          options={{
            title: t("travel.nav.menu"),
            tabBarLabel: t("travel.nav.menu"),
            tabBarAccessibilityLabel: t("travel.nav.menu"),
          }}
        />
        <Tab.Screen
          name="Favorites"
          component={Favorites}
          options={{
            title: t("travel.nav.favorites"),
            tabBarLabel: t("travel.nav.favorites"),
            tabBarAccessibilityLabel: t("travel.nav.favorites"),
          }}
        />
        <Tab.Screen
          name="MyPage"
          component={MyPage}
          options={{
            title: t("nav.mypage"),
            tabBarLabel: t("nav.mypage"),
            tabBarAccessibilityLabel: t("nav.mypage"),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

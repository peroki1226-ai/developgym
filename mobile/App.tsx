import React from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Text } from "react-native";
import { GymsScreen } from "./src/screens/GymsScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { TrainingScreen } from "./src/screens/TrainingScreen";
import { MyPageScreen } from "./src/screens/LifestyleScreens";
import { DietScreen } from "./src/screens/DietScreen";
import { FitnessProvider } from "./src/state";
export type TabParams = {
  Gyms: undefined;
  Training: undefined;
  Home: undefined;
  Diet: undefined;
  MyPage: undefined;
};
const Tab = createBottomTabNavigator<TabParams>();
const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: "#ffffff",
    background: "#000000",
    card: "#000000",
    text: "#ffffff",
    border: "#303030",
  },
};
const icons: Record<keyof TabParams, string> = {
  Gyms: "◎",
  Training: "▥",
  Home: "⌂",
  Diet: "◒",
  MyPage: "○",
};
export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "#000000" }}
        edges={["top", "left", "right"]}
      >
        <FitnessProvider>
          <NavigationContainer theme={theme}>
            <Tab.Navigator
              screenOptions={({ route }) => ({
                headerShown: false,
                tabBarActiveTintColor: "#ffffff",
                tabBarInactiveTintColor: "#a1a1aa",
                tabBarStyle: {
                  backgroundColor: "#000000",
                  borderTopColor: "#303030",
                },
                tabBarItemStyle: { minHeight: 48 },
                tabBarLabelStyle: { fontSize: 10 },
                tabBarIcon: ({ color }) => (
                  <Text
                    style={{ color, fontSize: 24 }}
                    accessibilityElementsHidden
                  >
                    {icons[route.name]}
                  </Text>
                ),
              })}
            >
              <Tab.Screen name="Gyms" component={GymsScreen} />
              <Tab.Screen name="Training" component={TrainingScreen} />
              <Tab.Screen name="Home" component={HomeScreen} />
              <Tab.Screen name="Diet" component={DietScreen} />
              <Tab.Screen
                name="MyPage"
                component={MyPageScreen}
                options={{ title: "My Page" }}
              />
            </Tab.Navigator>
          </NavigationContainer>
        </FitnessProvider>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

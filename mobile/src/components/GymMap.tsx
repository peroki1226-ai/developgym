import React, { useMemo, useState } from "react";
import { Image, Linking, Pressable, Text, View } from "react-native";
import { Gym } from "../domain/matching";
import { locations, pixelPoint } from "../domain/discovery";
import { useI18n } from "../i18n";
import { Body, Button, s } from "./ui";
export function GymMap({
  gyms,
  selected,
  onSelect,
}: {
  gyms: Gym[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  const { t } = useI18n();
  const [zoom, setZoom] = useState(15),
    [width, setWidth] = useState(320),
    [failed, setFailed] = useState(false);
  const height = 310;
  const location =
    locations[selected] || locations[gyms[0]?.id] || locations.gold;
  const center = pixelPoint(location.latitude, location.longitude, zoom);
  const tiles = useMemo(() => {
    const result: { x: number; y: number; left: number; top: number }[] = [];
    for (
      let x = Math.floor((center.x - width / 2) / 256);
      x <= Math.floor((center.x + width / 2) / 256);
      x++
    )
      for (
        let y = Math.floor((center.y - height / 2) / 256);
        y <= Math.floor((center.y + height / 2) / 256);
        y++
      )
        if (y >= 0 && y < 2 ** zoom)
          result.push({
            x,
            y,
            left: x * 256 - center.x + width / 2,
            top: y * 256 - center.y + height / 2,
          });
    return result;
  }, [center.x, center.y, width, zoom]);
  return (
    <View style={{ gap: 8 }}>
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={{
          height,
          overflow: "hidden",
          backgroundColor: "#dfeffc",
          borderRadius: 20,
        }}
      >
        {tiles.map((tile) => (
          <Image
            testID="gym-map-tile"
            key={`${zoom}/${tile.x}/${tile.y}`}
            accessibilityElementsHidden
            source={{
              uri: `https://tile.openstreetmap.org/${zoom}/${((tile.x % 2 ** zoom) + 2 ** zoom) % 2 ** zoom}/${tile.y}.png`,
              headers: { "User-Agent": "GymFinder/1.0 mobile" },
            }}
            onError={() => setFailed(true)}
            style={{
              position: "absolute",
              width: 256,
              height: 256,
              left: tile.left,
              top: tile.top,
            }}
          />
        ))}
        {gyms.map((g, index) => {
          const point = locations[g.id];
          if (!point) return null;
          const p = pixelPoint(point.latitude, point.longitude, zoom),
            left = p.x - center.x + width / 2 - 18,
            top = p.y - center.y + height / 2 - 28;
          if (left < 0 || left > width - 36 || top < 0 || top > height - 50)
            return null;
          return (
            <Pressable
              key={g.id}
              accessibilityRole="button"
              accessibilityLabel={t("travel.mapPin", { 0: t(g.name) })}
              accessibilityState={{ selected: g.id === selected }}
              onPress={() => onSelect(g.id)}
              style={{
                position: "absolute",
                left,
                top,
                width: 48,
                height: 48,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  backgroundColor: g.id === selected ? "#00b982" : "#0878f9",
                  width: 34,
                  height: 40,
                  borderRadius: 17,
                  borderBottomRightRadius: 2,
                  borderColor: "#fff",
                  borderWidth: 3,
                  alignItems: "center",
                  justifyContent: "center",
                  transform: [{ rotate: "45deg" }],
                }}
              >
                <Text
                  style={{
                    color: "#fff",
                    fontWeight: "800",
                    transform: [{ rotate: "-45deg" }],
                  }}
                >
                  {index + 1}
                </Text>
              </View>
            </Pressable>
          );
        })}
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={t("travel.attribution")}
          onPress={() =>
            Linking.openURL("https://www.openstreetmap.org/copyright").catch(
              () => {},
            )
          }
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            minHeight: 48,
            justifyContent: "flex-end",
            padding: 5,
            backgroundColor: "#ffffffbd",
          }}
        >
          <Text style={{ fontSize: 10, color: "#183153" }}>
            {t("travel.attribution")}
          </Text>
        </Pressable>
      </View>
      <View style={s.row}>
        <Button
          title={t("travel.zoomIn")}
          disabled={zoom >= 18}
          onPress={() => {
            setZoom((z) => z + 1);
            setFailed(false);
          }}
        />
        <Button
          title={t("travel.zoomOut")}
          disabled={zoom <= 10}
          onPress={() => {
            setZoom((z) => z - 1);
            setFailed(false);
          }}
        />
      </View>
      {failed && <Body>{t("travel.mapUnavailable")}</Body>}
      <Body>{t("travel.sampleLocations")}</Body>
    </View>
  );
}

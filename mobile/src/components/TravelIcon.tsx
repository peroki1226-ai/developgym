import React from "react";
import Svg, { Path, Circle, Ellipse, Line } from "react-native-svg";
export function TravelIcon({
  name,
  color = "#0878f9",
  size = 24,
}: {
  name: string;
  color?: string;
  size?: number;
}) {
  const paths: Record<string, string> = {
    home: "M3 11 12 3l9 8M5 10v11h5v-6h4v6h5V10",
    map: "m3 5 6-2 6 3 6-2v16l-6 2-6-3-6 2ZM9 3v16M15 6v16",
    menu: "M5 4h14v17H5ZM8 8h8M8 12h8M8 16h5",
    heart:
      "M20.8 4.6c-2.4-2.1-5.7-1.1-8.8 2-3.1-3.1-6.4-4.1-8.8-2C-1 8.4 4 15 12 21c8-6 13-12.6 8.8-16.4Z",
    person: "M4 22v-3c0-7 16-7 16 0v3M8 6a4 4 0 1 0 8 0 4 4 0 0 0-8 0",
    dumbbell: "M8 12h8M3 8h5v8H3ZM16 8h5v8h-5ZM1 10v4M23 10v4",
    search: "M15 15l7 7M3 9a6 6 0 1 0 12 0A6 6 0 0 0 3 9",
    arrow: "m5 12 14 0m-6-6 6 6-6 6",
    pin: "M12 22S3 14 3 9a9 9 0 0 1 18 0c0 5-9 13-9 13ZM9 9a3 3 0 1 0 6 0 3 3 0 0 0-6 0",
    back: "m15 4-8 8 8 8",
  };
  if (name === "globe")
    return (
      <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        accessibilityElementsHidden
      >
        <Circle
          cx={12}
          cy={10}
          r={8}
          fill="none"
          stroke={color}
          strokeWidth={1.8}
        />
        <Ellipse
          cx={12}
          cy={10}
          rx={4}
          ry={8}
          fill="none"
          stroke={color}
          strokeWidth={1.4}
        />
        <Line x1={4} x2={20} y1={10} y2={10} stroke={color} />
        <Path
          d="m8 18 4 5 4-5M1 7v6M23 7v6"
          fill="none"
          stroke={color}
          strokeWidth={2}
        />
      </Svg>
    );
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      accessibilityElementsHidden
    >
      <Path
        d={paths[name] || paths.dumbbell}
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

import { SceneInput } from "../three/trainingScene";
export type Motion3DProps = SceneInput & {
  onReady: () => void;
  onFailure: () => void;
};

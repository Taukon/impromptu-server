export type KeyJson = { key: { name?: string; keySym: number; down: boolean } };
export type ButtonJson = { button: { buttonMask: number; down: boolean } };
export type MotionJson = {
  move: { x: number; y: number; cw: number; ch: number };
};

export type MousePos = { x: number; y: number };

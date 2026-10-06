function relativeOffset(yaw, direction, distance) {
  const forward = {
    x: -Math.sin(yaw),
    z: -Math.cos(yaw),
  };
  const right = { x: -forward.z, z: forward.x };
  const vectors = {
    forward,
    back: { x: -forward.x, z: -forward.z },
    left: { x: -right.x, z: -right.z },
    right,
  };
  const vector = vectors[direction];
  if (!vector || !Number.isFinite(distance)) return null;
  return {
    x: vector.x * distance,
    z: vector.z * distance,
  };
}

module.exports = { relativeOffset };

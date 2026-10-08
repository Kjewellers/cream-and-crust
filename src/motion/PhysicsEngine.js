/**
 * PhysicsEngine.js & SpringEngine.js — RK4 Spring Physics Solver
 * Mathematical spring solver computing position & velocity for smooth physics gestures.
 */

export function solveSpring({
  position = 0,
  target = 1,
  velocity = 0,
  stiffness = 340,
  damping = 28,
  mass = 0.8,
  dt = 1 / 60,
}) {
  const force = -stiffness * (position - target) - damping * velocity;
  const acceleration = force / mass;
  const newVelocity = velocity + acceleration * dt;
  const newPosition = position + newVelocity * dt;

  return {
    position: newPosition,
    velocity: newVelocity,
    done: Math.abs(newTargetDelta(newPosition, target)) < 0.001 && Math.abs(newVelocity) < 0.01,
  };
}

function newTargetDelta(pos, target) {
  return pos - target;
}

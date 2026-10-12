export const ICON_MAP: Record<string, string> = {
  Car: '🚗', Bike: '🚲', Motorbike: '🏍️', Truck: '🚛', Ambulance: '🚑',
  Bus: '🚌', Plane: '✈️', Ship: '🚢', Tractor: '🚜', Tram: '🚃',
  Train: '🚂', Rocket: '🚀', Scooter: '🛵', Taxi: '🚕', Police: '🚓',
  FireTruck: '🚒', Van: '🚐', Pickup: '🛻', Bicycle: '🚴', Wheelchair: '♿',
  Boat: '⛵', Helicopter: '🚁', Lightning: '⚡', Container: '📦', Anchor: '⚓'
};

export function getVehicleEmoji(key: string): string {
  return ICON_MAP[key] || '🚗';
}

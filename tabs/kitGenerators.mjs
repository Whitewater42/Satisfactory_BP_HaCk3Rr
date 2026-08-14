import { renderKitsPanel } from './kitPanel.mjs';

const BUNDLE_URLS = [
  new URL('../data/bundles/mam.json', import.meta.url),
  new URL('../data/bundles/tier_unlock.json', import.meta.url),
  new URL('../data/bundles/space_elevator.json', import.meta.url),
  new URL('../data/bundles/vehicle_kit.json', import.meta.url),
];

export function render(container, Parser) {
  renderKitsPanel(container, BUNDLE_URLS, Parser);
}

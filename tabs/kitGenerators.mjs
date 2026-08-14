import { renderKitsPanel } from './kitPanel.mjs';

const BUNDLE_URLS = [
  '../data/bundles/mam.json',
  '../data/bundles/tier_unlock.json',
  '../data/bundles/space_elevator.json',
  '../data/bundles/vehicle_kit.json',
];

export function render(container, Parser) {
  renderKitsPanel(container, BUNDLE_URLS, Parser);
}

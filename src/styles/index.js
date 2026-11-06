// The style registry. A style decides how a solved skeleton is drawn, and can adjust a character's proportions.
// To add one: registerStyle('name', { paint(ink, spec, sk, opts), make(spec, opts) }). Every move and scene then works in it.
import { paintCharacter } from '../paint.js';
import { paintStick, makeStick } from './stick.js';
import { STYLE_MAKERS } from '../character.js';
export const STYLES = {};
export function registerStyle(name, { paint, make = null }) { STYLES[name] = { paint, make }; if (make) STYLE_MAKERS[name] = make; }
export const styleNames = () => Object.keys(STYLES);
export const paintSpec = (ink, spec, sk, o) => (STYLES[spec.style ?? 'round'] ?? STYLES.round).paint(ink, spec, sk, o);
registerStyle('round', { paint: paintCharacter });
registerStyle('stick', { paint: paintStick, make: makeStick });

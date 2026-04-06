import { describe, it, expect } from 'vitest';
import { hexToRgb, rgbToHex, rgbToHsl, hslToRgb, hexToHsl, hslToHex } from './color.js';

describe('hexToRgb', () => {
	it('converts 6-digit hex with #', () => {
		expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
	});

	it('converts 6-digit hex without #', () => {
		expect(hexToRgb('00ff00')).toEqual({ r: 0, g: 255, b: 0 });
	});

	it('converts 3-digit shorthand', () => {
		expect(hexToRgb('#f00')).toEqual({ r: 255, g: 0, b: 0 });
	});

	it('converts uppercase hex', () => {
		expect(hexToRgb('#FF8800')).toEqual({ r: 255, g: 136, b: 0 });
	});

	it('throws for invalid hex', () => {
		expect(() => hexToRgb('#xyz')).toThrow(TypeError);
		expect(() => hexToRgb('nope')).toThrow('Invalid hex color');
	});
});

describe('rgbToHex', () => {
	it('converts standard RGB to hex', () => {
		expect(rgbToHex({ r: 255, g: 0, b: 0 })).toBe('#ff0000');
	});

	it('pads single-digit hex values', () => {
		expect(rgbToHex({ r: 0, g: 0, b: 0 })).toBe('#000000');
	});

	it('clamps out-of-range values', () => {
		expect(rgbToHex({ r: 300, g: -10, b: 128 })).toBe('#ff0080');
	});

	it('returns lowercase hex', () => {
		expect(rgbToHex({ r: 171, g: 205, b: 239 })).toBe('#abcdef');
	});
});

describe('rgbToHsl', () => {
	it('converts pure red', () => {
		expect(rgbToHsl({ r: 255, g: 0, b: 0 })).toEqual({ h: 0, s: 100, l: 50 });
	});

	it('converts white', () => {
		expect(rgbToHsl({ r: 255, g: 255, b: 255 })).toEqual({ h: 0, s: 0, l: 100 });
	});

	it('converts black', () => {
		expect(rgbToHsl({ r: 0, g: 0, b: 0 })).toEqual({ h: 0, s: 0, l: 0 });
	});

	it('converts a midtone color', () => {
		const hsl = rgbToHsl({ r: 64, g: 128, b: 192 });
		expect(hsl.h).toBe(210);
		expect(hsl.s).toBeCloseTo(50, 0);
		expect(hsl.l).toBeCloseTo(50.2, 0);
	});
});

describe('hslToRgb', () => {
	it('roundtrips with rgbToHsl for pure red', () => {
		const rgb = { r: 255, g: 0, b: 0 };
		expect(hslToRgb(rgbToHsl(rgb))).toEqual(rgb);
	});

	it('roundtrips with rgbToHsl for a midtone', () => {
		const rgb = { r: 100, g: 150, b: 200 };
		const result = hslToRgb(rgbToHsl(rgb));
		expect(result.r).toBeCloseTo(rgb.r, 0);
		expect(result.g).toBeCloseTo(rgb.g, 0);
		expect(result.b).toBeCloseTo(rgb.b, 0);
	});

	it('converts achromatic (grey)', () => {
		expect(hslToRgb({ h: 0, s: 0, l: 50 })).toEqual({ r: 128, g: 128, b: 128 });
	});
});

describe('hexToHsl', () => {
	it('converts hex to HSL', () => {
		expect(hexToHsl('#ff0000')).toEqual({ h: 0, s: 100, l: 50 });
	});
});

describe('hslToHex', () => {
	it('converts HSL to hex', () => {
		expect(hslToHex({ h: 0, s: 100, l: 50 })).toBe('#ff0000');
	});

	it('roundtrips with hexToHsl', () => {
		expect(hslToHex(hexToHsl('#3366cc'))).toBe('#3366cc');
	});
});

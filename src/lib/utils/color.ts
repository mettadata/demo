export type RgbColor = { r: number; g: number; b: number };
export type HslColor = { h: number; s: number; l: number };

/**
 * Converts a hex color string to RGB.
 */
export function hexToRgb(hex: string): RgbColor {
	let h = hex.replace(/^#/, '');
	if (h.length === 3) {
		h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
	}
	if (!/^[0-9a-fA-F]{6}$/.test(h)) {
		throw new TypeError(`Invalid hex color: "${hex}"`);
	}
	return {
		r: parseInt(h.slice(0, 2), 16),
		g: parseInt(h.slice(2, 4), 16),
		b: parseInt(h.slice(4, 6), 16)
	};
}

/**
 * Converts an RGB color to a hex string.
 */
export function rgbToHex(rgb: RgbColor): string {
	const toHex = (n: number) =>
		Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
	return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

/**
 * Converts an RGB color to HSL.
 */
export function rgbToHsl(rgb: RgbColor): HslColor {
	const r = rgb.r / 255;
	const g = rgb.g / 255;
	const b = rgb.b / 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const l = (max + min) / 2;

	if (max === min) {
		return { h: 0, s: 0, l: Math.round(l * 1000) / 10 };
	}

	const d = max - min;
	const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

	let h: number;
	if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
	else if (max === g) h = ((b - r) / d + 2) / 6;
	else h = ((r - g) / d + 4) / 6;

	return {
		h: Math.round(h * 360),
		s: Math.round(s * 1000) / 10,
		l: Math.round(l * 1000) / 10
	};
}

/**
 * Converts an HSL color to RGB.
 */
export function hslToRgb(hsl: HslColor): RgbColor {
	const h = hsl.h / 360;
	const s = hsl.s / 100;
	const l = hsl.l / 100;

	if (s === 0) {
		const v = Math.round(l * 255);
		return { r: v, g: v, b: v };
	}

	const hue2rgb = (p: number, q: number, t: number): number => {
		if (t < 0) t += 1;
		if (t > 1) t -= 1;
		if (t < 1 / 6) return p + (q - p) * 6 * t;
		if (t < 1 / 2) return q;
		if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
		return p;
	};

	const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
	const p = 2 * l - q;

	return {
		r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
		g: Math.round(hue2rgb(p, q, h) * 255),
		b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255)
	};
}

/**
 * Converts a hex color string to HSL.
 */
export function hexToHsl(hex: string): HslColor {
	return rgbToHsl(hexToRgb(hex));
}

/**
 * Converts an HSL color to a hex string.
 */
export function hslToHex(hsl: HslColor): string {
	return rgbToHex(hslToRgb(hsl));
}

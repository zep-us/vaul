import { MutableRefObject, useEffect, useState } from 'react';

type RGB = [number, number, number];

function extractRGBA(str: string): [number, number, number, number] {
  const match = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),\s*(\d*(?:\.\d+)?)\)/);
  if (!match) throw new Error('Invalid color string');
  return [Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4])];
}

// If the overlay is rgba(0, 0, 0, 0.4), we can't just use this value as the theme-color, as it will be pure black instead of grey-ish.
// Instead, we assume the background is white (or black depending on the theme) and calculate the result of putting the overlay color on top of it.
function getNonTrasparentOverlayColor(rgbaStr: string, background: RGB): RGB {
  const [r, g, b, a] = extractRGBA(rgbaStr);

  const rgb: RGB = [
    Math.round(a * r + (1 - a) * Number(background[0])),
    Math.round(a * g + (1 - a) * Number(background[1])),
    Math.round(a * b + (1 - a) * Number(background[2])),
  ];

  return rgb;
}

function interpolateColor(color1: number[], color2: number[], factor: number) {
  if (arguments.length < 3) {
    factor = 0.5;
  }
  let result = color1.slice();
  for (let i = 0; i < 3; i++) {
    result[i] = Math.round(result[i] + factor * (color2[i] - color1[i]));
  }
  return result;
}

function interpolateColors(color1: number[], color2: number[], steps: number): number[][] {
  let stepFactor = 1 / (steps - 1),
    interpolatedColorArray = [];

  for (let i = 0; i < steps; i++) {
    interpolatedColorArray.push(interpolateColor(color1, color2, stepFactor * i));
  }

  return interpolatedColorArray;
}

export function useSafariThemeColor(overlay: MutableRefObject<HTMLDivElement>, isOpen: boolean) {
  const [didRan, setDidRan] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => {
      if (overlay.current) {
        let metaThemeColor = document.querySelector('meta[name="theme-color"]');
        const overlayColor = getComputedStyle(overlay.current).getPropertyValue('background-color');
        const backgroundColor = getComputedStyle(document.documentElement)
          .getPropertyValue('--vaul-theme-color')
          .split(',')
          .map((c) => Number(c));
        const nonTrasparentOverlayColor = getNonTrasparentOverlayColor(overlayColor, backgroundColor as RGB);
        const interpolatedColors = interpolateColors(backgroundColor, nonTrasparentOverlayColor, 50);

        if (!metaThemeColor) {
          metaThemeColor = document.createElement('meta');
          // @ts-ignore
          metaThemeColor.name = 'theme-color';
          document.getElementsByTagName('head')[0].appendChild(metaThemeColor);
        }

        if (isOpen) {
          for (let i = 0; i < interpolatedColors.length; i++) {
            setTimeout(() => {
              const currentColor = interpolatedColors[i];
              metaThemeColor.setAttribute('content', `rgb(${currentColor.join(',')})`);
            }, i * 5);
          }
        }
      }
    });
  }, [isOpen]);
}
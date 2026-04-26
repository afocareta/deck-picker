---
name: Desk Picker Operational System
colors:
  surface: '#fff8f6'
  surface-dim: '#f0d4ce'
  surface-bright: '#fff8f6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fff1ed'
  surface-container: '#ffe9e4'
  surface-container-high: '#fee2dc'
  surface-container-highest: '#f8dcd6'
  on-surface: '#271814'
  on-surface-variant: '#5a413a'
  inverse-surface: '#3d2c28'
  inverse-on-surface: '#ffede9'
  outline: '#8e7069'
  outline-variant: '#e3beb6'
  surface-tint: '#b32902'
  primary: '#b02700'
  on-primary: '#ffffff'
  primary-container: '#d3401a'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb4a2'
  secondary: '#625d59'
  on-secondary: '#ffffff'
  secondary-container: '#e9e1db'
  on-secondary-container: '#69635f'
  tertiary: '#006192'
  on-tertiary: '#ffffff'
  tertiary-container: '#007bb8'
  on-tertiary-container: '#fcfcff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad2'
  primary-fixed-dim: '#ffb4a2'
  on-primary-fixed: '#3c0700'
  on-primary-fixed-variant: '#8a1c00'
  secondary-fixed: '#e9e1db'
  secondary-fixed-dim: '#ccc5bf'
  on-secondary-fixed: '#1e1b18'
  on-secondary-fixed-variant: '#4a4642'
  tertiary-fixed: '#cce5ff'
  tertiary-fixed-dim: '#91cdff'
  on-tertiary-fixed: '#001e31'
  on-tertiary-fixed-variant: '#004b72'
  background: '#fff8f6'
  on-background: '#271814'
  surface-variant: '#f8dcd6'
typography:
  h1:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  h3:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  container-padding: 24px
  panel-gap: 16px
  control-padding-x: 12px
  control-padding-y: 8px
  table-cell-padding: 8px 12px
---

## Brand & Style

This design system is engineered for high-utility internal operations, specifically for workspace management. The brand personality is **efficient, authoritative, and precise**. It avoids all decorative flourishes to ensure the user's cognitive load is reserved for task completion and data processing.

The visual style follows a **Corporate / Modern** aesthetic with a lean toward **High-Density Minimalism**. It prioritizes information density and clear functional hierarchies over visual "breathing room." The interface should feel like a professional tool—responsive, sturdy, and strictly logical—using the vibrant brand accents only to signal action and state changes.

## Colors

The palette is derived directly from the logo to maintain institutional continuity. 

- **Primary (#e34b25):** A high-energy vermillion used exclusively for primary calls-to-action, active selection states, and critical alerts.
- **Secondary (#3d3935):** A deep charcoal used for typography, navigation backgrounds, and structural iconography to provide a grounded, professional contrast.
- **Background (#eef3f5):** A cool, light gray-blue that reduces eye strain during prolonged use compared to pure white.
- **Neutral Accents:** Borders and dividers utilize a muted version of the background tone to maintain a clean, high-density look without adding visual noise.

## Typography

This design system utilizes **Inter** for its exceptional legibility in high-density data environments. The typographic scale is compact to support the operational nature of the tool.

- **Headlines:** Use semi-bold weights with slight negative letter-spacing for a clean, "Swiss" feel.
- **Body Text:** Set at 14px for standard reading and 13px for dense data tables.
- **Labels:** Use uppercase for small labels to provide distinct visual separation from body content.
- **Hierarchy:** Contrast is achieved through weight and color (Secondary charcoal vs. Medium gray) rather than large jumps in font size.

## Layout & Spacing

The layout philosophy is based on a **Fixed Grid** for main dashboard views and a **Fluid Content Area** for data tables. 

- **Grid:** A 12-column system with 16px gutters.
- **Density:** We employ a 4px baseline shift. Most operational elements (inputs, buttons) use a "Compact" vertical rhythm to maximize the information visible above the fold.
- **Margins:** Standard outer container margins are set to 24px, while internal panel spacing is kept at 16px to maintain a tight, integrated feel.

## Elevation & Depth

To maintain a clean, "flat-plus" aesthetic, this design system avoids heavy shadows and blurring effects. 

- **Tonal Layers:** Depth is primarily communicated through the contrast between the Light Gray-Blue background and White panels. 
- **Low-Contrast Outlines:** Panels and controls use a 1px solid border (#d1d9dd). 
- **Shadows:** Use a single, extremely subtle "Ambient Shadow" (0px 2px 4px rgba(61, 57, 53, 0.05)) only for floating elements like dropdown menus or modals to separate them from the base layout.

## Shapes

The shape language is disciplined and geometric. 

- **Controls:** Buttons, input fields, and checkboxes use a **6px radius**. This provides a modern feel without appearing "bubbly."
- **Panels:** Cards and main content containers use an **8px radius** to create a subtle visual hierarchy between the container and the elements within it.
- **Selection:** Use sharp 90-degree corners for table row highlights to emphasize the grid-based nature of the data.

## Components

- **Buttons:** 
  - *Primary:* Solid #e34b25 with white text. 
  - *Secondary:* Solid #3d3935 with white text.
  - *Ghost:* No background, #3d3935 border and text.
- **Input Fields:** White background, 1px #d1d9dd border. On focus, the border changes to the Primary color with a 2px outer glow.
- **Cards/Panels:** White background, 8px radius, 1px light border. No internal padding except for the 16px content safe-zone.
- **Status Chips:** Small, pill-shaped with light tinted backgrounds (e.g., light green for 'Available', light red for 'Occupied') and high-contrast text.
- **Navigation:** Vertical sidebar using the Secondary charcoal (#3d3935) as the background with white icons and text. Active states should be indicated by a 4px Primary (#e34b25) left-border.
- **Data Tables:** Zebra-striping using a 2% opacity of the Secondary color on alternate rows. Header row is #3d3935 with white text for maximum legibility.
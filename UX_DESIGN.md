# UX Design System

This document outlines the design system and UX guidelines for the Ngrakeet project.

## Core Principles
1.  **User-Centered**: Interfaces are designed for clarity and efficiency for kitchen staff and managers.
2.  **Accessibility**: WCAG 2.1 AA compliance target. High contrast, clear labels, and keyboard navigability.
3.  **Consistency**: Reusable components and utility classes to ensure a unified look and feel.
4.  **Mobile-First**: Responsive design that works seamless on tablets and mobile devices used in the kitchen.

## Color Palette

### Primary Colors
-   **Primary (Sapphire Blue)**: `#0F52BA` (Brand, Primary Actions)
-   **Primary Hover**: `#0a3d8f`
-   **Primary Light**: `#E0E7FF` (Backgrounds, Active States)

### Functional Colors
-   **Success (Emerald)**: `#10B981`
-   **Warning (Amber)**: `#F59E0B`
-   **Danger (Red)**: `#EF4444`
-   **Danger Soft**: `#FEF2F2`

### Neutrals
-   **Background Body**: `#F0F2F5`
-   **Background Card**: `#FFFFFF`
-   **Text Main**: `#1F2937`
-   **Text Muted**: `#6B7280`
-   **Border**: `#E5E7EB`

## Typography
-   **Font Family**: 'Inter', sans-serif
-   **Base Size**: 14px (Enterprise Standard)
-   **Line Height**: 1.5 (Regular), 1.625 (Relaxed for reading)

## Components

### Buttons (`.btn`)
-   **Primary**: `.btn-primary` (Solid Blue)
-   **Secondary**: `.btn-secondary` (White with Border)
-   **Danger**: `.btn-danger` (Red Outline/Text)
-   **Small**: `.btn-sm` (Compact for tables/toolbars)

### Cards (`.card`)
-   Rounded corners (`0.75rem`)
-   Subtle shadow (`--shadow-sm`)
-   Hover effect (`--shadow-md`)
-   Consistent padding (`1.5rem` or `.card-tight` for `0.75rem`)

### Tables (`.nutri-table`)
-   Striped rows for readability
-   Hover states
-   Responsive wrapper (`.table-responsive`)

### Inputs (`.input-field`)
-   Consistent height and padding
-   Focus ring (`--primary-light`)

## Utilities
New utility classes have been added to `style.css` to replace inline styles:
-   `.logo-placeholder`, `.logo-sm`: Consistent branding.
-   `.bg-dark-overlay`: Standardized semi-transparent backgrounds.
-   `.opacity-80`, `.opacity-90`: Visual hierarchy.
-   `.leading-relaxed`: Improved readability.
-   `.fixed-inset-0`, `.bg-black-50`: Modal/Sidebar backdrops.

## Accessibility Checklist
-   [x] ARIA labels on icon-only buttons.
-   [x] Semantic HTML (`aside`, `nav`, `main`, `header`).
-   [x] Color contrast improvements.
-   [x] Focus indicators on inputs.

## Future Improvements
-   Implement a true "Dark Mode" toggle visible in the UI (currently supports system pref).
-   Add more interactive empty states.
-   Implement skeleton loaders for data fetching.

# Aiuteur UI/UX Design System

## Overview

Aiuteur employs a **cinematic, editorial dark theme** inspired by professional video editing suites (DaVinci Resolve, Adobe Premiere). The design system emphasizes **narrative flow**, **stage-based progression**, and **professional filmmaking aesthetics** while maintaining accessibility and usability.

**Core Philosophy:** Transform complex AI film production into an intuitive, visually elegant workflow that feels like working with professional editing software.

---

## Design Principles

### 1. **Cinematic Aesthetic**
- Deep charcoal backgrounds evoke the darkness of editing bays
- Golden amber accents represent creative warmth and professional quality
- Typography hierarchy that mimics film credits and scripts

### 2. **Stage-Based Flow**
- Linear progression through 12-stage pipeline
- Visual status indicators for each stage (locked/active/pending/outdated)
- Timeline-style progress visualization

### 3. **Professional Interface**
- Card-based layouts with subtle elevation
- Glass morphism effects for overlays and modals
- Consistent spacing and typography scales

### 4. **Dark-First Design**
- Optimized for extended creative sessions
- High contrast ratios for accessibility
- Subtle gradients and lighting effects

### 5. **Context-Aware UI**
- Dynamic components that adapt to workflow stage
- Contextual toolbars and sidebars
- State-aware visual feedback

---

## Color Palette

### Primary Colors (HSL Format)

```css
/* Core Backgrounds - Cinematic Blacks */
--background: 220 20% 6%;      /* Deep charcoal */
--foreground: 40 20% 95%;      /* Off-white text */

/* Card Surfaces - Subtle Elevation */
--card: 220 18% 9%;            /* Slightly lighter charcoal */
--card-foreground: 40 20% 95%;

/* Primary - Golden Amber Accent */
--primary: 38 90% 55%;         /* Rich gold */
--primary-foreground: 220 20% 6%; /* Black text on gold */

/* Secondary - Muted Slate */
--secondary: 220 15% 16%;      /* Muted charcoal */
--secondary-foreground: 40 15% 85%;

/* Muted - Subtle Backgrounds */
--muted: 220 15% 13%;          /* Darker muted */
--muted-foreground: 220 10% 55%; /* Medium gray */

/* Accent - Complementary Warm Tone */
--accent: 25 85% 50%;          /* Warm amber */
--accent-foreground: 220 20% 6%;
```

### Status Colors

```css
/* Success - Completed/Locked Stages */
--success: 142 70% 45%;        /* Professional green */
--success-foreground: 0 0% 100%;

/* Warning - Outdated/Needs Attention */
--warning: 45 93% 47%;         /* Warm orange */
--warning-foreground: 220 20% 6%;

/* Info - Information/Help */
--info: 200 90% 50%;           /* Bright blue */
--info-foreground: 0 0% 100%;

/* Destructive - Errors/Danger */
--destructive: 0 72% 51%;       /* Cinematic red */
--destructive-foreground: 0 0% 100%;
```

### Stage Status Colors

```css
--stage-locked: 142 70% 45%;    /* Green for completed */
--stage-active: 38 90% 55%;     /* Gold for current */
--stage-pending: 220 10% 40%;   /* Gray for upcoming */
--stage-outdated: 45 93% 47%;   /* Orange for needs attention */
```

### Border & Input Colors

```css
--border: 220 15% 18%;          /* Subtle border */
--input: 220 15% 14%;           /* Input background */
--ring: 38 90% 55%;             /* Focus ring (gold) */
```

### Sidebar Colors

```css
--sidebar-background: 220 22% 5%;     /* Darker sidebar */
--sidebar-foreground: 40 15% 80%;
--sidebar-primary: 38 90% 55%;
--sidebar-accent: 220 15% 12%;
--sidebar-border: 220 15% 12%;
```

---

## Typography

### Font Families

```css
--font-display: 'Cormorant Garamond', Georgia, serif;
--font-sans: 'Inter Variable', system-ui, sans-serif;
```

### Font Usage Guidelines

| Element | Font Family | Weight | Size | Color | Usage |
|---------|-------------|--------|------|-------|-------|
| **H1 (Page Titles)** | Display | 700 | 2.25rem (36px) | foreground | Main page headings |
| **H2 (Section Titles)** | Display | 600 | 1.875rem (30px) | foreground | Major sections |
| **H3 (Component Titles)** | Display | 500 | 1.5rem (24px) | foreground | Card/component headers |
| **Body Text** | Sans | 400 | 1rem (16px) | foreground | Primary content |
| **Small Text** | Sans | 400 | 0.875rem (14px) | muted-foreground | Secondary info |
| **Captions** | Sans | 400 | 0.75rem (12px) | muted-foreground | Metadata, timestamps |

### Typography Classes

```css
/* Display text with gradient effect */
.text-gradient-gold {
  background: linear-gradient(135deg, hsl(38, 90%, 55%) 0%, hsl(25, 85%, 50%) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Standard text hierarchy */
.font-display { font-family: var(--font-display); }
.font-sans { font-family: var(--font-sans); }
```

---

## Layout & Spacing

### Container System

```css
/* Main layout containers */
.container { max-width: 1400px; margin: 0 auto; padding: 0 2rem; }

/* Sidebar width */
.sidebar-collapsed { width: 72px; }
.sidebar-expanded { width: 280px; }
```

### Spacing Scale (Tailwind-based)

| Spacing | Value | Usage |
|---------|-------|-------|
| **space-1** | 0.25rem (4px) | Minimal gaps |
| **space-2** | 0.5rem (8px) | Small component spacing |
| **space-3** | 0.75rem (12px) | Icon-text gaps |
| **space-4** | 1rem (16px) | Standard spacing |
| **space-6** | 1.5rem (24px) | Section spacing |
| **space-8** | 2rem (32px) | Major sections |
| **space-12** | 3rem (48px) | Page sections |

### Grid Systems

```css
/* Project grid */
.grid-cols-1 { /* Mobile */ }
.grid-cols-2 { /* Tablet */ }
.grid-cols-3 { /* Desktop */ }

/* Sidebar layout */
.flex { display: flex; }
.flex-col { flex-direction: column; }
.flex-1 { flex: 1 1 0%; }
```

---

## Component Patterns

### Buttons

```tsx
// Primary actions - Gold gradient with glow
<Button variant="default">Create Project</Button>

// Secondary actions - Muted slate
<Button variant="secondary">Cancel</Button>

// Special actions - Glass effect
<Button variant="glass">Advanced Settings</Button>

// Stage-specific - Status-aware styling
<Button variant="stage-active">Continue to Next Stage</Button>
```

### Cards

```tsx
// Standard project card with hover effects
<div className="card-hover rounded-xl bg-card border border-border overflow-hidden">
  {/* Thumbnail gradient */}
  <div className="h-32 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent" />
  {/* Content */}
  <div className="p-5">
    <h3 className="font-display text-xl font-semibold">Project Title</h3>
    {/* ... */}
  </div>
</div>
```

### Stage Indicators

```tsx
// Stage timeline nodes
<div className="stage-node stage-node-active">
  <Circle className="w-4 h-4" />
</div>

// Status dots for progress
<span className="w-2 h-2 rounded-full bg-success" />
```

### Navigation

```tsx
// Global sidebar items
<button className="sidebar-item sidebar-item-active">
  <Icon className="w-5 h-5" />
  <span>Projects</span>
</button>
```

---

## Visual Effects & Animations

### Gradients

```css
--gradient-gold: linear-gradient(135deg, hsl(38, 90%, 55%) 0%, hsl(25, 85%, 50%) 100%);
--gradient-card: linear-gradient(180deg, hsl(220, 18%, 11%) 0%, hsl(220, 18%, 9%) 100%);
--gradient-sidebar: linear-gradient(180deg, hsl(220, 22%, 7%) 0%, hsl(220, 22%, 4%) 100%);
--gradient-hero: linear-gradient(135deg, hsl(220, 20%, 8%) 0%, hsl(220, 25%, 4%) 50%, hsl(220, 20%, 6%) 100%);
```

### Shadows

```css
--shadow-sm: 0 1px 2px 0 hsl(220, 20%, 0% / 0.3);
--shadow-md: 0 4px 6px -1px hsl(220, 20%, 0% / 0.4), 0 2px 4px -2px hsl(220, 20%, 0% / 0.3);
--shadow-lg: 0 10px 15px -3px hsl(220, 20%, 0% / 0.5), 0 4px 6px -4px hsl(220, 20%, 0% / 0.4);
--shadow-gold: 0 0 20px hsl(38, 90%, 55% / 0.15);
--shadow-glow: 0 0 40px hsl(38, 90%, 55% / 0.2);
```

### Glass Effects

```css
.glass {
  @apply bg-card/80 backdrop-blur-xl border border-border/50;
}
```

### Glow Effects

```css
.glow-gold {
  box-shadow: var(--shadow-gold);
}

.glow-gold-intense {
  box-shadow: var(--shadow-glow);
}
```

### Animations

```css
/* Transition timings */
--transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-base: 250ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-slow: 400ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-spring: 500ms cubic-bezier(0.34, 1.56, 0.64, 1);

/* Keyframe animations */
@keyframes fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 20px hsl(38, 90%, 55% / 0.15); }
  50% { box-shadow: 0 0 30px hsl(38, 90%, 55% / 0.3); }
}
```

---

## Iconography

### Icon Library
- **Primary:** Lucide React icons
- **Style:** Outline, 16px-24px sizes
- **Color:** Inherit from text color or use semantic colors

### Icon Usage Guidelines

| Context | Size | Color | Example |
|---------|------|-------|---------|
| **Navigation** | 20px (w-5 h-5) | sidebar-foreground | Home, FileText |
| **Actions** | 16px (w-4 h-4) | foreground | Search, Filter |
| **Status** | 16px (w-4 h-4) | semantic | Check, AlertTriangle |
| **Inline text** | 14px (w-3.5 h-3.5) | muted-foreground | Clock, GitBranch |

### Semantic Icon Mapping

```tsx
// Status icons
locked: Check
active: Circle
pending: Circle
outdated: AlertTriangle

// Navigation icons option 1
Projects: Home
Style Capsule Library: FileText 
Asset Library: Box

// OR

// Navigation icons option 2
Projects: Home
Style Capsule Library: FileText 
Style Capsule Library: Image
Asset Library: Box

// Actions
Search: Search
Filter: Filter
Sort: SortAsc
New: Plus
```

---

## Responsive Design

### Breakpoints

```css
/* Mobile First */
sm: 640px   /* Small tablets */
md: 768px   /* Tablets */
lg: 1024px  /* Laptops */
xl: 1280px  /* Desktops */
2xl: 1400px /* Large screens */
```

### Layout Adaptations

```css
/* Mobile: Single column, collapsed sidebar */
@media (max-width: 768px) {
  .sidebar { width: 0; } /* Hidden on mobile */
  .grid-cols-3 { grid-template-columns: 1fr; }
}

/* Tablet: Two columns */
@media (min-width: 768px) {
  .grid-cols-3 { grid-template-columns: repeat(2, 1fr); }
}

/* Desktop: Three columns */
@media (min-width: 1024px) {
  .grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
}
```

---

## Accessibility

### Color Contrast
- **Primary text on background:** 15:1 contrast ratio
- **Secondary text on background:** 10:1 contrast ratio
- **Interactive elements:** Minimum 3:1 contrast ratio

### Focus States
```css
.focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}
```

### Motion Preferences
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Implementation Guidelines

### CSS Custom Properties Usage

```css
/* Always use CSS custom properties for theming */
.btn-primary {
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}

/* For gradients and complex effects */
.gold-gradient {
  background: var(--gradient-gold);
}
```

### Component Variants

```tsx
// Use class-variance-authority for component variants
const buttonVariants = cva(
  "base-classes",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        gold: "bg-gradient-to-r from-primary to-accent",
        glass: "bg-card/60 backdrop-blur-lg border border-border/50",
      }
    }
  }
);
```

### Dark Mode Support

```css
/* CSS custom properties automatically support dark mode */
/* Light mode overrides in a separate layer */
.light {
  --background: 40 30% 97%;
  --foreground: 220 20% 10%;
  /* ... other overrides */
}
```

---

## File Organization

```
/src
  /components
    /ui/              # Reusable UI components (shadcn/ui based)
    /layout/          # Layout components (sidebar, headers)
    /dashboard/       # Dashboard-specific components
    /pipeline/        # Pipeline stage components
  /pages/            # Page components
  /lib/              # Utilities and helpers
  /hooks/            # Custom React hooks
  index.css          # Global styles and design tokens
```

---

## Development Workflow

### 1. **Design Token First**
Always define colors, spacing, and typography in CSS custom properties before implementing components.

### 2. **Component Variants**
Use consistent variant patterns for buttons, cards, and other reusable components.

### 3. **Semantic Naming**
Use semantic class names that describe purpose, not appearance:
- ✅ `sidebar-item-active`
- ❌ `bg-gold-text-white`

### 4. **Animation Guidelines**
- Use `transition-base` (250ms) for most interactions
- Reserve `transition-spring` for delight moments
- Always respect `prefers-reduced-motion`

### 5. **Testing Visual Consistency**
- Compare components across different stages
- Ensure status colors are consistently applied
- Verify responsive behavior on multiple screen sizes

---

This design system ensures Aiuteur maintains a cohesive, professional appearance throughout its 12-stage pipeline while providing an intuitive and visually appealing interface for complex AI film production workflows.

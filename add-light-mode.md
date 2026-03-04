╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ Plan: Add Light/Dark Mode Toggle

 Context

 The app is a dark-first cinematic design (deep charcoal + golden amber accents). A .light CSS class with partial light-mode overrides already exists in src/index.css, and next-themes is already installed (^0.3.0) but not wired up. The goal is to   
 add a toggle in the sidebar so users can switch between dark, light, and system themes with preference persistence.

 ---
 Step 1 — Complete the .light CSS overrides (src/index.css)

 The .light class (lines 108-125) is missing tokens for: --ring, --destructive, --destructive-foreground, all --sidebar-* vars, --success/warning/info, --stage-*, --gradient-*, --shadow-*.

 Add all missing tokens inside the existing .light { } block with light-appropriate values (lighter sidebar, reduced shadow opacity, warmer gradients).

 Also add themed screenplay tokens to both :root and .light:
 --screenplay-heading: ...;
 --screenplay-char: ...;
 --screenplay-paren: ...;

 Update the pulse-glow keyframe (line 251-254) to use CSS variable references instead of hardcoded HSL.

 Step 2 — Fix hardcoded colors in src/styles/screenplay.css

 Replace the three rgb(...) values (lines 16, 30, 46) with hsl(var(--screenplay-heading)), hsl(var(--screenplay-char)), hsl(var(--screenplay-paren)) so they respond to theme changes.

 Step 3 — Wire up ThemeProvider (src/App.tsx)

 Wrap the entire app with <ThemeProvider> from next-themes as the outermost wrapper (above QueryClientProvider):

 <ThemeProvider
   attribute="class"
   defaultTheme="dark"
   enableSystem
   storageKey="aiuteur-theme"
   value={{ dark: "dark", light: "light" }}
 >
   ...existing tree...
 </ThemeProvider>

 This maps: dark mode → class="dark" on <html>, light mode → class="light". The :root stays as the dark default; .light overrides it. The dark class also activates Tailwind's dark: prefix utilities (already used in 5 places in the codebase).        

 Step 4 — Create toggle component (src/components/ui/theme-toggle.tsx)

 A sidebar-friendly cycle button (dark → light → system → dark) using useTheme from next-themes. Uses Sun/Moon/Monitor icons from lucide-react. Respects the sidebar's collapsed state (icon-only when collapsed).

 Styled with the existing .sidebar-item CSS class for visual consistency.

 Step 5 — Place toggle in GlobalSidebar (src/components/layout/GlobalSidebar.tsx)

 - Import and render <ThemeToggle> in the bottom "User Actions" section, between Sign Out and the Collapse toggle.
 - Pass collapsed state to the toggle.
 - Fix the hardcoded style={{ backgroundColor: '#0d1015' }} on line 53 → replace with bg-sidebar or hsl(var(--sidebar-background)).

 Step 6 — Update keyframe animation (tailwind.config.ts)

 Update the pulse-glow keyframe to reference var(--shadow-gold) and var(--shadow-glow) CSS variables instead of hardcoded HSL, so the animation adapts per theme.

 ---
 Files to modify

 1. src/index.css — complete .light block, add screenplay tokens, update pulse-glow keyframe
 2. src/styles/screenplay.css — replace hardcoded RGB with CSS vars
 3. src/App.tsx — wrap with <ThemeProvider>
 4. NEW src/components/ui/theme-toggle.tsx — toggle component
 5. src/components/layout/GlobalSidebar.tsx — render toggle, fix hardcoded color
 6. tailwind.config.ts — update pulse-glow keyframe

 Items left as-is (no changes needed)

 - text-white / bg-black on image/video overlays — intentional for content contrast
 - chart.tsx — already handles .dark selector, works automatically
 - sonner.tsx — already uses useTheme(), will now get actual theme from provider
 - Status badges with explicit colors (e.g., bg-green-600 text-white) — work in both themes

 Verification

 1. Run npm run lint after all changes
 2. Run npm run dev and test:
   - Toggle cycles through dark → light → system
   - Sidebar, cards, modals, stage indicators all update
   - Screenplay editor colors respond to theme
   - Gold glow/pulse animations adapt
   - Preference persists on page refresh (check localStorage for aiuteur-theme)
   - System preference detection works (set OS to light, choose "System")
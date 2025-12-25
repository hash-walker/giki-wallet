# Transport System Frontend – Tech Terms Guide

This file explains the main concepts, libraries, and patterns you will see in this frontend project, assuming you already know basic HTML, CSS, and Tailwind CSS.

---

## 1. Project Stack

- **React**: JavaScript library for building user interfaces using components. In this project we use **function components** only (no classes).
- **TypeScript (TS)**: JavaScript + types. It helps catch errors early and makes large codebases easier to understand.
- **Vite**: Build tool and dev server. Handles fast reload, bundling, and uses the React + TS config in `vite.config.ts`.
- **Tailwind CSS**: Utility-first CSS framework. We mostly style with class names like `flex`, `px-4`, `text-gray-700`, etc.

---

## 2. React Basics Used Here

- **Component**: A function that returns JSX.
  - Example: `export const BookingCard = (props) => { return (<div>...</div>); };`
- **JSX**: HTML-like syntax inside JavaScript/TypeScript. Vite and TypeScript compile it to real JS.
- **Props**: Inputs to a component.
  - Example: `BookingCard` receives `direction`, `bookingData`, and `onBook`.
- **State (`useState`)**:
  - `const [value, setValue] = useState(initialValue);`
  - Remembers data for a component across renders (e.g., selected city, ticket count).
- **`useMemo`**:
  - `useMemo(() => computeSomething(), [dependencies]);`
  - Caches a computed value (like filtered time slots) so it doesn’t recompute on every render unless dependencies change.
- **`useEffect`** (older pattern; we mostly moved away from it for internal resets):
  - Runs side effects (e.g., interacting with browser APIs, timers, subscriptions).  
  - In this project, we now reset selection state directly in event handlers instead of using `useEffect`.
- **`children` / `React.ReactNode`**:
  - `React.ReactNode` means “anything you can render in JSX” (strings, elements, fragments, etc.).
  - Used when a component accepts JSX content between its tags.

---

## 3. TypeScript Concepts in This Project

- **Type alias**: `type BookingSelection = { cityId: string | null; ... }`
  - Gives a name to a shape of data.
- **Interface**: `interface Schedule { id: number; tickets: number; ... }`
  - Similar to a type alias; often used for objects.
- **Union type**: `type RouteDirection = 'from-giki' | 'to-giki';`
  - A value can be one of a fixed set of strings.
- **Optional property**: `tickets?: number`
  - The `?` means the property may be `undefined`.
- **Generics** (lightly used via library types):
  - Example: `VariantProps<typeof buttonVariants>` comes from `class-variance-authority` and describes the variant/size options a button can accept.

---

## 4. Tailwind CSS Patterns Used

- **Utility classes**:
  - Layout: `flex`, `flex-col`, `items-center`, `justify-between`, `gap-4`.
  - Spacing: `p-4`, `px-4`, `py-8`, `mt-6`, `space-y-3`.
  - Typography: `text-sm`, `text-lg`, `font-semibold`, `text-gray-600`.
  - Borders & radius: `border`, `border-gray-200`, `rounded-lg`, `rounded-xl`.
  - Background & color: `bg-white`, `bg-primary`, `text-primary`, `bg-black/40`.
- **Responsive prefixes**:
  - `md:` means “apply from medium screens and up”.
  - Example: `className="block md:hidden"` → show on mobile, hide on desktop.
  - `className="hidden md:flex"` → hide on mobile, show on desktop.
- **Custom colors and tokens**:
  - Defined in `src/index.css` using CSS variables like `--primary`.
  - Tailwind maps them to classes like `bg-primary`, `text-primary`, `bg-light-background`, etc.

---

## 5. Routing & Layout Concepts

- **`App.tsx`**:
  - Top-level React component for the SPA (single-page application).
  - Renders `Navbar`, `BookingPage`, and `Footer` in a vertical `flex` layout.
- **`PageLayout`**:
  - Shared layout component with header, main content, and footer.
  - Uses `flex-1` on `<main>` to push the footer down when content is short.
- **Navbar**:
  - Shows the GIKI logo, “My Bookings”, and “Sign In”.
  - Implements a **mobile menu drawer** using state (`isMobileMenuOpen`) and Tailwind transitions.
- **Footer**:
  - Simple bottom section with aligned content and project/company information.

---

## 6. Booking Module Concepts

- **`BookingPage`**:
  - Top-level page for booking bus routes.
  - Renders:
    - `PageHeader` (title + legend)
    - Two sections: “Departing From GIKI” and “Returning To GIKI”.
- **`BookingSection`**:
  - Wraps one direction (from/to GIKI).
  - Displays desktop table headers (City, Date & Time, Location, Type, Available, Qty, Action).
  - Contains one `BookingCard`.
- **`BookingCard`**:
  - The core booking UI.
  - Manages local state:
    - `selectedCityId`, `selectedTimeSlotId`, `selectedStopId`, `ticketCount`.
  - Uses helper functions from `mockRoutes.ts`:
    - `getAvailableTimeSlotsForCity`
    - `getAvailableStopsForCityAndTime`
    - `getScheduleForSelection`
  - Uses `BookingData` and `Schedule` types from `types.ts`.

---

## 7. Cascading Selects (Dependent Dropdowns)

These are the dropdowns where each choice affects the next:

- **City → Time Slot → Stop**:
  - When city changes:
    - Time slots are filtered to only those available for that city.
    - Previously selected time slot and stop are cleared.
  - When time slot changes:
    - Stops are filtered based on city + time.
    - Previously selected stop is cleared.
  - When stop changes:
    - Ticket count resets to 1.
  - Implementation:
    - Uses `useState` for selections.
    - Uses `useMemo` for `availableTimeSlots`, `availableStops`, and `currentSchedule`.
    - Reset logic is in `handleCityChange`, `handleTimeSlotChange`, and `handleStopChange`.

---

## 8. Shared UI Components

- **`Select`** (custom dropdown component):
  - Props like:
    - `options`: array of `{ value, label }`.
    - `value`: current selected value.
    - `onChange`: callback when selection changes.
    - `label`, `placeholder`, `disabled`, `showLabel`.
  - Used for City, Date & Time, and Pickup/Drop selectors.
- **`Button`** (from `src/components/ui/button.tsx`):
  - Wraps a `<button>` element with Tailwind + variants.
  - Variants: `variant="default" | "secondary" | "outline" | "ghost" | "link" | "destructive"`.
  - Sizes: `size="sm" | "default" | "lg" | "icon"` etc.
  - Uses `buttonVariants` for consistent styling.
- **`LoadingState` / `ErrorState`**:
  - Simple reusable components for showing loading spinners and error messages.
  - Live in `src/components/ui/` so they can be used by any page.

---

## 9. Data & Mock API Layer

- **`mockRoutes.ts`**:
  - Contains in-memory mock data for:
    - `cities`, `timeSlots`, `stops`, `schedules`.
  - Provides helper functions:
    - `getBookingData(direction)` → returns all relevant data for a direction.
    - `getAvailableTimeSlotsForCity(...)`
    - `getAvailableStopsForCityAndTime(...)`
    - `getScheduleForSelection(...)`
  - This simulates how a real API might behave, but without network calls.

- **`types.ts`** (booking types):
  - Central place for TypeScript types used in the booking flow:
    - `City`, `TimeSlot`, `Stop`, `Schedule`
    - `BookingData`, `BookingSelection`
    - `RouteDirection` (from/to GIKI)

---

## 10. Tooling & Config

- **`tsconfig.json`**:
  - Configures TypeScript:
    - `baseUrl`, `paths` for `@/...` imports.
    - `jsx: "react-jsx"` for React 17+ JSX transform.
    - `moduleResolution: "bundler"` for Vite + modern ESM packages.
- **`eslint`**:
  - Lints the code (`npm run lint`).
  - Key rules you saw:
    - `no-unused-vars`: flags unused imports/variables.
    - `react-refresh/only-export-components`: keep non-component code out of component files for fast refresh.
    - React hooks rules (avoiding `setState` inside effects).

---

## 11. How to Use This File

- When you see a new term in the code (e.g., `useMemo`, `RouteDirection`, `variant="ghost"`), search this file for it.
- If something you see in the code is **not** explained here, you can:
  - Note the exact word/line.
  - Ask to extend this glossary with that term.



# 👶 Baby Tracker App

A modern, mobile-first baby tracking application with a beautiful winter-themed design built with Next.js 16, React, TypeScript, and Tailwind CSS.

## 🎨 Design Features

### Winter/Snowy Theme ❄️
- **Light Mode**: Soft pastel colors (baby blue, light gray, white, ice blue, silver)
- **Dark Mode**: Midnight snow theme (deep blue-navy backgrounds with white/silver accents)
- **Rounded Friendly Aesthetic**: Using Poppins and Quicksand fonts for a modern, approachable feel
- **Snowflake Decorations**: Subtle animated snowflakes as design elements

### Color Palette
- **Primary**: Soft Baby Blue (#AED9E0 light, #B8D4E3 dark)
- **Secondary**: Light Gray-Blue
- **Accents**: Ice Blue, Silver
- **Status Colors**: Yellow (💩), Blue (💧), Orange (🍼), Purple (😴), Green (☀️), Pink (👶)

## 🚀 Iterasi 1 - Core Features (✅ COMPLETED)

### Dashboard/Home
- ✅ Daily summary with last times for each activity
- ✅ Quick-log buttons with smooth animations:
  - 💩 **Pup**: Emoji jumps + "plop" effect + toast notification
  - 💧 **Pipis**: Droplet falls + ripple effect + blue
  - 🍼 **Menyusui**: Bottle animation + wiggle effect
  - 😴 **Sleep**: Moon & stars rotate + dim transition
  - ☀️ **Wake**: Sun rises + fade in + sparkle
  - 👶 **Baby Time**: Fun interaction button

### Components
- ✅ `Dashboard`: Main home page with daily view
- ✅ `QuickLogButton`: Reusable button with animations
- ✅ `DailySummary`: Shows counts and last times
- ✅ `Toast`: Toast notifications for confirmations
- ✅ `BottomNav`: Mobile-friendly navigation bar

### Animations
- ✅ Bounce/scale on tap
- ✅ Ripple effect feedback
- ✅ Emoji scale animations
- ✅ Toast slide-up animation
- ✅ Smooth page transitions

## 📋 Iterasi 2 - Riwayat & Statistik (NOT STARTED)

### Features to Build
1. **History Page**: 
   - Filter by daily/weekly/monthly
   - Timeline view with cards
   - Activity details

2. **Statistics Page**:
   - Weekly/monthly summaries
   - Growth charts (smooth curve, gradient fill)
   - Insights (average sleep, feeding consistency)
   - Zona referensi visualization

## 👶 Iterasi 3 - Additional Pages (NOT STARTED)

### Features to Build
1. **Baby Profile**: Name, birthdate, birth weight/length, profile photo
2. **Immunization Checklist**: Vaccine tracking by age
3. **Development Checklist**: Skills per age group
4. **Daily Notes**: Free-form notes + optional photos
5. **Milestones**: Achievement tracking with celebration animations

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Animation**: Framer Motion
- **Fonts**: Poppins (body), Quicksand (headings)
- **State Management**: React Hooks (useState)

## 📁 Project Structure

```
components/
├── dashboard.tsx           # Main home page
├── quick-log-button.tsx    # Reusable log button with animations
├── daily-summary.tsx       # Summary card showing today's stats
├── toast.tsx               # Toast notification component
├── bottom-nav.tsx          # Bottom navigation
├── history-page.tsx        # History view (placeholder)
└── stats-page.tsx          # Statistics view (placeholder)

app/
├── layout.tsx              # Root layout with fonts & theme
├── page.tsx                # Main page router
└── globals.css             # Global styles & design tokens
```

## 🎯 Next Steps (Backend Integration)

1. **Database Setup**: Choose between Neon + Better Auth, Supabase, or other
2. **Authentication**: User accounts for parents/babysitters
3. **Data Persistence**: Save logs to database
4. **Real-time Updates**: Sync across devices
5. **Cloud Deployment**: Deploy to Vercel

## 🔧 Available Scripts

```bash
# Development
pnpm dev

# Production build
pnpm build

# Start production server
pnpm start

# Linting
pnpm lint
```

## 📱 Mobile First

- Optimized for iPhone (13/15 and later)
- Safe-area inset support for notch/Dynamic Island
- Thumb-friendly button sizes
- Responsive grid layouts
- Touch-optimized animations (no lag)

## 🎵 Audio & Notifications

- Default audio is **OFF** for night use
- Visual animations only
- Toast notifications for confirmations

## 🌙 Dark Mode

Automatically switches between light and dark themes:
- Light: Soft pastels for daytime
- Dark: Deep blue-navy for nighttime viewing (malam bersalju theme)

---

## 📝 Notes for Continuation

- This project is **frontend-only** (Iterasi 1) with placeholder pages
- All data is stored in React state (client-side) - use backend integration for persistence
- Toast messages auto-dismiss after 2 seconds
- Animations use Framer Motion for smooth, performant interactions
- Theme colors are defined as CSS design tokens for easy customization

---

**Silakan lanjutkan dengan Iterasi 2 (History & Statistics) atau setup backend database!** 🚀

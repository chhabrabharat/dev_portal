// Design tokens - copied VERBATIM from crm_frontend/src/styles/js/styleConstants.js.
//
// Kept as an exact copy rather than a trimmed-down subset so that diffing the two files stays a
// meaningful way to spot design drift between the clinic app and this portal. Some tokens here
// (the mobile* colors, for instance) are unused by an internal desktop admin console - that's
// the cost of keeping the copy exact, and it's cheaper than the two palettes silently diverging.
//
// Portal-specific additions belong in ./adminTokens.js, NOT inline here.

export const COLORS = {
  // Primary Colors (calm clinical cyan - ui-ux-pro-max healthcare palette)
  primary: '#0e7490',
  primaryDark: '#155e75',
  primaryLight: '#22d3ee',

  // Secondary Colors (health emerald accent/CTA)
  secondary: '#059669',
  secondaryDark: '#047857',
  secondaryLight: '#34d399',

  // Accent Colors
  accent: '#059669',
  success: '#059669',
  warning: '#d97706',
  error: '#dc2626',

  // Text Colors - cyan-slate foreground per ui-ux-pro-max healthcare palette
  textPrimary: '#164e63',
  textSecondary: '#475569',
  textMuted: '#64748b',
  textOnPrimary: '#ffffff',

  // Background Colors
  background: '#ffffff',
  backgroundPrimary: '#ecfeff',
  backgroundSecondary: '#e8f1f6',
  // Cards need their own surface color to read as elevated panels - transparent
  // meant every card silently blended into whatever was behind it.
  backgroundCard: '#ffffff',

  // Border Colors
  borderLight: '#a5f3fc',
  borderGreen: '#67e8f9',

  // Shadow Colors
  shadowGreen: 'rgba(14, 116, 144, 0.12)',
  shadowGreenLight: 'rgba(14, 116, 144, 0.06)',

  // Medical Blue (Legacy support)
  medicalBlue: '#1976d2',
  medicalBlueLight: '#42a5f5',
  medicalBlueDark: '#1565c0',

  // Status Colors
  statusOnline: '#059669',
  statusOffline: '#64748b',
  statusWarning: '#d97706',
  statusError: '#dc2626',

  // Mobile-specific colors for better visibility
  mobileTextPrimary: '#000000',
  mobileTextSecondary: '#164e63',
  mobileTextMuted: '#475569',
  mobileBackground: '#ffffff',
  mobileBackgroundSecondary: '#e8f1f6',
};

export const SPACING = {
  // Base spacing scale (4px base unit)
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  xxl: '24px',
  xxxl: '32px',
  
  // Component-specific spacing
  inputPadding: '12px 16px',
  buttonPadding: '12px 24px',
  cardPadding: '20px 28px',
  cardPaddingMobile: '16px 12px',
  
  // Layout spacing
  sectionSpacing: '40px',
  sectionSpacingMobile: '24px',
  containerPadding: '16px 24px',
  containerPaddingMobile: '12px 16px',
};

export const TYPOGRAPHY = {
  // Font families
  fontFamily: "'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif",

  // Font sizes
  fontSize: {
    xs: '12px',
    sm: '13px',
    base: '14px',
    md: '15px',
    lg: '16px',
    xl: '18px',
    xxl: '20px',
    xxxl: '22px',
    title: '32px',
    heading: '28px',
    subheading: '22px',
  },
  
  // Font weights
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
  },
  
  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },
  
  // Letter spacing
  letterSpacing: {
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
};

export const BREAKPOINTS = {
  // Breakpoint values
  mobile: '768px',
  tablet: '1024px',
  desktop: '1200px',
  wideDesktop: '1440px',
  ultraWide: '1920px',

  // Media query helpers
  mobileDown: '(max-width: 767px)',
  mobileUp: '(min-width: 768px)',
  tabletDown: '(max-width: 1023px)',
  tabletUp: '(min-width: 1024px)',
  desktopUp: '(min-width: 1200px)',
  wideDesktopUp: '(min-width: 1440px)',
  ultraWideUp: '(min-width: 1920px)',
};

export const SHADOWS = {
  // Box shadows
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  
  // Medical theme shadows
  green: '0 2px 8px rgba(13, 148, 136, 0.2)',
  greenLight: '0 2px 16px rgba(13, 148, 136, 0.1)',
  card: '0 2px 16px rgba(13, 148, 136, 0.08)',
  button: '0 2px 8px rgba(13, 148, 136, 0.2)',
  buttonHover: '0 4px 12px rgba(13, 148, 136, 0.3)',
};

export const BORDER_RADIUS = {
  none: '0',
  sm: '6px',
  base: '8px',
  md: '10px',
  lg: '14px',
  xl: '18px',
  xxl: '22px',
  xxxl: '28px',
  full: '9999px',
};

export const Z_INDEX = {
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  toast: 2000,
};

export const TRANSITIONS = {
  // Duration
  fast: '0.15s',
  base: '0.2s',
  slow: '0.3s',
  slower: '0.5s',
  
  // Easing functions
  easeInOut: 'ease-in-out',
  easeOut: 'ease-out',
  easeIn: 'ease-in',
  
  // Common transitions
  all: 'all 0.2s ease-in-out',
  transform: 'transform 0.2s ease-in-out',
  opacity: 'opacity 0.2s ease-in-out',
  colors: 'background-color 0.2s ease-in-out, border-color 0.2s ease-in-out, color 0.2s ease-in-out',
};

// Component size constants
export const COMPONENT_SIZES = {
  // Input heights
  inputHeight: '48px',
  inputHeightMobile: '44px',
  
  // Button heights
  buttonHeight: '48px',
  buttonHeightMobile: '44px',
  buttonHeightSmall: '36px',
  
  // Icon sizes
  iconSmall: '16px',
  iconBase: '20px',
  iconLarge: '24px',
  iconXLarge: '32px',
  
  // Avatar sizes
  avatarSmall: '32px',
  avatarBase: '48px',
  avatarLarge: '64px',
};

// Layout constants
export const LAYOUT = {
  // Container max widths - fluid past 1200px so wide monitors aren't
  // stuck at a laptop-width column with empty gutters on both sides.
  containerMaxWidth: 'min(96vw, 1800px)',
  cardMaxWidth: '900px',
  formMaxWidth: '600px',
  
  // Sidebar
  sidebarWidth: '270px',
  sidebarWidthCollapsed: '60px',
  
  // Header
  headerHeight: '64px',
  
  // Content spacing
  contentPadding: '2rem',
  contentPaddingMobile: '1rem',
};
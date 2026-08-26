import { createTheme } from '@mui/material/styles';
import { COLORS, TYPOGRAPHY, SHADOWS, BORDER_RADIUS, TRANSITIONS } from './styleConstants';

export const muiTheme = createTheme({
  palette: {
    primary: {
      main: COLORS.primary,
      dark: COLORS.primaryDark,
      light: COLORS.primaryLight,
    },
    secondary: {
      main: COLORS.secondary,
      dark: COLORS.secondaryDark,
      light: COLORS.secondaryLight,
    },
    error: {
      main: COLORS.error,
    },
    warning: {
      main: COLORS.warning,
    },
    success: {
      main: COLORS.success,
    },
    text: {
      primary: COLORS.textPrimary,
      secondary: COLORS.textSecondary,
    },
    background: {
      default: COLORS.backgroundPrimary,
    },
  },
  typography: {
    fontFamily: TYPOGRAPHY.fontFamily,
    h1: { fontWeight: TYPOGRAPHY.fontWeight.extrabold, letterSpacing: TYPOGRAPHY.letterSpacing.tight },
    h2: { fontWeight: TYPOGRAPHY.fontWeight.extrabold, letterSpacing: TYPOGRAPHY.letterSpacing.tight },
    h3: { fontWeight: TYPOGRAPHY.fontWeight.bold },
    h4: { fontWeight: TYPOGRAPHY.fontWeight.bold },
    h5: { fontWeight: TYPOGRAPHY.fontWeight.semibold },
    h6: { fontWeight: TYPOGRAPHY.fontWeight.semibold },
    button: { fontWeight: TYPOGRAPHY.fontWeight.semibold, textTransform: 'none' },
  },
  shape: {
    borderRadius: parseInt(BORDER_RADIUS.lg, 10),
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: BORDER_RADIUS.md,
          textTransform: 'none',
          fontWeight: TYPOGRAPHY.fontWeight.semibold,
          boxShadow: 'none',
          transition: TRANSITIONS.all,
        },
        contained: {
          boxShadow: SHADOWS.button,
          '&:hover': {
            boxShadow: SHADOWS.buttonHover,
            transform: 'translateY(-1px)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        rounded: {
          borderRadius: BORDER_RADIUS.xl,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: BORDER_RADIUS.xl,
          boxShadow: SHADOWS.card,
          border: `1px solid ${COLORS.borderLight}`,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: BORDER_RADIUS.md,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: BORDER_RADIUS.full,
          fontWeight: TYPOGRAPHY.fontWeight.medium,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: BORDER_RADIUS.base,
          fontSize: TYPOGRAPHY.fontSize.sm,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: SHADOWS.sm,
        },
      },
    },
  },
});

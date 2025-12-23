import { createTheme, ThemeOptions } from '@mui/material/styles';

// Color palette - Professional & Modern
const COLORS = {
  // Primary - Professional Blue
  primary: '#1E40AF', // Deep professional blue
  primaryLight: '#3B82F6',
  primaryDark: '#1E3A8A',
  
  // Secondary - Accent Green
  secondary: '#10B981', // Fresh green for success/gains
  secondaryLight: '#6EE7B7',
  secondaryDark: '#059669',
  
  // Success/Gains - Green
  success: '#10B981',
  successLight: '#D1FAE5',
  successDark: '#047857',
  
  // Danger/Losses - Red
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  dangerDark: '#DC2626',
  
  // Warning/Neutral - Amber
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  warningDark: '#D97706',
  
  // Info/Neutral - Sky Blue
  info: '#0EA5E9',
  infoLight: '#E0F2FE',
  infoDark: '#0284C7',
  
  // Neutral grays
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
};

// Light theme
const lightTheme: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: {
      main: COLORS.primary,
      light: COLORS.primaryLight,
      dark: COLORS.primaryDark,
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: COLORS.secondary,
      light: COLORS.secondaryLight,
      dark: COLORS.secondaryDark,
      contrastText: '#FFFFFF',
    },
    success: {
      main: COLORS.success,
      light: COLORS.successLight,
      dark: COLORS.successDark,
      contrastText: '#FFFFFF',
    },
    error: {
      main: COLORS.danger,
      light: COLORS.dangerLight,
      dark: COLORS.dangerDark,
      contrastText: '#FFFFFF',
    },
    warning: {
      main: COLORS.warning,
      light: COLORS.warningLight,
      dark: COLORS.warningDark,
      contrastText: '#FFFFFF',
    },
    info: {
      main: COLORS.info,
      light: COLORS.infoLight,
      dark: COLORS.infoDark,
      contrastText: '#FFFFFF',
    },
    background: {
      default: COLORS.gray50,
      paper: '#FFFFFF',
    },
    text: {
      primary: COLORS.gray900,
      secondary: COLORS.gray600,
      disabled: COLORS.gray400,
    },
    divider: COLORS.gray200,
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.5px',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 700,
      lineHeight: 1.3,
      letterSpacing: '-0.25px',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.6,
      letterSpacing: '0.15px',
    },
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.75,
      color: COLORS.gray700,
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 600,
      lineHeight: 1.57,
      letterSpacing: '0.1px',
      color: COLORS.gray700,
    },
    body1: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: 1.43,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
      fontSize: '0.9375rem',
    },
    caption: {
      fontSize: '0.75rem',
      fontWeight: 500,
      lineHeight: 1.66,
      letterSpacing: '0.4px',
      color: COLORS.gray600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: '8px',
          padding: '10px 16px',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)',
          },
        },
        contained: {
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.08)',
          '&:hover': {
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.12)',
          },
        },
        outlined: {
          borderWidth: '1.5px',
          '&:hover': {
            borderWidth: '1.5px',
          },
        },
      },
      defaultProps: {
        disableElevation: false,
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          border: `1px solid ${COLORS.gray200}`,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
            borderColor: COLORS.gray300,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          border: `1px solid ${COLORS.gray200}`,
        },
        elevation0: {
          boxShadow: 'none',
        },
        elevation1: {
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
        },
        elevation2: {
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        },
        elevation3: {
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          color: COLORS.gray900,
          borderBottom: `1px solid ${COLORS.gray200}`,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: 'small',
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '8px',
            '&.Mui-focused fieldset': {
              borderColor: COLORS.primary,
              borderWidth: '2px',
            },
          },
        },
      },
    },
    MuiSelect: {
      defaultProps: {
        size: 'small',
      },
      styleOverrides: {
        root: {
          borderRadius: '8px',
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${COLORS.gray200}`,
          backgroundColor: COLORS.gray50,
        },
        indicator: {
          height: '3px',
          borderRadius: '3px 3px 0 0',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.95rem',
          color: COLORS.gray600,
          '&.Mui-selected': {
            color: COLORS.primary,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '6px',
          fontWeight: 500,
        },
        filled: {
          backgroundColor: COLORS.gray100,
          color: COLORS.gray900,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          border: 'none',
        },
        standardSuccess: {
          backgroundColor: COLORS.successLight,
          color: COLORS.successDark,
        },
        standardError: {
          backgroundColor: COLORS.dangerLight,
          color: COLORS.dangerDark,
        },
        standardWarning: {
          backgroundColor: COLORS.warningLight,
          color: COLORS.warning,
        },
        standardInfo: {
          backgroundColor: COLORS.infoLight,
          color: COLORS.infoDark,
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: '4px',
          height: '6px',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: COLORS.gray900,
          color: '#FFFFFF',
          borderRadius: '6px',
          fontSize: '0.75rem',
          padding: '8px 12px',
        },
      },
    },
  },
  shape: {
    borderRadius: 8,
  },
};

// Dark theme
const darkTheme: ThemeOptions = {
  palette: {
    mode: 'dark',
    primary: {
      main: COLORS.primaryLight,
      light: '#60A5FA',
      dark: COLORS.primary,
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: COLORS.secondaryLight,
      light: '#A7F3D0',
      dark: COLORS.secondary,
      contrastText: '#FFFFFF',
    },
    success: {
      main: COLORS.secondaryLight,
      light: '#A7F3D0',
      dark: COLORS.secondary,
      contrastText: '#FFFFFF',
    },
    error: {
      main: '#F87171',
      light: '#FCA5A5',
      dark: COLORS.danger,
      contrastText: '#FFFFFF',
    },
    warning: {
      main: '#FBBF24',
      light: '#FCD34D',
      dark: COLORS.warning,
      contrastText: '#FFFFFF',
    },
    info: {
      main: '#38BDF8',
      light: '#7DD3FC',
      dark: COLORS.info,
      contrastText: '#FFFFFF',
    },
    background: {
      default: COLORS.gray900,
      paper: COLORS.gray800,
    },
    text: {
      primary: '#F3F4F6',
      secondary: COLORS.gray400,
      disabled: COLORS.gray500,
    },
    divider: COLORS.gray700,
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.5px',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 700,
      lineHeight: 1.3,
      letterSpacing: '-0.25px',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.6,
      letterSpacing: '0.15px',
    },
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.75,
      color: COLORS.gray300,
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 600,
      lineHeight: 1.57,
      letterSpacing: '0.1px',
      color: COLORS.gray300,
    },
    body1: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: 1.43,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
      fontSize: '0.9375rem',
    },
    caption: {
      fontSize: '0.75rem',
      fontWeight: 500,
      lineHeight: 1.66,
      letterSpacing: '0.4px',
      color: COLORS.gray400,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: '8px',
          padding: '10px 16px',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.3)',
          },
        },
        contained: {
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
          '&:hover': {
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.3)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          border: `1px solid ${COLORS.gray700}`,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
            borderColor: COLORS.gray600,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          border: `1px solid ${COLORS.gray700}`,
        },
        elevation0: {
          boxShadow: 'none',
        },
        elevation1: {
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
        },
        elevation2: {
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
        },
        elevation3: {
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: COLORS.gray800,
          color: '#F3F4F6',
          borderBottom: `1px solid ${COLORS.gray700}`,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: 'small',
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '8px',
            '&.Mui-focused fieldset': {
              borderColor: COLORS.primaryLight,
              borderWidth: '2px',
            },
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${COLORS.gray700}`,
          backgroundColor: COLORS.gray800,
        },
        indicator: {
          height: '3px',
          borderRadius: '3px 3px 0 0',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.95rem',
          color: COLORS.gray400,
          '&.Mui-selected': {
            color: COLORS.primaryLight,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '6px',
          fontWeight: 500,
        },
      },
    },
  },
  shape: {
    borderRadius: 8,
  },
};

export const getTheme = (darkMode: boolean) => {
  return createTheme(darkMode ? darkTheme : lightTheme);
};

export default {
  lightTheme: createTheme(lightTheme),
  darkTheme: createTheme(darkTheme),
};

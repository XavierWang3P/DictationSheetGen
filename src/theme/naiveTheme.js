export const appPalette = Object.freeze({
  primary: '#2f6659',
  primaryHover: '#255247',
  primaryPressed: '#1d3e36',
  primarySoft: '#e8f0ed',
  success: '#43866f',
  warning: '#b7792b',
  danger: '#c5524a',
  text: '#26332f',
  textMuted: '#68756f',
  textLight: '#909b96',
  appBackground: '#f3f5f2',
  card: '#ffffff',
  border: '#c9d3ce',
  divider: '#e2e7e4'
});

export const naiveThemeOverrides = Object.freeze({
  common: {
    primaryColor: appPalette.primary,
    primaryColorHover: appPalette.primaryHover,
    primaryColorPressed: appPalette.primaryPressed,
    primaryColorSuppl: appPalette.primarySoft,
    infoColor: appPalette.primary,
    infoColorHover: appPalette.primaryHover,
    infoColorPressed: appPalette.primaryPressed,
    infoColorSuppl: appPalette.primarySoft,
    successColor: appPalette.success,
    warningColor: appPalette.warning,
    errorColor: appPalette.danger,
    textColorBase: appPalette.text,
    textColor1: appPalette.text,
    textColor2: appPalette.textMuted,
    textColor3: appPalette.textLight,
    bodyColor: appPalette.appBackground,
    cardColor: appPalette.card,
    borderColor: appPalette.border,
    dividerColor: appPalette.divider,
    borderRadius: '6px'
  },
  Button: {
    textColorPrimary: '#ffffff',
    colorGhostPrimary: 'transparent',
    textColorGhostPrimary: appPalette.primary,
    borderGhostPrimary: `1px solid ${appPalette.primary}`,
    textColorGhostHoverPrimary: appPalette.primaryHover,
    borderGhostHoverPrimary: `1px solid ${appPalette.primaryHover}`
  },
  Form: {
    feedbackHeightSmall: '18px',
    labelFontSizeTopSmall: '12px'
  }
});

export const theme = {
    colors: {
        primary: '#FF3B30', // Industrial Red
        primaryDark: '#D72D24',
        secondary: '#FFFFFF', // Pure White
        background: '#F8F9FA', // Off-White
        surface: '#FFFFFF',
        text: '#1C1C1E',
        textLight: '#636366',
        border: '#E5E5EA',
        success: '#34C759',
        danger: '#FF3B30',
        warning: '#FFCC00',
        glass: 'rgba(255, 255, 255, 0.8)',
    },
    shadows: {
        soft: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        medium: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    },
    radius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '20px',
    },
    typography: {
        fontFamily: '"Inter", "SF Pro Display", -apple-system, sans-serif',
    }
}

export type ThemeType = typeof theme;

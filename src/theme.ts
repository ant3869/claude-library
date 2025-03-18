// ===================================================
// THEME MANAGEMENT SYSTEM
// ===================================================

/**
 * [Themes] Color scheme interface
 */
export interface ColorScheme {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    danger: string;
    info: string;
    light: string;
    dark: string;
    background: string;
    text: string;
    mutedText: string;
    border: string;
    shadow: string;
    overlay: string;
    [key: string]: string;
  }
  
  /**
   * [Themes] Font configuration interface
   */
  export interface FontConfig {
    baseSize: string;
    family: {
      main: string;
      headings?: string;
      monospace?: string;
    };
    weights: {
      light?: number;
      regular: number;
      medium?: number;
      bold: number;
    };
    lineHeight: {
      tight?: number;
      normal: number;
      loose?: number;
    };
  }
  
  /**
   * [Themes] Spacing/sizing configuration interface
   */
  export interface SpacingConfig {
    base: string;
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    xxl: string;
    [key: string]: string;
  }
  
  /**
   * [Themes] Border configuration interface
   */
  export interface BorderConfig {
    radius: {
      none: string;
      sm: string;
      md: string;
      lg: string;
      full: string;
    };
    width: {
      thin: string;
      normal: string;
      thick: string;
    };
  }
  
  /**
   * [Themes] Breakpoints configuration interface
   */
  export interface BreakpointsConfig {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    xxl: string;
    [key: string]: string;
  }
  
  /**
   * [Themes] Animation configuration interface
   */
  export interface AnimationConfig {
    durations: {
      fast: string;
      normal: string;
      slow: string;
    };
    timingFunctions: {
      default: string;
      linear: string;
      ease: string;
      easeIn: string;
      easeOut: string;
      easeInOut: string;
    };
  }
  
  /**
   * [Themes] Shadow configuration interface
   */
  export interface ShadowConfig {
    none: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    inner: string;
  }
  
  /**
   * [Themes] Complete theme configuration interface
   */
  export interface ThemeConfig {
    id: string;
    name: string;
    isDark: boolean;
    colors: ColorScheme;
    fonts: FontConfig;
    spacing: SpacingConfig;
    borders: BorderConfig;
    breakpoints: BreakpointsConfig;
    animation: AnimationConfig;
    shadows: ShadowConfig;
    custom?: Record<string, any>;
  }
  
  /**
   * [Themes] CSS variables for theme
   */
  export interface CSSVariables {
    [key: string]: string;
  }
  
  /**
   * [Themes] Theme manager class
   */
  export class ThemeManager {
    private themes: Map<string, ThemeConfig> = new Map();
    private activeThemeId: string | null = null;
    private defaultThemeId: string | null = null;
    private storageKey: string = 'claude-theme-preference';
    private root: HTMLElement;
    private listeners: ((theme: ThemeConfig) => void)[] = [];
    
    constructor(options: {
      themes?: ThemeConfig[];
      defaultThemeId?: string;
      storageKey?: string;
    } = {}) {
      const { themes = [], defaultThemeId, storageKey } = options;
      
      this.root = document.documentElement; // :root element
      
      if (storageKey) {
        this.storageKey = storageKey;
      }
      
      // Register themes
      themes.forEach(theme => this.registerTheme(theme));
      
      // Set default theme
      if (defaultThemeId && this.themes.has(defaultThemeId)) {
        this.defaultThemeId = defaultThemeId;
      } else if (themes.length > 0) {
        this.defaultThemeId = themes[0].id;
      }
      
      // Try to load saved theme preference
      this.loadSavedTheme();
    }
    
    /**
     * Register a new theme
     */
    registerTheme(theme: ThemeConfig): void {
      this.themes.set(theme.id, theme);
      
      // Set as default if it's the first theme registered
      if (this.themes.size === 1 && !this.defaultThemeId) {
        this.defaultThemeId = theme.id;
      }
    }
    
    /**
     * Update an existing theme
     */
    updateTheme(themeId: string, updates: Partial<ThemeConfig>): void {
      const theme = this.themes.get(themeId);
      
      if (!theme) {
        throw new Error(`Theme with ID '${themeId}' not found`);
      }
      
      // Update theme properties
      const updatedTheme = {
        ...theme,
        ...updates,
        colors: { ...theme.colors, ...(updates.colors || {}) },
        fonts: { ...theme.fonts, ...(updates.fonts || {}) },
        spacing: { ...theme.spacing, ...(updates.spacing || {}) },
        borders: { ...theme.borders, ...(updates.borders || {}) },
        breakpoints: { ...theme.breakpoints, ...(updates.breakpoints || {}) },
        animation: { ...theme.animation, ...(updates.animation || {}) },
        shadows: { ...theme.shadows, ...(updates.shadows || {}) },
        custom: { ...(theme.custom || {}), ...(updates.custom || {}) }
      };
      
      this.themes.set(themeId, updatedTheme as ThemeConfig);
      
      // Re-apply if this is the active theme
      if (themeId === this.activeThemeId) {
        this.applyTheme(themeId);
      }
    }
    
    /**
     * Remove a theme
     */
    removeTheme(themeId: string): void {
      if (themeId === this.activeThemeId) {
        // Switch to default if removing active theme
        if (this.defaultThemeId && this.defaultThemeId !== themeId) {
          this.applyTheme(this.defaultThemeId);
        } else {
          // Find another theme to apply
          const availableThemes = Array.from(this.themes.keys()).filter(id => id !== themeId);
          if (availableThemes.length > 0) {
            this.applyTheme(availableThemes[0]);
          } else {
            this.activeThemeId = null;
          }
        }
      }
      
      this.themes.delete(themeId);
      
      // Update default theme if needed
      if (themeId === this.defaultThemeId) {
        const availableThemes = Array.from(this.themes.keys());
        this.defaultThemeId = availableThemes.length > 0 ? availableThemes[0] : null;
      }
    }
    
    /**
     * Apply a theme by ID
     */
    applyTheme(themeId: string): void {
      const theme = this.themes.get(themeId);
      
      if (!theme) {
        throw new Error(`Theme with ID '${themeId}' not found`);
      }
      
      // Generate CSS variables
      const cssVariables = this.generateCSSVariables(theme);
      
      // Apply CSS variables to :root
      Object.entries(cssVariables).forEach(([key, value]) => {
        this.root.style.setProperty(key, value);
      });
      
      // Add/remove dark mode class
      if (theme.isDark) {
        document.body.classList.add('theme-dark');
        document.body.classList.remove('theme-light');
      } else {
        document.body.classList.add('theme-light');
        document.body.classList.remove('theme-dark');
      }
      
      // Set data attribute for theme
      this.root.setAttribute('data-theme', themeId);
      
      // Update active theme
      this.activeThemeId = themeId;
      
      // Save preference to storage
      this.saveThemePreference(themeId);
      
      // Notify listeners
      this.notifyListeners(theme);
    }
    
    /**
     * Get theme by ID
     */
    getTheme(themeId: string): ThemeConfig | undefined {
      return this.themes.get(themeId);
    }
    
    /**
     * Get all registered themes
     */
    getAllThemes(): ThemeConfig[] {
      return Array.from(this.themes.values());
    }
    
    /**
     * Get active theme
     */
    getActiveTheme(): ThemeConfig | null {
      return this.activeThemeId ? this.themes.get(this.activeThemeId) || null : null;
    }
    
    /**
     * Set default theme
     */
    setDefaultTheme(themeId: string): void {
      if (!this.themes.has(themeId)) {
        throw new Error(`Theme with ID '${themeId}' not found`);
      }
      
      this.defaultThemeId = themeId;
    }
    
    /**
     * Toggle between light and dark mode
     */
    toggleDarkMode(): void {
      const currentTheme = this.getActiveTheme();
      if (!currentTheme) return;
      
      const targetMode = !currentTheme.isDark;
      
      // Find a theme with the opposite dark/light mode
      const targetTheme = Array.from(this.themes.values()).find(theme => theme.isDark === targetMode);
      
      if (targetTheme) {
        this.applyTheme(targetTheme.id);
      }
    }
    
    /**
     * Add a theme change listener
     */
    addThemeChangeListener(listener: (theme: ThemeConfig) => void): () => void {
      this.listeners.push(listener);
      
      // Return a function to remove the listener
      return () => {
        const index = this.listeners.indexOf(listener);
        if (index !== -1) {
          this.listeners.splice(index, 1);
        }
      };
    }
    
    /**
     * Notify all listeners
     */
    private notifyListeners(theme: ThemeConfig): void {
      this.listeners.forEach(listener => listener(theme));
    }
    
    /**
     * Generate CSS variables from theme config
     */
    private generateCSSVariables(theme: ThemeConfig): CSSVariables {
      const variables: CSSVariables = {};
      
      // Colors
      Object.entries(theme.colors).forEach(([key, value]) => {
        variables[`--color-${key}`] = value;
      });
      
      // Fonts
      variables['--font-family'] = theme.fonts.family.main;
      variables['--font-family-headings'] = theme.fonts.family.headings || theme.fonts.family.main;
      variables['--font-family-mono'] = theme.fonts.family.monospace || 'monospace';
      variables['--font-size-base'] = theme.fonts.baseSize;
      variables['--font-weight-regular'] = theme.fonts.weights.regular.toString();
      variables['--font-weight-bold'] = theme.fonts.weights.bold.toString();
      
      if (theme.fonts.weights.light) {
        variables['--font-weight-light'] = theme.fonts.weights.light.toString();
      }
      
      if (theme.fonts.weights.medium) {
        variables['--font-weight-medium'] = theme.fonts.weights.medium.toString();
      }
      
      variables['--line-height'] = theme.fonts.lineHeight.normal.toString();
      
      if (theme.fonts.lineHeight.tight) {
        variables['--line-height-tight'] = theme.fonts.lineHeight.tight.toString();
      }
      
      if (theme.fonts.lineHeight.loose) {
        variables['--line-height-loose'] = theme.fonts.lineHeight.loose.toString();
      }
      
      // Spacing
      Object.entries(theme.spacing).forEach(([key, value]) => {
        variables[`--spacing-${key}`] = value;
      });
      
      // Borders
      Object.entries(theme.borders.radius).forEach(([key, value]) => {
        variables[`--border-radius-${key}`] = value;
      });
      
      Object.entries(theme.borders.width).forEach(([key, value]) => {
        variables[`--border-width-${key}`] = value;
      });
      
      // Breakpoints
      Object.entries(theme.breakpoints).forEach(([key, value]) => {
        variables[`--breakpoint-${key}`] = value;
      });
      
      // Animations
      Object.entries(theme.animation.durations).forEach(([key, value]) => {
        variables[`--animation-duration-${key}`] = value;
      });
      
      Object.entries(theme.animation.timingFunctions).forEach(([key, value]) => {
        variables[`--animation-timing-${key}`] = value;
      });
      
      // Shadows
      Object.entries(theme.shadows).forEach(([key, value]) => {
        variables[`--shadow-${key}`] = value;
      });
      
      // Custom variables
      if (theme.custom) {
        Object.entries(theme.custom).forEach(([key, value]) => {
          if (typeof value === 'string') {
            variables[`--${key}`] = value;
          }
        });
      }
      
      return variables;
    }
    
    /**
     * Save theme preference to storage
     */
    private saveThemePreference(themeId: string): void {
      try {
        localStorage.setItem(this.storageKey, themeId);
      } catch (e) {
        console.warn('Could not save theme preference to localStorage:', e);
      }
    }
    
    /**
     * Load saved theme preference
     */
    private loadSavedTheme(): void {
      try {
        const savedThemeId = localStorage.getItem(this.storageKey);
        
        if (savedThemeId && this.themes.has(savedThemeId)) {
          this.applyTheme(savedThemeId);
        } else if (this.defaultThemeId) {
          this.applyTheme(this.defaultThemeId);
        }
      } catch (e) {
        console.warn('Could not load theme preference from localStorage:', e);
        
        // Fall back to default theme
        if (this.defaultThemeId) {
          this.applyTheme(this.defaultThemeId);
        }
      }
    }
  }
  
  /**
   * [Themes] Default light theme
   */
  export const defaultLightTheme: ThemeConfig = {
    id: 'default-light',
    name: 'Default Light',
    isDark: false,
    colors: {
      primary: '#4a90e2',
      secondary: '#6c757d',
      success: '#48c774',
      warning: '#ffdd57',
      danger: '#f14668',
      info: '#3298dc',
      light: '#f5f5f5',
      dark: '#363636',
      background: '#ffffff',
      text: '#333333',
      mutedText: '#6c757d',
      border: '#dbdbdb',
      shadow: 'rgba(0, 0, 0, 0.1)',
      overlay: 'rgba(0, 0, 0, 0.5)'
    },
    fonts: {
      baseSize: '16px',
      family: {
        main: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif',
        headings: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif',
        monospace: 'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
      },
      weights: {
        light: 300,
        regular: 400,
        medium: 500,
        bold: 700
      },
      lineHeight: {
        tight: 1.25,
        normal: 1.5,
        loose: 1.75
      }
    },
    spacing: {
      base: '1rem',
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
      xxl: '3rem'
    },
    borders: {
      radius: {
        none: '0',
        sm: '0.125rem',
        md: '0.25rem',
        lg: '0.5rem',
        full: '9999px'
      },
      width: {
        thin: '1px',
        normal: '2px',
        thick: '4px'
      }
    },
    breakpoints: {
      xs: '0',
      sm: '576px',
      md: '768px',
      lg: '992px',
      xl: '1200px',
      xxl: '1400px'
    },
    animation: {
      durations: {
        fast: '150ms',
        normal: '300ms',
        slow: '500ms'
      },
      timingFunctions: {
        default: 'ease',
        linear: 'linear',
        ease: 'ease',
        easeIn: 'ease-in',
        easeOut: 'ease-out',
        easeInOut: 'ease-in-out'
      }
    },
    shadows: {
      none: 'none',
      sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
      md: '0 4px 6px rgba(0, 0, 0, 0.1)',
      lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
      xl: '0 20px 25px rgba(0, 0, 0, 0.1)',
      inner: 'inset 0 2px 4px rgba(0, 0, 0, 0.05)'
    }
  };
  
  /**
   * [Themes] Default dark theme
   */
  export const defaultDarkTheme: ThemeConfig = {
    id: 'default-dark',
    name: 'Default Dark',
    isDark: true,
    colors: {
      primary: '#5c9ce6',
      secondary: '#a0adb8',
      success: '#5dd894',
      warning: '#ffe066',
      danger: '#ff5c7c',
      info: '#47a9d9',
      light: '#474747',
      dark: '#f5f5f5',
      background: '#222222',
      text: '#e0e0e0',
      mutedText: '#a0adb8',
      border: '#444444',
      shadow: 'rgba(0, 0, 0, 0.3)',
      overlay: 'rgba(0, 0, 0, 0.7)'
    },
    fonts: {
      baseSize: '16px',
      family: {
        main: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif',
        headings: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif',
        monospace: 'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
      },
      weights: {
        light: 300,
        regular: 400,
        medium: 500,
        bold: 700
      },
      lineHeight: {
        tight: 1.25,
        normal: 1.5,
        loose: 1.75
      }
    },
    spacing: {
      base: '1rem',
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
      xxl: '3rem'
    },
    borders: {
      radius: {
        none: '0',
        sm: '0.125rem',
        md: '0.25rem',
        lg: '0.5rem',
        full: '9999px'
      },
      width: {
        thin: '1px',
        normal: '2px',
        thick: '4px'
      }
    },
    breakpoints: {
      xs: '0',
      sm: '576px',
      md: '768px',
      lg: '992px',
      xl: '1200px',
      xxl: '1400px'
    },
    animation: {
      durations: {
        fast: '150ms',
        normal: '300ms',
        slow: '500ms'
      },
      timingFunctions: {
        default: 'ease',
        linear: 'linear',
        ease: 'ease',
        easeIn: 'ease-in',
        easeOut: 'ease-out',
        easeInOut: 'ease-in-out'
      }
    },
    shadows: {
      none: 'none',
      sm: '0 1px 2px rgba(0, 0, 0, 0.2)',
      md: '0 4px 6px rgba(0, 0, 0, 0.3)',
      lg: '0 10px 15px rgba(0, 0, 0, 0.3)',
      xl: '0 20px 25px rgba(0, 0, 0, 0.3)',
      inner: 'inset 0 2px 4px rgba(0, 0, 0, 0.2)'
    }
  };
  
  /**
   * [Themes] Create a theme manager with default themes
   */
  export const createThemeManager = (options: {
    defaultTheme?: 'light' | 'dark' | 'system';
    storageKey?: string;
    additionalThemes?: ThemeConfig[];
  } = {}): ThemeManager => {
    const {
      defaultTheme = 'system',
      storageKey,
      additionalThemes = []
    } = options;
    
    // Determine default theme
    let effectiveDefaultTheme: string;
    
    if (defaultTheme === 'system') {
      // Use system preference
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      effectiveDefaultTheme = prefersDark ? 'default-dark' : 'default-light';
    } else {
      effectiveDefaultTheme = defaultTheme === 'dark' ? 'default-dark' : 'default-light';
    }
    
    // Create manager with default themes
    const manager = new ThemeManager({
      themes: [defaultLightTheme, defaultDarkTheme, ...additionalThemes],
      defaultThemeId: effectiveDefaultTheme,
      storageKey
    });
    
    // Listen for system preference changes
    if (defaultTheme === 'system' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleChange = (e: MediaQueryListEvent) => {
        // Only change if no user preference is saved
        try {
          const savedThemeId = localStorage.getItem(storageKey || 'claude-theme-preference');
          if (!savedThemeId) {
            manager.applyTheme(e.matches ? 'default-dark' : 'default-light');
          }
        } catch (e) {
          // If localStorage is not available, always follow system preference
          manager.applyTheme(mediaQuery.matches ? 'default-dark' : 'default-light');
        }
      };
      
      // Add listener with proper fallback for older browsers
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange);
      } else {
        // @ts-ignore - For older browsers
        mediaQuery.addListener(handleChange);
      }
    }
    
    return manager;
  };
  
  /**
   * [Themes] Generate a complete theme from a base color
   */
  export const generateThemeFromColor = (options: {
    id: string;
    name: string;
    primaryColor: string;
    isDark?: boolean;
    baseTheme?: ThemeConfig;
  }): ThemeConfig => {
    const {
      id,
      name,
      primaryColor,
      isDark = false,
      baseTheme = isDark ? defaultDarkTheme : defaultLightTheme
    } = options;
    
    // Derive secondary colors from primary
    const colors = deriveColorsFromPrimary(primaryColor, isDark);
    
    return {
      ...baseTheme,
      id,
      name,
      isDark,
      colors: {
        ...baseTheme.colors,
        primary: colors.primary,
        secondary: colors.secondary,
        info: colors.info
      }
    };
  };
  
  /**
   * [Themes] Derive color palette from primary color
   */
  function deriveColorsFromPrimary(primaryColor: string, isDark: boolean): {
    primary: string;
    secondary: string;
    info: string;
  } {
    // Convert primary color to HSL
    const hsl = hexToHSL(primaryColor);
    
    // Adjust saturation and lightness for secondary and info colors
    const secondaryHue = (hsl.h + 210) % 360; // Complementary-ish
    const infoHue = (hsl.h + 30) % 360; // Adjacent on color wheel
    
    let secondarySaturation = Math.max(0, hsl.s - 15);
    let secondaryLightness = isDark ? Math.min(90, hsl.l + 10) : Math.max(30, hsl.l - 10);
    
    let infoSaturation = Math.min(100, hsl.s + 5);
    let infoLightness = isDark ? Math.min(85, hsl.l + 5) : Math.max(40, hsl.l);
    
    return {
      primary: primaryColor,
      secondary: hslToHex(secondaryHue, secondarySaturation, secondaryLightness),
      info: hslToHex(infoHue, infoSaturation, infoLightness)
    };
  }
  
  /**
   * [Themes] Convert hex color to HSL
   */
  function hexToHSL(hex: string): { h: number; s: number; l: number } {
    // Remove # if present
    hex = hex.replace(/^#/, '');
    
    // Parse hex to RGB
    let r, g, b;
    if (hex.length === 3) {
      r = parseInt(hex.charAt(0) + hex.charAt(0), 16) / 255;
      g = parseInt(hex.charAt(1) + hex.charAt(1), 16) / 255;
      b = parseInt(hex.charAt(2) + hex.charAt(2), 16) / 255;
    } else {
      r = parseInt(hex.substring(0, 2), 16) / 255;
      g = parseInt(hex.substring(2, 4), 16) / 255;
      b = parseInt(hex.substring(4, 6), 16) / 255;
    }
    
    // Find min and max RGB values
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch(max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      
      h = h / 6;
    }
    
    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  }
  
  /**
   * [Themes] Convert HSL to hex color
   */
  function hslToHex(h: number, s: number, l: number): string {
    h /= 360;
    s /= 100;
    l /= 100;
    
    let r, g, b;
    
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number): number => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    
    const toHex = (x: number): string => {
      const hex = Math.round(x * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
  
  /**
   * [Themes] Apply theme CSS to an element or document
   */
  export const applyThemeToElement = (element: HTMLElement, theme: ThemeConfig): void => {
    const cssVariables = generateCSSVariablesForTheme(theme);
    
    Object.entries(cssVariables).forEach(([key, value]) => {
      element.style.setProperty(key, value);
    });
  }
  
  /**
   * [Themes] Generate CSS variables for a theme
   */
  function generateCSSVariablesForTheme(theme: ThemeConfig): CSSVariables {
    const variables: CSSVariables = {};
    
    // Colors
    Object.entries(theme.colors).forEach(([key, value]) => {
      variables[`--color-${key}`] = value;
    });
    
    // Fonts
    variables['--font-family'] = theme.fonts.family.main;
    variables['--font-family-headings'] = theme.fonts.family.headings || theme.fonts.family.main;
    variables['--font-family-mono'] = theme.fonts.family.monospace || 'monospace';
    variables['--font-size-base'] = theme.fonts.baseSize;
    variables['--font-weight-regular'] = theme.fonts.weights.regular.toString();
    variables['--font-weight-bold'] = theme.fonts.weights.bold.toString();
    
    if (theme.fonts.weights.light) {
      variables['--font-weight-light'] = theme.fonts.weights.light.toString();
    }
    
    if (theme.fonts.weights.medium) {
      variables['--font-weight-medium'] = theme.fonts.weights.medium.toString();
    }
    
    variables['--line-height'] = theme.fonts.lineHeight.normal.toString();
    
    if (theme.fonts.lineHeight.tight) {
      variables['--line-height-tight'] = theme.fonts.lineHeight.tight.toString();
    }
    
    if (theme.fonts.lineHeight.loose) {
      variables['--line-height-loose'] = theme.fonts.lineHeight.loose.toString();
    }
    
    // Spacing
    Object.entries(theme.spacing).forEach(([key, value]) => {
      variables[`--spacing-${key}`] = value;
    });
    
    // Borders
    Object.entries(theme.borders.radius).forEach(([key, value]) => {
      variables[`--border-radius-${key}`] = value;
    });
    
    Object.entries(theme.borders.width).forEach(([key, value]) => {
      variables[`--border-width-${key}`] = value;
    });
    
    // Breakpoints
    Object.entries(theme.breakpoints).forEach(([key, value]) => {
      variables[`--breakpoint-${key}`] = value;
    });
    
    // Animations
    Object.entries(theme.animation.durations).forEach(([key, value]) => {
      variables[`--animation-duration-${key}`] = value;
    });
    
    Object.entries(theme.animation.timingFunctions).forEach(([key, value]) => {
      variables[`--animation-timing-${key}`] = value;
    });
    
    // Shadows
    Object.entries(theme.shadows).forEach(([key, value]) => {
      variables[`--shadow-${key}`] = value;
    });
    
    // Custom variables
    if (theme.custom) {
      Object.entries(theme.custom).forEach(([key, value]) => {
        if (typeof value === 'string') {
          variables[`--${key}`] = value;
        }
      });
    }
    
    return variables;
  }
  
  /**
   * [Themes] Theme presets
   */
  export const themePresets = {
    // Light theme variants
    lightBlue: generateThemeFromColor({
      id: 'light-blue',
      name: 'Light Blue',
      primaryColor: '#4a90e2',
      isDark: false
    }),
    
    lightGreen: generateThemeFromColor({
      id: 'light-green',
      name: 'Light Green',
      primaryColor: '#48c774',
      isDark: false
    }),
    
    lightPurple: generateThemeFromColor({
      id: 'light-purple',
      name: 'Light Purple',
      primaryColor: '#9c27b0',
      isDark: false
    }),
    
    lightOrange: generateThemeFromColor({
      id: 'light-orange',
      name: 'Light Orange',
      primaryColor: '#ff9800',
      isDark: false
    }),
    
    lightRed: generateThemeFromColor({
      id: 'light-red',
      name: 'Light Red',
      primaryColor: '#f14668',
      isDark: false
    }),
    
    // Dark theme variants
    darkBlue: generateThemeFromColor({
      id: 'dark-blue',
      name: 'Dark Blue',
      primaryColor: '#5c9ce6',
      isDark: true
    }),
    
    darkGreen: generateThemeFromColor({
      id: 'dark-green',
      name: 'Dark Green',
      primaryColor: '#5dd894',
      isDark: true
    }),
    
    darkPurple: generateThemeFromColor({
      id: 'dark-purple',
      name: 'Dark Purple',
      primaryColor: '#bb86fc',
      isDark: true
    }),
    
    darkOrange: generateThemeFromColor({
      id: 'dark-orange',
      name: 'Dark Orange',
      primaryColor: '#ffab40',
      isDark: true
    }),
    
    darkRed: generateThemeFromColor({
      id: 'dark-red',
      name: 'Dark Red',
      primaryColor: '#ff5c7c',
      isDark: true
    }),
    
    // High contrast themes
    highContrastLight: {
      id: 'high-contrast-light',
      name: 'High Contrast Light',
      isDark: false,
      colors: {
        primary: '#000000',
        secondary: '#505050',
        success: '#006600',
        warning: '#884400',
        danger: '#cc0000',
        info: '#004488',
        light: '#ffffff',
        dark: '#000000',
        background: '#ffffff',
        text: '#000000',
        mutedText: '#404040',
        border: '#000000',
        shadow: 'rgba(0, 0, 0, 0.5)',
        overlay: 'rgba(0, 0, 0, 0.7)'
      },
      fonts: {
        ...defaultLightTheme.fonts,
        baseSize: '18px', // Larger font for readability
      },
      spacing: defaultLightTheme.spacing,
      borders: {
        ...defaultLightTheme.borders,
        width: {
          thin: '2px',     // Thicker borders for better visibility
          normal: '3px',
          thick: '5px'
        }
      },
      breakpoints: defaultLightTheme.breakpoints,
      animation: defaultLightTheme.animation,
      shadows: defaultLightTheme.shadows
    } as ThemeConfig,
    
    highContrastDark: {
      id: 'high-contrast-dark',
      name: 'High Contrast Dark',
      isDark: true,
      colors: {
        primary: '#ffffff',
        secondary: '#c0c0c0',
        success: '#44ff44',
        warning: '#ffcc44',
        danger: '#ff4444',
        info: '#44aaff',
        light: '#a0a0a0',
        dark: '#ffffff',
        background: '#000000',
        text: '#ffffff',
        mutedText: '#dddddd',
        border: '#ffffff',
        shadow: 'rgba(255, 255, 255, 0.5)',
        overlay: 'rgba(0, 0, 0, 0.8)'
      },
      fonts: {
        ...defaultDarkTheme.fonts,
        baseSize: '18px', // Larger font for readability
      },
      spacing: defaultDarkTheme.spacing,
      borders: {
        ...defaultDarkTheme.borders,
        width: {
          thin: '2px',     // Thicker borders for better visibility
          normal: '3px',
          thick: '5px'
        }
      },
      breakpoints: defaultDarkTheme.breakpoints,
      animation: defaultDarkTheme.animation,
      shadows: defaultDarkTheme.shadows
    } as ThemeConfig,
    
    // Professional/corporate themes
    professionalLight: {
      id: 'professional-light',
      name: 'Professional Light',
      isDark: false,
      colors: {
        primary: '#1976d2',
        secondary: '#607d8b',
        success: '#2e7d32',
        warning: '#f9a825',
        danger: '#c62828',
        info: '#0288d1',
        light: '#f5f5f5',
        dark: '#263238',
        background: '#ffffff',
        text: '#212121',
        mutedText: '#757575',
        border: '#e0e0e0',
        shadow: 'rgba(0, 0, 0, 0.1)',
        overlay: 'rgba(0, 0, 0, 0.4)'
      },
      fonts: {
        ...defaultLightTheme.fonts,
        family: {
          main: 'Roboto, "Helvetica Neue", Arial, sans-serif',
          headings: 'Roboto, "Helvetica Neue", Arial, sans-serif',
          monospace: '"Roboto Mono", monospace'
        }
      },
      spacing: defaultLightTheme.spacing,
      borders: defaultLightTheme.borders,
      breakpoints: defaultLightTheme.breakpoints,
      animation: defaultLightTheme.animation,
      shadows: defaultLightTheme.shadows
    } as ThemeConfig,
    
    professionalDark: {
      id: 'professional-dark',
      name: 'Professional Dark',
      isDark: true,
      colors: {
        primary: '#42a5f5',
        secondary: '#78909c',
        success: '#66bb6a',
        warning: '#fdd835',
        danger: '#ef5350',
        info: '#29b6f6',
        light: '#455a64',
        dark: '#eceff1',
        background: '#263238',
        text: '#eceff1',
        mutedText: '#b0bec5',
        border: '#37474f',
        shadow: 'rgba(0, 0, 0, 0.3)',
        overlay: 'rgba(0, 0, 0, 0.6)'
      },
      fonts: {
        ...defaultDarkTheme.fonts,
        family: {
          main: 'Roboto, "Helvetica Neue", Arial, sans-serif',
          headings: 'Roboto, "Helvetica Neue", Arial, sans-serif',
          monospace: '"Roboto Mono", monospace'
        }
      },
      spacing: defaultDarkTheme.spacing,
      borders: defaultDarkTheme.borders,
      breakpoints: defaultDarkTheme.breakpoints,
      animation: defaultDarkTheme.animation,
      shadows: defaultDarkTheme.shadows
    } as ThemeConfig
  };
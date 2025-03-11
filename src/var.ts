// ===================================================
// VITE/TAILWIND/REACT INTEGRATION
// ===================================================

/**
 * [Vite] Interface for Vite configuration options
 */
export interface ViteConfigOptions {
    // Project settings
    root?: string;
    base?: string;
    mode?: string;
    publicDir?: string;
    
    // Build options
    outDir?: string;
    assetsDir?: string;
    minify?: boolean | 'terser' | 'esbuild';
    sourcemap?: boolean | 'inline' | 'hidden';
    
    // Server options
    port?: number;
    open?: boolean;
    cors?: boolean;
    proxy?: Record<string, any>;
  }
  
  /**
   * [Vite] Creates a basic Vite configuration for React projects
   */
  export const createViteConfig = (options: ViteConfigOptions = {}): string => {
    const {
      root = 'src',
      base = '/',
      mode = 'development',
      publicDir = 'public',
      outDir = 'dist',
      assetsDir = 'assets',
      minify = true,
      sourcemap = true,
      port = 3000,
      open = true,
      cors = true,
      proxy = {},
    } = options;
    
    const proxyConfig = Object.entries(proxy)
      .map(([key, value]) => `      '${key}': ${JSON.stringify(value, null, 6)}`)
      .join(',\n');
    
    return `import { defineConfig } from 'vite';
  import react from '@vitejs/plugin-react';
  import tsconfigPaths from 'vite-tsconfig-paths';
  import { resolve } from 'path';
  
  // https://vitejs.dev/config/
  export default defineConfig({
    root: '${root}',
    base: '${base}',
    mode: '${mode}',
    publicDir: '${publicDir}',
    plugins: [
      react(),
      tsconfigPaths()
    ],
    resolve: {
      alias: {
        '@': resolve(__dirname, './src')
      },
    },
    build: {
      outDir: '${outDir}',
      assetsDir: '${assetsDir}',
      minify: ${typeof minify === 'string' ? `'${minify}'` : minify},
      sourcemap: ${typeof sourcemap === 'string' ? `'${sourcemap}'` : sourcemap},
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html')
        },
        output: {
          manualChunks: {
            react: ['react', 'react-dom'],
            vendor: ['lodash', 'date-fns']
          }
        }
      }
    },
    server: {
      port: ${port},
      open: ${open},
      cors: ${cors},
      proxy: {
  ${proxyConfig}
      }
    }
  });`;
  };
  
  /**
   * [Tailwind] Interface for Tailwind configuration options
   */
  export interface TailwindConfigOptions {
    content?: string[];
    darkMode?: 'media' | 'class';
    theme?: {
      extend?: {
        colors?: Record<string, string | Record<string, string>>;
        spacing?: Record<string, string>;
        fontFamily?: Record<string, string[]>;
        screens?: Record<string, string>;
        borderRadius?: Record<string, string>;
        [key: string]: any;
      };
      [key: string]: any;
    };
    plugins?: string[];
  }
  
  /**
   * [Tailwind] Creates a Tailwind CSS configuration
   */
  export const createTailwindConfig = (options: TailwindConfigOptions = {}): string => {
    const {
      content = ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
      darkMode = 'class',
      theme = {
        extend: {
          colors: {
            primary: {
              '50': '#f0f9ff',
              '100': '#e0f2fe',
              '200': '#bae6fd',
              '300': '#7dd3fc',
              '400': '#38bdf8',
              '500': '#0ea5e9',
              '600': '#0284c7',
              '700': '#0369a1',
              '800': '#075985',
              '900': '#0c4a6e',
            },
            secondary: {
              '50': '#f8fafc',
              '100': '#f1f5f9',
              '200': '#e2e8f0',
              '300': '#cbd5e1',
              '400': '#94a3b8',
              '500': '#64748b',
              '600': '#475569',
              '700': '#334155',
              '800': '#1e293b',
              '900': '#0f172a',
            },
          },
        },
      },
      plugins = [],
    } = options;
    
    const contentArrayStr = JSON.stringify(content, null, 2)
      .split('\n')
      .join('\n  ');
    
    const themeStr = JSON.stringify(theme, null, 2)
      .split('\n')
      .join('\n  ');
    
    const pluginsStr = plugins.map(plugin => `    require('${plugin}')`).join(',\n');
    
    return `/** @type {import('tailwindcss').Config} */
  export default {
    content: ${contentArrayStr},
    darkMode: '${darkMode}',
    theme: ${themeStr},
    plugins: [
  ${pluginsStr}
    ],
  };`;
  };
  
  /**
   * [React] Interface for project file structure
   */
  export interface ProjectStructure {
    appName: string;
    includeRouter?: boolean;
    stateManagement?: 'redux' | 'zustand' | 'recoil' | 'jotai' | 'none';
    includeShadcn?: boolean;
    layoutComponents?: string[];
    featureDirectories?: string[];
    testingLibrary?: 'jest' | 'vitest' | 'none';
  }
  
  /**
   * [React] Generates a recommended project structure configuration
   */
  export const generateProjectStructure = (options: ProjectStructure): { 
    directories: string[];
    files: Array<{ path: string; content: string }>;
  } => {
    const {
      appName,
      includeRouter = true,
      stateManagement = 'none',
      includeShadcn = false,
      layoutComponents = ['Header', 'Footer', 'Sidebar', 'Layout'],
      featureDirectories = ['users', 'auth', 'dashboard', 'settings'],
      testingLibrary = 'vitest',
    } = options;
    
    // Base directories
    const directories = [
      'src',
      'src/assets',
      'src/components',
      'src/components/ui',
      'src/hooks',
      'src/lib',
      'src/utils',
      'src/types',
      'public',
    ];
    
    // Add layout directories
    layoutComponents.forEach(component => {
      directories.push(`src/components/layout/${component.toLowerCase()}`);
    });
    
    // Add feature directories
    featureDirectories.forEach(feature => {
      directories.push(`src/features/${feature}`);
      directories.push(`src/features/${feature}/components`);
      directories.push(`src/features/${feature}/hooks`);
    });
    
    // Add state management directories
    if (stateManagement !== 'none') {
      directories.push('src/store');
      
      if (stateManagement === 'redux') {
        directories.push('src/store/slices');
        directories.push('src/store/actions');
        directories.push('src/store/selectors');
      } else if (stateManagement === 'zustand') {
        directories.push('src/store/slices');
      }
    }
    
    // Add routing directories
    if (includeRouter) {
      directories.push('src/routes');
      directories.push('src/pages');
      featureDirectories.forEach(feature => {
        directories.push(`src/pages/${feature}`);
      });
    }
    
    // Add testing directories
    if (testingLibrary !== 'none') {
      directories.push('src/__tests__');
      directories.push('src/__mocks__');
    }
    
    // Add shadcn directories
    if (includeShadcn) {
      directories.push('src/components/ui/shadcn');
      directories.push('src/lib/utils');
    }
    
    // Create basic files
    const files: Array<{ path: string; content: string }> = [];
    
    // Package.json
    files.push({
      path: 'package.json',
      content: createPackageJson(appName, {
        includeRouter,
        stateManagement,
        includeShadcn,
        testingLibrary,
      }),
    });
    
    // README.md
    files.push({
      path: 'README.md',
      content: createReadme(appName),
    });
    
    // tsconfig.json
    files.push({
      path: 'tsconfig.json',
      content: createTsConfig(),
    });
    
    // Vite config
    files.push({
      path: 'vite.config.ts',
      content: createViteConfig(),
    });
    
    // Tailwind config
    files.push({
      path: 'tailwind.config.js',
      content: createTailwindConfig(),
    });
    
    // Main index.html
    files.push({
      path: 'index.html',
      content: createHtmlTemplate(appName),
    });
    
    // Main.tsx
    files.push({
      path: 'src/main.tsx',
      content: createMainTsx({
        includeRouter,
        stateManagement,
      }),
    });
    
    // App.tsx
    files.push({
      path: 'src/App.tsx',
      content: createAppTsx({
        includeRouter,
        includeShadcn,
      }),
    });
    
    // Router
    if (includeRouter) {
      files.push({
        path: 'src/routes/index.tsx',
        content: createRoutes(featureDirectories),
      });
    }
    
    // State management setup
    if (stateManagement !== 'none') {
      files.push({
        path: 'src/store/index.ts',
        content: createStore(stateManagement),
      });
    }
    
    // Shadcn setup
    if (includeShadcn) {
      files.push({
        path: 'src/lib/utils.ts',
        content: createShadcnUtils(),
      });
      
      files.push({
        path: 'components.json',
        content: createShadcnConfig(),
      });
    }
    
    return { directories, files };
  };
  
  /**
   * [React] Helper to create package.json
   */
  const createPackageJson = (
    appName: string,
    options: {
      includeRouter?: boolean;
      stateManagement?: 'redux' | 'zustand' | 'recoil' | 'jotai' | 'none';
      includeShadcn?: boolean;
      testingLibrary?: 'jest' | 'vitest' | 'none';
    }
  ): string => {
    const { includeRouter, stateManagement, includeShadcn, testingLibrary } = options;
    
    // Base dependencies
    const dependencies = {
      'react': '^18.2.0',
      'react-dom': '^18.2.0',
    };
    
    // Optional dependencies
    if (includeRouter) {
      Object.assign(dependencies, {
        'react-router-dom': '^6.15.0',
      });
    }
    
    if (stateManagement === 'redux') {
      Object.assign(dependencies, {
        '@reduxjs/toolkit': '^1.9.5',
        'react-redux': '^8.1.2',
      });
    } else if (stateManagement === 'zustand') {
      Object.assign(dependencies, {
        'zustand': '^4.4.1',
        'immer': '^10.0.2',
      });
    } else if (stateManagement === 'recoil') {
      Object.assign(dependencies, {
        'recoil': '^0.7.7',
      });
    } else if (stateManagement === 'jotai') {
      Object.assign(dependencies, {
        'jotai': '^2.4.1',
      });
    }
    
    if (includeShadcn) {
      Object.assign(dependencies, {
        'class-variance-authority': '^0.7.0',
        'clsx': '^2.0.0',
        'lucide-react': '^0.263.1',
        'tailwind-merge': '^1.14.0',
        'tailwindcss-animate': '^1.0.6',
      });
    }
    
    // Development dependencies
    const devDependencies = {
      '@types/react': '^18.2.15',
      '@types/react-dom': '^18.2.7',
      '@typescript-eslint/eslint-plugin': '^6.4.0',
      '@typescript-eslint/parser': '^6.4.0',
      '@vitejs/plugin-react': '^4.0.4',
      'autoprefixer': '^10.4.15',
      'eslint': '^8.47.0',
      'eslint-plugin-react': '^7.33.2',
      'eslint-plugin-react-hooks': '^4.6.0',
      'postcss': '^8.4.28',
      'tailwindcss': '^3.3.3',
      'typescript': '^5.1.6',
      'vite': '^4.4.9',
      'vite-tsconfig-paths': '^4.2.0',
    };
    
    if (testingLibrary === 'vitest') {
      Object.assign(devDependencies, {
        'vitest': '^0.34.3',
        '@testing-library/react': '^14.0.0',
        '@testing-library/jest-dom': '^6.1.3',
        'jsdom': '^22.1.0',
      });
    } else if (testingLibrary === 'jest') {
      Object.assign(devDependencies, {
        'jest': '^29.6.4',
        'jest-environment-jsdom': '^29.6.4',
        'ts-jest': '^29.1.1',
        '@testing-library/react': '^14.0.0',
        '@testing-library/jest-dom': '^6.1.3',
      });
    }
    
    // Create scripts
    const scripts = {
      'dev': 'vite',
      'build': 'tsc && vite build',
      'lint': 'eslint src --ext ts,tsx --report-unused-disable-directives --max-warnings 0',
      'preview': 'vite preview',
    };
    
    if (testingLibrary === 'vitest') {
      Object.assign(scripts, {
        'test': 'vitest',
        'test:coverage': 'vitest run --coverage',
      });
    } else if (testingLibrary === 'jest') {
      Object.assign(scripts, {
        'test': 'jest',
        'test:watch': 'jest --watch',
        'test:coverage': 'jest --coverage',
      });
    }
    
    // Create package.json content
    const packageJson = {
      name: appName.toLowerCase().replace(/\s+/g, '-'),
      private: true,
      version: '0.1.0',
      type: 'module',
      scripts,
      dependencies,
      devDependencies,
    };
    
    return JSON.stringify(packageJson, null, 2);
  };
  
  /**
   * [React] Helper to create README.md
   */
  const createReadme = (appName: string): string => {
    return `# ${appName}
  
  This project was bootstrapped with Vite, React, TypeScript, and TailwindCSS.
  
  ## Getting Started
  
  ### Prerequisites
  
  - Node.js (v14 or later)
  - npm or yarn
  
  ### Installation
  
  \`\`\`bash
  # Clone the repository
  git clone <repository-url>
  
  # Navigate to the project directory
  cd ${appName.toLowerCase().replace(/\s+/g, '-')}
  
  # Install dependencies
  npm install
  # or
  yarn
  \`\`\`
  
  ### Development
  
  \`\`\`bash
  # Start the development server
  npm run dev
  # or
  yarn dev
  \`\`\`
  
  ### Building for Production
  
  \`\`\`bash
  # Build the app
  npm run build
  # or
  yarn build
  
  # Preview the production build
  npm run preview
  # or
  yarn preview
  \`\`\`
  
  ## Project Structure
  
  \`\`\`
  src/
  ├── assets/        # Static assets like images, fonts, etc.
  ├── components/    # Reusable components
  │   ├── ui/        # UI components
  │   └── layout/    # Layout components
  ├── features/      # Feature-based modules
  ├── hooks/         # Custom React hooks
  ├── lib/           # Library code, utilities, and helpers
  ├── routes/        # Routing configuration
  ├── pages/         # Page components
  ├── store/         # State management
  ├── types/         # TypeScript type definitions
  └── utils/         # Utility functions
  \`\`\`
  
  ## Features
  
  - **React**: A JavaScript library for building user interfaces
  - **TypeScript**: Static type-checking for JavaScript
  - **Vite**: Next-generation frontend tooling
  - **TailwindCSS**: A utility-first CSS framework
  - **ESLint**: Code linting
  - **Routing**: Page navigation
  - **State Management**: Global state handling
  
  ## License
  
  MIT
  `;
  };
  
  /**
   * [React] Helper to create tsconfig.json
   */
  const createTsConfig = (): string => {
    return `{
    "compilerOptions": {
      "target": "ES2020",
      "useDefineForClassFields": true,
      "lib": ["ES2020", "DOM", "DOM.Iterable"],
      "module": "ESNext",
      "skipLibCheck": true,
      "moduleResolution": "bundler",
      "allowImportingTsExtensions": true,
      "resolveJsonModule": true,
      "isolatedModules": true,
      "noEmit": true,
      "jsx": "react-jsx",
      "strict": true,
      "noUnusedLocals": true,
      "noUnusedParameters": true,
      "noFallthroughCasesInSwitch": true,
      "baseUrl": ".",
      "paths": {
        "@/*": ["./src/*"]
      }
    },
    "include": ["src"],
    "references": [{ "path": "./tsconfig.node.json" }]
  }`;
  };
  
  /**
   * [React] Helper to create HTML template
   */
  const createHtmlTemplate = (appName: string): string => {
    return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <link rel="icon" type="image/svg+xml" href="/vite.svg" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${appName}</title>
      <meta name="description" content="${appName} - React Application" />
      <meta name="theme-color" content="#ffffff" />
    </head>
    <body>
      <div id="root"></div>
      <script type="module" src="/src/main.tsx"></script>
    </body>
  </html>`;
  };
  
  /**
   * [React] Helper to create main.tsx
   */
  const createMainTsx = (options: {
    includeRouter?: boolean;
    stateManagement?: 'redux' | 'zustand' | 'recoil' | 'jotai' | 'none';
  }): string => {
    const { includeRouter, stateManagement } = options;
    
    let imports = `import React from 'react'
  import ReactDOM from 'react-dom/client'
  import App from './App'
  import './index.css'`;
    
    let wrappers = '<App />';
    
    if (includeRouter) {
      imports += `\nimport { BrowserRouter } from 'react-router-dom'`;
      wrappers = `<BrowserRouter>\n    ${wrappers}\n  </BrowserRouter>`;
    }
    
    if (stateManagement === 'redux') {
      imports += `\nimport { Provider } from 'react-redux'
  import { store } from './store'`;
      wrappers = `<Provider store={store}>\n    ${wrappers}\n  </Provider>`;
    } else if (stateManagement === 'recoil') {
      imports += `\nimport { RecoilRoot } from 'recoil'`;
      wrappers = `<RecoilRoot>\n    ${wrappers}\n  </RecoilRoot>`;
    }
    
    return `${imports}
  
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
    ${wrappers}
    </React.StrictMode>,
  )`;
  };
  
  /**
   * [React] Helper to create App.tsx
   */
  const createAppTsx = (options: {
    includeRouter?: boolean;
    includeShadcn?: boolean;
  }): string => {
    const { includeRouter, includeShadcn } = options;
    
    if (includeRouter) {
      return `import { useState } from 'react'
  import { Routes } from './routes'${includeShadcn ? '\nimport { ThemeProvider } from "./components/ui/shadcn/theme-provider"' : ''}
  
  function App() {
    const [isDarkMode, setIsDarkMode] = useState(false)
  
    return (
      ${includeShadcn ? '<ThemeProvider defaultTheme="system" storageKey="app-theme">' : ''}
      <div className="min-h-screen ${includeShadcn ? 'bg-background text-foreground' : 'bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100'}">
        <Routes />
      </div>
      ${includeShadcn ? '</ThemeProvider>' : ''}
    )
  }
  
  export default App`;
    } else {
      return `import { useState } from 'react'
  import './App.css'${includeShadcn ? '\nimport { ThemeProvider } from "./components/ui/shadcn/theme-provider"' : ''}
  
  function App() {
    const [count, setCount] = useState(0)
  
    return (
      ${includeShadcn ? '<ThemeProvider defaultTheme="system" storageKey="app-theme">' : ''}
      <div className="min-h-screen ${includeShadcn ? 'bg-background text-foreground' : 'bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100'} flex flex-col items-center justify-center">
        <header className="py-6">
          <h1 className="text-3xl font-bold">Vite + React + TypeScript</h1>
        </header>
        
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <button
              className="${includeShadcn ? 'bg-primary hover:bg-primary/90' : 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700'} text-white font-bold py-2 px-4 rounded"
              onClick={() => setCount((count) => count + 1)}
            >
              count is {count}
            </button>
            <p className="mt-4">
              Edit <code>src/App.tsx</code> and save to test HMR
            </p>
          </div>
        </main>
      </div>
      ${includeShadcn ? '</ThemeProvider>' : ''}
    )
  }
  
  export default App`;
    }
  };
  
  /**
   * [React] Helper to create routes
   */
  const createRoutes = (featureDirectories: string[]): string => {
    const imports = [`import { lazy, Suspense } from 'react'`,
      `import { Navigate, useRoutes } from 'react-router-dom'`,
      `import Layout from '@/components/layout/layout'`];
    
    let lazyImports = '';
    let routeElements = '';
    
    featureDirectories.forEach(feature => {
      const componentName = feature.charAt(0).toUpperCase() + feature.slice(1);
      lazyImports += `const ${componentName}Page = lazy(() => import('@/pages/${feature}'))\n`;
      
      routeElements += `    {
        path: '/${feature === 'dashboard' ? '' : feature}',
        element: (
          <Suspense fallback={<div>Loading...</div>}>
            <${componentName}Page />
          </Suspense>
        ),
      },\n`;
    });
    
    return `${imports.join('\n')}
  
  // Lazy load routes
  ${lazyImports}
  export const Routes = () => {
    const routes = useRoutes([
      {
        path: '/',
        element: <Layout />,
        children: [
  ${routeElements}      ],
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ])
  
    return routes
  }`;
  };
  
  /**
   * [React] Helper to create store
   */
  const createStore = (type: 'redux' | 'zustand' | 'recoil' | 'jotai' | 'none'): string => {
    if (type === 'redux') {
      return `import { configureStore } from '@reduxjs/toolkit'
  
  // Import your reducers here
  // import counterReducer from './slices/counterSlice'
  
  export const store = configureStore({
    reducer: {
      // counter: counterReducer,
      // Add more reducers here
    },
    devTools: process.env.NODE_ENV !== 'production',
  })
  
  // Infer the \`RootState\` and \`AppDispatch\` types from the store itself
  export type RootState = ReturnType<typeof store.getState>
  export type AppDispatch = typeof store.dispatch
  
  // Export pre-typed hooks
  import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux'
  export const useAppDispatch = () => useDispatch<AppDispatch>()
  export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector`;
    } else if (type === 'zustand') {
      return `import { create } from 'zustand'
  import { immer } from 'zustand/middleware/immer'
  
  interface AppState {
    // Define your state here
    counter: number
    
    // Define your actions
    increment: () => void
    decrement: () => void
    reset: () => void
  }
  
  export const useAppStore = create<AppState>()(
    immer((set) => ({
      // Initial state
      counter: 0,
      
      // Actions
      increment: () => set((state) => { state.counter += 1 }),
      decrement: () => set((state) => { state.counter -= 1 }),
      reset: () => set({ counter: 0 }),
    }))
  )`;
    } else if (type === 'recoil') {
      return `import { atom, selector } from 'recoil'
  
  // Define atoms (pieces of state)
  export const counterState = atom({
    key: 'counterState',
    default: 0,
  })
  
  // Define selectors (derived state)
  export const counterValueSelector = selector({
    key: 'counterValueSelector',
    get: ({ get }) => {
      const count = get(counterState)
      return count
    },
  })`;
    } else if (type === 'jotai') {
      return `import { atom } from 'jotai'
  
  // Define atoms
  export const counterAtom = atom(0)
  
  // Define derived atoms
  export const doubledCounterAtom = atom(
    (get) => get(counterAtom) * 2
  )
  
  // Define atoms with write actions
  export const counterWithActionsAtom = atom(
    (get) => get(counterAtom),
    (get, set, action: 'increment' | 'decrement' | 'reset') => {
      const value = get(counterAtom)
      if (action === 'increment') {
        set(counterAtom, value + 1)
      } else if (action === 'decrement') {
        set(counterAtom, value - 1)
      } else if (action === 'reset') {
        set(counterAtom, 0)
      }
    }
  )`;
    }
    
    return '';
  };
  
  /**
   * [React] Helper to create shadcn utils
   */
  const createShadcnUtils = (): string => {
    return `import { clsx, type ClassValue } from "clsx"
  import { twMerge } from "tailwind-merge"
  
  /**
   * Merges class names with tailwind-merge and clsx
   */
  export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
  }
  
  /**
   * Format a date with Intl.DateTimeFormat
   */
  export function formatDate(
    date: Date | string | number,
    options: Intl.DateTimeFormatOptions = {
      month: "long",
      day: "numeric",
      year: "numeric",
    }
  ): string {
    return new Intl.DateTimeFormat("en-US", {
      ...options,
    }).format(new Date(date))
  }
  
  /**
   * Wait for a specified amount of time
   */
  export function wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }`;
  };
  
  /**
   * [React] Helper to create shadcn config
   */
  const createShadcnConfig = (): string => {
    return `{
    "$schema": "https://ui.shadcn.com/schema.json",
    "style": "default",
    "rsc": false,
    "tsx": true,
    "tailwind": {
      "config": "tailwind.config.js",
      "css": "src/index.css",
      "baseColor": "slate",
      "cssVariables": true
    },
    "aliases": {
      "components": "@/components",
      "utils": "@/lib/utils"
    }
  }`;
  };
  
  /**
   * [React+Shadcn] Helper for easily adding shadcn components
   */
  export const generateShadcnComponent = (
    componentName: string,
    options: {
      variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
      size?: 'default' | 'sm' | 'lg' | 'icon';
      includeDarkMode?: boolean;
    } = {}
  ): string => {
    const { variant = 'default', size = 'default', includeDarkMode = true } = options;
    
    switch (componentName.toLowerCase()) {
      case 'button':
        return generateButtonComponent(variant, size);
      case 'card':
        return generateCardComponent(includeDarkMode);
      case 'input':
        return generateInputComponent();
      case 'dropdown':
      case 'dropdown-menu':
        return generateDropdownComponent();
      case 'dialog':
        return generateDialogComponent();
      case 'toast':
        return generateToastComponent();
      case 'tabs':
        return generateTabsComponent();
      case 'toggle':
        return generateToggleComponent(variant, size);
      case 'theme-switcher':
      case 'theme-toggle':
        return generateThemeSwitcherComponent();
      default:
        return `// Component "${componentName}" is not available in this generator
  // Visit https://ui.shadcn.com/docs/components to manually add it`;
    }
  };
  
  /**
   * [React+Shadcn] Helper to generate button component
   */
  const generateButtonComponent = (variant: string, size: string): string => {
    return `import * as React from "react"
  import { Slot } from "@radix-ui/react-slot"
  import { cva, type VariantProps } from "class-variance-authority"
  
  import { cn } from "@/lib/utils"
  
  const buttonVariants = cva(
    "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
    {
      variants: {
        variant: {
          default: "bg-primary text-primary-foreground hover:bg-primary/90",
          destructive:
            "bg-destructive text-destructive-foreground hover:bg-destructive/90",
          outline:
            "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
          secondary:
            "bg-secondary text-secondary-foreground hover:bg-secondary/80",
          ghost: "hover:bg-accent hover:text-accent-foreground",
          link: "text-primary underline-offset-4 hover:underline",
        },
        size: {
          default: "h-10 px-4 py-2",
          sm: "h-9 rounded-md px-3",
          lg: "h-11 rounded-md px-8",
          icon: "h-10 w-10",
        },
      },
      defaultVariants: {
        variant: "${variant}",
        size: "${size}",
      },
    }
  )
  
  export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
      VariantProps<typeof buttonVariants> {
    asChild?: boolean
  }
  
  const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
      const Comp = asChild ? Slot : "button"
      return (
        <Comp
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        />
      )
    }
  )
  Button.displayName = "Button"
  
  export { Button, buttonVariants }`;
  };
  
  /**
   * [React+Shadcn] Helper to generate card component
   */
  const generateCardComponent = (includeDarkMode: boolean): string => {
    return `import * as React from "react"
  
  import { cn } from "@/lib/utils"
  
  const Card = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
  >(({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border bg-card text-card-foreground shadow-sm",
        className
      )}
      {...props}
    />
  ))
  Card.displayName = "Card"
  
  const CardHeader = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
  >(({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-1.5 p-6", className)}
      {...props}
    />
  ))
  CardHeader.displayName = "CardHeader"
  
  const CardTitle = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLHeadingElement>
  >(({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        "text-2xl font-semibold leading-none tracking-tight",
        className
      )}
      {...props}
    />
  ))
  CardTitle.displayName = "CardTitle"
  
  const CardDescription = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement>
  >(({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  ))
  CardDescription.displayName = "CardDescription"
  
  const CardContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
  >(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  ))
  CardContent.displayName = "CardContent"
  
  const CardFooter = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
  >(({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center p-6 pt-0", className)}
      {...props}
    />
  ))
  CardFooter.displayName = "CardFooter"
  
  export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }`;
  };
  
  /**
   * [React+Shadcn] Helper to generate input component
   */
  const generateInputComponent = (): string => {
    return `import * as React from "react"
  
  import { cn } from "@/lib/utils"
  
  export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {}
  
  const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, ...props }, ref) => {
      return (
        <input
          type={type}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          ref={ref}
          {...props}
        />
      )
    }
  )
  Input.displayName = "Input"
  
  export { Input }`;
  };
  
  /**
   * [React+Shadcn] Helper to generate dropdown menu component
   */
  const generateDropdownComponent = (): string => {
    return `import * as React from "react"
  import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
  import { Check, ChevronRight, Circle } from "lucide-react"
  
  import { cn } from "@/lib/utils"
  
  const DropdownMenu = DropdownMenuPrimitive.Root
  
  const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger
  
  const DropdownMenuGroup = DropdownMenuPrimitive.Group
  
  const DropdownMenuPortal = DropdownMenuPrimitive.Portal
  
  const DropdownMenuSub = DropdownMenuPrimitive.Sub
  
  const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup
  
  const DropdownMenuSubTrigger = React.forwardRef<
    React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
      inset?: boolean
    }
  >(({ className, inset, children, ...props }, ref) => (
    <DropdownMenuPrimitive.SubTrigger
      ref={ref}
      className={cn(
        "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent",
        inset && "pl-8",
        className
      )}
      {...props}
    >
      {children}
      <ChevronRight className="ml-auto h-4 w-4" />
    </DropdownMenuPrimitive.SubTrigger>
  ))
  DropdownMenuSubTrigger.displayName =
    DropdownMenuPrimitive.SubTrigger.displayName
  
  const DropdownMenuSubContent = React.forwardRef<
    React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
  >(({ className, ...props }, ref) => (
    <DropdownMenuPrimitive.SubContent
      ref={ref}
      className={cn(
        "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    />
  ))
  DropdownMenuSubContent.displayName =
    DropdownMenuPrimitive.SubContent.displayName
  
  const DropdownMenuContent = React.forwardRef<
    React.ElementRef<typeof DropdownMenuPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
  >(({ className, sideOffset = 4, ...props }, ref) => (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  ))
  DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName
  
  const DropdownMenuItem = React.forwardRef<
    React.ElementRef<typeof DropdownMenuPrimitive.Item>,
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
      inset?: boolean
    }
  >(({ className, inset, ...props }, ref) => (
    <DropdownMenuPrimitive.Item
      ref={ref}
      className={cn(
        "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        inset && "pl-8",
        className
      )}
      {...props}
    />
  ))
  DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName
  
  const DropdownMenuCheckboxItem = React.forwardRef<
    React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
  >(({ className, children, checked, ...props }, ref) => (
    <DropdownMenuPrimitive.CheckboxItem
      ref={ref}
      className={cn(
        "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      checked={checked}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Check className="h-4 w-4" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  ))
  DropdownMenuCheckboxItem.displayName =
    DropdownMenuPrimitive.CheckboxItem.displayName
  
  const DropdownMenuRadioItem = React.forwardRef<
    React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
  >(({ className, children, ...props }, ref) => (
    <DropdownMenuPrimitive.RadioItem
      ref={ref}
      className={cn(
        "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Circle className="h-2 w-2 fill-current" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  ))
  DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName
  
  const DropdownMenuLabel = React.forwardRef<
    React.ElementRef<typeof DropdownMenuPrimitive.Label>,
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
      inset?: boolean
    }
  >(({ className, inset, ...props }, ref) => (
    <DropdownMenuPrimitive.Label
      ref={ref}
      className={cn(
        "px-2 py-1.5 text-sm font-semibold",
        inset && "pl-8",
        className
      )}
      {...props}
    />
  ))
  DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName
  
  const DropdownMenuSeparator = React.forwardRef<
    React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
  >(({ className, ...props }, ref) => (
    <DropdownMenuPrimitive.Separator
      ref={ref}
      className={cn("-mx-1 my-1 h-px bg-muted", className)}
      {...props}
    />
  ))
  DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName
  
  const DropdownMenuShortcut = ({
    className,
    ...props
  }: React.HTMLAttributes<HTMLSpanElement>) => {
    return (
      <span
        className={cn("ml-auto text-xs tracking-widest opacity-60", className)}
        {...props}
      />
    )
  }
  DropdownMenuShortcut.displayName = "DropdownMenuShortcut"
  
  export {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuCheckboxItem,
    DropdownMenuRadioItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuGroup,
    DropdownMenuPortal,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuRadioGroup,
  }`;
  };
  
  /**
   * [React+Shadcn] Generate dialog component
   */
  const generateDialogComponent = (): string => {
    return `import * as React from "react"
  import * as DialogPrimitive from "@radix-ui/react-dialog"
  import { X } from "lucide-react"
  
  import { cn } from "@/lib/utils"
  
  const Dialog = DialogPrimitive.Root
  
  const DialogTrigger = DialogPrimitive.Trigger
  
  const DialogPortal = ({
    className,
    ...props
  }: DialogPrimitive.DialogPortalProps) => (
    <DialogPrimitive.Portal className={cn(className)} {...props} />
  )
  DialogPortal.displayName = DialogPrimitive.Portal.displayName
  
  const DialogOverlay = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Overlay>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
  >(({ className, ...props }, ref) => (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn(
        "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className
      )}
      {...props}
    />
  ))
  DialogOverlay.displayName = DialogPrimitive.Overlay.displayName
  
  const DialogContent = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
  >(({ className, children, ...props }, ref) => (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg md:w-full",
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  ))
  DialogContent.displayName = DialogPrimitive.Content.displayName
  
  const DialogHeader = ({
    className,
    ...props
  }: React.HTMLAttributes<HTMLDivElement>) => (
    <div
      className={cn(
        "flex flex-col space-y-1.5 text-center sm:text-left",
        className
      )}
      {...props}
    />
  )
  DialogHeader.displayName = "DialogHeader"
  
  const DialogFooter = ({
    className,
    ...props
  }: React.HTMLAttributes<HTMLDivElement>) => (
    <div
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
        className
      )}
      {...props}
    />
  )
  DialogFooter.displayName = "DialogFooter"
  
  const DialogTitle = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Title>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
  >(({ className, ...props }, ref) => (
    <DialogPrimitive.Title
      ref={ref}
      className={cn(
        "text-lg font-semibold leading-none tracking-tight",
        className
      )}
      {...props}
    />
  ))
  DialogTitle.displayName = DialogPrimitive.Title.displayName
  
  const DialogDescription = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Description>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
  >(({ className, ...props }, ref) => (
    <DialogPrimitive.Description
      ref={ref}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  ))
  DialogDescription.displayName = DialogPrimitive.Description.displayName
  
  export {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
  }`;
  };
  
  /**
   * [React+Shadcn] Generate toast component
   */
  const generateToastComponent = (): string => {
    return `import * as React from "react"
  import * as ToastPrimitives from "@radix-ui/react-toast"
  import { cva, type VariantProps } from "class-variance-authority"
  import { X } from "lucide-react"
  
  import { cn } from "@/lib/utils"
  
  const ToastProvider = ToastPrimitives.Provider
  
  const ToastViewport = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Viewport>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
  >(({ className, ...props }, ref) => (
    <ToastPrimitives.Viewport
      ref={ref}
      className={cn(
        "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
        className
      )}
      {...props}
    />
  ))
  ToastViewport.displayName = ToastPrimitives.Viewport.displayName
  
  const toastVariants = cva(
    "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full data-[state=closed]:slide-out-to-right-full",
    {
      variants: {
        variant: {
          default: "border bg-background text-foreground",
          destructive:
            "destructive group border-destructive bg-destructive text-destructive-foreground",
        },
      },
      defaultVariants: {
        variant: "default",
      },
    }
  )
  
  const Toast = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Root>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
      VariantProps<typeof toastVariants>
  >(({ className, variant, ...props }, ref) => {
    return (
      <ToastPrimitives.Root
        ref={ref}
        className={cn(toastVariants({ variant }), className)}
        {...props}
      />
    )
  })
  Toast.displayName = ToastPrimitives.Root.displayName
  
  const ToastAction = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Action>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
  >(({ className, ...props }, ref) => (
    <ToastPrimitives.Action
      ref={ref}
      className={cn(
        "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
        className
      )}
      {...props}
    />
  ))
  ToastAction.displayName = ToastPrimitives.Action.displayName
  
  const ToastClose = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Close>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
  >(({ className, ...props }, ref) => (
    <ToastPrimitives.Close
      ref={ref}
      className={cn(
        "absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600",
        className
      )}
      toast-close=""
      {...props}
    >
      <X className="h-4 w-4" />
    </ToastPrimitives.Close>
  ))
  ToastClose.displayName = ToastPrimitives.Close.displayName
  
  const ToastTitle = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Title>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
  >(({ className, ...props }, ref) => (
    <ToastPrimitives.Title
      ref={ref}
      className={cn("text-sm font-semibold", className)}
      {...props}
    />
  ))
  ToastTitle.displayName = ToastPrimitives.Title.displayName
  
  const ToastDescription = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Description>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
  >(({ className, ...props }, ref) => (
    <ToastPrimitives.Description
      ref={ref}
      className={cn("text-sm opacity-90", className)}
      {...props}
    />
  ))
  ToastDescription.displayName = ToastPrimitives.Description.displayName
  
  type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>
  
  type ToastActionElement = React.ReactElement<typeof ToastAction>
  
  export {
    type ToastProps,
    type ToastActionElement,
    ToastProvider,
    ToastViewport,
    Toast,
    ToastTitle,
    ToastDescription,
    ToastClose,
    ToastAction,
  }`;
  };
  
  /**
   * [React+Shadcn] Generate tabs component
   */
  const generateTabsComponent = (): string => {
    return `import * as React from "react"
  import * as TabsPrimitive from "@radix-ui/react-tabs"
  
  import { cn } from "@/lib/utils"
  
  const Tabs = TabsPrimitive.Root
  
  const TabsList = React.forwardRef<
    React.ElementRef<typeof TabsPrimitive.List>,
    React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
  >(({ className, ...props }, ref) => (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
        className
      )}
      {...props}
    />
  ))
  TabsList.displayName = TabsPrimitive.List.displayName
  
  const TabsTrigger = React.forwardRef<
    React.ElementRef<typeof TabsPrimitive.Trigger>,
    React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
  >(({ className, ...props }, ref) => (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
        className
      )}
      {...props}
    />
  ))
  TabsTrigger.displayName = TabsPrimitive.Trigger.displayName
  
  const TabsContent = React.forwardRef<
    React.ElementRef<typeof TabsPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
  >(({ className, ...props }, ref) => (
    <TabsPrimitive.Content
      ref={ref}
      className={cn(
        "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      {...props}
    />
  ))
  TabsContent.displayName = TabsPrimitive.Content.displayName
  
  export { Tabs, TabsList, TabsTrigger, TabsContent }`;
  };
  
  /**
   * [React+Shadcn] Generate toggle component
   */
  const generateToggleComponent = (variant: string, size: string): string => {
    return `import * as React from "react"
  import * as TogglePrimitive from "@radix-ui/react-toggle"
  import { cva, type VariantProps } from "class-variance-authority"
  
  import { cn } from "@/lib/utils"
  
  const toggleVariants = cva(
    "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground",
    {
      variants: {
        variant: {
          default: "bg-transparent",
          outline:
            "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground",
        },
        size: {
          default: "h-10 px-3",
          sm: "h-9 px-2.5",
          lg: "h-11 px-5",
        },
      },
      defaultVariants: {
        variant: "${variant}",
        size: "${size}",
      },
    }
  )
  
  const Toggle = React.forwardRef<
    React.ElementRef<typeof TogglePrimitive.Root>,
    React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> &
      VariantProps<typeof toggleVariants>
  >(({ className, variant, size, ...props }, ref) => (
    <TogglePrimitive.Root
      ref={ref}
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  ))
  
  Toggle.displayName = TogglePrimitive.Root.displayName
  
  export { Toggle, toggleVariants }`;
  };
  
  /**
   * [React+Shadcn] Generate theme switcher component
   */
  const generateThemeSwitcherComponent = (): string => {
    return `"use client"
  
  import * as React from "react"
  import { Moon, Sun } from "lucide-react"
  import { useTheme } from "next-themes"
  
  import { Button } from "@/components/ui/button"
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu"
  
  export function ThemeToggle() {
    const { setTheme } = useTheme()
  
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon">
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setTheme("light")}>
            Light
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("dark")}>
            Dark
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("system")}>
            System
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }
  
  // Theme provider component
  import { createContext, useContext, useEffect, useState } from "react"
  
  type Theme = "dark" | "light" | "system"
  
  type ThemeProviderProps = {
    children: React.ReactNode
    defaultTheme?: Theme
    storageKey?: string
  }
  
  type ThemeProviderState = {
    theme: Theme
    setTheme: (theme: Theme) => void
  }
  
  const initialState: ThemeProviderState = {
    theme: "system",
    setTheme: () => null,
  }
  
  const ThemeProviderContext = createContext<ThemeProviderState>(initialState)
  
  export function ThemeProvider({
    children,
    defaultTheme = "system",
    storageKey = "theme",
    ...props
  }: ThemeProviderProps) {
    const [theme, setTheme] = useState<Theme>(
      () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
    )
  
    useEffect(() => {
      const root = window.document.documentElement
  
      root.classList.remove("light", "dark")
  
      if (theme === "system") {
        const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
          .matches
          ? "dark"
          : "light"
  
        root.classList.add(systemTheme)
        return
      }
  
      root.classList.add(theme)
    }, [theme])
  
    const value = {
      theme,
      setTheme: (theme: Theme) => {
        localStorage.setItem(storageKey, theme)
        setTheme(theme)
      },
    }
  
    return (
      <ThemeProviderContext.Provider {...props} value={value}>
        {children}
      </ThemeProviderContext.Provider>
    )
  }
  
  export const useTheme = () => {
    const context = useContext(ThemeProviderContext)
  
    if (context === undefined)
      throw new Error("useTheme must be used within a ThemeProvider")
  
    return context
  }`;
  };
// ===================================================
// MODAL & UI NOTIFICATION SYSTEM
// ===================================================

/**
 * [UI] Modal options interface
 */
export interface ModalOptions {
    title: string;
    content: string | HTMLElement;
    actions?: {
      label: string;
      callback: () => void;
      primary?: boolean;
    }[];
    closable?: boolean;
    width?: string;
    height?: string;
    className?: string;
    animationDuration?: number;
    onOpen?: () => void;
    onClose?: () => void;
  }
  
  /**
   * [UI] Modal component for user interactions
   */
  export class Modal {
    private element: HTMLElement;
    private backdrop: HTMLElement;
    private options: ModalOptions;
    private isOpen: boolean = false;
    
    constructor(options: ModalOptions) {
      this.options = {
        closable: true,
        width: '400px',
        actions: [
          {
            label: 'Close',
            callback: () => this.close(),
            primary: false
          }
        ],
        ...options,
      };
      
      this.element = document.createElement('div');
      this.element.className = `modal ${this.options.className || ''}`;
      this.element.style.display = 'none';
      this.element.setAttribute('role', 'dialog');
      this.element.setAttribute('aria-modal', 'true');
      
      this.backdrop = document.createElement('div');
      this.backdrop.className = 'modal-backdrop';
      this.backdrop.style.display = 'none';
      
      this.initializeModal();
      
      // Add to DOM
      document.body.appendChild(this.backdrop);
      document.body.appendChild(this.element);
    }
    
    /**
     * Initialize modal structure and styles
     */
    private initializeModal(): void {
      // Set dimensions
      this.element.style.width = this.options.width || '400px';
      if (this.options.height) {
        this.element.style.height = this.options.height;
      }
      
      // Create header
      const header = document.createElement('div');
      header.className = 'modal-header';
      
      const title = document.createElement('h2');
      title.className = 'modal-title';
      title.textContent = this.options.title;
      header.appendChild(title);
      
      if (this.options.closable) {
        const closeButton = document.createElement('button');
        closeButton.className = 'modal-close';
        closeButton.innerHTML = '&times;';
        closeButton.setAttribute('aria-label', 'Close');
        closeButton.addEventListener('click', () => this.close());
        header.appendChild(closeButton);
      }
      
      // Create content
      const content = document.createElement('div');
      content.className = 'modal-content';
      if (typeof this.options.content === 'string') {
        content.innerHTML = this.options.content;
      } else {
        content.appendChild(this.options.content);
      }
      
      // Create footer with actions
      const footer = document.createElement('div');
      footer.className = 'modal-footer';
      
      if (this.options.actions && this.options.actions.length > 0) {
        this.options.actions.forEach(action => {
          const button = document.createElement('button');
          button.textContent = action.label;
          button.className = action.primary ? 'modal-button primary' : 'modal-button';
          button.addEventListener('click', action.callback);
          footer.appendChild(button);
        });
      }
      
      // Add all parts to modal
      this.element.appendChild(header);
      this.element.appendChild(content);
      this.element.appendChild(footer);
      
      // Add event listener for backdrop click
      if (this.options.closable) {
        this.backdrop.addEventListener('click', () => this.close());
      }
      
      // Add keyboard event listener
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isOpen && this.options.closable) {
          this.close();
        }
      });
      
      // Add default styles
      this.addStyles();
    }
    
    /**
     * Add default styles for modal
     */
    private addStyles(): void {
      // Check if styles already exist
      if (document.getElementById('claude-modal-styles')) return;
      
      const style = document.createElement('style');
      style.id = 'claude-modal-styles';
      style.textContent = `
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.5);
          z-index: 1000;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .modal-backdrop.active {
          opacity: 1;
        }
        .modal {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) scale(0.9);
          background-color: white;
          border-radius: 4px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          z-index: 1001;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          opacity: 0;
          transition: transform 0.3s ease, opacity 0.3s ease;
        }
        .modal.active {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px;
          border-bottom: 1px solid #eee;
        }
        .modal-title {
          margin: 0;
          font-size: 18px;
          font-weight: bold;
        }
        .modal-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          line-height: 1;
        }
        .modal-content {
          padding: 15px;
          overflow-y: auto;
          flex: 1;
        }
        .modal-footer {
          padding: 15px;
          border-top: 1px solid #eee;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }
        .modal-button {
          padding: 8px 16px;
          border: 1px solid #ddd;
          background-color: #f8f8f8;
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .modal-button:hover {
          background-color: #eee;
        }
        .modal-button.primary {
          background-color: #4a90e2;
          color: white;
          border-color: #4a90e2;
        }
        .modal-button.primary:hover {
          background-color: #3b7dcc;
        }
      `;
      document.head.appendChild(style);
    }
    
    /**
     * Open the modal
     */
    open(): void {
      this.element.style.display = 'flex';
      this.backdrop.style.display = 'block';
      
      // Trigger reflow for animation
      void this.element.offsetWidth;
      void this.backdrop.offsetWidth;
      
      this.element.classList.add('active');
      this.backdrop.classList.add('active');
      this.isOpen = true;
      
      if (this.options.onOpen) {
        this.options.onOpen();
      }
    }
    
    /**
     * Close the modal
     */
    close(): void {
      this.element.classList.remove('active');
      this.backdrop.classList.remove('active');
      
      // Wait for animation to finish
      setTimeout(() => {
        if (!this.isOpen) return;
        this.element.style.display = 'none';
        this.backdrop.style.display = 'none';
        this.isOpen = false;
        
        if (this.options.onClose) {
          this.options.onClose();
        }
      }, this.options.animationDuration || 300);
    }
    
    /**
     * Set content of the modal
     */
    setContent(content: string | HTMLElement): void {
      const contentEl = this.element.querySelector('.modal-content')!;
      contentEl.innerHTML = '';
      
      if (typeof content === 'string') {
        contentEl.innerHTML = content;
      } else {
        contentEl.appendChild(content);
      }
    }
    
    /**
     * Set title of the modal
     */
    setTitle(title: string): void {
      const titleEl = this.element.querySelector('.modal-title')!;
      titleEl.textContent = title;
    }
    
    /**
     * Check if modal is open
     */
    isVisible(): boolean {
      return this.isOpen;
    }
    
    /**
     * Clean up and remove the modal
     */
    dispose(): void {
      if (this.isOpen) {
        this.close();
      }
      
      // Remove from DOM after animation completes
      setTimeout(() => {
        document.body.removeChild(this.element);
        document.body.removeChild(this.backdrop);
      }, this.options.animationDuration || 300);
    }
  }
  
  /**
   * [UI] Display an alert dialog
   */
  export const alert = (message: string, title: string = 'Alert'): Promise<void> => {
    return new Promise((resolve) => {
      const modal = new Modal({
        title,
        content: message,
        actions: [
          {
            label: 'OK',
            callback: () => {
              modal.close();
              setTimeout(() => {
                modal.dispose();
                resolve();
              }, 300);
            },
            primary: true
          }
        ]
      });
      
      modal.open();
    });
  };
  
  /**
   * [UI] Display a confirmation dialog
   */
  export const confirm = (message: string, title: string = 'Confirm'): Promise<boolean> => {
    return new Promise((resolve) => {
      const modal = new Modal({
        title,
        content: message,
        actions: [
          {
            label: 'Cancel',
            callback: () => {
              modal.close();
              setTimeout(() => {
                modal.dispose();
                resolve(false);
              }, 300);
            }
          },
          {
            label: 'OK',
            callback: () => {
              modal.close();
              setTimeout(() => {
                modal.dispose();
                resolve(true);
              }, 300);
            },
            primary: true
          }
        ]
      });
      
      modal.open();
    });
  };
  
  /**
   * [UI] Display a prompt dialog
   */
  export const prompt = (message: string, defaultValue: string = '', title: string = 'Prompt'): Promise<string | null> => {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'text';
      input.value = defaultValue;
      input.style.width = '100%';
      input.style.padding = '8px';
      input.style.marginTop = '10px';
      input.style.boxSizing = 'border-box';
      
      const content = document.createElement('div');
      content.innerHTML = message;
      content.appendChild(input);
      
      const modal = new Modal({
        title,
        content,
        actions: [
          {
            label: 'Cancel',
            callback: () => {
              modal.close();
              setTimeout(() => {
                modal.dispose();
                resolve(null);
              }, 300);
            }
          },
          {
            label: 'OK',
            callback: () => {
              const value = input.value;
              modal.close();
              setTimeout(() => {
                modal.dispose();
                resolve(value);
              }, 300);
            },
            primary: true
          }
        ]
      });
      
      modal.open();
      setTimeout(() => input.focus(), 100);
    });
  };
  
  /**
   * [UI] Toast notification types
   */
  export type ToastType = 'success' | 'info' | 'warning' | 'error';
  
  /**
   * [UI] Toast notification options
   */
  export interface ToastOptions {
    message: string;
    type?: ToastType;
    duration?: number;
    position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
    showCloseButton?: boolean;
    onClose?: () => void;
  }
  
  /**
   * [UI] Display a toast notification
   */
  export const toast = (options: ToastOptions | string): void => {
    // Initialize options
    const defaultOptions: ToastOptions = {
      message: typeof options === 'string' ? options : options.message,
      type: 'info',
      duration: 3000,
      position: 'bottom-right',
      showCloseButton: true
    };
    
    const settings: ToastOptions = typeof options === 'string' 
      ? defaultOptions 
      : { ...defaultOptions, ...options };
    
    // Add toast styles if needed
    addToastStyles();
    
    // Create toast container if it doesn't exist
    const containerId = `toast-container-${settings.position}`;
    let container = document.getElementById(containerId);
    
    if (!container) {
      container = document.createElement('div');
      container.id = containerId;
      container.className = `toast-container toast-${settings.position}`;
      document.body.appendChild(container);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${settings.type}`;
    
    // Add close button if needed
    if (settings.showCloseButton) {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'toast-close-btn';
      closeBtn.innerHTML = '&times;';
      closeBtn.addEventListener('click', () => {
        closeToast(toast, settings.onClose);
      });
      toast.appendChild(closeBtn);
    }
    
    // Add message
    const messageElement = document.createElement('div');
    messageElement.className = 'toast-message';
    messageElement.textContent = settings.message;
    toast.appendChild(messageElement);
    
    // Add toast to container
    container.appendChild(toast);
    
    // Animate toast in
    setTimeout(() => {
      toast.classList.add('toast-visible');
    }, 10);
    
    // Remove toast after duration
    if (settings.duration) {
      setTimeout(() => {
        closeToast(toast, settings.onClose);
      }, settings.duration);
    }
  };
  
  /**
   * [UI] Helper function to close a toast notification
   */
  function closeToast(toast: HTMLElement, callback?: () => void): void {
    toast.classList.remove('toast-visible');
    
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
        if (callback) callback();
      }
    }, 300);
  }
  
  /**
   * [UI] Add toast styles to document
   */
  function addToastStyles(): void {
    if (document.getElementById('claude-toast-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'claude-toast-styles';
    style.textContent = `
      .toast-container {
        position: fixed;
        z-index: 1050;
        pointer-events: none;
        max-width: 350px;
      }
      
      .toast-top-right {
        top: 15px;
        right: 15px;
      }
      
      .toast-top-left {
        top: 15px;
        left: 15px;
      }
      
      .toast-bottom-right {
        bottom: 15px;
        right: 15px;
      }
      
      .toast-bottom-left {
        bottom: 15px;
        left: 15px;
      }
      
      .toast-top-center {
        top: 15px;
        left: 50%;
        transform: translateX(-50%);
      }
      
      .toast-bottom-center {
        bottom: 15px;
        left: 50%;
        transform: translateX(-50%);
      }
      
      .toast {
        display: flex;
        align-items: center;
        padding: 12px 15px;
        margin-bottom: 10px;
        border-radius: 4px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        opacity: 0;
        transform: translateY(20px);
        transition: opacity 0.3s, transform 0.3s;
        pointer-events: auto;
        overflow: hidden;
        position: relative;
      }
      
      .toast-visible {
        opacity: 1;
        transform: translateY(0);
      }
      
      .toast-success {
        background-color: #48c774;
        color: white;
      }
      
      .toast-info {
        background-color: #3298dc;
        color: white;
      }
      
      .toast-warning {
        background-color: #ffdd57;
        color: rgba(0, 0, 0, 0.7);
      }
      
      .toast-error {
        background-color: #f14668;
        color: white;
      }
      
      .toast-close-btn {
        background: none;
        border: none;
        color: inherit;
        font-size: 18px;
        cursor: pointer;
        opacity: 0.7;
        margin-right: 5px;
        padding: 0;
        line-height: 1;
      }
      
      .toast-close-btn:hover {
        opacity: 1;
      }
      
      .toast-message {
        flex-grow: 1;
      }
    `;
    
    document.head.appendChild(style);
  }
  
  /**
   * [UI] Banner notification options
   */
  export interface BannerOptions {
    message: string;
    type?: ToastType;
    duration?: number | null;
    position?: 'top' | 'bottom';
    showCloseButton?: boolean;
    onClose?: () => void;
  }
  
  /**
   * [UI] Display a banner notification
   */
  export const banner = (options: BannerOptions | string): { close: () => void } => {
    // Initialize options
    const defaultOptions: BannerOptions = {
      message: typeof options === 'string' ? options : options.message,
      type: 'info',
      duration: 5000,
      position: 'top',
      showCloseButton: true
    };
    
    const settings: BannerOptions = typeof options === 'string' 
      ? defaultOptions 
      : { ...defaultOptions, ...options };
    
    // Add banner styles if needed
    addBannerStyles();
    
    // Create banner element
    const banner = document.createElement('div');
    banner.className = `banner banner-${settings.type} banner-${settings.position}`;
    
    // Create content
    const content = document.createElement('div');
    content.className = 'banner-content';
    content.textContent = settings.message;
    banner.appendChild(content);
    
    // Add close button if needed
    if (settings.showCloseButton) {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'banner-close-btn';
      closeBtn.innerHTML = '&times;';
      closeBtn.addEventListener('click', () => {
        closeBanner();
      });
      banner.appendChild(closeBtn);
    }
    
    // Add to document
    document.body.appendChild(banner);
    
    // Animate banner in
    setTimeout(() => {
      banner.classList.add('banner-visible');
    }, 10);
    
    // Remove banner after duration if specified
    let timeoutId: number | null = null;
    if (settings.duration) {
      timeoutId = window.setTimeout(() => {
        closeBanner();
      }, settings.duration);
    }
    
    // Close function
    function closeBanner(): void {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      
      banner.classList.remove('banner-visible');
      
      setTimeout(() => {
        if (banner.parentNode) {
          banner.parentNode.removeChild(banner);
          if (settings.onClose) settings.onClose();
        }
      }, 300);
    }
    
    return { close: closeBanner };
  };
  
  /**
   * [UI] Add banner styles to document
   */
  function addBannerStyles(): void {
    if (document.getElementById('claude-banner-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'claude-banner-styles';
    style.textContent = `
      .banner {
        position: fixed;
        left: 0;
        right: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 15px 20px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        z-index: 1040;
        transform: translateY(-100%);
        transition: transform 0.3s ease;
      }
      
      .banner-visible {
        transform: translateY(0);
      }
      
      .banner-top {
        top: 0;
      }
      
      .banner-bottom {
        bottom: 0;
        transform: translateY(100%);
      }
      
      .banner-success {
        background-color: #48c774;
        color: white;
      }
      
      .banner-info {
        background-color: #3298dc;
        color: white;
      }
      
      .banner-warning {
        background-color: #ffdd57;
        color: rgba(0, 0, 0, 0.7);
      }
      
      .banner-error {
        background-color: #f14668;
        color: white;
      }
      
      .banner-content {
        flex-grow: 1;
        text-align: center;
      }
      
      .banner-close-btn {
        background: none;
        border: none;
        color: inherit;
        font-size: 20px;
        cursor: pointer;
        opacity: 0.7;
        padding: 0;
        margin-left: 10px;
        line-height: 1;
      }
      
      .banner-close-btn:hover {
        opacity: 1;
      }
    `;
    
    document.head.appendChild(style);
  }
  
  /**
   * [UI] Loading indicator options
   */
  export interface LoadingOptions {
    message?: string;
    backdrop?: boolean;
    spinnerSize?: 'small' | 'medium' | 'large';
    spinnerColor?: string;
  }
  
  /**
   * [UI] Show a loading indicator
   */
  export const showLoading = (options: LoadingOptions = {}): { hide: () => void } => {
    const {
      message = 'Loading...',
      backdrop = true,
      spinnerSize = 'medium',
      spinnerColor = '#3298dc'
    } = options;
    
    // Add loading styles if needed
    addLoadingStyles();
    
    // Create loading element
    const loadingEl = document.createElement('div');
    loadingEl.className = 'loading-container';
    
    if (backdrop) {
      loadingEl.classList.add('loading-backdrop');
    }
    
    // Create spinner
    const spinner = document.createElement('div');
    spinner.className = `loading-spinner loading-spinner-${spinnerSize}`;
    spinner.style.borderTopColor = spinnerColor;
    loadingEl.appendChild(spinner);
    
    // Add message if provided
    if (message) {
      const messageEl = document.createElement('div');
      messageEl.className = 'loading-message';
      messageEl.textContent = message;
      loadingEl.appendChild(messageEl);
    }
    
    // Add to document
    document.body.appendChild(loadingEl);
    document.body.classList.add('loading-active');
    
    // Animate in
    setTimeout(() => {
      loadingEl.classList.add('loading-visible');
    }, 10);
    
    // Hide function
    function hide(): void {
      loadingEl.classList.remove('loading-visible');
      
      setTimeout(() => {
        if (loadingEl.parentNode) {
          loadingEl.parentNode.removeChild(loadingEl);
          document.body.classList.remove('loading-active');
        }
      }, 300);
    }
    
    return { hide };
  };
  
  /**
   * [UI] Add loading styles to document
   */
  function addLoadingStyles(): void {
    if (document.getElementById('claude-loading-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'claude-loading-styles';
    style.textContent = `
      .loading-active {
        overflow: hidden;
      }
      
      .loading-container {
        position: fixed;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 1060;
        opacity: 0;
        transition: opacity 0.3s;
      }
      
      .loading-backdrop {
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
      }
      
      .loading-visible {
        opacity: 1;
      }
      
      .loading-spinner {
        border-radius: 50%;
        border: 3px solid rgba(255, 255, 255, 0.3);
        border-top-color: #3298dc;
        animation: spin 1s linear infinite;
      }
      
      .loading-spinner-small {
        width: 20px;
        height: 20px;
      }
      
      .loading-spinner-medium {
        width: 40px;
        height: 40px;
      }
      
      .loading-spinner-large {
        width: 60px;
        height: 60px;
      }
      
      .loading-message {
        margin-top: 15px;
        color: white;
        font-size: 16px;
      }
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `;
    
    document.head.appendChild(style);
  }
// ===================================================
// BROWSER AS GUI
// ===================================================

/**
 * [BrowserGUI] Interface for UI component configuration
 */
export interface ComponentConfig {
    id?: string;
    className?: string;
    style?: Partial<CSSStyleDeclaration>;
    attributes?: Record<string, string>;
    dataset?: Record<string, string>;
    children?: (HTMLElement | string)[];
    events?: Record<string, EventListener>;
  }
  
  /**
   * [BrowserGUI] Creates an HTML element with configuration
   */
  export const createElement = <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    config: ComponentConfig = {}
  ): HTMLElementTagNameMap[K] => {
    const element = document.createElement(tag);
    
    // Set ID if provided
    if (config.id) {
      element.id = config.id;
    }
    
    // Set class if provided
    if (config.className) {
      element.className = config.className;
    }
    
    // Set style if provided
    if (config.style) {
      Object.assign(element.style, config.style);
    }
    
    // Set attributes if provided
    if (config.attributes) {
      Object.entries(config.attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
      });
    }
    
    // Set dataset if provided
    if (config.dataset) {
      Object.entries(config.dataset).forEach(([key, value]) => {
        element.dataset[key] = value;
      });
    }
    
    // Add children if provided
    if (config.children) {
      config.children.forEach(child => {
        if (typeof child === 'string') {
          element.appendChild(document.createTextNode(child));
        } else {
          element.appendChild(child);
        }
      });
    }
    
    // Add event listeners if provided
    if (config.events) {
      Object.entries(config.events).forEach(([event, listener]) => {
        element.addEventListener(event, listener);
      });
    }
    
    return element;
  };
  
  /**
   * [BrowserGUI] Creates a form element with a label
   */
  export const createFormField = (
    type: string,
    name: string,
    labelText: string,
    options: {
      id?: string;
      value?: string;
      required?: boolean;
      placeholder?: string;
      className?: string;
      labelClassName?: string;
      containerClassName?: string;
      events?: Record<string, EventListener>;
      attributes?: Record<string, string>;
    } = {}
  ): HTMLDivElement => {
    const id = options.id || `field-${name}`;
    const container = createElement('div', {
      className: options.containerClassName || 'form-field',
    });
    
    const label = createElement('label', {
      className: options.labelClassName || 'form-label',
      attributes: { for: id },
      children: [labelText],
    });
    
    const inputConfig: ComponentConfig = {
      id,
      className: options.className || 'form-input',
      attributes: {
        name,
        type,
        ...options.attributes,
      },
      events: options.events,
    };
    
    if (options.value !== undefined) {
      inputConfig.attributes!.value = options.value;
    }
    
    if (options.required) {
      inputConfig.attributes!.required = 'required';
    }
    
    if (options.placeholder) {
      inputConfig.attributes!.placeholder = options.placeholder;
    }
    
    const input = createElement('input', inputConfig);
    
    container.appendChild(label);
    container.appendChild(input);
    
    return container;
  };
  
  /**
   * [BrowserGUI] Creates a simple modal dialog
   */
  export const createModal = (
    content: HTMLElement | string,
    options: {
      title?: string;
      closable?: boolean;
      width?: string;
      height?: string;
      onClose?: () => void;
    } = {}
  ): {
    modal: HTMLDivElement;
    open: () => void;
    close: () => void;
  } => {
    const { title = '', closable = true, width = '400px', height = 'auto', onClose } = options;
    
    // Create modal overlay
    const overlay = createElement('div', {
      className: 'modal-overlay',
      style: {
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: '9999',
      },
    });
    
    // Create modal container
    const modal = createElement('div', {
      className: 'modal-container',
      style: {
        backgroundColor: '#fff',
        borderRadius: '4px',
        maxWidth: '90%',
        width,
        height,
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
      },
    });
    
    // Create modal header if title is provided
    if (title) {
      const header = createElement('div', {
        className: 'modal-header',
        style: {
          padding: '15px',
          borderBottom: '1px solid #eee',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
      });
      
      const titleEl = createElement('h3', {
        className: 'modal-title',
        style: {
          margin: '0',
          fontSize: '18px',
          fontWeight: 'bold',
        },
        children: [title],
      });
      
      header.appendChild(titleEl);
      
      if (closable) {
        const closeButton = createElement('button', {
          className: 'modal-close',
          style: {
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '24px',
            lineHeight: '1',
            padding: '0',
            color: '#666',
          },
          children: ['×'],
          events: {
            click: (e) => {
              e.preventDefault();
              closeModal();
            },
          },
        });
        
        header.appendChild(closeButton);
      }
      
      modal.appendChild(header);
    }
    
    // Create modal body
    const body = createElement('div', {
      className: 'modal-body',
      style: {
        padding: '15px',
      },
    });
    
    if (typeof content === 'string') {
      body.innerHTML = content;
    } else {
      body.appendChild(content);
    }
    
    modal.appendChild(body);
    overlay.appendChild(modal);
    
    // Close function
    const closeModal = () => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
        if (onClose) onClose();
      }
    };
    
    // Close when clicking on the overlay if closable
    if (closable) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          closeModal();
        }
      });
      
      // Close on Escape key
      document.addEventListener('keydown', function escapeHandler(e) {
        if (e.key === 'Escape') {
          closeModal();
          document.removeEventListener('keydown', escapeHandler);
        }
      });
    }
    
    return {
      modal: overlay,
      open: () => document.body.appendChild(overlay),
      close: closeModal,
    };
  };
  
  /**
   * [BrowserGUI] Creates a toast notification
   */
  export const createToast = (
    message: string,
    options: {
      type?: 'info' | 'success' | 'warning' | 'error';
      duration?: number;
      position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
      onClose?: () => void;
    } = {}
  ): {
    toast: HTMLDivElement;
    show: () => void;
    hide: () => void;
  } => {
    const { 
      type = 'info', 
      duration = 3000, 
      position = 'top-right', 
      onClose 
    } = options;
    
    // Get or create toast container
    let container = document.getElementById('toast-container');
    
    if (!container) {
      container = createElement('div', {
        id: 'toast-container',
        style: {
          position: 'fixed',
          zIndex: '10000',
          maxWidth: '100%',
        },
      });
      
      document.body.appendChild(container);
    }
    
    // Set container position
    switch (position) {
      case 'top-left':
        Object.assign(container.style, {
          top: '20px',
          left: '20px',
        });
        break;
      case 'top-center':
        Object.assign(container.style, {
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
        });
        break;
      case 'bottom-right':
        Object.assign(container.style, {
          bottom: '20px',
          right: '20px',
        });
        break;
      case 'bottom-left':
        Object.assign(container.style, {
          bottom: '20px',
          left: '20px',
        });
        break;
      case 'bottom-center':
        Object.assign(container.style, {
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
        });
        break;
      default: // top-right
        Object.assign(container.style, {
          top: '20px',
          right: '20px',
        });
    }
    
    // Get color based on type
    let backgroundColor = '#2196F3'; // info (blue)
    let textColor = '#fff';
    
    switch (type) {
      case 'success':
        backgroundColor = '#4CAF50'; // green
        break;
      case 'warning':
        backgroundColor = '#FF9800'; // orange
        break;
      case 'error':
        backgroundColor = '#F44336'; // red
        break;
    }
    
    // Create toast element
    const toast = createElement('div', {
      className: `toast toast-${type}`,
      style: {
        backgroundColor,
        color: textColor,
        padding: '12px 16px',
        borderRadius: '4px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
        marginBottom: '10px',
        minWidth: '250px',
        maxWidth: '350px',
        opacity: '0',
        transition: 'opacity 0.3s ease-in-out',
        position: 'relative',
      },
      children: [message],
    });
    
    // Create close button
    const closeButton = createElement('button', {
      className: 'toast-close',
      style: {
        position: 'absolute',
        top: '5px',
        right: '5px',
        background: 'none',
        border: 'none',
        color: 'inherit',
        fontSize: '18px',
        cursor: 'pointer',
        padding: '0',
        opacity: '0.7',
      },
      children: ['×'],
      events: {
        click: () => hideToast(),
      },
    });
    
    toast.appendChild(closeButton);
    
    let timeoutId: number;
    
    // Show function
    const showToast = () => {
      container!.appendChild(toast);
      
      // Trigger a reflow before changing opacity to ensure transition happens
      void toast.offsetWidth;
      
      toast.style.opacity = '1';
      
      if (duration > 0) {
        timeoutId = window.setTimeout(() => {
          hideToast();
        }, duration);
      }
    };
    
    // Hide function
    const hideToast = () => {
      clearTimeout(timeoutId);
      
      toast.style.opacity = '0';
      
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
          
          if (onClose) {
            onClose();
          }
        }
      }, 300); // Match the transition duration
    };
    
    return {
      toast,
      show: showToast,
      hide: hideToast,
    };
  };
  
  /**
   * [BrowserGUI] Creates a tooltip
   */
  export const createTooltip = (
    target: HTMLElement,
    content: string,
    options: {
      position?: 'top' | 'bottom' | 'left' | 'right';
      className?: string;
      showDelay?: number;
      hideDelay?: number;
    } = {}
  ): {
    show: () => void;
    hide: () => void;
    destroy: () => void;
  } => {
    const {
      position = 'top',
      className = '',
      showDelay = 300,
      hideDelay = 100,
    } = options;
    
    let tooltip: HTMLDivElement | null = null;
    let showTimeoutId: number | null = null;
    let hideTimeoutId: number | null = null;
    
    // Create the tooltip element
    const createTooltipElement = () => {
      const tooltipEl = createElement('div', {
        className: `tooltip ${className}`,
        style: {
          position: 'absolute',
          zIndex: '9999',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: '#fff',
          padding: '6px 10px',
          borderRadius: '4px',
          fontSize: '14px',
          maxWidth: '200px',
          pointerEvents: 'none',
          opacity: '0',
          transition: 'opacity 0.2s ease-in-out',
        },
        children: [content],
      });
      
      // Add arrow element
      const arrow = createElement('div', {
        className: 'tooltip-arrow',
        style: {
          position: 'absolute',
          width: '0',
          height: '0',
          borderStyle: 'solid',
        },
      });
      
      tooltipEl.appendChild(arrow);
      document.body.appendChild(tooltipEl);
      
      return tooltipEl;
    };
    
    // Position the tooltip
    const positionTooltip = () => {
      if (!tooltip) return;
      
      const targetRect = target.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      let top = 0;
      let left = 0;
      
      const arrow = tooltip.querySelector('.tooltip-arrow') as HTMLElement;
      
      switch (position) {
        case 'top':
          top = targetRect.top + scrollTop - tooltipRect.height - 8;
          left = targetRect.left + scrollLeft + (targetRect.width / 2) - (tooltipRect.width / 2);
          
          if (arrow) {
            arrow.style.left = '50%';
            arrow.style.bottom = '-5px';
            arrow.style.marginLeft = '-5px';
            arrow.style.borderWidth = '5px 5px 0 5px';
            arrow.style.borderColor = 'rgba(0, 0, 0, 0.8) transparent transparent transparent';
          }
          break;
        
        case 'bottom':
          top = targetRect.bottom + scrollTop + 8;
          left = targetRect.left + scrollLeft + (targetRect.width / 2) - (tooltipRect.width / 2);
          
          if (arrow) {
            arrow.style.left = '50%';
            arrow.style.top = '-5px';
            arrow.style.marginLeft = '-5px';
            arrow.style.borderWidth = '0 5px 5px 5px';
            arrow.style.borderColor = 'transparent transparent rgba(0, 0, 0, 0.8) transparent';
          }
          break;
        
        case 'left':
          top = targetRect.top + scrollTop + (targetRect.height / 2) - (tooltipRect.height / 2);
          left = targetRect.left + scrollLeft - tooltipRect.width - 8;
          
          if (arrow) {
            arrow.style.top = '50%';
            arrow.style.right = '-5px';
            arrow.style.marginTop = '-5px';
            arrow.style.borderWidth = '5px 0 5px 5px';
            arrow.style.borderColor = 'transparent transparent transparent rgba(0, 0, 0, 0.8)';
          }
          break;
        
        case 'right':
          top = targetRect.top + scrollTop + (targetRect.height / 2) - (tooltipRect.height / 2);
          left = targetRect.right + scrollLeft + 8;
          
          if (arrow) {
            arrow.style.top = '50%';
            arrow.style.left = '-5px';
            arrow.style.marginTop = '-5px';
            arrow.style.borderWidth = '5px 5px 5px 0';
            arrow.style.borderColor = 'transparent rgba(0, 0, 0, 0.8) transparent transparent';
          }
          break;
      }
      
      // Ensure tooltip stays within viewport
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      if (left < 10) left = 10;
      if (left + tooltipRect.width > viewportWidth - 10) {
        left = viewportWidth - tooltipRect.width - 10;
      }
      
      if (top < 10) top = 10;
      if (top + tooltipRect.height > viewportHeight - 10) {
        top = viewportHeight - tooltipRect.height - 10;
      }
      
      tooltip.style.top = `${top}px`;
      tooltip.style.left = `${left}px`;
    };
    
    // Show the tooltip
    const showTooltip = () => {
      if (showTimeoutId) {
        clearTimeout(showTimeoutId);
      }
      
      if (hideTimeoutId) {
        clearTimeout(hideTimeoutId);
        hideTimeoutId = null;
      }
      
      showTimeoutId = window.setTimeout(() => {
        if (!tooltip) {
          tooltip = createTooltipElement();
        }
        
        positionTooltip();
        tooltip.style.opacity = '1';
        
        showTimeoutId = null;
      }, showDelay);
    };
    
    // Hide the tooltip
    const hideTooltip = () => {
      if (showTimeoutId) {
        clearTimeout(showTimeoutId);
        showTimeoutId = null;
      }
      
      if (hideTimeoutId) {
        clearTimeout(hideTimeoutId);
      }
      
      hideTimeoutId = window.setTimeout(() => {
        if (tooltip) {
          tooltip.style.opacity = '0';
          
          setTimeout(() => {
            if (tooltip && tooltip.parentNode) {
              tooltip.parentNode.removeChild(tooltip);
              tooltip = null;
            }
          }, 200); // Match the transition duration
        }
        
        hideTimeoutId = null;
      }, hideDelay);
    };
    
    // Setup event listeners
    target.addEventListener('mouseenter', showTooltip);
    target.addEventListener('mouseleave', hideTooltip);
    target.addEventListener('focus', showTooltip);
    target.addEventListener('blur', hideTooltip);
    
    // Cleanup function
    const destroy = () => {
      target.removeEventListener('mouseenter', showTooltip);
      target.removeEventListener('mouseleave', hideTooltip);
      target.removeEventListener('focus', showTooltip);
      target.removeEventListener('blur', hideTooltip);
      
      if (showTimeoutId) {
        clearTimeout(showTimeoutId);
      }
      
      if (hideTimeoutId) {
        clearTimeout(hideTimeoutId);
      }
      
      if (tooltip && tooltip.parentNode) {
        tooltip.parentNode.removeChild(tooltip);
        tooltip = null;
      }
    };
    
    return {
      show: () => {
        hideTooltip(); // Hide any existing tooltip first
        showTooltip();
      },
      hide: hideTooltip,
      destroy,
    };
  };
  
  /**
   * [BrowserGUI] Creates a tabbed interface
   */
  export const createTabs = (
    container: HTMLElement,
    tabs: {
      id: string;
      title: string;
      content: HTMLElement | string;
      active?: boolean;
    }[]
  ): {
    setActive: (tabId: string) => void;
    getActive: () => string;
    getTabs: () => string[];
    onTabChange: (callback: (tabId: string) => void) => void;
  } => {
    // Tab change listeners
    const tabChangeListeners: ((tabId: string) => void)[] = [];
    
    // Find active tab index
    const activeIndex = tabs.findIndex(tab => tab.active);
    let activeTabId = tabs[activeIndex !== -1 ? activeIndex : 0].id;
    
    // Create tab header container
    const tabHeader = createElement('div', {
      className: 'tabs-header',
      style: {
        display: 'flex',
        borderBottom: '1px solid #ddd',
      },
    });
    
    // Create tab content container
    const tabContent = createElement('div', {
      className: 'tabs-content',
      style: {
        padding: '20px 0',
      },
    });
    
    // Create tab headers and content
    tabs.forEach(tab => {
      // Create tab header
      const tabHeaderEl = createElement('div', {
        className: `tab-header ${tab.id === activeTabId ? 'active' : ''}`,
        attributes: {
          'data-tab-id': tab.id,
        },
        style: {
          padding: '10px 15px',
          cursor: 'pointer',
          borderBottom: tab.id === activeTabId ? '2px solid #2196F3' : '2px solid transparent',
          color: tab.id === activeTabId ? '#2196F3' : 'inherit',
          fontWeight: tab.id === activeTabId ? 'bold' : 'normal',
          transition: 'all 0.2s ease-in-out',
        },
        children: [tab.title],
        events: {
          click: () => setActiveTab(tab.id),
        },
      });
      
      tabHeader.appendChild(tabHeaderEl);
      
      // Create tab content
      const tabContentEl = createElement('div', {
        className: `tab-content ${tab.id === activeTabId ? 'active' : ''}`,
        attributes: {
          'data-tab-id': tab.id,
        },
        style: {
          display: tab.id === activeTabId ? 'block' : 'none',
        },
      });
      
      // Add content
      if (typeof tab.content === 'string') {
        tabContentEl.innerHTML = tab.content;
      } else {
        tabContentEl.appendChild(tab.content);
      }
      
      tabContent.appendChild(tabContentEl);
    });
    
    // Add tab header and content to container
    container.appendChild(tabHeader);
    container.appendChild(tabContent);
    
    // Function to set active tab
    const setActiveTab = (tabId: string) => {
      if (tabId === activeTabId) return;
      
      const oldTabId = activeTabId;
      activeTabId = tabId;
      
      // Update header styles
      const headers = tabHeader.querySelectorAll('.tab-header');
      headers.forEach(header => {
        const headerTabId = header.getAttribute('data-tab-id');
        
        if (headerTabId === tabId) {
          header.classList.add('active');
          (header as HTMLElement).style.borderBottom = '2px solid #2196F3';
          (header as HTMLElement).style.color = '#2196F3';
          (header as HTMLElement).style.fontWeight = 'bold';
        } else {
          header.classList.remove('active');
          (header as HTMLElement).style.borderBottom = '2px solid transparent';
          (header as HTMLElement).style.color = 'inherit';
          (header as HTMLElement).style.fontWeight = 'normal';
        }
      });
      
      // Update content visibility
      const contents = tabContent.querySelectorAll('.tab-content');
      contents.forEach(content => {
        const contentTabId = content.getAttribute('data-tab-id');
        
        if (contentTabId === tabId) {
          content.classList.add('active');
          (content as HTMLElement).style.display = 'block';
        } else {
          content.classList.remove('active');
          (content as HTMLElement).style.display = 'none';
        }
      });
      
      // Notify listeners
      tabChangeListeners.forEach(listener => listener(tabId));
    };
    
    return {
      setActive: setActiveTab,
      getActive: () => activeTabId,
      getTabs: () => tabs.map(tab => tab.id),
      onTabChange: (callback: (tabId: string) => void) => {
        tabChangeListeners.push(callback);
      },
    };
  };
  
  /**
   * [BrowserGUI] Creates a draggable element
   */
  export const makeDraggable = (
    element: HTMLElement,
    options: {
      handle?: HTMLElement;
      bounds?: HTMLElement | 'parent' | 'window';
      axis?: 'x' | 'y' | 'both';
      onDragStart?: (e: MouseEvent) => void;
      onDrag?: (e: MouseEvent, position: { x: number; y: number }) => void;
      onDragEnd?: (e: MouseEvent, position: { x: number; y: number }) => void;
    } = {}
  ): {
    enable: () => void;
    disable: () => void;
    getPosition: () => { x: number; y: number };
    setPosition: (x: number, y: number) => void;
  } => {
    const {
      handle = element,
      bounds = 'window',
      axis = 'both',
      onDragStart,
      onDrag,
      onDragEnd,
    } = options;
    
    let isDragging = false;
    let initialX = 0;
    let initialY = 0;
    let currentX = 0;
    let currentY = 0;
    let offsetX = 0;
    let offsetY = 0;
    
    let enabled = false;
    
    // Ensure element is positioned
    const computedStyle = window.getComputedStyle(element);
    
    if (computedStyle.position === 'static') {
      element.style.position = 'relative';
    }
    
    // Get current position
    currentX = parseInt(computedStyle.left, 10) || 0;
    currentY = parseInt(computedStyle.top, 10) || 0;
    
    // Start dragging
    const onMouseDown = (e: MouseEvent) => {
      if (!enabled) return;
      
      // Prevent if not primary button (left click)
      if (e.button !== 0) return;
      
      e.preventDefault();
      
      initialX = e.clientX - offsetX;
      initialY = e.clientY - offsetY;
      
      isDragging = true;
      
      if (onDragStart) {
        onDragStart(e);
      }
      
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };
    
    // Drag movement
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      e.preventDefault();
      
      // Calculate the new position
      let newX = e.clientX - initialX;
      let newY = e.clientY - initialY;
      
      // Apply axis constraint
      if (axis === 'x') {
        newY = currentY;
      } else if (axis === 'y') {
        newX = currentX;
      }
      
      // Apply boundary constraints
      if (bounds) {
        let boundingRect: DOMRect;
        
        if (bounds === 'window') {
          boundingRect = new DOMRect(
            0,
            0,
            window.innerWidth,
            window.innerHeight
          );
        } else if (bounds === 'parent') {
          boundingRect = element.parentElement!.getBoundingClientRect();
        } else {
          boundingRect = bounds.getBoundingClientRect();
        }
        
        const elemRect = element.getBoundingClientRect();
        
        // Constrain to bounds
        if (newX < boundingRect.left) {
          newX = boundingRect.left;
        } else if (newX + elemRect.width > boundingRect.right) {
          newX = boundingRect.right - elemRect.width;
        }
        
        if (newY < boundingRect.top) {
          newY = boundingRect.top;
        } else if (newY + elemRect.height > boundingRect.bottom) {
          newY = boundingRect.bottom - elemRect.height;
        }
      }
      
      // Update position
      offsetX = newX - currentX;
      offsetY = newY - currentY;
      
      // Apply transform for smoother animation
      element.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
      
      if (onDrag) {
        onDrag(e, { x: newX, y: newY });
      }
    };
    
    // End dragging
    const onMouseUp = (e: MouseEvent) => {
      if (!isDragging) return;
      
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      
      // Update the actual position
      currentX = currentX + offsetX;
      currentY = currentY + offsetY;
      
      // Reset transform
      element.style.transform = '';
      element.style.left = `${currentX}px`;
      element.style.top = `${currentY}px`;
      
      // Reset offset
      offsetX = 0;
      offsetY = 0;
      
      isDragging = false;
      
      if (onDragEnd) {
        onDragEnd(e, { x: currentX, y: currentY });
      }
    };
    
    // Enable dragging
    const enable = () => {
      if (enabled) return;
      
      handle.addEventListener('mousedown', onMouseDown);
      handle.style.cursor = 'move';
      enabled = true;
    };
    
    // Disable dragging
    const disable = () => {
      if (!enabled) return;
      
      handle.removeEventListener('mousedown', onMouseDown);
      handle.style.cursor = '';
      
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      
      enabled = false;
      isDragging = false;
    };
    
    // Set position
    const setPosition = (x: number, y: number) => {
      currentX = x;
      currentY = y;
      
      element.style.left = `${x}px`;
      element.style.top = `${y}px`;
    };
    
    // Get position
    const getPosition = () => ({
      x: currentX,
      y: currentY,
    });
    
    // Enable by default
    enable();
    
    return {
      enable,
      disable,
      getPosition,
      setPosition,
    };
  };
  
  /**
   * [BrowserGUI] Creates a resizable element
   */
  export const makeResizable = (
    element: HTMLElement,
    options: {
      minWidth?: number;
      minHeight?: number;
      maxWidth?: number;
      maxHeight?: number;
      handles?: ('n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw')[];
      onResizeStart?: (e: MouseEvent) => void;
      onResize?: (e: MouseEvent, size: { width: number; height: number }) => void;
      onResizeEnd?: (e: MouseEvent, size: { width: number; height: number }) => void;
    } = {}
  ): {
    enable: () => void;
    disable: () => void;
    getSize: () => { width: number; height: number };
    setSize: (width: number, height: number) => void;
  } => {
    const {
      minWidth = 50,
      minHeight = 50,
      maxWidth = Infinity,
      maxHeight = Infinity,
      handles = ['se'],
      onResizeStart,
      onResize,
      onResizeEnd,
    } = options;
    
    const computedStyle = window.getComputedStyle(element);
    
    // Ensure element is positioned
    if (computedStyle.position === 'static') {
      element.style.position = 'relative';
    }
    
    // Get current size
    let currentWidth = parseInt(computedStyle.width, 10) || element.clientWidth;
    let currentHeight = parseInt(computedStyle.height, 10) || element.clientHeight;
    
    // Set initial size
    element.style.width = `${currentWidth}px`;
    element.style.height = `${currentHeight}px`;
    
    // Create resize handles
    const handleElements: Record<string, HTMLElement> = {};
    
    handles.forEach(handle => {
      const handleEl = createElement('div', {
        className: `resize-handle resize-handle-${handle}`,
        style: {
          position: 'absolute',
          width: '10px',
          height: '10px',
          background: 'transparent',
        },
      });
      
      // Position the handle
      switch (handle) {
        case 'n':
          handleEl.style.top = '-5px';
          handleEl.style.left = '50%';
          handleEl.style.marginLeft = '-5px';
          handleEl.style.width = '10px';
          handleEl.style.height = '10px';
          handleEl.style.cursor = 'ns-resize';
          break;
        case 's':
          handleEl.style.bottom = '-5px';
          handleEl.style.left = '50%';
          handleEl.style.marginLeft = '-5px';
          handleEl.style.width = '10px';
          handleEl.style.height = '10px';
          handleEl.style.cursor = 'ns-resize';
          break;
        case 'e':
          handleEl.style.top = '50%';
          handleEl.style.right = '-5px';
          handleEl.style.marginTop = '-5px';
          handleEl.style.width = '10px';
          handleEl.style.height = '10px';
          handleEl.style.cursor = 'ew-resize';
          break;
        case 'w':
          handleEl.style.top = '50%';
          handleEl.style.left = '-5px';
          handleEl.style.marginTop = '-5px';
          handleEl.style.width = '10px';
          handleEl.style.height = '10px';
          handleEl.style.cursor = 'ew-resize';
          break;
        case 'ne':
          handleEl.style.top = '-5px';
          handleEl.style.right = '-5px';
          handleEl.style.width = '10px';
          handleEl.style.height = '10px';
          handleEl.style.cursor = 'ne-resize';
          break;
        case 'nw':
          handleEl.style.top = '-5px';
          handleEl.style.left = '-5px';
          handleEl.style.width = '10px';
          handleEl.style.height = '10px';
          handleEl.style.cursor = 'nw-resize';
          break;
        case 'se':
          handleEl.style.bottom = '-5px';
          handleEl.style.right = '-5px';
          handleEl.style.width = '10px';
          handleEl.style.height = '10px';
          handleEl.style.cursor = 'se-resize';
          break;
        case 'sw':
          handleEl.style.bottom = '-5px';
          handleEl.style.left = '-5px';
          handleEl.style.width = '10px';
          handleEl.style.height = '10px';
          handleEl.style.cursor = 'sw-resize';
          break;
      }
      
      element.appendChild(handleEl);
      handleElements[handle] = handleEl;
    });
    
    let isResizing = false;
    let currentHandle = '';
    let startX = 0;
    let startY = 0;
    let startWidth = 0;
    let startHeight = 0;
    let startLeft = 0;
    let startTop = 0;
    
    // Start resizing
    const onMouseDown = (e: MouseEvent, handle: string) => {
      e.preventDefault();
      
      isResizing = true;
      currentHandle = handle;
      
      startX = e.clientX;
      startY = e.clientY;
      startWidth = parseInt(computedStyle.width, 10) || element.clientWidth;
      startHeight = parseInt(computedStyle.height, 10) || element.clientHeight;
      startLeft = parseInt(computedStyle.left, 10) || 0;
      startTop = parseInt(computedStyle.top, 10) || 0;
      
      if (onResizeStart) {
        onResizeStart(e);
      }
      
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };
    
    // Resize movement
    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      e.preventDefault();
      
      let newWidth = startWidth;
      let newHeight = startHeight;
      let newLeft = startLeft;
      let newTop = startTop;
      
      // Calculate new dimensions based on handle
      switch (currentHandle) {
        case 'n':
          newHeight = startHeight - (e.clientY - startY);
          newTop = startTop + (e.clientY - startY);
          break;
        case 's':
          newHeight = startHeight + (e.clientY - startY);
          break;
        case 'e':
          newWidth = startWidth + (e.clientX - startX);
          break;
        case 'w':
          newWidth = startWidth - (e.clientX - startX);
          newLeft = startLeft + (e.clientX - startX);
          break;
        case 'ne':
          newWidth = startWidth + (e.clientX - startX);
          newHeight = startHeight - (e.clientY - startY);
          newTop = startTop + (e.clientY - startY);
          break;
        case 'nw':
          newWidth = startWidth - (e.clientX - startX);
          newHeight = startHeight - (e.clientY - startY);
          newLeft = startLeft + (e.clientX - startX);
          newTop = startTop + (e.clientY - startY);
          break;
        case 'se':
          newWidth = startWidth + (e.clientX - startX);
          newHeight = startHeight + (e.clientY - startY);
          break;
        case 'sw':
          newWidth = startWidth - (e.clientX - startX);
          newHeight = startHeight + (e.clientY - startY);
          newLeft = startLeft + (e.clientX - startX);
          break;
      }
      
      // Apply constraints
      newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      newHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
      
      // Update element size and position
      element.style.width = `${newWidth}px`;
      element.style.height = `${newHeight}px`;
      
      // If the handle affects position, update it
      if (['n', 'w', 'nw', 'ne', 'sw'].includes(currentHandle)) {
        // Only update position if size hasn't hit min/max limits
        if (newWidth > minWidth && newWidth < maxWidth) {
          element.style.left = `${newLeft}px`;
        }
        
        if (newHeight > minHeight && newHeight < maxHeight) {
          element.style.top = `${newTop}px`;
        }
      }
      
      currentWidth = newWidth;
      currentHeight = newHeight;
      
      if (onResize) {
        onResize(e, { width: newWidth, height: newHeight });
      }
    };
    
    // End resizing
    const onMouseUp = (e: MouseEvent) => {
      if (!isResizing) return;
      
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      
      isResizing = false;
      
      if (onResizeEnd) {
        onResizeEnd(e, { width: currentWidth, height: currentHeight });
      }
    };
    
    // Attach event listeners to handles
    Object.entries(handleElements).forEach(([handle, el]) => {
      el.addEventListener('mousedown', (e) => onMouseDown(e, handle));
    });
    
    // Enable/disable functions
    const enable = () => {
      Object.values(handleElements).forEach(el => {
        el.style.display = 'block';
      });
    };
    
    const disable = () => {
      Object.values(handleElements).forEach(el => {
        el.style.display = 'none';
      });
    };
    
    // Get size
    const getSize = () => ({
      width: currentWidth,
      height: currentHeight,
    });
    
    // Set size
    const setSize = (width: number, height: number) => {
      currentWidth = width;
      currentHeight = height;
      
      element.style.width = `${width}px`;
      element.style.height = `${height}px`;
    };
    
    return {
      enable,
      disable,
      getSize,
      setSize,
    };
  };
  
  /**
   * [BrowserGUI] Creates an auto-complete input field
   */
  export const createAutocomplete = <T extends Record<string, any>>(
    input: HTMLInputElement,
    options: {
      data: T[];
      minLength?: number;
      maxResults?: number;
      valueKey?: keyof T;
      labelKey?: keyof T;
      delay?: number;
      filterFn?: (item: T, query: string) => boolean;
      onSelect?: (item: T) => void;
      renderItem?: (item: T) => HTMLElement;
    }
  ): {
    clear: () => void;
    destroy: () => void;
    update: (data: T[]) => void;
    setValue: (value: string) => void;
  } => {
    const {
      data,
      minLength = 1,
      maxResults = 10,
      valueKey = 'value' as keyof T,
      labelKey = 'label' as keyof T,
      delay = 300,
      filterFn,
      onSelect,
      renderItem,
    } = options;
    
    let currentData = [...data];
    let debounceTimeout: number | null = null;
    let selectedIndex = -1;
    
    // Create autocomplete container
    const container = createElement('div', {
      className: 'autocomplete-container',
      style: {
        position: 'relative',
        width: '100%',
      },
    });
    
    // Create suggestions list
    const suggestionsEl = createElement('ul', {
      className: 'autocomplete-suggestions',
      style: {
        position: 'absolute',
        top: '100%',
        left: '0',
        right: '0',
        zIndex: '9999',
        backgroundColor: '#fff',
        border: '1px solid #ddd',
        borderTop: 'none',
        maxHeight: '300px',
        overflowY: 'auto',
        padding: '0',
        margin: '0',
        listStyle: 'none',
        borderRadius: '0 0 4px 4px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        display: 'none',
      },
    });
    
    // Wrap input in container
    input.parentNode!.insertBefore(container, input);
    container.appendChild(input);
    container.appendChild(suggestionsEl);
    
    // Default filter function
    const defaultFilterFn = (item: T, query: string) => {
      const label = String(item[labelKey]);
      return label.toLowerCase().includes(query.toLowerCase());
    };
    
    // Filter and display suggestions
    const showSuggestions = () => {
      const query = input.value.trim();
      
      if (query.length < minLength) {
        suggestionsEl.style.display = 'none';
        selectedIndex = -1;
        return;
      }
      
      const filter = filterFn || defaultFilterFn;
      const filteredItems = currentData
        .filter(item => filter(item, query))
        .slice(0, maxResults);
      
      if (filteredItems.length === 0) {
        suggestionsEl.style.display = 'none';
        selectedIndex = -1;
        return;
      }
      
      suggestionsEl.innerHTML = '';
      
      filteredItems.forEach((item, index) => {
        if (renderItem) {
          const itemEl = renderItem(item);
          itemEl.className = 'autocomplete-item';
          itemEl.style.padding = '10px';
          itemEl.style.cursor = 'pointer';
          itemEl.style.borderBottom = index < filteredItems.length - 1 ? '1px solid #eee' : 'none';
          
          itemEl.addEventListener('click', () => selectItem(item));
          itemEl.addEventListener('mouseenter', () => {
            selectedIndex = index;
            highlightItem();
          });
          
          suggestionsEl.appendChild(itemEl);
        } else {
          const label = String(item[labelKey]);
          
          const itemEl = createElement('li', {
            className: 'autocomplete-item',
            style: {
              padding: '10px',
              cursor: 'pointer',
              borderBottom: index < filteredItems.length - 1 ? '1px solid #eee' : 'none',
            },
            children: [label],
            events: {
              click: () => selectItem(item),
              mouseenter: () => {
                selectedIndex = index;
                highlightItem();
              },
            },
          });
          
          suggestionsEl.appendChild(itemEl);
        }
      });
      
      suggestionsEl.style.display = 'block';
      selectedIndex = -1;
    };
    
    // Highlight selected item
    const highlightItem = () => {
      const items = suggestionsEl.querySelectorAll('.autocomplete-item');
      
      items.forEach((item, index) => {
        if (index === selectedIndex) {
          (item as HTMLElement).style.backgroundColor = '#f0f0f0';
        } else {
          (item as HTMLElement).style.backgroundColor = '';
        }
      });
    };
    
    // Select an item
    const selectItem = (item: T) => {
      input.value = String(item[valueKey]);
      suggestionsEl.style.display = 'none';
      
      if (onSelect) {
        onSelect(item);
      }
    };
    
    // Handle input change
    const onInputChange = () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
      
      debounceTimeout = window.setTimeout(() => {
        showSuggestions();
      }, delay);
    };
    
    // Handle keyboard navigation
    const onKeyDown = (e: KeyboardEvent) => {
      const items = suggestionsEl.querySelectorAll('.autocomplete-item');
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          selectedIndex = selectedIndex < items.length - 1 ? selectedIndex + 1 : 0;
          highlightItem();
          break;
        
        case 'ArrowUp':
          e.preventDefault();
          selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : items.length - 1;
          highlightItem();
          break;
        
        case 'Enter':
          if (selectedIndex >= 0 && selectedIndex < items.length) {
            e.preventDefault();
            items[selectedIndex].dispatchEvent(new MouseEvent('click'));
          }
          break;
        
        case 'Escape':
          suggestionsEl.style.display = 'none';
          selectedIndex = -1;
          break;
      }
    };
    
    // Handle click outside
    const onDocumentClick = (e: MouseEvent) => {
      if (!container.contains(e.target as Node)) {
        suggestionsEl.style.display = 'none';
      }
    };
    
    // Add event listeners
    input.addEventListener('input', onInputChange);
    input.addEventListener('focus', onInputChange);
    input.addEventListener('keydown', onKeyDown);
    document.addEventListener('click', onDocumentClick);
    
    return {
      clear: () => {
        input.value = '';
        suggestionsEl.style.display = 'none';
      },
      destroy: () => {
        input.removeEventListener('input', onInputChange);
        input.removeEventListener('focus', onInputChange);
        input.removeEventListener('keydown', onKeyDown);
        document.removeEventListener('click', onDocumentClick);
        
        // Remove the container and restore the input to its original place
        if (container.parentNode) {
          container.parentNode.insertBefore(input, container);
          container.parentNode.removeChild(container);
        }
      },
      update: (newData: T[]) => {
        currentData = [...newData];
        if (input === document.activeElement) {
          showSuggestions();
        }
      },
      setValue: (value: string) => {
        input.value = value;
      },
    };
  };
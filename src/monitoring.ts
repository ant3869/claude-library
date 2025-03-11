
  // ===================================================
  // SYSTEM MONITORING
  // ===================================================
  
  /**
   * [Monitoring] Interface for monitoring metrics
   */
  export interface MonitoringMetrics {
    timestamp: number;
    cpu?: {
      usage: number; // percentage
      temperature?: number; // celsius
    };
    memory?: {
      used: number; // bytes
      free: number; // bytes
      total: number; // bytes
      usagePercent: number; // percentage
    };
    gpu?: {
      usage?: number; // percentage
      memoryUsed?: number; // bytes
      temperature?: number; // celsius
    };
    network?: {
      bytesReceived: number; // bytes since last reading
      bytesSent: number; // bytes since last reading
      totalReceived: number; // total bytes received
      totalSent: number; // total bytes sent
    };
    storage?: {
      read: number; // bytes since last reading
      write: number; // bytes since last reading
      totalRead: number; // total bytes read
      totalWrite: number; // total bytes written
    };
  }
  
  /**
   * [Monitoring] Basic browser-based performance monitor
   */
  export class BrowserPerformanceMonitor {
    private readonly metrics: MonitoringMetrics[] = [];
    private readonly maxDataPoints: number;
    private readonly updateIntervalMs: number;
    private readonly onUpdate: (metrics: MonitoringMetrics) => void;
    private intervalId: number | null = null;
    private lastNetworkStats: {
      bytesReceived?: number;
      bytesSent?: number;
    } = {};
    
    constructor(options: {
      maxDataPoints?: number;
      updateIntervalMs?: number;
      onUpdate?: (metrics: MonitoringMetrics) => void;
    } = {}) {
      this.maxDataPoints = options.maxDataPoints || 100;
      this.updateIntervalMs = options.updateIntervalMs || 1000;
      this.onUpdate = options.onUpdate || (() => {});
    }
    
    /**
     * Start monitoring
     */
    start(): void {
      if (this.intervalId !== null) {
        return;
      }
      
      this.intervalId = window.setInterval(() => {
        this.updateMetrics();
      }, this.updateIntervalMs);
      
      // Initial update
      this.updateMetrics();
    }
    
    /**
     * Stop monitoring
     */
    stop(): void {
      if (this.intervalId !== null) {
        window.clearInterval(this.intervalId);
        this.intervalId = null;
      }
    }
    
    /**
     * Get all collected metrics
     */
    getMetrics(): MonitoringMetrics[] {
      return [...this.metrics];
    }
    
    /**
     * Clear all collected metrics
     */
    clearMetrics(): void {
      this.metrics.length = 0;
    }
    
    /**
     * Update metrics with current values
     */
    private async updateMetrics(): Promise<void> {
      const metrics: MonitoringMetrics = {
        timestamp: Date.now(),
      };
      
      // Memory metrics (available in browsers)
      if (performance && (performance as any).memory) {
        const mem = (performance as any).memory;
        
        metrics.memory = {
          // Convert from bytes to bytes for consistency with other metrics
          used: mem.usedJSHeapSize,
          total: mem.jsHeapSizeLimit,
          free: mem.jsHeapSizeLimit - mem.usedJSHeapSize,
          usagePercent: (mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100,
        };
      }
      
      // Network metrics (if available)
      if ((navigator as any).connection) {
        const conn = (navigator as any).connection;
        
        // Some browsers expose bytesReceived and bytesSent
        if (typeof conn.bytesReceived === 'number' && typeof conn.bytesSent === 'number') {
          const bytesReceived = conn.bytesReceived;
          const bytesSent = conn.bytesSent;
          
          metrics.network = {
            bytesReceived: this.lastNetworkStats.bytesReceived !== undefined
              ? bytesReceived - this.lastNetworkStats.bytesReceived
              : 0,
            bytesSent: this.lastNetworkStats.bytesSent !== undefined
              ? bytesSent - this.lastNetworkStats.bytesSent
              : 0,
            totalReceived: bytesReceived,
            totalSent: bytesSent,
          };
          
          this.lastNetworkStats = {
            bytesReceived,
            bytesSent,
          };
        }
      }
      
      // Add to metrics array
      this.metrics.push(metrics);
      
      // Limit the number of data points
      if (this.metrics.length > this.maxDataPoints) {
        this.metrics.shift();
      }
      
      // Call the update callback
      this.onUpdate(metrics);
    }
    
    /**
     * Export metrics to JSON
     */
    exportMetrics(): string {
      return JSON.stringify(this.metrics);
    }
    
    /**
     * Import metrics from JSON
     */
    importMetrics(json: string): void {
      try {
        const data = JSON.parse(json) as MonitoringMetrics[];
        this.metrics.length = 0;
        this.metrics.push(...data);
      } catch (error) {
        console.error('Failed to import metrics:', error);
      }
    }
  }
  
  /**
   * [Monitoring] Performance metrics analyzer
   */
  export class PerformanceAnalyzer {
    /**
     * Calculate average metrics over a time period
     */
    calculateAverages(metrics: MonitoringMetrics[], options: {
      startTime?: number;
      endTime?: number;
    } = {}): {
      cpu?: { avgUsage: number; avgTemperature?: number };
      memory?: { avgUsage: number; avgFree: number; avgTotal: number };
      gpu?: { avgUsage?: number; avgMemoryUsed?: number; avgTemperature?: number };
      network?: { avgBytesReceived: number; avgBytesSent: number };
      storage?: { avgRead: number; avgWrite: number };
    } {
      const { startTime, endTime } = options;
      
      // Filter metrics by time range if specified
      const filteredMetrics = metrics.filter(m => {
        if (startTime !== undefined && m.timestamp < startTime) return false;
        if (endTime !== undefined && m.timestamp > endTime) return false;
        return true;
      });
      
      if (filteredMetrics.length === 0) {
        return {};
      }
      
      const result: any = {};
      
      // Calculate CPU averages
      if (filteredMetrics.some(m => m.cpu)) {
        const cpuMetrics = filteredMetrics.filter(m => m.cpu);
        const usageSum = cpuMetrics.reduce((sum, m) => sum + (m.cpu?.usage || 0), 0);
        const tempSum = cpuMetrics.reduce((sum, m) => sum + (m.cpu?.temperature || 0), 0);
        const tempCount = cpuMetrics.filter(m => m.cpu?.temperature !== undefined).length;
        
        result.cpu = {
          avgUsage: usageSum / cpuMetrics.length,
        };
        
        if (tempCount > 0) {
          result.cpu.avgTemperature = tempSum / tempCount;
        }
      }
      
      // Calculate memory averages
      if (filteredMetrics.some(m => m.memory)) {
        const memMetrics = filteredMetrics.filter(m => m.memory);
        const usageSum = memMetrics.reduce((sum, m) => sum + (m.memory?.usagePercent || 0), 0);
        const freeSum = memMetrics.reduce((sum, m) => sum + (m.memory?.free || 0), 0);
        const totalSum = memMetrics.reduce((sum, m) => sum + (m.memory?.total || 0), 0);
        
        result.memory = {
          avgUsage: usageSum / memMetrics.length,
          avgFree: freeSum / memMetrics.length,
          avgTotal: totalSum / memMetrics.length,
        };
      }
      
      // Calculate GPU averages
      if (filteredMetrics.some(m => m.gpu)) {
        const gpuMetrics = filteredMetrics.filter(m => m.gpu);
        const usageCount = gpuMetrics.filter(m => m.gpu?.usage !== undefined).length;
        const memCount = gpuMetrics.filter(m => m.gpu?.memoryUsed !== undefined).length;
        const tempCount = gpuMetrics.filter(m => m.gpu?.temperature !== undefined).length;
        
        result.gpu = {};
        
        if (usageCount > 0) {
          const usageSum = gpuMetrics.reduce((sum, m) => sum + (m.gpu?.usage || 0), 0);
          result.gpu.avgUsage = usageSum / usageCount;
        }
        
        if (memCount > 0) {
          const memSum = gpuMetrics.reduce((sum, m) => sum + (m.gpu?.memoryUsed || 0), 0);
          result.gpu.avgMemoryUsed = memSum / memCount;
        }
        
        if (tempCount > 0) {
          const tempSum = gpuMetrics.reduce((sum, m) => sum + (m.gpu?.temperature || 0), 0);
          result.gpu.avgTemperature = tempSum / tempCount;
        }
      }
      
      // Calculate network averages
      if (filteredMetrics.some(m => m.network)) {
        const netMetrics = filteredMetrics.filter(m => m.network);
        const recvSum = netMetrics.reduce((sum, m) => sum + (m.network?.bytesReceived || 0), 0);
        const sentSum = netMetrics.reduce((sum, m) => sum + (m.network?.bytesSent || 0), 0);
        
        result.network = {
          avgBytesReceived: recvSum / netMetrics.length,
          avgBytesSent: sentSum / netMetrics.length,
        };
      }
      
      // Calculate storage averages
      if (filteredMetrics.some(m => m.storage)) {
        const storageMetrics = filteredMetrics.filter(m => m.storage);
        const readSum = storageMetrics.reduce((sum, m) => sum + (m.storage?.read || 0), 0);
        const writeSum = storageMetrics.reduce((sum, m) => sum + (m.storage?.write || 0), 0);
        
        result.storage = {
          avgRead: readSum / storageMetrics.length,
          avgWrite: writeSum / storageMetrics.length,
        };
      }
      
      return result;
    }
    
    /**
     * Calculate peak metrics over a time period
     */
    calculatePeaks(metrics: MonitoringMetrics[], options: {
      startTime?: number;
      endTime?: number;
    } = {}): {
      cpu?: { peakUsage: number; peakTemperature?: number };
      memory?: { peakUsage: number; peakUsed: number; lowestFree: number };
      gpu?: { peakUsage?: number; peakMemoryUsed?: number; peakTemperature?: number };
      network?: { peakBytesReceived: number; peakBytesSent: number };
      storage?: { peakRead: number; peakWrite: number };
    } {
      const { startTime, endTime } = options;
      
      // Filter metrics by time range if specified
      const filteredMetrics = metrics.filter(m => {
        if (startTime !== undefined && m.timestamp < startTime) return false;
        if (endTime !== undefined && m.timestamp > endTime) return false;
        return true;
      });
      
      if (filteredMetrics.length === 0) {
        return {};
      }
      
      const result: any = {};
      
      // Calculate CPU peaks
      if (filteredMetrics.some(m => m.cpu)) {
        const cpuMetrics = filteredMetrics.filter(m => m.cpu);
        const peakUsage = Math.max(...cpuMetrics.map(m => m.cpu?.usage || 0));
        
        result.cpu = {
          peakUsage,
        };
        
        if (cpuMetrics.some(m => m.cpu?.temperature !== undefined)) {
          const peakTemp = Math.max(...cpuMetrics
            .filter(m => m.cpu?.temperature !== undefined)
            .map(m => m.cpu?.temperature || 0));
          
          result.cpu.peakTemperature = peakTemp;
        }
      }
      
      // Calculate memory peaks
      if (filteredMetrics.some(m => m.memory)) {
        const memMetrics = filteredMetrics.filter(m => m.memory);
        const peakUsage = Math.max(...memMetrics.map(m => m.memory?.usagePercent || 0));
        const peakUsed = Math.max(...memMetrics.map(m => m.memory?.used || 0));
        const lowestFree = Math.min(...memMetrics.map(m => m.memory?.free || Infinity));
        
        result.memory = {
          peakUsage,
          peakUsed,
          lowestFree: isFinite(lowestFree) ? lowestFree : 0,
        };
      }
      
      // Calculate GPU peaks
      if (filteredMetrics.some(m => m.gpu)) {
        const gpuMetrics = filteredMetrics.filter(m => m.gpu);
        
        result.gpu = {};
        
        if (gpuMetrics.some(m => m.gpu?.usage !== undefined)) {
          const peakUsage = Math.max(...gpuMetrics
            .filter(m => m.gpu?.usage !== undefined)
            .map(m => m.gpu?.usage || 0));
          
          result.gpu.peakUsage = peakUsage;
        }
        
        if (gpuMetrics.some(m => m.gpu?.memoryUsed !== undefined)) {
          const peakMemory = Math.max(...gpuMetrics
            .filter(m => m.gpu?.memoryUsed !== undefined)
            .map(m => m.gpu?.memoryUsed || 0));
          
          result.gpu.peakMemoryUsed = peakMemory;
        }
        
        if (gpuMetrics.some(m => m.gpu?.temperature !== undefined)) {
          const peakTemp = Math.max(...gpuMetrics
            .filter(m => m.gpu?.temperature !== undefined)
            .map(m => m.gpu?.temperature || 0));
          
          result.gpu.peakTemperature = peakTemp;
        }
      }
      
      // Calculate network peaks
      if (filteredMetrics.some(m => m.network)) {
        const netMetrics = filteredMetrics.filter(m => m.network);
        const peakReceived = Math.max(...netMetrics.map(m => m.network?.bytesReceived || 0));
        const peakSent = Math.max(...netMetrics.map(m => m.network?.bytesSent || 0));
        
        result.network = {
          peakBytesReceived: peakReceived,
          peakBytesSent: peakSent,
        };
      }
      
      // Calculate storage peaks
      if (filteredMetrics.some(m => m.storage)) {
        const storageMetrics = filteredMetrics.filter(m => m.storage);
        const peakRead = Math.max(...storageMetrics.map(m => m.storage?.read || 0));
        const peakWrite = Math.max(...storageMetrics.map(m => m.storage?.write || 0));
        
        result.storage = {
          peakRead,
          peakWrite,
        };
      }
      
      return result;
    }
    
    /**
     * Generate a performance report
     */
    generateReport(metrics: MonitoringMetrics[]): string {
      if (metrics.length === 0) {
        return 'No metrics available for reporting';
      }
      
      const startTime = metrics[0].timestamp;
      const endTime = metrics[metrics.length - 1].timestamp;
      const duration = endTime - startTime;
      
      const averages = this.calculateAverages(metrics);
      const peaks = this.calculatePeaks(metrics);
      
      let report = `# Performance Report\n\n`;
      report += `Time period: ${new Date(startTime).toLocaleString()} to ${new Date(endTime).toLocaleString()}\n`;
      report += `Duration: ${this.formatDuration(duration)}\n`;
      report += `Number of data points: ${metrics.length}\n\n`;
      
      // CPU section
      if (averages.cpu || peaks.cpu) {
        report += `## CPU\n\n`;
        
        if (averages.cpu?.avgUsage !== undefined) {
          report += `Average usage: ${averages.cpu.avgUsage.toFixed(2)}%\n`;
        }
        
        if (peaks.cpu?.peakUsage !== undefined) {
          report += `Peak usage: ${peaks.cpu.peakUsage.toFixed(2)}%\n`;
        }
        
        if (averages.cpu?.avgTemperature !== undefined) {
          report += `Average temperature: ${averages.cpu.avgTemperature.toFixed(2)}°C\n`;
        }
        
        if (peaks.cpu?.peakTemperature !== undefined) {
          report += `Peak temperature: ${peaks.cpu.peakTemperature.toFixed(2)}°C\n`;
        }
        
        report += `\n`;
      }
      
      // Memory section
      if (averages.memory || peaks.memory) {
        report += `## Memory\n\n`;
        
        if (averages.memory?.avgUsage !== undefined) {
          report += `Average usage: ${averages.memory.avgUsage.toFixed(2)}%\n`;
        }
        
        if (peaks.memory?.peakUsage !== undefined) {
          report += `Peak usage: ${peaks.memory.peakUsage.toFixed(2)}%\n`;
        }
        
        if (averages.memory?.avgTotal !== undefined) {
          report += `Total memory: ${this.formatBytes(averages.memory.avgTotal)}\n`;
        }
        
        if (peaks.memory?.peakUsed !== undefined) {
          report += `Peak used memory: ${this.formatBytes(peaks.memory.peakUsed)}\n`;
        }
        
        if (peaks.memory?.lowestFree !== undefined) {
          report += `Lowest free memory: ${this.formatBytes(peaks.memory.lowestFree)}\n`;
        }
        
        report += `\n`;
      }
      
      // GPU section
      if (averages.gpu || peaks.gpu) {
        report += `## GPU\n\n`;
        
        if (averages.gpu?.avgUsage !== undefined) {
          report += `Average usage: ${averages.gpu.avgUsage.toFixed(2)}%\n`;
        }
        
        if (peaks.gpu?.peakUsage !== undefined) {
          report += `Peak usage: ${peaks.gpu.peakUsage.toFixed(2)}%\n`;
        }
        
        if (averages.gpu?.avgMemoryUsed !== undefined) {
          report += `Average memory used: ${this.formatBytes(averages.gpu.avgMemoryUsed)}\n`;
        }
        
        if (peaks.gpu?.peakMemoryUsed !== undefined) {
          report += `Peak memory used: ${this.formatBytes(peaks.gpu.peakMemoryUsed)}\n`;
        }
        
        if (averages.gpu?.avgTemperature !== undefined) {
          report += `Average temperature: ${averages.gpu.avgTemperature.toFixed(2)}°C\n`;
        }
        
        if (peaks.gpu?.peakTemperature !== undefined) {
          report += `Peak temperature: ${peaks.gpu.peakTemperature.toFixed(2)}°C\n`;
        }
        
        report += `\n`;
      }
      
      // Network section
      if (averages.network || peaks.network) {
        report += `## Network\n\n`;
        
        if (averages.network?.avgBytesReceived !== undefined) {
          report += `Average download: ${this.formatBytes(averages.network.avgBytesReceived)}/s\n`;
        }
        
        if (peaks.network?.peakBytesReceived !== undefined) {
          report += `Peak download: ${this.formatBytes(peaks.network.peakBytesReceived)}/s\n`;
        }
        
        if (averages.network?.avgBytesSent !== undefined) {
          report += `Average upload: ${this.formatBytes(averages.network.avgBytesSent)}/s\n`;
        }
        
        if (peaks.network?.peakBytesSent !== undefined) {
          report += `Peak upload: ${this.formatBytes(peaks.network.peakBytesSent)}/s\n`;
        }
        
        report += `\n`;
      }
      
      // Storage section
      if (averages.storage || peaks.storage) {
        report += `## Storage\n\n`;
        
        if (averages.storage?.avgRead !== undefined) {
          report += `Average read: ${this.formatBytes(averages.storage.avgRead)}/s\n`;
        }
        
        if (peaks.storage?.peakRead !== undefined) {
          report += `Peak read: ${this.formatBytes(peaks.storage.peakRead)}/s\n`;
        }
        
        if (averages.storage?.avgWrite !== undefined) {
          report += `Average write: ${this.formatBytes(averages.storage.avgWrite)}/s\n`;
        }
        
        if (peaks.storage?.peakWrite !== undefined) {
          report += `Peak write: ${this.formatBytes(peaks.storage.peakWrite)}/s\n`;
        }
      report += `\n`;
    }
    
    return report;
  }
  
  /**
   * Format bytes to a human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  /**
   * Format duration in milliseconds to a human-readable string
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}

/**
 * [Monitoring] System monitoring dashboard component factory
 */
export const createMonitoringDashboard = (container: HTMLElement) => {
  // Create monitor instance
  const monitor = new BrowserPerformanceMonitor({
    updateIntervalMs: 1000,
    maxDataPoints: 60,
    onUpdate: updateDashboard,
  });
  
  // Create chart containers
  const cpuChartContainer = document.createElement('div');
  cpuChartContainer.className = 'chart-container';
  
  const memoryChartContainer = document.createElement('div');
  memoryChartContainer.className = 'chart-container';
  
  const networkChartContainer = document.createElement('div');
  networkChartContainer.className = 'chart-container';
  
  // Create status elements
  const statusContainer = document.createElement('div');
  statusContainer.className = 'status-container';
  
  // Append containers to main container
  container.appendChild(statusContainer);
  container.appendChild(cpuChartContainer);
  container.appendChild(memoryChartContainer);
  container.appendChild(networkChartContainer);
  
  // Set up CSS
  const style = document.createElement('style');
  style.textContent = `
    .chart-container {
      margin-bottom: 20px;
      padding: 10px;
      border: 1px solid #ccc;
      border-radius: 4px;
      height: 200px;
    }
    
    .status-container {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
      padding: 10px;
      border: 1px solid #ccc;
      border-radius: 4px;
    }
    
    .status-item {
      text-align: center;
    }
    
    .status-value {
      font-size: 24px;
      font-weight: bold;
    }
    
    .status-label {
      font-size: 14px;
      color: #666;
    }
  `;
  document.head.appendChild(style);
  
  // Create status items
  const createStatusItem = (label: string): [HTMLElement, HTMLElement] => {
    const item = document.createElement('div');
    item.className = 'status-item';
    
    const value = document.createElement('div');
    value.className = 'status-value';
    value.textContent = '0';
    
    const labelEl = document.createElement('div');
    labelEl.className = 'status-label';
    labelEl.textContent = label;
    
    item.appendChild(value);
    item.appendChild(labelEl);
    statusContainer.appendChild(item);
    
    return [item, value];
  };
  
  // Create status displays
  const [, cpuValueEl] = createStatusItem('CPU Usage');
  const [, memoryValueEl] = createStatusItem('Memory Usage');
  const [, downloadValueEl] = createStatusItem('Download');
  const [, uploadValueEl] = createStatusItem('Upload');
  
  // Initialize charts (placeholder - would use a charting library in real implementation)
  const initChart = (container: HTMLElement, title: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    container.appendChild(canvas);
    
    const titleEl = document.createElement('h3');
    titleEl.textContent = title;
    titleEl.style.margin = '0 0 10px 0';
    container.insertBefore(titleEl, canvas);
    
    return canvas;
  };
  
  const cpuCanvas = initChart(cpuChartContainer, 'CPU Usage');
  const memoryCanvas = initChart(memoryChartContainer, 'Memory Usage');
  const networkCanvas = initChart(networkChartContainer, 'Network Activity');
  
  // Simple drawing function for demo purposes
  const drawLineChart = (
    canvas: HTMLCanvasElement,
    data: number[],
    maxValue: number,
    color: string
  ) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw grid
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 1;
    
    for (let i = 0; i < 5; i++) {
      const y = height - (height / 5) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      
      // Draw grid labels
      ctx.fillStyle = '#999';
      ctx.font = '10px Arial';
      ctx.fillText(`${Math.round((maxValue / 5) * i)}`, 5, y - 5);
    }
    
    // Draw data line
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    for (let i = 0; i < data.length; i++) {
      const x = (width / data.length) * i;
      const y = height - (height * (data[i] / maxValue));
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    
    ctx.stroke();
  };
  
  // Data arrays for charts
  const cpuData: number[] = Array(60).fill(0);
  const memoryData: number[] = Array(60).fill(0);
  const downloadData: number[] = Array(60).fill(0);
  const uploadData: number[] = Array(60).fill(0);
  
  // Update the dashboard with new metrics
  function updateDashboard(metrics: MonitoringMetrics): void {
    // Update status displays
    if (metrics.cpu?.usage !== undefined) {
      cpuValueEl.textContent = `${metrics.cpu.usage.toFixed(1)}%`;
      cpuData.push(metrics.cpu.usage);
      cpuData.shift();
    }
    
    if (metrics.memory?.usagePercent !== undefined) {
      memoryValueEl.textContent = `${metrics.memory.usagePercent.toFixed(1)}%`;
      memoryData.push(metrics.memory.usagePercent);
      memoryData.shift();
    }
    
    if (metrics.network?.bytesReceived !== undefined) {
      const downloadMbps = (metrics.network.bytesReceived * 8) / (1000 * 1000);
      downloadValueEl.textContent = `${downloadMbps.toFixed(2)} Mbps`;
      downloadData.push(downloadMbps);
      downloadData.shift();
    }
    
    if (metrics.network?.bytesSent !== undefined) {
      const uploadMbps = (metrics.network.bytesSent * 8) / (1000 * 1000);
      uploadValueEl.textContent = `${uploadMbps.toFixed(2)} Mbps`;
      uploadData.push(uploadMbps);
      uploadData.shift();
    }
    
    // Update charts
    drawLineChart(cpuCanvas, cpuData, 100, '#ff6384');
    drawLineChart(memoryCanvas, memoryData, 100, '#36a2eb');
    
    // For network chart, draw both download and upload
    const networkCtx = networkCanvas.getContext('2d');
    if (networkCtx) {
      const width = networkCanvas.width;
      const height = networkCanvas.height;
      
      // Find max value for scaling
      const maxNetworkValue = Math.max(
        20, // Minimum scale
        Math.max(...downloadData, ...uploadData)
      );
      
      // Clear canvas
      networkCtx.clearRect(0, 0, width, height);
      
      // Draw grid
      networkCtx.strokeStyle = '#eee';
      networkCtx.lineWidth = 1;
      
      for (let i = 0; i < 5; i++) {
        const y = height - (height / 5) * i;
        networkCtx.beginPath();
        networkCtx.moveTo(0, y);
        networkCtx.lineTo(width, y);
        networkCtx.stroke();
        
        // Draw grid labels
        networkCtx.fillStyle = '#999';
        networkCtx.font = '10px Arial';
        networkCtx.fillText(`${Math.round((maxNetworkValue / 5) * i)} Mbps`, 5, y - 5);
      }
      
      // Draw download data
      networkCtx.strokeStyle = '#4bc0c0';
      networkCtx.lineWidth = 2;
      networkCtx.beginPath();
      
      for (let i = 0; i < downloadData.length; i++) {
        const x = (width / downloadData.length) * i;
        const y = height - (height * (downloadData[i] / maxNetworkValue));
        
        if (i === 0) {
          networkCtx.moveTo(x, y);
        } else {
          networkCtx.lineTo(x, y);
        }
      }
      
      networkCtx.stroke();
      
      // Draw upload data
      networkCtx.strokeStyle = '#ff9f40';
      networkCtx.lineWidth = 2;
      networkCtx.beginPath();
      
      for (let i = 0; i < uploadData.length; i++) {
        const x = (width / uploadData.length) * i;
        const y = height - (height * (uploadData[i] / maxNetworkValue));
        
        if (i === 0) {
          networkCtx.moveTo(x, y);
        } else {
          networkCtx.lineTo(x, y);
        }
      }
      
      networkCtx.stroke();
      
      // Add legend
      networkCtx.font = '12px Arial';
      
      networkCtx.fillStyle = '#4bc0c0';
      networkCtx.fillRect(width - 100, 10, 12, 12);
      networkCtx.fillStyle = '#000';
      networkCtx.fillText('Download', width - 80, 20);
      
      networkCtx.fillStyle = '#ff9f40';
      networkCtx.fillRect(width - 100, 30, 12, 12);
      networkCtx.fillStyle = '#000';
      networkCtx.fillText('Upload', width - 80, 40);
    }
  };
  
  // Callback has been set in the constructor; no additional assignment is needed.
  // monitor.onUpdate = updateDashboard;  // Removed: onUpdate is private and read-only
  
  // Return control object
  return {
    start: () => monitor.start(),
    stop: () => monitor.stop(),
    getMetrics: () => monitor.getMetrics(),
    clearMetrics: () => monitor.clearMetrics(),
    getAnalyzer: () => new PerformanceAnalyzer(),
  };
};

/**
 * [Monitoring] System monitoring utility for Node.js environment (requires OS module)
 */
export class NodeSystemMonitor {
  private readonly os: any; // OS module
  private readonly metrics: MonitoringMetrics[] = [];
  private readonly maxDataPoints: number;
  private readonly updateIntervalMs: number;
  private readonly onUpdate: (metrics: MonitoringMetrics) => void;
  private intervalId: NodeJS.Timeout | null = null;
  private lastNetworkStats: {
    bytesReceived: number;
    bytesSent: number;
  } | null = null;
  private lastDiskStats: {
    read: number;
    write: number;
  } | null = null;
  
  constructor(options: {
    os: any;
    maxDataPoints?: number;
    updateIntervalMs?: number;
    onUpdate?: (metrics: MonitoringMetrics) => void;
  }) {
    this.os = options.os;
    this.maxDataPoints = options.maxDataPoints || 100;
    this.updateIntervalMs = options.updateIntervalMs || 1000;
    this.onUpdate = options.onUpdate || (() => {});
  }
  
  /**
   * Start monitoring
   */
  start(): void {
    if (this.intervalId !== null) {
      return;
    }
    
    this.intervalId = setInterval(() => {
      this.updateMetrics();
    }, this.updateIntervalMs);
    
    // Initial update
    this.updateMetrics();
  }
  
  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
  
  /**
   * Get all collected metrics
   */
  getMetrics(): MonitoringMetrics[] {
    return [...this.metrics];
  }
  
  /**
   * Clear all collected metrics
   */
  clearMetrics(): void {
    this.metrics.length = 0;
  }
  
  /**
   * Update metrics with current values
   */
  private updateMetrics(): void {
    const metrics: MonitoringMetrics = {
      timestamp: Date.now(),
    };
    
    // CPU metrics
    const cpuInfo = this.os.cpus();
    const cpuLoad = this.calculateCpuLoad(cpuInfo);
    
    metrics.cpu = {
      usage: cpuLoad,
    };
    
    // Memory metrics
    const totalMem = this.os.totalmem();
    const freeMem = this.os.freemem();
    const usedMem = totalMem - freeMem;
    
    metrics.memory = {
      total: totalMem,
      free: freeMem,
      used: usedMem,
      usagePercent: (usedMem / totalMem) * 100,
    };
    
    // Network metrics (if available)
    try {
      const networkStats = this.getNetworkStats();
      
      if (networkStats) {
        if (this.lastNetworkStats) {
          metrics.network = {
            bytesReceived: networkStats.bytesReceived - this.lastNetworkStats.bytesReceived,
            bytesSent: networkStats.bytesSent - this.lastNetworkStats.bytesSent,
            totalReceived: networkStats.bytesReceived,
            totalSent: networkStats.bytesSent,
          };
        }
        
        this.lastNetworkStats = networkStats;
      }
    } catch (error) {
      console.error('Failed to get network stats:', error);
    }
    
    // Disk metrics (if available)
    try {
      const diskStats = this.getDiskStats();
      
      if (diskStats) {
        if (this.lastDiskStats) {
          metrics.storage = {
            read: diskStats.read - this.lastDiskStats.read,
            write: diskStats.write - this.lastDiskStats.write,
            totalRead: diskStats.read,
            totalWrite: diskStats.write,
          };
        }
        
        this.lastDiskStats = diskStats;
      }
    } catch (error) {
      console.error('Failed to get disk stats:', error);
    }
    
    // Add to metrics array
    this.metrics.push(metrics);
    
    // Limit the number of data points
    if (this.metrics.length > this.maxDataPoints) {
      this.metrics.shift();
    }
    
    // Call the update callback
    this.onUpdate(metrics);
  }
  
  /**
   * Calculate CPU load
   */
  private calculateCpuLoad(cpus: any[]): number {
    // For first call, we don't have previous values to compare
    if (!this._lastCpuInfo) {
      this._lastCpuInfo = cpus;
      return 0;
    }
    
    let totalUser = 0;
    let totalSys = 0;
    let totalNice = 0;
    let totalIdle = 0;
    let totalIrq = 0;
    
    for (let i = 0; i < cpus.length; i++) {
      const cpu = cpus[i];
      const lastCpu = this._lastCpuInfo[i];
      
      const userDiff = cpu.times.user - lastCpu.times.user;
      const sysDiff = cpu.times.sys - lastCpu.times.sys;
      const niceDiff = cpu.times.nice - lastCpu.times.nice;
      const idleDiff = cpu.times.idle - lastCpu.times.idle;
      const irqDiff = cpu.times.irq - lastCpu.times.irq;
      
      totalUser += userDiff;
      totalSys += sysDiff;
      totalNice += niceDiff;
      totalIdle += idleDiff;
      totalIrq += irqDiff;
    }
    
    this._lastCpuInfo = cpus;
    
    const totalTicks = totalUser + totalSys + totalNice + totalIdle + totalIrq;
    const totalLoad = totalUser + totalSys + totalNice + totalIrq;
    
    return (totalLoad / totalTicks) * 100;
  }
  
  // Store last CPU info for load calculation
  private _lastCpuInfo: any[] | null = null;
  
  /**
   * Get network statistics
   */
  private getNetworkStats(): { bytesReceived: number; bytesSent: number } | null {
    try {
      const networkInterfaces = this.os.networkInterfaces();
      let bytesReceived = 0;
      let bytesSent = 0;
      
      // This implementation depends on platform-specific methods
      // The real implementation would need to use platform-specific APIs
      // This is just a placeholder that would need to be replaced
      
      return { bytesReceived, bytesSent };
    } catch (error) {
      console.error('Error getting network stats:', error);
      return null;
    }
  }
  
  /**
   * Get disk statistics
   */
  private getDiskStats(): { read: number; write: number } | null {
    try {
      // This implementation depends on platform-specific methods
      // The real implementation would need to use platform-specific APIs
      // This is just a placeholder that would need to be replaced
      
      return { read: 0, write: 0 };
    } catch (error) {
      console.error('Error getting disk stats:', error);
      return null;
    }
  }
}
// ======================
// PC BENCHMARKING
// ======================

/**
 * [Benchmarking] System information interface
 */
export interface SystemInfo {
    cpu: {
      model: string;
      cores: number;
      threads: number;
      speed: number;
      usage: number;
      temperatures?: number[];
    };
    memory: {
      total: number;
      free: number;
      used: number;
      cached?: number;
      usagePercent: number;
    };
    gpu?: {
      model: string;
      driver: string;
      memory: {
        total: number;
        used: number;
        free: number;
      };
      temperature?: number;
      usage?: number;
    }[];
    storage: {
      devices: {
        name: string;
        model?: string;
        size: number;
        free: number;
        used: number;
        type: 'hdd' | 'ssd' | 'nvme' | 'other';
        temperature?: number;
      }[];
    };
    network: {
      interfaces: {
        name: string;
        ip: string;
        mac: string;
        speedMbps?: number;
        type: 'ethernet' | 'wifi' | 'other';
        bytesReceived: number;
        bytesSent: number;
      }[];
    };
    os: {
      name: string;
      version: string;
      arch: string;
      uptime: number;
    };
  }
  
  /**
   * [Benchmarking] Benchmark result interface
   */
  export interface BenchmarkResult {
    name: string;
    score: number;
    unit: string;
    metrics: Record<string, number>;
    metadata: {
      duration: number;
      system: Partial<SystemInfo>;
      timestamp: string;
      version: string;
    };
  }
  
  /**
   * [Benchmarking] Browser-based CPU benchmark implementation
   */
  export class CpuBenchmark {
    private readonly iterations: number;
    private readonly warmupIterations: number;
    
    constructor(options: {
      iterations?: number;
      warmupIterations?: number;
    } = {}) {
      this.iterations = options.iterations || 5;
      this.warmupIterations = options.warmupIterations || 1;
    }
    
    /**
     * Run the CPU benchmark
     */
    async run(): Promise<BenchmarkResult> {
      const startTime = performance.now();
      const systemInfo = await this.getSystemInfo();
      
      // Run benchmarks
      const results = await Promise.all([
        this.runMatrixMultiplication(),
        this.runSortingBenchmark(),
        this.runHashingBenchmark(),
        this.runCompressionBenchmark(),
      ]);
      
      // Calculate geometric mean of all results
      const scores = results.map(r => r.score);
      const geometricMean = Math.pow(scores.reduce((a, b) => a * b, 1), 1 / scores.length);
      
      // Combine metrics from all benchmarks
      const combinedMetrics: Record<string, number> = {};
      results.forEach(result => {
        Object.entries(result.metrics).forEach(([key, value]) => {
          combinedMetrics[key] = value;
        });
      });
      
      const duration = performance.now() - startTime;
      
      return {
        name: 'CPU Benchmark',
        score: Math.round(geometricMean * 100) / 100,
        unit: 'points',
        metrics: combinedMetrics,
        metadata: {
          duration,
          system: {
            cpu: systemInfo.cpu,
            os: systemInfo.os,
          },
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
      };
    }
    
    /**
     * Matrix multiplication benchmark
     */
    private async runMatrixMultiplication(): Promise<{
      score: number;
      metrics: Record<string, number>;
    }> {
      const matrixSizes = [100, 200, 300];
      const results: number[] = [];
      
      // Warm up
      for (let i = 0; i < this.warmupIterations; i++) {
        this.multiplyMatrices(50);
      }
      
      // Actual test
      for (const size of matrixSizes) {
        const times: number[] = [];
        
        for (let i = 0; i < this.iterations; i++) {
          const start = performance.now();
          this.multiplyMatrices(size);
          const end = performance.now();
          times.push(end - start);
        }
        
        // Remove highest and lowest if we have enough iterations
        if (times.length >= 4) {
          times.sort((a, b) => a - b);
          times.shift(); // Remove lowest
          times.pop();   // Remove highest
        }
        
        // Calculate average
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        results.push(1000 / avgTime); // Higher score for faster execution
      }
      
      // Calculate geometric mean
      const geometricMean = Math.pow(results.reduce((a, b) => a * b, 1), 1 / results.length);
      
      return {
        score: geometricMean,
        metrics: {
          'matrix.100': results[0],
          'matrix.200': results[1],
          'matrix.300': results[2],
        },
      };
    }
    
    /**
     * Helper function to create and multiply matrices
     */
    private multiplyMatrices(size: number): number[][] {
      const a = Array(size).fill(0).map(() => Array(size).fill(0).map(() => Math.random()));
      const b = Array(size).fill(0).map(() => Array(size).fill(0).map(() => Math.random()));
      const result = Array(size).fill(0).map(() => Array(size).fill(0));
      
      for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
          let sum = 0;
          for (let k = 0; k < size; k++) {
            sum += a[i][k] * b[k][j];
          }
          result[i][j] = sum;
        }
      }
      
      return result;
    }
    
    /**
     * Array sorting benchmark
     */
    private async runSortingBenchmark(): Promise<{
      score: number;
      metrics: Record<string, number>;
    }> {
      const arraySizes = [10000, 50000, 100000];
      const results: number[] = [];
      
      // Warm up
      for (let i = 0; i < this.warmupIterations; i++) {
        this.sortArray(5000);
      }
      
      // Actual test
      for (const size of arraySizes) {
        const times: number[] = [];
        
        for (let i = 0; i < this.iterations; i++) {
          const start = performance.now();
          this.sortArray(size);
          const end = performance.now();
          times.push(end - start);
        }
        
        // Remove highest and lowest if we have enough iterations
        if (times.length >= 4) {
          times.sort((a, b) => a - b);
          times.shift();
          times.pop();
        }
        
        // Calculate average
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        results.push(1000 / avgTime); // Higher score for faster execution
      }
      
      // Calculate geometric mean
      const geometricMean = Math.pow(results.reduce((a, b) => a * b, 1), 1 / results.length);
      
      return {
        score: geometricMean,
        metrics: {
          'sort.10k': results[0],
          'sort.50k': results[1],
          'sort.100k': results[2],
        },
      };
    }
    
    /**
     * Helper function to create and sort an array
     */
    private sortArray(size: number): number[] {
      const array = Array(size).fill(0).map(() => Math.random() * 1000);
      return array.sort((a, b) => a - b);
    }
    
    /**
     * SHA-256 hashing benchmark
     */
    private async runHashingBenchmark(): Promise<{
      score: number;
      metrics: Record<string, number>;
    }> {
      const dataSizes = [100, 1000, 10000];
      const results: number[] = [];
      
      // Check if crypto API is available
      if (!window.crypto || !window.crypto.subtle) {
        return {
          score: 0,
          metrics: {
            'hash.100': 0,
            'hash.1k': 0,
            'hash.10k': 0,
          },
        };
      }
      
      // Warm up
      for (let i = 0; i < this.warmupIterations; i++) {
        await this.hashData(50);
      }
      
      // Actual test
      for (const size of dataSizes) {
        const times: number[] = [];
        
        for (let i = 0; i < this.iterations; i++) {
          const start = performance.now();
          await this.hashData(size);
          const end = performance.now();
          times.push(end - start);
        }
        
        // Remove highest and lowest if we have enough iterations
        if (times.length >= 4) {
          times.sort((a, b) => a - b);
          times.shift();
          times.pop();
        }
        
        // Calculate average
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        results.push(1000 / avgTime); // Higher score for faster execution
      }
      
      // Calculate geometric mean
      const geometricMean = Math.pow(results.reduce((a, b) => a * b, 1), 1 / results.length);
      
      return {
        score: geometricMean,
        metrics: {
          'hash.100': results[0],
          'hash.1k': results[1],
          'hash.10k': results[2],
        },
      };
    }
    
    /**
     * Helper function to hash data
     */
    private async hashData(size: number): Promise<ArrayBuffer> {
      const data = new Uint8Array(size);
      window.crypto.getRandomValues(data);
      
      return await window.crypto.subtle.digest('SHA-256', data);
    }
    
    /**
     * Compression benchmark
     */
    private async runCompressionBenchmark(): Promise<{
      score: number;
      metrics: Record<string, number>;
    }> {
      // Since we can't use compression APIs directly in browser,
      // we'll simulate compression with a CPU-intensive task
      
      const textSizes = [1000, 10000, 100000];
      const results: number[] = [];
      
      // Warm up
      for (let i = 0; i < this.warmupIterations; i++) {
        this.simulateCompression(500);
      }
      
      // Actual test
      for (const size of textSizes) {
        const times: number[] = [];
        
        for (let i = 0; i < this.iterations; i++) {
          const start = performance.now();
          this.simulateCompression(size);
          const end = performance.now();
          times.push(end - start);
        }
        
        // Remove highest and lowest if we have enough iterations
        if (times.length >= 4) {
          times.sort((a, b) => a - b);
          times.shift();
          times.pop();
        }
        
        // Calculate average
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        results.push(1000 / avgTime); // Higher score for faster execution
      }
      
      // Calculate geometric mean
      const geometricMean = Math.pow(results.reduce((a, b) => a * b, 1), 1 / results.length);
      
      return {
        score: geometricMean,
        metrics: {
          'compress.1k': results[0],
          'compress.10k': results[1],
          'compress.100k': results[2],
        },
      };
    }
    
    /**
     * Helper function to simulate compression
     */
    private simulateCompression(size: number): object {
      const text = Array(size).fill(0).map(() => String.fromCharCode(Math.floor(Math.random() * 26) + 97)).join('');
      
      // Simple run-length encoding as compression simulation
      let compressed = '';
      let count = 1;
      let currentChar = text[0];
      
      for (let i = 1; i < text.length; i++) {
        if (text[i] === currentChar) {
          count++;
        } else {
          compressed += count + currentChar;
          currentChar = text[i];
          count = 1;
        }
      }
      
      compressed += count + currentChar;
      
      // Create histogram of characters as additional work
      const histogram: Record<string, number> = {};
      for (let i = 0; i < text.length; i++) {
        histogram[text[i]] = (histogram[text[i]] || 0) + 1;
      }
      
      return { compressed, histogram };
    }
    
    /**
     * Get system information
     */
    private async getSystemInfo(): Promise<Partial<SystemInfo>> {
      // For browser, we can only get limited information
      return {
        cpu: {
          model: 'Unknown (Browser)',
          cores: navigator.hardwareConcurrency || 1,
          threads: navigator.hardwareConcurrency || 1,
          speed: 0,
          usage: 0,
        },
        memory: {
          total: 0,
          free: 0,
          used: 0,
          usagePercent: 0,
        },
        os: {
          name: this.getBrowserInfo().name,
          version: this.getBrowserInfo().version,
          arch: navigator.platform || 'unknown',
          uptime: 0,
        },
      };
    }
    
    /**
     * Get browser information
     */
    private getBrowserInfo(): { name: string; version: string } {
      const userAgent = navigator.userAgent;
      let browserName = 'Unknown';
      let version = 'Unknown';
      
      if (/Edge/.test(userAgent)) {
        browserName = 'Edge';
        version = userAgent.match(/Edge\/([\d.]+)/)?.[1] || 'Unknown';
      } else if (/Firefox/.test(userAgent)) {
        browserName = 'Firefox';
        version = userAgent.match(/Firefox\/([\d.]+)/)?.[1] || 'Unknown';
      } else if (/Chrome/.test(userAgent)) {
        browserName = 'Chrome';
        version = userAgent.match(/Chrome\/([\d.]+)/)?.[1] || 'Unknown';
      } else if (/Safari/.test(userAgent)) {
        browserName = 'Safari';
        version = userAgent.match(/Version\/([\d.]+)/)?.[1] || 'Unknown';
      } else if (/MSIE|Trident/.test(userAgent)) {
        browserName = 'Internet Explorer';
        version = userAgent.match(/(?:MSIE |rv:)([\d.]+)/)?.[1] || 'Unknown';
      }
      
      return { name: browserName, version };
    }
  }
  
  /**
   * [Benchmarking] Browser-based GPU benchmark implementation
   */
  export class GpuBenchmark {
    private readonly canvas: HTMLCanvasElement;
    private readonly gl: WebGLRenderingContext | null;
    private readonly iterations: number;
    
    constructor(options: {
      canvas?: HTMLCanvasElement;
      iterations?: number;
    } = {}) {
      this.canvas = options.canvas || document.createElement('canvas');
      this.canvas.width = 1024;
      this.canvas.height = 1024;
      this.gl = this.canvas.getContext('webgl');
      this.iterations = options.iterations || 5;
    }
    
    /**
     * Run the GPU benchmark
     */
    async run(): Promise<BenchmarkResult> {
      const startTime = performance.now();
      
      if (!this.gl) {
        return {
          name: 'GPU Benchmark',
          score: 0,
          unit: 'points',
          metrics: {},
          metadata: {
            duration: 0,
            system: {},
            timestamp: new Date().toISOString(),
            version: '1.0.0',
          },
        };
      }
      
      const systemInfo = this.getGpuInfo();
      
      // Run benchmarks
      const results = await Promise.all([
        this.runFillRateBenchmark(),
        this.runShaderBenchmark(),
        this.runTextureUploadBenchmark(),
      ]);
      
      // Calculate geometric mean of all results
      const scores = results.map(r => r.score);
      const geometricMean = Math.pow(scores.reduce((a, b) => a * b, 1), 1 / scores.length);
      
      // Combine metrics from all benchmarks
      const combinedMetrics: Record<string, number> = {};
      results.forEach(result => {
        Object.entries(result.metrics).forEach(([key, value]) => {
          combinedMetrics[key] = value;
        });
      });
      
      const duration = performance.now() - startTime;
      
      return {
        name: 'GPU Benchmark',
        score: Math.round(geometricMean * 100) / 100,
        unit: 'points',
        metrics: combinedMetrics,
        metadata: {
          duration,
          system: {
            gpu: [{
              model: systemInfo.model || 'Unknown',
              driver: systemInfo.driver || 'Unknown',
              memory: systemInfo.memory || { total: 0, used: 0, free: 0 },
              temperature: systemInfo.temperature,
              usage: systemInfo.usage,
            }],
          },
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
      };
    }
    
    /**
     * Fill rate benchmark
     */
    private async runFillRateBenchmark(): Promise<{
      score: number;
      metrics: Record<string, number>;
    }> {
      if (!this.gl) {
        return { score: 0, metrics: {} };
      }
      
      const gl = this.gl;
      const sizes = [256, 512, 1024];
      const results: number[] = [];
      
      // Create vertex buffer for a full-screen quad
      const vertexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1,
        1, -1,
        -1, 1,
        1, 1
      ]), gl.STATIC_DRAW);
      
      // Create a simple vertex shader
      const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
      gl.shaderSource(vertexShader, `
        attribute vec2 position;
        void main() {
          gl_Position = vec4(position, 0.0, 1.0);
        }
      `);
      gl.compileShader(vertexShader);
      
      // Create a simple fragment shader
      const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;
      gl.shaderSource(fragmentShader, `
        precision mediump float;
        uniform vec4 color;
        void main() {
          gl_FragColor = color;
        }
      `);
      gl.compileShader(fragmentShader);
      
      // Create and link the program
      const program = gl.createProgram()!;
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);
      gl.useProgram(program);
      
      // Set up attributes and uniforms
      const positionLocation = gl.getAttribLocation(program, 'position');
      const colorLocation = gl.getUniformLocation(program, 'color');
      
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
      
      // Test different canvas sizes
      for (const size of sizes) {
        this.canvas.width = size;
        this.canvas.height = size;
        gl.viewport(0, 0, size, size);
        
        const frames = 100;
        const times: number[] = [];
        
        for (let iter = 0; iter < this.iterations; iter++) {
          const startTime = performance.now();
          
          for (let i = 0; i < frames; i++) {
            // Change color for each frame to avoid optimizations
            const r = Math.random();
            const g = Math.random();
            const b = Math.random();
            gl.uniform4f(colorLocation, r, g, b, 1.0);
            
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            gl.finish();
          }
          
          const endTime = performance.now();
          times.push((endTime - startTime) / frames);
        }
        
        // Remove highest and lowest if we have enough iterations
        if (times.length >= 4) {
          times.sort((a, b) => a - b);
          times.shift();
          times.pop();
        }
        
        // Calculate average time per frame
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        // Calculate frames per second
        const fps = 1000 / avgTime;
        
        results.push(fps);
      }
      
      // Calculate geometric mean
      const geometricMean = Math.pow(results.reduce((a, b) => a * b, 1), 1 / results.length);
      
      // Clean up
      gl.deleteBuffer(vertexBuffer);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      gl.deleteProgram(program);
      
      return {
        score: geometricMean / 100, // Scale down to be comparable with other benchmarks
        metrics: {
          'fillRate.256': results[0],
          'fillRate.512': results[1],
          'fillRate.1024': results[2],
        },
      };
    }
    
    /**
     * Shader computation benchmark
     */
    private async runShaderBenchmark(): Promise<{
      score: number;
      metrics: Record<string, number>;
    }> {
      if (!this.gl) {
        return { score: 0, metrics: {} };
      }
      
      const gl = this.gl;
      const complexityLevels = [10, 20, 30]; // Iterations in the fragment shader
      const results: number[] = [];
      
      // Set canvas to fixed size
      this.canvas.width = 512;
      this.canvas.height = 512;
      gl.viewport(0, 0, 512, 512);
      
      // Create vertex buffer for a full-screen quad
      const vertexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1,
        1, -1,
        -1, 1,
        1, 1
      ]), gl.STATIC_DRAW);
      
      // Create a simple vertex shader
      const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
      gl.shaderSource(vertexShader, `
        attribute vec2 position;
        varying vec2 texCoord;
        void main() {
          texCoord = position * 0.5 + 0.5;
          gl_Position = vec4(position, 0.0, 1.0);
        }
      `);
      gl.compileShader(vertexShader);
      
      for (const iterations of complexityLevels) {
        // Create a fragment shader with variable complexity
        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;
        gl.shaderSource(fragmentShader, `
          precision mediump float;
          varying vec2 texCoord;
          uniform float time;
          
          void main() {
            vec2 pos = texCoord * 2.0 - 1.0;
            vec3 color = vec3(0.0);
            float t = time * 0.1;
            
            for (int i = 0; i < ${iterations}; i++) {
              float fi = float(i) * 0.05;
              pos = vec2(
                pos.x * cos(t + fi) - pos.y * sin(t + fi),
                pos.x * sin(t + fi) + pos.y * cos(t + fi)
              );
              
              color += vec3(
                0.5 + 0.5 * sin(pos.x * 3.0 + t),
                0.5 + 0.5 * sin(pos.y * 3.0 + t + 2.0),
                0.5 + 0.5 * sin(length(pos) * 3.0 + t + 4.0)
              );
            }
            
            gl_FragColor = vec4(color / float(${iterations}), 1.0);
          }
        `);
        gl.compileShader(fragmentShader);
        
        // Create and link the program
        const program = gl.createProgram()!;
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        gl.useProgram(program);
        
        // Set up attributes and uniforms
        const positionLocation = gl.getAttribLocation(program, 'position');
        const timeLocation = gl.getUniformLocation(program, 'time');
        
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
        
        const frames = 50;
        const times: number[] = [];
        
        for (let iter = 0; iter < this.iterations; iter++) {
          const startTime = performance.now();
          
          for (let i = 0; i < frames; i++) {
            gl.uniform1f(timeLocation, i * 0.1);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            gl.finish();
          }
          
          const endTime = performance.now();
          times.push((endTime - startTime) / frames);
        }
        
        // Remove highest and lowest if we have enough iterations
        if (times.length >= 4) {
          times.sort((a, b) => a - b);
          times.shift();
          times.pop();
        }
        
        // Calculate average time per frame
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        // Calculate frames per second
        const fps = 1000 / avgTime;
        
        results.push(fps);
        
        // Clean up
        gl.deleteShader(fragmentShader);
        gl.deleteProgram(program);
      }
      
      // Calculate geometric mean
      const geometricMean = Math.pow(results.reduce((a, b) => a * b, 1), 1 / results.length);
      
      // Clean up
      gl.deleteBuffer(vertexBuffer);
      gl.deleteShader(vertexShader);
      
      return {
        score: geometricMean / 50, // Scale down to be comparable with other benchmarks
        metrics: {
          'shader.simple': results[0],
          'shader.medium': results[1],
          'shader.complex': results[2],
        },
      };
    }
    
    /**
     * Texture upload benchmark
     */
    private async runTextureUploadBenchmark(): Promise<{
      score: number;
      metrics: Record<string, number>;
    }> {
      if (!this.gl) {
        return { score: 0, metrics: {} };
      }
      
      const gl = this.gl;
      const textureSizes = [256, 512, 1024];
      const results: number[] = [];
      
      for (const size of textureSizes) {
        // Create texture data
        const textureData = new Uint8Array(size * size * 4);
        for (let i = 0; i < textureData.length; i += 4) {
          textureData[i] = Math.random() * 255;
          textureData[i + 1] = Math.random() * 255;
          textureData[i + 2] = Math.random() * 255;
          textureData[i + 3] = 255;
        }
        
        // Create texture
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        
        const uploads = 20;
        const times: number[] = [];
        
        for (let iter = 0; iter < this.iterations; iter++) {
          const startTime = performance.now();
          
          for (let i = 0; i < uploads; i++) {
            // Modify a portion of the texture data to avoid optimizations
            for (let j = 0; j < 1000; j++) {
              const idx = Math.floor(Math.random() * (textureData.length / 4)) * 4;
              textureData[idx] = Math.random() * 255;
              textureData[idx + 1] = Math.random() * 255;
              textureData[idx + 2] = Math.random() * 255;
            }
            
            gl.texImage2D(
              gl.TEXTURE_2D,
              0,
              gl.RGBA,
              size,
              size,
              0,
              gl.RGBA,
              gl.UNSIGNED_BYTE,
              textureData
            );
            
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.finish();
          }
          
          const endTime = performance.now();
          times.push((endTime - startTime) / uploads);
        }
        
        // Remove highest and lowest if we have enough iterations
        if (times.length >= 4) {
          times.sort((a, b) => a - b);
          times.shift();
          times.pop();
        }
        
        // Calculate average time per upload
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        // Calculate uploads per second
        const uploadsPerSec = 1000 / avgTime;
        
        results.push(uploadsPerSec);
        
        // Clean up
        gl.deleteTexture(texture);
      }
      
      // Calculate geometric mean
      const geometricMean = Math.pow(results.reduce((a, b) => a * b, 1), 1 / results.length);
      
      return {
        score: geometricMean / 30, // Scale down to be comparable with other benchmarks
        metrics: {
          'texture.256': results[0],
          'texture.512': results[1],
          'texture.1024': results[2],
        },
      };
    }
    
    /**
     * Get GPU information
     */
    private getGpuInfo(): Partial<NonNullable<SystemInfo['gpu']>[number]> {
      if (!this.gl) {
        return {
          model: 'Unknown (WebGL not supported)',
          driver: 'Unknown',
          memory: {
            total: 0,
            used: 0,
            free: 0,
          },
        };
      }
      
      const gl = this.gl;
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      
      let vendor = 'Unknown';
      let renderer = 'Unknown';
      
      if (debugInfo) {
        vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'Unknown';
        renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'Unknown';
      }
      
      return {
        model: renderer,
        driver: vendor,
        memory: {
          total: 0, // Not available in WebGL
          used: 0,
          free: 0,
        },
      };
    }
  }
  
  /**
   * [Benchmarking] Browser-based memory benchmark implementation
   */
  export class MemoryBenchmark {
    private readonly iterations: number;
    
    constructor(options: {
      iterations?: number;
    } = {}) {
      this.iterations = options.iterations || 5;
    }
    
    /**
     * Run the memory benchmark
     */
    async run(): Promise<BenchmarkResult> {
      const startTime = performance.now();
      
      // Run benchmarks
      const results = await Promise.all([
        this.runAllocationBenchmark(),
        this.runAccessBenchmark(),
        this.runCopyBenchmark(),
      ]);
      
      // Calculate geometric mean of all results
      const scores = results.map(r => r.score);
      const geometricMean = Math.pow(scores.reduce((a, b) => a * b, 1), 1 / scores.length);
      
      // Combine metrics from all benchmarks
      const combinedMetrics: Record<string, number> = {};
      results.forEach(result => {
        Object.entries(result.metrics).forEach(([key, value]) => {
          combinedMetrics[key] = value;
        });
      });
      
      const duration = performance.now() - startTime;
      
      return {
        name: 'Memory Benchmark',
        score: Math.round(geometricMean * 100) / 100,
        unit: 'points',
        metrics: combinedMetrics,
        metadata: {
          duration,
          system: {},
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
      };
    }
    
    /**
     * Memory allocation benchmark
     */
    private async runAllocationBenchmark(): Promise<{
      score: number;
      metrics: Record<string, number>;
    }> {
      const sizes = [1024 * 1024, 5 * 1024 * 1024, 10 * 1024 * 1024]; // 1MB, 5MB, 10MB
      const results: number[] = [];
      
      for (const size of sizes) {
        const times: number[] = [];
        
        for (let iter = 0; iter < this.iterations; iter++) {
          const startTime = performance.now();
          const count = 10;
          
          for (let i = 0; i < count; i++) {
            const array = new Uint8Array(size);
            // Do a minimal operation to prevent optimization
            array[0] = 1;
          }
          
          const endTime = performance.now();
          // Calculate time per MB
          const timePerMB = (endTime - startTime) / (size * count / (1024 * 1024));
          times.push(timePerMB);
        }
        
        // Remove highest and lowest if we have enough iterations
        if (times.length >= 4) {
          times.sort((a, b) => a - b);
          times.shift();
          times.pop();
        }
        
        // Calculate average time per MB
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        // Convert to MB per second (higher is better)
        const mbps = 1000 / avgTime;
        
        results.push(mbps);
      }
      
      // Calculate geometric mean
      const geometricMean = Math.pow(results.reduce((a, b) => a * b, 1), 1 / results.length);
      
      return {
        score: geometricMean / 200, // Scale down to be comparable with other benchmarks
        metrics: {
          'memAlloc.1MB': results[0],
          'memAlloc.5MB': results[1],
          'memAlloc.10MB': results[2],
        },
      };
    }
    
    /**
     * Memory access benchmark
     */
    private async runAccessBenchmark(): Promise<{
      score: number;
      metrics: Record<string, number>;
    }> {
      const sizes = [1024 * 1024, 5 * 1024 * 1024, 10 * 1024 * 1024]; // 1MB, 5MB, 10MB
      const results: number[] = [];
      
      for (const size of sizes) {
        // Create array once for all iterations
        const array = new Uint8Array(size);
        // Initialize with random data
        for (let i = 0; i < size; i++) {
          array[i] = Math.floor(Math.random() * 256);
        }
        
        const times: number[] = [];
        
        for (let iter = 0; iter < this.iterations; iter++) {
          const startTime = performance.now();
          let sum = 0;
          const accessCount = 1000000; // Fixed number of accesses
          
          for (let i = 0; i < accessCount; i++) {
            const idx = Math.floor(Math.random() * size);
            sum += array[idx];
          }
          
          // Prevent optimization by using the result
          if (sum === -1) console.log('This should never happen');
          
          const endTime = performance.now();
          // Calculate accesses per millisecond
          const accessesPerMs = accessCount / (endTime - startTime);
          times.push(accessesPerMs);
        }
        
        // Remove highest and lowest if we have enough iterations
        if (times.length >= 4) {
          times.sort((a, b) => a - b);
          times.shift();
          times.pop();
        }
        
        // Calculate average accesses per millisecond
        const avgAccessesPerMs = times.reduce((a, b) => a + b, 0) / times.length;
        
        results.push(avgAccessesPerMs);
      }
      
      // Calculate geometric mean
      const geometricMean = Math.pow(results.reduce((a, b) => a * b, 1), 1 / results.length);
      
      return {
        score: geometricMean / 10000, // Scale down to be comparable with other benchmarks
        metrics: {
          'memAccess.1MB': results[0],
          'memAccess.5MB': results[1],
          'memAccess.10MB': results[2],
        },
      };
    }
    
    /**
     * Memory copy benchmark
     */
    private async runCopyBenchmark(): Promise<{
      score: number;
      metrics: Record<string, number>;
    }> {
      const sizes = [1024 * 1024, 5 * 1024 * 1024, 10 * 1024 * 1024]; // 1MB, 5MB, 10MB
      const results: number[] = [];
      
      for (const size of sizes) {
        // Create source array once for all iterations
        const source = new Uint8Array(size);
        // Initialize with random data
        for (let i = 0; i < size; i++) {
          source[i] = Math.floor(Math.random() * 256);
        }
        
        const times: number[] = [];
        
        for (let iter = 0; iter < this.iterations; iter++) {
          const startTime = performance.now();
          const copyCount = 5; // Number of copies
          
          for (let i = 0; i < copyCount; i++) {
            const dest = new Uint8Array(size);
            dest.set(source);
            
            // Modify destination to prevent optimization
            dest[0] = (dest[0] + 1) % 256;
          }
          
          const endTime = performance.now();
          // Calculate MB per second
          const mbps = (size * copyCount / (1024 * 1024)) / ((endTime - startTime) / 1000);
          times.push(mbps);
        }
        
        // Remove highest and lowest if we have enough iterations
        if (times.length >= 4) {
          times.sort((a, b) => a - b);
          times.shift();
          times.pop();
        }
        
        // Calculate average MB per second
        const avgMbps = times.reduce((a, b) => a + b, 0) / times.length;
        
        results.push(avgMbps);
      }
      
      // Calculate geometric mean
      const geometricMean = Math.pow(results.reduce((a, b) => a * b, 1), 1 / results.length);
      
      return {
        score: geometricMean / 100, // Scale down to be comparable with other benchmarks
        metrics: {
          'memCopy.1MB': results[0],
          'memCopy.5MB': results[1],
          'memCopy.10MB': results[2],
        },
      };
    }
  }
  
  /**
   * [Benchmarking] Complete PC benchmark suite
   */
  export class BenchmarkSuite {
    private readonly cpuBenchmark: CpuBenchmark;
    private readonly gpuBenchmark: GpuBenchmark;
    private readonly memoryBenchmark: MemoryBenchmark;
    
    constructor(options: {
      canvas?: HTMLCanvasElement;
      iterations?: number;
    } = {}) {
      this.cpuBenchmark = new CpuBenchmark({
        iterations: options.iterations,
      });
      
      this.gpuBenchmark = new GpuBenchmark({
        canvas: options.canvas,
        iterations: options.iterations,
      });
      
      this.memoryBenchmark = new MemoryBenchmark({
        iterations: options.iterations,
      });
    }
    
    /**
     * Run the complete benchmark suite
     */
    async run(): Promise<{
      overallScore: number;
      cpu: BenchmarkResult;
      gpu: BenchmarkResult;
      memory: BenchmarkResult;
    }> {
      // Run all benchmarks
      const [cpu, gpu, memory] = await Promise.all([
        this.cpuBenchmark.run(),
        this.gpuBenchmark.run(),
        this.memoryBenchmark.run(),
      ]);
      
      // Calculate overall score (geometric mean of individual scores)
      const scores = [cpu.score, gpu.score, memory.score];
      const overallScore = Math.round(
        Math.pow(scores.reduce((a, b) => a * b, 1), 1 / scores.length) * 100
      ) / 100;
      
      return {
        overallScore,
        cpu,
        gpu,
        memory,
      };
    }
    
    /**
     * Run just the CPU benchmark
     */
    runCpuBenchmark(): Promise<BenchmarkResult> {
      return this.cpuBenchmark.run();
    }
    
    /**
     * Run just the GPU benchmark
     */
    runGpuBenchmark(): Promise<BenchmarkResult> {
      return this.gpuBenchmark.run();
    }
    
    /**
     * Run just the memory benchmark
     */
    runMemoryBenchmark(): Promise<BenchmarkResult> {
      return this.memoryBenchmark.run();
    }
  }
  
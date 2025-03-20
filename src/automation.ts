// ===================================================
// AUTOMATION
// ===================================================

/**
 * [Automation] Interface for task definition
 */
export interface AutomationTask {
    id: string;
    name: string;
    description?: string;
    execute: () => Promise<void>;
    shouldRun: () => Promise<boolean>;
    dependencies?: string[];
    retryOptions?: {
      maxRetries: number;
      delayMs: number;
      backoffFactor?: number;
    };
    timeout?: number; // milliseconds
  }
  
  /**
   * [Automation] Task execution status
   */
  export enum TaskStatus {
    PENDING = 'pending',
    RUNNING = 'running',
    COMPLETED = 'completed',
    FAILED = 'failed',
    SKIPPED = 'skipped',
    TIMEOUT = 'timeout',
  }
  
  /**
   * [Automation] Task execution result
   */
  export interface TaskResult {
    taskId: string;
    status: TaskStatus;
    startTime: number;
    endTime?: number;
    duration?: number;
    error?: Error;
    retries?: number;
  }
  
  /**
   * [Automation] Task scheduler options
   */
  export interface SchedulerOptions {
    concurrency?: number;
    continueOnError?: boolean;
    logger?: (message: string, level?: string) => void;
    onTaskStart?: (taskId: string) => void;
    onTaskComplete?: (result: TaskResult) => void;
  }
  
  /**
   * [Automation] Task scheduler for automation workflows
   */
  export class TaskScheduler {
    private tasks: Map<string, AutomationTask> = new Map();
    private concurrency: number;
    private continueOnError: boolean;
    private logger: (message: string, level?: string) => void;
    private onTaskStart?: (taskId: string) => void;
    private onTaskComplete?: (result: TaskResult) => void;
    
    constructor(options: SchedulerOptions = {}) {
      this.concurrency = options.concurrency || 1;
      this.continueOnError = options.continueOnError || false;
      this.logger = options.logger || console.log;
      this.onTaskStart = options.onTaskStart;
      this.onTaskComplete = options.onTaskComplete;
    }
    
    /**
     * Register a task with the scheduler
     */
    registerTask(task: AutomationTask): void {
      this.tasks.set(task.id, task);
    }
    
    /**
     * Register multiple tasks
     */
    registerTasks(tasks: AutomationTask[]): void {
      for (const task of tasks) {
        this.registerTask(task);
      }
    }
    
    /**
     * Unregister a task by id
     */
    unregisterTask(taskId: string): boolean {
      return this.tasks.delete(taskId);
    }
    
    /**
     * Get a task by id
     */
    getTask(taskId: string): AutomationTask | undefined {
      return this.tasks.get(taskId);
    }
    
    /**
     * Get all registered tasks
     */
    getAllTasks(): AutomationTask[] {
      return Array.from(this.tasks.values());
    }
    
    /**
     * Run a specific task by id
     */
    async runTask(taskId: string): Promise<TaskResult> {
      const task = this.tasks.get(taskId);
      
      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }
      
      // Create initial result
      const result: TaskResult = {
        taskId: task.id,
        status: TaskStatus.PENDING,
        startTime: Date.now(),
      };
      
      let shouldRun = true;
      try {
        shouldRun = await task.shouldRun();
      } catch (error) {
        this.logger(`Error checking if task should run: ${error}`, 'error');
        shouldRun = false;
      }
      
      if (!shouldRun) {
        result.status = TaskStatus.SKIPPED;
        result.endTime = Date.now();
        result.duration = result.endTime - result.startTime;
        
        this.logger(`Task ${task.name} (${task.id}) was skipped`, 'info');
        
        if (this.onTaskComplete) {
          this.onTaskComplete(result);
        }
        
        return result;
      }
      
      // Notify task start
      result.status = TaskStatus.RUNNING;
      this.logger(`Starting task: ${task.name} (${task.id})`, 'info');
      
      if (this.onTaskStart) {
        this.onTaskStart(task.id);
      }
      
      let retries = 0;
      let lastError: Error | undefined;
      
      // Execute with retries if configured
      while (true) {
        try {
          // Set up timeout if specified
          if (task.timeout) {
            await Promise.race([
              task.execute(),
              new Promise((_, reject) => {
                setTimeout(() => {
                  reject(new Error(`Task timed out after ${task.timeout}ms`));
                }, task.timeout);
              }),
            ]);
          } else {
            await task.execute();
          }
          
          // Task completed successfully
          result.status = TaskStatus.COMPLETED;
          result.endTime = Date.now();
          result.duration = result.endTime - result.startTime;
          result.retries = retries;
          
          this.logger(`Task completed: ${task.name} (${task.id})`, 'info');
          
          if (this.onTaskComplete) {
            this.onTaskComplete(result);
          }
          
          return result;
        } catch (error) {
          lastError = error as Error;
          
          // Check if we should retry
          if (task.retryOptions && retries < task.retryOptions.maxRetries) {
            retries++;
            
            const delay = task.retryOptions.backoffFactor 
              ? task.retryOptions.delayMs * Math.pow(task.retryOptions.backoffFactor, retries - 1) 
              : task.retryOptions.delayMs;
            
            this.logger(`Task failed, retrying (${retries}/${task.retryOptions.maxRetries}) after ${delay}ms: ${task.name} (${task.id})`, 'warn');
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          
          // No more retries or no retry configured
          break;
        }
      }
      
      // Task failed after all retries
      result.status = TaskStatus.FAILED;
      result.endTime = Date.now();
      result.duration = result.endTime - result.startTime;
      result.error = lastError;
      result.retries = retries;
      
      this.logger(`Task failed: ${task.name} (${task.id}) - ${lastError?.message}`, 'error');
      
      if (this.onTaskComplete) {
        this.onTaskComplete(result);
      }
      
      return result;
    }
    
    /**
     * Run all registered tasks
     */
    async runAll(): Promise<TaskResult[]> {
      const taskIds = Array.from(this.tasks.keys());
      return this.runTasksById(taskIds);
    }
    
    /**
     * Run specific tasks by their ids
     */
    async runTasksById(taskIds: string[]): Promise<TaskResult[]> {
      const results: TaskResult[] = [];
      const taskMap = this.buildDependencyMap(taskIds);
      
      // Get tasks with no dependencies
      const readyTasks = taskIds.filter(id => {
        const task = this.tasks.get(id);
        if (!task) return false;
        
        return !task.dependencies || task.dependencies.length === 0;
      });
      
      const pendingTasks = new Set(taskIds);
      const runningTasks = new Set<string>();
      const completedTasks = new Set<string>();
      const failedTasks = new Set<string>();
      
      // Process tasks until all are done
      while (pendingTasks.size > 0 || runningTasks.size > 0) {
        // Start tasks up to concurrency limit
        while (readyTasks.length > 0 && runningTasks.size < this.concurrency) {
          const taskId = readyTasks.shift()!;
          runningTasks.add(taskId);
          pendingTasks.delete(taskId);
          
          // Run task asynchronously
          this.runTask(taskId)
            .then(result => {
              results.push(result);
              runningTasks.delete(taskId);
              
              if (result.status === TaskStatus.COMPLETED) {
                completedTasks.add(taskId);
                
                // Check if dependent tasks can now run
                for (const [depTaskId, dependencies] of taskMap.entries()) {
                  if (pendingTasks.has(depTaskId) && !readyTasks.includes(depTaskId)) {
                    // Check if all dependencies are met
                    const allDependenciesMet = dependencies.every(depId => 
                      completedTasks.has(depId) || (this.continueOnError && failedTasks.has(depId))
                    );
                    
                    if (allDependenciesMet) {
                      readyTasks.push(depTaskId);
                    }
                  }
                }
              } else if (result.status === TaskStatus.FAILED) {
                failedTasks.add(taskId);
                
                if (!this.continueOnError) {
                  // Mark dependent tasks as skipped
                  for (const [depTaskId, dependencies] of taskMap.entries()) {
                    if (pendingTasks.has(depTaskId) && dependencies.includes(taskId)) {
                      pendingTasks.delete(depTaskId);
                      
                      results.push({
                        taskId: depTaskId,
                        status: TaskStatus.SKIPPED,
                        startTime: Date.now(),
                        endTime: Date.now(),
                        duration: 0,
                      });
                    }
                  }
                } else {
                  // Check if dependent tasks can now run (with continueOnError)
                  for (const [depTaskId, dependencies] of taskMap.entries()) {
                    if (pendingTasks.has(depTaskId) && !readyTasks.includes(depTaskId)) {
                      // Check if all dependencies are met
                      const allDependenciesMet = dependencies.every(depId => 
                        completedTasks.has(depId) || failedTasks.has(depId)
                      );
                      
                      if (allDependenciesMet) {
                        readyTasks.push(depTaskId);
                      }
                    }
                  }
                }
              }
            })
            .catch(error => {
              this.logger(`Error running task ${taskId}: ${error}`, 'error');
              runningTasks.delete(taskId);
              failedTasks.add(taskId);
              
              results.push({
                taskId,
                status: TaskStatus.FAILED,
                startTime: Date.now(),
                endTime: Date.now(),
                duration: 0,
                error: error as Error,
              });
            });
        }
        
        // Wait a bit before checking again
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      return results;
    }
    
    /**
     * Build a dependency map from task ids
     */
    private buildDependencyMap(taskIds: string[]): Map<string, string[]> {
      const map = new Map<string, string[]>();
      
      for (const taskId of taskIds) {
        const task = this.tasks.get(taskId);
        if (!task) continue;
        
        if (task.dependencies && task.dependencies.length > 0) {
          map.set(taskId, [...task.dependencies]);
        } else {
          map.set(taskId, []);
        }
      }
      
      return map;
    }
  }
  
  /**
   * [Automation] Task builder for creating automation tasks
   */
  export class TaskBuilder {
    private id: string;
    private name: string;
    private description?: string;
    private executeFunction: () => Promise<void> = async () => {};
    private shouldRunFunction: () => Promise<boolean> = async () => true;
    private dependencies: string[] = [];
    private retryOptions?: {
      maxRetries: number;
      delayMs: number;
      backoffFactor?: number;
    };
    private timeout?: number;
    
    constructor(id: string, name: string) {
      this.id = id;
      this.name = name;
    }
    
    /**
     * Set the task description
     */
    withDescription(description: string): TaskBuilder {
      this.description = description;
      return this;
    }
    
    /**
     * Set the execution function
     */
    withExecute(fn: () => Promise<void>): TaskBuilder {
      this.executeFunction = fn;
      return this;
    }
    
    /**
     * Set the condition function
     */
    withCondition(fn: () => Promise<boolean>): TaskBuilder {
      this.shouldRunFunction = fn;
      return this;
    }
    
    /**
     * Add a dependency
     */
    withDependency(taskId: string): TaskBuilder {
      if (!this.dependencies.includes(taskId)) {
        this.dependencies.push(taskId);
      }
      return this;
    }
    
    /**
     * Add multiple dependencies
     */
    withDependencies(taskIds: string[]): TaskBuilder {
      for (const taskId of taskIds) {
        this.withDependency(taskId);
      }
      return this;
    }
    
    /**
     * Configure retry options
     */
    withRetry(options: {
      maxRetries: number;
      delayMs: number;
      backoffFactor?: number;
    }): TaskBuilder {
      this.retryOptions = options;
      return this;
    }
    
    /**
     * Set a timeout for the task
     */
    withTimeout(timeoutMs: number | undefined): TaskBuilder {
      this.timeout = timeoutMs;
      return this;
    }
    
    /**
     * Build the task
     */
    build(): AutomationTask {
      return {
        id: this.id,
        name: this.name,
        description: this.description,
        execute: this.executeFunction,
        shouldRun: this.shouldRunFunction,
        dependencies: this.dependencies.length > 0 ? this.dependencies : undefined,
        retryOptions: this.retryOptions,
        timeout: this.timeout,
      };
    }
  }
  
  /**
   * [Automation] Scheduling utilities for creating cron-like schedules
   */
  export class ScheduleUtil {
    /**
     * Check if the current time is within the specified schedule
     */
    static isTimeToRun(schedule: {
      minutes?: number[];
      hours?: number[];
      daysOfWeek?: number[];
      daysOfMonth?: number[];
      months?: number[];
    }, now: Date = new Date()): boolean {
      const minute = now.getMinutes();
      const hour = now.getHours();
      const dayOfWeek = now.getDay(); // 0-6, 0 is Sunday
      const dayOfMonth = now.getDate(); // 1-31
      const month = now.getMonth() + 1; // 1-12
      
      // Check each component of the schedule
      if (schedule.minutes && !schedule.minutes.includes(minute)) {
        return false;
      }
      
      if (schedule.hours && !schedule.hours.includes(hour)) {
        return false;
      }
      
      if (schedule.daysOfWeek && !schedule.daysOfWeek.includes(dayOfWeek)) {
        return false;
      }
      
      if (schedule.daysOfMonth && !schedule.daysOfMonth.includes(dayOfMonth)) {
        return false;
      }
      
      if (schedule.months && !schedule.months.includes(month)) {
        return false;
      }
      
      return true;
    }
    
    /**
     * Calculate the next run time based on schedule
     */
    static getNextRunTime(schedule: {
      minutes?: number[];
      hours?: number[];
      daysOfWeek?: number[];
      daysOfMonth?: number[];
      months?: number[];
    }, from: Date = new Date()): Date {
      // Clone the date to avoid modifying the original
      const next = new Date(from);
      
      // Set to the start of the current minute to simplify calculations
      next.setSeconds(0);
      next.setMilliseconds(0);
      
      // Start by adding one minute
      next.setMinutes(next.getMinutes() + 1);
      
      // Try for up to a year of iterations to prevent infinite loops
      for (let i = 0; i < 525600; i++) { // 60 * 24 * 365 = minutes in a year
        const minute = next.getMinutes();
        const hour = next.getHours();
        const dayOfWeek = next.getDay();
        const dayOfMonth = next.getDate();
        const month = next.getMonth() + 1;
        
        // Check if all conditions are met
        let minuteMatch = !schedule.minutes || schedule.minutes.includes(minute);
        let hourMatch = !schedule.hours || schedule.hours.includes(hour);
        let dayOfWeekMatch = !schedule.daysOfWeek || schedule.daysOfWeek.includes(dayOfWeek);
        let dayOfMonthMatch = !schedule.daysOfMonth || schedule.daysOfMonth.includes(dayOfMonth);
        let monthMatch = !schedule.months || schedule.months.includes(month);
        
        if (minuteMatch && hourMatch && dayOfWeekMatch && dayOfMonthMatch && monthMatch) {
          return next;
        }
        
        // Advance to the next time increment
        // First try to match the minute
        if (schedule.minutes && !minuteMatch) {
          // Find the next valid minute value
          const nextMinute = schedule.minutes.find(m => m > minute);
          if (nextMinute !== undefined) {
            next.setMinutes(nextMinute);
            continue;
          } else {
            // Wrap to the first valid minute and increment the hour
            next.setMinutes(schedule.minutes[0]);
            next.setHours(next.getHours() + 1);
            continue;
          }
        }
        
        // Next try to match the hour
        if (schedule.hours && !hourMatch) {
          // Find the next valid hour value
          const nextHour = schedule.hours.find(h => h > hour);
          if (nextHour !== undefined) {
            next.setHours(nextHour);
            if (schedule.minutes) {
              next.setMinutes(schedule.minutes[0]);
            } else {
              next.setMinutes(0);
            }
            continue;
          } else {
            // Wrap to the first valid hour and increment the day
            next.setHours(schedule.hours[0]);
            if (schedule.minutes) {
              next.setMinutes(schedule.minutes[0]);
            } else {
              next.setMinutes(0);
            }
            next.setDate(next.getDate() + 1);
            continue;
          }
        }
        
        // For day and month, it's more complex due to varying month lengths
        // For simplicity, just increment by a day at a time
        next.setHours(0);
        next.setMinutes(0);
        next.setDate(next.getDate() + 1);
      }
      
      // If we get here, we couldn't find a valid time in the next year
      // This would indicate an impossible schedule
      throw new Error('Could not find a valid next run time within a year');
    }
    
    /**
     * Parse a cron expression into a schedule object
     * Format: "minute hour dayOfMonth month dayOfWeek"
     * Each can be * (any), a number, a range (e.g. 1-5), or a list (e.g. 1,3,5)
     */
    static parseCronExpression(cronExpression: string): {
      minutes: number[] | undefined;
      hours: number[] | undefined;
      daysOfMonth: number[] | undefined;
      months: number[] | undefined;
      daysOfWeek: number[] | undefined;
    } {
      const parts = cronExpression.trim().split(/\s+/);
      
      if (parts.length !== 5) {
        throw new Error('Invalid cron expression format. Expected 5 parts: minute hour dayOfMonth month dayOfWeek');
      }
      
      const [minutePart, hourPart, domPart, monthPart, dowPart] = parts;
      
      return {
        minutes: this.parseCronPart(minutePart, 0, 59),
        hours: this.parseCronPart(hourPart, 0, 23),
        daysOfMonth: this.parseCronPart(domPart, 1, 31),
        months: this.parseCronPart(monthPart, 1, 12),
        daysOfWeek: this.parseCronPart(dowPart, 0, 6),
      };
    }
    
    private static parseCronPart(part: string, min: number, max: number): number[] | undefined {
      // Handle * (any value)
      if (part === '*') {
        return undefined;
      }
      
      const values: number[] = [];
      
      // Split by comma for lists
      const segments = part.split(',');
      
      for (const segment of segments) {
        // Handle ranges (e.g. 1-5)
        if (segment.includes('-')) {
          const [start, end] = segment.split('-').map(Number);
          
          if (isNaN(start) || isNaN(end) || start < min || end > max) {
            throw new Error(`Invalid range: ${segment}. Values must be between ${min} and ${max}`);
          }
          
          for (let i = start; i <= end; i++) {
            values.push(i);
          }
        } 
        // Handle step values (e.g. */5)
        else if (segment.includes('/')) {
          const [range, stepStr] = segment.split('/');
          const step = Number(stepStr);
          
          if (isNaN(step)) {
            throw new Error(`Invalid step value: ${stepStr}`);
          }
          
          let start = min;
          let end = max;
          
          if (range !== '*') {
            const rangeValue = Number(range);
            if (isNaN(rangeValue) || rangeValue < min || rangeValue > max) {
              throw new Error(`Invalid range value: ${range}. Values must be between ${min} and ${max}`);
            }
            start = rangeValue;
          }
          
          for (let i = start; i <= end; i += step) {
            values.push(i);
          }
        }
        // Handle single values
        else {
          const value = Number(segment);
          
          if (isNaN(value) || value < min || value > max) {
            throw new Error(`Invalid value: ${segment}. Values must be between ${min} and ${max}`);
          }
          
          values.push(value);
        }
      }
      
      // Sort and deduplicate values
      return [...new Set(values)].sort((a, b) => a - b);
    }
  }
  
  /**
   * [Automation] Create a scheduled task that runs on a schedule
   */
  export const createScheduledTask = (
    id: string,
    name: string,
    schedule: {
      minutes?: number[];
      hours?: number[];
      daysOfWeek?: number[];
      daysOfMonth?: number[];
      months?: number[];
    },
    executeFunction: () => Promise<void>,
    options: {
      description?: string;
      dependencies?: string[];
      retryOptions?: {
        maxRetries: number;
        delayMs: number;
        backoffFactor?: number;
      };
      timeout?: number;
    } = {}
  ): AutomationTask => {
    return new TaskBuilder(id, name)
      .withDescription(options.description || `Scheduled task: ${name}`)
      .withExecute(executeFunction)
      .withCondition(async () => ScheduleUtil.isTimeToRun(schedule))
      .withDependencies(options.dependencies || [])
      .withRetry(options.retryOptions || { maxRetries: 0, delayMs: 0 })
      .withTimeout(options.timeout)
      .build();
  };
  
  /**
   * [Automation] Create a file watcher task that runs when files change
   */
  export const createFileWatcherTask = (
    id: string,
    name: string,
    patterns: string[],
    executeFunction: (changedFiles: string[]) => Promise<void>,
    options: {
      description?: string;
      dependencies?: string[];
      retryOptions?: {
        maxRetries: number;
        delayMs: number;
        backoffFactor?: number;
      };
      timeout?: number;
      // File watcher specific options
      debounceMs?: number;
      ignoreDotFiles?: boolean;
    } = {}
  ): { 
    task: AutomationTask; 
    start: () => void; 
    stop: () => void;
  } => {
    let changedFiles: Set<string> = new Set();
    let changeTimeout: any = null;
    let running = false;
    let watcher: any = null;
    
    const task = new TaskBuilder(id, name)
      .withDescription(options.description || `File watcher task: ${name}`)
      .withExecute(async () => {
        const filesToProcess = [...changedFiles];
        changedFiles.clear();
        
        await executeFunction(filesToProcess);
      })
      .withCondition(async () => changedFiles.size > 0)
      .withDependencies(options.dependencies || [])
      .withRetry(options.retryOptions || { maxRetries: 0, delayMs: 0 })
      .withTimeout(options.timeout)
      .build();
    
    const handleFileChange = (filePath: string) => {
      // Skip dot files if configured
      if (options.ignoreDotFiles && (
        filePath.startsWith('.') || filePath.includes('/.')
      )) {
        return;
      }
      
      changedFiles.add(filePath);
      
      if (changeTimeout) {
        clearTimeout(changeTimeout);
      }
      
      changeTimeout = setTimeout(() => {
        if (running && !task.timeout) {
          // If the task is running and has no timeout, wait until it's done
          setTimeout(handleFileChange, 1000, filePath);
          return;
        }
        
        running = true;
        task.execute()
          .then(() => {
            running = false;
          })
          .catch(error => {
            console.error(`Error executing file watcher task ${id}:`, error);
            running = false;
          });
      }, options.debounceMs || 300);
    };
    
    // This is a stub - in a real implementation, you would use a proper file watcher
    // like chokidar or fs.watch depending on the environment
    const start = () => {
      // Placeholder for starting the watcher
      console.log(`Started file watcher task ${id} for patterns:`, patterns);
    };
    
    const stop = () => {
      if (watcher) {
        // Placeholder for stopping the watcher
        watcher = null;
      }
      
      if (changeTimeout) {
        clearTimeout(changeTimeout);
        changeTimeout = null;
      }
    };
    
    return { task, start, stop };
  };
  
  /**
   * [Automation] Create an event-based task that runs when an event is triggered
   */
  export const createEventTask = <T>(
    id: string,
    name: string,
    executeFunction: (eventData: T) => Promise<void>,
    options: {
      description?: string;
      dependencies?: string[];
      retryOptions?: {
        maxRetries: number;
        delayMs: number;
        backoffFactor?: number;
      };
      timeout?: number;
      // Event specific options
      filter?: (eventData: T) => boolean;
      throttleMs?: number;
    } = {}
  ): { 
    task: AutomationTask; 
    trigger: (eventData: T) => void;
  } => {
    let pendingEventData: T | null = null;
    let lastRunTime = 0;
    
    const task = new TaskBuilder(id, name)
      .withDescription(options.description || `Event task: ${name}`)
      .withExecute(async () => {
        if (pendingEventData) {
          const data = pendingEventData;
          pendingEventData = null;
          lastRunTime = Date.now();
          
          await executeFunction(data);
        }
      })
      .withCondition(async () => pendingEventData !== null)
      .withDependencies(options.dependencies || [])
      .withRetry(options.retryOptions || { maxRetries: 0, delayMs: 0 })
      .withTimeout(options.timeout)
      .build();
    
    const trigger = (eventData: T) => {
      // Apply filter if provided
      if (options.filter && !options.filter(eventData)) {
        return;
      }
      
      // Apply throttling if configured
      if (options.throttleMs) {
        const elapsed = Date.now() - lastRunTime;
        if (elapsed < options.throttleMs) {
          pendingEventData = eventData; // Save the latest event data
          return;
        }
      }
      
      // Set the event data and execute
      pendingEventData = eventData;
      task.execute().catch(error => {
        console.error(`Error executing event task ${id}:`, error);
      });
    };
    
    return { task, trigger };
  };
  
  /**
   * [Automation] Create a task that performs health checks
   */
  export const createHealthCheckTask = (
    id: string,
    name: string,
    checks: Array<{
      name: string;
      check: () => Promise<boolean>;
      criticalFailure?: boolean;
    }>,
    options: {
      description?: string;
      schedule?: {
        minutes?: number[];
        hours?: number[];
        daysOfWeek?: number[];
        daysOfMonth?: number[];
        months?: number[];
      };
      retryOptions?: {
        maxRetries: number;
        delayMs: number;
        backoffFactor?: number;
      };
      timeout?: number;
      onCheckComplete?: (results: Array<{ name: string; success: boolean; duration: number }>) => void;
    } = {}
  ): AutomationTask => {
    return new TaskBuilder(id, name)
      .withDescription(options.description || `Health check task: ${name}`)
      .withExecute(async () => {
        const results: Array<{ name: string; success: boolean; duration: number }> = [];
        
        for (const check of checks) {
          const startTime = Date.now();
          try {
            const success = await check.check();
            const duration = Date.now() - startTime;
            
            results.push({ name: check.name, success, duration });
            
            if (!success && check.criticalFailure) {
              throw new Error(`Critical health check failed: ${check.name}`);
            }
          } catch (error) {
            const duration = Date.now() - startTime;
            results.push({ name: check.name, success: false, duration });
            
            if (check.criticalFailure) {
              if (options.onCheckComplete) {
                options.onCheckComplete(results);
              }
              throw error;
            }
          }
        }
        
        if (options.onCheckComplete) {
          options.onCheckComplete(results);
        }
        
        // If we have any failures, throw an error
        const failures = results.filter(r => !r.success);
        if (failures.length > 0) {
          throw new Error(`Health checks failed: ${failures.map(f => f.name).join(', ')}`);
        }
      })
      .withCondition(async () => options.schedule ? 
        ScheduleUtil.isTimeToRun(options.schedule) : true)
      .withRetry(options.retryOptions || { maxRetries: 2, delayMs: 1000 })
      .withTimeout(options.timeout || 30000)
      .build();
  };
  
  /**
   * [Automation] Create a task group that runs other tasks in sequence or parallel
   */
  export const createTaskGroup = (
    id: string,
    name: string,
    tasks: AutomationTask[],
    options: {
      description?: string;
      parallel?: boolean;
      continueOnError?: boolean;
      dependencies?: string[];
      retryOptions?: {
        maxRetries: number;
        delayMs: number;
        backoffFactor?: number;
      };
      timeout?: number;
    } = {}
  ): AutomationTask => {
    return new TaskBuilder(id, name)
      .withDescription(options.description || `Task group: ${name}`)
      .withExecute(async () => {
        if (options.parallel) {
          // Run tasks in parallel
          const results = await Promise.allSettled(tasks.map(task => task.execute()));
          
          if (!options.continueOnError) {
            // Check for failures
            const failures = results.filter(r => r.status === 'rejected');
            if (failures.length > 0) {
              throw new Error(`Task group failed: ${failures.length} tasks failed`);
            }
          }
        } else {
          // Run tasks in sequence
          for (const task of tasks) {
            try {
              await task.execute();
            } catch (error) {
              if (!options.continueOnError) {
                throw error;
              }
            }
          }
        }
      })
      .withCondition(async () => true)
      .withDependencies(options.dependencies || [])
      .withRetry(options.retryOptions || { maxRetries: 0, delayMs: 0 })
      .withTimeout(options.timeout)
      .build();
  };
  
  /**
   * [Automation] Create a CLI execution task
   */
  export const createCliTask = (
    id: string,
    name: string,
    command: string,
    args: string[],
    options: {
      description?: string;
      dependencies?: string[];
      retryOptions?: {
        maxRetries: number;
        delayMs: number;
        backoffFactor?: number;
      };
      timeout?: number;
      // CLI specific options
      cwd?: string;
      env?: Record<string, string>;
      shell?: boolean;
      captureOutput?: boolean;
      onOutput?: (data: string) => void;
      onError?: (data: string) => void;
      validateExitCode?: (code: number) => boolean;
    } = {}
  ): AutomationTask => {
    return new TaskBuilder(id, name)
      .withDescription(options.description || `CLI task: ${command} ${args.join(' ')}`)
      .withExecute(async () => {
        // This is a stub - in a real implementation, you would use child_process.spawn
        // or a similar mechanism to run CLI commands
        console.log(`Executing command: ${command} ${args.join(' ')}`);
        
        // Simulate success
        if (options.onOutput) {
          options.onOutput(`Command executed: ${command} ${args.join(' ')}`);
        }
      })
      .withCondition(async () => true)
      .withDependencies(options.dependencies || [])
      .withRetry(options.retryOptions || { maxRetries: 0, delayMs: 0 })
      .withTimeout(options.timeout || 60000)
      .build();
  };
  
  /**
   * [Automation] Web scraping utilities
   */
  export class WebScrapingUtil {
    /**
     * Fetch HTML content with automatic retries
     */
    static async fetchHtml(url: string, options: {
      retries?: number;
      delayMs?: number;
      timeout?: number;
      headers?: Record<string, string>;
    } = {}): Promise<string> {
      const { 
        retries = 3, 
        delayMs = 1000, 
        timeout = 10000,
        headers = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      } = options;
      
      let lastError: Error | undefined;
      
      for (let attempt = 0; attempt < retries; attempt++) {
        try {
          const controller = new AbortController();
          const id = setTimeout(() => controller.abort(), timeout);
          
          const response = await fetch(url, { 
            headers,
            signal: controller.signal
          });
          
          clearTimeout(id);
          
          if (!response.ok) {
            throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
          }
          
          return await response.text();
        } catch (error) {
          lastError = error as Error;
          
          // Wait before retrying
          if (attempt < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        }
      }
      
      throw lastError || new Error(`Failed to fetch ${url}`);
    }
    
    /**
     * Extract text content from HTML using a selector
     */
    static extractText(html: string): string[] {
      // In a real implementation, you would use a library like cheerio or parse5
      // This is a very simplified example that doesn't actually use the selector
      const matches = html.match(/<p>(.*?)<\/p>/g);
      
      if (!matches) {
        return [];
      }
      
      return matches.map(match => {
        // Remove HTML tags
        return match.replace(/<\/?p>/g, '');
      });
    }
    
    /**
     * Extract links from HTML
     */
    static extractLinks(html: string, baseUrl?: string): string[] {
      const linkPattern = /<a\s+(?:[^>]*?\s+)?href="([^"]*)"[^>]*>/g;
      const links: string[] = [];
      let match;
      
      while ((match = linkPattern.exec(html)) !== null) {
        let href = match[1];
        
        // Skip anchor links, javascript links, and mailto links
        if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) {
          continue;
        }
        
        // Handle relative URLs
        if (baseUrl && !href.startsWith('http')) {
          if (href.startsWith('/')) {
            // Absolute path
            const url = new URL(baseUrl);
            href = `${url.protocol}//${url.host}${href}`;
          } else {
            // Relative path
            href = baseUrl.endsWith('/') ? `${baseUrl}${href}` : `${baseUrl}/${href}`;
          }
        }
        
        links.push(href);
      }
      
      return links;
    }
    
    /**
     * Create a basic web crawler that follows links and processes pages
     */
    static createCrawler(options: {
      maxPages?: number;
      maxDepth?: number;
      delay?: number;
      respectRobotsTxt?: boolean;
      processPage: (url: string, html: string, depth: number) => Promise<void>;
      shouldFollowLink?: (url: string, sourceUrl: string) => boolean;
    }): (startUrl: string) => Promise<void> {
      const { 
        maxPages = 100, 
        maxDepth = 3, 
        delay = 1000,
        respectRobotsTxt = true,
        processPage,
        shouldFollowLink = () => true
      } = options;
      
      return async (startUrl: string) => {
        const visited = new Set<string>();
        const queue: Array<{ url: string; depth: number }> = [{ url: startUrl, depth: 0 }];
        
        let robotsTxtRules: Map<string, boolean> = new Map();
        
        // Fetch robots.txt if configured
        if (respectRobotsTxt) {
          try {
            const url = new URL(startUrl);
            const robotsTxtUrl = `${url.protocol}//${url.host}/robots.txt`;
            const robotsTxt = await this.fetchHtml(robotsTxtUrl);
            
            // Parse robots.txt (very simplified, doesn't handle all rules)
            const lines = robotsTxt.split('\n');
            let isUserAgent = false;
            
            for (const line of lines) {
              const trimmed = line.trim();
              
              if (trimmed.startsWith('User-agent:')) {
                const agent = trimmed.substring(11).trim();
                isUserAgent = agent === '*' || agent === 'Mozilla';
              } else if (isUserAgent && trimmed.startsWith('Disallow:')) {
                const path = trimmed.substring(9).trim();
                if (path) {
                  robotsTxtRules.set(path, false);
                }
              } else if (isUserAgent && trimmed.startsWith('Allow:')) {
                const path = trimmed.substring(6).trim();
                if (path) {
                  robotsTxtRules.set(path, true);
                }
              }
            }
          } catch (error) {
            console.warn('Failed to fetch robots.txt:', error);
          }
        }
        
        // Check if a URL is allowed by robots.txt
        const isAllowedByRobotsTxt = (url: string): boolean => {
          if (!respectRobotsTxt || robotsTxtRules.size === 0) {
            return true;
          }
          
          try {
            const parsedUrl = new URL(url);
            const path = parsedUrl.pathname + parsedUrl.search;
            
            // Check all rules in order
            for (const [rule, allowed] of robotsTxtRules.entries()) {
              if (path.startsWith(rule)) {
                return allowed;
              }
            }
            
            // Default to allowed
            return true;
          } catch {
            return true;
          }
        };
        
        while (queue.length > 0 && visited.size < maxPages) {
          const { url, depth } = queue.shift()!;
          
          if (visited.has(url)) {
            continue;
          }
          
          visited.add(url);
          
          try {
            const html = await this.fetchHtml(url);
            
            // Process the page
            await processPage(url, html, depth);
            
            // Don't follow links if we've reached max depth
            if (depth >= maxDepth) {
              continue;
            }
            
            // Extract and queue links
            const links = this.extractLinks(html, url);
            
            for (const link of links) {
              if (!visited.has(link) && 
                  !queue.some(item => item.url === link) && 
                  isAllowedByRobotsTxt(link) &&
                  shouldFollowLink(link, url)) {
                queue.push({ url: link, depth: depth + 1 });
              }
            }
            
            // Respect delay between requests
            if (delay > 0 && queue.length > 0) {
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          } catch (error) {
            console.error(`Error processing ${url}:`, error);
          }
        }
      };
    }
  }
  
  /**
   * [Automation] Data processing pipeline utilities
   */
  export class DataPipeline<T> {
    private transforms: Array<(data: T) => Promise<T>> = [];
    private validators: Array<(data: T) => Promise<boolean>> = [];
    private errorHandlers: Array<(error: Error, data: T) => Promise<T | null>> = [];
    
    /**
     * Add a transformation step to the pipeline
     */
    addTransform(transform: (data: T) => Promise<T>): DataPipeline<T> {
      this.transforms.push(transform);
      return this;
    }
    
    /**
     * Add a validation step to the pipeline
     */
    addValidator(validator: (data: T) => Promise<boolean>): DataPipeline<T> {
      this.validators.push(validator);
      return this;
    }
    
    /**
     * Add an error handler to the pipeline
     */
    addErrorHandler(handler: (error: Error, data: T) => Promise<T | null>): DataPipeline<T> {
      this.errorHandlers.push(handler);
      return this;
    }
    
    /**
     * Process data through the pipeline
     */
    async process(data: T): Promise<T> {
      let current = data;
      
      try {
        // Run validators first
        for (const validator of this.validators) {
          const isValid = await validator(current);
          if (!isValid) {
            throw new Error('Data validation failed');
          }
        }
        
        // Run transforms
        for (const transform of this.transforms) {
          current = await transform(current);
        }
        
        return current;
      } catch (error) {
        // Try error handlers
        for (const handler of this.errorHandlers) {
          try {
            const result = await handler(error as Error, current);
            if (result !== null) {
              return result;
            }
          } catch {
            // Ignore errors in error handlers
          }
        }
        
        // Re-throw if all error handlers failed
        throw error;
      }
    }
    
    /**
     * Process multiple data items in parallel
     */
    async processParallel(items: T[], concurrency: number = 5): Promise<T[]> {
      const results: T[] = [];
      const chunks: T[][] = [];
      
      // Split items into chunks based on concurrency
      for (let i = 0; i < items.length; i += concurrency) {
        chunks.push(items.slice(i, i + concurrency));
      }
      
      // Process chunks sequentially, but items within a chunk in parallel
      for (const chunk of chunks) {
        const chunkResults = await Promise.all(
          chunk.map(item => this.process(item).catch(error => {
            console.error('Error processing item:', error);
            throw error;
          }))
        );
        
        results.push(...chunkResults);
      }
      
      return results;
    }
  }
  
  /**
   * [Automation] Create a data synchronization task
   */
  export const createSyncTask = <T, U>(
    id: string,
    name: string,
    options: {
      description?: string;
      dependencies?: string[];
      retryOptions?: {
        maxRetries: number;
        delayMs: number;
        backoffFactor?: number;
      };
      timeout?: number;
      // Sync specific options
      sourceLoader: () => Promise<T[]>;
      targetLoader: () => Promise<U[]>;
      compareItems: (source: T, target: U) => boolean;
      createItem: (source: T) => Promise<void>;
      updateItem: (source: T, target: U) => Promise<void>;
      deleteItem?: (target: U) => Promise<void>;
      idExtractor: (item: T | U) => string;
      onProgress?: (current: number, total: number) => void;
    }
  ): AutomationTask => {
    const {
      description,
      dependencies,
      retryOptions,
      timeout,
      sourceLoader,
      targetLoader,
      compareItems,
      createItem,
      updateItem,
      deleteItem,
      idExtractor,
      onProgress
    } = options;
    
    return new TaskBuilder(id, name)
      .withDescription(description || `Sync task: ${name}`)
      .withExecute(async () => {
        // Load source and target data
        const [sourceItems, targetItems] = await Promise.all([
          sourceLoader(),
          targetLoader()
        ]);
        
        // Create maps for faster lookup
        const sourceMap = new Map<string, T>();
        const targetMap = new Map<string, U>();
        
        sourceItems.forEach(item => {
          sourceMap.set(idExtractor(item), item);
        });
        
        targetItems.forEach(item => {
          targetMap.set(idExtractor(item), item);
        });
        
        // Determine items to create, update, or delete
        const itemsToCreate: T[] = [];
        const itemsToUpdate: Array<{ source: T; target: U }> = [];
        const itemsToDelete: U[] = [];
        
        // Find items to create or update
        sourceItems.forEach(sourceItem => {
          const id = idExtractor(sourceItem);
          const targetItem = targetMap.get(id);
          
          if (!targetItem) {
            itemsToCreate.push(sourceItem);
          } else if (!compareItems(sourceItem, targetItem)) {
            itemsToUpdate.push({ source: sourceItem, target: targetItem });
          }
        });
        
        // Find items to delete (if deleteItem is provided)
        if (deleteItem) {
          targetItems.forEach(targetItem => {
            const id = idExtractor(targetItem);
            if (!sourceMap.has(id)) {
              itemsToDelete.push(targetItem);
            }
          });
        }
        
        // Calculate total operations
        const totalOperations = itemsToCreate.length + itemsToUpdate.length + itemsToDelete.length;
        let completedOperations = 0;
        
        // Helper to update progress
        const updateProgress = () => {
          completedOperations++;
          if (onProgress) {
            onProgress(completedOperations, totalOperations);
          }
        };
        
        // Perform creates
        for (const item of itemsToCreate) {
          await createItem(item);
          updateProgress();
        }
        
        // Perform updates
        for (const { source, target } of itemsToUpdate) {
          await updateItem(source, target);
          updateProgress();
        }
        
        // Perform deletes
        if (deleteItem) {
          for (const item of itemsToDelete) {
            await deleteItem(item);
            updateProgress();
          }
        }
      })
      .withCondition(async () => true)
      .withDependencies(dependencies || [])
      .withRetry(retryOptions || { maxRetries: 1, delayMs: 1000 })
      .withTimeout(timeout || 3600000) // Default to 1 hour
      .build();
  };
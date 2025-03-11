// ===================================================
// SERVER BACKEND
// ===================================================

/**
 * [Server] Basic HTTP server configuration
 */
export interface ServerConfig {
    port: number;
    host?: string;
    corsOptions?: {
      origin: string | string[] | boolean;
      methods?: string[];
      allowedHeaders?: string[];
      exposedHeaders?: string[];
      credentials?: boolean;
      maxAge?: number;
    };
    middleware?: any[]; // Express middleware
    routes?: any[]; // Router or route handlers
    staticOptions?: {
      path: string;
      directory: string;
      options?: any; // Options for express.static
    };
    compression?: boolean;
    rateLimit?: {
      windowMs: number;
      max: number;
      standardHeaders?: boolean;
      legacyHeaders?: boolean;
    };
    security?: {
      enableHelmet?: boolean;
      xssProtection?: boolean;
      noSniff?: boolean;
      hidePoweredBy?: boolean;
    };
    logOptions?: {
      format?: string;
      level?: string;
      silent?: boolean;
    };
  }
  
  /**
   * [Server] Express-like server utilities
   */
  export class ServerUtils {
    /**
     * Create a generic route handler factory
     */
    static createRouteHandler<T, U extends { json: (body: any) => any; status: (code: number) => { json: (body: any) => any } }>(handler: (req: T, res: U, next: (err?: any) => void) => Promise<any>) {
      return (req: T, res: U, next: (err?: any) => void) => {
        handler(req, res, next).catch(next);
      };
    }
    
    /**
     * Generate CRUD route handlers
     */
    static createCrudHandlers<T, K extends keyof T>(options: {
      model: any; // Database model
      idParam: string;
      idField: K;
      readPermission?: (req: any) => boolean;
      createPermission?: (req: any) => boolean;
      updatePermission?: (req: any, item: T) => boolean;
      deletePermission?: (req: any, item: T) => boolean;
      readTransform?: (item: T, req: any) => any;
      createTransform?: (data: any, req: any) => any;
      updateTransform?: (data: any, req: any) => any;
      filterQuery?: (req: any) => any;
      validateCreate?: (data: any) => Promise<void>;
      validateUpdate?: (data: any) => Promise<void>;
    }) {
      const {
        model,
        idParam,
        idField,
        readPermission = () => true,
        createPermission = () => true,
        updatePermission = () => true,
        deletePermission = () => true,
        readTransform = (item) => item,
        createTransform = (data) => data,
        updateTransform = (data) => data,
        filterQuery = () => ({}),
        validateCreate = async () => {},
        validateUpdate = async () => {},
      } = options;
      
      return {
        // Get all items
        getAll: this.createRouteHandler(async (req, res) => {
          if (!readPermission(req)) {
            return res.status(403).json({ error: 'Permission denied' });
          }
          
          const filter = filterQuery(req);
          const items = await model.find(filter);
          
          return res.json(items.map(item => readTransform(item, req)));
        }),
        
        // Get a single item by ID
        getById: this.createRouteHandler(async (req, res) => {
          if (!readPermission(req)) {
            return res.status(403).json({ error: 'Permission denied' });
          }
          
          const id = (req as any).params[idParam];
          const item = await model.findOne({ [idField]: id });
          
          if (!item) {
            return res.status(404).json({ error: 'Item not found' });
          }
          
          return res.json(readTransform(item, req));
        }),
        
        // Create a new item
        create: this.createRouteHandler(async (req, res) => {
          if (!createPermission(req)) {
            return res.status(403).json({ error: 'Permission denied' });
          }
          const request = req as any;
          const data = createTransform(request.body, request);
          
          try {
            await validateCreate(data);
          } catch (error) {
            return res.status(400).json({ error: error.message });
          }
          
          const item = await model.create(data);
          
          return res.status(201).json(readTransform(item, req));
        }),
        
        // Update an existing item
        update: this.createRouteHandler(async (req, res) => {
          const id = (req as any).params[idParam];
          const item = await model.findOne({ [idField]: id });
          
          if (!item) {
            return res.status(404).json({ error: 'Item not found' });
          }
          
          if (!updatePermission(req, item)) {
            return res.status(403).json({ error: 'Permission denied' });
          }
          
          const data = updateTransform((req as any).body, req);
          
          try {
            await validateUpdate(data);
          } catch (error) {
            return res.status(400).json({ error: error.message });
          }
          
          Object.assign(item, data);
          await item.save();
          
          return res.json(readTransform(item, req));
        }),
        
        // Delete an item
        delete: this.createRouteHandler(async (req, res) => {
          const id = (req as any).params[idParam];
          const item = await model.findOne({ [idField]: id });
          
          if (!item) {
            return res.status(404).json({ error: 'Item not found' });
          }
          
          if (!deletePermission(req, item)) {
            return res.status(403).json({ error: 'Permission denied' });
          }
          
          await model.deleteOne({ [idField]: id });
          
          return res.status(204).json({});
        }),
      };
    }
    
    /**
     * Create a paginated response
     */
    static async createPaginatedResponse<T>(options: {
      query: any; // Database query
      page?: number;
      pageSize?: number;
      transform?: (item: T) => any;
      sort?: Record<string, 1 | -1>;
      count?: any; // Count query (default: same as query)
    }) {
      const {
        query,
        page = 1,
        pageSize = 10,
        transform = (item: T) => item,
        sort,
        count = query,
      } = options;
      
      const skip = (page - 1) * pageSize;
      
      // Execute query with pagination
      let dataQuery = query.skip(skip).limit(pageSize);
      
      if (sort) {
        dataQuery = dataQuery.sort(sort);
      }
      
      // Run query and count in parallel
      const [data, total] = await Promise.all([
        dataQuery.exec(),
        count.countDocuments().exec(),
      ]);
      
      const totalPages = Math.ceil(total / pageSize);
      
      return {
        data: data.map(transform),
        pagination: {
          page,
          pageSize,
          totalItems: total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
    }
    
    /**
     * Create a middleware for request validation
     */
    static createValidator(schema: any, options: {
      abortEarly?: boolean;
      propertyName?: string;
    } = {}) {
      const { abortEarly = false, propertyName = 'body' } = options;
      
      return (req: any, res: any, next: (err?: any) => void) => {
        try {
          const data = req[propertyName];
          const { error, value } = schema.validate(data, { abortEarly });
          
          if (error) {
            const errors = error.details.map((detail: any) => ({
              path: detail.path.join('.'),
              message: detail.message,
            }));
            
            return res.status(400).json({ errors });
          }
          
          // Replace request data with validated data
          req[propertyName] = value;
          next();
        } catch (err) {
          next(err);
        }
      };
    }
    
    /**
     * Error handling middleware
     */
    static errorHandler(options: {
      logErrors?: boolean;
      logger?: (err: Error, req: any) => void;
      formatError?: (err: Error) => any;
    } = {}) {
      const {
        logErrors = true,
        logger = console.error,
        formatError = (err: Error) => ({
          message: err.message,
          stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
        }),
      } = options;
      
      return (err: Error, req: any, res: any, next: (err?: any) => void) => {
        if (logErrors) {
          logger(err, req);
        }
        
        // Determine status code
        let statusCode = 500;
        
        if ('statusCode' in err && typeof (err as any).statusCode === 'number') {
          statusCode = (err as any).statusCode;
        }
        
        // Format error response
        const errorResponse = formatError(err);
        
        res.status(statusCode).json({
          error: errorResponse,
        });
      };
    }
    
    /**
     * Authentication middleware
     */
    static authenticate(options: {
      extractToken?: (req: any) => string | null;
      verifyToken: (token: string) => Promise<any>;
      onSuccess?: (req: any, user: any) => void;
      handleError?: (req: any, res: any, err: Error) => any;
    }) {
      const {
        extractToken = (req) => {
          const authHeader = req.headers.authorization;
          if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return null;
          }
          return authHeader.substring(7);
        },
        verifyToken,
        onSuccess = (req, user) => {
          req.user = user;
        },
        handleError = (req, res, err) => {
          return res.status(401).json({ error: 'Unauthorized' });
        },
      } = options;
      
      return async (req: any, res: any, next: (err?: any) => void) => {
        try {
          const token = extractToken(req);
          
          if (!token) {
            return handleError(req, res, new Error('No token provided'));
          }
          
          const user = await verifyToken(token);
          
          if (!user) {
            return handleError(req, res, new Error('Invalid token'));
          }
          
          onSuccess(req, user);
          next();
        } catch (err) {
          return handleError(req, res, err as Error);
        }
      };
    }
    
    /**
     * Authorization middleware
     */
    static authorize(options: {
      checkPermission: (req: any) => boolean | Promise<boolean>;
      handleUnauthorized?: (req: any, res: any) => any;
    }) {
      const {
        checkPermission,
        handleUnauthorized = (req, res) => {
          return res.status(403).json({ error: 'Forbidden' });
        },
      } = options;
      
      return async (req: any, res: any, next: (err?: any) => void) => {
        try {
          const hasPermission = await checkPermission(req);
          
          if (!hasPermission) {
            return handleUnauthorized(req, res);
          }
          
          next();
        } catch (err) {
          next(err);
        }
      };
    }
    
    /**
     * Create a rate limiter middleware
     */
    static createRateLimiter(options: {
      windowMs: number;
      maxRequests: number;
      message?: string;
      statusCode?: number;
      keyGenerator?: (req: any) => string;
    }) {
      const {
        windowMs,
        maxRequests,
        message = 'Too many requests, please try again later.',
        statusCode = 429,
        keyGenerator = (req) => req.ip,
      } = options;
      
      const cache = new Map<string, { count: number; resetTime: number }>();
      
      // Clean up expired entries periodically
      setInterval(() => {
        const now = Date.now();
        for (const [key, data] of cache.entries()) {
          if (data.resetTime <= now) {
            cache.delete(key);
          }
        }
      }, Math.min(windowMs, 60000)); // Clean up at most once per minute
      
      return (req: any, res: any, next: (err?: any) => void) => {
        const key = keyGenerator(req);
        const now = Date.now();
        
        // Get or create rate limit data
        let data = cache.get(key);
        
        if (!data || data.resetTime <= now) {
          data = {
            count: 0,
            resetTime: now + windowMs,
          };
          cache.set(key, data);
        }
        
        // Increment request count
        data.count++;
        
        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - data.count));
        res.setHeader('X-RateLimit-Reset', Math.ceil(data.resetTime / 1000));
        
        // Check if rate limit exceeded
        if (data.count > maxRequests) {
          return res.status(statusCode).json({ error: message });
        }
        
        next();
      };
    }
    
    /**
     * Create a simple in-memory cache middleware
     */
    static createCache(options: {
      ttl: number; // Time to live in ms
      maxSize?: number; // Maximum number of items in cache
      keyGenerator?: (req: any) => string;
      shouldCache?: (req: any, res: any) => boolean;
    }) {
      const {
        ttl,
        maxSize = 100,
        keyGenerator = (req) => `${req.method}:${req.originalUrl}`,
        shouldCache = (req, res) => req.method === 'GET',
      } = options;
      
      interface CacheItem {
        data: any;
        expiresAt: number;
      }
      
      const cache = new Map<string, CacheItem>();
      
      // Clean up expired items periodically
      setInterval(() => {
        const now = Date.now();
        for (const [key, item] of cache.entries()) {
          if (item.expiresAt <= now) {
            cache.delete(key);
          }
        }
      }, Math.min(ttl, 60000)); // Clean up at most once per minute
      
      return (req: any, res: any, next: (err?: any) => void) => {
        if (!shouldCache(req, res)) {
          return next();
        }
        
        const key = keyGenerator(req);
        const now = Date.now();
        
        // Check if we have a valid cache entry
        const cacheItem = cache.get(key);
        
        if (cacheItem && cacheItem.expiresAt > now) {
          return res.json(cacheItem.data);
        }
        
        // Store the original res.json method
        const originalJson = res.json;
        
        // Override res.json to cache the response
        res.json = function (data: any) {
          // Restore original method
          res.json = originalJson;
          
          // Cache the response
          cache.set(key, {
            data,
            expiresAt: now + ttl,
          });
          
          // If cache is too large, remove oldest entry
          if (cache.size > maxSize) {
            const oldestKey = cache.keys().next().value;
            cache.delete(oldestKey);
          }
          
          // Call the original method
          return originalJson.call(this, data);
        };
        
        next();
      };
    }
    
    /**
     * Create a middleware for handling file uploads
     */
    static createFileUploadHandler(options: {
      maxFileSize?: number; // In bytes
      allowedTypes?: string[];
      destination: string;
      filename?: (file: any) => string;
      limits?: {
        files?: number;
        fileSize?: number;
      };
    }) {
      // This is a stub - in a real implementation, this would use multer or similar
      const {
        maxFileSize = 5 * 1024 * 1024, // 5MB default
        allowedTypes = [],
        destination,
        filename,
        limits = {
          files: 1,
          fileSize: maxFileSize,
        },
      } = options;
      
      return (req: any, res: any, next: (err?: any) => void) => {
        // In a real implementation, this would configure multer and handle the file upload
        console.log('File upload handler middleware');
        next();
      };
    }
  }
  
  /**
   * [Server] Database utilities
   */
  export class DatabaseUtils {
    /**
     * Create pagination helpers for database queries
     */
    static createPaginationHelpers() {
      return {
        /**
         * Create pagination parameters from request query
         */
        getPaginationParams: (query: any) => {
          const page = parseInt(query.page) || 1;
          const limit = parseInt(query.limit) || 10;
          const skip = (page - 1) * limit;
          
          return { page, limit, skip };
        },
        
        /**
         * Create sort parameters from request query
         * Query format: sort=field1,asc|field2,desc
         */
        getSortParams: (query: any) => {
          const sort: Record<string, 1 | -1> = {};
          
          if (query.sort) {
            const sortParams = query.sort.split('|');
            
            for (const param of sortParams) {
              const [field, direction] = param.split(',');
              sort[field] = direction === 'desc' ? -1 : 1;
            }
          }
          
          return sort;
        },
        
        /**
         * Create filter parameters from request query
         * Query format: field1=value1&field2=value2
         * Special formats:
         * - field=gt:value (greater than)
         * - field=lt:value (less than)
         * - field=gte:value (greater than or equal)
         * - field=lte:value (less than or equal)
         * - field=ne:value (not equal)
         * - field=in:value1,value2 (in array)
         * - field=regex:pattern (regex match)
         */
        getFilterParams: (query: any, allowedFields: string[] = []) => {
          const filter: Record<string, any> = {};
          
          for (const [key, value] of Object.entries(query)) {
            // Skip pagination and sorting parameters
            if (['page', 'limit', 'sort'].includes(key)) {
              continue;
            }
            
            // Skip fields that are not allowed
            if (allowedFields.length > 0 && !allowedFields.includes(key)) {
              continue;
            }
            
            if (typeof value === 'string') {
              if (value.startsWith('gt:')) {
                filter[key] = { $gt: parseValue(value.substring(3)) };
              } else if (value.startsWith('lt:')) {
                filter[key] = { $lt: parseValue(value.substring(3)) };
              } else if (value.startsWith('gte:')) {
                filter[key] = { $gte: parseValue(value.substring(4)) };
              } else if (value.startsWith('lte:')) {
                filter[key] = { $lte: parseValue(value.substring(4)) };
              } else if (value.startsWith('ne:')) {
                filter[key] = { $ne: parseValue(value.substring(3)) };
              } else if (value.startsWith('in:')) {
                const values = value.substring(3).split(',').map(parseValue);
                filter[key] = { $in: values };
              } else if (value.startsWith('regex:')) {
                filter[key] = { $regex: value.substring(6), $options: 'i' };
              } else {
                filter[key] = parseValue(value);
              }
            } else {
              filter[key] = value;
            }
          }
          
          return filter;
        },
      };
    }
    
    /**
     * Create MongoDB connection helpers
     */
    static createMongoDbHelpers() {
      return {
        /**
         * Connect to MongoDB
         */
        connect: async (uri: string, options: any = {}) => {
          // This is a stub - in a real implementation, this would use mongoose
          console.log(`Connecting to MongoDB: ${uri}`);
          return { connection: {} };
        },
        
        /**
         * Create a MongoDB model
         */
        createModel: <T>(name: string, schema: any) => {
          // This is a stub - in a real implementation, this would use mongoose
          console.log(`Creating model: ${name}`);
          return {};
        },
        
        /**
         * Create MongoDB indexes
         */
        createIndexes: async (model: any, indexes: Array<{ fields: Record<string, 1 | -1>; options?: any }>) => {
          // This is a stub - in a real implementation, this would use mongoose
          console.log(`Creating indexes for model`);
        },
      };
    }
    
    /**
     * Create SQL query builder helpers
     */
    static createSqlHelpers() {
      return {
        /**
         * Build a parameterized SELECT query
         */
        buildSelectQuery: (options: {
          table: string;
          columns?: string[];
          where?: Record<string, any>;
          joins?: Array<{
            type: 'INNER' | 'LEFT' | 'RIGHT';
            table: string;
            on: string;
          }>;
          groupBy?: string[];
          having?: string;
          orderBy?: Record<string, 'ASC' | 'DESC'>;
          limit?: number;
          offset?: number;
        }) => {
          const {
            table,
            columns = ['*'],
            where = {},
            joins = [],
            groupBy = [],
            having,
            orderBy = {},
            limit,
            offset,
          } = options;
          
          // Build SELECT clause
          let query = `SELECT ${columns.join(', ')} FROM ${table}`;
          
          // Build JOIN clauses
          for (const join of joins) {
            query += ` ${join.type} JOIN ${join.table} ON ${join.on}`;
          }
          
          // Build WHERE clause
          const whereConditions = Object.entries(where).filter(([_, value]) => value !== undefined);
          
          if (whereConditions.length > 0) {
            query += ' WHERE ';
            query += whereConditions
              .map(([key, value]) => {
                if (value === null) {
                  return `${key} IS NULL`;
                } else if (Array.isArray(value)) {
                  return `${key} IN (${value.map(() => '?').join(', ')})`;
                } else if (typeof value === 'object') {
                  const operator = Object.keys(value)[0];
                  const operatorValue = value[operator];
                  
                  switch (operator) {
                    case '$gt':
                      return `${key} > ?`;
                    case '$gte':
                      return `${key} >= ?`;
                    case '$lt':
                      return `${key} < ?`;
                    case '$lte':
                      return `${key} <= ?`;
                    case '$ne':
                      return `${key} <> ?`;
                    case '$like':
                      return `${key} LIKE ?`;
                    default:
                      return `${key} = ?`;
                  }
                } else {
                  return `${key} = ?`;
                }
              })
              .join(' AND ');
          }
          
          // Build GROUP BY clause
          if (groupBy.length > 0) {
            query += ` GROUP BY ${groupBy.join(', ')}`;
          }
          
          // Build HAVING clause
          if (having) {
            query += ` HAVING ${having}`;
          }
          
          // Build ORDER BY clause
          const orderByEntries = Object.entries(orderBy);
          
          if (orderByEntries.length > 0) {
            query += ' ORDER BY ';
            query += orderByEntries
              .map(([key, direction]) => `${key} ${direction}`)
              .join(', ');
          }
          
          // Build LIMIT and OFFSET clauses
          if (limit !== undefined) {
            query += ` LIMIT ${limit}`;
          }
          
          if (offset !== undefined) {
            query += ` OFFSET ${offset}`;
          }
          
          // Extract parameters
          const parameters: any[] = [];
          
          for (const [key, value] of whereConditions) {
            if (value === null) {
              continue;
            } else if (Array.isArray(value)) {
              parameters.push(...value);
            } else if (typeof value === 'object') {
              const operator = Object.keys(value)[0];
              parameters.push(value[operator]);
            } else {
              parameters.push(value);
            }
          }
          
          return { query, parameters };
        },
        
        /**
         * Build a parameterized INSERT query
         */
        buildInsertQuery: <T extends Record<string, any>>(options: {
          table: string;
          data: T | T[];
          returning?: string[];
        }) => {
          const { table, data, returning = [] } = options;
          const isArray = Array.isArray(data);
          const items = isArray ? data : [data];
          
          if (items.length === 0) {
            throw new Error('No data provided for insertion');
          }
          
          const columns = Object.keys(items[0]);
          
          if (columns.length === 0) {
            throw new Error('No columns provided for insertion');
          }
          
          let query = `INSERT INTO ${table} (${columns.join(', ')})`;
          query += ' VALUES ';
          
          const rows: string[] = [];
          const parameters: any[] = [];
          
          for (const item of items) {
            const placeholders: string[] = [];
            
            for (const column of columns) {
              placeholders.push('?');
              parameters.push(item[column]);
            }
            
            rows.push(`(${placeholders.join(', ')})`);
          }
          
          query += rows.join(', ');
          
          if (returning.length > 0) {
            query += ` RETURNING ${returning.join(', ')}`;
          }
          
          return { query, parameters };
        },
        
        /**
         * Build a parameterized UPDATE query
         */
        buildUpdateQuery: <T extends Record<string, any>>(options: {
          table: string;
          data: T;
          where: Record<string, any>;
          returning?: string[];
        }) => {
          const { table, data, where, returning = [] } = options;
          const entries = Object.entries(data).filter(([_, value]) => value !== undefined);
          
          if (entries.length === 0) {
            throw new Error('No data provided for update');
          }
          
          let query = `UPDATE ${table} SET `;
          query += entries.map(([key]) => `${key} = ?`).join(', ');
          
          const parameters: any[] = entries.map(([_, value]) => value);
          
          // Build WHERE clause
          const whereConditions = Object.entries(where).filter(([_, value]) => value !== undefined);
          
          if (whereConditions.length > 0) {
            query += ' WHERE ';
            query += whereConditions
              .map(([key, value]) => {
                if (value === null) {
                  return `${key} IS NULL`;
                } else {
                  parameters.push(value);
                  return `${key} = ?`;
                }
              })
              .join(' AND ');
          }
          
          if (returning.length > 0) {
            query += ` RETURNING ${returning.join(', ')}`;
          }
          
          return { query, parameters };
        },
        
        /**
         * Build a parameterized DELETE query
         */
        buildDeleteQuery: (options: {
          table: string;
          where: Record<string, any>;
          returning?: string[];
        }) => {
          const { table, where, returning = [] } = options;
          let query = `DELETE FROM ${table}`;
          
          const parameters: any[] = [];
          
          // Build WHERE clause
          const whereConditions = Object.entries(where).filter(([_, value]) => value !== undefined);
          
          if (whereConditions.length > 0) {
            query += ' WHERE ';
            query += whereConditions
              .map(([key, value]) => {
                if (value === null) {
                  return `${key} IS NULL`;
                } else {
                  parameters.push(value);
                  return `${key} = ?`;
                }
              })
              .join(' AND ');
          }
          
          if (returning.length > 0) {
            query += ` RETURNING ${returning.join(', ')}`;
          }
          
          return { query, parameters };
        },
      };
    }
  }
  
  /**
   * [Server] Background job utilities
   */
  export class JobUtils {
    /**
     * Create a job scheduler
     */
    static createJobScheduler(options: {
      logger?: (message: string, level?: string) => void;
      errorHandler?: (error: Error, jobName: string) => void;
    } = {}) {
      const {
        logger = console.log,
        errorHandler = (error, jobName) => {
          console.error(`Error in job ${jobName}:`, error);
        },
      } = options;
      
      interface Job {
        name: string;
        schedule: string; // Cron expression
        handler: () => Promise<void>;
        timeout?: number;
        running?: boolean;
        timer?: any;
      }
      
      const jobs: Record<string, Job> = {};
      
      // Parse cron expression to determine next run time
      const getNextRunTime = (cronExpression: string): Date => {
        // This is a simplified implementation that doesn't actually parse cron expressions
        // In a real implementation, use a library like cron-parser
        
        // For demo, just return a time 1 minute from now
        const date = new Date();
        date.setMinutes(date.getMinutes() + 1);
        return date;
      };
      
      // Schedule a job
      const scheduleJob = (job: Job) => {
        const nextRun = getNextRunTime(job.schedule);
        const delay = nextRun.getTime() - Date.now();
        
        logger(`Scheduling job ${job.name} to run at ${nextRun.toISOString()} (in ${delay}ms)`);
        
        job.timer = setTimeout(() => {
          runJob(job);
        }, delay);
      };
      
      // Run a job
      const runJob = async (job: Job) => {
        if (job.running) {
          logger(`Job ${job.name} is already running, skipping`);
          scheduleJob(job);
          return;
        }
        
        job.running = true;
        logger(`Running job ${job.name}`);
        
        try {
          if (job.timeout) {
            await Promise.race([
              job.handler(),
              new Promise((_, reject) => {
                setTimeout(() => {
                  reject(new Error(`Job ${job.name} timed out after ${job.timeout}ms`));
                }, job.timeout);
              }),
            ]);
          } else {
            await job.handler();
          }
          
          logger(`Job ${job.name} completed successfully`);
        } catch (error) {
          errorHandler(error as Error, job.name);
        } finally {
          job.running = false;
          scheduleJob(job);
        }
      };
      
      return {
        /**
         * Register a new job
         */
        registerJob: (
          name: string,
          schedule: string,
          handler: () => Promise<void>,
          options: { timeout?: number } = {}
        ) => {
          if (jobs[name]) {
            throw new Error(`Job with name "${name}" already exists`);
          }
          
          const job: Job = {
            name,
            schedule,
            handler,
            timeout: options.timeout,
          };
          
          jobs[name] = job;
          scheduleJob(job);
          
          return { name };
        },
        
        /**
         * Unregister a job
         */
        unregisterJob: (name: string) => {
          const job = jobs[name];
          
          if (!job) {
            return false;
          }
          
          if (job.timer) {
            clearTimeout(job.timer);
          }
          
          delete jobs[name];
          return true;
        },
        
        /**
         * Run a job immediately
         */
        runJobNow: async (name: string) => {
          const job = jobs[name];
          
          if (!job) {
            throw new Error(`Job with name "${name}" not found`);
          }
          
          await runJob(job);
        },
        
        /**
         * List all registered jobs
         */
        listJobs: () => {
          return Object.values(jobs).map(job => ({
            name: job.name,
            schedule: job.schedule,
            running: job.running || false,
          }));
        },
      };
    }
    
    /**
     * Create a worker pool for handling background tasks
     */
    static createWorkerPool(options: {
      workerCount?: number;
      taskTimeout?: number;
      logger?: (message: string, level?: string) => void;
    } = {}) {
      const {
        workerCount = Math.max(1, (typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : 4) - 1),
        taskTimeout = 30000,
        logger = console.log,
      } = options;
      
      interface Task {
        id: string;
        handler: () => Promise<any>;
        resolve: (result: any) => void;
        reject: (error: Error) => void;
        timeout?: number;
        timer?: any;
      }
      
      const taskQueue: Task[] = [];
      let activeWorkers = 0;
      let nextTaskId = 1;
      let isProcessing = false;
      
      const processQueue = async () => {
        if (isProcessing || taskQueue.length === 0 || activeWorkers >= workerCount) {
          return;
        }
        
        isProcessing = true;
        
        try {
          while (taskQueue.length > 0 && activeWorkers < workerCount) {
            const task = taskQueue.shift()!;
            executeTask(task);
          }
        } finally {
          isProcessing = false;
        }
      };
      
      const executeTask = async (task: Task) => {
        activeWorkers++;
        
        // Set up timeout
        const timeout = task.timeout || taskTimeout;
        task.timer = setTimeout(() => {
          task.reject(new Error(`Task timed out after ${timeout}ms`));
        }, timeout);
        
        try {
          const result = await task.handler();
          clearTimeout(task.timer);
          task.resolve(result);
        } catch (error) {
          clearTimeout(task.timer);
          task.reject(error as Error);
        } finally {
          activeWorkers--;
          processQueue();
        }
      };
      
      return {
        /**
         * Enqueue a task to be executed
         */
        enqueue: <T>(handler: () => Promise<T>, options: { timeout?: number } = {}): Promise<T> => {
          return new Promise<T>((resolve, reject) => {
            const task: Task = {
              id: `task-${nextTaskId++}`,
              handler,
              resolve,
              reject,
              timeout: options.timeout,
            };
            
            taskQueue.push(task);
            processQueue();
          });
        },
        
        /**
         * Get the number of pending tasks
         */
        getPendingCount: () => taskQueue.length,
        
        /**
         * Get the number of active workers
         */
        getActiveWorkers: () => activeWorkers,
        
        /**
         * Drain the queue and wait for all tasks to complete
         */
        drain: async () => {
          if (taskQueue.length === 0 && activeWorkers === 0) {
            return;
          }
          
          return new Promise<void>(resolve => {
            const checkInterval = setInterval(() => {
              if (taskQueue.length === 0 && activeWorkers === 0) {
                clearInterval(checkInterval);
                resolve();
              }
            }, 100);
          });
        },
      };
    }
  }
  
  /**
   * [Server] Authentication utilities
   */
  export class AuthUtils {
    /**
     * Create JSON Web Token (JWT) utilities
     */
    static createJwtUtils(options: {
      secretKey: string;
      issuer?: string;
      audience?: string;
      expiresIn?: string | number;
    }) {
      const {
        secretKey,
        issuer,
        audience,
        expiresIn = '1h',
      } = options;
      
      return {
        /**
         * Generate a JWT token
         */
        generateToken: (payload: Record<string, any>, options: {
          expiresIn?: string | number;
          subject?: string;
        } = {}): string => {
          // This is a stub - in a real implementation, this would use jsonwebtoken or similar
          console.log('Generating JWT token', payload, options);
          return 'jwt.token.stub';
        },
        
        /**
         * Verify a JWT token
         */
        verifyToken: (token: string): Record<string, any> => {
          // This is a stub - in a real implementation, this would use jsonwebtoken or similar
          console.log('Verifying JWT token', token);
          return { sub: 'user123', roles: ['user'] };
        },
        
        /**
         * Decode a JWT token without verification
         */
        decodeToken: (token: string): Record<string, any> | null => {
          // This is a stub - in a real implementation, this would use jsonwebtoken or similar
          console.log('Decoding JWT token', token);
          return { sub: 'user123', roles: ['user'] };
        },
      };
    }
    
    /**
     * Create password utilities
     */
    static createPasswordUtils() {
      return {
        /**
         * Hash a password
         */
        hashPassword: async (password: string): Promise<string> => {
          // This is a stub - in a real implementation, this would use bcrypt or similar
          console.log('Hashing password');
          return 'hashed.password.stub';
        },
        
        /**
         * Verify a password against a hash
         */
        verifyPassword: async (password: string, hash: string): Promise<boolean> => {
          // This is a stub - in a real implementation, this would use bcrypt or similar
          console.log('Verifying password');
          return password.length > 0;
        },
        
        /**
         * Generate a random password
         */
        generatePassword: (length: number = 12): string => {
          const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+';
          let password = '';
          
          for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * charset.length);
            password += charset[randomIndex];
          }
          
          return password;
        },
      };
    }
    
    /**
     * Create role-based access control (RBAC) utilities
     */
    static createRbacUtils() {
      interface Role {
        name: string;
        permissions: string[];
        inherits?: string[];
      }
      
      const roles: Record<string, Role> = {};
      
      const getAllPermissions = (roleName: string, visited: Set<string> = new Set()): string[] => {
        if (visited.has(roleName)) {
          return [];
        }
        
        visited.add(roleName);
        
        const role = roles[roleName];
        
        if (!role) {
          return [];
        }
        
        let permissions = [...role.permissions];
        
        if (role.inherits) {
          for (const inherited of role.inherits) {
            permissions = [...permissions, ...getAllPermissions(inherited, visited)];
          }
        }
        
        return [...new Set(permissions)];
      };
      
      return {
        /**
         * Define a role with permissions
         */
        defineRole: (name: string, permissions: string[], inherits?: string[]) => {
          roles[name] = { name, permissions, inherits };
        },
        
        /**
         * Get all permissions for a role
         */
        getRolePermissions: (roleName: string) => {
          return getAllPermissions(roleName);
        },
        
        /**
         * Check if a user has a permission
         */
        hasPermission: (userRoles: string[], permission: string): boolean => {
          for (const roleName of userRoles) {
            const rolePermissions = getAllPermissions(roleName);
            
            if (rolePermissions.includes(permission) || rolePermissions.includes('*')) {
              return true;
            }
          }
          
          return false;
        },
        
        /**
         * Create a middleware for checking permissions
         */
        requirePermission: (permission: string) => {
          return (req: any, res: any, next: (err?: any) => void) => {
            const userRoles = req.user?.roles || [];
            
            if (userRoles.includes('admin') || getAllPermissions('admin').includes('*')) {
              return next();
            }
            
            if (userRoles.some(role => {
              const permissions = getAllPermissions(role);
              return permissions.includes(permission) || permissions.includes('*');
            })) {
              return next();
            }
            
            return res.status(403).json({ error: 'Forbidden' });
          };
        },
      };
    }
  }
  
  // ===================================================
  // API INTEGRATION
  // ===================================================
  
  /**
   * [API] Interface for API client options
   */
  export interface ApiClientOptions {
    baseUrl: string;
    headers?: Record<string, string>;
    timeout?: number;
    retries?: number;
    retryDelay?: number;
    retryStatusCodes?: number[];
    onRequest?: (request: { url: string; method: string; headers: Record<string, string>; body?: any }) => void;
    onResponse?: (response: { statusCode: number; headers: Record<string, string>; body: any }) => void;
    onError?: (error: Error, request: { url: string; method: string }) => void;
    transformRequest?: (request: { url: string; method: string; headers: Record<string, string>; body?: any }) => any;
    transformResponse?: (response: { statusCode: number; headers: Record<string, string>; body: any }) => any;
  }
  
  /**
   * [API] Generic API client for making HTTP requests
   */
  export class ApiClient {
      public baseUrl: string;
    private headers: Record<string, string>;
    private timeout: number;
    private retries: number;
    private retryDelay: number;
    private retryStatusCodes: number[];
    private onRequest?: (request: { url: string; method: string; headers: Record<string, string>; body?: any }) => void;
    private onResponse?: (response: { statusCode: number; headers: Record<string, string>; body: any }) => void;
    private onError?: (error: Error, request: { url: string; method: string }) => void;
    private transformRequest?: (request: { url: string; method: string; headers: Record<string, string>; body?: any }) => any;
    private transformResponse?: (response: { statusCode: number; headers: Record<string, string>; body: any }) => any;
    
    constructor(options: ApiClientOptions) {
      this.baseUrl = options.baseUrl;
      this.headers = options.headers || {};
      this.timeout = options.timeout || 30000;
      this.retries = options.retries || 0;
      this.retryDelay = options.retryDelay || 1000;
      this.retryStatusCodes = options.retryStatusCodes || [408, 429, 500, 502, 503, 504];
      this.onRequest = options.onRequest;
      this.onResponse = options.onResponse;
      this.onError = options.onError;
      this.transformRequest = options.transformRequest;
      this.transformResponse = options.transformResponse;
    }
    
    /**
     * Set a header for all requests
     */
    setHeader(name: string, value: string): void {
      this.headers[name] = value;
    }
    
    /**
     * Remove a header
     */
    removeHeader(name: string): void {
      delete this.headers[name];
    }
    
    /**
     * Set the authorization header
     */
    setAuthToken(token: string, scheme: string = 'Bearer'): void {
      this.setHeader('Authorization', `${scheme} ${token}`);
    }
    
    /**
     * Clear the authorization header
     */
    clearAuthToken(): void {
      this.removeHeader('Authorization');
    }
    
    /**
     * Send a GET request
     */
    async get<T>(path: string, options: {
      params?: Record<string, string | number | boolean | undefined>;
      headers?: Record<string, string>;
      timeout?: number;
    } = {}): Promise<T> {
      const url = this.buildUrl(path, options.params);
      
      return this.request<T>({
        method: 'GET',
        url,
        headers: options.headers,
        timeout: options.timeout,
      });
    }
    
    /**
     * Send a POST request
     */
    async post<T>(path: string, data?: any, options: {
      params?: Record<string, string | number | boolean | undefined>;
      headers?: Record<string, string>;
      timeout?: number;
    } = {}): Promise<T> {
      const url = this.buildUrl(path, options.params);
      
      return this.request<T>({
        method: 'POST',
        url,
        data,
        headers: options.headers,
        timeout: options.timeout,
      });
    }
    
    /**
     * Send a PUT request
     */
    async put<T>(path: string, data?: any, options: {
      params?: Record<string, string | number | boolean | undefined>;
      headers?: Record<string, string>;
      timeout?: number;
    } = {}): Promise<T> {
      const url = this.buildUrl(path, options.params);
      
      return this.request<T>({
        method: 'PUT',
        url,
        data,
        headers: options.headers,
        timeout: options.timeout,
      });
    }
    
    /**
     * Send a PATCH request
     */
    async patch<T>(path: string, data?: any, options: {
      params?: Record<string, string | number | boolean | undefined>;
      headers?: Record<string, string>;
      timeout?: number;
    } = {}): Promise<T> {
      const url = this.buildUrl(path, options.params);
      
      return this.request<T>({
        method: 'PATCH',
        url,
        data,
        headers: options.headers,
        timeout: options.timeout,
      });
    }
    
    /**
     * Send a DELETE request
     */
    async delete<T>(path: string, options: {
      params?: Record<string, string | number | boolean | undefined>;
      data?: any;
      headers?: Record<string, string>;
      timeout?: number;
    } = {}): Promise<T> {
      const url = this.buildUrl(path, options.params);
      
      return this.request<T>({
        method: 'DELETE',
        url,
        data: options.data,
        headers: options.headers,
        timeout: options.timeout,
      });
    }
    
    /**
     * Send a HTTP request
     */
    private async request<T>(options: {
      method: string;
      url: string;
      data?: any;
      headers?: Record<string, string>;
      timeout?: number;
    }): Promise<T> {
      const { method, url, data, headers = {}, timeout = this.timeout } = options;
      
      const requestHeaders = { ...this.headers, ...headers };
      
      // Apply Content-Type header if not set and data is present
      if (data !== undefined && !requestHeaders['Content-Type']) {
        requestHeaders['Content-Type'] = 'application/json';
      }
      
      let requestBody: any = data;
      
      // Convert data to JSON if it's an object and Content-Type is application/json
      if (typeof data === 'object' && data !== null && requestHeaders['Content-Type'] === 'application/json') {
        requestBody = JSON.stringify(data);
      }
      
      const requestInfo = {
        url,
        method,
        headers: requestHeaders,
        body: requestBody,
      };
      
      // Transform request if needed
      if (this.transformRequest) {
        const transformedRequest = this.transformRequest(requestInfo);
        
        if (transformedRequest) {
          Object.assign(requestInfo, transformedRequest);
        }
      }
      
      // Call onRequest hook
      if (this.onRequest) {
        this.onRequest(requestInfo);
      }
      
      // Make the request with retries
      let lastError: Error | undefined;
      
      for (let attempt = 0; attempt <= this.retries; attempt++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);
          
          const response = await fetch(requestInfo.url, {
            method: requestInfo.method,
            headers: requestInfo.headers,
            body: requestInfo.body,
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          
          const responseHeaders: Record<string, string> = {};
          response.headers.forEach((value, key) => {
            responseHeaders[key] = value;
          });
          
          let responseBody: any;
          const contentType = response.headers.get('Content-Type') || '';
          
          if (contentType.includes('application/json')) {
            responseBody = await response.json();
          } else {
            responseBody = await response.text();
          }
          
          const responseInfo = {
            statusCode: response.status,
            headers: responseHeaders,
            body: responseBody,
          };
          
          // Transform response if needed
          if (this.transformResponse) {
            const transformedResponse = this.transformResponse(responseInfo);
            
            if (transformedResponse) {
              Object.assign(responseInfo, transformedResponse);
            }
          }
          
          // Call onResponse hook
          if (this.onResponse) {
            this.onResponse(responseInfo);
          }
          
          // Handle unsuccessful response
          if (!response.ok) {
            const error = new Error(`API request failed with status ${response.status}`);
            (error as any).statusCode = response.status;
            (error as any).response = responseInfo;
            
            // Check if we should retry
            if (attempt < this.retries && this.retryStatusCodes.includes(response.status)) {
              lastError = error;
              
              // Wait before retrying
              await new Promise(resolve => setTimeout(resolve, this.retryDelay * Math.pow(2, attempt)));
              continue;
            }
            
            // Call onError hook
            if (this.onError) {
              this.onError(error, { url: requestInfo.url, method: requestInfo.method });
            }
            
            throw error;
          }
          
          return responseInfo.body;
        } catch (error) {
          lastError = error as Error;
          
          // Handle timeout or network error
          if (error.name === 'AbortError') {
            const timeoutError = new Error(`API request timed out after ${timeout}ms`);
            
            // Call onError hook
            if (this.onError) {
              this.onError(timeoutError, { url: requestInfo.url, method: requestInfo.method });
            }
            
            throw timeoutError;
          }
          
          // Check if we should retry
          if (attempt < this.retries) {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, this.retryDelay * Math.pow(2, attempt)));
            continue;
          }
          
          // Call onError hook
          if (this.onError) {
            this.onError(error as Error, { url: requestInfo.url, method: requestInfo.method });
          }
          
          throw error;
        }
      }
      
      throw lastError || new Error('API request failed after retries');
    }
    
    /**
     * Build URL with query parameters
     */
    private buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
      let url = this.baseUrl;
      
      // Ensure base URL and path are properly joined
      if (!url.endsWith('/') && !path.startsWith('/')) {
        url += '/';
      } else if (url.endsWith('/') && path.startsWith('/')) {
        url = url.slice(0, -1);
      }
      
      url += path;
      
      // Add query parameters if provided
      if (params) {
        const queryParams = Object.entries(params)
          .filter(([_, value]) => value !== undefined)
          .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
          .join('&');
        
        if (queryParams) {
          url += url.includes('?') ? `&${queryParams}` : `?${queryParams}`;
        }
      }
      
      return url;
    }
  }
  
  /**
   * [API] GraphQL client for interacting with GraphQL APIs
   */
  export class GraphQLClient {
    private apiClient: ApiClient;
    private endpoint: string;
    
    constructor(options: {
      baseUrl: string;
      endpoint?: string;
      headers?: Record<string, string>;
      timeout?: number;
      retries?: number;
    }) {
      const { baseUrl, endpoint = '/graphql', headers = {}, timeout, retries } = options;
      
      this.endpoint = endpoint;
      this.apiClient = new ApiClient({
        baseUrl,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...headers,
        },
        timeout,
        retries,
      });
    }
    
    /**
     * Set authorization token
     */
    setAuthToken(token: string, scheme: string = 'Bearer'): void {
      this.apiClient.setAuthToken(token, scheme);
    }
    
    /**
     * Execute a GraphQL query
     */
    async query<T = any, V = Record<string, any>>(options: {
      query: string;
      variables?: V;
      operationName?: string;
    }): Promise<{ data?: T; errors?: any[] }> {
      const { query, variables, operationName } = options;
      
      return this.apiClient.post(this.endpoint, {
        query,
        variables,
        operationName,
      });
    }
    
    /**
     * Execute a GraphQL mutation
     */
    async mutate<T = any, V = Record<string, any>>(options: {
      mutation: string;
      variables?: V;
      operationName?: string;
    }): Promise<{ data?: T; errors?: any[] }> {
      const { mutation, variables, operationName } = options;
      
      return this.apiClient.post(this.endpoint, {
        query: mutation,
        variables,
        operationName,
      });
    }
    
    /**
     * Execute multiple GraphQL operations in a single request (batch)
     */
    async batch<T = any>(operations: Array<{
      query: string;
      variables?: Record<string, any>;
      operationName?: string;
    }>): Promise<Array<{ data?: T; errors?: any[] }>> {
      return this.apiClient.post(this.endpoint, operations);
    }
  }
  
  /**
   * [API] OAuth client for authentication
   */
  export class OAuthClient {
    private apiClient: ApiClient;
    private clientId: string;
    private clientSecret?: string;
    private redirectUri?: string;
    private tokenEndpoint: string;
    private authorizationEndpoint?: string;
    
    constructor(options: {
      baseUrl: string;
      clientId: string;
      clientSecret?: string;
      redirectUri?: string;
      tokenEndpoint?: string;
      authorizationEndpoint?: string;
    }) {
      const { 
        baseUrl, 
        clientId, 
        clientSecret, 
        redirectUri,
        tokenEndpoint = '/oauth/token',
        authorizationEndpoint = '/oauth/authorize',
      } = options;
      
      this.apiClient = new ApiClient({ baseUrl });
      this.clientId = clientId;
      this.clientSecret = clientSecret;
      this.redirectUri = redirectUri;
      this.tokenEndpoint = tokenEndpoint;
      this.authorizationEndpoint = authorizationEndpoint;
    }
    
    /**
     * Get authorization URL
     */
    getAuthorizationUrl(options: {
      scope?: string[];
      state?: string;
      responseType?: 'code' | 'token';
      codeChallenge?: string;
      codeChallengeMethod?: 'plain' | 'S256';
    } = {}): string {
      const {
        scope = [],
        state,
        responseType = 'code',
        codeChallenge,
        codeChallengeMethod,
      } = options;
      
      if (!this.redirectUri) {
        throw new Error('Redirect URI is required for authorization');
      }
      
      const params: Record<string, string> = {
        client_id: this.clientId,
        redirect_uri: this.redirectUri,
        response_type: responseType,
      };
      
      if (scope.length > 0) {
        params.scope = scope.join(' ');
      }
      
      if (state) {
        params.state = state;
      }
      
      if (codeChallenge) {
        params.code_challenge = codeChallenge;
        
        if (codeChallengeMethod) {
          params.code_challenge_method = codeChallengeMethod;
        }
      }
      
      const queryString = Object.entries(params)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
      
      return `${this.apiClient.baseUrl}${this.authorizationEndpoint}?${queryString}`;
    }
    
    /**
     * Exchange authorization code for tokens
     */
    async getTokenFromCode(code: string, options: {
      codeVerifier?: string;
    } = {}): Promise<{
      access_token: string;
      token_type: string;
      expires_in?: number;
      refresh_token?: string;
      scope?: string;
      [key: string]: any;
    }> {
      const { codeVerifier } = options;
      
      if (!this.redirectUri) {
        throw new Error('Redirect URI is required for token exchange');
      }
      
      const params: Record<string, string> = {
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.redirectUri,
        client_id: this.clientId,
      };
      
      if (this.clientSecret) {
        params.client_secret = this.clientSecret;
      }
      
      if (codeVerifier) {
        params.code_verifier = codeVerifier;
      }
      
      return this.apiClient.post(this.tokenEndpoint, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
    }
    
    /**
     * Get token using client credentials
     */
    async getTokenFromClientCredentials(options: {
      scope?: string[];
    } = {}): Promise<{
      access_token: string;
      token_type: string;
      expires_in?: number;
      scope?: string;
      [key: string]: any;
    }> {
      const { scope = [] } = options;
      
      if (!this.clientSecret) {
        throw new Error('Client secret is required for client credentials flow');
      }
      
      const params: Record<string, string> = {
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      };
      
      if (scope.length > 0) {
        params.scope = scope.join(' ');
      }
      
      return this.apiClient.post(this.tokenEndpoint, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
    }
    
    /**
     * Get token using password credentials
     */
    async getTokenFromPassword(username: string, password: string, options: {
      scope?: string[];
    } = {}): Promise<{
      access_token: string;
      token_type: string;
      expires_in?: number;
      refresh_token?: string;
      scope?: string;
      [key: string]: any;
    }> {
      const { scope = [] } = options;
      
      const params: Record<string, string> = {
        grant_type: 'password',
        username,
        password,
        client_id: this.clientId,
      };
      
      if (this.clientSecret) {
        params.client_secret = this.clientSecret;
      }
      
      if (scope.length > 0) {
        params.scope = scope.join(' ');
      }
      
      return this.apiClient.post(this.tokenEndpoint, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
    }
    
    /**
     * Refresh an expired token
     */
    async refreshToken(refreshToken: string): Promise<{
      access_token: string;
      token_type: string;
      expires_in?: number;
      refresh_token?: string;
      scope?: string;
      [key: string]: any;
    }> {
      const params: Record<string, string> = {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.clientId,
      };
      
      if (this.clientSecret) {
        params.client_secret = this.clientSecret;
      }
      
      return this.apiClient.post(this.tokenEndpoint, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
    }
  }
  
  /**
   * [API] Generate and validate a PKCE code challenge
   */
  export const pkceUtils = {
    /**
     * Generate a random code verifier
     */
    generateCodeVerifier: (length: number = 64): string => {
      const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
      let codeVerifier = '';
      
      const array = new Uint8Array(length);
      crypto.getRandomValues(array);
      
      for (let i = 0; i < length; i++) {
        codeVerifier += charset.charAt(array[i] % charset.length);
      }
      
      return codeVerifier;
    },
    
    /**
     * Generate a code challenge from a code verifier
     */
    generateCodeChallenge: async (codeVerifier: string, method: 'plain' | 'S256' = 'S256'): Promise<string> => {
      if (method === 'plain') {
        return codeVerifier;
      }
      
      // Use S256 method (SHA-256)
      const encoder = new TextEncoder();
      const data = encoder.encode(codeVerifier);
      const digest = await crypto.subtle.digest('SHA-256', data);
      
      // Convert to base64url encoding
      return btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    },
  };
  
  /**
   * [API] API rate limiter utility
   */
  export class ApiRateLimiter {
    private buckets: Map<string, {
      tokens: number;
      lastRefill: number;
      limit: number;
      interval: number;
    }> = new Map();
    
    /**
     * Create a rate limiter bucket
     */
    createBucket(name: string, options: {
      limit: number;
      interval: number; // milliseconds
    }): void {
      const { limit, interval } = options;
      
      this.buckets.set(name, {
        tokens: limit,
        lastRefill: Date.now(),
        limit,
        interval,
      });
    }
    
    /**
     * Check if a request can be made
     */
    canMakeRequest(bucketName: string, tokens: number = 1): boolean {
      const bucket = this.buckets.get(bucketName);
      
      if (!bucket) {
        throw new Error(`Bucket "${bucketName}" not found`);
      }
      
      this.refillBucket(bucket);
      
      return bucket.tokens >= tokens;
    }
    
    /**
     * Consume tokens from a bucket
     */
    consumeTokens(bucketName: string, tokens: number = 1): boolean {
      const bucket = this.buckets.get(bucketName);
      
      if (!bucket) {
        throw new Error(`Bucket "${bucketName}" not found`);
      }
      
      this.refillBucket(bucket);
      
      if (bucket.tokens < tokens) {
        return false;
      }
      
      bucket.tokens -= tokens;
      return true;
    }
    
    /**
     * Get the time until the next token is available
     */
    getTimeUntilNextToken(bucketName: string): number {
      const bucket = this.buckets.get(bucketName);
      
      if (!bucket) {
        throw new Error(`Bucket "${bucketName}" not found`);
      }
      
      this.refillBucket(bucket);
      
      if (bucket.tokens > 0) {
        return 0;
      }
      
      const timeSinceLastRefill = Date.now() - bucket.lastRefill;
      const timePerToken = bucket.interval / bucket.limit;
      
      return Math.max(0, timePerToken - timeSinceLastRefill);
    }
    
    /**
     * Reset a bucket to its initial state
     */
    resetBucket(bucketName: string): void {
      const bucket = this.buckets.get(bucketName);
      
      if (!bucket) {
        throw new Error(`Bucket "${bucketName}" not found`);
      }
      
      bucket.tokens = bucket.limit;
      bucket.lastRefill = Date.now();
    }
    
    /**
     * Refill a bucket based on elapsed time
     */
    private refillBucket(bucket: {
      tokens: number;
      lastRefill: number;
      limit: number;
      interval: number;
    }): void {
      const now = Date.now();
      const timeSinceLastRefill = now - bucket.lastRefill;
      
      if (timeSinceLastRefill <= 0) {
        return;
      }
      
      // Calculate tokens to add based on elapsed time
      const tokensToAdd = Math.floor((timeSinceLastRefill / bucket.interval) * bucket.limit);
      
      if (tokensToAdd > 0) {
        bucket.tokens = Math.min(bucket.limit, bucket.tokens + tokensToAdd);
        bucket.lastRefill = now;
      }
    }
  }
  
  /**
   * [API] API polling utility
   */
  export class ApiPoller<T> {
    private url: string;
    private apiClient: ApiClient;
    private interval: number;
    private maxAttempts: number;
    private successCondition: (response: T) => boolean;
    private onSuccess?: (response: T) => void;
    private onFailure?: (error: Error) => void;
    private onAttempt?: (response: T, attempt: number) => void;
    private pollId: any = null;
    private currentAttempt: number = 0;
    
    constructor(options: {
      url: string;
      apiClient: ApiClient;
      interval?: number; // milliseconds
      maxAttempts?: number;
      successCondition: (response: T) => boolean;
      onSuccess?: (response: T) => void;
      onFailure?: (error: Error) => void;
      onAttempt?: (response: T, attempt: number) => void;
    }) {
      const {
        url,
        apiClient,
        interval = 1000,
        maxAttempts = 10,
        successCondition,
        onSuccess,
        onFailure,
        onAttempt,
      } = options;
      
      this.url = url;
      this.apiClient = apiClient;
      this.interval = interval;
      this.maxAttempts = maxAttempts;
      this.successCondition = successCondition;
      this.onSuccess = onSuccess;
      this.onFailure = onFailure;
      this.onAttempt = onAttempt;
    }
    
    /**
     * Start polling
     */
    start(): void {
      if (this.pollId !== null) {
        return;
      }
      
      this.currentAttempt = 0;
      this.poll();
    }
    
    /**
     * Stop polling
     */
    stop(): void {
      if (this.pollId !== null) {
        clearTimeout(this.pollId);
        this.pollId = null;
      }
    }
    
    /**
     * Change the polling interval
     */
    setInterval(interval: number): void {
      this.interval = interval;
    }
    
    /**
     * Change the maximum number of attempts
     */
    setMaxAttempts(maxAttempts: number): void {
      this.maxAttempts = maxAttempts;
    }
    
    /**
     * Poll the API
     */
    private poll(): void {
      this.currentAttempt++;
      
      this.apiClient.get<T>(this.url)
        .then(response => {
          if (this.onAttempt) {
            this.onAttempt(response, this.currentAttempt);
          }
          
          if (this.successCondition(response)) {
            if (this.onSuccess) {
              this.onSuccess(response);
            }
            
            this.stop();
            return;
          }
          
          if (this.currentAttempt >= this.maxAttempts) {
            const error = new Error(`Polling exceeded max attempts (${this.maxAttempts})`);
            
            if (this.onFailure) {
              this.onFailure(error);
            }
            
            this.stop();
            return;
          }
          
          this.pollId = setTimeout(() => this.poll(), this.interval);
        })
        .catch(error => {
          if (this.currentAttempt >= this.maxAttempts) {
            if (this.onFailure) {
              this.onFailure(error);
            }
            
            this.stop();
            return;
          }
          
          this.pollId = setTimeout(() => this.poll(), this.interval);
        });
    }
  }
  
  /**
   * [API] API paging utility
   */
  export class ApiPager<T, P = any> {
    private url: string;
    private apiClient: ApiClient;
    private pageParam: string;
    private pageSizeParam: string;
    private pageSize: number;
    private totalPages: number | null = null;
    private currentPage: number = 0;
    private hasNextPageFn: (response: P) => boolean;
    private extractItemsFn: (response: P) => T[];
    private extractTotalPagesFn?: (response: P) => number;
    private params: Record<string, any> = {};
    
    constructor(options: {
      url: string;
      apiClient: ApiClient;
      pageParam?: string;
      pageSizeParam?: string;
      pageSize?: number;
      params?: Record<string, any>;
      hasNextPage: (response: P) => boolean;
      extractItems: (response: P) => T[];
      extractTotalPages?: (response: P) => number;
    }) {
      const {
        url,
        apiClient,
        pageParam = 'page',
        pageSizeParam = 'pageSize',
        pageSize = 20,
        params = {},
        hasNextPage,
        extractItems,
        extractTotalPages,
      } = options;
      
      this.url = url;
      this.apiClient = apiClient;
      this.pageParam = pageParam;
      this.pageSizeParam = pageSizeParam;
      this.pageSize = pageSize;
      this.params = params;
      this.hasNextPageFn = hasNextPage;
      this.extractItemsFn = extractItems;
      this.extractTotalPagesFn = extractTotalPages;
    }
    
    /**
     * Get the next page of items
     */
    async nextPage(): Promise<T[]> {
      this.currentPage++;
      
      const params = {
        ...this.params,
        [this.pageParam]: this.currentPage,
        [this.pageSizeParam]: this.pageSize,
      };
      
      const response = await this.apiClient.get<P>(this.url, { params });
      
      if (this.extractTotalPagesFn && this.totalPages === null) {
        this.totalPages = this.extractTotalPagesFn(response);
      }
      
      return this.extractItemsFn(response);
    }
    
    /**
     * Check if there is a next page
     */
    async hasNextPage(): Promise<boolean> {
      if (this.totalPages !== null) {
        return this.currentPage < this.totalPages;
      }
      
      const params = {
        ...this.params,
        [this.pageParam]: this.currentPage + 1,
        [this.pageSizeParam]: this.pageSize,
      };
      
      const response = await this.apiClient.get<P>(this.url, { params });
      
      return this.hasNextPageFn(response);
    }
    
    /**
     * Get all items by paging through all available pages
     */
    async getAllItems(): Promise<T[]> {
      let allItems: T[] = [];
      this.currentPage = 0;
      
      while (true) {
        const items = await this.nextPage();
        allItems = [...allItems, ...items];
        
        if (!await this.hasNextPage()) {
          break;
        }
      }
      
      return allItems;
    }
    
    /**
     * Reset the pager to the first page
     */
    reset(): void {
      this.currentPage = 0;
      this.totalPages = null;
    }
    
    /**
     * Set additional parameters for the requests
     */
    setParams(params: Record<string, any>): void {
      this.params = params;
      this.reset();
    }
    
    /**
     * Change the page size
     */
    setPageSize(pageSize: number): void {
      this.pageSize = pageSize;
      this.reset();
    }
  }
  
  /**
   * Helper function for parsing values from query strings
   */
  function parseValue(value: string): any {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null') return null;
    if (value === 'undefined') return undefined;
    
    const numberValue = Number(value);
    if (!isNaN(numberValue) && /^-?\d+(\.\d+)?$/.test(value)) {
      return numberValue;
    }
    
    return value;
  }
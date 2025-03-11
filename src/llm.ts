// ===================================================
// LLM MANAGEMENT 
// ===================================================

/**
 * [LLM] Interface for basic language model configuration
 */
export interface ModelConfig {
    modelId: string;
    provider: 'openai' | 'anthropic' | 'local' | 'huggingface' | 'azure' | string;
    apiKey?: string;
    apiUrl?: string;
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    contextWindow?: number;
    extraParams?: Record<string, any>;
  }
  
  /**
   * [LLM] Message format for chat history
   */
  export interface ChatMessage {
    role: 'system' | 'user' | 'assistant' | 'tool' | 'function' | string;
    content: string;
    id?: string;
    timestamp?: string;
    name?: string;
    toolCalls?: any[];
    toolResults?: any[];
    metadata?: Record<string, any>;
  }
  
  /**
   * [LLM] Result of a model inference
   */
  export interface InferenceResult {
    text: string;
    tokens: {
      completion: number;
      prompt: number;
      total: number;
    };
    finishReason: 'stop' | 'length' | 'content_filter' | 'error' | string;
    modelId: string;
    duration: number;
    rawResponse?: any;
  }
  
  /**
   * [LLM] Streaming event for model inference
   */
  export interface StreamingEvent {
    type: 'text' | 'error' | 'done';
    text?: string;
    error?: Error;
    finishReason?: string;
    tokens?: number;
  }
  
  /**
   * [LLM] Client interface for language model APIs
   */
  export interface LLMClient {
    complete(prompt: string, options?: Partial<ModelConfig>): Promise<InferenceResult>;
    completeStreaming(prompt: string, options?: Partial<ModelConfig>): AsyncGenerator<StreamingEvent>;
    chat(messages: ChatMessage[], options?: Partial<ModelConfig>): Promise<InferenceResult>;
    chatStreaming(messages: ChatMessage[], options?: Partial<ModelConfig>): AsyncGenerator<StreamingEvent>;
  }
  
  /**
   * [LLM] OpenAI API client implementation
   */
  export class OpenAIClient implements LLMClient {
    private readonly defaultConfig: ModelConfig;
    
    constructor(config: ModelConfig) {
          const { modelId, provider, ...rest } = config;
          this.defaultConfig = {
            modelId: modelId ?? 'gpt-3.5-turbo',
            provider: 'openai',
            maxTokens: 1000,
            temperature: 0.7,
            topP: 1.0,
            ...rest,
          };
        }
    
    /**
     * Complete a prompt with the OpenAI API
     */
    async complete(prompt: string, options?: Partial<ModelConfig>): Promise<InferenceResult> {
      const config = { ...this.defaultConfig, ...options };
      const startTime = Date.now();
      
      const requestBody = {
        model: config.modelId,
        prompt,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        top_p: config.topP,
        ...config.extraParams,
      };
      
      const response = await fetch(`${config.apiUrl || 'https://api.openai.com/v1'}/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${error.error?.message || JSON.stringify(error)}`);
      }
      
      const data = await response.json();
      const duration = Date.now() - startTime;
      
      return {
        text: data.choices[0].text,
        tokens: {
          completion: data.usage.completion_tokens,
          prompt: data.usage.prompt_tokens,
          total: data.usage.total_tokens,
        },
        finishReason: data.choices[0].finish_reason,
        modelId: config.modelId,
        duration,
        rawResponse: data,
      };
    }
    
    /**
     * Complete a prompt with the OpenAI API with streaming
     */
    async *completeStreaming(prompt: string, options?: Partial<ModelConfig>): AsyncGenerator<StreamingEvent> {
      const config = { ...this.defaultConfig, ...options };
      
      const requestBody = {
        model: config.modelId,
        prompt,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        top_p: config.topP,
        stream: true,
        ...config.extraParams,
      };
      
      const response = await fetch(`${config.apiUrl || 'https://api.openai.com/v1'}/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${error.error?.message || JSON.stringify(error)}`);
      }
      
      if (!response.body) {
        throw new Error('Response body is null');
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let totalTokens = 0;
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            yield { type: 'done' };
            break;
          }
          
          buffer += decoder.decode(value, { stream: true });
          
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;
            
            if (trimmedLine.startsWith('data: ')) {
              try {
                const json = JSON.parse(trimmedLine.slice(6));
                
                if (json.choices && json.choices[0]) {
                  const { text, finish_reason } = json.choices[0];
                  
                  if (text) {
                    totalTokens++;
                    yield { type: 'text', text, tokens: totalTokens };
                  }
                  
                  if (finish_reason) {
                    yield { type: 'done', finishReason: finish_reason };
                  }
                }
              } catch (error) {
                console.error('Error parsing streaming JSON:', error);
              }
            }
          }
        }
      } catch (error) {
        yield { type: 'error', error: error as Error };
        throw error;
      } finally {
        reader.releaseLock();
      }
    }
    
    /**
     * Chat with the OpenAI API
     */
    async chat(messages: ChatMessage[], options?: Partial<ModelConfig>): Promise<InferenceResult> {
      const config = { ...this.defaultConfig, ...options };
      const startTime = Date.now();
      
      const formattedMessages = messages.map(message => ({
        role: message.role,
        content: message.content,
        ...(message.name ? { name: message.name } : {}),
      }));
      
      const requestBody = {
        model: config.modelId,
        messages: formattedMessages,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        top_p: config.topP,
        ...config.extraParams,
      };
      
      const response = await fetch(`${config.apiUrl || 'https://api.openai.com/v1'}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${error.error?.message || JSON.stringify(error)}`);
      }
      
      const data = await response.json();
      const duration = Date.now() - startTime;
      
      return {
        text: data.choices[0].message.content,
        tokens: {
          completion: data.usage.completion_tokens,
          prompt: data.usage.prompt_tokens,
          total: data.usage.total_tokens,
        },
        finishReason: data.choices[0].finish_reason,
        modelId: config.modelId,
        duration,
        rawResponse: data,
      };
    }
    
    /**
     * Chat with the OpenAI API with streaming
     */
    async *chatStreaming(messages: ChatMessage[], options?: Partial<ModelConfig>): AsyncGenerator<StreamingEvent> {
      const config = { ...this.defaultConfig, ...options };
      
      const formattedMessages = messages.map(message => ({
        role: message.role,
        content: message.content,
        ...(message.name ? { name: message.name } : {}),
      }));
      
      const requestBody = {
        model: config.modelId,
        messages: formattedMessages,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        top_p: config.topP,
        stream: true,
        ...config.extraParams,
      };
      
      const response = await fetch(`${config.apiUrl || 'https://api.openai.com/v1'}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${error.error?.message || JSON.stringify(error)}`);
      }
      
      if (!response.body) {
        throw new Error('Response body is null');
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let totalTokens = 0;
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            yield { type: 'done' };
            break;
          }
          
          buffer += decoder.decode(value, { stream: true });
          
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;
            
            if (trimmedLine.startsWith('data: ')) {
              try {
                const json = JSON.parse(trimmedLine.slice(6));
                
                if (json.choices && json.choices[0]) {
                  const delta = json.choices[0].delta?.content;
                  const finishReason = json.choices[0].finish_reason;
                  
                  if (delta) {
                    totalTokens++;
                    yield { type: 'text', text: delta, tokens: totalTokens };
                  }
                  
                  if (finishReason) {
                    yield { type: 'done', finishReason };
                  }
                }
              } catch (error) {
                console.error('Error parsing streaming JSON:', error);
              }
            }
          }
        }
      } catch (error) {
        yield { type: 'error', error: error as Error };
        throw error;
      } finally {
        reader.releaseLock();
      }
    }
  }
  
  /**
   * [LLM] Anthropic API client implementation
   */
  export class AnthropicClient implements LLMClient {
    private readonly defaultConfig: ModelConfig;
    
    constructor(config: ModelConfig) {
          const { modelId, provider, ...rest } = config;
          this.defaultConfig = {
            modelId: modelId || 'claude-3-opus-20240229',
            provider: 'anthropic',
            maxTokens: 1000,
            temperature: 0.7,
            topP: 1.0,
            ...rest,
          };
        }
    
    /**
     * Complete a prompt with the Anthropic API
     * Note: Anthropic uses chat-only API, so we wrap the prompt in a message
     */
    async complete(prompt: string, options?: Partial<ModelConfig>): Promise<InferenceResult> {
      const messages: ChatMessage[] = [
        { role: 'user', content: prompt }
      ];
      
      return this.chat(messages, options);
    }
    
    /**
     * Complete a prompt with the Anthropic API with streaming
     */
    async *completeStreaming(prompt: string, options?: Partial<ModelConfig>): AsyncGenerator<StreamingEvent> {
      const messages: ChatMessage[] = [
        { role: 'user', content: prompt }
      ];
      
      yield* this.chatStreaming(messages, options);
    }
    
    /**
     * Chat with the Anthropic API
     */
    async chat(messages: ChatMessage[], options?: Partial<ModelConfig>): Promise<InferenceResult> {
      const config = { ...this.defaultConfig, ...options };
      const startTime = Date.now();
      
      // Convert to Anthropic message format
      const formattedMessages = messages.map(message => {
        if (message.role === 'system') {
          return { role: 'system', content: message.content };
        } else if (message.role === 'assistant') {
          return { role: 'assistant', content: message.content };
        } else {
          // Default to user for other roles
          return { role: 'user', content: message.content };
        }
      });
      
      const requestBody = {
        model: config.modelId,
        messages: formattedMessages,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        top_p: config.topP,
        ...config.extraParams,
      };
      
      const response = await fetch(`${config.apiUrl || 'https://api.anthropic.com/v1'}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Anthropic API error: ${error.error?.message || JSON.stringify(error)}`);
      }
      
      const data = await response.json();
      const duration = Date.now() - startTime;
      
      return {
        text: data.content[0]?.text || '',
        tokens: {
          completion: data.usage?.output_tokens || 0,
          prompt: data.usage?.input_tokens || 0,
          total: (data.usage?.output_tokens || 0) + (data.usage?.input_tokens || 0),
        },
        finishReason: data.stop_reason || 'stop',
        modelId: config.modelId,
        duration,
        rawResponse: data,
      };
    }
    
    /**
     * Chat with the Anthropic API with streaming
     */
    async *chatStreaming(messages: ChatMessage[], options?: Partial<ModelConfig>): AsyncGenerator<StreamingEvent> {
      const config = { ...this.defaultConfig, ...options };
      
      // Convert to Anthropic message format
      const formattedMessages = messages.map(message => {
        if (message.role === 'system') {
          return { role: 'system', content: message.content };
        } else if (message.role === 'assistant') {
          return { role: 'assistant', content: message.content };
        } else {
          // Default to user for other roles
          return { role: 'user', content: message.content };
        }
      });
      
      const requestBody = {
        model: config.modelId,
        messages: formattedMessages,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        top_p: config.topP,
        stream: true,
        ...config.extraParams,
      };
      
      const response = await fetch(`${config.apiUrl || 'https://api.anthropic.com/v1'}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Anthropic API error: ${error.error?.message || JSON.stringify(error)}`);
      }
      
      if (!response.body) {
        throw new Error('Response body is null');
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let totalTokens = 0;
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            yield { type: 'done' };
            break;
          }
          
          buffer += decoder.decode(value, { stream: true });
          
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;
            
            if (trimmedLine.startsWith('data: ')) {
              try {
                const json = JSON.parse(trimmedLine.slice(6));
                
                if (json.type === 'content_block_delta') {
                  const delta = json.delta?.text;
                  
                  if (delta) {
                    totalTokens++;
                    yield { type: 'text', text: delta, tokens: totalTokens };
                  }
                } else if (json.type === 'message_stop') {
                  yield { type: 'done', finishReason: json.message_stop?.stop_reason || 'stop' };
                }
              } catch (error) {
                console.error('Error parsing streaming JSON:', error);
              }
            }
          }
        }
      } catch (error) {
        yield { type: 'error', error: error as Error };
        throw error;
      } finally {
        reader.releaseLock();
      }
    }
  }
  
  /**
   * [LLM] Factory function to create appropriate LLM client
   */
  export const createLLMClient = (config: ModelConfig): LLMClient => {
    switch (config.provider) {
      case 'openai':
        return new OpenAIClient(config);
      case 'anthropic':
        return new AnthropicClient(config);
      default:
        throw new Error(`Unsupported LLM provider: ${config.provider}`);
    }
  };
  
  /**
   * [LLM] Chat context with message history
   */
  export class ChatContext {
    private messages: ChatMessage[] = [];
    private readonly maxMessagesCount?: number;
    private readonly maxTokensEstimate?: number;
    
    constructor(options: {
      initialMessages?: ChatMessage[];
      maxMessagesCount?: number;
      maxTokensEstimate?: number;
    } = {}) {
      this.messages = options.initialMessages || [];
      this.maxMessagesCount = options.maxMessagesCount;
      this.maxTokensEstimate = options.maxTokensEstimate;
    }
    
    /**
     * Add a message to the chat history
     */
    addMessage(message: ChatMessage): void {
      this.messages.push({
        ...message,
        id: message.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        timestamp: message.timestamp || new Date().toISOString(),
      });
      
      this.trimHistory();
    }
    
    /**
     * Add a system message to the chat history
     */
    addSystemMessage(content: string): void {
      this.addMessage({
        role: 'system',
        content,
      });
    }
    
    /**
     * Add a user message to the chat history
     */
    addUserMessage(content: string): void {
      this.addMessage({
        role: 'user',
        content,
      });
    }
    
    /**
     * Add an assistant message to the chat history
     */
    addAssistantMessage(content: string): void {
      this.addMessage({
        role: 'assistant',
        content,
      });
    }
    
    /**
     * Get all messages in the chat history
     */
    getMessages(): ChatMessage[] {
      return [...this.messages];
    }
    
    /**
     * Clear the chat history
     */
    clearMessages(): void {
      this.messages = [];
    }
    
    /**
     * Get the system message
     */
    getSystemMessage(): ChatMessage | undefined {
      return this.messages.find(message => message.role === 'system');
    }
    
    /**
     * Trim the chat history if it exceeds limits
     */
    private trimHistory(): void {
      if (this.maxMessagesCount && this.messages.length > this.maxMessagesCount) {
        // Keep the system message if present
        const systemMessage = this.getSystemMessage();
        
        if (systemMessage) {
          // Remove oldest non-system messages
          const nonSystemMessages = this.messages.filter(message => message.role !== 'system');
          const messagesToKeep = nonSystemMessages.slice(-this.maxMessagesCount + 1);
          
          this.messages = [systemMessage, ...messagesToKeep];
        } else {
          // No system message, just keep the most recent messages
          this.messages = this.messages.slice(-this.maxMessagesCount);
        }
      }
      
      // TODO: Implement token-based trimming if maxTokensEstimate is set
    }
  }
  
  /**
   * [LLM] Chat manager for handling conversations with models
   */
  export class ChatManager {
    private readonly client: LLMClient;
    private readonly context: ChatContext;
    private readonly config: ModelConfig;
    
    constructor(client: LLMClient, context: ChatContext, config: ModelConfig) {
      this.client = client;
      this.context = context;
      this.config = config;
    }
    
    /**
     * Send a user message and get a response
     */
    async sendMessage(content: string, options?: {
      streamingCallback?: (event: StreamingEvent) => void;
      modelOptions?: Partial<ModelConfig>;
    }): Promise<string> {
      // Add user message to context
      this.context.addUserMessage(content);
      
      // Get all messages for context
      const messages = this.context.getMessages();
      
      // Handle streaming if callback is provided
      if (options?.streamingCallback) {
        let fullResponse = '';
        
        for await (const event of this.client.chatStreaming(messages, options.modelOptions)) {
          if (event.type === 'text' && event.text) {
            fullResponse += event.text;
          }
          
          options.streamingCallback(event);
        }
        
        // Add assistant response to context
        this.context.addAssistantMessage(fullResponse);
        
        return fullResponse;
      } else {
        // Non-streaming response
        const response = await this.client.chat(messages, options?.modelOptions);
        
        // Add assistant response to context
        this.context.addAssistantMessage(response.text);
        
        return response.text;
      }
    }
    
    /**
     * Get the current chat context
     */
    getContext(): ChatContext {
      return this.context;
    }
    
    /**
     * Export chat history to JSON
     */
    exportChatHistory(): string {
      return JSON.stringify(this.context.getMessages(), null, 2);
    }
    
    /**
     * Import chat history from JSON
     */
    importChatHistory(json: string): void {
      try {
        const messages = JSON.parse(json) as ChatMessage[];
        this.context.clearMessages();
        
        for (const message of messages) {
          this.context.addMessage(message);
        }
      } catch (error) {
        throw new Error(`Failed to import chat history: ${error}`);
      }
    }
  }
  
  /**
   * [LLM] LLM Model Manager for loading and using models
   */
  export class ModelManager {
    private models: Map<string, ModelConfig> = new Map();
    
    /**
     * Register a model configuration
     */
    registerModel(config: ModelConfig): void {
      this.models.set(config.modelId, config);
    }
    
    /**
     * Get a model configuration
     */
    getModel(modelId: string): ModelConfig | undefined {
      return this.models.get(modelId);
    }
    
    /**
     * Get all registered models
     */
    getModels(): ModelConfig[] {
      return Array.from(this.models.values());
    }
    
    /**
     * Create a client for a specific model
     */
    createClient(modelId: string): LLMClient {
      const config = this.getModel(modelId);
      
      if (!config) {
        throw new Error(`Model not found: ${modelId}`);
      }
      
      return createLLMClient(config);
    }
    
    /**
     * Create a chat manager for a specific model
     */
    createChatManager(modelId: string, context?: ChatContext): ChatManager {
      const client = this.createClient(modelId);
      const config = this.getModel(modelId)!;
      const chatContext = context || new ChatContext();
      
      return new ChatManager(client, chatContext, config);
    }
  }
  
  /**
   * [LLM] Node.js LLama.cpp client implementation
   * Requires node-llama-cpp package to be installed
   */
  export class NodeLLamaCppClient implements LLMClient {
    private llama: any;  // Type would be from node-llama-cpp
    private readonly defaultConfig: ModelConfig;
    
    constructor(llama: any, config: ModelConfig) {
              this.llama = llama;
              const { provider, ...rest } = config;
              this.defaultConfig = {
                provider: 'local',
                maxTokens: 1000,
                temperature: 0.7,
                topP: 1.0,
                ...rest,
              };
            }
    
    /**
     * Complete a prompt with llama.cpp
     */
    async complete(prompt: string, options?: Partial<ModelConfig>): Promise<InferenceResult> {
      const config = { ...this.defaultConfig, ...options };
      const startTime = Date.now();
      
      const result = await this.llama.completion({
        prompt,
        maxTokens: config.maxTokens,
        temperature: config.temperature,
        topP: config.topP,
        ...config.extraParams,
      });
      
      const duration = Date.now() - startTime;
      
      return {
        text: result.text,
        tokens: {
          completion: result.usage?.completion_tokens || 0,
          prompt: result.usage?.prompt_tokens || 0,
          total: result.usage?.total_tokens || 0,
        },
        finishReason: result.reason || 'stop',
        modelId: config.modelId,
        duration,
        rawResponse: result,
      };
    }
    
    /**
     * Complete a prompt with llama.cpp with streaming
     */
    async *completeStreaming(prompt: string, options?: Partial<ModelConfig>): AsyncGenerator<StreamingEvent> {
      const config = { ...this.defaultConfig, ...options };
      
      try {
        const stream = await this.llama.completion({
          prompt,
          maxTokens: config.maxTokens,
          temperature: config.temperature,
          topP: config.topP,
          stream: true,
          ...config.extraParams,
        });
        
        for await (const chunk of stream) {
          yield {
            type: 'text',
            text: chunk.text,
            tokens: chunk.usage?.completion_tokens,
          };
        }
        
        yield { type: 'done' };
      } catch (error) {
        yield { type: 'error', error: error as Error };
        throw error;
      }
    }
    
    /**
     * Chat with llama.cpp
     */
    async chat(messages: ChatMessage[], options?: Partial<ModelConfig>): Promise<InferenceResult> {
      const config = { ...this.defaultConfig, ...options };
      const startTime = Date.now();
      
      // Convert messages to a single prompt based on a chat template
      // This is a very basic implementation - in a real app, you would use
      // the correct chat template for your specific model
      let prompt = '';
      
      for (const message of messages) {
        if (message.role === 'system') {
          prompt += `<|system|>\n${message.content}\n`;
        } else if (message.role === 'user') {
          prompt += `<|user|>\n${message.content}\n`;
        } else if (message.role === 'assistant') {
          prompt += `<|assistant|>\n${message.content}\n`;
        }
      }
      
      prompt += `<|assistant|>\n`;
      
      const result = await this.llama.completion({
        prompt,
        maxTokens: config.maxTokens,
        temperature: config.temperature,
        topP: config.topP,
        ...config.extraParams,
      });
      
      const duration = Date.now() - startTime;
      
      return {
        text: result.text,
        tokens: {
          completion: result.usage?.completion_tokens || 0,
          prompt: result.usage?.prompt_tokens || 0,
          total: result.usage?.total_tokens || 0,
        },
        finishReason: result.reason || 'stop',
        modelId: config.modelId,
        duration,
        rawResponse: result,
      };
    }
    
    /**
     * Chat with llama.cpp with streaming
     */
    async *chatStreaming(messages: ChatMessage[], options?: Partial<ModelConfig>): AsyncGenerator<StreamingEvent> {
      const config = { ...this.defaultConfig, ...options };
      
      // Convert messages to a single prompt based on a chat template
      let prompt = '';
      
      for (const message of messages) {
        if (message.role === 'system') {
          prompt += `<|system|>\n${message.content}\n`;
        } else if (message.role === 'user') {
          prompt += `<|user|>\n${message.content}\n`;
        } else if (message.role === 'assistant') {
          prompt += `<|assistant|>\n${message.content}\n`;
        }
      }
      
      prompt += `<|assistant|>\n`;
      
      try {
        const stream = await this.llama.completion({
          prompt,
          maxTokens: config.maxTokens,
          temperature: config.temperature,
          topP: config.topP,
          stream: true,
          ...config.extraParams,
        });
        
        for await (const chunk of stream) {
          yield {
            type: 'text',
            text: chunk.text,
            tokens: chunk.usage?.completion_tokens,
          };
        }
        
        yield { type: 'done' };
      } catch (error) {
        yield { type: 'error', error: error as Error };
        throw error;
      }
    }
  }
  
  /**
   * [LLM] Chain of thought prompt wrapper
   */
  export const chainOfThoughtPrompt = (question: string): string => {
    return `Question: ${question}\n\nLet's think through this step by step:`;
  };
  
  /**
   * [LLM] Helper for forcing chain of thought reasoning
   */
  export const forceChainOfThought = (client: LLMClient, question: string, options?: Partial<ModelConfig>): Promise<InferenceResult> => {
    const prompt = chainOfThoughtPrompt(question);
    return client.complete(prompt, options);
  };
  
  /**
   * [LLM] Database chat memory adapter interface
   */
  export interface ChatMemoryAdapter {
    saveChat(userId: string, conversation: ChatMessage[]): Promise<void>;
    loadChat(userId: string): Promise<ChatMessage[]>;
    deleteChat(userId: string): Promise<void>;
    listUserChats(userId: string): Promise<{ id: string; preview: string; updatedAt: string }[]>;
  }
  
  /**
   * [LLM] Memory adapter for chat storage in IndexedDB
   */
  export class IndexedDBChatMemoryAdapter implements ChatMemoryAdapter {
    private readonly dbName: string;
    private readonly storeName: string;
    private db: IDBDatabase | null = null;
    private initPromise: Promise<void>;
    
    constructor(dbName: string = 'chat_memory_db', storeName: string = 'chats') {
      this.dbName = dbName;
      this.storeName = storeName;
      this.initPromise = this.initDb();
    }
    
    private async initDb(): Promise<void> {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, 1);
        
        request.onerror = (event) => {
          console.error('Failed to open IndexedDB:', event);
          reject(new Error('Failed to open IndexedDB'));
        };
        
        request.onsuccess = (event) => {
          this.db = (event.target as IDBOpenDBRequest).result;
          resolve();
        };
        
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          
          if (!db.objectStoreNames.contains(this.storeName)) {
            const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
            store.createIndex('userId', 'userId', { unique: false });
            store.createIndex('updatedAt', 'updatedAt', { unique: false });
          }
        };
      });
    }
    
    async saveChat(userId: string, conversation: ChatMessage[]): Promise<void> {
      if (!this.db) {
        await this.initPromise;
      }
      
      return new Promise((resolve, reject) => {
        try {
          const transaction = this.db!.transaction(this.storeName, 'readwrite');
          const store = transaction.objectStore(this.storeName);
          
          const chatId = `chat_${userId}_${Date.now()}`;
          const preview = this.generateChatPreview(conversation);
          
          const data = {
            id: chatId,
            userId,
            conversation,
            preview,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          
          const request = store.put(data);
          
          request.onsuccess = () => resolve();
          request.onerror = (event) => {
            console.error('Failed to save chat:', event);
            reject(new Error('Failed to save chat'));
          };
        } catch (error) {
          console.error('Error accessing IndexedDB:', error);
          reject(error);
        }
      });
    }
    
    async loadChat(chatId: string): Promise<ChatMessage[]> {
      if (!this.db) {
        await this.initPromise;
      }
      
      return new Promise((resolve, reject) => {
        try {
          const transaction = this.db!.transaction(this.storeName, 'readonly');
          const store = transaction.objectStore(this.storeName);
          
          const request = store.get(chatId);
          
          request.onsuccess = (event) => {
            const data = (event.target as IDBRequest).result;
            
            if (data) {
              resolve(data.conversation as ChatMessage[]);
            } else {
              resolve([]);
            }
          };
          
          request.onerror = (event) => {
            console.error('Failed to load chat:', event);
            reject(new Error('Failed to load chat'));
          };
        } catch (error) {
          console.error('Error accessing IndexedDB:', error);
          reject(error);
        }
      });
    }
    
    async deleteChat(chatId: string): Promise<void> {
      if (!this.db) {
        await this.initPromise;
      }
      
      return new Promise((resolve, reject) => {
        try {
          const transaction = this.db!.transaction(this.storeName, 'readwrite');
          const store = transaction.objectStore(this.storeName);
          
          const request = store.delete(chatId);
          
          request.onsuccess = () => resolve();
          request.onerror = (event) => {
            console.error('Failed to delete chat:', event);
            reject(new Error('Failed to delete chat'));
          };
        } catch (error) {
          console.error('Error accessing IndexedDB:', error);
          reject(error);
        }
      });
    }
    
    async listUserChats(userId: string): Promise<{ id: string; preview: string; updatedAt: string }[]> {
      if (!this.db) {
        await this.initPromise;
      }
      
      return new Promise((resolve, reject) => {
        try {
          const transaction = this.db!.transaction(this.storeName, 'readonly');
          const store = transaction.objectStore(this.storeName);
          const index = store.index('userId');
          
          const request = index.openCursor(IDBKeyRange.only(userId));
          const chats: { id: string; preview: string; updatedAt: string }[] = [];
          
          request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;
            
            if (cursor) {
              const data = cursor.value;
              chats.push({
                id: data.id,
                preview: data.preview,
                updatedAt: data.updatedAt,
              });
              
              cursor.continue();
            } else {
              // Sort by updatedAt (newest first)
              chats.sort((a, b) => {
                return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
              });
              
              resolve(chats);
            }
          };
          
          request.onerror = (event) => {
            console.error('Failed to list user chats:', event);
            reject(new Error('Failed to list user chats'));
          };
        } catch (error) {
          console.error('Error accessing IndexedDB:', error);
          reject(error);
        }
      });
    }
    
    private generateChatPreview(conversation: ChatMessage[]): string {
      // Find the most recent user message
      for (let i = conversation.length - 1; i >= 0; i--) {
        if (conversation[i].role === 'user') {
          let preview = conversation[i].content;
          
          // Truncate to a reasonable length
          if (preview.length > 50) {
            preview = preview.substring(0, 50) + '...';
          }
          
          return preview;
        }
      }
      
      return 'Empty conversation';
    }
  }
  
  /**
   * [LLM] Memory adapter for chat storage in a server database
   */
  export class ApiChatMemoryAdapter implements ChatMemoryAdapter {
    private readonly apiUrl: string;
    private readonly apiKey?: string;
    
    constructor(apiUrl: string, apiKey?: string) {
      this.apiUrl = apiUrl;
      this.apiKey = apiKey;
    }
    
    async saveChat(userId: string, conversation: ChatMessage[]): Promise<void> {
      const response = await fetch(`${this.apiUrl}/chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify({
          userId,
          conversation,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`API error: ${error.message || JSON.stringify(error)}`);
      }
    }
    
    async loadChat(chatId: string): Promise<ChatMessage[]> {
      const response = await fetch(`${this.apiUrl}/chats/${chatId}`, {
        headers: {
          ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {}),
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`API error: ${error.message || JSON.stringify(error)}`);
      }
      
      const data = await response.json();
      return data.conversation as ChatMessage[];
    }
    
    async deleteChat(chatId: string): Promise<void> {
      const response = await fetch(`${this.apiUrl}/chats/${chatId}`, {
        method: 'DELETE',
        headers: {
          ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {}),
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`API error: ${error.message || JSON.stringify(error)}`);
      }
    }
    
    async listUserChats(userId: string): Promise<{ id: string; preview: string; updatedAt: string }[]> {
      const response = await fetch(`${this.apiUrl}/users/${userId}/chats`, {
        headers: {
          ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {}),
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`API error: ${error.message || JSON.stringify(error)}`);
      }
      
      const data = await response.json();
      return data.chats;
    }
  }
  
  /**
   * [LLM] Statistics tracker for model performance
   */
  export class ModelPerformanceTracker {
    private performances: Map<string, {
      totalRequests: number;
      totalTokens: number;
      totalTime: number;
      errors: number;
      responseTimes: number[];
    }> = new Map();
    
    /**
     * Track a model inference result
     */
    trackInference(result: InferenceResult): void {
      const stats = this.getModelStats(result.modelId);
      
      stats.totalRequests++;
      stats.totalTokens += result.tokens.total;
      stats.totalTime += result.duration;
      stats.responseTimes.push(result.duration);
      
      this.performances.set(result.modelId, stats);
    }
    
    /**
     * Track a model inference error
     */
    trackError(modelId: string, duration: number): void {
      const stats = this.getModelStats(modelId);
      
      stats.totalRequests++;
      stats.errors++;
      stats.totalTime += duration;
      stats.responseTimes.push(duration);
      
      this.performances.set(modelId, stats);
    }
    
    /**
     * Get performance statistics for a model
     */
    getModelPerformance(modelId: string): {
      totalRequests: number;
      totalTokens: number;
      averageResponseTime: number;
      errorRate: number;
      tokensPerSecond: number;
      p50ResponseTime: number;
      p90ResponseTime: number;
      p99ResponseTime: number;
    } {
      const stats = this.getModelStats(modelId);
      const totalRequests = stats.totalRequests;
      const totalTokens = stats.totalTokens;
      const totalTime = stats.totalTime;
      const errors = stats.errors;
      
      if (totalRequests === 0) {
        return {
          totalRequests: 0,
          totalTokens: 0,
          averageResponseTime: 0,
          errorRate: 0,
          tokensPerSecond: 0,
          p50ResponseTime: 0,
          p90ResponseTime: 0,
          p99ResponseTime: 0,
        };
      }
      
      const averageResponseTime = totalTime / totalRequests;
      const errorRate = errors / totalRequests;
      const tokensPerSecond = totalTokens / (totalTime / 1000);
      
      // Calculate percentiles
      const sortedTimes = [...stats.responseTimes].sort((a, b) => a - b);
      const p50Index = Math.floor(sortedTimes.length * 0.5);
      const p90Index = Math.floor(sortedTimes.length * 0.9);
      const p99Index = Math.floor(sortedTimes.length * 0.99);
      
      return {
        totalRequests,
        totalTokens,
        averageResponseTime,
        errorRate,
        tokensPerSecond,
        p50ResponseTime: sortedTimes[p50Index] || 0,
        p90ResponseTime: sortedTimes[p90Index] || 0,
        p99ResponseTime: sortedTimes[p99Index] || 0,
      };
    }
    
    /**
     * Get performance statistics for all models
     */
    getAllModelPerformances(): Record<string, {
      totalRequests: number;
      totalTokens: number;
      averageResponseTime: number;
      errorRate: number;
      tokensPerSecond: number;
      p50ResponseTime: number;
      p90ResponseTime: number;
      p99ResponseTime: number;
    }> {
      const result: Record<string, any> = {};
      
      for (const modelId of this.performances.keys()) {
        result[modelId] = this.getModelPerformance(modelId);
      }
      
      return result;
    }
    
    /**
     * Reset statistics for a model
     */
    resetModelStats(modelId: string): void {
      this.performances.delete(modelId);
    }
    
    /**
     * Reset all statistics
     */
    resetAllStats(): void {
      this.performances.clear();
    }
    
    /**
     * Get raw model statistics
     */
    private getModelStats(modelId: string): {
      totalRequests: number;
      totalTokens: number;
      totalTime: number;
      errors: number;
      responseTimes: number[];
    } {
      return this.performances.get(modelId) || {
        totalRequests: 0,
        totalTokens: 0,
        totalTime: 0,
        errors: 0,
        responseTimes: [],
      };
    }
  }
  
  /**
   * [LLM] Training data cleaner helpers
   */
  export const trainingDataUtils = {
    /**
     * Remove duplicates from a dataset
     */
    removeDuplicates: <T>(data: T[], keyFn?: (item: T) => string): T[] => {
      const seen = new Set<string>();
      const result: T[] = [];
      
      for (const item of data) {
        const key = keyFn ? keyFn(item) : JSON.stringify(item);
        
        if (!seen.has(key)) {
          seen.add(key);
          result.push(item);
        }
      }
      
      return result;
    },
    
    /**
     * Detect and filter out low-quality samples
     */
    filterLowQuality: <T extends { text?: string; content?: string }>(
      data: T[],
      options: {
        minLength?: number;
        maxLength?: number;
        minWords?: number;
        bannedPhrases?: string[];
        contentAccessor?: (item: T) => string;
      } = {}
    ): T[] => {
      const {
        minLength = 10,
        maxLength = 100000,
        minWords = 5,
        bannedPhrases = [],
        contentAccessor = (item) => item.text || item.content || '',
      } = options;
      
      return data.filter(item => {
        const content = contentAccessor(item);
        
        // Check length
        if (content.length < minLength || content.length > maxLength) {
          return false;
        }
        
        // Check word count
        const wordCount = content.split(/\s+/).length;
        if (wordCount < minWords) {
          return false;
        }
        
        // Check for banned phrases
        for (const phrase of bannedPhrases) {
          if (content.includes(phrase)) {
            return false;
          }
        }
        
        return true;
      });
    },
    
    /**
     * Split data into train/validation/test sets
     */
    splitDataset: <T>(data: T[], trainRatio = 0.8, validationRatio = 0.1): {
      train: T[];
      validation: T[];
      test: T[];
    } => {
      const shuffled = [...data].sort(() => 0.5 - Math.random());
      
      const trainSize = Math.floor(shuffled.length * trainRatio);
      const validationSize = Math.floor(shuffled.length * validationRatio);
      
      return {
        train: shuffled.slice(0, trainSize),
        validation: shuffled.slice(trainSize, trainSize + validationSize),
        test: shuffled.slice(trainSize + validationSize),
      };
    },
    
    /**
     * Create chat format from raw text
     */
    createChatFormat: (
      texts: string[],
      options: {
        systemMessage?: string;
        splitByPattern?: RegExp;
        userPrefix?: string;
        assistantPrefix?: string;
      } = {}
    ): ChatMessage[][] => {
      const {
        systemMessage,
        splitByPattern = /\n{2,}/,
        userPrefix = 'User:',
        assistantPrefix = 'Assistant:',
      } = options;
      
      return texts.map(text => {
        const parts = text.split(splitByPattern);
        const messages: ChatMessage[] = [];
        
        if (systemMessage) {
          messages.push({
            role: 'system',
            content: systemMessage,
          });
        }
        
        let isUserTurn = true;
        
        for (const part of parts) {
          const trimmed = part.trim();
          
          if (!trimmed) continue;
          
          if (trimmed.startsWith(userPrefix)) {
            messages.push({
              role: 'user',
              content: trimmed.substring(userPrefix.length).trim(),
            });
            isUserTurn = false;
          } else if (trimmed.startsWith(assistantPrefix)) {
            messages.push({
              role: 'assistant',
              content: trimmed.substring(assistantPrefix.length).trim(),
            });
            isUserTurn = true;
          } else {
            messages.push({
              role: isUserTurn ? 'user' : 'assistant',
              content: trimmed,
            });
            isUserTurn = !isUserTurn;
          }
        }
        
        return messages;
      });
    },
    
    /**
     * Convert various formats to JSONL
     */
    convertToJSONL: <T>(data: T[]): string => {
      return data.map(item => JSON.stringify(item)).join('\n');
    },
  };
  
  /**
   * [LLM] Image generation interface
   */
  export interface ImageGenerationOptions {
    prompt: string;
    negativePrompt?: string;
    width?: number;
    height?: number;
    numImages?: number;
    seed?: number;
    extraParams?: Record<string, any>;
  }
  
  /**
   * [LLM] Image generation result
   */
  export interface ImageGenerationResult {
    images: string[];  // Base64 or URLs
    metadata: {
      prompt: string;
      negativePrompt?: string;
      width: number;
      height: number;
      seed?: number;
      model: string;
      [key: string]: any;
    };
  }
  
  /**
   * [LLM] Image generation client interface
   */
  export interface ImageGenerationClient {
    generateImage(options: ImageGenerationOptions): Promise<ImageGenerationResult>;
  }
  
  /**
   * [LLM] OpenAI DALL-E image generation client
   */
  export class DallEClient implements ImageGenerationClient {
    private readonly apiKey: string;
    private readonly apiUrl: string;
    private readonly model: string;
    
    constructor(options: {
      apiKey: string;
      apiUrl?: string;
      model?: string;
    }) {
      this.apiKey = options.apiKey;
      this.apiUrl = options.apiUrl || 'https://api.openai.com/v1';
      this.model = options.model || 'dall-e-3';
    }
    
    async generateImage(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
      const {
        prompt,
        width = 1024,
        height = 1024,
        numImages = 1,
        extraParams = {},
      } = options;
      
      // Determine size parameter based on model and dimensions
      let size: string;
      if (this.model === 'dall-e-3') {
        if (width === 1024 && height === 1024) {
          size = '1024x1024';
        } else if (width === 1792 && height === 1024) {
          size = '1792x1024';
        } else if (width === 1024 && height === 1792) {
          size = '1024x1792';
        } else {
          // Default to square if dimensions not supported
          size = '1024x1024';
        }
      } else {
        // DALL-E 2 or other models
        if (width === 256 && height === 256) {
          size = '256x256';
        } else if (width === 512 && height === 512) {
          size = '512x512';
        } else {
          size = '1024x1024';
        }
      }
      
      const requestBody = {
        model: this.model,
        prompt,
        n: numImages,
        size,
        ...extraParams,
      };
      
      const response = await fetch(`${this.apiUrl}/images/generations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`DALL-E API error: ${error.error?.message || JSON.stringify(error)}`);
      }
      
      const data = await response.json();
      
      return {
        images: data.data.map((item: any) => item.url),
        metadata: {
          prompt,
          width,
          height,
          model: this.model,
          ...extraParams,
        },
      };
    }
  }
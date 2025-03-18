// ===================================================
// SEARCH ALGORITHMS & TEXT MATCHING
// ===================================================

/**
 * [Search] Document interface for text search
 */
export interface SearchDocument {
    id: string;
    content: string;
    title?: string;
    tags?: string[];
    category?: string;
    metadata?: Record<string, any>;
  }
  
  /**
   * [Search] Field weighting configuration
   */
  export interface FieldWeights {
    title?: number;
    content?: number;
    tags?: number;
    category?: number;
    metadata?: Record<string, number>;
  }
  
  /**
   * [Search] Search result with relevance score
   */
  export interface SearchResult<T extends SearchDocument> {
    document: T;
    score: number;
    matches: {
      field: string;
      matches: string[];
    }[];
  }
  
  /**
   * [Search] Text tokenization options
   */
  export interface TokenizeOptions {
    lowercase?: boolean;
    removeStopWords?: boolean;
    stemming?: boolean;
    removePunctuation?: boolean;
    minTokenLength?: number;
  }
  
  /**
   * [Search] Common English stop words
   */
  const STOP_WORDS = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for', 'if', 'in',
    'into', 'is', 'it', 'no', 'not', 'of', 'on', 'or', 'such', 'that', 'the',
    'their', 'then', 'there', 'these', 'they', 'this', 'to', 'was', 'will', 'with'
  ]);
  
  /**
   * [Search] Simple stemmer (Porter stemming algorithm simplified)
   */
  function stemWord(word: string): string {
    // Simple version of Porter stemming algorithm
    return word
      .replace(/ies$/, 'i')
      .replace(/es$/, 'e')
      .replace(/s$/, '')
      .replace(/ing$/, '')
      .replace(/ed$/, '');
  }
  
  /**
   * [Search] Tokenize text into words
   */
  export const tokenizeText = (text: string, options: TokenizeOptions = {}): string[] => {
    const {
      lowercase = true,
      removeStopWords = true,
      stemming = true,
      removePunctuation = true,
      minTokenLength = 2
    } = options;
    
    if (!text) return [];
    
    let processedText = text;
    
    if (lowercase) {
      processedText = processedText.toLowerCase();
    }
    
    if (removePunctuation) {
      processedText = processedText.replace(/[^\w\s]/g, ' ');
    }
    
    // Split by whitespace
    let tokens = processedText.split(/\s+/).filter(token => token.length >= minTokenLength);
    
    if (removeStopWords) {
      tokens = tokens.filter(token => !STOP_WORDS.has(token));
    }
    
    if (stemming) {
      tokens = tokens.map(token => stemWord(token));
    }
    
    return tokens;
  };
  
  /**
   * [Search] Calculate term frequency (TF)
   */
  export const calculateTermFrequency = (term: string, tokens: string[]): number => {
    const termCount = tokens.filter(token => token === term).length;
    return termCount / tokens.length;
  };
  
  /**
   * [Search] Calculate inverse document frequency (IDF)
   */
  export const calculateInverseDocumentFrequency = (
    term: string,
    documents: string[][]
  ): number => {
    const numDocsWithTerm = documents.filter(doc => doc.includes(term)).length;
    return Math.log(documents.length / (1 + numDocsWithTerm));
  };
  
  /**
   * [Search] Calculate term frequency-inverse document frequency (TF-IDF)
   */
  export const calculateTfIdf = (
    term: string,
    tokens: string[],
    documents: string[][]
  ): number => {
    const tf = calculateTermFrequency(term, tokens);
    const idf = calculateInverseDocumentFrequency(term, documents);
    return tf * idf;
  };
  
  /**
   * [Search] Create a search index for fast text search
   */
  export class SearchIndex<T extends SearchDocument> {
    private documents: T[] = [];
    private tokenizedDocuments: Record<string, string[]> = {};
    private invertedIndex: Record<string, Set<string>> = {};
    private fieldWeights: FieldWeights;
    private tokenizeOptions: TokenizeOptions;
    
    constructor(options: {
      fieldWeights?: FieldWeights;
      tokenizeOptions?: TokenizeOptions;
    } = {}) {
      this.fieldWeights = {
        title: 3.0,
        content: 1.0,
        tags: 2.0,
        category: 1.5,
        ...options.fieldWeights
      };
      
      this.tokenizeOptions = {
        lowercase: true,
        removeStopWords: true,
        stemming: true,
        removePunctuation: true,
        minTokenLength: 2,
        ...options.tokenizeOptions
      };
    }
    
    /**
     * Add a document to the search index
     */
    addDocument(document: T): void {
      this.documents.push(document);
      this.tokenizeDocument(document);
      this.updateInvertedIndex(document);
    }
    
    /**
     * Add multiple documents to the search index
     */
    addDocuments(documents: T[]): void {
      documents.forEach(doc => this.addDocument(doc));
    }
    
    /**
     * Remove a document from the search index
     */
    removeDocument(documentId: string): void {
      const index = this.documents.findIndex(doc => doc.id === documentId);
      
      if (index === -1) {
        return;
      }
      
      // Remove from documents array
      this.documents.splice(index, 1);
      
      // Remove from tokenized documents
      delete this.tokenizedDocuments[documentId];
      
      // Update inverted index
      Object.keys(this.invertedIndex).forEach(term => {
        this.invertedIndex[term].delete(documentId);
        if (this.invertedIndex[term].size === 0) {
          delete this.invertedIndex[term];
        }
      });
    }
    
    /**
     * Tokenize a document and store the tokens
     */
    private tokenizeDocument(document: T): void {
      const fields: Record<string, string> = {
        content: document.content || '',
      };
      
      if (document.title) {
        fields.title = document.title;
      }
      
      if (document.tags) {
        fields.tags = document.tags.join(' ');
      }
      
      if (document.category) {
        fields.category = document.category;
      }
      
      // Combine all fields into a single text for tokenization
      let combinedText = '';
      Object.entries(fields).forEach(([field, text]) => {
        // Apply field weight by repeating text
        const fieldWeight = this.fieldWeights[field as keyof FieldWeights];
        const weight = typeof fieldWeight === 'number' ? fieldWeight : 1;
        const repetitions = Math.floor(weight);
        const remainder = weight - repetitions;
        
        // Add whole repetitions
        for (let i = 0; i < repetitions; i++) {
          combinedText += ' ' + text;
        }
        
        // Add partial repetition if there's a remainder
        if (remainder > 0) {
          const partialLength = Math.floor(text.length * remainder);
          combinedText += ' ' + text.substring(0, partialLength);
        }
      });
      
      // Add metadata fields if weighted
      if (document.metadata && this.fieldWeights.metadata) {
        Object.entries(document.metadata).forEach(([key, value]) => {
          const metadataWeight = this.fieldWeights.metadata?.[key] || 0;
          
          if (metadataWeight > 0 && typeof value === 'string') {
            const repetitions = Math.floor(metadataWeight);
            
            for (let i = 0; i < repetitions; i++) {
              combinedText += ' ' + value;
            }
            
            const remainder = metadataWeight - repetitions;
            if (remainder > 0) {
              const partialLength = Math.floor(value.length * remainder);
              combinedText += ' ' + value.substring(0, partialLength);
            }
          }
        });
      }
      
      // Tokenize the combined text
      this.tokenizedDocuments[document.id] = tokenizeText(combinedText, this.tokenizeOptions);
    }
    
    /**
     * Update the inverted index with a document
     */
    private updateInvertedIndex(document: T): void {
      const tokens = this.tokenizedDocuments[document.id];
      
      // Create a set of unique tokens
      const uniqueTokens = new Set(tokens);
      
      // Update inverted index
      uniqueTokens.forEach(token => {
        if (!this.invertedIndex[token]) {
          this.invertedIndex[token] = new Set<string>();
        }
        
        this.invertedIndex[token].add(document.id);
      });
    }
    
    /**
     * Rebuild the entire search index
     */
    rebuildIndex(): void {
      this.tokenizedDocuments = {};
      this.invertedIndex = {};
      
      this.documents.forEach(doc => {
        this.tokenizeDocument(doc);
        this.updateInvertedIndex(doc);
      });
    }
    
    /**
     * Search for documents matching a query
     */
    search(query: string, options: {
      limit?: number;
      minScore?: number;
      boost?: Record<string, number>;
    } = {}): SearchResult<T>[] {
      const {
        limit = 10,
        minScore = 0.1,
        boost = {}
      } = options;
      
      // Tokenize the query
      const queryTokens = tokenizeText(query, this.tokenizeOptions);
      
      if (queryTokens.length === 0) {
        return [];
      }
      
      // Calculate document scores
      const scores: Record<string, number> = {};
      const matches: Record<string, Record<string, string[]>> = {};
      
      queryTokens.forEach(token => {
        // Get documents containing this token
        const matchingDocIds = this.invertedIndex[token] || new Set<string>();
        
        matchingDocIds.forEach(docId => {
          const docTokens = this.tokenizedDocuments[docId];
          
          if (!docTokens) return;
          
          // Calculate TF-IDF score for this token in this document
          const tfIdf = calculateTfIdf(
            token, 
            docTokens, 
            Object.values(this.tokenizedDocuments)
          );
          
          // Apply any boosting
          const docBoost = boost[docId] || 1.0;
          
          // Add to the document's score
          scores[docId] = (scores[docId] || 0) + tfIdf * docBoost;
          
          // Record the match
          if (!matches[docId]) {
            matches[docId] = {};
          }
          
          // Find which fields match
          const doc = this.documents.find(d => d.id === docId);
          if (doc) {
            const fieldsToCheck = [
              { name: 'title', value: doc.title },
              { name: 'content', value: doc.content },
              { name: 'tags', value: doc.tags ? doc.tags.join(' ') : undefined },
              { name: 'category', value: doc.category }
            ];
            
            fieldsToCheck.forEach(({ name, value }) => {
              if (value && value.toLowerCase().includes(token)) {
                if (!matches[docId][name]) {
                  matches[docId][name] = [];
                }
                matches[docId][name].push(token);
              }
            });
            
            // Check metadata fields
            if (doc.metadata) {
              Object.entries(doc.metadata).forEach(([key, value]) => {
                if (typeof value === 'string' && value.toLowerCase().includes(token)) {
                  const fieldName = `metadata.${key}`;
                  if (!matches[docId][fieldName]) {
                    matches[docId][fieldName] = [];
                  }
                  matches[docId][fieldName].push(token);
                }
              });
            }
          }
        });
      });
      
      // Convert scores to results
      const results: SearchResult<T>[] = Object.entries(scores)
        .filter(([_, score]) => score >= minScore)
        .map(([docId, score]) => {
          const document = this.documents.find(doc => doc.id === docId)!;
          
          return {
            document,
            score,
            matches: Object.entries(matches[docId] || {}).map(([field, tokens]) => ({
              field,
              matches: tokens
            }))
          };
        })
        .sort((a, b) => b.score - a.score);
      
      // Apply limit
      return results.slice(0, limit);
    }
    
    /**
     * Get similar documents to a given document
     */
    findSimilarDocuments(documentId: string, options: {
      limit?: number;
      minScore?: number;
      excludeSelf?: boolean;
    } = {}): SearchResult<T>[] {
      const {
        limit = 5,
        minScore = 0.1,
        excludeSelf = true
      } = options;
      
      const document = this.documents.find(doc => doc.id === documentId);
      
      if (!document) {
        throw new Error(`Document with ID "${documentId}" not found`);
      }
      
      // Use the document's content as a search query
      let searchQuery = document.content;
      
      if (document.title) {
        searchQuery = `${document.title} ${searchQuery}`;
      }
      
      if (document.tags) {
        searchQuery = `${searchQuery} ${document.tags.join(' ')}`;
      }
      
      // Search with the generated query
      const results = this.search(searchQuery, { limit: limit + (excludeSelf ? 1 : 0), minScore });
      
      // Filter out the document itself if needed
      return excludeSelf
        ? results.filter(result => result.document.id !== documentId).slice(0, limit)
        : results.slice(0, limit);
    }
    
    /**
     * Get all documents in the index
     */
    getAllDocuments(): T[] {
      return [...this.documents];
    }
    
    /**
     * Get a document by ID
     */
    getDocument(id: string): T | undefined {
      return this.documents.find(doc => doc.id === id);
    }
    
    /**
     * Get the count of documents in the index
     */
    getDocumentCount(): number {
      return this.documents.length;
    }
  }
  
  /**
   * [Search] Knowledge Base finder utilizing the search index
   */
  export class KnowledgeBaseFinder<T extends SearchDocument> {
    private searchIndex: SearchIndex<T>;
    private categoryWeights: Record<string, number> = {};
    private tagWeights: Record<string, number> = {};
    
    constructor(options: {
      documents?: T[];
      fieldWeights?: FieldWeights;
      tokenizeOptions?: TokenizeOptions;
      categoryWeights?: Record<string, number>;
      tagWeights?: Record<string, number>;
    } = {}) {
      const {
        documents = [],
        fieldWeights,
        tokenizeOptions,
        categoryWeights = {},
        tagWeights = {}
      } = options;
      
      this.searchIndex = new SearchIndex<T>({ fieldWeights, tokenizeOptions });
      this.categoryWeights = categoryWeights;
      this.tagWeights = tagWeights;
      
      if (documents.length > 0) {
        this.searchIndex.addDocuments(documents);
      }
    }
    
    /**
     * Add documents to the knowledge base
     */
    addDocuments(documents: T[]): void {
      this.searchIndex.addDocuments(documents);
    }
    
    /**
     * Remove a document from the knowledge base
     */
    removeDocument(documentId: string): void {
      this.searchIndex.removeDocument(documentId);
    }
    
    /**
     * Set weights for categories
     */
    setCategoryWeights(weights: Record<string, number>): void {
      this.categoryWeights = weights;
    }
    
    /**
     * Set weights for tags
     */
    setTagWeights(weights: Record<string, number>): void {
      this.tagWeights = weights;
    }
    
    /**
     * Find relevant knowledge base entries for a given query
     */
    findRelevantEntries(query: string, options: {
      limit?: number;
      minScore?: number;
      categories?: string[];
      requiredTags?: string[];
      anyTags?: string[];
    } = {}): SearchResult<T>[] {
      const {
        limit = 10,
        minScore = 0.1,
        categories = [],
        requiredTags = [],
        anyTags = []
      } = options;
      
      // Prepare document boosting based on categories and tags
      const boost: Record<string, number> = {};
      
      const documents = this.searchIndex.getAllDocuments();
      
      documents.forEach(doc => {
        let docBoost = 1.0;
        
        // Apply category boosting
        if (doc.category && this.categoryWeights[doc.category]) {
          docBoost *= this.categoryWeights[doc.category];
        }
        
        // Apply tag boosting
        if (doc.tags) {
          doc.tags.forEach(tag => {
            if (this.tagWeights[tag]) {
              docBoost *= this.tagWeights[tag];
            }
          });
        }
        
        // If categories are specified, filter or boost by category
        if (categories.length > 0) {
          if (doc.category && categories.includes(doc.category)) {
            docBoost *= 1.5;
          } else {
            docBoost *= 0.5;
          }
        }
        
        // Boost based on matches with required tags
        if (requiredTags.length > 0 && doc.tags) {
          const matchCount = requiredTags.filter(tag => doc.tags?.includes(tag)).length;
          
          if (matchCount === 0) {
            docBoost *= 0.1; // Significant penalty for not having any required tags
          } else {
            docBoost *= 1 + (matchCount / requiredTags.length);
          }
        }
        
        // Boost based on matches with any tags
        if (anyTags.length > 0 && doc.tags) {
          const matchCount = anyTags.filter(tag => doc.tags?.includes(tag)).length;
          
          if (matchCount > 0) {
            docBoost *= 1 + (matchCount / anyTags.length);
          }
        }
        
        boost[doc.id] = docBoost;
      });
      
      // Perform the search with boosting
      const results = this.searchIndex.search(query, { limit, minScore, boost });
      
      // Additional post-search filtering
      return results.filter(result => {
        // Filter out documents that don't have all required tags
        if (requiredTags.length > 0 && result.document.tags) {
          return requiredTags.every(tag => result.document.tags?.includes(tag));
        }
        
        return true;
      });
    }
    
    /**
     * Process user notes to extract key information
     */
    processUserNotes(notes: string): {
      query: string;
      categories: string[];
      tags: string[];
      keyTerms: string[];
    } {
      // Tokenize the notes
      const tokens = tokenizeText(notes, {
        lowercase: true,
        removeStopWords: true,
        stemming: true,
        removePunctuation: true,
        minTokenLength: 2
      });
      
      // Count token frequencies
      const tokenCounts: Record<string, number> = {};
      tokens.forEach(token => {
        tokenCounts[token] = (tokenCounts[token] || 0) + 1;
      });
      
      // Sort tokens by frequency
      const sortedTokens = Object.entries(tokenCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([token]) => token);
      
      // Identify potential categories
      const categories: string[] = [];
      const categoryKeywords: Record<string, string[]> = {
        'hardware': ['computer', 'device', 'laptop', 'macbook', 'pc', 'monitor', 'keyboard', 'mouse', 'printer', 'hardware'],
        'software': ['software', 'program', 'app', 'application', 'install', 'update', 'version'],
        'network': ['network', 'wifi', 'internet', 'connection', 'router', 'modem', 'ethernet'],
        'account': ['account', 'password', 'login', 'username', 'email', 'access'],
        'operating_system': ['windows', 'macos', 'linux', 'os', 'operating', 'system'],
        'mobile': ['phone', 'mobile', 'tablet', 'iphone', 'android', 'ipad']
      };
      
      // Check for category keywords in the notes
      Object.entries(categoryKeywords).forEach(([category, keywords]) => {
        if (keywords.some(keyword => notes.toLowerCase().includes(keyword))) {
          categories.push(category);
        }
      });
      
      // Extract potential tags
      const tags: string[] = [];
      const tagKeywords: Record<string, string[]> = {
        'error': ['error', 'issue', 'problem', 'crash', 'bug', 'failed'],
        'setup': ['setup', 'install', 'configuration', 'configure'],
        'performance': ['slow', 'performance', 'speed', 'lag', 'freeze'],
        'update': ['update', 'upgrade', 'version', 'patch'],
        'security': ['security', 'virus', 'malware', 'protect', 'breach', 'hack'],
        'data': ['data', 'file', 'backup', 'storage', 'save', 'lost', 'recover'],
        'macbook': ['mac', 'macbook', 'macos', 'apple'],
        'windows': ['windows', 'pc', 'microsoft'],
        'mobile': ['mobile', 'phone', 'iphone', 'android', 'tablet', 'ipad']
      };
      
      // Check for tag keywords in the notes
      Object.entries(tagKeywords).forEach(([tag, keywords]) => {
        if (keywords.some(keyword => notes.toLowerCase().includes(keyword))) {
          tags.push(tag);
        }
      });
      
      // Get top terms for the search query
      const keyTerms = sortedTokens.slice(0, 10);
      const query = keyTerms.join(' ');
      
      return {
        query,
        categories,
        tags,
        keyTerms
      };
    }
    
    /**
     * Find best knowledge base matches for user notes
     */
    findMatchesForUserNotes(notes: string, options: {
      limit?: number;
      minScore?: number;
    } = {}): {
      results: SearchResult<T>[];
      processedInfo: {
        query: string;
        categories: string[];
        tags: string[];
        keyTerms: string[];
      };
    } {
      const processedInfo = this.processUserNotes(notes);
      
      const results = this.findRelevantEntries(processedInfo.query, {
        limit: options.limit,
        minScore: options.minScore,
        categories: processedInfo.categories,
        anyTags: processedInfo.tags
      });
      
      return {
        results,
        processedInfo
      };
    }
  }
  
  /**
   * [Search] Calculate Levenshtein distance between two strings
   */
  export const levenshteinDistance = (a: string, b: string): number => {
    const matrix: number[][] = [];
    
    // Increment along the first column of each row
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    
    // Increment each column in the first row
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    
    // Fill in the rest of the matrix
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    
    return matrix[b.length][a.length];
  };
  
  /**
   * [Search] Calculate similarity between two strings (0-1)
   */
  export const stringSimilarity = (a: string, b: string): number => {
    if (a === b) return 1;
    if (a.length === 0 || b.length === 0) return 0;
    
    const distance = levenshteinDistance(a, b);
    const maxLength = Math.max(a.length, b.length);
    
    return 1 - distance / maxLength;
  };
  
  /**
   * [Search] Find best fuzzy match for a string in an array
   */
  export const findBestMatch = (
    query: string,
    candidates: string[],
    options: {
      minSimilarity?: number;
      ignoreCase?: boolean;
    } = {}
  ): {
    bestMatch: { target: string; similarity: number } | null;
    ratings: { target: string; similarity: number }[];
  } => {
    const { minSimilarity = 0.4, ignoreCase = true } = options;
    
    const queryProcessed = ignoreCase ? query.toLowerCase() : query;
    
    const ratings = candidates.map(candidate => {
      const candidateProcessed = ignoreCase ? candidate.toLowerCase() : candidate;
      const similarity = stringSimilarity(queryProcessed, candidateProcessed);
      
      return {
        target: candidate,
        similarity
      };
    });
    
    // Sort by similarity (highest first)
    ratings.sort((a, b) => b.similarity - a.similarity);
    
    const bestMatch = ratings.length > 0 && ratings[0].similarity >= minSimilarity
      ? ratings[0]
      : null;
    
    return {
      bestMatch,
      ratings
    };
  };
  
  /**
   * [Search] Find autocomplete suggestions for a partial query
   */
  export const findAutocompleteSuggestions = (
    partial: string,
    candidates: string[],
    options: {
      maxSuggestions?: number;
      minScore?: number;
      prefixOnly?: boolean;
    } = {}
  ): { suggestion: string; score: number }[] => {
    const {
      maxSuggestions = 5,
      minScore = 0.1,
      prefixOnly = true
    } = options;
    
    if (!partial) return [];
    
    const partialLower = partial.toLowerCase();
    
    const scored = candidates.map(candidate => {
      const candidateLower = candidate.toLowerCase();
      let score = 0;
      
      if (prefixOnly) {
        // Simple prefix matching
        if (candidateLower.startsWith(partialLower)) {
          // Score is higher for closer matches to the length of the partial
          score = partialLower.length / candidateLower.length;
        }
      } else {
        // More comprehensive matching
        if (candidateLower === partialLower) {
          score = 1;
        } else if (candidateLower.startsWith(partialLower)) {
          score = 0.9 * (partialLower.length / candidateLower.length);
        } else if (candidateLower.includes(partialLower)) {
          score = 0.75 * (partialLower.length / candidateLower.length);
        } else {
          // Partial token matching
          const partialTokens = tokenizeText(partialLower, { stemming: false });
          const candidateTokens = tokenizeText(candidateLower, { stemming: false });
          
          const matchingTokens = partialTokens.filter(token => 
            candidateTokens.some(candidateToken => candidateToken.startsWith(token))
          );
          
          if (matchingTokens.length > 0) {
            score = 0.5 * (matchingTokens.length / partialTokens.length);
          }
        }
      }
      
      return { suggestion: candidate, score };
    });
    
    // Filter by min score and sort by descending score
    return scored
      .filter(item => item.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSuggestions);
  };
  
  /**
   * [Search] Filter and sort a list of documents based on a query
   */
  export const filterAndRankDocuments = <T extends { id: string; [key: string]: any }>(
    documents: T[],
    query: string,
    options: {
      fields?: string[];
      weights?: Record<string, number>;
      ignoreCase?: boolean;
      tokenize?: boolean;
      limit?: number;
      minScore?: number;
    } = {}
  ): { document: T; score: number }[] => {
    const {
      fields = Object.keys(documents[0] || {}).filter(key => typeof documents[0][key] === 'string'),
      weights = {},
      ignoreCase = true,
      tokenize = true,
      limit = 10,
      minScore = 0.1
    } = options;
    
    // Process the query
    const processedQuery = ignoreCase ? query.toLowerCase() : query;
    const queryTokens = tokenize ? tokenizeText(processedQuery) : [processedQuery];
    
    if (queryTokens.length === 0) return [];
    
    // Score each document
    const scoredDocuments = documents.map(document => {
      let totalScore = 0;
      
      fields.forEach(field => {
        const fieldValue = document[field];
        if (fieldValue === undefined || fieldValue === null) return;
        
        const fieldString = String(fieldValue);
        const processedField = ignoreCase ? fieldString.toLowerCase() : fieldString;
        
        // Calculate raw similarity score
        let fieldScore = 0;
        
        if (tokenize) {
          // Tokenized approach
          const fieldTokens = tokenizeText(processedField);
          
          // Calculate how many query tokens match
          const matchingTokens = queryTokens.filter(queryToken => 
            fieldTokens.some(fieldToken => fieldToken.includes(queryToken))
          );
          
          fieldScore = matchingTokens.length / queryTokens.length;
        } else {
          // Direct string matching
          fieldScore = processedField.includes(processedQuery) ? 
            processedQuery.length / processedField.length : 0;
        }
        
        // Apply field weight
        const fieldWeight = weights[field] || 1;
        totalScore += fieldScore * fieldWeight;
      });
      
      // Normalize score based on number of fields examined
      const scoreNormalized = totalScore / fields.length;
      
      return { document, score: scoreNormalized };
    });
    
    // Filter by minimum score and sort by score
    return scoredDocuments
      .filter(item => item.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  };
// ===================================================
// TEXT AUTO-CORRECTION SYSTEM
// ===================================================

/**
 * [AutoCorrect] Auto-correction configuration options
 */
export interface AutoCorrectOptions {
    enabled?: boolean;
    language?: string;
    customDictionary?: Record<string, string>;
    ignoredWords?: string[];
    maxSuggestions?: number;
    minWordLength?: number;
    learnFromCorrections?: boolean;
    autoApplyCorrections?: boolean;
    checkGrammar?: boolean;
    checkSpelling?: boolean;
    showSuggestions?: boolean;
    suggestionDelay?: number;
    suggestionPlacement?: 'below' | 'above' | 'inline';
    caseSensitive?: boolean;
    contextAware?: boolean;
    contextWindowSize?: number;
    onCorrection?: (original: string, corrected: string) => void;
    onSuggestion?: (word: string, suggestions: string[]) => void;
  }
  
  /**
   * [AutoCorrect] Correction information
   */
  export interface CorrectionInfo {
    original: string;
    corrected: string;
    position: {
      start: number;
      end: number;
    };
    confidence: number;
    suggestions: string[];
  }
  
  /**
   * [AutoCorrect] Common spelling errors and their corrections
   */
  const COMMON_MISSPELLINGS: Record<string, string> = {
    // A
    'abreviat': 'abbreviate',
    'accomodate': 'accommodate',
    'acheive': 'achieve',
    'accross': 'across',
    'agressive': 'aggressive',
    'apparant': 'apparent',
    // B
    'basicly': 'basically',
    'becuase': 'because',
    'begining': 'beginning',
    'belive': 'believe',
    'buisness': 'business',
    // C
    'calender': 'calendar',
    'catagory': 'category',
    'cemetary': 'cemetery',
    'cheif': 'chief',
    'collegue': 'colleague',
    'comming': 'coming',
    'commited': 'committed',
    'comparision': 'comparison',
    'completly': 'completely',
    // D
    'definately': 'definitely',
    'definitly': 'definitely',
    'definatly': 'definitely',
    'developement': 'development',
    'diffrent': 'different',
    'disappoint': 'disappoint',
    // E
    'embarass': 'embarrass',
    'enviroment': 'environment',
    'exagerate': 'exaggerate',
    'excede': 'exceed',
    'existance': 'existence',
    'experiance': 'experience',
    // F
    'familar': 'familiar',
    'finaly': 'finally',
    'foriegn': 'foreign',
    'fourty': 'forty',
    'freind': 'friend',
    // G
    'goverment': 'government',
    'gaurd': 'guard',
    'guage': 'gauge',
    // H
    'happend': 'happened',
    'harrassment': 'harassment',
    'heighth': 'height',
    // I
    'imediate': 'immediate',
    'independant': 'independent',
    'indispensible': 'indispensable',
    'intresting': 'interesting',
    'interuption': 'interruption',
    'irrevelant': 'irrelevant',
    // J
    'judgement': 'judgment',
    'knowlege': 'knowledge',
    // L
    'libary': 'library',
    'lisence': 'license',
    // M
    'maintainance': 'maintenance',
    'manuever': 'maneuver',
    'millenium': 'millennium',
    'miniscule': 'minuscule',
    'misspell': 'misspell',
    // N
    'neccessary': 'necessary',
    'necesary': 'necessary',
    'neighbour': 'neighbor',
    'noticable': 'noticeable',
    // O
    'ocasion': 'occasion',
    'occassion': 'occasion',
    'occurance': 'occurrence',
    'occured': 'occurred',
    'ocurring': 'occurring',
    // P
    'parralel': 'parallel',
    'parliment': 'parliament',
    'particurly': 'particularly',
    'passtime': 'pastime',
    'persistant': 'persistent',
    'pharoah': 'pharaoh',
    'peice': 'piece',
    'politican': 'politician',
    'posession': 'possession',
    'prefered': 'preferred',
    'pregnent': 'pregnant',
    'presense': 'presence',
    'priviledge': 'privilege',
    'pronounciation': 'pronunciation',
    // Q
    'questionaire': 'questionnaire',
    // R
    'recieve': 'receive',
    'recomend': 'recommend',
    'refered': 'referred',
    'referance': 'reference',
    'relevent': 'relevant',
    'religous': 'religious',
    'repitition': 'repetition',
    'resistence': 'resistance',
    'responsibilty': 'responsibility',
    'rythm': 'rhythm',
    // S
    'scenerio': 'scenario',
    'secratary': 'secretary',
    'seperate': 'separate',
    'shedule': 'schedule',
    'sieze': 'seize',
    'similer': 'similar',
    'sincerely': 'sincerely',
    'speach': 'speech',
    'succesful': 'successful',
    'supercede': 'supersede',
    'supress': 'suppress',
    'suprise': 'surprise',
    // T
    'tomatos': 'tomatoes',
    'tommorow': 'tomorrow',
    'tommorrow': 'tomorrow',
    'truely': 'truly',
    'tyrany': 'tyranny',
    // U
    'underate': 'underrate',
    'untill': 'until',
    'unuseual': 'unusual',
    // V
    'vaccum': 'vacuum',
    'vegetation': 'vegetation',
    'visious': 'vicious',
    // W
    'wether': 'whether',
    'wierd': 'weird',
    'wellcome': 'welcome',
    'whereever': 'wherever',
    // X, Y, Z
    'yeild': 'yield'
  };
  
  /**
   * [AutoCorrect] Common typos caused by keyboard adjacency
   */
  const KEYBOARD_ADJACENCY: Record<string, string[]> = {
    'a': ['q', 'w', 's', 'z'],
    'b': ['v', 'g', 'h', 'n'],
    'c': ['x', 'd', 'f', 'v'],
    'd': ['s', 'e', 'f', 'c', 'x'],
    'e': ['w', 'r', 'd', 's'],
    'f': ['d', 'r', 'g', 'v', 'c'],
    'g': ['f', 't', 'h', 'b', 'v'],
    'h': ['g', 'y', 'j', 'n', 'b'],
    'i': ['u', 'o', 'k', 'j'],
    'j': ['h', 'u', 'k', 'm', 'n'],
    'k': ['j', 'i', 'l', 'm'],
    'l': ['k', 'o', 'p', ';'],
    'm': ['n', 'j', 'k', ','],
    'n': ['b', 'h', 'j', 'm'],
    'o': ['i', 'p', 'l', 'k'],
    'p': ['o', '[', 'l'],
    'q': ['w', 'a', '1'],
    'r': ['e', 't', 'f', 'd'],
    's': ['a', 'w', 'd', 'x', 'z'],
    't': ['r', 'y', 'g', 'f'],
    'u': ['y', 'i', 'j', 'h'],
    'v': ['c', 'f', 'g', 'b'],
    'w': ['q', 'e', 's', 'a'],
    'x': ['z', 's', 'd', 'c'],
    'y': ['t', 'u', 'h', 'g'],
    'z': ['a', 's', 'x']
  };
  
  /**
   * [AutoCorrect] Common letter transpositions
   */
  const COMMON_TRANSPOSITIONS: Record<string, string> = {
    'teh': 'the',
    'adn': 'and',
    'waht': 'what',
    'taht': 'that',
    'thier': 'their',
    'thna': 'than',
    'wiht': 'with',
    'from': 'form',
    'nad': 'and',
    'ahve': 'have',
    'acn': 'can',
    'tiem': 'time',
    'owuld': 'would',
    'owrk': 'work',
    'abotu': 'about',
    'firend': 'friend',
    'herat': 'heart',
    'slef': 'self'
  };
  
  /**
   * [AutoCorrect] Common contractions
   */
  const COMMON_CONTRACTIONS: Record<string, string> = {
    'dont': "don't",
    'cant': "can't",
    'wont': "won't",
    'isnt': "isn't",
    'arent': "aren't",
    'youre': "you're",
    'theyre': "they're",
    'wouldnt': "wouldn't",
    'couldnt': "couldn't",
    'shouldnt': "shouldn't",
    'hasnt': "hasn't",
    'havent': "haven't",
    'didnt': "didn't",
    'doesnt': "doesn't",
    'hadnt': "hadn't",
    'ive': "I've",
    'youve': "you've",
    'weve': "we've",
    'theyve': "they've",
    'im': "I'm",
    'hes': "he's",
    'shes': "she's",
    'its': "it's", // Note: This needs context to distinguish from possessive 'its'
    'thats': "that's",
    'wheres': "where's",
    'heres': "here's",
    'theres': "there's",
    'id': "I'd", // Context needed
    'youd': "you'd",
    'hed': "he'd",
    'shed': "she'd",
    'itd': "it'd",
    'theyd': "they'd",
    'ill': "I'll", // Context needed
    'youll': "you'll",
    'hell': "he'll", // Context needed
    'shell': "she'll",
    'itll': "it'll",
    'theyll': "they'll",
    'mustve': "must've",
    'shouldve': "should've",
    'couldve': "could've",
    'wouldve': "would've",
    'mightve': "might've"
  };
  
  /**
   * [AutoCorrect] Auto-correction engine
   */
  export class AutoCorrectEngine {
    private options: AutoCorrectOptions;
    private dictionary: Record<string, string> = {};
    private ignoredWords: Set<string> = new Set();
    private learningDictionary: Record<string, string> = {};
    private readonly commonTypoPatterns: Array<(word: string) => string | null> = [];
    
    constructor(options: AutoCorrectOptions = {}) {
      this.options = {
        enabled: true,
        language: 'en-US',
        maxSuggestions: 5,
        minWordLength: 3,
        learnFromCorrections: true,
        autoApplyCorrections: false,
        checkGrammar: false,
        checkSpelling: true,
        showSuggestions: true,
        suggestionDelay: 500,
        suggestionPlacement: 'below',
        caseSensitive: false,
        contextAware: true,
        contextWindowSize: 3,
        ...options
      };
      
      // Initialize dictionaries
      this.dictionary = { ...COMMON_MISSPELLINGS, ...COMMON_TRANSPOSITIONS, ...COMMON_CONTRACTIONS };
      
      if (options.customDictionary) {
        this.dictionary = { ...this.dictionary, ...options.customDictionary };
      }
      
      if (options.ignoredWords) {
        options.ignoredWords.forEach(word => this.ignoredWords.add(word.toLowerCase()));
      }
      
      // Initialize typo pattern detectors
      this.initCommonTypoPatterns();
    }
    
    /**
     * Initialize common typo pattern detectors
     */
    private initCommonTypoPatterns(): void {
      // Repeated letters (e.g., 'helllo' -> 'hello')
      this.commonTypoPatterns.push((word: string) => {
        const repeatedLetterPattern = /(.)\1{2,}/g;
        if (repeatedLetterPattern.test(word)) {
          return word.replace(repeatedLetterPattern, '$1$1');
        }
        return null;
      });
      
      // Missing vowels in longer words (e.g., 'cmpleted' -> 'completed')
      this.commonTypoPatterns.push((word: string) => {
        if (word.length >= 5) {
          const missingVowelPattern = /[bcdfghjklmnpqrstvwxyz]{4,}/g;
          if (missingVowelPattern.test(word)) {
            // This is just a detection - we'd need dictionary lookup for actual correction
            return null; // Return null for now, will use distance metrics for suggestions
          }
        }
        return null;
      });
      
      // Common letter swaps based on keyboard adjacency
      this.commonTypoPatterns.push((word: string) => {
        // This is a simplified version - real implementation would check multiple positions
        for (let i = 0; i < word.length; i++) {
          const currentChar = word[i].toLowerCase();
          const adjacentKeys = KEYBOARD_ADJACENCY[currentChar] || [];
          
          for (const adjacentKey of adjacentKeys) {
            const possibleTypo = word.substring(0, i) + adjacentKey + word.substring(i + 1);
            if (this.dictionary[possibleTypo.toLowerCase()]) {
              return this.dictionary[possibleTypo.toLowerCase()];
            }
          }
        }
        return null;
      });
    }
    
    /**
     * Check and correct text
     */
    correctText(text: string): { corrected: string; corrections: CorrectionInfo[] } {
      if (!this.options.enabled || !text) {
        return { corrected: text, corrections: [] };
      }
      
      const corrections: CorrectionInfo[] = [];
      let correctedText = text;
      
      // Split text into words and non-words (preserving spacing and punctuation)
      const tokens = text.split(/(\s+|[.,!?;:'"()[\]{}])/);
      
      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        
        // Skip empty tokens, whitespace, and punctuation
        if (!token || /^\s+$/.test(token) || /^[.,!?;:'"()[\]{}]$/.test(token)) {
          continue;
        }
        
        // Skip words shorter than minimum length (unless they're in our dictionary)
        if (token.length < this.options.minWordLength! && !this.dictionary[token.toLowerCase()]) {
          continue;
        }
        
        // Skip words in the ignored list
        if (this.ignoredWords.has(token.toLowerCase())) {
          continue;
        }
        
        const correctionInfo = this.correctWord(token, tokens, i);
        
        if (correctionInfo && correctionInfo.corrected !== token) {
          // Calculate the absolute position in the original text
          const startPos = text.indexOf(token);
          const endPos = startPos + token.length;
          
          corrections.push({
            original: token,
            corrected: correctionInfo.corrected,
            position: {
              start: startPos,
              end: endPos
            },
            confidence: correctionInfo.confidence,
            suggestions: correctionInfo.suggestions
          });
          
          // Update the corrected text if auto-apply is enabled
          if (this.options.autoApplyCorrections) {
            correctedText = correctedText.substring(0, startPos) + 
                            correctionInfo.corrected +
                            correctedText.substring(endPos);
          }
        }
      }
      
      return { corrected: correctedText, corrections };
    }
    
    /**
     * Check and correct a single word, with context
     */
    private correctWord(
      word: string, 
      context: string[] = [], 
      position: number = 0
    ): { corrected: string; confidence: number; suggestions: string[] } | null {
      if (this.options.caseSensitive) {
        // In case-sensitive mode, handle words exactly as they are
        return this.findCorrection(word, context, position);
      } else {
        // In case-insensitive mode, check the lowercase word
        const lowerWord = word.toLowerCase();
        const correction = this.findCorrection(lowerWord, context, position);
        
        if (!correction || correction.corrected === lowerWord) {
          return null;
        }
        
        // Preserve the original case pattern if possible
        let corrected = correction.corrected;
        
        if (/^[A-Z]+$/.test(word)) {
          // All uppercase -> keep it all uppercase
          corrected = corrected.toUpperCase();
        } else if (/^[A-Z]/.test(word) && word.length > 1) {
          // First letter uppercase -> capitalize first letter of correction
          corrected = corrected.charAt(0).toUpperCase() + corrected.slice(1).toLowerCase();
        }
        
        return {
          ...correction,
          corrected
        };
      }
    }
    
    /**
     * Find the best correction for a word
     */
    private findCorrection(
      word: string, 
      context: string[] = [], 
      position: number = 0
    ): { corrected: string; confidence: number; suggestions: string[] } | null {
      // Direct dictionary lookup
      const dictionaryCorrection = this.dictionary[word];
      if (dictionaryCorrection) {
        return {
          corrected: dictionaryCorrection,
          confidence: 0.95,
          suggestions: [dictionaryCorrection]
        };
      }
      
      // Learning dictionary lookup
      const learningCorrection = this.learningDictionary[word];
      if (learningCorrection) {
        return {
          corrected: learningCorrection,
          confidence: 0.9,
          suggestions: [learningCorrection]
        };
      }
      
      // Try common typo patterns
      for (const patternFn of this.commonTypoPatterns) {
        const patternCorrection = patternFn(word);
        if (patternCorrection) {
          return {
            corrected: patternCorrection,
            confidence: 0.85,
            suggestions: [patternCorrection]
          };
        }
      }
      
      // Get context-aware suggestions
      let suggestions: string[] = [];
      
      if (this.options.contextAware) {
        suggestions = this.getContextAwareSuggestions(word, context, position);
      }
      
      // If no context-aware suggestions, try edit distance
      if (suggestions.length === 0) {
        suggestions = this.getSuggestionsByEditDistance(word);
      }
      
      if (suggestions.length > 0) {
        // Use the highest-ranked suggestion
        return {
          corrected: suggestions[0],
          confidence: 0.7,
          suggestions
        };
      }
      
      // No correction found
      return {
        corrected: word,
        confidence: 1.0,
        suggestions: []
      };
    }
    
    /**
     * Get context-aware suggestions for a word
     */
    private getContextAwareSuggestions(
      word: string,
      context: string[],
      position: number
    ): string[] {
      // This is a simplified version of context-aware correction
      // A real implementation would use n-grams, language models, or transformers
      
      const contextWindowSize = this.options.contextWindowSize || 3;
      const beforeWords: string[] = [];
      const afterWords: string[] = [];
      
      // Get words before the current position
      for (let i = 1; i <= contextWindowSize; i++) {
        const index = position - (i * 2); // Skip punctuation/whitespace tokens
        if (index >= 0 && context[index] && /\w/.test(context[index])) {
          beforeWords.unshift(context[index]);
        }
      }
      
      // Get words after the current position
      for (let i = 1; i <= contextWindowSize; i++) {
        const index = position + (i * 2); // Skip punctuation/whitespace tokens
        if (index < context.length && context[index] && /\w/.test(context[index])) {
          afterWords.push(context[index]);
        }
      }
      
      // For simple bigram checking
      const prevWord = beforeWords.length > 0 ? beforeWords[beforeWords.length - 1].toLowerCase() : '';
      const nextWord = afterWords.length > 0 ? afterWords[0].toLowerCase() : '';
      
      // Common phrases check (very simplified)
      const commonPhrases: Record<string, Record<string, string[]>> = {
        'should': { 'of': ['have'] },
        'could': { 'of': ['have'] },
        'would': { 'of': ['have'] },
        'must': { 'of': ['have'] },
        'might': { 'of': ['have'] },
        'for': { 'all': ['intensive purposes'] },
        'intensive': { 'purposes': ['intents and purposes'] }
      };
      
      // Check for common phrase corrections
      if (prevWord && commonPhrases[prevWord] && commonPhrases[prevWord][word]) {
        return commonPhrases[prevWord][word];
      }
      
      if (nextWord && commonPhrases[word] && commonPhrases[word][nextWord]) {
        return commonPhrases[word][nextWord];
      }
      
      // Get edit distance suggestions and rank them by context
      const suggestions = this.getSuggestionsByEditDistance(word);
      if (suggestions.length === 0) {
        return [];
      }
      
      // In a real implementation, we would score each suggestion based on the context
      // For simplicity, we'll just return the edit distance suggestions
      return suggestions;
    }
    
    /**
     * Get suggestions based on edit distance
     */
    private getSuggestionsByEditDistance(word: string): string[] {
      const maxDistance = word.length <= 4 ? 1 : 2;
      const candidates = new Set<string>();
      
      // Search dictionary for words within edit distance
      Object.keys(this.dictionary).forEach(dictWord => {
        if (Math.abs(dictWord.length - word.length) <= maxDistance) {
          const distance = this.levenshteinDistance(word, dictWord);
          if (distance <= maxDistance) {
            candidates.add(this.dictionary[dictWord]);
          }
        }
      });
      
      // Search learning dictionary too
      Object.keys(this.learningDictionary).forEach(dictWord => {
        if (Math.abs(dictWord.length - word.length) <= maxDistance) {
          const distance = this.levenshteinDistance(word, dictWord);
          if (distance <= maxDistance) {
            candidates.add(this.learningDictionary[dictWord]);
          }
        }
      });
      
      // Convert to array and limit the number of suggestions
      const maxSuggestions = this.options.maxSuggestions || 5;
      return Array.from(candidates).slice(0, maxSuggestions);
    }
    
    /**
     * Calculate Levenshtein edit distance between two strings
     */
    private levenshteinDistance(a: string, b: string): number {
      if (a === b) return 0;
      if (a.length === 0) return b.length;
      if (b.length === 0) return a.length;
      
      const matrix: number[][] = [];
      
      // Initialize matrix
      for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
      }
      
      for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
      }
      
      // Fill matrix
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
    }
    
    /**
     * Add a word to the custom dictionary
     */
    addWordToDictionary(misspelling: string, correction: string): void {
      if (misspelling && correction) {
        if (this.options.caseSensitive) {
          this.dictionary[misspelling] = correction;
        } else {
          this.dictionary[misspelling.toLowerCase()] = correction;
        }
      }
    }
    
    /**
     * Add a word to the learning dictionary
     */
    learnWordCorrection(misspelling: string, correction: string): void {
      if (misspelling && correction && this.options.learnFromCorrections) {
        if (this.options.caseSensitive) {
          this.learningDictionary[misspelling] = correction;
        } else {
          this.learningDictionary[misspelling.toLowerCase()] = correction;
        }
      }
    }
    
    /**
     * Add a word to the ignored words list
     */
    addToIgnoredWords(word: string): void {
      if (word) {
        if (this.options.caseSensitive) {
          this.ignoredWords.add(word);
        } else {
          this.ignoredWords.add(word.toLowerCase());
        }
      }
    }
    
    /**
     * Remove a word from the ignored words list
     */
    removeFromIgnoredWords(word: string): void {
      if (word) {
        if (this.options.caseSensitive) {
          this.ignoredWords.delete(word);
        } else {
          this.ignoredWords.delete(word.toLowerCase());
        }
      }
    }
    
    /**
     * Update auto-correct options
     */
    updateOptions(options: Partial<AutoCorrectOptions>): void {
      this.options = {
        ...this.options,
        ...options
      };
    }
    
    /**
     * Import a custom dictionary
     */
    importDictionary(dictionary: Record<string, string>): void {
      this.dictionary = {
        ...this.dictionary,
        ...dictionary
      };
    }
    
    /**
     * Export the current dictionary
     */
    exportDictionary(): Record<string, string> {
      return { ...this.dictionary };
    }
    
    /**
     * Export the learning dictionary
     */
    exportLearningDictionary(): Record<string, string> {
      return { ...this.learningDictionary };
    }
    
    /**
     * Clear the learning dictionary
     */
    clearLearningDictionary(): void {
      this.learningDictionary = {};
    }
    
    /**
     * Reset to default dictionary
     */
    resetToDefaultDictionary(): void {
      this.dictionary = { ...COMMON_MISSPELLINGS, ...COMMON_TRANSPOSITIONS, ...COMMON_CONTRACTIONS };
      this.learningDictionary = {};
    }
  }
  
  /**
   * [AutoCorrect] Auto-correct text input element controller
   */
  export class AutoCorrectInput {
    private readonly engine: AutoCorrectEngine;
    private readonly element: HTMLInputElement | HTMLTextAreaElement;
    private options: AutoCorrectOptions;
    private suggestionBox: HTMLElement | null = null;
    private eventListeners: Array<{target: EventTarget, type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions}> = [];
    
    constructor(
      element: HTMLInputElement | HTMLTextAreaElement | string,
      options: AutoCorrectOptions = {}
    ) {
      // Resolve element
      if (typeof element === 'string') {
        const el = document.querySelector(element) as HTMLInputElement | HTMLTextAreaElement;
        if (!el) {
          throw new Error(`Element not found: ${element}`);
        }
        this.element = el;
      } else {
        this.element = element;
      }
      
      // Ensure the element is an input or textarea
      if (!(this.element instanceof HTMLInputElement || this.element instanceof HTMLTextAreaElement)) {
        throw new Error('Element must be an input or textarea');
      }
      
      this.options = {
        enabled: true,
        showSuggestions: true,
        suggestionDelay: 500,
        suggestionPlacement: 'below',
        ...options
      };
      
      this.engine = new AutoCorrectEngine(this.options);
      
      this.initialize();
    }
    
    /**
     * Initialize the auto-correct input
     */
    private initialize(): void {
      // Add event listeners
      this.addEventListeners();
      
      // Add data attribute to mark this element as auto-correct enabled
      this.element.setAttribute('data-auto-correct', 'true');
      
      // Create suggestion box if needed
      if (this.options.showSuggestions) {
        this.createSuggestionBox();
      }
    }
    
    /**
     * Add event listeners
     */
    private addEventListeners(): void {
      // Debounced input event for checking text
      const inputListener = this.debounce(() => {
        this.checkText();
      }, this.options.suggestionDelay || 500);
      
      this.element.addEventListener('input', inputListener);
      this.eventListeners.push({target: this.element, type: 'input', listener: inputListener});
      
      // Blur event to hide suggestions
      const blurListener = () => {
        this.hideSuggestions();
      };
      
      this.element.addEventListener('blur', blurListener);
      this.eventListeners.push({target: this.element, type: 'blur', listener: blurListener});
      
      // Key events for keyboard navigation of suggestions
      const keydownListener = (e: Event) => {
        const keyboardEvent = e as KeyboardEvent;
        if (!this.suggestionBox || this.suggestionBox.style.display === 'none') {
          return;
        }
        
        if (keyboardEvent.key === 'ArrowDown' || keyboardEvent.key === 'ArrowUp') {
          keyboardEvent.preventDefault();
          this.navigateSuggestions(keyboardEvent.key === 'ArrowDown' ? 1 : -1);
        } else if (keyboardEvent.key === 'Enter') {
          const activeSuggestion = this.suggestionBox.querySelector('.suggestion-item.active');
          if (activeSuggestion) {
            keyboardEvent.preventDefault();
            this.applySuggestion(activeSuggestion.textContent || '');
          }
        } else if (keyboardEvent.key === 'Escape') {
          this.hideSuggestions();
        }
      };
      
      this.element.addEventListener('keydown', keydownListener);
      this.eventListeners.push({target: this.element, type: 'keydown', listener: keydownListener});
    }
    
    /**
     * Check text for errors and show suggestions
     */
    private checkText(): void {
      if (!this.options.enabled) {
        return;
      }
      
      const text = this.element.value;
      if (!text) {
        this.hideSuggestions();
        return;
      }
      
      // Get cursor position
      const cursorPos = this.getCursorPosition();
      
      // Find the word at the cursor position
      const wordInfo = this.getWordAtPosition(text, cursorPos);
      if (!wordInfo) {
        this.hideSuggestions();
        return;
      }
      
      // Check if the word is long enough
      if (wordInfo.word.length < (this.options.minWordLength || 3)) {
        this.hideSuggestions();
        return;
      }
      
      // Check the word for corrections
      const result = this.engine.correctText(wordInfo.word);
      
      if (result.corrections.length > 0) {
        const correction = result.corrections[0];
        
        // Show suggestions if enabled
        if (this.options.showSuggestions) {
          this.showSuggestions(correction.suggestions, wordInfo);
        }
        
        // Apply correction if auto-apply is enabled
        if (this.options.autoApplyCorrections && correction.confidence > 0.9) {
          this.applyCorrection(correction, wordInfo);
        }
        
        // Call the onCorrection callback if provided
        if (this.options.onCorrection) {
          this.options.onCorrection(wordInfo.word, correction.corrected);
        }
      } else {
        this.hideSuggestions();
      }
    }
    
    /**
     * Get the current cursor position in the input
     */
    private getCursorPosition(): number {
      return this.element.selectionStart || 0;
    }
    
    /**
     * Set the cursor position in the input
     */
    private setCursorPosition(position: number): void {
      this.element.setSelectionRange(position, position);
    }
    
    /**
     * Get the word at a specific position in the text
     */
    private getWordAtPosition(text: string, position: number): {
      word: string;
      start: number;
      end: number;
    } | null {
      if (!text || position > text.length) {
        return null;
      }
      
      // Find word boundaries
      let start = position;
      while (start > 0 && /\w/.test(text[start - 1])) {
        start--;
      }
      
      let end = position;
      while (end < text.length && /\w/.test(text[end])) {
        end++;
      }
      
      // Extract the word
      const word = text.substring(start, end);
      
      if (!word) {
        return null;
      }
      
      return { word, start, end };
    }
    
    /**
     * Create the suggestion box
     */
    private createSuggestionBox(): void {
      // Check if the suggestion box already exists
      if (this.suggestionBox) {
        return;
      }
      
      // Create the suggestion box
      this.suggestionBox = document.createElement('div');
      this.suggestionBox.className = 'auto-correct-suggestions';
      this.suggestionBox.style.display = 'none';
      this.suggestionBox.style.position = 'absolute';
      this.suggestionBox.style.zIndex = '1000';
      this.suggestionBox.style.background = 'white';
      this.suggestionBox.style.border = '1px solid #ccc';
      this.suggestionBox.style.borderRadius = '4px';
      this.suggestionBox.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
      this.suggestionBox.style.padding = '4px 0';
      this.suggestionBox.style.maxHeight = '200px';
      this.suggestionBox.style.overflowY = 'auto';
      
      // Add to document body
      document.body.appendChild(this.suggestionBox);
      
      // Add click event listener for suggestions
      const clickListener = (e: Event) => {
        if (e.target instanceof HTMLElement && e.target.classList.contains('suggestion-item')) {
          this.applySuggestion(e.target.textContent || '');
        }
      };
      
      this.suggestionBox.addEventListener('click', clickListener);
      this.eventListeners.push({target: this.suggestionBox, type: 'click', listener: clickListener});
      
      // Add mouse enter listener for highlighting suggestions
      const mouseenterListener = (e: Event) => {
        if (e.target instanceof HTMLElement && e.target.classList.contains('suggestion-item')) {
          // Remove active class from all suggestions
          const suggestions = this.suggestionBox!.querySelectorAll('.suggestion-item');
          suggestions.forEach(suggestion => suggestion.classList.remove('active'));
          
          // Add active class to the hovered suggestion
          e.target.classList.add('active');
        }
      };
      
      this.suggestionBox.addEventListener('mouseenter', mouseenterListener, true);
      this.eventListeners.push({target: this.suggestionBox, type: 'mouseenter', listener: mouseenterListener, options: true});
    }
    
    /**
     * Show suggestions for a word
     */
    private showSuggestions(
      suggestions: string[], 
      wordInfo: { word: string; start: number; end: number }
    ): void {
      if (!this.suggestionBox || !suggestions.length) {
        this.hideSuggestions();
        return;
      }
      
      // Clear existing suggestions
      this.suggestionBox.innerHTML = '';
      
      // Add suggestions
      suggestions.forEach((suggestion, index) => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.textContent = suggestion;
        item.style.padding = '8px 12px';
        item.style.cursor = 'pointer';
        
        // Highlight the first suggestion
        if (index === 0) {
          item.classList.add('active');
          item.style.backgroundColor = '#f0f0f0';
        }
        
        // Hover effect
        item.addEventListener('mouseenter', () => {
          item.style.backgroundColor = '#f0f0f0';
        });
        
        item.addEventListener('mouseleave', () => {
          if (!item.classList.contains('active')) {
            item.style.backgroundColor = '';
          }
        });
        
        this.suggestionBox!.appendChild(item);
      });
      
      // Position the suggestion box
      this.positionSuggestionBox(wordInfo);
      
      // Show the suggestion box
      this.suggestionBox.style.display = 'block';
    }
    
    /**
     * Position the suggestion box relative to the word
     */
    private positionSuggestionBox(wordInfo: { word: string; start: number; end: number }): void {
      if (!this.suggestionBox) {
        return;
      }
      
      // Get the position of the input element
      const rect = this.element.getBoundingClientRect();
      
      // Get text position metrics (this is an approximation)
      const isTextarea = this.element instanceof HTMLTextAreaElement;
      
      if (isTextarea) {
        // For textarea, we need to calculate position based on line height and line breaks
        const text = this.element.value.substring(0, wordInfo.start);
        const lineBreaks = (text.match(/\n/g) || []).length;
        const lineHeight = parseInt(getComputedStyle(this.element).lineHeight) || 20;
        
        // Calculate top position
        let top = rect.top + (lineBreaks * lineHeight) + lineHeight;
        
        // Calculate left position (approximate)
        const charsInCurrentLine = text.substring(text.lastIndexOf('\n') + 1).length;
        const charWidth = 8; // approximate character width
        const left = rect.left + (charsInCurrentLine * charWidth);
        
        // Set suggestion box position
        this.suggestionBox.style.left = `${left}px`;
        this.suggestionBox.style.top = `${top}px`;
      } else {
        // For input elements, positioning is simpler
        const left = rect.left;
        
        // Position based on placement option
        if (this.options.suggestionPlacement === 'above') {
          this.suggestionBox.style.left = `${left}px`;
          this.suggestionBox.style.top = `${rect.top - this.suggestionBox.offsetHeight}px`;
        } else {
          this.suggestionBox.style.left = `${left}px`;
          this.suggestionBox.style.top = `${rect.bottom}px`;
        }
      }
    }
    
    /**
     * Hide the suggestion box
     */
    private hideSuggestions(): void {
      if (this.suggestionBox) {
        this.suggestionBox.style.display = 'none';
      }
    }
    
    /**
     * Navigate through suggestions with keyboard
     */
    private navigateSuggestions(direction: number): void {
      if (!this.suggestionBox) {
        return;
      }
      
      const suggestions = this.suggestionBox.querySelectorAll<HTMLElement>('.suggestion-item');
      if (!suggestions.length) {
        return;
      }
      
      // Find the current active suggestion
      let activeIndex = -1;
      suggestions.forEach((suggestion, index) => {
        if (suggestion.classList.contains('active')) {
          activeIndex = index;
          suggestion.classList.remove('active');
          suggestion.style.backgroundColor = '';
        }
      });
      
      // Calculate the new active index
      activeIndex += direction;
      if (activeIndex < 0) {
        activeIndex = suggestions.length - 1;
      } else if (activeIndex >= suggestions.length) {
        activeIndex = 0;
      }
      
      // Set the new active suggestion
      const newActive = suggestions[activeIndex];
      newActive.classList.add('active');
      newActive.style.backgroundColor = '#f0f0f0';
      
      // Scroll to the active suggestion if needed
      newActive.scrollIntoView({ block: 'nearest' });
    }
    
    /**
     * Apply a suggestion to replace the word
     */
    private applySuggestion(suggestion: string): void {
      // Get cursor position
      const cursorPos = this.getCursorPosition();
      
      // Find the word at the cursor position
      const text = this.element.value;
      const wordInfo = this.getWordAtPosition(text, cursorPos);
      
      if (!wordInfo) {
        this.hideSuggestions();
        return;
      }
      
      // Replace the word with the suggestion
      const newText = text.substring(0, wordInfo.start) + 
                      suggestion + 
                      text.substring(wordInfo.end);
      
      this.element.value = newText;
      
      // Set cursor position after the suggestion
      this.setCursorPosition(wordInfo.start + suggestion.length);
      
      // Hide suggestions
      this.hideSuggestions();
      
      // Learn this correction if enabled
      if (this.options.learnFromCorrections) {
        this.engine.learnWordCorrection(wordInfo.word, suggestion);
      }
      
      // Trigger input event to notify other listeners
      const inputEvent = new Event('input', { bubbles: true });
      this.element.dispatchEvent(inputEvent);
    }
    
    /**
     * Apply a correction automatically
     */
    private applyCorrection(
      correction: CorrectionInfo,
      wordInfo: { word: string; start: number; end: number }
    ): void {
      // Replace the word with the correction
      const text = this.element.value;
      const newText = text.substring(0, wordInfo.start) + 
                      correction.corrected + 
                      text.substring(wordInfo.end);
      
      this.element.value = newText;
      
      // Set cursor position after the correction
      this.setCursorPosition(wordInfo.start + correction.corrected.length);
      
      // Hide suggestions
      this.hideSuggestions();
      
      // Learn this correction if enabled
      if (this.options.learnFromCorrections) {
        this.engine.learnWordCorrection(wordInfo.word, correction.corrected);
      }
      
      // Trigger input event to notify other listeners
      const inputEvent = new Event('input', { bubbles: true });
      this.element.dispatchEvent(inputEvent);
    }
    
    /**
     * Update auto-correct options
     */
    updateOptions(options: Partial<AutoCorrectOptions>): void {
      this.options = {
        ...this.options,
        ...options
      };
      
      this.engine.updateOptions(options);
    }
    
    /**
     * Add a word to the dictionary
     */
    addToDictionary(misspelling: string, correction: string): void {
      this.engine.addWordToDictionary(misspelling, correction);
    }
    
    /**
     * Add a word to the ignored words list
     */
    ignoreWord(word: string): void {
      this.engine.addToIgnoredWords(word);
    }
    
    /**
     * Check the current text and get corrections
     */
    checkCurrentText(): { corrected: string; corrections: CorrectionInfo[] } {
      const text = this.element.value;
      return this.engine.correctText(text);
    }
    
    /**
     * Enable auto-correction
     */
    enable(): void {
      this.updateOptions({ enabled: true });
    }
    
    /**
     * Disable auto-correction
     */
    disable(): void {
      this.updateOptions({ enabled: false });
      this.hideSuggestions();
    }
    
    /**
     * Clean up event listeners and DOM elements
     */
    destroy(): void {
      // Remove event listeners
      this.eventListeners.forEach(({target, type, listener, options}) => {
        target.removeEventListener(type, listener, options);
      });
      
      // Remove the suggestion box
      if (this.suggestionBox && this.suggestionBox.parentNode) {
        this.suggestionBox.parentNode.removeChild(this.suggestionBox);
      }
      
      // Remove the data attribute
      this.element.removeAttribute('data-auto-correct');
    }
    
    /**
     * Simple debounce implementation
     */
    private debounce(fn: Function, delay: number): (e: Event) => void {
      let timeout: number | null = null;
      
      return (e: Event) => {
        if (timeout !== null) {
          clearTimeout(timeout);
        }
        
        timeout = window.setTimeout(() => {
          fn(e);
        }, delay);
      };
    }
  }
  
  /**
   * [AutoCorrect] Apply auto-correction to multiple input elements
   */
  export const applyAutoCorrectToInputs = (
    selector: string,
    options: AutoCorrectOptions = {}
  ): AutoCorrectInput[] => {
    const elements = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(selector);
    const controllers: AutoCorrectInput[] = [];
    
    elements.forEach(element => {
      try {
        const controller = new AutoCorrectInput(element, options);
        controllers.push(controller);
      } catch (error) {
        console.error(`Failed to apply auto-correct to element:`, element, error);
      }
    });
    
    return controllers;
  };
  
  /**
   * [AutoCorrect] Create a standalone auto-correct engine for text processing
   */
  export const createAutoCorrectEngine = (
    options: AutoCorrectOptions = {}
  ): AutoCorrectEngine => {
    return new AutoCorrectEngine(options);
  };
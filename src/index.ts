// Import modules with renamed exports to avoid conflicts
import * as ArrayOps from './arrayoperations';
import * as AutoCorrect from './autocorrect';
import * as Automation from './automation';
import * as Backend from './backend';
import * as Benchmarking from './benchmarking';
import * as BrowserGUI from './browser-gui';
import * as DateTime from './datetime';
import * as Formatting from './formatting';
import * as FrontendUtils from './frontend-utilities';
import * as Functional from './functional';
import * as LLM from './llm';
import * as Logging from './logging';
import * as Modal from './modal';
import * as Monitoring from './monitoring';
import * as Networking from './nerworking';
import * as ObjectOps from './objectoperations';
import * as Search from './search';
import * as StringM from './stringm';
import * as Theme from './theme';
import * as Utilities from './utilities';
import * as Validation from './validation';
import * as Var from './var';

// Re-export everything from each module with namespaces to avoid conflicts
export {
  ArrayOps,
  AutoCorrect,
  Automation,
  Backend,
  Benchmarking,
  BrowserGUI,
  DateTime,
  Formatting,
  FrontendUtils,
  Functional,
  LLM,
  Logging,
  Modal,
  Monitoring,
  Networking,
  ObjectOps,
  Search,
  StringM,
  Theme,
  Utilities,
  Validation,
  Var
};

// Export specific functions with renamed exports to avoid conflicts
// This allows users to import these directly without the namespace
export { formatDate as formatDateISO } from './datetime';
export { formatDate as formatDateCustom } from './formatting';
export { createElement as createDOMElement } from './browser-gui';
export { createElement as createHTMLElement } from './utilities';
export { formatNumber as formatNumberWithOptions } from './formatting';
export { formatNumber as formatNumberLocale } from './utilities';
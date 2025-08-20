/**
 * Obsidian API Mock for Testing
 */

export class Plugin {
  app: any;
  manifest: any;
  
  constructor(app: any, manifest: any) {
    this.app = app;
    this.manifest = manifest;
  }
  
  onload() {}
  onunload() {}
  loadData() { return Promise.resolve({}); }
  saveData(data: any) { return Promise.resolve(); }
}

export class PluginSettingTab {
  app: any;
  plugin: any;
  containerEl: HTMLElement;
  
  constructor(app: any, plugin: any) {
    this.app = app;
    this.plugin = plugin;
    this.containerEl = document.createElement('div');
  }
  
  display() {}
}

export class Setting {
  constructor(containerEl: HTMLElement) {}
  setName(name: string) { return this; }
  setDesc(desc: string) { return this; }
  addText(cb: any) { return this; }
  addTextArea(cb: any) { return this; }
  addToggle(cb: any) { return this; }
  addDropdown(cb: any) { return this; }
  addSlider(cb: any) { return this; }
  addButton(cb: any) { return this; }
}

export class Modal {
  app: any;
  contentEl: HTMLElement;
  
  constructor(app: any) {
    this.app = app;
    this.contentEl = document.createElement('div');
  }
  
  open() {}
  close() {}
  onOpen() {}
  onClose() {}
}

export class Notice {
  constructor(message: string) {}
}

export class Component {
  registerDomEvent() {}
  registerInterval() {}
  register() {}
  unload() {}
}

export class ItemView extends Component {
  leaf: any;
  
  getViewType() { return 'test-view'; }
  getDisplayText() { return 'Test View'; }
  getIcon() { return 'document'; }
  
  onOpen() { return Promise.resolve(); }
  onClose() { return Promise.resolve(); }
}

export class WorkspaceLeaf {
  view: any;
  
  setViewState(state: any) { return Promise.resolve(); }
  getViewState() { return {}; }
}

export class Workspace extends Component {
  leftSplit: any;
  rightSplit: any;
  
  getLeaf(newLeaf?: boolean) {
    return new WorkspaceLeaf();
  }
  
  revealLeaf(leaf: any) {}
  detachLeavesOfType(type: string) {}
  getLeavesOfType(type: string) { return []; }
  on(event: string, callback: any) {}
  off(event: string, callback: any) {}
  trigger(event: string, ...args: any[]) {}
}

export class Vault {
  adapter: any;
  
  read(file: any) { return Promise.resolve(''); }
  readBinary(file: any) { return Promise.resolve(new ArrayBuffer(0)); }
  write(path: string, content: string) { return Promise.resolve(); }
  writeBinary(path: string, content: ArrayBuffer) { return Promise.resolve(); }
  delete(file: any) { return Promise.resolve(); }
  rename(file: any, newPath: string) { return Promise.resolve(); }
  create(path: string, content: string) { return Promise.resolve({} as any); }
  createBinary(path: string, content: ArrayBuffer) { return Promise.resolve({} as any); }
  getMarkdownFiles() { return []; }
  getFiles() { return []; }
  getAllLoadedFiles() { return []; }
  on(event: string, callback: any) {}
  off(event: string, callback: any) {}
}

export class App {
  workspace: Workspace;
  vault: Vault;
  metadataCache: any;
  fileManager: any;
  
  constructor() {
    this.workspace = new Workspace();
    this.vault = new Vault();
  }
}

export class TFile {
  path: string = '';
  name: string = '';
  basename: string = '';
  extension: string = '';
  stat: any = {};
}

export class TFolder {
  path: string = '';
  name: string = '';
  children: any[] = [];
}

// Export commonly used types
export interface CachedMetadata {
  headings?: any[];
  tags?: any[];
  links?: any[];
  embeds?: any[];
  sections?: any[];
}

export interface FileSystemAdapter {
  getName(): string;
  read(path: string): Promise<string>;
  readBinary(path: string): Promise<ArrayBuffer>;
  write(path: string, data: string): Promise<void>;
  writeBinary(path: string, data: ArrayBuffer): Promise<void>;
  exists(path: string): Promise<boolean>;
  remove(path: string): Promise<void>;
  mkdir(path: string): Promise<void>;
  list(path: string): Promise<any>;
  stat(path: string): Promise<any>;
}

export default {
  Plugin,
  PluginSettingTab,
  Setting,
  Modal,
  Notice,
  Component,
  ItemView,
  WorkspaceLeaf,
  Workspace,
  Vault,
  App,
  TFile,
  TFolder,
};
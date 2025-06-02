export interface PyodideInterface {
  loadPackage: (packages: string[]) => Promise<void>;
  runPython: (code: string) => any;
  globals: {
    get: (name: string) => any;
    set: (name: string, value: any) => void;
  };
  FS: {
    writeFile: (path: string, data: Uint8Array) => void;
    readFile: (path: string) => Uint8Array;
  };
}

declare global {
  interface Window {
    loadPyodide: () => Promise<PyodideInterface>;
  }
} 
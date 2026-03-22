declare const __dirname: string;
declare const __filename: string;
declare const require: {
  (id: string): unknown;
  main?: unknown;
};
declare const module: { exports: unknown };
declare const process: {
  env: Record<string, string | undefined>;
  exitCode?: number;
};

declare module 'fs' {
  const fs: {
    existsSync(path: string): boolean;
    readFileSync(path: string, options?: { encoding?: string } | string): string;
  };
  export = fs;
}

declare module 'path' {
  const path: {
    resolve(...segments: string[]): string;
  };
  export = path;
}

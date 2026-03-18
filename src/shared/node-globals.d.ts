declare const require: {
  (id: string): any;
  main?: unknown;
};

declare const module: {
  exports: unknown;
};

declare const process: {
  env: Record<string, string | undefined>;
  exitCode?: number;
};

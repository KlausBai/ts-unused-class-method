import ts from "typescript";

export interface Analysis {
  [index: string]: FileClassMethodsChain[];
}

export interface TsConfigPaths {
  [glob: string]: string[];
}

export interface TsConfig {
  baseUrl: string;
  paths?: TsConfigPaths;
  files: string[];
}

export interface FileClassMethodsChain {
  source: ts.SourceFile;
  classDeclaration: ts.ClassDeclaration;
  methodDeclaration: ts.MethodDeclaration
}
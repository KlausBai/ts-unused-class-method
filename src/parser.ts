import { TsConfig, TsConfigPaths, FileClassMethodsChain } from "./types";
import { resolve } from "path";
import ts = require("typescript");
import { readFileSync } from "fs";
import { mayContainDynamicImports, isDeclarationExport,isDeclarationDefault,absolutizeOriginPathFactory,extractExportNames } from "./utils";

/**
 * @param decl 
 * @returns exported declarations, path
 */
const acquireImportDeclarationInfo = (decl:ts.ImportDeclaration):[Array<string>,string] =>{
  const clause = decl.importClause;
  const filePath = decl.moduleSpecifier?.getText?.();
  if(!clause) return [['*'],filePath];
  const { namedBindings } = clause;
  const importIdentifiers:Array<string> = namedBindings ? 
    (namedBindings as ts.NamespaceImport)?.name ?
     /** import * as a from './a' */ ['*']:
     /** import { a } from './a' */ 
     (namedBindings as ts.NamedImports).elements.map(
        (e) => (e.propertyName || e.name).text,
        )
    : clause.name ?
      /** import a from './a' */['default']:[]
  return [importIdentifiers,filePath]
}

const acquireDeclarationExportInfo = (decl: ts.DeclarationStatement):Record<string,ts.Node> => {
  const exportInfo:Record<string,ts.Node> = {}
  if(isDeclarationDefault(decl)){
    exportInfo['default'] = decl;
    return exportInfo;
  }
  const [names,propertyName] = extractExportNames(decl);
  
}

const parseFile = (
  absolutePath: string,
  basePath: string,
  pathAlias: TsConfigPaths
) => {
  const importPair: Record<string, Array<string>> = {};
  const exportOrUsedPair: Record<string, Array<string>> = {};
  const absolutizeOriginPath = absolutizeOriginPathFactory(basePath,absolutePath,pathAlias);
  const parseOuterLayerNode = (
    node: ts.Node,
    basePath: string,
    pathAlias?: TsConfigPaths
  ) => {
    /**
     * analyze first layer node to get import and export info
     * @param node
     * @param basePath
     * @param pathAlias
     */
    const { kind } = node;
    
    console.log(node); // deleted after complete

    /**
     * hope to get :
     * import : import path/ import symbol
     * export : export name/ export name 
     */

    if (kind === ts.SyntaxKind.ImportDeclaration) {
      // import detail in acquireImportDeclarationInfo
      const [ clause, filePath ] = acquireImportDeclarationInfo(node as ts.ImportDeclaration);
      const absoluteImportPath = absolutizeOriginPath(filePath);
      importPair[absoluteImportPath] = clause;
    }

    if (kind === ts.SyntaxKind.ExportAssignment) {
      /**
       * const a = 1;
       * export default a;
       */
      
    }

    if (kind === ts.SyntaxKind.ExportDeclaration) {
      /**
       * export * as a from './a'
       * no used in my project
       * skip
       */
    }

    if (mayContainDynamicImports(node)) {
      /**
       * no used in my project
       * skip
       */
    }

    if (isDeclarationExport(node)) {
      /**
       * export class A{}
       * export const a
       */
      
    }
  };
  const sourceFileNode = ts.createSourceFile(
    absolutePath,
    readFileSync(absolutePath, { encoding: "utf8" }),
    ts.ScriptTarget.ES2015,
    /*setParentNodes */ true
  );
  ts.forEachChild(sourceFileNode, (childNode) => {
    parseOuterLayerNode(childNode, basePath, pathAlias);
  });
};

export const parseFilesByTsConfig = ({
  baseUrl,
  files: filePaths,
  paths,
}: TsConfig) => {
  const importGraph = [];
  const exportGraph = [];
  // traverse all file to statistics the class's import and export situation
  filePaths.forEach((path) => parseFile(resolve(".", path), baseUrl, paths));
};

import ts = require("typescript");
import { namespaceBlacklist } from "./namespaceBlacklist";
import { TsConfigPaths,PropertyNameToExportName } from "./types";
import { dirname, resolve } from "path";
import { existsSync } from "fs";
import path = require("path");
import * as tsconfigPaths from "tsconfig-paths";

const hasModifier = (node: ts.Node, mod: ts.SyntaxKind): boolean =>
  !!(node.modifiers && node.modifiers.filter((m) => m.kind === mod).length > 0);

export const mayContainDynamicImports = (node: ts.Node): boolean =>
  !namespaceBlacklist.includes(node.kind) && node.getText().includes("import(");

export const isDeclarationExport = (node: ts.Node): boolean =>
  hasModifier(node, ts.SyntaxKind.ExportKeyword);

export const isDeclarationDefault = (node: ts.Node): boolean =>
  hasModifier(node, ts.SyntaxKind.DefaultKeyword);

  



export const extractExportNames = (node: ts.Node): [Array<string>,PropertyNameToExportName] => {
  const nameMap:PropertyNameToExportName = {};
  const extractExportNames = () =>{
    const parseExportNames = (exportName: ts.ObjectBindingPattern|ts.BindingName): Array<string> => {
      if(exportName.kind === ts.SyntaxKind.ObjectBindingPattern){
        /** 
         * const x={a:1,b:2};
         * export const {a,b:c} = x 
         * though there are 'export const {a} = x,{b} = y'
         * it's too complex to solve in the current
         * */
        const { elements } = exportName;
        /**
         * TODO: get by symbol
         */
        return elements.map(elem=>{
          /** side effect map handler */
          const {name,propertyName} = elem;
          nameMap[name.getText()] = propertyName?.getText() || '';
          return name.getText();
        });
      }
      return [exportName?.getText?.()];
    };
    switch (node.kind) {
      case ts.SyntaxKind.VariableStatement:
        return parseExportNames(
          (
            node as ts.VariableStatement
          ).declarationList.declarations[0].name
        );
      case ts.SyntaxKind.ClassDeclaration:
      case ts.SyntaxKind.FunctionDeclaration:
        const { name } = node as ts.FunctionDeclaration | ts.ClassDeclaration;
        return [name ? name.text : "default"];
      default: {
        console.warn(`WARN: unknown export node (kind:${node.kind})`);
        return [""];
      }
    }
  }
  return [extractExportNames(),nameMap];
};
export const absolutizeOriginPathFactory = (
  basePath: string,
  curPath: string,
  pathAlias: TsConfigPaths
) => {
  const EXTENSIONS = [".d.ts", ".ts", ".tsx", ".js", ".jsx"];

  const pathAliasMatch = tsconfigPaths.createMatchPath(basePath, pathAlias);
  const joinWithBaseUrl = (originPath: string) => {
    return originPath.startsWith(basePath)
      ? originPath
      : path.join(basePath, originPath);
  };
  const isRelativeToBaseDir = (path: string): boolean =>
    existsSync(resolve(basePath, `${path}.js`)) ||
    existsSync(resolve(basePath, `${path}.ts`)) ||
    existsSync(resolve(basePath, `${path}.d.ts`)) ||
    existsSync(resolve(basePath, `${path}.tsx`)) ||
    existsSync(resolve(basePath, path, "index.js")) ||
    existsSync(resolve(basePath, path, "index.ts")) ||
    existsSync(resolve(basePath, path, "index.tsx"));
  return function absolutizeOriginPath(originPath: string) {
    if (originPath[0] === ".") {
      return resolve(dirname(curPath), originPath) || ".";
    } else {
      if (isRelativeToBaseDir(originPath)) {
        return joinWithBaseUrl(basePath);
      }
      const matched = pathAliasMatch(
        originPath,
        undefined,
        undefined,
        EXTENSIONS
      );
      if (matched) {
        // cut .d to find real file
        const matchedWithoutDef =
          matched.endsWith(".d") && existsSync(`${matched}.ts`)
            ? matched.slice(0, -2)
            : matched;
        return matchedWithoutDef.startsWith(basePath)
          ? path.join(matchedWithoutDef)
          : path.join(basePath, matchedWithoutDef);
      }

      return joinWithBaseUrl(basePath);
    }
  };
};

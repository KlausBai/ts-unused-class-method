import ts = require("typescript");
import { namespaceBlacklist } from "./namespaceBlacklist";
import { TsConfigPaths } from "./types";
import { dirname, resolve } from "path";
import { existsSync } from "fs";
import path = require("path");
import * as tsconfigPaths from "tsconfig-paths";


export const mayContainDynamicImports = (node: ts.Node): boolean =>
  !namespaceBlacklist.includes(node.kind) && node.getText().includes("import(");


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

export const extractImportNames = (decl:ts.ImportDeclaration):Array<ts.Identifier> => {
  const clause = (decl as ts.ImportDeclaration).importClause!;
  const { namedBindings } = clause;
  const importNames = namedBindings?
  (namedBindings as ts.NamespaceImport)?.name?[(namedBindings as ts.NamespaceImport)?.name]: (namedBindings as ts.NamedImports).elements.map(
      (e) => (e.propertyName || e.name),
      ):clause.name?[clause.name]:[]
  return importNames;
}
/**
 * use to pruning in dfs
 * @param node 
 * @returns if node's text has '.' to check are there propertyAccess in this node   
 */
export const hasPropertyAccess= (node:ts.Node)=>{
  const text = node.getText();
  return text.includes('.');
}
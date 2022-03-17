import { TsConfig,TsConfigPaths,FileClassMethodsChain } from './types';
import { resolve } from 'path';
import ts from 'typescript';
import { readFileSync } from 'fs';
import { mayContainDynamicImports,isDeclarationExport } from './utils';

const parseNode = (node:ts.Node,basePath:string,pathAlias:TsConfigPaths) => {
  const { kind } = node ;
  console.log(node)
  
  if(kind === ts.SyntaxKind.ImportDeclaration){
    // import a from './a';
  }
  
  if(kind === ts.SyntaxKind.ExportAssignment){
    /**
     * const a = 1;
     * export default a;
     */
    
  }
  
  if(kind === ts.SyntaxKind.ExportDeclaration){
    /**
     * export * as a from './a'
     * no used in my project 
     * skip
     */
  }
  
  if(mayContainDynamicImports(node)){
    /**
     * no used in my project 
     * skip
     */
  }
  
  if(isDeclarationExport(node)){
    /**
     * export class A{}
     * export const a
     */
  }
}
  
const parseFile = (absolutePath:string,basePath:string,pathAlias:TsConfigPaths)=>{
  const sourceFileNode = ts.createSourceFile(
    absolutePath,
    readFileSync(absolutePath, { encoding: 'utf8' }),
    ts.ScriptTarget.ES2015,
    /*setParentNodes */ true,
  )
  ts.forEachChild(sourceFileNode,(childNode)=>{
    parseNode(
      childNode,
      basePath,
      pathAlias
    )
  })
}

export const parseFilesByTsConfig = ({baseUrl,files:filePaths,paths}:TsConfig)=> {
  const importGraph = [];
  const exportGraph = [];
  // traverse all file to statistics the class's import and export situation 
  filePaths.forEach(path=>parseFile(resolve('.', path), baseUrl, paths));
}
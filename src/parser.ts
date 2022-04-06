import { TsConfigPaths } from "./types";
import { resolve } from "path";
import ts = require("typescript");
import {
  mayContainDynamicImports,
  absolutizeOriginPathFactory,
  extractImportNames,
  hasPropertyAccess,
  extarctNameListFromSymbolTable
} from "./utils";
import { UnusedMemberOfClass } from './targetInfo'

/**
 * get no used class methods by punch type methods
 * 1. get methods call graph
 * 2. use appointed filepath to dye methods node
 * 3. diff export class's member and dyed members to get unused methods
 */
export default class TsFileParser {
  private program: ts.Program;
  private typeChecker: ts.TypeChecker;
  private importTypesPath = new Map<
    ts.Symbol,
    { filePath: string; importName: ts.Identifier }
  >();
  private exportTypesPath = new Map<
    ts.Symbol,
    { filePath: string; exportName: ts.Identifier}
  >();
  private absolutizeOriginPath: ReturnType<typeof absolutizeOriginPathFactory> =
    (o) => o;

  private currentSourceFile?: ts.SourceFile;

  private calledMemberTree = new Map<ts.Symbol,Set<ts.Symbol>>();
  private primaryCalledMethod = new Set<ts.Symbol>();

  private unusedMemberOfClass = new Array<UnusedMemberOfClass>()

  constructor(
    private baseUrl: string,
    private paths: TsConfigPaths,
    private files: Array<string>
  ) {
    this.program = ts.createProgram({
      rootNames: files,
      options: {
        paths,
        baseUrl,
      },
    });
    this.typeChecker = this.program.getTypeChecker();
  }

  public getParsedFileByTsConfig() {
    for (const filePath of this.files) {
      const sourceFile = this.program.getSourceFileByPath(filePath as ts.Path);
      this.absolutizeOriginPath = absolutizeOriginPathFactory(
        resolve(".", filePath),
        this.baseUrl,
        this.paths
      );
      this.parseFile(sourceFile!);
    }
  }

  private parseFile(sourceFile: ts.SourceFile) {
    this.currentSourceFile = sourceFile;
    this.collectExportInfo(sourceFile);
    this.constructVisitedMembersGraph(sourceFile);
    ts.forEachChild(sourceFile, (childNode) => {
      this.collectImportInfo(childNode);
    });
  }

  private collectImportInfo(node: ts.Node) {
    const { kind } = node;

    if (kind === ts.SyntaxKind.ImportDeclaration) {
      // import detail in acquireImportDeclarationInfo
      this.acquireImportDeclarationInfo(node as ts.ImportDeclaration);
    }

    if (mayContainDynamicImports(node)) {
      /**
       * no used in my project
       * skip
       */
    }
  }

  private acquireImportDeclarationInfo(decl: ts.ImportDeclaration) {
    const filePath = decl.moduleSpecifier?.getText?.();
    const absoluteFilePath = this.absolutizeOriginPath(filePath);
    const importNames = extractImportNames(decl);
    importNames.forEach((importName) => {
      const type = this.typeChecker.getTypeAtLocation(importName).symbol;
      if (type && type.flags & ts.SymbolFlags.Class) 
        /** maybe basic type like string,number and so on whose type don not have symbol*/
        this.importTypesPath.set(type, {
          filePath: absoluteFilePath,
          importName,
        });
    });
  }

  private acquireExportAssignmentInfo(expo: ts.ExportAssignment) {
    /**
     * i cannot think out shape more than
     * ```
     * class A {...}
     * export default a;
     * ```
     * so regard expression of exportAssignment as Identifier('a') temporarily
     */
    const expression = expo.expression;
    const path = this.currentSourceFile!.fileName;
    if (!ts.isIdentifier(expression)) return;
    const type = this.typeChecker.getTypeAtLocation(expression).symbol;
    if (type && type.flags & ts.SymbolFlags.Class) {
      this.exportTypesPath.set(type, {
        filePath: path,
        exportName: expression,
      });
    }
  }

  private acquireDeclarationExportInfo(decl: ts.ClassDeclaration) {
    const name = decl.name!;
    const path = this.currentSourceFile!.fileName;
    const type = this.typeChecker.getTypeAtLocation(name).symbol;
    if (type && type.flags & ts.SymbolFlags.Class) {
      this.exportTypesPath.set(type, {
        filePath: path,
        exportName: name,
      });
    }
  }

  private collectExportInfo(sourceFile: ts.SourceFile) {
    const sourceFileSymbol = this.typeChecker.getSymbolAtLocation(sourceFile)!;
    const exportSource = sourceFileSymbol.exports;
    if (!exportSource) return;
    exportSource.forEach((symbol) => {
      const node = symbol.valueDeclaration!;
      const { kind } = node;
      switch (kind) {
        case ts.SyntaxKind.ExportAssignment:
          this.acquireExportAssignmentInfo(node as ts.ExportAssignment);
        case ts.SyntaxKind.ExportDeclaration:
          /**
           * export * as a from './a'
           * no used in my project
           * skip
           */
          break;
        case ts.SyntaxKind.ClassDeclaration:
          this.acquireDeclarationExportInfo(node as ts.ClassDeclaration);
        default:break;
      }
    });
  }
  


  private constructVisitedMembersGraph(sourceFile: ts.SourceFile){
    if(!hasPropertyAccess(sourceFile)) return ;
    const dfsTsNodeToCollectCallGraph = (node: ts.Node,container:ts.SourceFile|ts.MethodDeclaration|ts.ClassDeclaration)=>{
      // only collect top level method info
      const newContainer = ts.isMethodDeclaration(node) || ts.isClassDeclaration(node)?node:container;
      ts.forEachChild(node,(childNode)=>{
        if(!hasPropertyAccess(childNode)) return ; 
        if(ts.isPropertyAccessExpression(childNode)){
          const name = ts.getNameOfDeclaration(childNode.expression)!;
          const type = this.typeChecker.getTypeAtLocation(name).symbol;/** if a.memberA only be used in b.memberB but b.memberB had been used ? */
          if(type){
            this.watchPropertyAccess(childNode,newContainer);
          }
        } else dfsTsNodeToCollectCallGraph(childNode,newContainer);
      })
    }
    dfsTsNodeToCollectCallGraph(sourceFile,sourceFile);
  }

  /**
   * `this.bizTest.x`'s dfs stack: 
   *  this.bizTest.x | this.bizTest | this | bizTest | x
   */

  private watchPropertyAccess(propertyAccessNode:ts.Node,invokeContainer:ts.SourceFile|ts.MethodDeclaration|ts.ClassDeclaration){
    const propertyTypeChain:Array<ts.Symbol> = [];
    const invokeContainerSymbol = !ts.isSourceFile(invokeContainer)?this.typeChecker.getTypeAtLocation(invokeContainer).getSymbol():undefined
    const callGraph = this.calledMemberTree ; 
    const EdgeSet = invokeContainerSymbol ? 
                    callGraph.has(invokeContainerSymbol) ? callGraph.get(invokeContainerSymbol)!: new Set<ts.Symbol>(): 
                    this.primaryCalledMethod;
    const dfsWatchPropertyAccess = (node:ts.Node,dep =0) => {
      const type = this.typeChecker.getTypeAtLocation(node).symbol;
      if(!type) return false;
      if(this.importTypesPath.has(type)|| ts.isThisTypeNode(node)){
        // TODO: is in class
        for(let p = dep-1;p>=0;p--){
          const son = propertyTypeChain[p];
          EdgeSet.add(son);
        }
        return true;
      }
      let hasFind = false; /** has find recorded type */
      propertyTypeChain.push(type);
      ts.forEachChild(node,(childAccess)=>{
        if(hasFind) return ;
        hasFind = hasFind || dfsWatchPropertyAccess(childAccess,dep+1);
      });
      propertyTypeChain.pop();
      return hasFind;
    } 
    return dfsWatchPropertyAccess(propertyAccessNode as ts.PropertyAccessExpression);
  }

  private diffUnusedClassMethods(){
    const originGraph = this.exportTypesPath;
    const unusedStore = this.unusedMemberOfClass;
    originGraph.forEach(({filePath,exportName},key)=>{
      const visistedMembers = this.calledMemberTree.get(key);
      const members = key.members;
      if(!visistedMembers || !visistedMembers.size){
        unusedStore.push(new UnusedMemberOfClass(filePath,exportName,extarctNameListFromSymbolTable(members)));
      } else {

      }
    })
  }
}

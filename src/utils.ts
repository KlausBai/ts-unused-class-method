import ts from 'typescript';
import { namespaceBlacklist } from './namespaceBlacklist';

const hasModifier = (node: ts.Node, mod: ts.SyntaxKind): boolean | undefined =>
  node.modifiers && node.modifiers.filter((m) => m.kind === mod).length > 0;

export const mayContainDynamicImports = (node: ts.Node): boolean =>
  !namespaceBlacklist.includes(node.kind) && node.getText().includes('import(');
  
export const isDeclarationExport = (node:ts.Node):boolean => hasModifier(node,ts.SyntaxKind.ExportKeyword)
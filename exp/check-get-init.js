"use strict";
exports.__esModule = true;
var path_1 = require("path");
var ts = require("typescript");
var filePath = (0, path_1.resolve)('.', '../test/index.ts');
var ImportedFilePath = (0, path_1.resolve)('.', '../test/export-assignment.ts');
var index = 0;
var program = ts.createProgram({
    rootNames: [filePath, ImportedFilePath],
    options: {
        "declaration": true,
        "module": ts.ModuleKind.CommonJS,
        "outDir": "./lib",
        "noImplicitAny": true,
        "sourceMap": true,
        "strictNullChecks": true,
        "strict": true
    }
});
var typeChecker = program.getTypeChecker();
var sourceFileNode = program.getSourceFile(filePath);
var importSourceFileNode = program.getSourceFile(ImportedFilePath);
var typeA, typeB, typeC;
var symbolA, symbolB;
ts.forEachChild(sourceFileNode, function (node) {
    // console.log({index,node:{
    //     ...node,
    //     parent:undefined
    // }});
    // index++;
    var kind = node.kind;
    if (kind === ts.SyntaxKind.ImportDeclaration) {
        // const claus = (node as ts.ImportDeclaration).importClause.name;
        // const symbol = typeChecker.getSymbolAtLocation(claus);
        // const type = typeChecker.getTypeAtLocation(claus).symbol;
        // typeA=type;
        // console.log({symbol,type})
        // exp B
        var clause = node.importClause;
        var namedBindings = clause.namedBindings;
        var nameArray = namedBindings ?
            (namedBindings === null || namedBindings === void 0 ? void 0 : namedBindings.name) ? [namedBindings === null || namedBindings === void 0 ? void 0 : namedBindings.name] : namedBindings.elements.map(function (e) { return (e.propertyName || e.name); }) : clause.name ? [clause.name] : [];
        nameArray.forEach(function (name) {
            var nameText = name.getText();
            var symbol = typeChecker.getSymbolAtLocation(name);
            var type = typeChecker.getTypeAtLocation(name).symbol;
            symbolA = symbol;
            // console.log({nameText,symbol,type})
        });
    }
});
function DFS_AST_GET_THIS(node, dep) {
    if (dep === void 0) { dep = 0; }
    var nodeText = node.getText();
    if (!nodeText.includes('this.'))
        return 0;
    var thisExpressionCount = 1;
    // test this[key] form
    ts.forEachChild(node, function (childNode) {
        thisExpressionCount += DFS_AST_GET_THIS(childNode, dep + 1);
    });
    if (thisExpressionCount === 1) {
        var name_1 = node.name;
        var symbol = typeChecker.getSymbolAtLocation(name_1);
        var type = typeChecker.getTypeAtLocation(name_1).symbol;
        symbolB = symbol;
        typeB = type;
        // console.log({nodeText,node,symbol,type });
    }
    // console.log(nodeText,dep,thisExpressionCount);
    return thisExpressionCount;
}
DFS_AST_GET_THIS(sourceFileNode);
// console.log(typeA===typeB); through check can find that typeA will equal to typeB
/**
 * this exp could prove that typeC equal to typeB
 */
// ts.forEachChild(importSourceFileNode,child=>{
//     if(typeC) return ;
//     const type = typeChecker.getTypeAtLocation((child as ts.ClassDeclaration).name).symbol;
//     typeC = type;
// })
// console.log({typeB,typeC,equal:typeB===typeC})
// console.log({typeC})
/**
 * check the way to get symbol of source
 */
// const symbol = typeChecker.getSymbolAtLocation(importSourceFileNode)
// symbol.exports.forEach((exp)=>{
//     const decl = exp.declarations[0];
//     const type = typeChecker.getTypeAtLocation((decl as ts.ExportAssignment).expression);
//     const childSymbol = typeChecker.getSymbolAtLocation((decl as ts.ExportAssignment).expression);
//     console.log({childSymbol});
// });
console.log({ symbolA: symbolA, symbolB: symbolB, equal: symbolA === symbolB });

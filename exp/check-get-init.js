"use strict";
exports.__esModule = true;
var path_1 = require("path");
var ts = require("typescript");
var filePath = (0, path_1.resolve)('.', '../test/index.ts');
var index = 0;
var program = ts.createProgram({
    rootNames: [filePath],
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
ts.forEachChild(sourceFileNode, function (node) {
    // console.log({index,node:{
    //     ...node,
    //     parent:undefined
    // }});
    // index++;
    var kind = node.kind;
    if (kind === ts.SyntaxKind.ImportDeclaration) {
        var claus = node.importClause;
        var symbol = typeChecker.getSymbolAtLocation(claus.name);
        console.log({ symbol: symbol, claus: claus });
    }
});

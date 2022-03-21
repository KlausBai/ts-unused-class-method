import { resolve } from 'path';
import  ts = require('typescript');

const filePath = resolve('.','../test/index.ts');
const ImportedFilePath = resolve('.','../test/export-assignment.ts');
let index=0;
const program = ts.createProgram({
    rootNames:[filePath,ImportedFilePath],
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

const typeChecker = program.getTypeChecker();

const sourceFileNode = program.getSourceFile(filePath);
const importSourceFileNode = program.getSourceFile(ImportedFilePath);
let typeA,typeB,typeC;
let symbolA,symbolB;
ts.forEachChild(sourceFileNode,(node)=>{
    // console.log({index,node:{
    //     ...node,
    //     parent:undefined
    // }});
    // index++;
    const {kind} = node;
    if(kind === ts.SyntaxKind.ImportDeclaration){
        // const claus = (node as ts.ImportDeclaration).importClause.name;
        // const symbol = typeChecker.getSymbolAtLocation(claus);
        // const type = typeChecker.getTypeAtLocation(claus).symbol;
        // typeA=type;
        // console.log({symbol,type})

        // exp B
        const clause = (node as ts.ImportDeclaration).importClause;
        const { namedBindings } = clause;
        const nameArray = namedBindings?
        (namedBindings as ts.NamespaceImport)?.name?[(namedBindings as ts.NamespaceImport)?.name]: (namedBindings as ts.NamedImports).elements.map(
            (e) => (e.propertyName || e.name),
            ):clause.name?[clause.name]:[]
        nameArray.forEach(name=>{
            const nameText = name.getText();
            const symbol = typeChecker.getSymbolAtLocation(name);
            const type = typeChecker.getTypeAtLocation(name).symbol;
            symbolA = symbol;
            // console.log({nameText,symbol,type})
        })
        
    }
})

function DFS_AST_GET_THIS(node: ts.Node,dep=0){
    const nodeText = node.getText();
    if(!nodeText.includes('this.')) return 0;
    let thisExpressionCount = 1;
    // test this[key] form
    ts.forEachChild(node,(childNode)=>{
        thisExpressionCount+=DFS_AST_GET_THIS(childNode,dep+1);
    })
    if(thisExpressionCount===1){
        const name = (node as ts.PropertyAccessExpression).name;
        const symbol = typeChecker.getSymbolAtLocation(name);
        const type = typeChecker.getTypeAtLocation(name).symbol;
        symbolB = symbol
        typeB=type
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
console.log({symbolA,symbolB,equal:symbolA===symbolB})
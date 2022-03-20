import { resolve } from 'path';
import { readFileSync } from 'fs';
import  ts = require('typescript');

const filePath = resolve('.','../test/index.ts');
let index=0;
const program = ts.createProgram({
    rootNames:[filePath],
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


ts.forEachChild(sourceFileNode,(node)=>{
    // console.log({index,node:{
    //     ...node,
    //     parent:undefined
    // }});
    // index++;
    const {kind} = node;
    if(kind === ts.SyntaxKind.ImportDeclaration){
        const claus = (node as ts.ImportDeclaration).importClause;
        const symbol = typeChecker.getSymbolAtLocation(claus.name);
        console.log({symbol,claus});
    }
})


import ts = require("typescript");

export class UnusedMemberOfClass {
    constructor(
        private filePath:string,
        private className:ts.Identifier,
        private unusedMembers:Array<string>
    ){}
    
}
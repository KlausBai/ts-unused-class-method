
export default class BizTest {
    constructor(
        private a =1
    ){}
    
    public getBizTestA(){
        return this.a;
    }
    
    public redundantFunc(){
        console.log('this is just a redundantFunc');
    }
}
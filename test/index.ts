import BizTest from './class-def';

const a = new BizTest();

export default class Service {
    constructor(
        /** in fact my project use inject */
        private BizTest:BizTest = a
    ){}

    printfBizTestA(){
        console.log(this.BizTest.getBizTestA());
        console.log('aaa')
    }
}
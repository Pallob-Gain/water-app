export default class rest{
    static API_ERROR=1;
    static API_OK=2;
    static API_INFO=3;
    static API_WARNING=4;

    static API_ERROR_DATA="error";
    static API_OK_DATA="success";
    static API_INFO_DATA="info";
    static API_WARNING_DATA="danger";
    static API_PALOAD_NAME="payload";
    static API_RESPOND_NAME="respond";
    static API_NON_DISCLOSEMENT_MSG='Something error is happening!';
    static API_REQUEST_NOTVALID='Your request is not valid!';

    static checkKeys(holder,keywords){
        for(var key in keywords){
            if(!(keywords[key] in holder)){
                return false;
            }
        }   
        return true;
    }

    static emptyKeys(holder,keywords){
        for(var key in keywords){
            if(!(keywords[key] in holder)){
                return false;
            }
            if(typeof holder[keywords[key]]=='string' && holder[keywords[key]]==''){
                return false;
            }
        }   
        return true;
    }

    static result(type,payload){
        return {type,payload};
    }

    static apiOut(result,type,payload){
            if(result.headersSent)return false;

            var resJSON={
            };

            var types=[this.API_ERROR,this.API_OK,this.API_INFO,this.API_WARNING];
            var response_name=[this.API_ERROR_DATA,this.API_OK_DATA,this.API_INFO_DATA,this.API_WARNING_DATA];

            if(types.indexOf(type)==-1){
                throw new Error('Rest Request type is not valid');
            }

            resJSON[this.API_PALOAD_NAME]=payload;
            resJSON[this.API_RESPOND_NAME]=response_name[types.indexOf(type)];

            return result.json(resJSON);
    }

    static viewOut(result,status,payload){
        if(result.headersSent)return false;
       return result.status(status).send(payload);
    }
}
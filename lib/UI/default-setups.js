import path from "node:path";
import global_share from "../global-share.js";

const defaultLinkMaker=(link_default,link_state)=>{
    if(link_state===null || typeof link_state=="undefined" || link_state===true)return link_default;
    if(typeof link_state =="string"){
        if(link_state.startsWith("./"))return path.resolve(global_share.__executedir,link_state);
        else return link_state;
    }
    return false;
};

const defaultListLinks=(lists)=>{
    if(Array.isArray(lists)){
        return lists.map(item=>{
            if(typeof item =="string"){
                if(item.startsWith("./"))return path.resolve(global_share.__executedir,item);
                else return item;
            }
            return null;
        }).filter(v=>v);
    }
    return []; //empty array
}

export {defaultLinkMaker,defaultListLinks};
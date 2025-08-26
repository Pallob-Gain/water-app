export default class debug{
    static debug_state=true;

    static mode(state){
        debug.debug_state=state;
    }

    static log(...args){
        if(debug.debug_state)console.log(...args);
    }
    static error(...args){
        if(debug.debug_state)console.error(...args);
    }
    static warn(...args){
        if(debug.debug_state)console.warn(...args);
    }
    static info(...args){
        if(debug.debug_state)console.info(...args);
    }
    static debug(...args){
        if(debug.debug_state)console.debug(...args);
    }
    static table(...args){
        if(debug.debug_state)console.table(...args);
    }
    static group(...args){
        if(debug.debug_state)console.group(...args);
    }
    static groupEnd(...args){
        if(debug.debug_state)console.groupEnd(...args);
    }
    static time(...args){
        if(debug.debug_state)console.time(...args);
    }
    static timeEnd(...args){
        if(debug.debug_state)console.timeEnd(...args);
    }
    static dir(...args){
        if(debug.debug_state)console.dir(...args);
    }
    static dirxml(...args){
        if(debug.debug_state)console.dirxml(...args);
    }
    static trace(...args){
        if(debug.debug_state)console.trace(...args);
    }
    static assert(...args){
        if(debug.debug_state)console.assert(...args);
    }
    static count(...args){
        if(debug.debug_state)console.count(...args);
    }
    static countReset(...args){
        if(debug.debug_state)console.countReset(...args);
    }
    static groupCollapsed(...args){
        if(debug.debug_state)console.groupCollapsed(...args);
    }
    static clear(...args){
        if(debug.debug_state)console.clear(...args);
    }
    static timeStamp(...args){
        if(debug.debug_state)console.timeStamp(...args);
    }
    static profile(...args){
        if(debug.debug_state)console.profile(...args);
    }
    static profileEnd(...args){
        if(debug.debug_state)console.profileEnd(...args);
    }
    static timeLog(...args){
        if(debug.debug_state)console.timeLog(...args);
    }
    static timeStamp(...args){
        if(debug.debug_state)console.timeStamp(...args);
    }
}
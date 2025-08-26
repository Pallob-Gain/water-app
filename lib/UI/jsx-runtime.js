import React from "react";
//import AppUI from "../AppUI.js";

// `jsx()` is used for single child elements
export function jsx(tag,props, key){
    return React.createElement(tag,{ ...props, key });
}

// `jsxs()` is used for multiple children (plural "s" in `jsxs`)
export function jsxs(tag,props, key){
    return React.createElement(tag,{ ...props, key });
}

export function Fragment(fragments){
    return React.Fragment(fragments);
}


// import {
//     Fragment,
//     h,
// } from "preact";


// export { h as jsx, h as jsxs, Fragment };
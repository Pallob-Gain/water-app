import React from 'react';
//import { Links } from 'react-router';
//import {BrowserRouter} from "react-router-dom";

function WaterLink(props) {
    const { children, src, ...others } = props;

    const target_self = props?.window ? !props.window : true;
    //console.log(src,target_self);
    return <a
        target="_SELF" href="#" onClick={(e) => {
            e.preventDefault(); // sheaders page from jumping to header
            openSideBarLink(src, target_self.toString());
        }}   {...others}>{children}</a>;
    /*
    return <span 
    style="color:rgb(27, 110, 234); text-decoration: underline; cursor: pointer;"
    onmouseover="this.style.color='rgb(7, 63, 149)'" 
    onmouseout="this.style.color='rgb(27, 110, 234)'"
    target="_SELF" onClick={`openSideBarLink('${src}',${target_self.toString()});`}  {...others}>{children}</span>
    */
}

export default WaterLink;
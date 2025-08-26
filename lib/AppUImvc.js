//import ServerComponent from './UI/ServerComponent.jsx';
import * as componentPorcess from './UI/componentPorcess.js';

//https://dev.to/roeland/generate-html-on-the-server-with-deno-and-jsx-429b
//import React from "https://jspm.dev/react@16.14.0";
//import ReactDOMServer from 'https://jspm.dev/react-dom@16.14.0/server';


//export default React; 


export default class AppUI {


    static getProcessFunction(tag) {
        const isClass = (
            tag.prototype &&
            tag.prototype.constructor === tag &&
            Object.getOwnPropertyNames(tag.prototype).length > 1 // Usually, classes have methods
        );

        if (isClass) {
            const obj = new tag();
            // if (obj instanceof ServerComponent) {
            //     return obj.renderProcess.bind(obj); //assign the new object to the function
            // }
            // else 
            if (typeof obj.render === 'function') {
                return obj.render.bind(obj);
            }
            else throw 'Unsupported class export';
        } else {
            return tag;
        }
    }

    static async createElement(tag, props, ...children) {

        if (typeof tag === "function") {
            const tag_fun = AppUI.getProcessFunction(tag);
            return await (children.length > 0 ? tag_fun({ ...props, children }) : tag_fun(props));
        } else if (typeof tag === "string") {

            if (props && 'children' in props && children.length == 0) {
                const { children: prop_children, ...otherpros } = props;
                return await this.createElement(tag, otherpros, prop_children);
            }

            const [attrs, child_data] = await componentPorcess.componentAccess(props, children, false);

            //console.log(attrs);

            //for string base direct output
            return { tag, props: attrs, children: child_data }; //[tag, props, children];
            /*
            return `<${tag} ${attrs.map(([key,val])=>{
                return `${key}=${val}`;
            }).join(' ')} >${child_data.join('\r\n')}</${tag}>`;//[tag, props, children];
            */
        }

        throw 'Invalid JSX entry';
    }

    static async Fragment(fragments) {
        if (fragments && 'children' in fragments) {
            //let data=await fragments.children;
            //if(Array.isArray(data))console.log('children data:',data);
            const childrens = await componentPorcess.deepPromiseAll(await fragments.children);
            //console.log('childrens...:',childrens);
            return childrens;
            //for string base direct output
            //return Array.isArray(childrens)?childrens.join(''):childrens;
        }
        return '';
    }

    //parse tree
    static renderToString(data_tree) {
        //console.log('data_tree:',data_tree);
        if (typeof data_tree == 'string') return data_tree;
        if (Array.isArray(data_tree)) return data_tree.map(dhild => AppUI.renderToString(dhild)).join('\r\n');

        if (typeof data_tree != 'object' || !('tag' in data_tree)) throw 'Invalid AppUI format!';

        const { tag, props, children } = data_tree;

        return `<${tag} ${props.map(([key, val]) => {
            return `${key}=${componentPorcess.isPlainObject(val) ? `'${JSON.stringify(val)}'` : `"${val}"`}`;
        }).join(' ')} >${children.map(dhild => AppUI.renderToString(dhild)).join('\r\n')}</${tag}>`;
    }



    static escapeHtml(str) {
        return str;

        // return String(str)
        //     .replace(/&/g, "&amp;")
        //     .replace(/</g, "&lt;")
        //     .replace(/>/g, "&gt;")
        //     .replace(/"/g, "&quot;");
    }

    static convertToTaggedTemplate(node, strings = [], values = []) {
        if (typeof node == 'string' || typeof node == 'number') {
            strings.push("");
            values.push(AppUI.escapeHtml(node));
            return [strings, values];
        }
        else if (Array.isArray(node)) {
            const flatArray = (node || []).flat(Infinity);

            for (const child of flatArray) {

                AppUI.convertToTaggedTemplate(child, strings, values);
            }

            //if(flatArray.length>0 && strings.length>1){

                //console.log('testing-->',strings,values);
                //then reduce one string
               // const l_str=strings.pop();
               // strings[strings.length-1]=strings[strings.length-1]+l_str;
            //}

            return [strings, values];
        }
        else if(typeof node=='object' && !('tag' in node)){
            strings.push("");
            values.push(node);
            return [strings, values];
        }

        let keyStrings=[];
        //console.log('tree node:', node);
        let tagOpen = `<${node.tag}`;
        
        // Handle props
        if (Array.isArray(node.props)) {
            for (const [key, val] of node.props) {
                tagOpen += ` ${key}="`;
                keyStrings.push(tagOpen);
                values.push(val);
                tagOpen = `"`;

                // if (typeof val === "string" || typeof val === "number") {
                //     tagOpen += ` ${key}="${AppUI.escapeHtml(val)}"`;
                // } else {
                //     tagOpen += ` ${key}="`;
                //     strings.push(tagOpen);
                //     values.push(val);
                //     tagOpen = `"`;
                // }
            }
        }

        tagOpen += ">";
        keyStrings.push(tagOpen);

        if(strings.length>0){
             let f_string=keyStrings.shift();
             strings[strings.length-1]=strings[strings.length-1]+f_string;
        }
        strings.push(...keyStrings);
    
        const filtred_children=node.children.filter(v=>v)

        if(filtred_children.length>0){
            AppUI.convertToTaggedTemplate(node.children, strings, values);
        }

        strings.push(strings.pop()+`</${node.tag}>`); //add to the last

        return [strings, values];
    }

    //Render to 

    static async htmlRender(html) {
        return `data:text/html,${encodeURIComponent(await html)}`;
    }

}
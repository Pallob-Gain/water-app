export function isPlainObject(obj) {
    return obj && obj.constructor === Object;
}

export function isClassInstance(obj) {
    return obj && obj.constructor && obj.constructor !== Object;
}

export async function deepPromiseAll(nestedStructure) {
    // If it's a Promise, await it
    if (nestedStructure instanceof Promise) {
        return await nestedStructure;
    }

    // If it's an array, recursively process each element
    if (Array.isArray(nestedStructure)) {
        const resolvedArray = await Promise.all(
            nestedStructure.map(item => deepPromiseAll(item))
        );
        return resolvedArray;
    }

    // If it's neither a Promise nor an array, return as-is
    return nestedStructure;
}

export async function dataParser(item) {

    //console.log({item});
    if (Array.isArray(item)) {
        //console.log('Array-->',item);
        const data = [];
        for await (const dtx of item) {
            const parsed_data = await dtx;
            if (parsed_data) data.push(await dataParser(parsed_data));
        }
        return data;//.join('');
    }
    else if (item instanceof Promise) {
        return await dataParser(await item);
    }
    else if (typeof item == 'string') {
        return item;
    }
    else if (typeof item == 'object') {
        return item;//isPlainObject(item) ? JSON.stringify(item) : '';
    }
    return '';
}

export async function parseChildren(children) {
    const child_data = [];

    if (children) {
        if (Array.isArray(children) && children.length > 0) {
            for await (const item of children) {
                const item_data = await item;
                if (item_data) child_data.push(await dataParser(item_data));
            }
        }
        else {
            const item_data = await children;
            if (item_data) child_data.push(await dataParser(item_data));
        }
    }

    return child_data;
}

export async function parseProps(props,tag_attach=false) {
    const attrs = [];

    if (props) for (const name in props) {
        const attr = await props[name];
        if (attr && name != "children") {

            const attr_name = (name == 'className') ? 'class' : name;

            if (typeof attr == 'object') {
                //json object, only for the second stage
                if (isPlainObject(attr)) {
                    if (name == 'style') {

                        const keys = Object.keys(attr);
                        const prop = keys.map(key => {
                            return `${key}:${attr[key]}`;
                        }).join(';');

                        attrs.push([attr_name, tag_attach?`"${prop}"`:prop]);
                    }
                    else{
                        attrs.push([attr_name, tag_attach?`'${JSON.stringify(attr)}'`:attr]);
                    }
                }
            }
            else attrs.push([attr_name, tag_attach?`"${attr}"`:attr]);
        }
    }
    return attrs;
}

export async function componentAccess(props, children,tag_attach=false) {
    const child_data = await parseChildren(children);
    const attrs=await parseProps(props,tag_attach);

    return [attrs, child_data];
}
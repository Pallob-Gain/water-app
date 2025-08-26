import React, { use, useState, useEffect, Suspense } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { Script as ScriptSSR, Style as StyleSSR, ssrOnly, fromServer, useServer } from "@mvc/water-app/UI/components";
import global_share from "@mvc/water-app/global-share";
import { pathToFileURL } from 'node:url';


async function listMaker(__page_name, element) {

    if ('visible' in element && !element.visible) return '';

    if ('childs' in element) {
        return await (
            <li class="dropright" key={element.name}>
                <a href="javascript:void(0)" target="_SELF" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" key={element.name}>
                    <i className={element.icon + ' me-3'}></i>
                    {element.name}
                </a>
                <div className="dropdown-menu" aria-labelledby="dropdownMenuButton">
                    {
                        (
                            await Promise.all(
                                element.childs.map(async (child) => {
                                    return await (
                                        <a className="dropdown-item sidebar-dropdown-items" href={`javascript:${child.call_back}('${child.name}','${child.link}');`} target="_SELF">
                                            <i class={child.icon + ' me-3'}></i>
                                            {child.name}
                                        </a>
                                    );
                                })
                            )
                        ).join('')
                    }
                </div>
            </li>
        );
    }
    else {
        if ('filename' in element) {
            return await (
                <li className={(element.name == __page_name) ? 'active' : 'non-active'} key={element.link[0]}>
                    <a href={element.link[0]} target="_SELF"  key={element.link[0]}>
                        <i className={element.icon + ' me-3'} ></i>
                        {element.name}
                    </a>
                </li>
            );
        }
        else if ('call_back' in element) {
            return (
                <li key={element.name}>
                    <a href={`javascript:${element.call_back}('${element.name}','${element.link}');`} target="_SELF" key={element.name}>
                        <i className={element.icon + ' me-3'}></i>
                        {element.name}
                    </a>
                </li>
            );
        }
    }
}

async function SideBarPortionSSR(props) {
    if (!('__page_name' in props) || !('__session' in props)) throw 'Server information is not present';
    const { __links, __name, __public_data } = global_share;
    const { __session, __page_name } = props;

    //console.log('__links:',__links);

    const { default: { views: all_pages_details } } = (await import(pathToFileURL(__links), {
        with: { type: "json" }
    }));

    const hide_list = []; //this items will not be shown

    if (!('usertoken' in __session)) {
        //not login

        hide_list.push(...['Logout']);
    }

    // console.log(all_pages_details);

    return <>
        <div className="ps-2 bg-light" style={{ paddingTop: '2px', paddingBottom: '2px' }}>
            <a href="/" className="logo">
                <img src="images/icon.png" style={{ height: '35px' }} alt="Logo" />
                <b className="ms-2" style={{ fontSize: '22px', position: 'relative', top: '2px' }}>
                    {__name}
                </b>
            </a>
        </div>
        <div style={{ position: 'relative', zIndex: 100 }} className="mt-3">
            <ul className="list-unstyled components application-list mb-5">
                {
                    (await Promise.all(
                        all_pages_details.map(async (element) => {
                            if (hide_list.includes(element.name)) return ''; //block this for now
                            return await listMaker(__page_name, element);
                        })
                    ))
                }
            </ul>
        </div>
        <div style={{
            position: 'absolute',
            width: '100%',
            height: '40px',
            bottom: '0px',
            textAlign: 'center',
            lineHeight: '40px',
            verticalAlign: 'middle',
            color: 'wheat',
        }}>
            <label>{__public_data.COPY_RIGHT}</label>

        </div>
    </>;
};


function SideSection(props) {
    const Script = fromServer({ client: props.__client }, ScriptSSR);
    const Style = fromServer({ client: props.__client }, StyleSSR);
    const SideBarPortion = useServer({ client: props.__client }, SideBarPortionSSR);

    const [sideBarClass, setSideBarClass] = useState('active');

    const { __page_name } = props;

    const barToggler = () => {
        setSideBarClass((cls_name) => cls_name == 'active' ? 'inactive' : 'active');
    };

    useEffect(() => {
        console.log('sideBarClass:', sideBarClass);

    }, [sideBarClass]);

    //let OO=await <PageLabel {...props}/>;
    // console.log('test:',OO);

    return <nav id="sidebar" className={sideBarClass} style={{ minHeight: '100vh' }}>
        <Style src={import.meta.resolve('./style.css')} lazy={true} />

        <div className="custom-menu bg-light" >
            <div style={{ width: '100%' }}>
                <button type="button" id="sidebarCollapse" className="btn btn-light ms-2" onClick={() => barToggler()}>
                    <i className="fa fa-bars btn-sidebar-trigger"></i>
                    <span className="sr-only text-info" >Menu </span>
                </button>
                <label className="h5 text-dark" style={{ position: 'relative', left: '0px', top: '2px', color: 'red' }}>{props?.name ? props.name : __page_name}</label>
                <div style={{ position: 'fixed', top: '10px', right: '20px' }}>{props?.topbar}</div>
            </div>
        </div>
        <SideBarPortion {...props} id="side-bar-portion" />
        <Script src={import.meta.resolve('./sidebar.js')} lazy={true} />
    </nav>;
}


export default SideSection;
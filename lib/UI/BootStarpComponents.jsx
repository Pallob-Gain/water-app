import React, { Suspense } from 'react';

export function Row(props = {}) {
    let { children, ...other_props } = props;
    if (!other_props) other_props = { className: 'row' };
    else other_props.className = `row ${(other_props?.class || other_props?.className) ? (other_props?.class || other_props?.className) : ''}`;
    delete other_props.class;

    return <div {...other_props}>
        {children}
    </div>;
}

export function Col(props = {}) {
    let { children, ...other_props } = props;
    if (!other_props) other_props = { className: 'col' };
    else other_props.className = `col ${(other_props?.class || other_props?.className) ? (other_props?.class || other_props?.className) : ''}`;
    delete other_props.class;
    return <div {...other_props}>
        {children}
    </div>;
}


export function Card(props = {}) {
    let { children, title, header, style, ...other_props } = props;
    if (!other_props) other_props = { className: 'card' };
    else other_props.className = `card ${(other_props?.class || other_props?.className) ? (other_props?.class || other_props?.className) : ''}`;
    delete other_props.class;
    return <div {...other_props}>
        {
            title || header ?
                <div className="card-header" style={{ background: '#808080' }} >
                    <h5 className="card-title text-light" style={{ position: 'relative', top: '5px' }}>{title}</h5>
                    {header}
                </div>
                : <></>
        }

        <div className="card-body" style={style}>
            <div className="row px-0 mx-0">
                <div className="col-12 px-0 mx-0" >
                    {children}
                </div>
            </div>
        </div>
    </div>;
}
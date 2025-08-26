export default function Card(pros) {
    return <div class={'card ' + (props && 'class' in props ? props.class : '')}>
        {
            props && ('header' in props || 'title' in props) ?
                <div class="card-header" >
                    <h4 class="card-title">{props.title}</h4>
                    {'header' in props ? props.header : ''}
                </div> : ''
        }
        <div class="card-body" style={props && 'style' in props ? props.style : ''}>
            <div class="row px-0 mx-0">
                <div class="col-12 px-0 mx-0" >
                    {props?.children}
                </div>
            </div>
        </div>
    </div>;
}
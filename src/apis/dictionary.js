import rest from '@mvc/water-app/rest'

export default function(props){
    const {__postdata}=props; //post data
    
    const names=[
        'pallob',
        'priyanka',
        'others'
    ];

    return rest.result(rest.API_OK,names);
}

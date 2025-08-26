import React, { use, useState, useEffect, Suspense } from 'react';

import { withClient, fromServer, useServer, Link, Row, Col, Card, attachServerState, sendServerState, isServer, createServerState, useServerState, createChannel } from "@mvc/water-app/UI/components";
import Layout from "./components/Layout.jsx";
import dinosaurs from '../apis/dinosaurs/data.json' with {type: 'json'};
import global_share from '@mvc/water-app/global-share';

//if the initial function is async then it also return async
const [countState, setCountState] = await createServerState('server-counter-element', async () => {
    //value or function run only once at server, and if it is provided as async then the state also need to be await
    return 0;
});

countState.onSet((value)=>{
     console.log('Count State Update:',value);
});

//const [countStateCheck] = createServerState('check-counter-element', 'checkingServerState');

//channel example
const [receiver, sender] = createChannel('server-channel-example');


const ServerInfoSSR = async function () {
    const { __manifest } = global_share;

    return <h1>Welcome to Water-App V{__manifest.version}</h1>;
};

const ServerDirectSSR = async function () {
    return await <h1>Direct</h1>; //React component inside of ssrOnly is a async element or could hold async elements
};

//update over time
setInterval(() => {
    setCountState((state) => {
        console.log('current state:', state);
        return state + 1;
    });

    //send current time
    sender.send((new Date()).getTime()); //send server time to the channel
}, 1000);


function RealTimeServerRepresent(props) {
    const [count] = useServerState(countState);
    // const [chkState] = fromServerState({ client: props.client }, countStateCheck);
    // console.log('chkState:',chkState);
    
    return <p>Server Count: <b>{count}</b></p>;
}


function Dashboard(props) {
    let signeture = { client: props.__client };
    const ServerInfo = useServer(signeture, ServerInfoSSR);
    const ServerDirect = useServer(signeture, ServerDirectSSR);

    receiver.recv((server_time)=>{
        console.log('Receive Server time:',new Date(server_time));
    });

    return <Layout  {...props} title="Dashboard">
        <ServerInfo id='server-info' />
        <ServerDirect id='server-infox' />
        <p>Click on a dinosaur below to learn more.</p>
        <Suspense >
            <RealTimeServerRepresent client={props.__client} />
        </Suspense>
        <Row>
            {dinosaurs.map((dinosaur) => {
                return (
                    <Col className="col-3 my-1" key={dinosaur.name}>
                        <Link src={`/dinosaur/${dinosaur.name.toLowerCase()}.jsx`} key={dinosaur.name}>
                            <Card>
                                {dinosaur.name}
                            </Card>
                        </Link>
                    </Col>
                );
            })}
        </Row>

    </Layout>;
}

export default Dashboard; //auto hydrate

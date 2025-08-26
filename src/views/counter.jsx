import React, { use, useState, useEffect, Suspense } from 'react';
import { fileURLToPath } from 'node:url';

import {withClient,fromServer,useServer,serverOnly,ssrOnly,isServer,createServerState,useServerState,createServerInterface} from "@mvc/water-app/UI/components";
import Layout from "./components/Layout.jsx";
import global_share from '@mvc/water-app/global-share';

const [countState,setCountState]=createServerState('server-state-element',0,(value)=>{
    //optional update catcher
    console.log('Server State update:',value);
}); //server state counter

let server_counter=0;
//that will run complety in server as server only function
export async function ServerEvent(inc){
    //console.log('Client signeture:',this); //can be verify the caller.
    //console.log('serverOnly:',inc);
    server_counter+=inc;
    //throw new Error('error test');
    return {count:server_counter};
}
//initializing that function as server only
const ServerEventWaper=serverOnly(ServerEvent,{id:'server-event-warper',origin:import.meta.url});

let server_interface_count=0;
//server interface
const serverInterfaceFun=createServerInterface('server-interface-example',async (inc)=>{
    server_interface_count+=inc;
     return server_interface_count;
});

const serverInterfaceValueFun=createServerInterface('server-interface-example2',async ()=>{
     return server_interface_count;
});

const fetchWeather = async () => {
    if(!isServer())return; //there will have no effect for the client

     const { __manifest } = global_share;
    return { temperature: 30 ,count:server_counter,version:__manifest.version};
};

async function ServerCompnent(props) {
    //console.log('check:',this);
    console.log('Server Component:',props.children);
    const link = fileURLToPath(import.meta.resolve('./data/test-file.txt'));
    const text = await Deno.readTextFile(link);

    console.log('File text:', text);
    return <p>
            <b>{props.children}:</b>{text}
           </p>;
};

const Counter = (props) => {
    const serverFun = fromServer({client: props.client },ServerEventWaper); //get weather from server
    const weather_r = use(props.weather);

    const [count, setCount] = useState(0); //client state
    const [serverFunResponse, setServerFunResponse] = useState(weather_r.count); //client state
    //server state
    const [counterServer,setCountServer]=useServerState(countState);

    //server interface counter
    const [countInterfaceValue,setInterfaceValue]=useState(null);

    //console.log('count X:',count);

    //console.log(setCountServer);

    const btnClick=async (inc)=>{
        try{
            setCount((p) => p + inc);
            const result=await serverFun(inc);
            //console.log('Server fun Res:',result);
            setServerFunResponse(result.count);
            //console.log('calling setCountServer');
            setCountServer((p) => p + inc);

             setInterfaceValue(await serverInterfaceFun(inc));
        }
        catch(err){
            console.error('btn click error:',err);
        }
    }

    useEffect(() => {
        const valueSet=async()=>{
            setInterfaceValue(await serverInterfaceValueFun());
        }
        valueSet();
    }, [countInterfaceValue]);

    return <>
        <p>Version: {weather_r.version}</p>
        <p>Temperature: {weather_r.temperature}°C</p>

        <button className="btn btn-primary mx-1" onClick={() => btnClick(1)}>Increment</button>
        <button className="btn btn-info  mx-1" onClick={() => btnClick(-1)}>Decrement</button>
        <h1>Counter: {count}</h1>
        <h1>Server Counter: {serverFunResponse}</h1>
        <h1>Server State Counter: {counterServer}</h1>
         <h1>Server Interface Counter: {counterServer}</h1>
    </>;
}

function CounterApp(props) {
    const server_data=fetchWeather(); //extract server data
    const weather = fromServer({ id: 'weather-data', client: props.__client }, server_data); //only get data during SSR
    const ServerFile = useServer({client: props.__client },ServerCompnent); //get weather from server
    
    return <Layout {...props}>
            <ServerFile id='ssr-render-comp-1'>File Access 1</ServerFile>

            <ServerFile id='ssr-render-comp-2'>File Access 2</ServerFile>


            <Suspense fallback={<p>Counter...</p>}>
                <Counter weather={weather} client={props.__client} />
            </Suspense>
        </Layout>;
}

//auto hydrate
export default CounterApp;

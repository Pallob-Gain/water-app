import React,{use, useState,useEffect,Suspense} from 'react';
import {fileURLToPath} from 'node:url';


/*
import {
  Fragment,
  FunctionComponent as FC,
  h,
} from "preact";

import {
  useEffect,
  useState,
} from "preact/hooks";
*/

//import AppUI from '@mvc/water-app/AppUI';
// import { Warper, Script, Style, withClient, ssrOnly, useSSR, Link, Row, Col, Card } from "@mvc/water-app/UI/components";
// import Layout from "./components/Layout.jsx";
// import dinosaurs from '../apis/dinosaurs/data.json' with {type: 'json'};
// import global_share from '@mvc/water-app/global-share';


//import { options } from "@nhttp/nhttp/jsx";

//import {jsx as hh} from "preact/jsx-runtime";
//import p from "@nhttp/nhttpX";
// console.log(hh);

//import { Helmet } from "@nhttp/nhttp/jsx/helmet"
import withClient from "../../lib/React/client.js";

// const ServerInfoSSR=ssrOnly(async function(){
//   const { __manifest } = global_share;

//   return <h1>Welcome to Water-App V{__manifest.version}</h1>;
// });

// const ServerDirectSSR=ssrOnly(async function(){
//   return await <h1>Direct</h1>; //React component inside of ssrOnly is a async element or could hold async elements
// });

// async function Compo({children}){
//     return <h1>{children}</h1>;
// }

const fetchWeather = async () => {
  return {humidity:50,temperature:30};
};

async function Data(){
  console.log('Server Data fetching');
  return 'Data of server';
}

async function ServerCompnent(props) {
  console.log('Server Component');
   //const link=fileURLToPath('file:///D:/VS%20CODE%20WORKSPACE/NODEJS%20WORKSPACE/water-app/src/views/test-file.txt');
  //const text = await Deno.readTextFile(link);
    let text='Data of server';
    
    if (typeof document === "undefined") {
      console.log('Accessing from server');
      text=await Data();
    }

    console.log('File text:',text);
    return <p>{(text)}</p>;
};

const Counter =(props) => {
    const weather_r=use(props.weather);
   // const ssrc = use(ServerCompnent({children:'SSR RENDER 1'}));

    const [count, setCount] = useState(0);
    const update = () => {
        setCount((prev) => prev + 1);
    }

    useEffect(() => {
        console.log(count);
      }, [count]);

    return <>
            <p>Temperature: {weather_r.temperature}°C</p>
  
            <h1> Home Page </h1>
            <p> Counter: {count} </p>
            <button onClick={() => update()}>Update</button>
        </>;

    //   //console.log('Staring:',init);
    //   //console.log('__client:',props.__client);
    //   const ServerInfo=useSSR(props.__client,ServerInfoSSR);
    //   const ServerDirect=useSSR(props.__client,ServerDirectSSR);


    //   const [count, setCount] = useState(0);

    //   useEffect(() => {
    //     console.log(count);
    //   }, [count]);

    //return <Compo>Hello</Compo>;
    //   return <Layout  {...props} title="Dashboard">
    //             <ServerInfo id='server-info'/>
    //             <ServerDirect id='server-infox'/>
    //             <p>Click on a dinosaur below to learn more.</p>

    //              <Row>
    //               {dinosaurs.map((dinosaur) => {
    //                 return (
    //                   <Col className="col-3 my-1" key={dinosaur.name}>
    //                     <Link src={`/dinosaur/${dinosaur.name.toLowerCase()}.jsx`}>
    //                       <Card>
    //                         {dinosaur.name}
    //                       </Card>
    //                     </Link>
    //                   </Col>
    //                 );
    //               })}
    //             </Row>

    //       </Layout>;
}

//export default Counter;




function Dashboard(props){
   const weather = fetchWeather();

    return <>
               <Suspense fallback={<p>Loading...</p>}>
                <ServerCompnent>SSR DIRECT</ServerCompnent>
              </Suspense>
              {/* <Suspense fallback={<p>Counter...</p>}>
                <h4>Humidity: {weather}</h4>
              </Suspense> */}
              <Suspense fallback={<p>Counter...</p>}>
                <Counter weather={weather}/>
              </Suspense>
          </>;
}

//hydrate over
export default withClient(Dashboard);

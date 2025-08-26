/* @jsx h */
/* @jsxFrag Fragment */
import {
  Fragment,
  FunctionComponent as FC,
  h,
} from "preact";

import {
  useEffect,
  useState,
} from "preact/hooks";


//import AppUI from '@mvc/water-app/AppUI';
import { Warper, Script, Style, withClient, ssrOnly, useSSR, Link, Row, Col, Card } from "@mvc/water-app/UI/components";
import Layout from "./components/Layout.jsx";
import dinosaurs from '../apis/dinosaurs/data.json' with {type: 'json'};
import global_share from '@mvc/water-app/global-share';
//import { options } from "@nhttp/nhttp/jsx";

//import {jsx as hh} from "preact/jsx-runtime";
//import p from "@nhttp/nhttpX";
// console.log(hh);

//import { Helmet } from "@nhttp/nhttp/jsx/helmet"
//import withClient from "@mvc/water-app/helpers/client";

const ServerInfoSSR=ssrOnly(async function(){
  const { __manifest } = global_share;

  return <h1>Welcome to Water-App V{__manifest.version}</h1>;
});

const ServerDirectSSR=ssrOnly(async function(){
  return await <h1>Direct</h1>; //React component inside of ssrOnly is a async element or could hold async elements
});

const Dashboard = (props) => {
  //console.log('Staring:',init);
  //console.log('__client:',props.__client);
  const ServerInfo=useSSR(props.__client,ServerInfoSSR);
  const ServerDirect=useSSR(props.__client,ServerDirectSSR);


  const [count, setCount] = useState(0);

  useEffect(() => {
    console.log(count);
  }, [count]);


  return <Layout  {...props} title="Dashboard">
            <ServerInfo id='server-info'/>
            <ServerDirect id='server-infox'/>
            <p>Click on a dinosaur below to learn more.</p>

             <Row>
              {dinosaurs.map((dinosaur) => {
                return (
                  <Col className="col-3 my-1" key={dinosaur.name}>
                    <Link src={`/dinosaur/${dinosaur.name.toLowerCase()}.jsx`}>
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

//export default Counter;
export default withClient(Dashboard, import.meta.url);


/*
export default function Page(props) {
  

  return <Layout  {...props}>

   


   

  </Layout>;
  
}
  */
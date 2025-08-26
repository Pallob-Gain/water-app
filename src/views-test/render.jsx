import React from 'npm:react@19.1.0';
import ReactDOMServer from 'npm:react-dom@19.1.0/server';
import AppData from './index.jsx';

export default function App(){
  return ReactDOMServer.renderToString(<AppData />,{
    bootstrapScripts: ["client.bundle.js"]
  });
}
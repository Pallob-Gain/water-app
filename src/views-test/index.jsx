import React from "react";
import { hydrateRoot } from "npm:react-dom@19.1.0/client";
import { App } from "./App.jsx";

hydrateRoot(document, <App />);
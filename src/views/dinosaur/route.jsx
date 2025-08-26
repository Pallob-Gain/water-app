import React, { use, useState, useEffect, Suspense } from 'react';

import { Link, Row, Col, Card,withClient } from '@mvc/water-app/UI/components';
import Layout from "../components/Layout.jsx";
import dinosaurs from '../../apis/dinosaurs/data.json' with {type: 'json'};

function dinosaur(props) {
  const { __getparams: params } = props;
  console.log('params:',params);
  //console.log(props.__renderSessionData);

  const selectedDinosaur = params.dinosaur;

  

  const dinosaurData = dinosaurs.find((item) =>
    item.name.toLowerCase() === selectedDinosaur.toLowerCase()
  );

  if (!dinosaurData) {
    return (
      <Layout  {...props}>
        <h1>Is not valid dainosure</h1>
        <Link src="/" >🠠 Back to all dinosaurs</Link>
      </Layout>
    );
  }

  return (
    <Layout  {...props}>

      <Row className="mt-4">
        <Col className="col-8 mx-auto">
          <Card title={dinosaurData.name}>
            <p>{dinosaurData.description}</p>
            <Link src="/" >🠠 Back to all dinosaurs</Link>
          </Card>
        </Col>
      </Row>



    </Layout>
  );
  
}

export default withClient(dinosaur);
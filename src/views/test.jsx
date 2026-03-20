import React,{use, useState,useEffect,Suspense} from 'react';


const Page=()=>{
    useEffect(()=>{
        console.log('Client Side Effect');
    },[]);
    
    return "test";
};

export default Page;
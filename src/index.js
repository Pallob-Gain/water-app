import getDetails from './config/details-info.js';
import initSetup from './config/init-setup.js';
import mysqlSetup from './controller/mysql_init.js';
import debugSys from '@mvc/water-app/debug';

//import PartialSection from './views/components/partial/PartialSection.jsx';

export default async function main(props){
  
    const details=await getDetails(props);
    debugSys.log('Details check:',details);
    

    await initSetup(props);
    await mysqlSetup(props);

    //page reload request from backend
    //const v=new PartialSection();
    setInterval(()=>{
      //  v.refresh(); //refreasing server component
    },1000);
}
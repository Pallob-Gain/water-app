import globalshare from '@mvc/water-app/global-share';

export default function initialSetup(props){
    const {__manifest}=props;

    globalshare.assignConst({
        COPY_RIGHT:"Pallob K. Gain",
        config_author:__manifest.author
    });
    
}
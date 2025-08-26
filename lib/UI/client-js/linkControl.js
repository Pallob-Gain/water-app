const tab_checker_channel = new BroadcastChannel("tab-checker-channel");

const get_current_window_name=()=>location.href.replace(location.origin,"");

tab_checker_channel.addEventListener("message", (event) => { 
	if('action' in event.data)switch(event.data.action){
		case "links":{
			const link=location.href.replace(location.origin,"");
			if(window.name.length==0)window.name=link;
			let name=window.name;
			tab_checker_channel.postMessage({message:{link,name}});
			break;
        }
		case "confirms":
			tab_checker_channel.postMessage({confirm:true});
			break;
	}
});


const get_all_opened_window=(timeout=1500)=>{
	return new Promise((accept,reject)=>{
		const timeout_process=setTimeout(()=>{
			reject(new Error('window access waiting timeout'));
		},timeout);

		const checker_channel = new BroadcastChannel("tab-checker-channel");
		const all_windows=[];
		const all_confirms=[];
		checker_channel.addEventListener("message", (event) => { 
			if('message' in event.data)all_windows.push(event.data.message);
			if('confirm' in event.data){
				all_confirms.push(event.data.confirm);
				if(all_confirms.length==all_windows.length){
					clearTimeout(timeout_process);
					accept(all_windows);
				}
			}
		});

		checker_channel.postMessage({action:'links'});
		checker_channel.postMessage({action:'confirms'});

	});
}

const get_window_state=async (link)=>{
	const windows=await get_all_opened_window();
	return windows.find(({link:wind_link})=>link==wind_link);
}

const openSideBarLink=async (link,self=true)=>{
	//let cwind=window.open("", "_self");
	let cwind_name=get_current_window_name();
	if(cwind_name==link){
		//cwind.focus();
		//store_window(link,cwind);
	}
	else{
		
		//wind.name=wind.location.href.replace(location.origin,"");
		let opened_window=await get_window_state(link);

		if(!opened_window && self){
			location=link;
			//return easyTab(link,{},null,'_SELF');
			//cwind.close(); //if self section and the window was not opened before
		}
		else if(opened_window){
			let {name}=opened_window;
			let wind=window.open(link, name, 'toolbar=no,resizable=yes');
			wind.focus(); //focus the already opened window
		}
		else{
			let wind=window.open(link, link, 'toolbar=no,resizable=yes');
			wind.focus(); //focus the already opened window
		}

	}

}

// Code to handle install prompt on desktop
let deferredPrompt;

document.addEventListener("DOMContentLoaded", function (event) {
    $(document).ready(function () {
       
        var firstTime = true;

        window.addEventListener('beforeinstallprompt', (e) => {
            debugSys.log("Service Worker Install Prompt");
            // Prevent Chrome 67 and earlier from automatically showing the prompt
            e.preventDefault();
            // Stash the event so it can be triggered later.
            deferredPrompt = e;
            // Update UI to notify the user they can add to home screen
            if (firstTime) {
                firstTime = false;
                /*
                mkConfirm("<center><h1><img src='images/icon/fav.png' style='width:96px' ></h1><h2>Beer Flow</h2><h4>You can add this app to your home screen.</h4></center>",()=>{
                    // Show the prompt
                    deferredPrompt.prompt();
                    // Wait for the user to respond to the prompt
                    deferredPrompt.userChoice.then((choiceResult) => {
                        if (choiceResult.outcome === 'accepted') {

                        } else {}
                        deferredPrompt = null;
                    });
                },true,'medium','Install','Cancel');
                */
            }
        });

        if ("Notification" in window) {
        
        }


        if ('serviceWorker' in navigator) {
            debugSys.log("service worker in navigator");
            navigator.serviceWorker
                .register('/sw.js')
                .then(function () {

                });
        }

    });
});
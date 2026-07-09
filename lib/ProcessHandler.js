export default class ProcessHandler {

    constructor(link, options = {}) {
        const command = new Deno.Command(link, options);
        this.process = command.spawn();
        this.pid = this.process.pid;

        this.onExitHolders = [];
        this.onErrorHolders = [];
        this.onCloseHolders = [];
        this.running = true;

        this.process.status
            .then((status) => {
                if(!this.running)return;
                this.running = false;

                this.onExitHolders.forEach((callback) => callback(status.code, status.signal));
                //this.onCloseHolders.forEach((callback) => callback(status.code, status.signal));
                
            })
            .catch((err) => {
                 if(!this.running)return;
                this.running = false;

                this.onErrorHolders.forEach((callback) => callback(err));
            });
    }

    on(event, callback) {
        switch (event) {
            case 'exit':
                this.onExitHolders.push(callback);
                break;
            case 'error':
                this.onErrorHolders.push(callback);
                break;
            case 'close':
                this.onCloseHolders.push(callback);
                break;
        }
    }

    async exit() {
        if (!this.running) {
            return;
        }

        if (Deno.build.os == 'windows') {

            const taskkillProcess =await Deno.run({
                cmd: ["taskkill", "/pid", this.pid, "/f"],
                stdin: "piped",
                stdout: "piped",
            });

            // console.log('closing trigger');
        }
        else {
            const taskkillProcess = await Deno.run({
                cmd: ["pkill", "-9", this.pid],
                stdin: "piped",
                stdout: "piped",
            });
        }
    }
}
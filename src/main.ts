import { of } from 'rxjs';
import { mergeMap, catchError } from 'rxjs/operators';
import { SocketServer } from './WebServer'
import { FileReader } from './FileReader'
import * as path from 'path';
import { errorToString, readySetGo } from './Utils';

main();

function main() {

  of({  /* default configure */
    port:         50555,
    documentRoot: undefined,
    apiPath:      "/api",
    debuggerPath:    "/debugger"
  })
  .pipe(mergeMap((config: SocketServer.config_t)=>{
    return FileReader.text(path.resolve(__dirname, 'config.json'))
    .pipe(mergeMap((str:string)=>{
      let fileconfig:SocketServer.config_t = JSON.parse(str);
      if(fileconfig.port        ) config.port         = fileconfig.port;
      if(fileconfig.documentRoot) config.documentRoot = fileconfig.documentRoot;
      console.log("load config.json");
      return of(config);
    }))
    .pipe(catchError((_)=>{
        console.log("config.json not found -> use default configure");
        return of(config);
    }));
  }))
  .pipe(mergeMap((config)=>{
    const ss = new SocketServer.Server();
    return readySetGo(()=>{
      ss.start(config);
    }, ss.RequestObservable);
  }))
  .pipe(mergeMap((req: SocketServer.request_t)=>{
    console.log("main next %s", req.method);
    switch(req.method){
      case "get":
      case "post":
      case "put":
      {
        if(req.response){
          req.response.send(`hello ${req.method}`);
          return of ();
        }
      }
      case "socket":{
        if(req.socket){
          req.socket.onUnsolicitedMessage("farewell", (msg)=>{
            req.socket!.goodbye();
          });
        }
      }
    }
    return of();
  }))
  .subscribe({
    next: ()      => { console.log("main next"); },
    error: (err)  => { console.error(`main error: ${errorToString(err)}`); },
    complete: ()  => { console.log("main completed"); }
  });
}

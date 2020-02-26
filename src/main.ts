import { of, Observable } from 'rxjs';
import { mergeMap, catchError } from 'rxjs/operators';
import { SocketServer } from './WebServer'
import { FileReader } from './FileReader'
import * as path from 'path';
import { errorToString, readySetGo } from './Utils';
import { SyncSocketIO } from "syncsocketio";
//import { SyncSocketIO } from "../../../syncsocketio/src/syncsocketio"

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
    console.log(`method "${req.method}"`);
    switch(req.method){
      case "get":
      case "post":
      case "put":
      {
        return doApiJob(req);
      }
      case "socket":
      {
        return doSocketJob(req);
      }
    }
  }))
  .subscribe({
    next: ()      => { console.log("main next"); },
    error: (err)  => { console.error(`main error: ${errorToString(err)}`); },
    complete: ()  => { console.log("main completed"); }
  });
}

function doApiJob(req: SocketServer.request_t): Observable<undefined> {
  if(req.request && req.response){
    req.response.status(200).write("OK");
  }
  return of();
}

function doSocketJob(req: SocketServer.request_t): Observable<undefined> {
  if(req.socket){
    req.socket.onUnsolicitedMessage("farewell", (msg)=>{
      req.socket!.goodbye();
    });

    req.socket.onUnsolicitedMessage("bindSockets", (msg)=>{
      const session_id = msg.session_id;
      const socket = req.socket;
      if(socket && session_id){
        const target = SyncSocketIO.findBySessionId(session_id);
        if(target){
          console.info(`bindSockets : "${socket.SessionId}" - "${session_id}"`)
          socket.Tag = `bind to ${session_id}`;
          SocketServer.bindSockets(socket, target);
        }
        else{
          console.error(`"bindSockets : target socket "${session_id}" not found`);
        }
      }
    });
  }
  return of();
}

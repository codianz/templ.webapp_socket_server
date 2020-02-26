import { Subject } from 'rxjs';
/* export = で定義されている場合には、import = require() 形式を使用する */
/* https://www.typescriptlang.org/docs/handbook/modules.html#export--and-import--require */
import express = require("express");
import socketio from "socket.io";
import { SyncSocketIO } from "syncsocketio";
//import { SyncSocketIO } from "../../syncsocketio/src/syncsocketio"
import * as bodyParser from 'body-parser';
import {Request, Response} from "express";
import cors from 'cors';

export namespace SocketServer {
  type method_t =  "get" | "post" | "put" | "socket";

  export type config_t = {
    port?:number,           /* 50080 */
    documentRoot?:string,   /* path.resolve(__dirname, '../html') */
    apiPath?: string,       /* "/api" */
    debuggerPath?: string   /* "/debugger" */
  };

  export type request_t = {
    method: method_t,
    request?: Request,
    response?: Response,
    socket?: SyncSocketIO
  }
  
  export class Server
  {
    private m_subjectRequest = new Subject<request_t>();

    public get RequestObservable() { return this.m_subjectRequest.asObservable(); }

    public start(config: config_t)
    {
      const app = express();

      app.use(cors());

      app.use(bodyParser.urlencoded({
        extended: true
      }));

      app.use(bodyParser.json());
  
      if(config.apiPath){
        console.info(`api path -> "${config.apiPath}"`);
        app.get(config.apiPath, (req, res)=>{
          this.m_subjectRequest.next({
            method: "get",
            request: req,
            response: res
          });
        });
    
        app.post(config.apiPath, (req, res)=>{
          this.m_subjectRequest.next({
            method: "post",
            request: req,
            response: res
          });
        });

        app.put(config.apiPath, (req, res)=>{
          this.m_subjectRequest.next({
            method: "put",
            request: req,
            response: res
          });
        });
      }
      else{
        console.info("api path undefined");
      }

      if(config.debuggerPath){
        app.post(config.debuggerPath, (req, res)=>{
          this.onPostDebug(req, res);
        });
      }

      if(config.documentRoot){
        app.use(express.static(config.documentRoot));
        console.info(`document root -> "${config.documentRoot}"`)
      }
      else{
        console.info("document root undefiend");
      }

      const _port = process.env.PORT || config.port;
      const webServer = app.listen(_port, ()=>{
        console.info(`start listening port -> ${_port}`);
      });

      const wsServer = socketio(webServer);

      console.info("ws connection started");
      SyncSocketIO.waitForConnecting(wsServer, (s)=>{
        this.m_subjectRequest.next({
          method: "socket",
          socket: s
        });
      });
    }

    private onPostDebug(req: Request, res: Response){
      type debugger_opt_t = {
        command:
          "get_socket_ids" |
          "get_pending_solicited_messages" |
          "emit_unsolicited_message" |
          "emit_solicited_message" |
          "emit_solicited_response" |
          "goodbye",
        session_id?: string,
        message? : {
          event: string,
          body: any,
          index?: number
        }
      }
      const opt = req.body as debugger_opt_t;

      let s: SyncSocketIO | undefined = undefined;
      if(opt.session_id){
        if(opt.session_id in SyncSocketIO.Sockets){
          s = SyncSocketIO.Sockets[opt.session_id];
        }
        else{
          res.status(500).send({
            "status": "error",
            "error": `invalid session_id ${opt.session_id}`
          });
          return;
        }
      }

      switch(opt.command){
        case "get_socket_ids":{
          res.status(200).send(Object.keys(SyncSocketIO.Sockets).map((x)=>{
            return {session_id: x, tag: SyncSocketIO.Sockets[x].Tag};
          }));
          break;
        }

        case "get_pending_solicited_messages":{
          res.status(200).send(s!.PendingSolicitedMessages);
          break;
        }

        case "emit_unsolicited_message":{
          s!.emitUnsolicitedMessage(opt.message!.event, opt.message!.body)
          .then((x)=>{
            res.status(200).send({
              "status": "OK",
              "when": "emitUnsolicitedMessage",
              "send": opt.message
            });
          })
          .catch((err)=>{
            res.status(500).send({
              "status": "error",
              "when": "emitUnsolicitedMessage",
              "error": err
            });
          });
          break;
        }

        case "emit_solicited_message":{
          s!.emitSolicitedMessageAndWaitResponse(opt.message!.event, opt.message!.body)
          .then((x)=>{
            res.status(200).send({
              "status": "OK",
              "when": "emitSolicitedMessageAndWaitResponse",
              "send": opt.message,
              "receive": x
            });
          })
          .catch((err)=>{
            res.status(500).send({
              "status": "error",
              "when": "emitSolicitedMessageAndWaitResponse",
              "error": err
            });
          });
          break;
        }

        case "emit_solicited_response":{
          s!.emitSolicitedResponse(opt.message!.index!, opt.message!.event, opt.message!.body)
          .then((x)=>{
            res.status(200).send({
              "status": "OK",
              "when": "emitSolicitedResponse",
              "send": opt.message
            });
          })
          .catch((err)=>{
            res.status(500).send({
              "status": "OK",
              "when": "emitSolicitedResponse",
              "error": err
            });
          });
          break;
        }

        case "goodbye":{
          s!.goodbye();
          res.status(200).send({
            "status": "OK"
          });
          break;
        }
      }
    }
  }

  export function bindSockets(A: SyncSocketIO, B: SyncSocketIO){
    console.info(`bindSockets: "${A.SessionId}" & "${B.SessionId}"`);

    A.onSolcitedMessageRegex(".*", (index, event, body)=>{
      B.emitSolicitedMessageAndWaitResponse(event, body)
      .then((resp)=>{
        A.emitSolicitedResponse(index, resp.event, resp.body);
      });
    });

    A.onUnsolicitedMessageRegex(".*", (event, body)=>{
      B.emitUnsolicitedMessage(event, body);
    });

    B.onSolcitedMessageRegex(".*", (index, event, body)=>{
      A.emitSolicitedMessageAndWaitResponse(event, body)
      .then((resp)=>{
        B.emitSolicitedResponse(index, resp.event, resp.body);
      });
    });

    B.onUnsolicitedMessageRegex(".*", (event, body)=>{
      A.emitUnsolicitedMessage(event, body);
    });
  }
}

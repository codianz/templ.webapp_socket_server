import * as fs from 'fs';
import { Observable, Observer } from 'rxjs';

export class FileReader {
  public static binary(fpath:string): Observable<Buffer> {
    return Observable.create((observer:Observer<Buffer>)=>{
      fs.readFile(fpath, (err, data)=>{
        if(err){
          observer.error(err);
        }
        else{
          observer.next(data);
          observer.complete();
        }
      });
    });
  }
  public static text(fpath:string, encoding:string = "utf8"): Observable<string> {
    return Observable.create((observer:Observer<string>)=>{
      fs.readFile(fpath, encoding, (err, str)=>{
        if(err){
          observer.error(err);
        }
        else{
          observer.next(str);
          observer.complete();
        }
      });
    });
  }
};
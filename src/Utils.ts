import { Observable, Observer } from "rxjs";

export function errorToString(err: any){
  let s: string;
  if(typeof err == "string"){
    s = err;
  }
  else{
    s = JSON.stringify(err, null, " ");
  }
  return s;
}


export function dateString(date: string | number | Date | null | undefined, emptyStr: string = "(n/a)"){
  if(date){
    let d: Date;
    if(typeof date == "string"){
      d = new Date(date);
    }
    else if(typeof date == "number"){
      d = new Date(date);
    }
    else{
      d = date;
    }
    if(d){
      return `${d.getFullYear()}`
      + "/"
      + ("00" + (d.getMonth() + 1)).slice(-2)
      + "/"
      + ("00" + d.getDate()).slice(-2)
      + " "
      + ("00" + d.getHours()).slice(-2)
      + ":"
      + ("00" + d.getMinutes()).slice(-2)
      + ":"
      + ("00" + d.getSeconds()).slice(-2);
    }
  }
  return emptyStr;
}

export function dateStringNow() {
  return dateString(Date.now());
}

export function doSubscribe<T>(title: string, o: Observable<T>){
  o.subscribe(
    (v: T) => {},
    (err: Error) => {},
    () => {}
  )
}

export function readySetGo<T>(ready: ()=>void, observable:Observable<T>): Observable<T>{
  return Observable.create((observer: Observer<T>) =>{
    observable.subscribe((v)=>{
      observer.next(v);
    }, (err) =>{
      observer.error(err);
    }, () =>{
      observer.complete();
    });
    ready();
  });
}
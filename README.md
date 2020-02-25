# syncsocketio を使ったwebサーバの実装テンプレート

## 概要

このプロジェクトは syncsocketio を使って、webサーバを構築するためのテンプレートです。

syncsocketio については、下記のリポジトリを参照してください。

https://github.com/codianz/syncsocketio

このwebサーバのクライアント側の実装テンプレートは下記のリポジトリを参照してください。

https://github.com/codianz/templ.webapp_client


## ビルド方法

下記のコマンドでビルドを行ってください。

```sh
npm i && npm run build
```

## Visual Studio Code

このプロジェクトは Visual Studio Code 用の設定が含まれています。

### ビルド

shift + ctrl + B でビルドを選択します。


### デバッグ実行

F5 キーで実行します。

## SocketServer

SocketServer は、 syncsocketio と api の二つのリクエストについて対応を行います。また、デバッグ用の機能も実装されているので、 syncsocketio の実装試験やクライアント・サーバ間での問題の切り分けを行うことができます。

SocketServer.Server がサーバクラスです。このクラスは非常にシンプルで、下記の２つのインターフェイスしか持ちません。

* サーバの開始要求 ... SocketServer.Server.start()

* リクエストの観測 ... SocketServer.Server.RequestObservable

### サーバの開始要求

```Typescript
  const ss = new SocketServer.Server();
  ss.start({
    port:         50555,
    documentRoot: undefined,
    apiPath:      "/api",
    debuggerPath: "/debugger"
  });
```

(TBI)

### リクエストの観測

```Typescript
  ss.RequestObservable
  .pipe((mergeMap(req: SocketServer.request_t)=>{
    switch(req.method){
      case "get":
      case "post":
      case "put":
      {
        /* API としての処理 */
        return doApiJob(req.request, req.response);
      }
      case "socket":
      {
        /* syncsocketio としての処理 */
        return doSocketJob(req.socket);
      }
    }
  }))
```

(TBI)

## デバッグ機能

(TBI)



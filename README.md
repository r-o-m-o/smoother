# 概要  
スクリプトの目的としてはメニューコマンドの「連結」では実現できない、「パス同士のなめらかな連結」と「一発でクローズパスにする」こと。  
メニューコマンドと同じルートで連結されるようにしたいがどういうアルゴリズムかいまいち分からん。  
「最短距離でつないでいく」という考え方は概ね合ってると思うのだけど…  
端点の位置を記録しておいてメニューコマンドの「連結」後に記録を元にハンドル調整していくバージョンも作ったが、どうやらメニューコマンドを使うほうが処理が遅い  
ので、なるべく自前で連結したいところ（そのほうが面白いし

# 処理の流れ
1. パスの端点同士の組み合わせをすべて配列化  
    - 端点は始点と終点があるので、連結するときのパスの向きもboolで記録  
    - 端点間の距離も記録  
    - 端点の組み合わせは以下の４つがある  
      1. 「パスAの終点とパスBの始点＝正順と正順」  
      1. 「Aの始点とBの終点＝逆順と逆順」  
      1. 「Aの始点とBの始点＝逆順と正順」  
      1. 「Aの終点とBの終点＝正順と逆順」  
1. 組み合わせの配列を距離の近い順にソート
1. ソートした配列の先頭からルート構築を開始  
    1. 最初の組み合わせをルート配列に格納  
    1. 組み合わせ配列をループ  
        1. 重複するものは配列から削除  
        1. 現在のルートの始点or終点に接続できるものなら格納  
    1. ルートの配列の長さがパスと同数になったらループ終了  
1. できたルート配列を元に接続し、接続部が円弧に近似するようにハンドルを調整  

# 変更点
| バージョン | 変更点 |
|:---:|:---|
| v1 | プロトタイプ |
| v2 | ソート時にいちいち端点同士の距離を算出していたのを、組み合わせ作成時に算出するようにした。<br>（算出が1回だけになった |
| v3 | ルート構築時のループをforオンリーからwhile+forに変えてルート完成まで最初から走査しなおすようにした。 |
| v4 | 重複エラー時に配列が減ってることを忘れていただので、continueをbreakにして最初から再チェックするようにした。 |
| v5 | 最初からチェックするとスルーしたものを無駄に再チェックしちゃうのでカウンタをデクリメントしてcontinueするように変えた。 |

# 課題点  
- ルート構築時に無限ループに陥る可能性あるかも…  
- 考えていたアルゴリズム通りにはなった（と思う）が、メニューコマンドの「連結」は少し仕組みが違う。
    - わしのアルゴリズム：一番距離の短い組み合わせから広げるようにつなげていく
    - 「連結」のアルゴリズム：とりあえず被らない限り近いもの同士をつなげて、さらにそれを近いもの同士でつなげて…のループ  
- 孤立点（ポイントが１つだけのパス）に対する処理をどうしようか…
